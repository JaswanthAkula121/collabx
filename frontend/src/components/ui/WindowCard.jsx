import { motion } from "framer-motion";

const DOTS = ["bg-red-500", "bg-yellow-400", "bg-green-500"];

export function WindowCard({ title, children, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`bg-[#231748] border border-purple-500/25 rounded-xl overflow-hidden ${className}`}
    >
      {/* Chrome bar */}
      <div className="bg-black/40 px-3 py-2 flex items-center gap-1.5 border-b border-purple-500/20">
        {DOTS.map((c) => (
          <span key={c} className={`w-2 h-2 rounded-full ${c}`} />
        ))}
        {title && (
          <span className="text-[10px] text-gray-500 ml-2 font-mono">{title}</span>
        )}
      </div>
      <div className="p-3.5">{children}</div>
    </motion.div>
  );
}
