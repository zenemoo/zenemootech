import React, { useState, useEffect } from 'react';
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
import { GovernmentRecognition } from './components/GovernmentRecognition';
import { Team } from './components/Team';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { AdminDashboard } from './components/AdminDashboard';
import { TeamDirectoryPage } from './components/TeamDirectoryPage';
import { TeamMemberProfilePage } from './components/TeamMemberProfilePage';
import { OpportunitiesPage } from './components/OpportunitiesPage';
import { OpportunityDetailPage } from './components/OpportunityDetailPage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsConditionsPage } from './components/TermsConditionsPage';
import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { VerifyOtpPage } from './components/VerifyOtpPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { ZenemooAiPage } from './components/ZenemooAiPage';
import { ZenemooAiDrawer } from './components/ZenemooAiDrawer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SubscribeModal } from './components/SubscribeModal';
import { ZenemooNotificationPrompt } from './components/ZenemooNotificationPrompt';
import { NotificationToast } from './components/NotificationToast';
import { ZenemooAppUpdatePrompt } from './components/ZenemooAppUpdatePrompt';
import { UnsubscribePage } from './components/UnsubscribePage';
import { NotFoundPage } from './components/NotFoundPage';
import { ScrollProgressButton } from './components/ScrollProgressButton';

import { TeamLoginPage } from './components/TeamLoginPage';
import { HRLoginPage } from './components/HRLoginPage';
import { TeamDashboard } from './components/TeamDashboard';
import { HRDashboard } from './components/HRDashboard';
import { ReviewsPage } from './components/ReviewsPage';
import { ZenemooTalentRegistrationPage } from './components/ZenemooTalentRegistrationPage';
import { AiDataPortfolioPage } from './components/AiDataPortfolioPage';
import { PublicDatasetDetailPage } from './components/PublicDatasetDetailPage';
import { ZenemooAndroidAppPage } from './components/ZenemooAndroidAppPage';
import { ZenemooAppsHubPage } from './components/ZenemooAppsHubPage';

