import { useState } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { AVATARS } from "../../constants";
import { staggerItem } from "../../animations";

// Per-color design tokens
const COLOR_TOKENS = {
  purple: {
    border:    "rgba(139,92,246,0.35)",
    borderHov: "rgba(139,92,246,0.65)",
    glow:      "rgba(124,58,237,0.22)",
    iconFrom:  "#4c1d95",
    iconTo:    "#6d28d9",
    iconText:  "#c4b5fd",
    shimmer:   "rgba(167,139,250,0.07)",
    dot:       "#7c3aed",
  },
  yellow: {
    border:    "rgba(234,179,8,0.25)",
    borderHov: "rgba(234,179,8,0.55)",
    glow:      "rgba(202,138,4,0.18)",
    iconFrom:  "#713f12",
    iconTo:    "#a16207",
    iconText:  "#fde68a",
    shimmer:   "rgba(253,224,71,0.06)",
    dot:       "#ca8a04",
  },
  cyan: {
    border:    "rgba(6,182,212,0.25)",
    borderHov: "rgba(6,182,212,0.55)",
    glow:      "rgba(6,182,212,0.17)",
    iconFrom:  "#164e63",
    iconTo:    "#0e7490",
    iconText:  "#a5f3fc",
    shimmer:   "rgba(103,232,249,0.06)",
    dot:       "#0891b2",
  },
  green: {
    border:    "rgba(34,197,94,0.25)",
    borderHov: "rgba(34,197,94,0.55)",
    glow:      "rgba(22,163,74,0.17)",
    iconFrom:  "#14532d",
    iconTo:    "#166534",
    iconText:  "#bbf7d0",
    shimmer:   "rgba(134,239,172,0.06)",
    dot:       "#16a34a",
  },
  pink: {
    border:    "rgba(236,72,153,0.25)",
    borderHov: "rgba(236,72,153,0.55)",
    glow:      "rgba(219,39,119,0.17)",
    iconFrom:  "#831843",
    iconTo:    "#9d174d",
    iconText:  "#fbcfe8",
    shimmer:   "rgba(249,168,212,0.06)",
    dot:       "#db2777",
  },
  blue: {
    border:    "rgba(59,130,246,0.25)",
    borderHov: "rgba(59,130,246,0.55)",
    glow:      "rgba(37,99,235,0.17)",
    iconFrom:  "#1e3a8a",
    iconTo:    "#1d4ed8",
    iconText:  "#bfdbfe",
    shimmer:   "rgba(147,197,253,0.06)",
    dot:       "#2563eb",
  },
};

/* ── Avatar strip ── */
function AvatarStrip() {
  return (
    <div className="flex items-center mt-5 gap-2">
      <div className="flex">
        {AVATARS.map((av, i) => (
          <motion.div
            key={av.initials}
            initial={{ x: -6, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.05 * i, duration: 0.3 }}
            title={av.label}
            className="w-6 h-6 rounded-full border-[1.5px] border-[#1e1340]
              flex items-center justify-center text-[8px] font-bold text-white
              hover:z-10 hover:scale-110 transition-transform duration-150 cursor-default"
            style={{ background: av.bg, marginLeft: i === 0 ? 0 : -7 }}
          >
            {av.initials}
          </motion.div>
        ))}
      </div>
      <span className="text-[10px] text-purple-400/60 ml-1">5 coding now</span>
    </div>
  );
}

