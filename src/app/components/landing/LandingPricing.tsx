import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLocalization } from "../../lib/i18n";

const plans = [
  {
    nameKey: "Free",
    price: "$0",
    periodKey: "/month",
    descKey: "Perfect for personal projects and experiments.",
    featured: false,
    features: [
      "1 site",
      "1 GB storage",
      "1 GB bandwidth",
      "Shared SSL",
      "Community support",
    ],
    ctaKey: "Get Started",
    ctaPrimary: true,
  },
  {
    nameKey: "Pro",
    price: "$5",
    periodKey: "/month",
    descKey: "For developers with multiple projects in production.",
    featured: true,
    features: [
      "5 sites",
      "5 GB storage",
      "50 GB bandwidth",
      "Auto SSL",
      "Custom domains",
      "Priority support",
    ],
    ctaKey: "Start Free Trial",
    ctaPrimary: true,
  },
  {
    nameKey: "Business",
    price: "$15",
    periodKey: "/month",
    descKey: "For teams and businesses needing more power.",
    featured: false,
    features: [
      "Unlimited sites",
      "50 GB storage",
      "500 GB bandwidth",
      "Auto SSL",
      "Custom domains",
      "Database hosting",
      "VPS access",
      "24/7 support",
    ],
    ctaKey: "Start Free Trial",
    ctaPrimary: false,
  },
];

export function LandingPricing() {
  const { t } = useLocalization();

  return (
    <section id="pricing" className="landing-section">
      <div className="landing-container">
        <motion.h2
          className="landing-section-title"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4 }}
        >
          {t("Simple, transparent pricing", "Simple, transparent pricing")}
        </motion.h2>
        <motion.p
          className="landing-section-sub"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {t(
            "No hidden fees. No surprise charges. What you see is what you pay.",
            "No hidden fees. No surprise charges. What you see is what you pay."
          )}
        </motion.p>

        <div className="lp-pricing__grid">
          {plans.map((plan, i) => (
            <motion.article
              key={plan.nameKey}
              className={`lp-pricing-card${plan.featured ? " lp-pricing-card--featured" : ""}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              {plan.featured && (
                <span className="lp-pricing-card__badge">
                  {t("Most Popular", "Most Popular")}
                </span>
              )}
              <h3 className="lp-pricing-card__name">
                {t(plan.nameKey, plan.nameKey)}
              </h3>
              <div className="lp-pricing-card__price">
                <span className="lp-pricing-card__amount">{plan.price}</span>
                <span className="lp-pricing-card__period">
                  {t(plan.periodKey, plan.periodKey)}
                </span>
              </div>
              <p className="lp-pricing-card__desc">
                {t(plan.descKey, plan.descKey)}
              </p>
              <ul className="lp-pricing-card__features">
                {plan.features.map((feat) => (
                  <li key={feat} className="lp-pricing-card__feature">
                    <Check size={16} className="lp-pricing-card__feature-icon" />
                    {t(feat, feat)}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`lp-pricing-card__btn lp-pricing-card__btn--${plan.ctaPrimary ? "primary" : "secondary"}`}
              >
                {t(plan.ctaKey, plan.ctaKey)}
              </Link>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
