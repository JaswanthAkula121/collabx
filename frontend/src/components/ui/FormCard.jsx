import { motion } from "framer-motion";

export function FormCard({ title, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className="bg-[#1e1340] border border-purple-500/25 rounded-2xl p-7 mb-5"
    >
      <span className="block text-lg font-semibold text-purple-50 mb-4">{title}</span>
      {children}
    </motion.div>
  );
}
