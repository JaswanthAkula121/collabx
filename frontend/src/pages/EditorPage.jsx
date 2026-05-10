import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Editor from "@monaco-editor/react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, QrCode, UserRound, X } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["polling", "websocket"],
});
const LANGUAGE_OPTIONS = [
  { value: "html", label: "HTML", fileName: "index.html", monaco: "html", mode: "preview" },
  { value: "javascript", label: "JavaScript", fileName: "main.js", monaco: "javascript", mode: "execute", judge0Id: 63 },
  { value: "typescript", label: "TypeScript", fileName: "main.ts", monaco: "typescript", mode: "execute", judge0Id: 74 },
  { value: "python", label: "Python", fileName: "main.py", monaco: "python", mode: "execute", judge0Id: 71 },
  { value: "java", label: "Java", fileName: "Main.java", monaco: "java", mode: "execute", judge0Id: 62 },
  { value: "c", label: "C", fileName: "main.c", monaco: "c", mode: "execute", judge0Id: 50 },
  { value: "cpp", label: "C++", fileName: "main.cpp", monaco: "cpp", mode: "execute", judge0Id: 54 },
  { value: "sql", label: "SQL", fileName: "queries.sql", monaco: "sql", mode: "execute", judge0Id: 82 },
  { value: "postgresql", label: "PostgreSQL", fileName: "schema.sql", monaco: "sql", mode: "execute", judge0Id: 82 },
];
const AVATAR_COLORS = [
  "from-purple-500 to-fuchsia-500",
  "from-indigo-500 to-purple-500",
  "from-violet-500 to-sky-500",
];

const DEFAULT_LANGUAGE = "javascript";
const ROOM_LANGUAGE_SYNC_TIMEOUT_MS = 250;
const getLanguageOption = (language) =>
  LANGUAGE_OPTIONS.find((option) => option.value === language);
const DEFAULT_LANGUAGE_OPTION =
  getLanguageOption(DEFAULT_LANGUAGE) || LANGUAGE_OPTIONS[0];

const getInitials = (name = "") => {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (!words.length) return "?";

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
};

const buildExecutionOutput = (data = {}) => {
  if (Array.isArray(data.output)) {
    return data.output;
  }

  const lines = [];
  const stdout = data.stdout || data.output || "";
  const compileOutput =
    data.compileError ||
    data.compile_error ||
    data.compileOutput ||
    data.compile_output ||
    "";
  const stderr = data.stderr || data.error || "";
  const message = data.message || "";

  if (stdout) lines.push(String(stdout).trimEnd());
  if (compileOutput) lines.push(`Compile output:\n${String(compileOutput).trimEnd()}`);
  if (stderr) lines.push(`Error:\n${String(stderr).trimEnd()}`);
  if (message) lines.push(`Message:\n${String(message).trimEnd()}`);
  if (data.status) lines.push(`Status: ${data.status}`);
  if (data.memory) lines.push(`Memory: ${data.memory}`);
  if (data.time || data.cpuTime) lines.push(`CPU Time: ${data.time || data.cpuTime}`);

  return lines.filter(Boolean);
};

const shouldApplyRoomEvent = (payload = {}, currentRoomId) =>
  !payload.roomId || payload.roomId === currentRoomId;

const getExecutionStatus = (payload = {}) =>
  String(payload.status || payload.state || "").toLowerCase();

const isExecutionRunning = (payload = {}) => {
  if (typeof payload.running === "boolean") return payload.running;
  if (typeof payload.isRunning === "boolean") return payload.isRunning;

  const status = getExecutionStatus(payload);
  return ["queued", "running", "processing", "in_progress", "started"].includes(status);
};

const getHtmlPreviewMarkup = (payload = {}) =>
  payload.html ||
  payload.htmlPreview ||
  payload.preview ||
  payload.srcDoc ||
  payload.content ||
  payload.sourceCode ||
  payload.code ||
  "";

const normalizePreviewValue = (value) =>
  typeof value === "string" ? value : value == null ? "" : String(value);

const hasHtmlPreviewMarkup = (payload = {}) =>
  [
    "html",
    "htmlPreview",
    "preview",
    "srcDoc",
    "content",
    "sourceCode",
    "code",
  ].some((key) => Object.prototype.hasOwnProperty.call(payload, key));

