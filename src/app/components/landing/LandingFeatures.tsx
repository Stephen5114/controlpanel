import { motion } from "framer-motion";
import { Cloud, Database, Globe, Server, GitBranch, Terminal } from "lucide-react";
import { useLocalization } from "../../lib/i18n";

const features = [
  {
    icon: GitBranch,
    titleKey: "One-Click Deploy",
    descKey: "Deploy from Git, CLI, or FTP. Push your code and we handle the rest.",
  },
  {
    icon: Globe,
    titleKey: "Custom Domains",
    descKey: "Bring your own domain or register a new one. Free auto SSL on every site.",
  },
  {
    icon: Database,
    titleKey: "Managed Databases",
    descKey: "MySQL and PostgreSQL databases with automated backups and scaling.",
  },
  {
    icon: Server,
    titleKey: "VPS Instances",
    descKey: "Full root-access VPS with SSD storage, snapshots, and flexible plans.",
  },
  {
    icon: Terminal,
    titleKey: "CLI Tools",
    descKey: "Command-line tools for deployments, logs, and server management.",
  },
  {
    icon: Cloud,
    titleKey: "Auto SSL & CDN",
    descKey: "Free SSL certificates via Let's Encrypt with global CDN distribution.",
  },
];

export function LandingFeatures() {
  const { t } = useLocalization();

  return (
    <section id="features" className="landing-section lp-features">
      <div className="landing-container">
        <motion.h2
          className="landing-section-title"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4 }}
        >
          {t("Everything you need to ship", "Everything you need to ship")}
        </motion.h2>
        <motion.p
          className="landing-section-sub"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {t(
            "From the first commit to production — we've got you covered.",
            "From the first commit to production — we've got you covered."
          )}
        </motion.p>

        <div className="lp-features__grid">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.article
                key={feat.titleKey}
                className="lp-feature-card"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <div className="lp-feature-card__icon">
                  <Icon size={22} />
                </div>
                <h3 className="lp-feature-card__title">
                  {t(feat.titleKey, feat.titleKey)}
                </h3>
                <p className="lp-feature-card__desc">
                  {t(feat.descKey, feat.descKey)}
                </p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
