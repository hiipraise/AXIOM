import {
  Navbar,
  Hero,
  FeaturesSection,
  HowItWorksSection,
JobsTeaserSection,
  ExploreTeaserSection,
  CTASection,
  Footer,
} from '../components/landing'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <FeaturesSection />
      <HowItWorksSection />
      <ExploreTeaserSection />
      <JobsTeaserSection/>
      <CTASection />
      <Footer />
    </div>
  )
}