import { motion } from "framer-motion";
import { useLocalization } from "../../lib/i18n";

const stats = [
  { value: "10,000+", labelKey: "Sites Deployed" },
  { value: "99.9%", labelKey: "Uptime" },
  { value: "50+", labelKey: "Countries" },
  { value: "24/7", labelKey: "Support" },
];

const testimonials = [
  {
    textKey: "Deploying my portfolio site took less than 5 minutes. The custom domain setup with auto SSL was seamless.",
    name: "Alex Chen",
    roleKey: "Independent Developer",
    initials: "AC",
  },
  {
    textKey: "I've tried Vercel, Netlify, and Railway. Vibe Hosting gives me the same experience with way better latency from Asia.",
    name: "Yuki Tanaka",
    roleKey: "Full-Stack Engineer",
    initials: "YT",
  },
  {
    textKey: "The VPS + managed database combo is perfect for my SaaS. Everything in one dashboard, one bill.",
    name: "Maria Garcia",
    roleKey: "Startup Founder",
    initials: "MG",
  },
];

export function LandingSocialProof() {
  const { t } = useLocalization();

  return (
    <section className="landing-section lp-social">
      <div className="landing-container">
        <motion.h2
          className="landing-section-title"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4 }}
        >
          {t("Trusted by developers worldwide", "Trusted by developers worldwide")}
        </motion.h2>

        <div className="lp-social__stats">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.labelKey}
              className="lp-social__stat"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <div className="lp-social__stat-value">{stat.value}</div>
              <div className="lp-social__stat-label">{t(stat.labelKey, stat.labelKey)}</div>
            </motion.div>
          ))}
        </div>

        <div className="lp-social__testimonials">
          {testimonials.map((item, i) => (
            <motion.div
              key={item.name}
              className="lp-social__testimonial"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <p className="lp-social__testimonial-text">
                &ldquo;{t(item.textKey, item.textKey)}&rdquo;
              </p>
              <div className="lp-social__testimonial-author">
                <div className="lp-social__testimonial-avatar">{item.initials}</div>
                <div>
                  <div className="lp-social__testimonial-name">{item.name}</div>
                  <div className="lp-social__testimonial-role">
                    {t(item.roleKey, item.roleKey)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
