import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LoginModal } from './components/LoginModal';
import { ProfileModal } from './components/ProfileModal';
import { AllotmentCheckerModal } from './components/AllotmentCheckerModal';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { HomePage } from './pages/HomePage';
import { OngoingIPOsPage } from './pages/OngoingIPOsPage';
import { UpcomingIPOsPage } from './pages/UpcomingIPOsPage';
import { ListedIPOsPage } from './pages/ListedIPOsPage';
import { GMPTrackerPage } from './pages/GMPTrackerPage';
import { IPODetailPage } from './pages/IPODetailPage';
import { CalendarPage } from './pages/CalendarPage';
import { PolicyDocumentPage } from './pages/PolicyDocumentPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminIPOsPage } from './pages/admin/AdminIPOsPage';
import { AdminClientsPage } from './pages/admin/AdminClientsPage';
import { AdminGMPPage } from './pages/admin/AdminGMPPage';
import { AdminSubscriptionsPage } from './pages/admin/AdminSubscriptionsPage';
import { AdminPoliciesPage } from './pages/admin/AdminPoliciesPage';
import { AdminImportsPage } from './pages/admin/AdminImportsPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { IPO, SitePolicy, SitePageContent, SitePageKey } from './types/ipo';
import { api } from './lib/api';
import { DEFAULT_SITE_POLICIES } from './lib/defaultPolicies';
import { cloneDefaultSitePages } from './lib/defaultPageContent';
import { SiteContentProvider } from './lib/siteContent';
import { PageNoticeBanner } from './components/PageCustomSections';
import { useAuth, AppUserProfile, formatUserContact } from './lib/auth';
import { ShieldAlert, LogOut, ArrowLeft, LogIn } from 'lucide-react';

