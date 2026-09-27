import React from 'react';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { About } from '../components/About';
import { FlagshipProject } from '../components/FlagshipProject';
import { ArchitectureShowcase } from '../components/ArchitectureShowcase';
import { SecuritySection } from '../components/SecuritySection';
import { OtherProjects } from '../components/OtherProjects';
import { TechnicalSkills } from '../components/TechnicalSkills';
import { CompetitiveProgramming } from '../components/CompetitiveProgramming';
import { Education } from '../components/Education';
import { Contact } from '../components/Contact';
import { Footer } from '../components/Footer';

export default function PortfolioPage() {
  return (
    <main className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      <Navbar />
      <Hero />
      <About />
      <FlagshipProject />
      <ArchitectureShowcase />
      <SecuritySection />
      <OtherProjects />
      <TechnicalSkills />
      <CompetitiveProgramming />
      <Education />
      <Contact />
      <Footer />
    </main>
  );
}
