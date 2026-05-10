export function Input({
  placeholder,
  mono = false,
  className = "",
  value,
  onChange,
}) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`w-full bg-black/30 border border-purple-500/20 rounded-xl
        px-4 py-3.5 text-purple-50 text-sm outline-none mb-3.5
        placeholder:text-purple-300/30 transition-all duration-200
        focus:border-violet-500 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)]
        ${mono ? "font-mono" : "font-sans"} ${className}`}
    />
  );
}