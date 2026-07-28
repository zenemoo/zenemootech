import React, { useState, useEffect } from 'react';
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
import { AdminDashboard } from './components/AdminDashboard';
import { TeamDirectoryPage } from './components/TeamDirectoryPage';
import { OpportunitiesPage } from './components/OpportunitiesPage';
import { OpportunityDetailPage } from './components/OpportunityDetailPage';

export function App() {
  const [currentRoute, setCurrentRoute] = useState<
    'home' | 'admin' | 'team-directory' | 'opportunities' | 'opportunity-detail'
  >('home');
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string>('');

  useEffect(() => {
    const checkRoute = () => {
      const hash = window.location.hash;
      if (hash === '#admin') {
        setCurrentRoute('admin');
      } else if (hash === '#team-directory' || hash === '#full-team') {
        setCurrentRoute('team-directory');
      } else if (
        hash === '#opportunities' ||
        hash === '#projects' ||
        hash === '#programs' ||
        hash === '#desicrew-contributors' ||
        hash === '#desicrew' ||
        hash === '#language-contributors'
      ) {
        window.location.hash = 'opportunities';
        setCurrentRoute('opportunities');
      } else if (hash.startsWith('#opportunity/') || hash.startsWith('#program/')) {
        const oppId = hash.replace('#opportunity/', '').replace('#program/', '');
        setSelectedOpportunityId(oppId || '');
        setCurrentRoute('opportunity-detail');
      } else {
        setCurrentRoute('home');
      }
    };

    checkRoute();
    window.addEventListener('hashchange', checkRoute);
    return () => window.removeEventListener('hashchange', checkRoute);
  }, []);

  const handleExitAdmin = () => {
    window.location.hash = '';
    setCurrentRoute('home');
  };

  const handleBackToHome = () => {
    window.location.hash = '';
    setCurrentRoute('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProgram = (programId: string) => {
    window.location.hash = `opportunity/${programId}`;
    setSelectedOpportunityId(programId);
    setCurrentRoute('opportunity-detail');
  };

  return (
    <ThemeProvider>
      {currentRoute === 'admin' ? (
        <AdminDashboard onExit={handleExitAdmin} />
      ) : currentRoute === 'team-directory' ? (
        <TeamDirectoryPage onBack={handleBackToHome} />
      ) : currentRoute === 'opportunities' ? (
        <OpportunitiesPage onBack={handleBackToHome} onSelectProgram={handleSelectProgram} />
      ) : currentRoute === 'opportunity-detail' ? (
        <OpportunityDetailPage
          opportunityId={selectedOpportunityId}
          onBack={() => {
            window.location.hash = 'opportunities';
            setCurrentRoute('opportunities');
          }}
        />
      ) : (
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
      )}
    </ThemeProvider>
  );
}

export default App;
