import Navbar from "../components/sections/Navbar";
import HeroForms from "../components/sections/HeroForms";
import PreviewPanel from "../components/sections/PreviewPanel";
import FeaturesGrid from "../components/sections/FeaturesGrid";
import Footer from "../components/sections/Footer";
import { useState } from "react";
import AboutModal from "../components/AboutModal";

export default function LandingPage() {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <div
      className="min-h-screen bg-[#0f0a1e] text-purple-50 overflow-x-hidden relative"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {/* Ambient background gradients */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 10% 0%, rgba(124,58,237,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 90% 10%, rgba(168,85,247,0.12) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 50% 100%, rgba(59,130,246,0.10) 0%, transparent 60%)
          `,
        }}
      />

      <div className="relative z-10">

        {/* Info Button */}
        {/* Info Button */}


        <Navbar />

        {/* Hero */}
        <section className="max-w-[1200px] mx-auto px-6 md:px-10 pt-16 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-16 items-start">
            <HeroForms />
            <PreviewPanel />
          </div>
        </section>

        <FeaturesGrid />
        <Footer setShowAbout={setShowAbout} />

        {/* About Modal */}
        <AboutModal
          open={showAbout}
          onClose={() => setShowAbout(false)}
        />

      </div>
    </div>
  );
}