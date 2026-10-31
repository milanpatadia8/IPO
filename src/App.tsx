import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LoginModal } from './components/LoginModal';
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
import { AdminUser } from './types/ipo';
import { Info, X } from 'lucide-react';

export function App() {
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    // Check localStorage for active session
    try {
      const saved = localStorage.getItem('ipo_tracker_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [adminTab, setAdminTab] = useState<string>('overview');
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [showDevNotice, setShowDevNotice] = useState<boolean>(true);

  // Sync route on popstate
  useEffect(() => {
    const onPopState = () => {
      setCurrentRoute(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (route: string) => {
    window.history.pushState({}, '', route);
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Route parser
  const renderRoute = () => {
    // Admin Routes
    if (currentRoute === '/admin' || currentRoute.startsWith('/admin/')) {
      if (!adminUser) {
        return (
          <div className="max-w-md mx-auto my-20 p-8 bg-white border border-slate-200 rounded-lg shadow-sm text-center space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Protected Administrative Area</h2>
            <p className="text-xs text-slate-600">
              You must sign in with an authorized administrative profile to access the control panel.
            </p>
            <button
              onClick={() => setLoginModalOpen(true)}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 transition-colors"
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

    // Individual IPO Detail route: /ipo/:slug
    if (currentRoute.startsWith('/ipo/') && currentRoute !== '/ipo/upcoming' && currentRoute !== '/ipo/ongoing' && currentRoute !== '/ipo/listed' && currentRoute !== '/ipo/gmp') {
      const slug = currentRoute.replace('/ipo/', '');
      return <IPODetailPage slug={slug} navigate={navigate} />;
    }

    // Ongoing IPOs
    if (currentRoute.startsWith('/ipo/ongoing')) {
      const urlParams = new URLSearchParams(window.location.search);
      const searchParam = urlParams.get('search') || '';
      return <OngoingIPOsPage navigate={navigate} searchParam={searchParam} />;
    }

    // Upcoming IPOs
    if (currentRoute === '/ipo/upcoming') {
      return <UpcomingIPOsPage navigate={navigate} />;
    }

    // Listed IPOs
    if (currentRoute === '/ipo/listed') {
      return <ListedIPOsPage navigate={navigate} />;
    }

    // GMP Tracker
    if (currentRoute === '/ipo/gmp') {
      return <GMPTrackerPage navigate={navigate} />;
    }

    // Calendar
    if (currentRoute === '/calendar') {
      return <CalendarPage navigate={navigate} />;
    }

    // Informational Routes
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

    // Default: Homepage
    return <HomePage navigate={navigate} />;
  };

  const isAdminRoute = currentRoute === '/admin' || currentRoute.startsWith('/admin/');

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* Dev Environment Notice Bar (Section 5 & 20) */}
      {showDevNotice && !isAdminRoute && (
        <aside
          aria-label="Development environment sample data disclosure"
          className="bg-slate-900 text-slate-200 text-[11px] py-1.5 px-4 flex items-center justify-between border-b border-slate-800"
        >
          <div className="flex items-center gap-2 max-w-5xl mx-auto">
            <span className="font-semibold text-white bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
              DATA NOTICE
            </span>
            <span>
              Operating in self-contained demonstration mode with authentic historical & ongoing Indian IPO fixtures. Live exchange integration is pluggable via administrative settings.
            </span>
          </div>
          <button
            onClick={() => setShowDevNotice(false)}
            aria-label="Dismiss development notice"
            className="text-slate-400 hover:text-white p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </aside>
      )}

      {/* Top Header (Only on public routes) */}
      {!isAdminRoute && (
        <Header
          currentRoute={currentRoute}
          navigate={navigate}
          adminUser={adminUser}
          onOpenAdminLogin={() => setLoginModalOpen(true)}
        />
      )}

      {/* Main Viewport */}
      <main className="flex-1">{renderRoute()}</main>

      {/* Footer (Only on public routes) */}
      {!isAdminRoute && <Footer navigate={navigate} />}

      {/* Admin Authentication Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={handleAdminLoginSuccess}
      />
    </div>
  );
}

export default App;
