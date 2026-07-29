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
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsConditionsPage } from './components/TermsConditionsPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { VerifyOtpPage } from './components/VerifyOtpPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';

export function App() {
  const [currentRoute, setCurrentRoute] = useState<
    'home' | 'admin' | 'team-directory' | 'opportunities' | 'opportunity-detail' | 'privacy' | 'terms' | 'forgot-password' | 'forgot-password-verify' | 'forgot-password-reset'
  >('home');
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string>('');
  const [resetEmail, setResetEmail] = useState<string>('');
  const [verifiedOtp, setVerifiedOtp] = useState<string>('');

  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname.replace(/\/$/, '') || '/';
      const hash = window.location.hash;
      const secretEnvRoute = ((import.meta as any).env?.VITE_ADMIN_ROUTE || '/portal/9KqvA2Nz8').replace(/^\//, '');

      // Check if path or hash matches secret private admin route
      const isSecretAdminRoute =
        path === `/${secretEnvRoute}` ||
        path === '/portal/9KqvA2Nz8' ||
        hash === `#${secretEnvRoute}` ||
        hash === '#portal/9KqvA2Nz8' ||
        hash === '#manage/portal/x93LmK/admin' ||
        hash === '#portal-9KqvA2Nz8';

      if (isSecretAdminRoute) {
        setCurrentRoute('admin');
      } else if (hash === '#admin' || path === '/admin') {
        window.history.replaceState(null, '', '/');
        window.location.hash = '';
        setCurrentRoute('home');
      } else if (path === '/forgot-password' || hash === '#forgot-password' || hash === '#/forgot-password') {
        setCurrentRoute('forgot-password');
      } else if (path === '/forgot-password/verify' || hash === '#forgot-password/verify' || hash === '#/forgot-password/verify') {
        setCurrentRoute('forgot-password-verify');
      } else if (path === '/forgot-password/reset' || hash === '#forgot-password/reset' || hash === '#/forgot-password/reset') {
        setCurrentRoute('forgot-password-reset');
      } else if (path === '/team-directory' || path === '/team' || hash === '#team-directory' || hash === '#full-team') {
        setCurrentRoute('team-directory');
      } else if (path === '/privacy' || hash === '#privacy' || hash === '#privacy-policy') {
        setCurrentRoute('privacy');
      } else if (path === '/terms' || hash === '#terms' || hash === '#terms-and-conditions' || hash === '#terms-conditions') {
        setCurrentRoute('terms');
      } else if (
        path === '/opportunities' ||
        path === '/projects' ||
        path === '/programs' ||
        path === '/desicrew-contributors' ||
        path === '/desicrew' ||
        hash === '#opportunities' ||
        hash === '#projects' ||
        hash === '#programs' ||
        hash === '#desicrew-contributors' ||
        hash === '#desicrew'
      ) {
        setCurrentRoute('opportunities');
      } else if (path.startsWith('/opportunity/') || path.startsWith('/program/') || hash.startsWith('#opportunity/') || hash.startsWith('#program/')) {
        const oppId = path.startsWith('/opportunity/')
          ? path.replace('/opportunity/', '')
          : path.startsWith('/program/')
          ? path.replace('/program/', '')
          : hash.replace('#opportunity/', '').replace('#program/', '');
        setSelectedOpportunityId(oppId || '');
        setCurrentRoute('opportunity-detail');
      } else {
        setCurrentRoute('home');
      }
    };

    checkRoute();
    window.addEventListener('hashchange', checkRoute);
    window.addEventListener('popstate', checkRoute);
    return () => {
      window.removeEventListener('hashchange', checkRoute);
      window.removeEventListener('popstate', checkRoute);
    };
  }, []);

  const handleExitAdmin = () => {
    window.history.pushState(null, '', '/');
    window.location.hash = '';
    setCurrentRoute('home');
  };

  const handleBackToHome = () => {
    window.history.pushState(null, '', '/');
    window.location.hash = '';
    setCurrentRoute('home');
  };

  const handleReturnToAdminLogin = () => {
    const secretEnvRoute = ((import.meta as any).env?.VITE_ADMIN_ROUTE || '/portal/9KqvA2Nz8').replace(/^\//, '');
    window.history.pushState(null, '', `/${secretEnvRoute}`);
    setCurrentRoute('admin');
  };

  const handleSelectProgram = (id: string) => {
    setSelectedOpportunityId(id);
    window.history.pushState(null, '', `/opportunity/${id}`);
    setCurrentRoute('opportunity-detail');
  };

  return (
    <ThemeProvider>
      {currentRoute === 'admin' ? (
        <AdminDashboard onExit={handleExitAdmin} />
      ) : currentRoute === 'forgot-password' ? (
        <ForgotPasswordPage
          onNavigateVerify={(email) => {
            setResetEmail(email);
            window.location.hash = '/forgot-password/verify';
            setCurrentRoute('forgot-password-verify');
          }}
          onReturnLogin={handleReturnToAdminLogin}
        />
      ) : currentRoute === 'forgot-password-verify' ? (
        <VerifyOtpPage
          email={resetEmail || 'mr.prem2006@gmail.com'}
          onNavigateReset={(otp) => {
            setVerifiedOtp(otp);
            window.location.hash = '/forgot-password/reset';
            setCurrentRoute('forgot-password-reset');
          }}
          onBackToEmail={() => {
            window.location.hash = '/forgot-password';
            setCurrentRoute('forgot-password');
          }}
        />
      ) : currentRoute === 'forgot-password-reset' ? (
        <ResetPasswordPage
          email={resetEmail || 'mr.prem2006@gmail.com'}
          otp={verifiedOtp}
          onSuccessRedirectLogin={handleReturnToAdminLogin}
        />
      ) : currentRoute === 'team-directory' ? (
        <TeamDirectoryPage onBack={handleBackToHome} />
      ) : currentRoute === 'privacy' ? (
        <PrivacyPolicyPage onBack={handleBackToHome} />
      ) : currentRoute === 'terms' ? (
        <TermsConditionsPage onBack={handleBackToHome} />
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
