import { motion } from "framer-motion";
import { FEATURES } from "../../constants";
import { staggerContainer } from "../../animations";
import FeatureCard from "./FeatureCard";

export default function FeaturesGrid() {
  return (
   <section
  id="features"
  className="scroll-mt-24 px-6 md:px-10 py-20 max-w-[1200px] mx-auto"
>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-xs uppercase tracking-widest text-purple-400 mb-4">
          Everything you need
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-purple-50 mb-3">
          Built for teams who ship
        </h2>
        <p className="text-purple-300/55 text-base max-w-lg leading-relaxed">
          One link, infinite collaboration. No accounts, no friction — just code.
        </p>
      </motion.div>

      {/* Grid */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12"
      >
        {FEATURES.map((feat) => (
          <FeatureCard key={feat.id} {...feat} />
        ))}
      </motion.div>
    </section>
  );
}