export function App() {
  const {
    profile,
    adminUser,
    isSignedIn,
    isAdmin,
    authReady,
    signOut,
  } = useAuth();

  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [adminTab, setAdminTab] = useState<string>('overview');
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);
  const [loginReason, setLoginReason] = useState<string | undefined>(undefined);
  const pendingAfterLoginRef = useRef<(() => void) | null>(null);

  const [allotmentOpen, setAllotmentOpen] = useState<boolean>(false);
  const [allotmentSlug, setAllotmentSlug] = useState<string | undefined>(undefined);
  const [commandOpen, setCommandOpen] = useState<boolean>(false);
  const [allIpos, setAllIpos] = useState<IPO[]>([]);
  const [sitePolicies, setSitePolicies] = useState<SitePolicy[]>(DEFAULT_SITE_POLICIES);
  const [policiesLoaded, setPoliciesLoaded] = useState<boolean>(false);
  const [sitePages, setSitePages] = useState<Record<SitePageKey, SitePageContent>>(() =>
    cloneDefaultSitePages()
  );

  const refreshPolicies = useCallback(() => {
    api
      .getSitePolicies()
      .then((list) => {
        setSitePolicies(list);
        setPoliciesLoaded(true);
      })
      .catch((err) => {
        console.error('Failed to load site policies:', err);
        setPoliciesLoaded(true);
      });
  }, []);

  const refreshSitePages = useCallback(() => {
    api
      .getSitePages()
      .then((pages) => {
        setSitePages(pages);
      })
      .catch((err) => {
        console.error('Failed to load site page content:', err);
      });
  }, []);

  // Load IPO catalog, site policies & editable page content publicly without requiring login
  useEffect(() => {
    api
      .getAllIPOs()
      .then(setAllIpos)
      .catch((err) => console.error('Failed to load IPOs:', err));
    refreshPolicies();
    refreshSitePages();
  }, [currentRoute, isSignedIn, refreshPolicies, refreshSitePages]);

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

  const openLoginModal = (reason?: string, onAfterLogin?: () => void) => {
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

  const handleLoginSuccess = (_loggedInProfile: AppUserProfile) => {
    const pending = pendingAfterLoginRef.current;
    pendingAfterLoginRef.current = null;
    setLoginReason(undefined);

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
    if (
      currentRoute === '/about' ||
      currentRoute === '/disclaimer' ||
      currentRoute === '/terms' ||
      currentRoute === '/privacy' ||
      currentRoute.startsWith('/policy/')
    ) {
      const targetSlug = currentRoute.startsWith('/policy/')
        ? decodeURIComponent(currentRoute.replace('/policy/', '').replace(/\/+$/, ''))
        : currentRoute.slice(1);
      const matchedPolicy = sitePolicies.find((p) => p.slug === targetSlug);
      return (
        <PolicyDocumentPage
          policy={matchedPolicy}
          loading={!policiesLoaded}
          navigate={navigate}
        />
      );
    }

    // Protected Admin Console (Strictly milanpatadia8@gmail.com + Admins authorized by owner)
    if (currentRoute === '/admin' || currentRoute.startsWith('/admin/')) {
      if (!authReady) {
        return (
          <div className="max-w-md mx-auto my-20 p-8 bg-white border border-[#E6DFD3] rounded-xl text-center text-sm text-[#57534E]">
            Checking login session...
          </div>
        );
      }

      if (!isSignedIn) {
        return (
          <div className="max-w-md mx-auto my-20 p-8 bg-white border border-[#E6DFD3] rounded-xl text-center space-y-4">
            <h2 className="text-lg font-display font-semibold text-[#1C1917]">Admin Console</h2>
            <p className="text-sm text-[#57534E]">
              Login with an authorized administrator account to edit IPO details from the backend.
            </p>
            <button
              type="button"
              onClick={() => openLoginModal('Login with an authorized Admin account to open the Admin Console.')}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#14532D] text-white text-sm font-medium rounded-lg hover:bg-[#0F3F22] transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>
          </div>
        );
      }

      if (!isAdmin || !adminUser) {
        return (
          <div className="max-w-md mx-auto my-20 p-8 bg-white border border-[#E6DFD3] rounded-xl text-center space-y-4">
            <div className="w-10 h-10 rounded-lg bg-[#FDF6E9] border border-[#ECD7B3] text-[#B45309] flex items-center justify-center mx-auto">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-display font-semibold text-[#1C1917]">Admin Authorization Required</h2>
            <p className="text-sm text-[#57534E] leading-relaxed">
              You are logged in as{' '}
              <strong className="text-[#1C1917]">
                {formatUserContact(profile?.email, profile?.phone)}
              </strong>
              . You do not have Admin access yet—only accounts authorized by the primary Admin can edit backend IPO details.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#14532D] text-white text-sm font-medium rounded-lg hover:bg-[#0F3F22] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to IPOs</span>
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-[#DFD6C7] text-[#57534E] hover:text-[#1C1917] text-sm font-medium rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
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
          onOpenProfile={() => setProfileModalOpen(true)}
          onLogout={handleSignOut}
          navigate={navigate}
        >
          {adminTab === 'overview' && (
            <AdminOverviewPage adminUser={adminUser} setAdminTab={setAdminTab} />
          )}
          {adminTab === 'ipos' && <AdminIPOsPage adminUser={adminUser} />}
          {adminTab === 'clients' && <AdminClientsPage adminUser={adminUser} />}
          {adminTab === 'gmp' && <AdminGMPPage adminUser={adminUser} />}
          {adminTab === 'subscriptions' && <AdminSubscriptionsPage adminUser={adminUser} />}
          {adminTab === 'policies' && (
            <AdminPoliciesPage
              adminUser={adminUser}
              onPoliciesChanged={refreshPolicies}
              onPagesChanged={refreshSitePages}
            />
          )}
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
      currentRoute !== '/ipo/unlisted-price' &&
      currentRoute !== '/ipo/gmp'
    ) {
      const slug = currentRoute.replace('/ipo/', '');
      return (
        <IPODetailPage
          slug={slug}
          navigate={navigate}
          onRequireLogin={(reason, onAfterLogin) => openLoginModal(reason, onAfterLogin)}
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
          onRequireLogin={(reason, onAfterLogin) => openLoginModal(reason, onAfterLogin)}
        />
      );
    }

    if (currentRoute === '/ipo/upcoming') {
      return <UpcomingIPOsPage navigate={navigate} />;
    }

    if (currentRoute === '/ipo/listed') {
      return <ListedIPOsPage navigate={navigate} />;
    }

    if (currentRoute === '/ipo/unlisted-price' || currentRoute === '/ipo/gmp') {
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
  const siteChrome = sitePages.site_chrome;
  const hasGlobalNotice = Boolean(
    (siteChrome?.notice_banner_title || '').trim() || (siteChrome?.notice_banner_body || '').trim()
  );

  return (
    <SiteContentProvider pages={sitePages}>
      <div className="min-h-screen flex flex-col bg-[#F7F4EE] text-[#1C1917] font-sans">
        {!(isAdminRoute && isAdmin) && (
          <Header
            currentRoute={currentRoute}
            navigate={navigate}
            userProfile={profile}
            isAdmin={isAdmin}
            onOpenLogin={() => openLoginModal()}
            onOpenProfile={() => setProfileModalOpen(true)}
            onSignOut={handleSignOut}
            onOpenAllotment={() => openAllotment(undefined)}
          />
        )}

        {!(isAdminRoute && isAdmin) && hasGlobalNotice && (
          <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <PageNoticeBanner
              title={siteChrome.notice_banner_title}
              body={siteChrome.notice_banner_body}
              compact
            />
          </div>
        )}

        <main className="flex-1">{renderRoute()}</main>

        {!(isAdminRoute && isAdmin) && (
          <Footer
            navigate={navigate}
            userProfile={profile}
            isAdmin={isAdmin}
            onOpenLogin={() => openLoginModal()}
            policies={sitePolicies}
          />
        )}

        <LoginModal
          isOpen={loginModalOpen}
          onClose={handleCloseLoginModal}
          onSuccess={handleLoginSuccess}
          reason={loginReason}
        />

        <ProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
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
    </SiteContentProvider>
  );
}

export default App;
