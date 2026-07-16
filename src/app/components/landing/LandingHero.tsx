import { ArrowRight, Code, Globe, Rocket } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLocalization } from "../../lib/i18n";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export function LandingHero() {
  const { t } = useLocalization();

  return (
    <section className="lp-hero">
      <div className="landing-container">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="lp-hero__kicker">
            <Rocket size={14} />
            {t("Developer Hosting", "Developer Hosting")}
          </span>
        </motion.div>

        <motion.h1
          className="lp-hero__title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {t("Ship your code,", "Ship your code,")}{" "}
          <span className="lp-hero__title-accent">
            {t("we host the vibe", "we host the vibe")}
          </span>
        </motion.h1>

        <motion.p
          className="lp-hero__desc"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {t(
            "5 minutes from code to live. One-click deploy, custom domains, auto SSL, managed databases, and VPS — all from one account.",
            "5 minutes from code to live. One-click deploy, custom domains, auto SSL, managed databases, and VPS — all from one account."
          )}
        </motion.p>

        <motion.div
          className="lp-hero__actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link to="/register" className="lp-hero__btn-primary">
            {t("Start Deploying Free", "Start Deploying Free")}
            <ArrowRight size={18} />
          </Link>
          <a href="#features" className="lp-hero__btn-secondary">
            {t("Learn More", "Learn More")}
          </a>
        </motion.div>

        <motion.div
          className="lp-hero__steps"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="lp-hero__step">
            <span className="lp-hero__step-icon"><Code size={16} /></span>
            <span>{t("Code", "Code")}</span>
          </div>
          <ArrowRight size={20} className="lp-hero__step-arrow" />
          <div className="lp-hero__step">
            <span className="lp-hero__step-icon"><Rocket size={16} /></span>
            <span>{t("Push", "Push")}</span>
          </div>
          <ArrowRight size={20} className="lp-hero__step-arrow" />
          <div className="lp-hero__step">
            <span className="lp-hero__step-icon"><Globe size={16} /></span>
            <span>{t("Live", "Live")}</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
