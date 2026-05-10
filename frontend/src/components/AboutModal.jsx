import { motion, AnimatePresence } from "framer-motion";
import { FaGithub } from "react-icons/fa";
import { Send } from "lucide-react";

export default function AboutModal({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-[#05010d] border border-purple-500/20 rounded-2xl p-5 shadow-2xl relative"
          >

            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl transition"
            >
              ×
            </button>

            {/* Heading */}
            <h1 className="text-xl font-bold text-white mb-2">
              CollabX - Collaborative Coding Workspace
            </h1>

            <p className="text-purple-200/70 text-xs leading-relaxed mb-4">
              Code together in real-time with shared editor, terminal, and live team chat.
            </p>

            {/* Preview Image */}
            <div className="rounded-xl overflow-hidden border border-purple-500/20 mb-4 max-h-[340px]">
              <img
                src="/preview.png"
                alt="CollabX Preview"
                className="w-full h-full object-cover object-top"
              />
            </div>

            {/* Creator */}
            <div className="border-t border-purple-500/10 pt-4">

              <h2 className="text-xl font-bold text-center text-white mb-3">
                Made with 💕 by Jaswanth
              </h2>

              {/* Buttons */}
              <div className="flex items-center justify-center gap-2 flex-wrap">

                <a
                  href="https://yourportfolio.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1 rounded-md border border-purple-400/15 bg-black/20 px-2.5 py-1.5 text-[11px] font-medium text-white transition-all duration-300 hover:border-purple-300/30 hover:bg-purple-500/10"
                >
                  ✨ My Portfolio
                </a>

                <a
                  href="https://github.com/JaswanthAkula121"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1 rounded-md border border-purple-400/15 bg-black/20 px-2.5 py-1.5 text-[11px] font-medium text-white transition-all duration-300 hover:border-purple-300/30 hover:bg-purple-500/10"
                >
                  <FaGithub size={12} />
                  GitHub Profile
                </a>

                <a
                  href="https://github.com/YOUR_USERNAME/YOUR_REPO"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1 rounded-md border border-purple-400/15 bg-black/20 px-2.5 py-1.5 text-[11px] font-medium text-white transition-all duration-300 hover:border-purple-300/30 hover:bg-purple-500/10"
                >
                  <FaGithub size={12} />
                  CollabX GitHub
                </a>

                <a
                  href="www.linkedin.com/in/jaswanth-akula-aa606a37b"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1 rounded-md border border-purple-400/15 bg-black/20 px-2.5 py-1.5 text-[11px] font-medium text-white transition-all duration-300 hover:border-purple-300/30 hover:bg-purple-500/10"
                >
                  <Send size={12} />
                  Contact Me
                </a>

              </div>

              {/* Close Button */}
              <div className="flex justify-end mt-5">
                <button
                  onClick={onClose}
                  className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-xs text-white transition"
                >
                  Close
                </button>
              </div>

            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}