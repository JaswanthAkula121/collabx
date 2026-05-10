import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;
const JUDGE0_API_URL =
  process.env.JUDGE0_API_URL || "https://ce.judge0.com";
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const JUDGE0_EXTRA_API_URL =
  process.env.JUDGE0_EXTRA_API_URL || "https://extra-ce.judge0.com";
const LANGUAGE_ID_MAP = {
  c: 50,
  cpp: 54,
  java: 62,
  javascript: 63,
  python: 71,
  typescript: 74,
  sql: 82,
  postgresql: 82,
};
const LANGUAGE_EXECUTION_TARGETS = {
  c: { languageId: 50, apiUrl: JUDGE0_API_URL },
  cpp: { languageId: 54, apiUrl: JUDGE0_API_URL },
  java: { languageId: 62, apiUrl: JUDGE0_API_URL },
  javascript: { languageId: 63, apiUrl: JUDGE0_API_URL },
  python: { languageId: 71, apiUrl: JUDGE0_API_URL },
  typescript: { languageId: 74, apiUrl: JUDGE0_API_URL },
  sql: { languageId: 82, apiUrl: JUDGE0_EXTRA_API_URL },
  postgresql: { languageId: 82, apiUrl: JUDGE0_EXTRA_API_URL },
};
const FETCH_TIMEOUT_MS = Number(process.env.JUDGE0_FETCH_TIMEOUT_MS || 15000);
const POLL_INTERVAL_MS = Number(process.env.JUDGE0_POLL_INTERVAL_MS || 1000);
const MAX_POLL_ATTEMPTS = Number(process.env.JUDGE0_MAX_POLL_ATTEMPTS || 60);
const JDOODLE_API_URL =
  process.env.JDOODLE_API_URL || "https://api.jdoodle.com/v1/execute";
const JDOODLE_LANGUAGE_MAP = {
  c: "c",
  cpp: "cpp17",
  python: "python3",
  java: "java",
  javascript: "nodejs",
};
const ROOM_PASSWORDS = new Map();
const ROOM_CODE = new Map();
const ROOM_USERS = new Map();
const ROOM_TERMINAL_STATE = new Map();
const ROOM_HTML_PREVIEW = new Map();
const ROOM_OUTPUT_MODE = new Map();
const ROOM_LANGUAGE = new Map();
const EXECUTION_EVENT_NAMES = {
  started: ["code_execution_started", "execution_started"],
  stdout: ["stdout_update", "execution_stdout"],
  stderr: ["stderr_update", "execution_stderr"],
  compileError: ["compile_error", "execution_compile_error"],
  completed: ["execution_completed", "code_execution_completed"],
};

const getRoomUsers = (roomId) => Array.from(ROOM_USERS.get(roomId)?.values() || []);

const emitRoomUsers = (roomId) => {
  io.to(roomId).emit("room_users", getRoomUsers(roomId));
};

const saveTerminalOutput = (roomId, output) => {
  if (!roomId || !Array.isArray(output)) return;
  ROOM_TERMINAL_STATE.set(roomId, output);
};

const appendTerminalOutput = (roomId, output) => {
  if (!roomId || !output) return;

  const currentOutput = ROOM_TERMINAL_STATE.get(roomId) || [];
  ROOM_TERMINAL_STATE.set(roomId, [...currentOutput, String(output).trimEnd()]);
};

const setRoomOutputMode = (roomId, mode) => {
  if (!roomId || !mode) return;
  ROOM_OUTPUT_MODE.set(roomId, mode);
};

const getHtmlPreviewValue = (payload = {}) =>
  typeof payload.html === "string"
    ? payload.html
    : typeof payload.htmlPreview === "string"
      ? payload.htmlPreview
      : typeof payload.preview === "string"
        ? payload.preview
        : typeof payload.srcDoc === "string"
          ? payload.srcDoc
          : typeof payload.content === "string"
            ? payload.content
            : typeof payload.sourceCode === "string"
              ? payload.sourceCode
              : typeof payload.code === "string"
                ? payload.code
                : "";

const hasHtmlPreviewPayload = (payload = {}) =>
  [
    "html",
    "htmlPreview",
    "preview",
    "srcDoc",
    "content",
    "sourceCode",
    "code",
  ].some((key) => Object.prototype.hasOwnProperty.call(payload, key));

