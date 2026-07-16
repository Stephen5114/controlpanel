import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLocalization } from "../../lib/i18n";

export function LandingCTA() {
  const { t } = useLocalization();

  return (
    <section className="lp-cta">
      <div className="landing-container">
        <motion.h2
          className="lp-cta__title"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          {t("Ready to ship?", "Ready to ship?")}
        </motion.h2>
        <motion.p
          className="lp-cta__desc"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {t(
            "Join thousands of developers deploying with Vibe Hosting. Start free, upgrade when you grow.",
            "Join thousands of developers deploying with Vibe Hosting. Start free, upgrade when you grow."
          )}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Link to="/register" className="lp-cta__btn">
            {t("Deploy for Free", "Deploy for Free")}
            <ArrowRight size={20} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
