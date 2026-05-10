
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { Pool } = require("pg");
const axios = require("axios");
const crypto = require("crypto");

let bcrypt = null;

try {
  bcrypt = require("bcrypt");
} catch {
  try {
    bcrypt = require("bcryptjs");
  } catch {
    bcrypt = null;
  }
}

require("dotenv").config();

const PORT = process.env.PORT || 5000;
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.json());

const executionStates = {};
const roomLanguageStates = {};
const JDOODLE_EXECUTION_TIMEOUT_MS = 65000;

const normalizeValue = (value) =>
  value === undefined || value === null ? "" : String(value);

const EXECUTION_LANGUAGE_CONFIG = {
  c: { language: "c", versionIndex: "6" },
  c99: { language: "c99", versionIndex: "5" },
  cpp: { language: "cpp17", versionIndex: "2" },
  cpp14: { language: "cpp14", versionIndex: "5" },
  cpp17: { language: "cpp17", versionIndex: "2" },
  cpp20: { language: "cpp20", versionIndex: "0" },
  cpp23: { language: "cpp23", versionIndex: "0" },
  java: { language: "java", versionIndex: "5" },
  javascript: { language: "nodejs", versionIndex: "6" },
  python3: { language: "python3", versionIndex: "5" },
  typescript: { language: "typescript", versionIndex: "0" },
};

const SHARED_LANGUAGE_ALIASES = {
  html: "html",
  htm: "html",
  htmlmixed: "html",
  c: "c",
  "c language": "c",
  "c++": "cpp",
  cpp: "cpp",
  "c++14": "cpp",
  cpp14: "cpp",
  "c++17": "cpp",
  cpp17: "cpp",
  "c++20": "cpp",
  cpp20: "cpp",
  "c++23": "cpp",
  cpp23: "cpp",
  java: "java",
  javascript: "javascript",
  js: "javascript",
  node: "javascript",
  nodejs: "javascript",
  py: "python",
  python: "python",
  python3: "python",
  postgres: "postgresql",
  postgresql: "postgresql",
  sql: "sql",
  ts: "typescript",
  typescript: "typescript",
};

const EXECUTION_LANGUAGE_ALIASES = {
  c: "c",
  "c language": "c",
  c99: "c99",
  "c++": "cpp",
  cpp: "cpp",
  "c++14": "cpp14",
  cpp14: "cpp14",
  "c++17": "cpp17",
  cpp17: "cpp17",
  "c++20": "cpp20",
  cpp20: "cpp20",
  "c++23": "cpp23",
  cpp23: "cpp23",
  java: "java",
  javascript: "javascript",
  js: "javascript",
  node: "javascript",
  nodejs: "javascript",
  py: "python3",
  python: "python3",
  python3: "python3",
  postgres: "postgresql",
  postgresql: "postgresql",
  sql: "sql",
  ts: "typescript",
  typescript: "typescript",
};

const UNSUPPORTED_LANGUAGE_DETAILS = {
  sql: "SQL execution is not enabled in the backend runner",
  postgresql: "PostgreSQL execution is not enabled in the backend runner",
};

const ROOM_LANGUAGE_DEFAULT = "javascript";

const normalizeExecutionLanguage = (language = "") =>
  normalizeValue(language).trim().toLowerCase();

const getExecutionIssueText = (...values) =>
  values
    .map((value) => normalizeValue(value).trim())
    .find(Boolean) || "";

const isHtmlLanguage = (language = "") => {
  const normalizedLanguage = normalizeExecutionLanguage(language);

  return ["html", "htm", "htmlmixed"].includes(normalizedLanguage);
};

const resolveSharedLanguage = (language = "") => {
  const normalizedLanguage = normalizeExecutionLanguage(language);

  if (isHtmlLanguage(normalizedLanguage)) {
    return "html";
  }

  return SHARED_LANGUAGE_ALIASES[normalizedLanguage] || normalizedLanguage;
};

const getLanguageFileName = (language = "") => {
  const resolvedLanguage = resolveSharedLanguage(language);

  switch (resolvedLanguage) {
    case "html":
      return "index.html";
    case "javascript":
      return "main.js";
    case "typescript":
      return "main.ts";
    case "python":
      return "main.py";
    case "java":
      return "Main.java";
    case "c":
      return "main.c";
    case "cpp":
      return "main.cpp";
    case "sql":
    case "postgresql":
      return "query.sql";
    default:
      return "main.txt";
  }
};

