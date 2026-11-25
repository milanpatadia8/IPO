import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LoginModal } from './components/LoginModal';
import { AllotmentCheckerModal } from './components/AllotmentCheckerModal';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { HomePage } from './pages/HomePage';
import { OngoingIPOsPage } from './pages/OngoingIPOsPage';
import { UpcomingIPOsPage } from './pages/UpcomingIPOsPage';
import { ListedIPOsPage } from './pages/ListedIPOsPage';
import { GMPTrackerPage } from './pages/GMPTrackerPage';
import { IPODetailPage } from './pages/IPODetailPage';
import { CalendarPage } from './pages/CalendarPage';
import { AboutPage } from './pages/AboutPage';
import { DisclaimerPage } from './pages/DisclaimerPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminIPOsPage } from './pages/admin/AdminIPOsPage';
import { AdminGMPPage } from './pages/admin/AdminGMPPage';
import { AdminSubscriptionsPage } from './pages/admin/AdminSubscriptionsPage';
import { AdminFeedsPage } from './pages/admin/AdminFeedsPage';
import { AdminImportsPage } from './pages/admin/AdminImportsPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { IPO } from './types/ipo';
import { api } from './lib/api';
import { useAuth, AppUserProfile } from './lib/auth';
import { ShieldAlert, LogOut, ArrowLeft, LogIn } from 'lucide-react';

