import Navbar from './components/Navbar';
import Hero from './components/Hero';
import PainPoints from './components/PainPoints';
import Benefits from './components/Benefits';
import HowItWorks from './components/HowItWorks';
import ProductDemo from './components/ProductDemo';
import ROICalculator from './components/ROICalculator';
import ComparisonTable from './components/ComparisonTable';
import Pricing from './components/Pricing';
import FAQ from './components/FAQ';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';
import MobileCTA from './components/MobileCTA';

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <PainPoints />
        <Benefits />
        <HowItWorks />
        <ProductDemo />
        <ROICalculator />
        <ComparisonTable />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <MobileCTA />
    </>
  );
}