const parseJsonResponse = async (response, label) => {
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      `${label} returned non-JSON response (${response.status}). First bytes: ${raw.slice(0, 120)}`
    );
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchJsonWithTimeout = async (url, options, label) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const data = await parseJsonResponse(response, label);
    return { response, data };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`${label} timed out after ${FETCH_TIMEOUT_MS}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const executeWithJudge0 = async ({ sourceCode, language, languageId: requestedLanguageId, stdin }) => {
  if (!sourceCode || !language) {
    const error = new Error("Missing sourceCode or language.");
    error.statusCode = 400;
    throw error;
  }

  const languageKey = String(language).toLowerCase();
  const languageTarget = LANGUAGE_EXECUTION_TARGETS[languageKey];
  const languageId =
    Number(requestedLanguageId) ||
    languageTarget?.languageId ||
    LANGUAGE_ID_MAP[languageKey];
  if (!languageId) {
    const error = new Error(`Execution is not supported for "${language}".`);
    error.statusCode = 400;
    throw error;
  }

  const apiUrl = languageTarget?.apiUrl || JUDGE0_API_URL;
  const { response: submitResponse, data: submitData } = await fetchJsonWithTimeout(
    `${apiUrl}/submissions?base64_encoded=false&wait=false`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: sourceCode,
        language_id: languageId,
        stdin: stdin || "",
      }),
    },
    "Judge0 submission"
  );
  if (!submitResponse.ok) {
    throw new Error(
      submitData?.error ||
        submitData?.message ||
        `Judge0 submission failed with status ${submitResponse.status}.`
    );
  }

  const token = submitData?.token;
  if (!token) {
    throw new Error("Judge0 did not return a submission token.");
  }

  let result = null;
  let attempts = 0;

  while (attempts < MAX_POLL_ATTEMPTS) {
    attempts += 1;
    const { response: resultResponse, data: resultData } =
      await fetchJsonWithTimeout(
        `${apiUrl}/submissions/${token}?base64_encoded=false`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
        "Judge0 polling"
      );
    if (!resultResponse.ok) {
      throw new Error(
        resultData?.error ||
          resultData?.message ||
          `Judge0 polling failed with status ${resultResponse.status}.`
      );
    }

    const statusId = resultData?.status?.id;
    if (statusId && statusId > 2) {
      result = resultData;
      break;
    }

    await delay(POLL_INTERVAL_MS);
  }

  if (!result) {
    throw new Error(
      `Execution timed out while waiting for Judge0 result after ${MAX_POLL_ATTEMPTS} attempts.`
    );
  }

  const compileOutput = result?.compile_output || "";
  const runtimeError = result?.stderr || "";
  const stdout = result?.stdout || "";
  const message = result?.message || "";
  const output = [stdout, compileOutput, runtimeError, message]
    .filter((part) => part && String(part).trim())
    .join("\n");

  return {
    success: result?.status?.id === 3,
    output: output || "Execution finished with no output.",
    stdout,
    stderr: runtimeError,
    compileOutput,
    message,
    status: result?.status?.description || "Completed",
    memory: result?.memory || "",
    time: result?.time || "",
  };
};

app.post("/api/execute", async (req, res) => {
  try {
    return res.json(await executeWithJudge0(req.body || {}));
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      output: error.message || "Execution failed unexpectedly.",
    });
  }
});

app.post("/run", async (req, res) => {
  const { code, language, stdin } = req.body || {};
  console.log("REQ BODY:", req.body);

  if (!code || !language) {
    return res.status(400).json({
      error: "Missing code or language.",
    });
  }

  const jdoodleLanguage = JDOODLE_LANGUAGE_MAP[language];
  if (!jdoodleLanguage) {
    return res.status(400).json({
      error: `Execution is not supported for "${language}".`,
    });
  }

  const clientId = process.env.JDOODLE_CLIENT_ID;
  const clientSecret = process.env.JDOODLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({
      error: "JDoodle credentials are not configured.",
    });
  }

  try {
    const jdoodleResponse = await fetch(JDOODLE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: process.env.JDOODLE_CLIENT_ID,
        clientSecret: process.env.JDOODLE_CLIENT_SECRET,
        script: code,
        language: JDOODLE_LANGUAGE_MAP[language],
        stdin: stdin || "",
        versionIndex: "0",
      }),
    });

    const jdoodleData = await parseJsonResponse(jdoodleResponse, "JDoodle API");

    if (!jdoodleResponse.ok) {
      return res.status(jdoodleResponse.status).json({
        error:
          jdoodleData?.error ||
          jdoodleData?.message ||
          "JDoodle execution failed.",
      });
    }

    return res.json({
      output: jdoodleData?.output || "",
      error: jdoodleData?.error || "",
      memory: jdoodleData?.memory || "",
      cpuTime: jdoodleData?.cpuTime || "",
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Execution failed unexpectedly.",
    });
  }
});

app.post("/rooms", (req, res) => {
  const { roomId, password } = req.body || {};

  if (!roomId || !password) {
    return res.status(400).json({
      success: false,
      message: "Missing roomId or password.",
    });
  }

  ROOM_PASSWORDS.set(roomId, password);

  return res.json({
    success: true,
  });
});

app.post("/rooms/:id/verify", (req, res) => {
  const { id } = req.params;
  const { password } = req.body || {};
  const savedPassword = ROOM_PASSWORDS.get(id);

  if (!savedPassword || savedPassword !== password) {
    return res.status(401).json({
      success: false,
      message: "Incorrect room password",
    });
  }

  return res.json({
    success: true,
  });
});

io.on("connection", (socket) => {
  socket.on("join_room", ({ roomId, username, password } = {}) => {
    if (!roomId || !username) return;

    const savedPassword = ROOM_PASSWORDS.get(roomId);
    if (savedPassword && savedPassword !== password) {
      socket.emit("room_error", { message: "Incorrect room password" });
      return;
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.username = username;

    if (!ROOM_USERS.has(roomId)) {
      ROOM_USERS.set(roomId, new Map());
    }

    ROOM_USERS.get(roomId).set(socket.id, {
      id: socket.id,
      username,
    });

    emitRoomUsers(roomId);

    if (ROOM_CODE.has(roomId)) {
      socket.emit("load_code", ROOM_CODE.get(roomId));
    }

    if (ROOM_LANGUAGE.has(roomId)) {
      socket.emit("language_change", {
        roomId,
        language: ROOM_LANGUAGE.get(roomId),
      });
    }

    const outputMode = ROOM_OUTPUT_MODE.get(roomId);

    if (outputMode === "preview" && ROOM_HTML_PREVIEW.has(roomId)) {
      socket.emit("html_preview_update", {
        roomId,
        html: ROOM_HTML_PREVIEW.get(roomId),
        outputMode: "preview",
      });
    } else if (ROOM_TERMINAL_STATE.has(roomId)) {
      socket.emit("execution_update", {
        roomId,
        output: ROOM_TERMINAL_STATE.get(roomId),
        running: false,
        status: "Synced",
        outputMode: "terminal",
      });
    } else if (ROOM_HTML_PREVIEW.has(roomId)) {
      socket.emit("html_preview_update", {
        roomId,
        html: ROOM_HTML_PREVIEW.get(roomId),
        outputMode: "preview",
      });
    }
  });

  socket.on("get_code", (roomId) => {
    if (roomId && ROOM_CODE.has(roomId)) {
      socket.emit("load_code", ROOM_CODE.get(roomId));
    }
  });

  socket.on("language_change", ({ roomId, language } = {}) => {
    const nextRoomId = roomId || socket.data.roomId;
    if (!nextRoomId || !language) return;

    ROOM_LANGUAGE.set(nextRoomId, language);
    socket.to(nextRoomId).emit("language_change", {
      roomId: nextRoomId,
      language,
    });
  });

  socket.on("get_execution_state", ({ roomId } = {}) => {
    if (!roomId) return;

    const outputMode = ROOM_OUTPUT_MODE.get(roomId);

    if (outputMode === "preview" && ROOM_HTML_PREVIEW.has(roomId)) {
      socket.emit("html_preview_update", {
        roomId,
        html: ROOM_HTML_PREVIEW.get(roomId),
        outputMode: "preview",
      });
    } else if (ROOM_TERMINAL_STATE.has(roomId)) {
      socket.emit("execution_update", {
        roomId,
        output: ROOM_TERMINAL_STATE.get(roomId),
        running: false,
        status: "Synced",
        outputMode: "terminal",
      });
    } else if (ROOM_HTML_PREVIEW.has(roomId)) {
      socket.emit("html_preview_update", {
        roomId,
        html: ROOM_HTML_PREVIEW.get(roomId),
        outputMode: "preview",
      });
    }
  });

  socket.on("code_change", ({ roomId, code } = {}) => {
    if (!roomId) return;

    ROOM_CODE.set(roomId, code || "");
    socket.to(roomId).emit("receive_code", code || "");
  });

  socket.on("typing", ({ roomId, username } = {}) => {
    if (!roomId || !username) return;

    socket.to(roomId).emit("user_typing", { username });
  });

  socket.on("send_message", (messageData = {}) => {
    const { roomId } = messageData;
    if (!roomId) return;

    io.to(roomId).emit("receive_message", messageData);
  });

  socket.on("html_preview_update", (payload = {}) => {
    const roomId = payload.roomId || socket.data.roomId;
    if (!roomId || !hasHtmlPreviewPayload(payload)) return;

    const html = getHtmlPreviewValue(payload);

    ROOM_HTML_PREVIEW.set(roomId, html);
    setRoomOutputMode(roomId, "preview");
    socket.to(roomId).emit("html_preview_update", {
      ...payload,
      roomId,
      html,
      outputMode: "preview",
    });
  });

  socket.on("run_code", async (payload = {}) => {
    const roomId = payload.roomId || socket.data.roomId;
    if (!roomId) return;

    const language = payload.language;
    const sourceCode = payload.sourceCode || payload.code || "";
    const languageLabel = payload.languageLabel || language;

    if (payload.mode === "preview" || language === "html") {
      ROOM_HTML_PREVIEW.set(roomId, sourceCode);
      setRoomOutputMode(roomId, "preview");
      io.to(roomId).emit("html_preview_update", {
        roomId,
        html: sourceCode,
        language,
        outputMode: "preview",
      });
      return;
    }

    const startedOutput = [`Running ${languageLabel || "code"}...`];
    saveTerminalOutput(roomId, startedOutput);
    setRoomOutputMode(roomId, "terminal");
    io.to(roomId).emit("execution_update", {
      roomId,
      language,
      languageLabel,
      output: startedOutput,
      running: true,
      status: "running",
      outputMode: "terminal",
    });

    try {
      const result = await executeWithJudge0({
        sourceCode,
        language,
        languageId: payload.languageId,
        stdin: payload.stdin,
      });
      const output = [
        ...startedOutput,
        ...[result.stdout, result.compileOutput, result.stderr]
          .filter((part) => part && String(part).trim())
          .map((part) => String(part).trimEnd()),
        result.status ? `Status: ${result.status}` : "",
        result.memory ? `Memory: ${result.memory}` : "",
        result.time ? `CPU Time: ${result.time}` : "",
      ].filter(Boolean);

      saveTerminalOutput(roomId, output);
      io.to(roomId).emit("execution-result", {
        ...result,
        roomId,
        language,
        languageLabel,
        output,
        running: false,
        outputMode: "terminal",
      });
    } catch (error) {
      const output = [
        ...startedOutput,
        error.message || "Execution failed unexpectedly.",
      ];

      saveTerminalOutput(roomId, output);
      io.to(roomId).emit("execution_error", {
        roomId,
        language,
        languageLabel,
        error: error.message || "Execution failed unexpectedly.",
        output,
        running: false,
        outputMode: "terminal",
      });
    }
  });

  const relayExecutionEvent = (eventName, payload = {}) => {
    const roomId = payload.roomId || socket.data.roomId;
    if (!roomId) return;

    const nextPayload = { ...payload, roomId };
    setRoomOutputMode(roomId, "terminal");

    if (Array.isArray(nextPayload.output)) {
      saveTerminalOutput(roomId, nextPayload.output);
    } else if (eventName === "code_execution_started") {
      saveTerminalOutput(roomId, [
        `Running ${nextPayload.languageLabel || nextPayload.language || "code"}...`,
      ]);
    } else if (nextPayload.output) {
      appendTerminalOutput(roomId, nextPayload.output);
    }

    socket.to(roomId).emit(eventName, nextPayload);
  };

  EXECUTION_EVENT_NAMES.started.forEach((eventName) => {
    socket.on(eventName, (payload) => relayExecutionEvent(eventName, payload));
  });
  EXECUTION_EVENT_NAMES.stdout.forEach((eventName) => {
    socket.on(eventName, (payload) => relayExecutionEvent(eventName, payload));
  });
  EXECUTION_EVENT_NAMES.stderr.forEach((eventName) => {
    socket.on(eventName, (payload) => relayExecutionEvent(eventName, payload));
  });
  EXECUTION_EVENT_NAMES.compileError.forEach((eventName) => {
    socket.on(eventName, (payload) => relayExecutionEvent(eventName, payload));
  });
  EXECUTION_EVENT_NAMES.completed.forEach((eventName) => {
    socket.on(eventName, (payload) => relayExecutionEvent(eventName, payload));
  });

  socket.on("disconnect", () => {
    const { roomId } = socket.data;
    if (!roomId || !ROOM_USERS.has(roomId)) return;

    const roomUsers = ROOM_USERS.get(roomId);
    roomUsers.delete(socket.id);

    if (!roomUsers.size) {
      ROOM_USERS.delete(roomId);
      return;
    }

    emitRoomUsers(roomId);
  });
});

httpServer.listen(PORT, () => {
  console.log(`CollabX API and Socket.IO running on http://localhost:${PORT}`);
});