export function App() {
  const { profile, adminUser, isSignedIn, isAdmin, authReady, signOut } = useAuth();

  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [adminTab, setAdminTab] = useState<string>('overview');
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [loginIntent, setLoginIntent] = useState<'user' | 'admin'>('user');
  const [loginReason, setLoginReason] = useState<string | undefined>(undefined);
  const pendingAfterLoginRef = useRef<(() => void) | null>(null);

  const [allotmentOpen, setAllotmentOpen] = useState<boolean>(false);
  const [allotmentSlug, setAllotmentSlug] = useState<string | undefined>(undefined);
  const [commandOpen, setCommandOpen] = useState<boolean>(false);
  const [allIpos, setAllIpos] = useState<IPO[]>([]);
  const [seedVersion, setSeedVersion] = useState<number>(0);

  // Seed Firestore automatically when an admin signs in for the first time
  useEffect(() => {
    if (!authReady) return;
    if (isAdmin && adminUser) {
      api
        .ensureSeededInFirestore(adminUser.id)
        .then(() => setSeedVersion((v) => v + 1))
        .catch((err) => console.error('Initial Firestore seed failed:', err));
    }
  }, [authReady, isAdmin, adminUser]);

  // Load IPO catalog publicly without requiring login
  useEffect(() => {
    api
      .getAllIPOs()
      .then(setAllIpos)
      .catch((err) => console.error('Failed to load IPOs:', err));
  }, [currentRoute, seedVersion]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentRoute(window.location.pathname || '/');
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const navigate = (route: string) => {
    window.history.pushState({}, '', route);
    const cleanPath = route.split('?')[0] || '/';
    setCurrentRoute(cleanPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openLoginModal = (
    intent: 'user' | 'admin' = 'user',
    reason?: string,
    onAfterLogin?: () => void
  ) => {
    setLoginIntent(intent);
    setLoginReason(reason);
    pendingAfterLoginRef.current = onAfterLogin || null;
    setLoginModalOpen(true);
  };

  const handleCloseLoginModal = () => {
    setLoginModalOpen(false);
    setLoginReason(undefined);
    pendingAfterLoginRef.current = null;
  };

  const openAllotment = (slug?: string) => {
    setAllotmentSlug(slug);
    setAllotmentOpen(true);
  };

  const handleLoginSuccess = (
    loggedInProfile: AppUserProfile,
    chosenRole: 'user' | 'admin'
  ) => {
    const pending = pendingAfterLoginRef.current;
    pendingAfterLoginRef.current = null;
    setLoginReason(undefined);

    if (chosenRole === 'admin' && loggedInProfile.role === 'admin') {
      navigate('/admin');
      return;
    }

    if (pending) {
      pending();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    if (currentRoute === '/admin' || currentRoute.startsWith('/admin/')) {
      navigate('/');
    }
  };

  const renderRoute = () => {
    // Public disclosure / informational routes
    if (currentRoute === '/about') {
      return <AboutPage navigate={navigate} />;
    }
    if (currentRoute === '/disclaimer') {
      return <DisclaimerPage navigate={navigate} />;
    }
    if (currentRoute === '/terms') {
      return <TermsPage />;
    }
    if (currentRoute === '/privacy') {
      return <PrivacyPage />;
    }

    // Protected Admin Console Route (Login required for Admin to edit backend details)
    if (currentRoute === '/admin' || currentRoute.startsWith('/admin/')) {
      if (!authReady) {
        return (
          <div className="max-w-md mx-auto my-20 p-8 bg-white border border-[#EAEAEA] rounded-xl text-center text-sm text-[#4B5563]">
            Checking login session...
          </div>
        );
      }

      if (!isSignedIn) {
        return (
          <div className="max-w-md mx-auto my-20 p-8 bg-white border border-[#EAEAEA] rounded-xl text-center space-y-4">
            <h2 className="text-lg font-semibold text-[#111827]">Admin Console</h2>
            <p className="text-sm text-[#4B5563]">
              Login with an authorized administrator account to edit IPO details, GMP quotes, subscriptions, and backend settings.
            </p>
            <button
              type="button"
              onClick={() => openLoginModal('admin', 'Login with an authorized Admin account to edit backend details.')}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#111827] text-white text-sm font-medium rounded-lg hover:bg-[#1F2937] transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>
          </div>
        );
      }

      if (!isAdmin || !adminUser) {
        return (
          <div className="max-w-md mx-auto my-20 p-8 bg-white border border-[#EAEAEA] rounded-xl text-center space-y-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-[#111827]">Admin Access Required</h2>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              You are logged in as <strong className="text-[#111827]">{profile?.email}</strong> with End User access. Only authorized administrators can edit backend IPO details.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#111827] text-white text-sm font-medium rounded-lg hover:bg-[#1F2937] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>View IPOs</span>
              </button>
              <button
                type="button"
                onClick={() => openLoginModal('admin', 'Select an authorized Admin Google account to continue.')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-[#E5E7EB] text-[#4B5563] hover:text-[#111827] text-sm font-medium rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Switch Account</span>
              </button>
            </div>
          </div>
        );
      }

      return (
        <AdminLayout
          currentAdminTab={adminTab}
          setAdminTab={setAdminTab}
          adminUser={adminUser}
          onLogout={handleSignOut}
          navigate={navigate}
        >
          {adminTab === 'overview' && (
            <AdminOverviewPage adminUser={adminUser} setAdminTab={setAdminTab} />
          )}
          {adminTab === 'ipos' && <AdminIPOsPage adminUser={adminUser} />}
          {adminTab === 'gmp' && <AdminGMPPage adminUser={adminUser} />}
          {adminTab === 'subscriptions' && <AdminSubscriptionsPage adminUser={adminUser} />}
          {adminTab === 'feeds' && <AdminFeedsPage adminUser={adminUser} />}
          {adminTab === 'imports' && <AdminImportsPage adminUser={adminUser} />}
          {adminTab === 'audit' && <AdminAuditPage adminUser={adminUser} />}
          {adminTab === 'settings' && <AdminSettingsPage adminUser={adminUser} />}
        </AdminLayout>
      );
    }

    // All IPO views are publicly accessible without login
    if (
      currentRoute.startsWith('/ipo/') &&
      currentRoute !== '/ipo/upcoming' &&
      currentRoute !== '/ipo/ongoing' &&
      currentRoute !== '/ipo/listed' &&
      currentRoute !== '/ipo/gmp'
    ) {
      const slug = currentRoute.replace('/ipo/', '');
      return (
        <IPODetailPage
          slug={slug}
          navigate={navigate}
          onRequireLogin={(reason, onAfterLogin) =>
            openLoginModal('user', reason, onAfterLogin)
          }
        />
      );
    }

    if (currentRoute.startsWith('/ipo/ongoing')) {
      const urlParams = new URLSearchParams(window.location.search);
      const searchParam = urlParams.get('search') || '';
      return (
        <OngoingIPOsPage
          navigate={navigate}
          searchParam={searchParam}
          onRequireLogin={(reason, onAfterLogin) =>
            openLoginModal('user', reason, onAfterLogin)
          }
        />
      );
    }

    if (currentRoute === '/ipo/upcoming') {
      return <UpcomingIPOsPage navigate={navigate} />;
    }

    if (currentRoute === '/ipo/listed') {
      return <ListedIPOsPage navigate={navigate} />;
    }

    if (currentRoute === '/ipo/gmp') {
      return <GMPTrackerPage navigate={navigate} />;
    }

    if (currentRoute === '/calendar') {
      return <CalendarPage navigate={navigate} />;
    }

    return (
      <HomePage
        navigate={navigate}
        onOpenAllotment={openAllotment}
        onOpenCommandPalette={() => setCommandOpen(true)}
      />
    );
  };

  const isAdminRoute = currentRoute === '/admin' || currentRoute.startsWith('/admin/');

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#111827] font-sans">
      {!(isAdminRoute && isAdmin) && (
        <Header
          currentRoute={currentRoute}
          navigate={navigate}
          userProfile={profile}
          isAdmin={isAdmin}
          onOpenLogin={() => openLoginModal('user')}
          onSignOut={handleSignOut}
          onOpenAllotment={() => openAllotment(undefined)}
        />
      )}

      <main className="flex-1">{renderRoute()}</main>

      {!(isAdminRoute && isAdmin) && (
        <Footer
          navigate={navigate}
          userProfile={profile}
          isAdmin={isAdmin}
          onOpenAdminLogin={() => openLoginModal('admin')}
        />
      )}

      <LoginModal
        isOpen={loginModalOpen}
        onClose={handleCloseLoginModal}
        onSuccess={handleLoginSuccess}
        intent={loginIntent}
        reason={loginReason}
      />

      <AllotmentCheckerModal
        isOpen={allotmentOpen}
        onClose={() => setAllotmentOpen(false)}
        ipos={allIpos}
        preselectedSlug={allotmentSlug}
      />

      <CommandPaletteModal
        isOpen={commandOpen}
        onClose={() => setCommandOpen(false)}
        ipos={allIpos}
        navigate={navigate}
        onOpenAllotment={openAllotment}
      />
    </div>
  );
}

export default App;
