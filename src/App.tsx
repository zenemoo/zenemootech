import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { CursorSpotlight } from './components/CursorSpotlight';
import { ThreeNeuralBackground } from './components/ThreeNeuralBackground';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { TelemetryStats } from './components/TelemetryStats';
import { AIPlayground } from './components/AIPlayground';
import { Services } from './components/Services';
import { Languages } from './components/Languages';
import { Architecture } from './components/Architecture';
import { Partner } from './components/Partner';
import { Team } from './components/Team';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';

export function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[#050505] light:bg-[#f8fafc] text-slate-100 light:text-slate-900 relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200 transition-colors duration-300">
        {/* Interactive Mouse Spotlight */}
        <CursorSpotlight />

        {/* 3D WebGL Neural Background Canvas */}
        <ThreeNeuralBackground />

        {/* Top Navbar */}
        <Navbar />

        {/* Main Content Sections */}
        <main className="relative z-10">
          <Hero />
          <TelemetryStats />
          <Services />
          <Languages />
          <AIPlayground />
          <Architecture />
          <Partner />
          <Team />
          <Contact />
        </main>

        {/* Mega Footer */}
        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default App;
