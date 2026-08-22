import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { NAV_LINKS } from "../../constants";

function NavLink({ label }) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={label === "Features" ? "#features" : "https://github.com/JaswanthAkula121"}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative text-sm py-1 transition-colors duration-200"
      style={{
        color: hovered
          ? "#f0e6ff"
          : "rgba(196,181,253,0.6)",
      }}
    >
      {label}

      <motion.span
        animate={{
          scaleX: hovered ? 1 : 0,
          opacity: hovered ? 1 : 0,
        }}
        transition={{
          duration: 0.2,
          ease: "easeOut",
        }}
        className="absolute bottom-0 left-0 right-0 h-px rounded-full origin-left"
        style={{
          background:
            "linear-gradient(90deg, #7c3aed, #a855f7)",
        }}
      />
    </a>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [serverOnline, setServerOnline] = useState(false);
  const apiUrl = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);

    window.addEventListener("scroll", onScroll, {
      passive: true,
    });

    return () =>
      window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let isActive = true;

    const checkServer = async () => {
      try {
        const response = await fetch(`${apiUrl}/health`);
        if (isActive) setServerOnline(response.ok);
      } catch {
        if (isActive) setServerOnline(false);
      }
    };

    checkServer();
    const intervalId = window.setInterval(checkServer, 10000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [apiUrl]);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        ease: "easeOut",
      }}
      className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-10 py-3.5"
      style={{
        background: scrolled
          ? "rgba(12,8,26,0.88)"
          : "rgba(15,10,30,0.5)",

        borderBottom: scrolled
          ? "1px solid rgba(139,92,246,0.22)"
          : "1px solid rgba(139,92,246,0.12)",

        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",

        transition:
          "background 0.4s ease, border-color 0.4s ease",

        boxShadow: scrolled
          ? "0 4px 32px rgba(0,0,0,0.4)"
          : "none",
      }}
    >
      {/* Logo */}
      <motion.a
  href="/"
        className="flex items-center gap-2 cursor-default select-none"
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <div className="relative w-8 h-8 flex items-center justify-center">
          <motion.span
            animate={{ rotate: [0, 360] }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute text-yellow-400 text-[10px]"
            style={{ top: 0, left: 4 }}
          >
            ✦
          </motion.span>

          <motion.span
            animate={{ rotate: [360, 0] }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute text-blue-400 text-[8px]"
            style={{ bottom: 0, right: 2 }}
          >
            ✦
          </motion.span>

          <span className="text-purple-400 text-xl relative z-10">
            ✦
          </span>
        </div>

        <span className="font-bold text-[17px] tracking-tight text-purple-50">
          Collab
          <span
            className="text-transparent bg-clip-text"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #a855f7, #7c3aed)",
            }}
          >
            X
          </span>
        </span>
      </motion.a>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-8">
        {NAV_LINKS.map((link) => (
          <NavLink key={link} label={link} />
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Status pill */}
        <div
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium"
          style={{
            background: serverOnline
              ? "rgba(34,197,94,0.08)"
              : "rgba(239,68,68,0.08)",
            border:
              serverOnline
                ? "1px solid rgba(34,197,94,0.2)"
                : "1px solid rgba(239,68,68,0.2)",
            color: serverOnline ? "#4ade80" : "#f87171",
          }}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                serverOnline ? "bg-green-400" : "bg-red-400"
              }`}
            />

            <span
              className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                serverOnline ? "bg-green-400" : "bg-red-400"
              }`}
            />
          </span>

          {serverOnline ? "Server Online" : "Server Offline"}
        </div>

        {/* CTA button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer border-none"
          style={{
            background:
              "linear-gradient(135deg, #7c3aed, #6d28d9)",

            boxShadow:
              "0 0 16px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
          }}
        >
          Start Coding
          <span className="opacity-60">→</span>
        </motion.button>
      </div>
    </motion.nav>
  );
}
