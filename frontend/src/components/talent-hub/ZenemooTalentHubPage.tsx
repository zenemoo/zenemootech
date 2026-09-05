import React, { useState, useEffect } from 'react';
import { TalentHubAuthProvider, useTalentHubAuth } from './TalentHubAuthContext';
import { TalentHubLayout } from './TalentHubLayout';
import { TalentHubLoginPage } from './TalentHubLoginPage';
import { TalentHubDashboard } from './TalentHubDashboard';
import { TalentHubProfile } from './TalentHubProfile';
import { TalentHubOpportunities } from './TalentHubOpportunities';
import { TalentHubApplications } from './TalentHubApplications';

export type TalentHubSubRoute = 'login' | 'dashboard' | 'profile' | 'opportunities' | 'applications';

interface ZenemooTalentHubPageProps {
  initialSubRoute?: TalentHubSubRoute;
  onNavigateHome?: () => void;
  onNavigateRegister?: () => void;
}

const TalentHubContent: React.FC<{
  currentSubRoute: TalentHubSubRoute;
  onChangeSubRoute: (route: TalentHubSubRoute) => void;
  onNavigateHome?: () => void;
  onNavigateRegister?: () => void;
}> = ({ currentSubRoute, onChangeSubRoute, onNavigateHome, onNavigateRegister }) => {
  const { session, isRegistered, isLoading } = useTalentHubAuth();

  // If authenticated and registered, but user is on the login landing page, automatically route to dashboard
  useEffect(() => {
    if (!isLoading && session && isRegistered === true && currentSubRoute === 'login') {
      onChangeSubRoute('dashboard');
    }
  }, [session, isRegistered, isLoading, currentSubRoute, onChangeSubRoute]);

  // If not authenticated or not registered, protect dashboard/profile/opps/applications routes
  if (!session || isRegistered !== true) {
    return (
      <TalentHubLoginPage
        onNavigateHome={onNavigateHome}
        onNavigateRegister={onNavigateRegister}
      />
    );
  }

  // Authenticated + Registered: Render Talent Hub Portal within Layout
  const activeTab = currentSubRoute === 'login' ? 'dashboard' : currentSubRoute;

  return (
    <TalentHubLayout
      currentTab={activeTab}
      onNavigate={(tab) => onChangeSubRoute(tab)}
    >
      {activeTab === 'dashboard' && (
        <TalentHubDashboard onNavigate={(tab) => onChangeSubRoute(tab)} />
      )}
      {activeTab === 'profile' && <TalentHubProfile />}
      {activeTab === 'opportunities' && <TalentHubOpportunities />}
      {activeTab === 'applications' && (
        <TalentHubApplications
          onNavigateOpportunities={() => onChangeSubRoute('opportunities')}
        />
      )}
    </TalentHubLayout>
  );
};

export const ZenemooTalentHubPage: React.FC<ZenemooTalentHubPageProps> = ({
  initialSubRoute = 'login',
  onNavigateHome,
  onNavigateRegister,
}) => {
  const [subRoute, setSubRoute] = useState<TalentHubSubRoute>(initialSubRoute);

  useEffect(() => {
    setSubRoute(initialSubRoute);
  }, [initialSubRoute]);

  const handleSubRouteChange = (newRoute: TalentHubSubRoute) => {
    setSubRoute(newRoute);
    const path = newRoute === 'login' ? '/talent-hub' : `/talent-hub/${newRoute}`;
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', path);
      window.location.hash = path.replace(/^\//, '');
    }
  };

  return (
    <TalentHubAuthProvider>
      <TalentHubContent
        currentSubRoute={subRoute}
        onChangeSubRoute={handleSubRouteChange}
        onNavigateHome={onNavigateHome}
        onNavigateRegister={onNavigateRegister}
      />
    </TalentHubAuthProvider>
  );
};