export function App() {
  const [currentRoute, setCurrentRoute] = useState<
    'home' | 'admin' | 'email' | 'team-login' | 'team-dashboard' | 'hr-login' | 'hr-dashboard' | 'team-directory' | 'team-profile' | 'opportunities' | 'opportunity-detail' | 'privacy' | 'terms' | 'forgot-password' | 'forgot-password-verify' | 'forgot-password-reset' | 'zenemooai' | 'unsubscribe' | 'reviews' | 'talent-registration' | 'ai-data' | 'ai-data-detail' | 'app-hub' | 'app-android' | '404'
  >('home');
  const [selectedDatasetSlug, setSelectedDatasetSlug] = useState<string>('');
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string>('');
  const [selectedTeamSlug, setSelectedTeamSlug] = useState<string>('');
  const [resetEmail, setResetEmail] = useState<string>('');
  const [verifiedOtp, setVerifiedOtp] = useState<string>('');
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [portalUser, setPortalUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('zenemoo_portal_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname.replace(/\/$/, '') || '/';
      const hash = window.location.hash;
      const secretEnvRoute = ((import.meta as any).env?.VITE_ADMIN_ROUTE || '/portal/9KqvA2Nz8').replace(/^\//, '');

      // Dynamic robots protection set below based on matchedRoute

      // Check if path or hash matches secret private admin route
      const hasActiveAdminToken = typeof window !== 'undefined' && !!localStorage.getItem('zenemoo_jwt_token');
      const isForgotPasswordRoute = path.includes('forgot-password') || hash.includes('forgot-password');

      const isSecretAdminRoute =
        !isForgotPasswordRoute &&
        (path === `/${secretEnvRoute}` ||
        path === '/portal/9KqvA2Nz8' ||
        hash === `#${secretEnvRoute}` ||
        hash === '#portal/9KqvA2Nz8' ||
        hash === '#manage/portal/x93LmK/admin' ||
        hash === '#portal-9KqvA2Nz8' ||
        (hasActiveAdminToken && (path.startsWith('/portal') || hash.includes('portal') || path === '/admin')));

      let matchedRoute:
        | 'home'
        | 'admin'
        | 'email'
        | 'team-login'
        | 'team-dashboard'
        | 'hr-login'
        | 'hr-dashboard'
        | 'team-directory'
        | 'team-profile'
        | 'opportunities'
        | 'opportunity-detail'
        | 'privacy'
        | 'terms'
        | 'forgot-password'
        | 'forgot-password-verify'
        | 'forgot-password-reset'
        | 'zenemooai'
        | 'unsubscribe'
        | 'reviews'
        | 'talent-registration'
        | 'ai-data'
        | 'ai-data-detail'
        | 'app-hub'
        | 'app-android'
        | '404' = 'home';

      if (isSecretAdminRoute) {
        matchedRoute = 'admin';
      } else if (path === '/email' || hash === '#email' || hash === '#/email') {
        matchedRoute = 'email';
      } else if (
        path === '/team/dashboard' ||
        path === '/team/dashboard/' ||
        hash === '#team/dashboard' ||
        hash === '#/team/dashboard' ||
        hash === '#team-dashboard'
      ) {
        matchedRoute = 'team-dashboard';
      } else if (path === '/team-login' || hash === '#team-login' || hash === '#/team-login') {
        const token = typeof window !== 'undefined' && localStorage.getItem('zenemoo_jwt_token');
        const expiry = typeof window !== 'undefined' && localStorage.getItem('zenemoo_jwt_expiry');
        const isNotExpired = !expiry || parseInt(expiry, 10) > Date.now();
        const role = (portalUser?.role || '').toLowerCase();
        if (token && isNotExpired && portalUser && role !== 'hr') {
          matchedRoute = 'team-dashboard';
        } else {
          matchedRoute = 'team-login';
        }
      } else if (
        path === '/hr/dashboard' ||
        path === '/hr/dashboard/' ||
        hash === '#hr/dashboard' ||
        hash === '#/hr/dashboard' ||
        hash === '#hr-dashboard'
      ) {
        matchedRoute = 'hr-dashboard';
      } else if (path === '/hr-login' || hash === '#hr-login' || hash === '#/hr-login') {
        const token = typeof window !== 'undefined' && localStorage.getItem('zenemoo_jwt_token');
        const expiry = typeof window !== 'undefined' && localStorage.getItem('zenemoo_jwt_expiry');
        const isNotExpired = !expiry || parseInt(expiry, 10) > Date.now();
        if (token && isNotExpired && portalUser && (portalUser.role === 'hr' || portalUser.role === 'admin')) {
          matchedRoute = 'hr-dashboard';
        } else {
          matchedRoute = 'hr-login';
        }
      } else if (hash === '#admin' || path === '/admin') {
        window.history.replaceState(null, '', '/');
        window.location.hash = '';
        matchedRoute = 'home';
      } else if (path === '/forgot-password' || hash === '#forgot-password' || hash === '#/forgot-password') {
        matchedRoute = 'forgot-password';
      } else if (path === '/forgot-password/verify' || hash === '#forgot-password/verify' || hash === '#/forgot-password/verify') {
        matchedRoute = 'forgot-password-verify';
      } else if (path === '/forgot-password/reset' || hash === '#forgot-password/reset' || hash === '#/forgot-password/reset') {
        matchedRoute = 'forgot-password-reset';
      } else if (path === '/zenemooai' || path === '/ai' || hash === '#zenemooai' || hash === '#ai') {
        matchedRoute = 'zenemooai';
      } else if (path === '/team-directory' || path === '/team-directory/' || hash === '#team-directory' || hash === '#full-team') {
        matchedRoute = 'team-directory';
      } else if (path.startsWith('/team/') || hash.startsWith('#team/')) {
        const slug = path.startsWith('/team/')
          ? path.replace('/team/', '').replace(/^\//, '')
          : hash.replace('#team/', '').replace(/^\//, '');
        setSelectedTeamSlug(slug || '');
        matchedRoute = 'team-profile';
      } else if (path === '/privacy' || hash === '#privacy' || hash === '#privacy-policy') {
        matchedRoute = 'privacy';
      } else if (path === '/terms' || hash === '#terms' || hash === '#terms-and-conditions' || hash === '#terms-conditions') {
        matchedRoute = 'terms';
      } else if (path === '/unsubscribe' || path === '/unsubscribe/' || hash === '#unsubscribe' || hash === '#/unsubscribe') {
        matchedRoute = 'unsubscribe';
      } else if (
        path === '/talent-registration' ||
        path === '/talent-registration/' ||
        path === '/register-talent' ||
        path === '/register-talent/' ||
        hash === '#talent-registration' ||
        hash === '#register-talent' ||
        hash === '#/register-talent'
      ) {
        matchedRoute = 'talent-registration';
      } else if (
        path === '/review' ||
        path === '/review/' ||
        path === '/reviews' ||
        path === '/reviews/' ||
        hash === '#review' ||
        hash === '#/review' ||
        hash === '#reviews' ||
        hash === '#/reviews'
      ) {
        matchedRoute = 'reviews';
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
        matchedRoute = 'opportunities';
      } else if (path.startsWith('/opportunity/') || path.startsWith('/program/') || hash.startsWith('#opportunity/') || hash.startsWith('#program/')) {
        const oppId = path.startsWith('/opportunity/')
          ? path.replace('/opportunity/', '')
          : path.startsWith('/program/')
          ? path.replace('/program/', '')
          : hash.replace('#opportunity/', '').replace('#program/', '');
        setSelectedOpportunityId(oppId || '');
        matchedRoute = 'opportunity-detail';
      } else if (path === '/ai-data' || path === '/ai-data/' || hash === '#ai-data' || hash === '#/ai-data') {
        matchedRoute = 'ai-data';
      } else if (path.startsWith('/ai-data/') || hash.startsWith('#ai-data/')) {
        const slug = path.startsWith('/ai-data/')
          ? path.replace('/ai-data/', '').replace(/^\//, '')
          : hash.replace('#ai-data/', '').replace(/^\//, '');
        setSelectedDatasetSlug(slug || '');
        matchedRoute = 'ai-data-detail';
      } else if (
        path === '/app/android' ||
        path === '/app/android/' ||
        hash === '#app/android' ||
        hash === '#/app/android' ||
        hash === '#android-app' ||
        hash === '#app-android'
      ) {
        matchedRoute = 'app-android';
      } else if (
        path === '/app' ||
        path === '/app/' ||
        path === '/apps' ||
        path === '/apps/' ||
        path === '/download' ||
        path === '/downloads' ||
        hash === '#app' ||
        hash === '#/app' ||
        hash === '#apps' ||
        hash === '#download'
      ) {
        matchedRoute = 'app-hub';
      } else if (path === '/' || path === '') {
        matchedRoute = 'home';
      } else {
        matchedRoute = '404';
      }

      setCurrentRoute(matchedRoute);

      // Dynamic robots noindex protection for admin, standalone email, and 404 routes
      let robotsMeta = document.querySelector('meta[name="robots"]');
      if (path === '/email' || path === '/admin' || path.startsWith('/portal') || matchedRoute === '404') {
        if (!robotsMeta) {
          robotsMeta = document.createElement('meta');
          robotsMeta.setAttribute('name', 'robots');
          document.head.appendChild(robotsMeta);
        }
        robotsMeta.setAttribute('content', 'noindex, follow');
      } else if (robotsMeta) {
        robotsMeta.setAttribute('content', 'index, follow');
      }

      // Update document title, canonical tag & meta description for SEO indexing
      let pageTitle = 'Zenemoo — AI Data Solutions, Multilingual Speech & AI Services';
      let canonicalUrl = 'https://www.zenemoo.in/';
      let metaDescription = 'Zenemoo provides enterprise AI data solutions, multilingual speech annotation, data collection, AI training datasets, and language technology services.';

      if (matchedRoute === '404') {
        pageTitle = '404 – Page Not Found | Zenemoo';
        canonicalUrl = `https://www.zenemoo.in${path}`;
        metaDescription = "The page you requested could not be found. Explore Zenemoo's AI language services, data annotation, transcription, and enterprise solutions.";
      } else if (matchedRoute === 'ai-data' || path === '/ai-data' || hash.includes('#ai-data')) {
        pageTitle = 'AI Data Portfolio & Public Datasets — Zenemoo';
        canonicalUrl = 'https://www.zenemoo.in/ai-data';
        metaDescription = 'Browse Zenemoo public AI datasets, audio speech samples, video datasets, image annotation corpora, and benchmark data collections.';
      } else if (matchedRoute === 'reviews' || path === '/review' || hash.includes('#review')) {
        pageTitle = 'Community & Client Reviews — Zenemoo Enterprise AI';
        canonicalUrl = 'https://www.zenemoo.in/review';
        metaDescription = 'Read verified community reviews, worker feedback, partner ratings, and client testimonials about Zenemoo language data annotation services.';
      } else if (path === '/opportunities' || hash.includes('#opportunities') || matchedRoute === 'opportunities') {
        pageTitle = 'Program Opportunities & Careers — Zenemoo';
        canonicalUrl = 'https://www.zenemoo.in/opportunities';
        metaDescription = 'Explore official partner initiatives, language AI annotation campaigns, remote work opportunities, and enterprise project listings at Zenemoo.';
      } else if (path === '/team-directory' || path === '/team' || hash.includes('#team') || matchedRoute === 'team-directory') {
        pageTitle = 'Data Team Roster & Executive Directory — Zenemoo';
        canonicalUrl = 'https://www.zenemoo.in/team-directory';
        metaDescription = 'Meet Zenemoo executive team, language AI researchers, project managers, annotation leads, and enterprise language coordinators.';
      } else if (matchedRoute === 'talent-registration') {
        pageTitle = 'AI Data Talent & Partner Registration — Zenemoo';
        canonicalUrl = 'https://www.zenemoo.in/talent-registration';
        metaDescription = 'Join Zenemoo AI Data Network. Register as a native speaker, coordinator, vocalist, recording team, or vendor agency for AI projects.';
      } else if (path === '/terms' || hash.includes('#terms')) {
        pageTitle = 'Terms & Conditions — Zenemoo Enterprise AI';
        canonicalUrl = 'https://www.zenemoo.in/terms';
        metaDescription = 'Official Zenemoo enterprise terms of service, data annotation guidelines, candidate agreements, and usage policies.';
      } else if (path === '/privacy' || hash.includes('#privacy')) {
        pageTitle = 'Privacy Policy — Zenemoo Enterprise AI';
        canonicalUrl = 'https://www.zenemoo.in/privacy';
        metaDescription = 'Zenemoo data privacy policy, security standards, confidentiality protocols, and candidate data protection guidelines.';
      } else if (matchedRoute === 'app-hub' || path === '/app' || path === '/apps') {
        pageTitle = 'Zenemoo Apps — Official Applications';
        canonicalUrl = 'https://www.zenemoo.in/app';
        metaDescription = 'Explore official Zenemoo applications for Android and future platforms. Download trusted Zenemoo apps and stay connected with opportunities, AI services, and platform updates.';
      } else if (matchedRoute === 'app-android' || path.startsWith('/app/android')) {
        pageTitle = 'Zenemoo Android App — Official Download';
        canonicalUrl = 'https://www.zenemoo.in/app/android';
        metaDescription = 'Download the latest official Zenemoo Android application directly from Zenemoo.';
      } else if (path === '/zenemooai' || hash.includes('#zenemooai')) {
        pageTitle = 'Zenemoo AI Assistant — Multilingual AI Engine';
        canonicalUrl = 'https://www.zenemoo.in/zenemooai';
        metaDescription = 'Interact with Zenemoo AI Assistant for instant information on multilingual speech datasets, enterprise data annotation, and AI services.';
      }

      document.title = pageTitle;

      let canonicalMeta = document.querySelector('link[rel="canonical"]');
      if (!canonicalMeta) {
        canonicalMeta = document.createElement('link');
        canonicalMeta.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalMeta);
      }
      canonicalMeta.setAttribute('href', canonicalUrl);

      let descMeta = document.querySelector('meta[name="description"]');
      if (!descMeta) {
        descMeta = document.createElement('meta');
        descMeta.setAttribute('name', 'description');
        document.head.appendChild(descMeta);
      }
      descMeta.setAttribute('content', metaDescription);
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
    <>
      {currentRoute === 'admin' ? (
        <AdminDashboard onExit={handleExitAdmin} />
      ) : currentRoute === 'email' ? (
        <AdminDashboard initialTab="history" isStandaloneEmailView={true} onExit={handleExitAdmin} />
      ) : currentRoute === 'team-login' ? (
        <TeamLoginPage
          onSuccessLogin={(userData) => {
            setPortalUser(userData);
            setCurrentRoute('team-dashboard');
            window.history.pushState(null, '', '/team/dashboard');
            window.location.hash = 'team/dashboard';
          }}
          onBackToHome={handleBackToHome}
        />
      ) : currentRoute === 'team-dashboard' ? (
        <TeamDashboard
          initialUserData={portalUser}
          onLogout={() => {
            localStorage.removeItem('zenemoo_jwt_token');
            localStorage.removeItem('zenemoo_jwt_expiry');
            localStorage.removeItem('zenemoo_portal_user');
            setPortalUser(null);
            setCurrentRoute('team-login');
            window.history.pushState(null, '', '/team-login');
            window.location.hash = 'team-login';
          }}
        />
      ) : currentRoute === 'hr-login' ? (
        <HRLoginPage
          onSuccessLogin={(userData) => {
            setPortalUser(userData);
            setCurrentRoute('hr-dashboard');
            window.history.pushState(null, '', '/hr/dashboard');
            window.location.hash = 'hr/dashboard';
          }}
          onBackToHome={handleBackToHome}
        />
      ) : currentRoute === 'hr-dashboard' ? (
        <HRDashboard
          initialUserData={portalUser}
          onLogout={() => {
            localStorage.removeItem('zenemoo_jwt_token');
            localStorage.removeItem('zenemoo_jwt_expiry');
            localStorage.removeItem('zenemoo_portal_user');
            setPortalUser(null);
            setCurrentRoute('hr-login');
            window.history.pushState(null, '', '/hr-login');
            window.location.hash = 'hr-login';
          }}
        />
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
      ) : currentRoute === 'zenemooai' ? (
        <ZenemooAiPage onBack={handleBackToHome} />
      ) : currentRoute === 'team-directory' ? (
        <TeamDirectoryPage onBack={handleBackToHome} onOpenAiDrawer={() => setIsAiDrawerOpen(true)} />
      ) : currentRoute === 'team-profile' ? (
        <TeamMemberProfilePage slug={selectedTeamSlug} onBack={handleBackToHome} onOpenAiDrawer={() => setIsAiDrawerOpen(true)} />
      ) : currentRoute === 'privacy' ? (
        <PrivacyPolicyPage onBack={handleBackToHome} />
      ) : currentRoute === 'terms' ? (
        <TermsConditionsPage onBack={handleBackToHome} />
      ) : currentRoute === 'talent-registration' ? (
        <ZenemooTalentRegistrationPage onBack={handleBackToHome} />
      ) : currentRoute === 'opportunities' ? (
        <OpportunitiesPage
          onBack={handleBackToHome}
          onSelectProgram={handleSelectProgram}
          onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
        />
      ) : currentRoute === 'opportunity-detail' ? (
        <OpportunityDetailPage
          opportunityId={selectedOpportunityId}
          onBack={() => {
            window.location.hash = 'opportunities';
            setCurrentRoute('opportunities');
          }}
          onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
        />
      ) : currentRoute === 'unsubscribe' ? (
        <UnsubscribePage />
      ) : currentRoute === 'reviews' ? (
        <ReviewsPage onBack={handleBackToHome} onOpenAiDrawer={() => setIsAiDrawerOpen(true)} />
      ) : currentRoute === 'ai-data' ? (
        <AiDataPortfolioPage
          onBack={handleBackToHome}
          onSelectDataset={(slug) => {
            setSelectedDatasetSlug(slug);
            window.history.pushState(null, '', `/ai-data/${slug}`);
            setCurrentRoute('ai-data-detail');
          }}
          onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
        />
      ) : currentRoute === 'ai-data-detail' ? (
        <PublicDatasetDetailPage
          slug={selectedDatasetSlug}
          onBack={() => {
            window.history.pushState(null, '', '/ai-data');
            setCurrentRoute('ai-data');
          }}
          onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
        />
      ) : currentRoute === 'app-hub' ? (
        <ZenemooAppsHubPage
          onBack={handleBackToHome}
          onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
        />
      ) : currentRoute === 'app-android' ? (
        <ZenemooAndroidAppPage
          onBack={() => {
            window.history.pushState(null, '', '/app');
            setCurrentRoute('app-hub');
          }}
          onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
        />
      ) : currentRoute === '404' ? (
        <NotFoundPage onOpenAiDrawer={() => setIsAiDrawerOpen(true)} />
      ) : (
        <div className="min-h-screen bg-[#050505] text-slate-100 relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200 transition-colors duration-300">
          {/* Interactive Mouse Spotlight */}
          <CursorSpotlight />

          {/* 3D WebGL Neural Background Canvas */}
          <ThreeNeuralBackground />

          {/* Top Navbar */}
          <Navbar onOpenAiDrawer={() => setIsAiDrawerOpen(true)} />

          {/* Main Content Sections */}
          <main className="relative z-10 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-0 font-sans">
            <Hero />
            <TelemetryStats />
            <Services />
            <Languages />
            <AIPlayground />
            <Architecture />
            <Partner />
            <GovernmentRecognition />
            <Team />
            <Contact />
          </main>

          {/* Mega Footer */}
          <Footer />
        </div>
      )}

      {/* Global Right-Side AI Drawer Panel (Active on all non-admin pages) */}
      {currentRoute !== 'admin' && (
        <>
          {currentRoute !== 'zenemooai' && (
            <>
              <ZenemooAiDrawer
                isOpen={isAiDrawerOpen}
                onClose={() => setIsAiDrawerOpen(false)}
              />
              <MobileBottomNav onOpenAiDrawer={() => setIsAiDrawerOpen(true)} />
            </>
          )}
          <SubscribeModal />
          <ZenemooNotificationPrompt />
          <NotificationToast />
          <ZenemooAppUpdatePrompt />
          <ScrollProgressButton />
        </>
      )}
    </>
  );
}

export default App;