const getSharedOutputMode = (payload = {}) =>
  payload.outputMode === "preview" || payload.mode === "preview"
    ? "preview"
    : "terminal";

const isSupportedLanguage = (language) =>
  LANGUAGE_OPTIONS.some((option) => option.value === language);

export default function EditorPage() {
  const { id } = useParams();
  const roomId = (id || "").trim();

  const location = useLocation();
  const navigate = useNavigate();
  const initialUsername = location.state?.username || "";
  const initialPassword = location.state?.password || "";

  const [code, setCode] = useState("// Welcome to CollabX");
  const [users, setUsers] = useState([]);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [usernameInput, setUsernameInput] = useState(initialUsername || "");
  const [passwordInput, setPasswordInput] = useState(initialPassword);
  const [username, setUsername] = useState(initialUsername);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [isVerifyingRoom, setIsVerifyingRoom] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(
    DEFAULT_LANGUAGE_OPTION.value
  );
  const [fileName, setFileName] = useState(DEFAULT_LANGUAGE_OPTION.fileName);
  const [editorLanguage, setEditorLanguage] = useState(
    DEFAULT_LANGUAGE_OPTION.monaco
  );
  const [hasResolvedRoomLanguage, setHasResolvedRoomLanguage] = useState(false);
  const [stdin, setStdin] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const [terminalOutput, setTerminalOutput] = useState([
    "\u2728 Welcome to CollabX Terminal...",
  ]);
  const [htmlPreview, setHtmlPreview] = useState("");
  const [htmlPreviewVersion, setHtmlPreviewVersion] = useState(0);
  const [sharedOutputMode, setSharedOutputMode] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(352);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  
  const typingTimeoutRef = useRef(null);
  const terminalRef = useRef(null);
  const workspaceRef = useRef(null);
  const profileMenuRef = useRef(null);
  const lastPreviewMarkupRef = useRef("");
  const languageSyncTimeoutRef = useRef(null);
  const selectedLanguageRef = useRef(DEFAULT_LANGUAGE_OPTION.value);
  const dragStateRef = useRef({
    startY: 0,
    startHeight: 352,
  });
  const activeLanguage =
    getLanguageOption(selectedLanguage) || DEFAULT_LANGUAGE_OPTION;
  const isHtmlPreview = activeLanguage?.mode === "preview";
  const shouldShowHtmlPreview =
    sharedOutputMode === null ? isHtmlPreview : sharedOutputMode === "preview";
  const previewHtml = normalizePreviewValue(htmlPreview);
  const previewCss = "";
  const previewJs = "";
  const previewDocument = String(
    previewHtml
      ? [
          "<!doctype html>",
          "<html>",
          "<head>",
          "<meta charset=\"utf-8\" />",
          "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
          previewCss ? `<style>${previewCss}</style>` : "",
          "</head>",
          "<body>",
          previewHtml,
          previewJs ? `<script>${previewJs}<\/script>` : "",
          "</body>",
          "</html>",
        ].join("")
      : "<!doctype html><html><head><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" /></head><body style=\"margin:0;background:#0B0714;color:#e9d5ff;font-family:system-ui;padding:24px;\">Run HTML to render a shared preview.</body></html>"
  );
  const inviteLink =
  typeof window === "undefined"
    ? ""
    : `${window.location.origin}/room/${roomId}`;
  const participantUsers = users.length
    ? users
    : [{ id: "current-user", username }];
  const visibleParticipants = participantUsers.slice(0, 3);
  const hiddenParticipantCount = Math.max(participantUsers.length - 3, 0);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(inviteLink)}`;
  const chatContainerRef = useRef(null);
  const [chatWidth, setChatWidth] = useState(320);
const isDraggingSidebar = useRef(false);
  const outputPanelTitle = shouldShowHtmlPreview ? "Live Preview" : "Output";
  const applyCollaborativeLanguage = (nextLanguage) => {
    const nextOption = getLanguageOption(nextLanguage);
    if (!nextOption) return false;

    selectedLanguageRef.current = nextOption.value;
    setSelectedLanguage(nextOption.value);
    setFileName(nextOption.fileName);
    setEditorLanguage(nextOption.monaco);
    return true;
  };

  useEffect(() => {
    selectedLanguageRef.current = selectedLanguage;
  }, [selectedLanguage]);

  useEffect(() => {
    if (initialUsername) return;

    if (socket.connected) {
      socket.disconnect();
    }

    localStorage.removeItem("username");
    sessionStorage.removeItem("username");
    setUsernameInput("");
    setUsername("");
    setHasJoinedRoom(false);
    setHasResolvedRoomLanguage(false);
  }, [initialUsername]);

  useEffect(() => {
    return () => {
      if (languageSyncTimeoutRef.current) {
        clearTimeout(languageSyncTimeoutRef.current);
      }
      socket.disconnect();
    };
  }, []);
useEffect(() => {
  const handleClickOutside = (event) => {
    if (
      profileMenuRef.current &&
      !profileMenuRef.current.contains(event.target)
    ) {
      setShowProfileMenu(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);

  return () => {
    document.removeEventListener(
      "mousedown",
      handleClickOutside
    );
  };
}, []);
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (initialUsername && initialPassword) {
      setUsername(initialUsername);
      setPasswordInput(initialPassword);
      setHasJoinedRoom(true);
    }
  }, [initialUsername, initialPassword]);

  useEffect(() => {
  const handleLanguageChange = (payload = {}) => {
    if (!shouldApplyRoomEvent(payload, roomId)) return;

    console.log("FULL LANGUAGE PAYLOAD:", payload);

    const nextLanguage =
      typeof payload === "string"
        ? payload
        : payload.language ||
          payload.selectedLanguage ||
          payload.currentLanguage ||
          payload.roomLanguage;

    console.log(
      "[language_change] current language:",
      selectedLanguageRef.current
    );

    console.log(
      "[language_change] next language:",
      nextLanguage
    );

    if (!nextLanguage) {
      console.warn("No language received from payload");
      return;
    }

    if (!isSupportedLanguage(nextLanguage)) {
      console.warn("Unsupported language:", nextLanguage);
      return;
    }

    if (languageSyncTimeoutRef.current) {
      clearTimeout(languageSyncTimeoutRef.current);
      languageSyncTimeoutRef.current = null;
    }

    setHasResolvedRoomLanguage(true);

    applyCollaborativeLanguage(nextLanguage);

    console.log(
      "Language successfully synchronized:",
      nextLanguage
    );
  };

  socket.on("language_change", handleLanguageChange);

  return () => {
    socket.off("language_change", handleLanguageChange);
  };
}, [roomId]);

  // Join room
  useEffect(() => {
    if (!hasJoinedRoom || !username) return;
    const password = passwordInput.trim();

    setHasResolvedRoomLanguage(false);

    if (languageSyncTimeoutRef.current) {
      clearTimeout(languageSyncTimeoutRef.current);
    }

    languageSyncTimeoutRef.current = setTimeout(() => {
      setHasResolvedRoomLanguage(true);
      languageSyncTimeoutRef.current = null;
    }, ROOM_LANGUAGE_SYNC_TIMEOUT_MS);

    if (!socket.connected) {
      socket.connect();
    }

    console.log("FINAL RUNTIME JOIN EMIT", {
      roomId,
      username,
      password,
    });

    socket.emit("join_room", {
      roomId,
      username,
      password,
    });

    socket.emit("get_execution_state", { roomId });

    return () => {
      if (languageSyncTimeoutRef.current) {
        clearTimeout(languageSyncTimeoutRef.current);
        languageSyncTimeoutRef.current = null;
      }
    };
  }, [hasJoinedRoom, passwordInput, roomId, username]);

  // Receive code updates
  useEffect(() => {
    socket.on("receive_code", (newCode) => {
      setCode(newCode);
    });

    return () => {
      socket.off("receive_code");
    };
  }, []);

  // Receive users
  useEffect(() => {
    socket.on("room_users", (users) => {
      setUsers(users);
    });

    return () => {
      socket.off("room_users");
    };
  }, []);

  // Receive messages
  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off("receive_message");
    };
  }, []);

  // Receive typing indicator
  useEffect(() => {
    socket.on("user_typing", (data) => {
      if (!data?.username || data.username === username) return;

      setTypingUser(data.username);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setTypingUser("");
      }, 1000);
    });

    return () => {
      socket.off("user_typing");
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [username]);

  useEffect(() => {
    const syncHtmlPreview = (nextMarkup) => {
      const normalizedMarkup = normalizePreviewValue(nextMarkup);
      if (normalizedMarkup === lastPreviewMarkupRef.current) return;

      lastPreviewMarkupRef.current = normalizedMarkup;
      setHtmlPreview(normalizedMarkup);
      setHtmlPreviewVersion((version) => version + 1);
    };

    const applyExecutionState = (payload = {}, fallbackOutput) => {
      if (!shouldApplyRoomEvent(payload, roomId)) return;

      setSharedOutputMode(getSharedOutputMode(payload));
      setIsExecuting(isExecutionRunning(payload));

      const output = buildExecutionOutput(payload);
      if (output.length) {
        setTerminalOutput(output);
      } else if (fallbackOutput) {
        setTerminalOutput(fallbackOutput);
      }

      if (hasHtmlPreviewMarkup(payload)) {
        syncHtmlPreview(getHtmlPreviewMarkup(payload));
      }
    };

    const handleExecutionUpdate = (payload = {}) => {
      if (!shouldApplyRoomEvent(payload, roomId)) return;

      setSharedOutputMode(getSharedOutputMode(payload));
      setIsExecuting(isExecutionRunning(payload));

      if (hasHtmlPreviewMarkup(payload)) {
        syncHtmlPreview(getHtmlPreviewMarkup(payload));
      }

      const output = buildExecutionOutput(payload);
      if (!output.length) {
        if (isExecutionRunning(payload)) {
          setTerminalOutput([`Running ${payload.languageLabel || payload.language || "code"}...`]);
        }
        return;
      }

      if (Array.isArray(payload.output) || payload.output) {
        setTerminalOutput(output);
        return;
      }

      setTerminalOutput((prev) => [...prev, ...output]);
    };

    const handleExecutionResult = (payload = {}) => {
      applyExecutionState(
        { ...payload, running: false },
        ["Execution completed."]
      );
    };

    const handleExecutionError = (payload = {}) => {
      if (!shouldApplyRoomEvent(payload, roomId)) return;

      setSharedOutputMode("terminal");
      setIsExecuting(false);
      const output = buildExecutionOutput(payload);
      setTerminalOutput(output.length ? output : ["Execution failed."]);
    };

    const handleHtmlPreviewUpdate = (payload = {}) => {
      if (!shouldApplyRoomEvent(payload, roomId)) return;

      setSharedOutputMode("preview");
      if (!hasHtmlPreviewMarkup(payload)) return;

      syncHtmlPreview(getHtmlPreviewMarkup(payload));
    };

    socket.on("execution_update", handleExecutionUpdate);
    socket.on("execution_state", handleExecutionUpdate);
    socket.on("execution-result", handleExecutionResult);
    socket.on("execution_error", handleExecutionError);
    socket.on("html_preview_update", handleHtmlPreviewUpdate);

    return () => {
      socket.off("execution_update", handleExecutionUpdate);
      socket.off("execution_state", handleExecutionUpdate);
      socket.off("execution-result", handleExecutionResult);
      socket.off("execution_error", handleExecutionError);
      socket.off("html_preview_update", handleHtmlPreviewUpdate);
    };
  }, [roomId]);

  // Send message
  useEffect(() => {
  const handleMouseMove = (e) => {
    if (!isDraggingSidebar.current) return;

    const newWidth = window.innerWidth - e.clientX;

    if (newWidth >= 260 && newWidth <= 700) {
      setChatWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    isDraggingSidebar.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);

  return () => {
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
  };
}, []);

const startSidebarResize = () => {
  isDraggingSidebar.current = true;
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
};

  const handleOpenExitConfirm = () => {
    setShowProfileMenu(false);
    setShowExitConfirm(true);
  };

  const handleConfirmExitRoom = () => {
    localStorage.removeItem("username");
    sessionStorage.removeItem("username");
    setShowExitConfirm(false);
    navigate("/");
  };

  const copyToClipboard = async (value, successMessage) => {
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  };

  const sendMessage = () => {
    if (!message.trim()) return;

    const messageData = {
      roomId,
      username,
      message,
    };

    socket.emit("send_message", messageData);

    setMessage("");
  };

  const handleJoinRoom = async () => {
    const nextUsername = usernameInput.trim();
    const nextPassword = passwordInput.trim();

    if (!nextUsername) {
      toast.error("Please enter a username to join the room.");
      return;
    }

    if (!nextPassword) {
      toast.error("Please enter the room password.");
      return;
    }

    setIsVerifyingRoom(true);

    try {
      console.log({
        roomId,
        username: nextUsername,
        password: nextPassword,
      });

      const response = await fetch(`${API_URL}/rooms/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
          password: nextPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data?.message || "Incorrect room password");
        return;
      }

      localStorage.setItem("username", nextUsername);
      setUsername(nextUsername);
      setHasJoinedRoom(true);
    } catch {
      toast.error("Incorrect room password");
    } finally {
      setIsVerifyingRoom(false);
    }
  };

  const handleRunCode = async () => {
    if (!hasResolvedRoomLanguage) return;

    const startedOutput = [`Running ${activeLanguage?.label || selectedLanguage}...`];
    const nextPreviewMarkup = normalizePreviewValue(code);

    if (isHtmlPreview) {
      setSharedOutputMode("preview");
      setIsExecuting(false);
      if (nextPreviewMarkup !== lastPreviewMarkupRef.current) {
        lastPreviewMarkupRef.current = nextPreviewMarkup;
        setHtmlPreview(nextPreviewMarkup);
        setHtmlPreviewVersion((version) => version + 1);
      }
      socket.emit("html_preview_update", {
        roomId,
        username,
        language: selectedLanguage,
        html: nextPreviewMarkup,
      });
      socket.emit("run_code", {
        roomId,
        username,
        code: nextPreviewMarkup,
        sourceCode: nextPreviewMarkup,
        language: selectedLanguage,
        languageId: activeLanguage?.judge0Id,
        mode: activeLanguage?.mode,
      });
      return;
    }

    setSharedOutputMode("terminal");
    setIsExecuting(true);
    setTerminalOutput(startedOutput);

    socket.emit("run_code", {
      roomId,
      username,
      code,
      sourceCode: code,
      language: selectedLanguage,
      languageId: activeLanguage?.judge0Id,
      languageLabel: activeLanguage?.label,
      stdin,
      output: startedOutput,
      mode: activeLanguage?.mode,
    });
  };

  useEffect(() => {
    if (!hasJoinedRoom) return;

    socket.emit("get_code", roomId);
    socket.emit("get_execution_state", { roomId });

    socket.on("load_code", (savedCode) => {
      if (savedCode) {
        setCode(savedCode);
      }
    });

    return () => {
      socket.off("load_code");
    };
  }, [hasJoinedRoom, roomId]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  useEffect(() => {
    if (!isDraggingSplitter) return;

    const handleMouseMove = (event) => {
      const workspaceHeight = workspaceRef.current?.clientHeight ?? 0;
      const minTerminalHeight = 220;
      const maxTerminalHeight = Math.max(320, workspaceHeight - 180);
      const nextHeight =
        dragStateRef.current.startHeight +
        (dragStateRef.current.startY - event.clientY);

      setTerminalHeight(
        Math.min(Math.max(nextHeight, minTerminalHeight), maxTerminalHeight)
      );
    };

    const handleMouseUp = () => {
      setIsDraggingSplitter(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDraggingSplitter]);

  const handleSplitterMouseDown = (event) => {
    dragStateRef.current = {
      startY: event.clientY,
      startHeight: terminalHeight,
    };
    setIsDraggingSplitter(true);
  };

  if (!hasJoinedRoom) {
    return (
      <div className="min-h-screen bg-[#0B0714] text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#120D1F] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-purple-300/50">
              Join Room
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-purple-50">
              Continue to CollabX
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-purple-200/65">
              Enter your username to join room <span className="text-purple-200">{id}</span>.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="join-username"
                className="mb-2 block text-sm font-medium text-purple-200"
              >
                Username
              </label>
              <input
                id="join-username"
                value={usernameInput}
                onChange={(event) => setUsernameInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleJoinRoom();
                  }
                }}
                placeholder="Enter your username"
                className="w-full rounded-2xl border border-white/10 bg-[#0B0714] px-4 py-3 text-sm text-white outline-none transition placeholder:text-purple-300/35 focus:border-purple-400/60"
              />
            </div>

            <div>
              <label
                htmlFor="join-password"
                className="mb-2 block text-sm font-medium text-purple-200"
              >
                Password
              </label>
              <input
                id="join-password"
                type="password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleJoinRoom();
                  }
                }}
                placeholder="Enter room password"
                className="w-full rounded-2xl border border-white/10 bg-[#0B0714] px-4 py-3 text-sm text-white outline-none transition placeholder:text-purple-300/35 focus:border-purple-400/60"
              />
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={isVerifyingRoom}
              className="w-full rounded-2xl bg-purple-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-purple-500"
            >
              {isVerifyingRoom ? "Verifying..." : "Join Room"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isLanguageSyncPending = !hasResolvedRoomLanguage;

  return (
    <div className="h-screen bg-[#0B0714] text-white flex flex-col">
      {/* TOP NAVBAR */}
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h1
  onClick={() => navigate("/")}
  className="text-2xl font-bold text-purple-400 cursor-pointer hover:text-purple-300 transition"
>
  CollabX
</h1>

          <div className="text-sm text-purple-400/70">
            Room: {roomId}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={selectedLanguage}
            disabled={isLanguageSyncPending}
            onChange={(event) => {
              const nextLanguage = event.target.value;
              if (!isSupportedLanguage(nextLanguage) || nextLanguage === selectedLanguage) {
                return;
              }

              if (languageSyncTimeoutRef.current) {
                clearTimeout(languageSyncTimeoutRef.current);
                languageSyncTimeoutRef.current = null;
              }

              setHasResolvedRoomLanguage(true);
              applyCollaborativeLanguage(nextLanguage);
              socket.emit("language_change", {
                roomId,
                language: nextLanguage,
              });
            }}
            className="px-3 py-2 rounded-lg bg-[#140f24] border border-white/10 text-sm text-purple-200 outline-none focus:border-purple-400/60 transition"
          >
            {LANGUAGE_OPTIONS.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>

            <button
              onClick={handleRunCode}
              disabled={isExecuting || isLanguageSyncPending}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 transition"
            >
              {isHtmlPreview ? "Run HTML" : isExecuting ? "Running..." : "Run Code"}
            </button>

          <div className="flex items-center -space-x-2.5 pr-1" aria-label="Active participants">
            {visibleParticipants.map((user, index) => (
              <div
                key={user.id || user.username}
                title={user.username}
                className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0B0714] bg-gradient-to-br ${AVATAR_COLORS[index % AVATAR_COLORS.length]} text-[11px] font-bold uppercase text-white shadow-lg shadow-black/25`}
              >
                {getInitials(user.username)}
              </div>
            ))}

            {hiddenParticipantCount > 0 && (
              <div
                title={`${hiddenParticipantCount} more active`}
                className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0B0714] bg-[#211536] text-[11px] font-bold text-purple-100 shadow-lg shadow-black/25"
              >
                +{hiddenParticipantCount}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowShareModal(true)}
            className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition"
          >
            Share
          </button>

          <div className="relative" ref={profileMenuRef}>
  <button
    onClick={() => setShowProfileMenu(!showProfileMenu)}
    className="w-9 h-9 rounded-full border border-purple-400/30 bg-[#211536] flex items-center justify-center text-purple-100 hover:border-purple-300/60 hover:bg-purple-500/20 transition"
    aria-label="Open profile menu"
  >
    <UserRound size={17} />
  </button>

  {showProfileMenu && (
    <div className="absolute right-0 top-12 w-56 rounded-2xl border border-white/10 bg-[#181028] shadow-2xl overflow-hidden z-50">
      <div className="px-4 py-3 border-b border-white/10">
        <p className="text-xs text-purple-300/60">
          Logged in as
        </p>

        <p className="font-semibold text-white mt-1">
          {username}
        </p>
      </div>

      <button
        onClick={handleOpenExitConfirm}
        className="w-full text-left px-4 py-3 hover:bg-red-500/10 text-red-400 transition text-sm"
      >
        Exit Room
      </button>
    </div>
  )}
</div>
        </div>
      </header>

      <AnimatePresence>
        {showShareModal && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-[#05010d]/80 px-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              className="w-full max-w-lg rounded-3xl border border-purple-500/20 bg-[#120D1F] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.5)]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="share-room-title"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-purple-300/50">
                    Invite collaborators
                  </p>
                  <h2 id="share-room-title" className="mt-2 text-2xl font-semibold text-white">
                    Share Room
                  </h2>
                </div>

                <button
                  onClick={() => setShowShareModal(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-purple-100 transition hover:bg-white/10"
                  aria-label="Close share modal"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-6 flex flex-col gap-5 sm:flex-row">
                <div className="flex shrink-0 flex-col items-center rounded-2xl border border-purple-500/20 bg-[#080511] p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-purple-300/60">
                    <QrCode size={14} />
                    QR code
                  </div>
                  <img
                    src={qrCodeUrl}
                    alt="QR code for room invite link"
                    className="h-44 w-44 rounded-xl bg-white p-2"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-purple-300/50">
                      Room ID
                    </p>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0B0714] p-2">
                      <span className="min-w-0 flex-1 truncate px-2 text-sm font-semibold text-purple-50">
                        {roomId}
                      </span>
                      <button
                        onClick={() => copyToClipboard(roomId, "Room ID copied!")}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white transition hover:bg-purple-500"
                        aria-label="Copy room ID"
                      >
                        <Copy size={15} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-purple-300/50">
                      Invite link
                    </p>
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0B0714] p-2">
                      <span className="min-w-0 flex-1 truncate px-2 text-sm text-purple-100/85">
                        {inviteLink}
                      </span>
                      <button
                        onClick={() => copyToClipboard(inviteLink, "Invite link copied!")}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white transition hover:bg-purple-500"
                        aria-label="Copy invite link"
                      >
                        <Copy size={15} />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowShareModal(false)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-purple-50 transition hover:bg-white/10"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-[#05010d]/80 px-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowExitConfirm(false)}
          >
          <motion.div
            className="w-full max-w-md rounded-3xl border border-purple-500/20 bg-[#120D1F] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-room-title"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="exit-room-title" className="text-xl font-semibold text-white">
              Leave Room?
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-purple-200/70">
              Are you sure you want to exit this collaboration room?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-purple-100 transition hover:bg-white/10"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmExitRoom}
                className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-500"
              >
                Exit Room
              </button>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      <div ref={workspaceRef} className="flex flex-1 min-h-0 flex-col overflow-hidden">
        {/* MAIN LAYOUT */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* LEFT SIDEBAR */}
          <aside className="w-64 border-r border-white/10 bg-[#120D1F] p-4">
            <h2 className="text-sm uppercase tracking-wider text-purple-400/60 mb-4">
              Explorer
            </h2>

            <div className="space-y-2">
              <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer">
                {fileName}
              </div>
            </div>
          </aside>

          {/* EDITOR */}
          <main className="flex-1 min-h-0">
            {isLanguageSyncPending ? (
              <div className="flex h-full items-center justify-center bg-[#0E0A18] px-6">
                <div className="rounded-3xl border border-white/10 bg-[#120D1F] px-6 py-5 text-center shadow-[0_24px_80px_rgba(0,0,0,0.3)]">
                  <p className="text-xs uppercase tracking-[0.2em] text-purple-300/50">
                    Syncing room
                  </p>
                  <p className="mt-3 text-sm text-purple-100/80">
                    Applying the shared editor language...
                  </p>
                </div>
              </div>
            ) : (
              <Editor
                path={fileName}
                height="100%"
                language={editorLanguage}
                value={code}
                theme="vs-dark"
                onChange={(value) => {
                  const nextCode = value ?? "";
                  setCode(nextCode);

                  socket.emit("code_change", {
                    roomId,
                    code: nextCode,
                  });

                  socket.emit("typing", {
                    roomId,
                    username,
                  });

                  if (activeLanguage?.mode === "preview") {
                    setSharedOutputMode("preview");
                    const nextPreviewMarkup = normalizePreviewValue(nextCode);
                    if (nextPreviewMarkup !== lastPreviewMarkupRef.current) {
                      lastPreviewMarkupRef.current = nextPreviewMarkup;
                      setHtmlPreview(nextPreviewMarkup);
                      setHtmlPreviewVersion((version) => version + 1);
                    }
                    socket.emit("html_preview_update", {
                      roomId,
                      username,
                      language: selectedLanguage,
                      html: nextPreviewMarkup,
                    });
                  }
                }}
              />
            )}
          </main>

          {/* RIGHT PANEL */}
          <div
  onMouseDown={startSidebarResize}
  className="w-1 cursor-col-resize bg-white/5 hover:bg-purple-500 transition"
/>
          <aside style={{ width: `${chatWidth}px` }}
className="shrink-0 border-l border-white/10 bg-[#120D1F] p-4 flex flex-col">
            <h2 className="text-sm uppercase tracking-wider text-purple-400/60 mb-4">
              Team Chat
            </h2>

            {/* Online Users */}
            <div className="mb-6">
              <h3 className="text-xs text-purple-400/50 uppercase mb-3">
                Online Users
              </h3>

              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center font-semibold">
                      {user.username[0]}
                    </div>

                    <div>
                      <p className="text-sm font-medium">
                        {user.username}
                        {user.username === username && (
                          <span className="ml-1 text-purple-300 text-xs">
                            (You)
                          </span>
                        )}
                      </p>

                      <p className="text-xs text-green-400">
                        Online
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 mb-4 pr-1"
            >
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className="bg-white/5 rounded-xl p-3"
                >
                  <p className="text-xs text-purple-300 mb-1">
                    {msg.username}
                  </p>

                  <p className="text-sm text-white">
                    {msg.message}
                  </p>
                </div>
              ))}
            </div>

            {/* Input */}
            {typingUser && (
              <p className="text-xs text-purple-300/70 mb-2">
                {typingUser} is typing...
              </p>
            )}
            <div className="flex gap-2">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Send message..."
                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none"
              />

              <button
                onClick={sendMessage}
                className="px-4 rounded-lg bg-purple-600 hover:bg-purple-500 transition"
              >
                Send
              </button>
            </div>
          </aside>
        </div>

        <div
          onMouseDown={handleSplitterMouseDown}
          className={`group relative h-2 shrink-0 cursor-ns-resize bg-[#0B0714] transition ${isDraggingSplitter ? "bg-blue-400/15" : "hover:bg-blue-400/10"
            }`}
        >
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-blue-500/70 transition group-hover:bg-blue-400 group-hover:shadow-[0_0_12px_rgba(96,165,250,0.8)]" />
        </div>

        {/* TERMINAL */}
        <div
          style={{ height: `${terminalHeight}px` }}
          className="shrink-0 overflow-auto border-t border-white/10 bg-[#0E0A18] px-4 py-4 sm:px-6"
        >
          <div className="mx-auto flex h-full max-w-full flex-col gap-4">
            {!shouldShowHtmlPreview && (
              <div className="shrink-0 rounded-2xl border border-white/10 bg-[#120D1F] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                <label
                  htmlFor="stdin"
                  className="mb-3 block text-sm font-semibold text-purple-200"
                >
                  Input
                </label>
                <textarea
                  id="stdin"
                  value={stdin}
                  onChange={(event) => setStdin(event.target.value)}
                  placeholder="Enter input here"
                  className="min-h-[88px] max-h-[24vh] w-full resize-y overflow-auto rounded-xl border border-white/10 bg-[#0B0714] px-4 py-3 text-sm text-white outline-none transition placeholder:text-purple-300/35 focus:border-purple-400/60"
                />
                <p className="mt-3 text-xs text-purple-300/65">
                  If your code takes input, add it in the above box before running.
                </p>
              </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-[#120D1F] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-purple-200">
                  {outputPanelTitle}
                </h2>
                <div
                  className={`h-2 w-2 rounded-full ${
                    isExecuting
                      ? "animate-pulse bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.8)]"
                      : "bg-purple-400 shadow-[0_0_12px_rgba(192,132,252,0.8)]"
                  }`}
                />
              </div>

              {shouldShowHtmlPreview ? (
                <div className="min-h-0 flex-1 overflow-hidden rounded-[1.25rem] border border-purple-500/20 bg-[#0B0714] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center justify-between border-b border-white/10 bg-[#171026] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                      </div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-purple-200/70">
                        Live Preview
                      </p>
                    </div>
                    <p className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-purple-200/60">
                      Shared room render
                    </p>
                  </div>
                  <div className="h-full min-h-[260px] overflow-hidden bg-[#090511] p-3">
                    <div className="h-full overflow-hidden rounded-2xl border border-white/10 bg-white">
                      <iframe
                        key={htmlPreviewVersion}
                        title="HTML preview"
                        srcDoc={previewDocument}
                        sandbox="allow-scripts allow-forms allow-modals"
                        className="h-full min-h-[220px] w-full bg-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  ref={terminalRef}
                  className="min-h-0 flex-1 overflow-auto rounded-xl border border-white/10 bg-black/40 p-4"
                >
                  <div className="font-mono text-sm whitespace-pre-wrap text-green-400">
                    {(terminalOutput.length
                      ? terminalOutput
                      : ["\u2728 Welcome to CollabX Terminal..."]
                    ).join("\n")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