/* ── Animated icon box ── */
function IconBox({ icon, tokens, hovered }) {
  return (
    <div className="relative mb-5 w-12 h-12">
      {/* Pulsing ring */}
      <motion.span
        animate={hovered
          ? { scale: [1, 1.6], opacity: [0.3, 0] }
          : { scale: 1, opacity: 0 }}
        transition={hovered
          ? { duration: 0.85, repeat: Infinity, ease: "easeOut" }
          : {}}
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{ background: tokens.dot }}
      />

      {/* Tile */}
      <motion.div
        animate={{
          backgroundImage: hovered
            ? `linear-gradient(135deg, ${tokens.iconFrom}, ${tokens.iconTo})`
            : `linear-gradient(135deg, ${tokens.iconFrom}99, ${tokens.iconTo}66)`,
          boxShadow: hovered
            ? `0 6px 24px ${tokens.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`
            : `inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}
        transition={{ duration: 0.3 }}
        className="w-12 h-12 rounded-xl flex items-center justify-center
          text-xl font-mono relative z-10"
        style={{
          backgroundImage: `linear-gradient(135deg, ${tokens.iconFrom}99, ${tokens.iconTo}66)`,
          color: tokens.iconText,
        }}
      >
        <motion.span
          animate={hovered
            ? { scale: 1.18, rotate: [0, -8, 8, 0] }
            : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="select-none"
        >
          {icon}
        </motion.span>
      </motion.div>
    </div>
  );
}

/* ── FeatureCard ── */
export default function FeatureCard({ icon, color, title, desc, extra }) {
  const [hovered, setHovered] = useState(false);
  const tokens = COLOR_TOKENS[color] || COLOR_TOKENS.purple;

  // 3-D tilt on mouse move
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-60, 60], [5, -5]), { stiffness: 220, damping: 22 });
  const rotateY = useSpring(useTransform(mx, [-60, 60], [-5, 5]), { stiffness: 220, damping: 22 });

  function onMouseMove(e) {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - r.left - r.width / 2);
    my.set(e.clientY - r.top - r.height / 2);
  }
  function onMouseLeave() {
    mx.set(0); my.set(0);
    setHovered(false);
  }

  return (
    <motion.div variants={staggerItem} style={{ perspective: 900 }} className="cursor-default">
      <motion.div
  style={{
    rotateX,
    rotateY,
    transformStyle: "preserve-3d",
    background: "linear-gradient(150deg, #1e1340 0%, #180f36 100%)",
  }}
  onMouseMove={onMouseMove}
  onMouseEnter={() => setHovered(true)}
  onMouseLeave={onMouseLeave}
  animate={{
    y: hovered ? -7 : 0,
    boxShadow: hovered
      ? `0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px ${tokens.borderHov}, 0 0 40px ${tokens.glow}`
      : `0 2px 10px rgba(0,0,0,0.3), 0 0 0 1px ${tokens.border}`,
  }}
  transition={{ duration: 0.22, ease: "easeOut" }}
  className="relative rounded-2xl p-7 overflow-hidden"
>
        {/* Top highlight edge */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute top-0 left-8 right-8 h-px rounded-full pointer-events-none"
          style={{
            background: `linear-gradient(90deg, transparent, ${tokens.borderHov}, transparent)`,
          }}
        />

        {/* Shimmer sweep */}
        <motion.div
          animate={hovered ? { x: ["-100%", "220%"] } : { x: "-100%" }}
          transition={hovered ? { duration: 0.65, ease: "easeInOut" } : {}}
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(105deg, transparent 35%, ${tokens.shimmer} 50%, transparent 65%)`,
            transform: "skewX(-15deg)",
          }}
        />

        {/* Radial glow behind icon */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.6 }}
          transition={{ duration: 0.35 }}
          className="absolute top-3 left-3 w-28 h-28 rounded-full pointer-events-none"
          style={{ background: tokens.glow, filter: "blur(22px)" }}
        />

        {/* Content */}
        <div className="relative z-10">
          <IconBox icon={icon} tokens={tokens} hovered={hovered} />

          <motion.h3
            animate={{ color: hovered ? "#f5f0ff" : "#ddd6fe" }}
            transition={{ duration: 0.2 }}
            className="text-sm font-semibold mb-2.5 leading-snug"
          >
            {title}
          </motion.h3>

          <p className="text-xs leading-relaxed text-purple-300/50">{desc}</p>

          {extra === "avatars" && <AvatarStrip />}

          {/* "Explore" hint fades in */}
          <motion.div
            animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 5 }}
            transition={{ duration: 0.2, delay: hovered ? 0.06 : 0 }}
            className="flex items-center gap-1 mt-4 text-[10px] font-semibold tracking-wide"
            style={{ color: tokens.iconText }}
          >
            Explore feature
            <motion.span
              animate={{ x: hovered ? 3 : 0 }}
              transition={{ duration: 0.2 }}
            >
              →
            </motion.span>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}