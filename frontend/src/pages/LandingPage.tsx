import {
  Navbar,
  Hero,
  FeaturesSection,
  HowItWorksSection,
JobsTeaserSection,
  ExploreTeaserSection,
  CVTeaserSection,
  CTASection,
  Footer,
} from '../components/landing'
import Seo from "../components/Seo"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Seo
        title="AI-Powered CV Builder"
        description="Build tailored, ATS-optimised CVs with AI. Axiom helps you score, target, and land your next role with smart CV tools."
      />
      <Navbar />
      <Hero />
      <FeaturesSection />
      <HowItWorksSection />
      <CVTeaserSection />
      <ExploreTeaserSection />
      <JobsTeaserSection/>
      <CTASection />
      <Footer />
    </div>
  )
}