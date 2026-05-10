import { useState } from "react";
import { motion } from "framer-motion";

export function ButtonPrimary({ children, onClick, className = "" }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      whileTap={{ scale: 0.975, y: 1 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative w-full py-3.5 rounded-xl text-white font-semibold text-sm
        tracking-wide flex items-center justify-center gap-2 cursor-pointer
        border-none outline-none overflow-hidden ${className}`}
      style={{
        background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%)",
        boxShadow: hovered
          ? "0 8px 32px rgba(124,58,237,0.55), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)"
          : "0 4px 16px rgba(124,58,237,0.3), 0 1px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
      }}
    >
      {/* Shimmer sweep */}
      <motion.span
        animate={hovered ? { x: ["−100%", "200%"] } : { x: "-100%" }}
        transition={hovered ? { duration: 0.55, ease: "easeInOut" } : {}}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.12) 50%, transparent 65%)",
          transform: "skewX(-15deg)",
        }}
      />
      {/* Top highlight */}
      <span
        className="absolute top-0 left-4 right-4 h-px rounded-full pointer-events-none"
        style={{ background: "rgba(255,255,255,0.25)" }}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}

export function ButtonOutline({ children, onClick, className = "" }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      whileTap={{ scale: 0.975, y: 1 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative w-full py-3.5 rounded-xl font-medium text-sm
        flex items-center justify-center gap-2 cursor-pointer outline-none
        overflow-hidden ${className}`}
      style={{
        background: hovered ? "rgba(124,58,237,0.1)" : "rgba(124,58,237,0.04)",
        border: `1px solid ${hovered ? "rgba(139,92,246,0.6)" : "rgba(139,92,246,0.3)"}`,
        color: hovered ? "#e9d5ff" : "rgba(221,214,254,0.75)",
        boxShadow: hovered ? "0 4px 20px rgba(124,58,237,0.15), inset 0 1px 0 rgba(139,92,246,0.15)" : "none",
        transition: "all 0.2s ease",
      }}
    >
      {/* Shimmer */}
      <motion.span
        animate={hovered ? { x: ["-100%", "220%"] } : { x: "-100%" }}
        transition={hovered ? { duration: 0.6, ease: "easeInOut" } : {}}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(105deg, transparent 35%, rgba(139,92,246,0.08) 50%, transparent 65%)",
          transform: "skewX(-15deg)",
        }}
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
}