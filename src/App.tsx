import React, { useState, useEffect } from 'react';
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
import { AdminUser, IPO } from './types/ipo';
import { api } from './lib/api';

export function App() {
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('ipo_tracker_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [adminTab, setAdminTab] = useState<string>('overview');
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [allotmentOpen, setAllotmentOpen] = useState<boolean>(false);
  const [allotmentSlug, setAllotmentSlug] = useState<string | undefined>(undefined);
  const [commandOpen, setCommandOpen] = useState<boolean>(false);
  const [allIpos, setAllIpos] = useState<IPO[]>([]);

  useEffect(() => {
    api.getAllIPOs().then(setAllIpos).catch(() => {});
  }, [currentRoute]);

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
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAllotment = (slug?: string) => {
    setAllotmentSlug(slug);
    setAllotmentOpen(true);
  };

  const handleAdminLoginSuccess = (user: AdminUser) => {
    setAdminUser(user);
    try {
      localStorage.setItem('ipo_tracker_admin_user', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    navigate('/admin');
  };

  const handleAdminLogout = () => {
    setAdminUser(null);
    try {
      localStorage.removeItem('ipo_tracker_admin_user');
    } catch (e) {
      console.error(e);
    }
    navigate('/');
  };

  const renderRoute = () => {
    if (currentRoute === '/admin' || currentRoute.startsWith('/admin/')) {
      if (!adminUser) {
        return (
          <div className="max-w-md mx-auto my-20 p-8 bg-white border border-[#EAEAEA] rounded-xl text-center space-y-4">
            <h2 className="text-lg font-semibold text-[#111827]">Protected Administrative Area</h2>
            <p className="text-xs text-[#6B7280]">
              Sign in with an authorized administrative profile to access the console.
            </p>
            <button
              onClick={() => setLoginModalOpen(true)}
              className="px-4 py-2 bg-[#111827] text-white text-xs font-medium rounded-lg hover:bg-[#1F2937] transition-colors"
            >
              Sign In to Admin Console
            </button>
          </div>
        );
      }

      return (
        <AdminLayout
          currentAdminTab={adminTab}
          setAdminTab={setAdminTab}
          adminUser={adminUser}
          onLogout={handleAdminLogout}
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

    if (
      currentRoute.startsWith('/ipo/') &&
      currentRoute !== '/ipo/upcoming' &&
      currentRoute !== '/ipo/ongoing' &&
      currentRoute !== '/ipo/listed' &&
      currentRoute !== '/ipo/gmp'
    ) {
      const slug = currentRoute.replace('/ipo/', '');
      return <IPODetailPage slug={slug} navigate={navigate} />;
    }

    if (currentRoute.startsWith('/ipo/ongoing')) {
      const urlParams = new URLSearchParams(window.location.search);
      const searchParam = urlParams.get('search') || '';
      return <OngoingIPOsPage navigate={navigate} searchParam={searchParam} />;
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
      {!isAdminRoute && (
        <Header
          currentRoute={currentRoute}
          navigate={navigate}
          adminUser={adminUser}
          onOpenAdminLogin={() => setLoginModalOpen(true)}
          onOpenAllotment={() => openAllotment(undefined)}
        />
      )}

      <main className="flex-1">{renderRoute()}</main>

      {!isAdminRoute && (
        <Footer
          navigate={navigate}
          adminUser={adminUser}
          onOpenAdminLogin={() => setLoginModalOpen(true)}
        />
      )}

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={handleAdminLoginSuccess}
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
