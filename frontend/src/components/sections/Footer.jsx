
import { Mail } from "lucide-react";
import { FaGithub, FaLinkedinIn } from "react-icons/fa";
import toast from "react-hot-toast";
import { Info } from "lucide-react";
export default function Footer({ setShowAbout }) {
  const email = "jaswanthakula121@gmail.com";

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);

      toast.success("Email copied to clipboard!", {
        position: "bottom-right",
        style: {
          background: "#052e16",
          color: "#dcfce7",
          border: "1px solid #166534",
        },
        iconTheme: {
          primary: "#22c55e",
          secondary: "#052e16",
        },
      });
    } catch {
      toast.error("Could not copy email. Please copy it manually.");
    }
  };

  return (
    <footer className="relative mt-8 border-t border-purple-400/15 bg-[#0b0714] px-6 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          boxShadow:
            "0 0 22px rgba(168,85,247,0.4), 0 0 48px rgba(124,58,237,0.2)",
        }}
      />

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">

        {/* Logo */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-yellow-400">✦</span>

          <span className="text-lg font-bold tracking-tight text-purple-50">
            Collab<span className="text-purple-400">X</span>
          </span>
        </div>

        {/* Subtitle */}
        <p className="mb-6 text-sm text-purple-300/65">
          Real-time collaborative coding platform
        </p>

        {/* Social Buttons */}
        <div className="mb-6 flex items-center gap-3">

          {/* GitHub */}
          <a
            href="https://github.com/JaswanthAkula121"
            target="_blank"
            rel="noreferrer"
            aria-label="CollabX on GitHub"
            className="rounded-xl border border-purple-400/20 bg-white/[0.02] p-2.5 text-purple-200/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-300/45 hover:bg-purple-500/10 hover:text-purple-100 hover:shadow-[0_8px_24px_rgba(124,58,237,0.25)]"
          >
            <FaGithub size={17} />
          </a>

          {/* LinkedIn */}
          <a
            href="https://www.linkedin.com/in/jaswanth-akula-aa606a37b"
            target="_blank"
            rel="noreferrer"
            aria-label="CollabX on LinkedIn"
            className="rounded-xl border border-purple-400/20 bg-white/[0.02] p-2.5 text-purple-200/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-300/45 hover:bg-purple-500/10 hover:text-purple-100 hover:shadow-[0_8px_24px_rgba(124,58,237,0.25)]"
          >
            <FaLinkedinIn size={17} />
          </a>

          {/* Email */}
          <button
            type="button"
            onClick={handleCopyEmail}
            aria-label="Contact Jaswanth by email"
            title={email}
            className="rounded-xl border border-purple-400/20 bg-white/[0.02] p-2.5 text-purple-200/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-300/45 hover:bg-purple-500/10 hover:text-purple-100 hover:shadow-[0_8px_24px_rgba(124,58,237,0.25)]"
          >
            <Mail size={17} />
          </button>

          {/* About */}
          <button
            onClick={() => setShowAbout(true)}
            aria-label="About CollabX"
            className="rounded-xl border border-purple-400/20 bg-white/[0.02] p-2.5 text-purple-200/80 transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-300/45 hover:bg-purple-500/10 hover:text-purple-100 hover:shadow-[0_8px_24px_rgba(124,58,237,0.25)]"
          >
            <Info size={17} />
          </button>

        </div>

        {/* Copyright */}
        <p className="text-xs text-purple-300/45">
          © {new Date().getFullYear()} CollabX. All rights reserved.
        </p>

      </div>
    </footer>
  );
}

