export function Badge({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-2 bg-purple-500/15 border border-purple-500/30
        rounded-full px-3.5 py-1.5 text-xs text-purple-400 ${className}`}
    >
      {children}
    </span>
  );
}

export function CursorChip({ label, color }) {
  return (
    <span
      className="inline-block text-white text-[9px] rounded px-1.5 ml-1 align-middle font-sans leading-[16px]"
      style={{ background: color }}
    >
      {label}
    </span>
  );
}