const createRoomLanguageState = ({ roomId, language, requestedBy = "" }) => {
  const resolvedLanguage = resolveSharedLanguage(language);

  return {
    roomId: normalizeValue(roomId).trim(),
    language: resolvedLanguage || ROOM_LANGUAGE_DEFAULT,
    fileName: getLanguageFileName(resolvedLanguage || ROOM_LANGUAGE_DEFAULT),
    requestedBy: normalizeValue(requestedBy).trim(),
    updatedAt: new Date().toISOString(),
  };
};

const emitRoomLanguageState = (roomId, languageState, socket = null) => {
  const normalizedRoomId = normalizeValue(roomId).trim();

  if (!normalizedRoomId) {
    return;
  }

  roomLanguageStates[normalizedRoomId] = languageState;
  io.to(normalizedRoomId).emit("language_change", languageState);

  if (socket && !socket.rooms.has(normalizedRoomId)) {
    socket.emit("language_change", languageState);
  }
};

const buildHtmlPreview = ({ code = "", html = "", css = "", js = "" } = {}) => {
  const markup = normalizeValue(html || code);
  const styles = normalizeValue(css);
  const script = normalizeValue(js);

  if (!styles && !script && /<!doctype html|<html[\s>]/i.test(markup)) {
    return markup;
  }

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
${styles}
    </style>
  </head>
  <body>
${markup}
    <script>
${script}
    </script>
  </body>
</html>`;
};

const createExecutionUpdate = ({
  roomId,
  language,
  code,
  html,
  css,
  js,
  stdin,
  status,
  runner,
  result = {},
  error = null,
  requestedBy = "",
}) => {
  const normalizedLanguage = normalizeExecutionLanguage(language);
  const isHtml = isHtmlLanguage(normalizedLanguage);
  const statusCode = result.statusCode ?? result.status_code ?? null;
  const compilationStatus =
    result.compilationStatus ?? result.compilation_status ?? null;
  const rawOutput = normalizeValue(result.stdout || result.output || "");
  const stderr = normalizeValue(result.stderr || result.error || "");
  const explicitCompileError = normalizeValue(
    result.compileError || result.compile_error || result.compilerError || ""
  );
  const runtimeError = getExecutionIssueText(
    error,
    stderr,
    statusCode && statusCode !== 200 ? rawOutput : ""
  );
  const compileError = getExecutionIssueText(
    explicitCompileError,
    compilationStatus && compilationStatus !== 0 ? rawOutput : ""
  );
  const stdout = compileError ? "" : rawOutput;
  const failureMessage = getExecutionIssueText(compileError, runtimeError);
  const executionFailed =
    status === "error" ||
    Boolean(failureMessage) ||
    (statusCode !== null && Number(statusCode) >= 400);
  const resolvedStatus = executionFailed ? "error" : status;

  return {
    roomId: normalizeValue(roomId).trim(),
    language: normalizedLanguage,
    status: resolvedStatus,
    runner,
    requestedBy: normalizeValue(requestedBy).trim(),
    code: normalizeValue(code),
    html: normalizeValue(html),
    css: normalizeValue(css),
    js: normalizeValue(js),
    stdin: normalizeValue(stdin),
    output: stdout,
    stdout,
    stderr: runtimeError,
    compileError,
    error: failureMessage,
    statusCode,
    compilationStatus,
    memory: result.memory || "",
    cpuTime: result.cpuTime || result.cpu_time || "",
    preview: isHtml ? buildHtmlPreview({ code, html, css, js }) : "",
    completed: resolvedStatus === "completed" || resolvedStatus === "error",
    success: resolvedStatus !== "error",
    message: resolvedStatus === "error" ? failureMessage || "Code execution failed" : "",
    updatedAt: new Date().toISOString(),
    raw: result,
  };
};

const sanitizeExecutionPayloadForLogs = (payload = {}) => ({
  ...payload,
  clientId: payload.clientId ? "[present]" : "[missing]",
  clientSecret: payload.clientSecret ? "[present]" : "[missing]",
  scriptLength: normalizeValue(payload.script).length,
  stdinLength: normalizeValue(payload.stdin).length,
});

const summarizeApiResponseForLogs = (data = {}) => ({
  statusCode: data.statusCode ?? data.status_code ?? null,
  compilationStatus: data.compilationStatus ?? data.compilation_status ?? null,
  memory: data.memory || "",
  cpuTime: data.cpuTime || data.cpu_time || "",
  hasOutput: Boolean(normalizeValue(data.output || data.stdout).trim()),
  hasError: Boolean(
    normalizeValue(data.error || data.stderr || data.compileError).trim()
  ),
  outputPreview: normalizeValue(data.output || data.stdout).slice(0, 200),
  stderrPreview: normalizeValue(data.stderr || data.error).slice(0, 200),
  compileErrorPreview: normalizeValue(
    data.compileError || data.compile_error || data.compilerError
  ).slice(0, 200),
});

const buildExecutionFailure = ({
  roomId,
  code,
  html,
  css,
  js,
  language,
  stdin,
  requestedBy,
  message,
  detail,
  runner,
}) =>
  createExecutionUpdate({
    roomId,
    language,
    code,
    html,
    css,
    js,
    stdin,
    status: "error",
    runner,
    error: detail || message,
    requestedBy,
    result: {
      stderr: detail || message,
      error: detail || message,
      output: "",
    },
  });

const emitExecutionFailure = (roomId, failureUpdate, socket = null) => {
  const normalizedRoomId = normalizeValue(roomId).trim();

  if (normalizedRoomId) {
    emitExecutionUpdate(normalizedRoomId, failureUpdate);
  }

  if (socket && (!normalizedRoomId || !socket.rooms.has(normalizedRoomId))) {
    socket.emit("execution_error", failureUpdate);
  }
};

const resolveExecutionTarget = (language = "") => {
  const normalizedLanguage = normalizeExecutionLanguage(language);
  const sharedLanguage = resolveSharedLanguage(normalizedLanguage);
  const aliasedLanguage =
    EXECUTION_LANGUAGE_ALIASES[normalizedLanguage] ||
    EXECUTION_LANGUAGE_ALIASES[sharedLanguage] ||
    normalizedLanguage;
  const configuredTarget = EXECUTION_LANGUAGE_CONFIG[aliasedLanguage];

  if (configuredTarget) {
    return {
      requestedLanguage: normalizedLanguage,
      sharedLanguage,
      resolvedLanguage: aliasedLanguage,
      jdoodleLanguage: configuredTarget.language,
      versionIndex: configuredTarget.versionIndex,
      supported: true,
      detail: "",
    };
  }

  return {
    requestedLanguage: normalizedLanguage,
    sharedLanguage,
    resolvedLanguage: sharedLanguage || aliasedLanguage,
    jdoodleLanguage: "",
    versionIndex: "",
    supported: false,
    detail:
      UNSUPPORTED_LANGUAGE_DETAILS[sharedLanguage || aliasedLanguage] ||
      `Unsupported execution language: ${normalizedLanguage || "unknown"}`,
  };
};

const emitExecutionUpdate = (roomId, update) => {
  const normalizedRoomId = normalizeValue(roomId).trim();

  if (!normalizedRoomId) {
    return;
  }

  executionStates[normalizedRoomId] = update;
  io.to(normalizedRoomId).emit("execution_update", update);

  if (update.status === "error") {
    io.to(normalizedRoomId).emit("execution_error", update);
  } else {
    io.to(normalizedRoomId).emit("execution-result", update);
  }

  if (update.status !== "error" && isHtmlLanguage(update.language)) {
    io.to(normalizedRoomId).emit("html_preview_update", update);
  }
};

const buildAxiosErrorDetail = (error) => {
  if (!error) {
    return "Unknown execution error";
  }

  if (error.code === "ECONNABORTED") {
    return `Execution timed out after ${JDOODLE_EXECUTION_TIMEOUT_MS}ms`;
  }

  return getExecutionIssueText(
    error.response?.data?.error,
    error.response?.data?.message,
    error.message
  );
};

const executeCode = async ({
  roomId,
  code,
  html,
  css,
  js,
  language,
  stdin,
  requestedBy,
}) => {
  const normalizedLanguage = normalizeExecutionLanguage(language);
  const executionTarget = resolveExecutionTarget(normalizedLanguage);

  if (isHtmlLanguage(normalizedLanguage)) {
    return createExecutionUpdate({
      roomId,
      language: normalizedLanguage,
      code,
      html,
      css,
      js,
      stdin,
      status: "completed",
      runner: "browser-preview",
      requestedBy,
    });
  }

  if (!executionTarget.supported) {
    throw new Error(executionTarget.detail);
  }

  if (
    !normalizeValue(process.env.JDOODLE_CLIENT_ID).trim() ||
    !normalizeValue(process.env.JDOODLE_CLIENT_SECRET).trim()
  ) {
    throw new Error("JDoodle API credentials are missing on the server");
  }

  const payload = {
    clientId: process.env.JDOODLE_CLIENT_ID,
    clientSecret: process.env.JDOODLE_CLIENT_SECRET,
    script: code,
    stdin: stdin || "",
    language: executionTarget.jdoodleLanguage,
    versionIndex: executionTarget.versionIndex,
  };

  console.log("EXECUTION LANGUAGE:", executionTarget);
  console.log(
    "EXECUTION REQUEST PAYLOAD:",
    sanitizeExecutionPayloadForLogs(payload)
  );

  let data;

  try {
    const response = await axios.post("https://api.jdoodle.com/v1/execute", payload, {
      timeout: JDOODLE_EXECUTION_TIMEOUT_MS,
    });
    data = response.data;
  } catch (error) {
    console.log("EXECUTION API ERROR:", {
      language: executionTarget,
      detail: buildAxiosErrorDetail(error),
      response: error.response?.data || null,
    });
    throw error;
  }

  console.log("EXECUTION API RESPONSE:", summarizeApiResponseForLogs(data));

  const completedUpdate = createExecutionUpdate({
    roomId,
    language: normalizedLanguage,
    code,
    html,
    css,
    js,
    stdin,
    status: "completed",
    runner: "jdoodle",
    result: data,
    requestedBy,
  });

  if (!completedUpdate.success) {
    console.log("EXECUTION FAILURE DETAILS:", {
      language: executionTarget,
      statusCode: completedUpdate.statusCode,
      compilationStatus: completedUpdate.compilationStatus,
      stderr: completedUpdate.stderr,
      compileError: completedUpdate.compileError,
      message: completedUpdate.message,
    });
  }

  return completedUpdate;
};

// JDoodle Code Execution Route
app.post("/run", async (req, res) => {
  try {
    const { roomId, code, html, css, js, language, stdin, username } = req.body;
    const normalizedRoomId = normalizeValue(roomId).trim();

    const hasRunnableCode =
      normalizeValue(code).trim() ||
      normalizeValue(html).trim() ||
      normalizeValue(css).trim() ||
      normalizeValue(js).trim();

    if (!hasRunnableCode || !normalizeExecutionLanguage(language)) {
      const failureUpdate = buildExecutionFailure({
        roomId: normalizedRoomId,
        code,
        html,
        css,
        js,
        stdin,
        language,
        requestedBy: username,
        runner: isHtmlLanguage(language) ? "browser-preview" : "jdoodle",
        message: "code and language are required",
        detail: "code and language are required",
      });

      emitExecutionFailure(normalizedRoomId, failureUpdate);

      return res.status(400).json({
        success: false,
        message: "code and language are required",
        ...failureUpdate,
      });
    }

    const startedUpdate = createExecutionUpdate({
      roomId: normalizedRoomId,
      language,
      code,
      html,
      css,
      js,
      stdin,
      status: "running",
      runner: isHtmlLanguage(language) ? "browser-preview" : "jdoodle",
      requestedBy: username,
    });

    emitExecutionUpdate(normalizedRoomId, startedUpdate);

    const completedUpdate = await executeCode({
      roomId: normalizedRoomId,
      code,
      html,
      css,
      js,
      language,
      stdin,
      requestedBy: username,
    });

    if (completedUpdate.success) {
      emitExecutionUpdate(normalizedRoomId, completedUpdate);
    } else {
      emitExecutionFailure(normalizedRoomId, completedUpdate);
    }

    res.json(completedUpdate);
  } catch (error) {
    console.log("RUN ROUTE EXECUTION ERROR:", {
      detail: buildAxiosErrorDetail(error),
      response: error.response?.data || null,
    });

    const { roomId, code, html, css, js, language, stdin, username } =
      req.body || {};
    const failureUpdate = buildExecutionFailure({
      roomId,
      language,
      code,
      html,
      css,
      js,
      stdin,
      runner: isHtmlLanguage(language) ? "browser-preview" : "jdoodle",
      requestedBy: username,
      message: "Code execution failed",
      detail: buildAxiosErrorDetail(error),
    });

    emitExecutionFailure(roomId, failureUpdate);

    res.status(500).json({
      success: false,
      message: "Code execution failed",
      ...failureUpdate,
    });
  }
});

app.get("/health", (_, res) => {
  res.status(200).json({
    status: "ok",
    service: "CollabX Backend",
  });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["polling", "websocket"],
});

const roomUsers = {};
const JOIN_ERROR_EVENTS = ["join-error", "join_error"];

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const hashRoomPassword = (password = "") =>
  crypto.createHash("sha256").update(password).digest("hex");

const isSha256Hash = (value = "") => /^[a-f0-9]{64}$/i.test(value);

const isBcryptHash = (value = "") => /^\$2[aby]\$/.test(value);

const getRoomById = async (roomId) => {
  const normalizedRoomId = normalizeValue(roomId).trim();
  const result = await pool.query(
    `
    SELECT room_id, room_password AS password
    FROM rooms
    WHERE TRIM(room_id) = $1
    `,
    [normalizedRoomId]
  );

  return result.rows[0];
};

const getRoomsTableSchema = async () => {
  const result = await pool.query(
    `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'rooms'
    ORDER BY ordinal_position
    `
  );

  return result.rows;
};

const getOnlineUsers = (roomId) =>
  (roomUsers[roomId] || []).map((user) => ({
    socketId: user.socketId,
    username: user.username,
  }));

const emitJoinError = (socket, message) => {
  const payload = {
    success: false,
    message,
  };

  JOIN_ERROR_EVENTS.forEach((eventName) => {
    socket.emit(eventName, payload);
  });

  return payload;
};

const compareRoomPassword = async (storedPassword, password) => {
  const enteredPassword = normalizeValue(password).trim();
  const normalizedStoredPassword = normalizeValue(storedPassword).trim();

  if (!normalizedStoredPassword || !enteredPassword) {
    return false;
  }

  if (normalizedStoredPassword === enteredPassword) {
    return true;
  }

  if (isBcryptHash(normalizedStoredPassword) && bcrypt?.compare) {
    return bcrypt.compare(enteredPassword, normalizedStoredPassword);
  }

  if (isSha256Hash(normalizedStoredPassword)) {
    return normalizedStoredPassword === hashRoomPassword(enteredPassword);
  }

  return normalizedStoredPassword === enteredPassword;
};

const verifyRoomPassword = async (roomId, password = "", username = "") => {
  const normalizedRoomId = normalizeValue(roomId).trim();
  const enteredPassword = normalizeValue(password).trim();
  const room = await getRoomById(normalizedRoomId);
  const storedPassword = room?.password;

  if (!room) {
    return {
      success: false,
      message: "Room not found",
    };
  }

  const isValid = await compareRoomPassword(storedPassword, enteredPassword);

  if (!isValid) {
    return {
      success: false,
      message: "Invalid room password",
    };
  }

  return {
    success: true,
  };
};

const initializeDatabase = async () => {
  try {
    await pool.query(`
      ALTER TABLE rooms
      ADD COLUMN IF NOT EXISTS room_password TEXT
    `);
    await pool.query(`
      ALTER TABLE rooms
      ADD COLUMN IF NOT EXISTS creator_username TEXT
    `);
  } catch (error) {
    console.log("Database init error:", error);
  }
};

app.post("/rooms", async (req, res) => {
  try {
    const { roomId, username, password } = req.body;
    const normalizedRoomId = normalizeValue(roomId).trim();
    const normalizedUsername = normalizeValue(username).trim();
    const normalizedPassword = normalizeValue(password).trim();
    const roomsTableSchema = await getRoomsTableSchema();

    console.log("CREATE ROOM BODY:", req.body);
    console.log("ROOMS TABLE SCHEMA:", roomsTableSchema);

    if (!normalizedRoomId || !normalizedUsername || !normalizedPassword) {
      return res.status(400).json({
        success: false,
        message: "roomId, username and password are required",
      });
    }

    const insertResult = await pool.query(
      `
      INSERT INTO rooms (room_id, room_password, creator_username)
      VALUES ($1, $2, $3)
      ON CONFLICT (room_id)
      DO UPDATE SET
        room_password = EXCLUDED.room_password,
        creator_username = EXCLUDED.creator_username
      RETURNING room_id, room_password, creator_username
      `,
      [
        normalizedRoomId,
        hashRoomPassword(normalizedPassword),
        normalizedUsername,
      ]
    );
    const insertedRow = insertResult.rows[0];

    const savedRoomResult = await pool.query(
      `
      SELECT room_id, room_password, creator_username
      FROM rooms
      WHERE room_id = $1
      `,
      [normalizedRoomId]
    );
    const savedRoom = savedRoomResult.rows[0];

    console.log("INSERTED ROW:", insertedRow);
    console.log("SAVED ROOM:", savedRoom);

    res.json({
      success: true,
      room: insertedRow,
    });
  } catch (error) {
    console.log("Create room error:", error);
    console.error(error);

    let roomsTableSchema = [];

    try {
      roomsTableSchema = await getRoomsTableSchema();
      console.log("ROOMS TABLE SCHEMA:", roomsTableSchema);
    } catch (schemaError) {
      console.error(schemaError);
    }

    res.status(500).json({
      success: false,
      message: "Room creation failed",
      error: error.message,
      detail: error.detail,
      code: error.code,
      schema: roomsTableSchema,
    });
  }
});

app.post("/rooms/verify", async (req, res) => {
  try {
    const { roomId, password } = req.body;

    if (!normalizeValue(roomId).trim() || !normalizeValue(password).trim()) {
      return res.status(400).json({
        success: false,
        message: "roomId and password are required",
      });
    }

    const verification = await verifyRoomPassword(roomId, password);
    const statusCode = verification.success
      ? 200
      : verification.message === "Room not found"
      ? 404
      : 401;

    res.status(statusCode).json(verification);
  } catch (error) {
    console.log("Room verification error:", error);

    res.status(500).json({
      success: false,
      message: "Room verification failed",
    });
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // JOIN ROOM
  socket.on("join_room", async (payload, callback) => {
    try {
      const { roomId, username, password } = payload || {};
      const normalizedRoomId = normalizeValue(roomId).trim();
      const normalizedUsername = normalizeValue(username).trim();
      const normalizedPassword = normalizeValue(password).trim();

      console.log("JOIN ROOM PAYLOAD:", payload);
      console.log("SOCKET JOIN:", {
        roomId: normalizedRoomId,
        username: normalizedUsername,
        socketId: socket.id,
      });

      if (!normalizedRoomId) {
        const failure = emitJoinError(socket, "Room not found");

        if (typeof callback === "function") {
          callback(failure);
        }

        return;
      }

      if (!normalizedUsername) {
        const failure = emitJoinError(socket, "Username is required");

        if (typeof callback === "function") {
          callback(failure);
        }

        return;
      }

      if (!normalizedPassword) {
        const failure = emitJoinError(socket, "Invalid room password");

        if (typeof callback === "function") {
          callback(failure);
        }

        return;
      }

      const verification = await verifyRoomPassword(
        normalizedRoomId,
        normalizedPassword,
        normalizedUsername
      );

      if (!verification.success) {
        if (typeof callback === "function") {
          callback(verification);
        }

        emitJoinError(socket, verification.message);
        return;
      }

      socket.join(normalizedRoomId);

      if (!roomUsers[normalizedRoomId]) {
        roomUsers[normalizedRoomId] = [];
      }

      const existingUser = roomUsers[normalizedRoomId].find(
        (user) => user.socketId === socket.id
      );

      if (!existingUser) {
        roomUsers[normalizedRoomId].push({
          socketId: socket.id,
          username: normalizedUsername,
        });
      }

      const users = getOnlineUsers(normalizedRoomId);

      io.to(normalizedRoomId).emit("room_users", users);
      io.to(normalizedRoomId).emit("online-users", users);

      const currentLanguageState =
        roomLanguageStates[normalizedRoomId] ||
        createRoomLanguageState({
          roomId: normalizedRoomId,
          language: ROOM_LANGUAGE_DEFAULT,
        });

      roomLanguageStates[normalizedRoomId] = currentLanguageState;
      socket.emit("language_change", currentLanguageState);

      if (executionStates[normalizedRoomId]) {
        socket.emit("execution_update", executionStates[normalizedRoomId]);
        if (executionStates[normalizedRoomId].status === "error") {
          socket.emit("execution_error", executionStates[normalizedRoomId]);
        } else {
          socket.emit("execution-result", executionStates[normalizedRoomId]);
        }

        if (
          executionStates[normalizedRoomId].status !== "error" &&
          isHtmlLanguage(executionStates[normalizedRoomId].language)
        ) {
          socket.emit("html_preview_update", executionStates[normalizedRoomId]);
        }
      }

      console.log(`${normalizedUsername} joined ${normalizedRoomId}`);

      if (typeof callback === "function") {
        callback({
          success: true,
        });
      }
    } catch (error) {
      console.log("Join room error:", error);
      const failure = emitJoinError(socket, "Room join failed");

      if (typeof callback === "function") {
        callback(failure);
      }
    }
  });

  // REALTIME CODE SYNC + SAVE TO POSTGRES
  socket.on("code_change", async ({ roomId, code }) => {
    socket.to(roomId).emit("receive_code", code);

    try {
      await pool.query(
        `
        INSERT INTO rooms (room_id, code)
        VALUES ($1, $2)
        ON CONFLICT (room_id)
        DO UPDATE SET code = EXCLUDED.code
        `,
        [roomId, code]
      );
    } catch (error) {
      console.log("Database save error:", error);
    }
  });

  socket.on("language_change", (payload, callback) => {
    const { roomId, language, username } = payload || {};
    const normalizedRoomId = normalizeValue(roomId).trim();
    const resolvedLanguage = resolveSharedLanguage(language);

    console.log("LANGUAGE CHANGE REQUEST:", {
      roomId: normalizedRoomId,
      username: normalizeValue(username).trim(),
      requestedLanguage: normalizeExecutionLanguage(language),
      resolvedLanguage,
    });

    if (!normalizedRoomId || !socket.rooms.has(normalizedRoomId)) {
      const failure = {
        success: false,
        message: "Join the room before changing language",
      };

      socket.emit("language_change_error", failure);

      if (typeof callback === "function") {
        callback(failure);
      }

      return;
    }

    if (!resolvedLanguage) {
      const failure = {
        success: false,
        message: "language is required",
      };

      socket.emit("language_change_error", failure);

      if (typeof callback === "function") {
        callback(failure);
      }

      return;
    }

    const languageState = createRoomLanguageState({
      roomId: normalizedRoomId,
      language: resolvedLanguage,
      requestedBy: username,
    });

    emitRoomLanguageState(normalizedRoomId, languageState);

    if (typeof callback === "function") {
      callback({
        success: true,
        languageState,
      });
    }
  });

  socket.on("get_language_state", (roomId, callback) => {
    const normalizedRoomId = normalizeValue(roomId).trim();
    const languageState =
      roomLanguageStates[normalizedRoomId] ||
      (normalizedRoomId
        ? createRoomLanguageState({
            roomId: normalizedRoomId,
            language: ROOM_LANGUAGE_DEFAULT,
          })
        : null);

    if (languageState && normalizedRoomId) {
      roomLanguageStates[normalizedRoomId] = languageState;
      socket.emit("language_change", languageState);
    }

    if (typeof callback === "function") {
      callback({
        success: true,
        languageState,
      });
    }
  });

  socket.on("run_code", async (payload, callback) => {
    const { roomId, code, html, css, js, language, stdin, username } =
      payload || {};
    const normalizedRoomId = normalizeValue(roomId).trim();

    try {
      console.log("RUN CODE REQUEST:", {
        roomId: normalizedRoomId,
        username: normalizeValue(username).trim(),
        language: normalizeExecutionLanguage(language),
        codeLength: normalizeValue(code).length,
        htmlLength: normalizeValue(html).length,
        cssLength: normalizeValue(css).length,
        jsLength: normalizeValue(js).length,
        stdinLength: normalizeValue(stdin).length,
      });

      if (!normalizedRoomId || !socket.rooms.has(normalizedRoomId)) {
        const failure = buildExecutionFailure({
          roomId: normalizedRoomId,
          code,
          html,
          css,
          js,
          stdin,
          language,
          requestedBy: username,
          runner: isHtmlLanguage(language) ? "browser-preview" : "jdoodle",
          message: "Join the room before running code",
          detail: "Join the room before running code",
        });

        if (typeof callback === "function") {
          callback({
            success: false,
            execution: failure,
            message: failure.error || "Join the room before running code",
          });
        }

        emitExecutionFailure(normalizedRoomId, failure, socket);
        return;
      }

      const hasRunnableCode =
        normalizeValue(code).trim() ||
        normalizeValue(html).trim() ||
        normalizeValue(css).trim() ||
        normalizeValue(js).trim();

      if (!hasRunnableCode || !normalizeExecutionLanguage(language)) {
        const failure = buildExecutionFailure({
          roomId: normalizedRoomId,
          code,
          html,
          css,
          js,
          stdin,
          language,
          requestedBy: username,
          runner: isHtmlLanguage(language) ? "browser-preview" : "jdoodle",
          message: "code and language are required",
          detail: "code and language are required",
        });

        if (typeof callback === "function") {
          callback({
            success: false,
            execution: failure,
            message: failure.error || "code and language are required",
          });
        }

        emitExecutionFailure(normalizedRoomId, failure, socket);
        return;
      }

      const startedUpdate = createExecutionUpdate({
        roomId: normalizedRoomId,
        language,
        code,
        html,
        css,
        js,
        stdin,
        status: "running",
        runner: isHtmlLanguage(language) ? "browser-preview" : "jdoodle",
        requestedBy: username,
      });

      emitExecutionUpdate(normalizedRoomId, startedUpdate);

      const completedUpdate = await executeCode({
        roomId: normalizedRoomId,
        code,
        html,
        css,
        js,
        language,
        stdin,
        requestedBy: username,
      });

      if (completedUpdate.success) {
        emitExecutionUpdate(normalizedRoomId, completedUpdate);
      } else {
        emitExecutionFailure(normalizedRoomId, completedUpdate, socket);
      }

      if (typeof callback === "function") {
        callback({
          success: completedUpdate.success,
          execution: completedUpdate,
          message: completedUpdate.message,
        });
      }
    } catch (error) {
      console.log(
        "RUN CODE EXECUTION ERROR:",
        {
          detail: buildAxiosErrorDetail(error),
          response: error.response?.data || null,
        }
      );

      const failureUpdate = buildExecutionFailure({
        roomId: normalizedRoomId,
        language,
        code,
        html,
        css,
        js,
        stdin,
        runner: isHtmlLanguage(language) ? "browser-preview" : "jdoodle",
        requestedBy: username,
        message: "Code execution failed",
        detail: buildAxiosErrorDetail(error),
      });

      emitExecutionFailure(normalizedRoomId, failureUpdate, socket);

      if (typeof callback === "function") {
        callback({
          success: false,
          execution: failureUpdate,
          message: failureUpdate.message || "Code execution failed",
        });
      }
    }
  });

  socket.on("execution_update", (payload, callback) => {
    const { roomId } = payload || {};
    const normalizedRoomId = normalizeValue(roomId).trim();

    if (!normalizedRoomId || !socket.rooms.has(normalizedRoomId)) {
      const failure = {
        success: false,
        message: "Join the room before syncing execution state",
      };

      if (typeof callback === "function") {
        callback(failure);
      }

      return;
    }

    const update = createExecutionUpdate({
      ...payload,
      roomId: normalizedRoomId,
      status: payload?.status || "completed",
      runner: payload?.runner || "client",
    });

    emitExecutionUpdate(normalizedRoomId, update);

    if (typeof callback === "function") {
      callback({
        success: true,
        execution: update,
      });
    }
  });

  socket.on("get_execution_state", (roomId, callback) => {
    const normalizedRoomId = normalizeValue(roomId).trim();
    const execution = executionStates[normalizedRoomId] || null;

    if (execution) {
      socket.emit("execution_update", execution);
      if (execution.status === "error") {
        socket.emit("execution_error", execution);
      } else {
        socket.emit("execution-result", execution);
      }

      if (execution.status !== "error" && isHtmlLanguage(execution.language)) {
        socket.emit("html_preview_update", execution);
      }
    }

    if (typeof callback === "function") {
      callback({
        success: true,
        execution,
      });
    }
  });

  // Typing Indicator
  socket.on("typing", ({ roomId, username }) => {
    socket.to(roomId).emit("user_typing", {
      username,
    });
  });

  // LOAD SAVED CODE
  socket.on("get_code", async (roomId) => {
    try {
      const result = await pool.query(
        "SELECT code FROM rooms WHERE room_id = $1",
        [roomId]
      );

      if (result.rows.length > 0) {
        socket.emit("load_code", result.rows[0].code);
      }
    } catch (error) {
      console.log("Database load error:", error);
    }
  });

  // CHAT
  socket.on("send_message", (data) => {
    io.to(data.roomId).emit("receive_message", data);
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    for (const roomId in roomUsers) {
      roomUsers[roomId] = roomUsers[roomId].filter(
        (user) => user.socketId !== socket.id
      );

      if (roomUsers[roomId].length === 0) {
        delete roomUsers[roomId];
      }

      const users = getOnlineUsers(roomId);

      io.to(roomId).emit("room_users", users);
      io.to(roomId).emit("online-users", users);
    }

    console.log("User disconnected:", socket.id);
  });
});

initializeDatabase().finally(() => {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
});
