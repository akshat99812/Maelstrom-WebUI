import { HeroSection } from "@/components/landing/hero-section"
import { ValuePropsSection } from "@/components/landing/value-props-section"

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <main className="bg-gradient-pattern overflow-hidden">
        <HeroSection />
        <ValuePropsSection />
        {/* <StatsSection /> */}
      </main>
    </div>
  )
}
