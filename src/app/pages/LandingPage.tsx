import { LandingNav } from "../components/landing/LandingNav";
import { LandingHero } from "../components/landing/LandingHero";
import { LandingFeatures } from "../components/landing/LandingFeatures";
import { LandingPricing } from "../components/landing/LandingPricing";
import { LandingSocialProof } from "../components/landing/LandingSocialProof";
import { LandingCTA } from "../components/landing/LandingCTA";
import { LandingFooter } from "../components/landing/LandingFooter";

export function LandingPage() {
  return (
    <div className="landing">
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
      <LandingPricing />
      <LandingSocialProof />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
