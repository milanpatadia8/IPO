import React, { useState, useEffect, useMemo } from 'react';
import {
  AdminUser,
  SitePolicy,
  SitePolicyCategory,
  SitePolicySection,
  SitePageContent,
  SitePageKey,
} from '../../types/ipo';
import { api } from '../../lib/api';
import { getPolicyRoutePath } from '../../lib/defaultPolicies';
import {
  DEFAULT_SITE_PAGES,
  SITE_PAGE_KEYS,
  SITE_PAGE_SCHEMAS,
  cloneDefaultSitePages,
} from '../../lib/defaultPageContent';
import { formatIndianDate } from '../../lib/calculations';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  FileText,
  Search,
  RotateCcw,
  Globe,
  Sparkles,
} from 'lucide-react';

interface AdminPoliciesPageProps {
  adminUser: AdminUser;
  onPoliciesChanged?: () => void;
  onPagesChanged?: () => void;
}

const CATEGORY_OPTIONS: Array<{ value: SitePolicyCategory; label: string }> = [
  { value: 'disclaimer', label: 'Disclaimer' },
  { value: 'terms', label: 'Terms of Use' },
  { value: 'privacy', label: 'Privacy Policy' },
  { value: 'policy', label: 'Policy' },
  { value: 'disclosure', label: 'Disclosure / Methodology' },
];

const CATEGORY_LABELS: Record<SitePolicyCategory, string> = {
  disclaimer: 'Disclaimer',
  terms: 'Terms',
  privacy: 'Privacy',
  policy: 'Policy',
  disclosure: 'Disclosure',
};

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}

export const AdminPoliciesPage: React.FC<AdminPoliciesPageProps> = ({
  adminUser,
  onPoliciesChanged,
  onPagesChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'policies' | 'pages'>('policies');

  // Shared toast notice
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // =========================================================================
  // TAB 1: TERMS, POLICIES & DISCLAIMERS STATE
  // =========================================================================
  const [policies, setPolicies] = useState<SitePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Policy filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | SitePolicyCategory>('all');
  const [placementFilter, setPlacementFilter] = useState<
    'all' | 'footer_link' | 'footer_banner' | 'hidden'
  >('all');

  // Policy modal editor state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<SitePolicy | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<SitePolicyCategory>('policy');
  const [sortOrder, setSortOrder] = useState('10');
  const [showInFooterLinks, setShowInFooterLinks] = useState(true);
  const [showInFooterBanner, setShowInFooterBanner] = useState(false);
  const [footerSummary, setFooterSummary] = useState('');
  const [sections, setSections] = useState<SitePolicySection[]>([{ heading: '', body: '' }]);

  // =========================================================================
  // TAB 2: WEBSITE PAGES & CONTENT STATE
  // =========================================================================
  const [sitePages, setSitePages] = useState<Record<SitePageKey, SitePageContent>>(() =>
    cloneDefaultSitePages()
  );
  const [pagesLoading, setPagesLoading] = useState(true);
  const [pageSearch, setPageSearch] = useState('');
  const [pageStatusFilter, setPageStatusFilter] = useState<'all' | 'customized' | 'default'>('all');
  const [confirmResetKey, setConfirmResetKey] = useState<SitePageKey | null>(null);
  const [resettingKey, setResettingKey] = useState<SitePageKey | null>(null);

  // Page editor modal state
  const [pageModalOpen, setPageModalOpen] = useState(false);
  const [editingPageKey, setEditingPageKey] = useState<SitePageKey | null>(null);
  const [pageSaving, setPageSaving] = useState(false);
  const [pageFormError, setPageFormError] = useState('');

  const [pageEyebrow, setPageEyebrow] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [pageSubtitle, setPageSubtitle] = useState('');
  const [pagePrimaryCta, setPagePrimaryCta] = useState('');
  const [pageSecondaryCta, setPageSecondaryCta] = useState('');
  const [pageNoticeTitle, setPageNoticeTitle] = useState('');
  const [pageNoticeBody, setPageNoticeBody] = useState('');
  const [pageCustomFields, setPageCustomFields] = useState<Record<string, string>>({});
  const [pageExtraSections, setPageExtraSections] = useState<SitePolicySection[]>([]);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => {
      setNotice((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const list = await api.getSitePolicies();
      setPolicies(list);
    } catch (err) {
      showNotice(
        'error',
        err instanceof Error ? err.message : 'Failed to load terms and policies.'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadSitePages = async () => {
    setPagesLoading(true);
    try {
      const map = await api.getSitePages();
      setSitePages(map);
    } catch (err) {
      showNotice(
        'error',
        err instanceof Error ? err.message : 'Failed to load website page content.'
      );
    } finally {
      setPagesLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
    loadSitePages();
  }, []);

  // =========================================================================
  // POLICY EDITOR HANDLERS
  // =========================================================================
  const openCreateModal = () => {
    const nextOrder =
      policies.length > 0 ? Math.max(...policies.map((p) => p.sort_order || 0)) + 1 : 1;
    setEditingPolicy(null);
    setTitle('');
    setSlug('');
    setSlugTouched(false);
    setSubtitle('');
    setCategory('policy');
    setSortOrder(String(nextOrder));
    setShowInFooterLinks(true);
    setShowInFooterBanner(false);
    setFooterSummary('');
    setSections([{ heading: '1. Overview', body: '' }]);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (policy: SitePolicy) => {
    setEditingPolicy(policy);
    setTitle(policy.title);
    setSlug(policy.slug);
    setSlugTouched(true);
    setSubtitle(policy.subtitle || '');
    setCategory(policy.category);
    setSortOrder(String(policy.sort_order ?? 1));
    setShowInFooterLinks(Boolean(policy.show_in_footer_links));
    setShowInFooterBanner(Boolean(policy.show_in_footer_banner));
    setFooterSummary(policy.footer_summary || '');
    setSections(
      policy.sections.length > 0
        ? policy.sections.map((s) => ({ heading: s.heading, body: s.body }))
        : [{ heading: '', body: '' }]
    );
    setFormError('');
    setModalOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingPolicy && !slugTouched) {
      setSlug(slugifyTitle(val));
    }
  };

  const updateSection = (idx: number, field: 'heading' | 'body', value: string) => {
    setSections((prev) =>
      prev.map((sec, i) => (i === idx ? { ...sec, [field]: value } : sec))
    );
  };

  const addSection = () => {
    setSections((prev) => [...prev, { heading: '', body: '' }]);
  };

  const removeSection = (idx: number) => {
    setSections((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveSection = (idx: number, direction: -1 | 1) => {
    setSections((prev) => {
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Title is required.');
      return;
    }

    const cleanedSlug = slugifyTitle(slug.trim() || trimmedTitle);
    const duplicate = policies.find(
      (p) => p.slug === cleanedSlug && p.id !== editingPolicy?.id
    );
    if (duplicate) {
      setFormError(`URL slug "${cleanedSlug}" is already used by "${duplicate.title}".`);
      return;
    }

    const cleanedSections = sections
      .map((s) => ({ heading: s.heading.trim(), body: s.body.trim() }))
      .filter((s) => s.heading.length > 0 || s.body.length > 0);

    setSaving(true);
    try {
      const payload = {
        title: trimmedTitle,
        slug: cleanedSlug,
        subtitle: subtitle.trim() || undefined,
        category,
        footer_summary: footerSummary.trim() || undefined,
        show_in_footer_links: showInFooterLinks,
        show_in_footer_banner: showInFooterBanner,
        sort_order: parseInt(sortOrder, 10) || 0,
        sections: cleanedSections,
      };

      if (editingPolicy) {
        await api.adminUpdatePolicy(editingPolicy.id, payload, adminUser);
        showNotice('success', `Updated "${trimmedTitle}".`);
      } else {
        await api.adminCreatePolicy(payload, adminUser);
        showNotice('success', `Added "${trimmedTitle}".`);
      }

      setModalOpen(false);
      await loadPolicies();
      onPoliciesChanged?.();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save policy document.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (policy: SitePolicy) => {
    setDeletingId(policy.id);
    try {
      await api.adminDeletePolicy(policy.id, adminUser);
      setConfirmDeleteId(null);
      showNotice('success', `Removed "${policy.title}".`);
      await loadPolicies();
      onPoliciesChanged?.();
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Unable to remove document.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredPolicies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return policies.filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (placementFilter === 'footer_link' && !p.show_in_footer_links) return false;
      if (placementFilter === 'footer_banner' && !p.show_in_footer_banner) return false;
      if (placementFilter === 'hidden' && (p.show_in_footer_links || p.show_in_footer_banner))
        return false;
      if (q) {
        const hay = [
          p.title,
          p.slug,
          p.subtitle,
          p.footer_summary,
          ...p.sections.map((s) => `${s.heading} ${s.body}`),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [policies, categoryFilter, placementFilter, search]);

  const hasFilters =
    search.trim() !== '' || categoryFilter !== 'all' || placementFilter !== 'all';

  // =========================================================================
  // WEBSITE PAGE EDITOR HANDLERS
  // =========================================================================
  const openPageEditor = (pageKey: SitePageKey) => {
    const content = sitePages[pageKey] || DEFAULT_SITE_PAGES[pageKey];
    setEditingPageKey(pageKey);
    setPageEyebrow(content.eyebrow || '');
    setPageTitle(content.title || '');
    setPageSubtitle(content.subtitle || '');
    setPagePrimaryCta(content.primary_cta_label || '');
    setPageSecondaryCta(content.secondary_cta_label || '');
    setPageNoticeTitle(content.notice_banner_title || '');
    setPageNoticeBody(content.notice_banner_body || '');
    setPageCustomFields({ ...content.custom_fields });
    setPageExtraSections(
      content.extra_sections.map((s) => ({ heading: s.heading, body: s.body }))
    );
    setPageFormError('');
    setPageModalOpen(true);
  };

  const loadDefaultsIntoPageForm = () => {
    if (!editingPageKey) return;
    const def = DEFAULT_SITE_PAGES[editingPageKey];
    setPageEyebrow(def.eyebrow || '');
    setPageTitle(def.title || '');
    setPageSubtitle(def.subtitle || '');
    setPagePrimaryCta(def.primary_cta_label || '');
    setPageSecondaryCta(def.secondary_cta_label || '');
    setPageNoticeTitle(def.notice_banner_title || '');
    setPageNoticeBody(def.notice_banner_body || '');
    setPageCustomFields({ ...def.custom_fields });
    setPageExtraSections(def.extra_sections.map((s) => ({ heading: s.heading, body: s.body })));
  };

  const updatePageExtraSection = (idx: number, field: 'heading' | 'body', value: string) => {
    setPageExtraSections((prev) =>
      prev.map((sec, i) => (i === idx ? { ...sec, [field]: value } : sec))
    );
  };

  const addPageExtraSection = () => {
    setPageExtraSections((prev) => [...prev, { heading: '', body: '' }]);
  };

  const removePageExtraSection = (idx: number) => {
    setPageExtraSections((prev) => prev.filter((_, i) => i !== idx));
  };

  const movePageExtraSection = (idx: number, direction: -1 | 1) => {
    setPageExtraSections((prev) => {
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPageKey) return;
    setPageFormError('');

    const cleanTitle = pageTitle.trim();
    if (!cleanTitle) {
      setPageFormError('Main Title / Headline is required.');
      return;
    }

    const schema = SITE_PAGE_SCHEMAS[editingPageKey];
    const cleanedSections = pageExtraSections
      .map((s) => ({ heading: s.heading.trim(), body: s.body.trim() }))
      .filter((s) => s.heading.length > 0 || s.body.length > 0);

    setPageSaving(true);
    try {
      await api.adminSaveSitePage(
        editingPageKey,
        {
          eyebrow: schema.showEyebrow ? pageEyebrow.trim() : undefined,
          title: cleanTitle,
          subtitle: schema.showSubtitle ? pageSubtitle.trim() : undefined,
          primary_cta_label: schema.primaryCtaLabel ? pagePrimaryCta.trim() : undefined,
          secondary_cta_label: schema.secondaryCtaLabel ? pageSecondaryCta.trim() : undefined,
          notice_banner_title: pageNoticeTitle.trim(),
          notice_banner_body: pageNoticeBody.trim(),
          custom_fields: pageCustomFields,
          extra_sections: cleanedSections,
        },
        adminUser
      );

      showNotice('success', `Saved changes to "${schema.page_label}". Live on website.`);
      setPageModalOpen(false);
      await loadSitePages();
      onPagesChanged?.();
    } catch (err) {
      setPageFormError(err instanceof Error ? err.message : 'Unable to save page content.');
    } finally {
      setPageSaving(false);
    }
  };

  const handleResetPage = async (pageKey: SitePageKey) => {
    setResettingKey(pageKey);
    try {
      await api.adminResetSitePage(pageKey, adminUser);
      setConfirmResetKey(null);
      showNotice(
        'success',
        `Restored "${SITE_PAGE_SCHEMAS[pageKey].page_label}" to default copy.`
      );
      await loadSitePages();
      onPagesChanged?.();
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Unable to reset page content.');
    } finally {
      setResettingKey(null);
    }
  };

  const pageList = useMemo(() => {
    return SITE_PAGE_KEYS.map((key) => ({
      key,
      schema: SITE_PAGE_SCHEMAS[key],
      content: sitePages[key] || DEFAULT_SITE_PAGES[key],
    }));
  }, [sitePages]);

  const filteredPages = useMemo(() => {
    const q = pageSearch.trim().toLowerCase();
    return pageList.filter(({ schema, content }) => {
      if (pageStatusFilter === 'customized' && !content.is_customized) return false;
      if (pageStatusFilter === 'default' && content.is_customized) return false;
      if (q) {
        const hay = [
          schema.page_label,
          schema.route_path,
          schema.description,
          content.eyebrow,
          content.title,
          content.subtitle,
          content.notice_banner_title,
          content.notice_banner_body,
          ...Object.values(content.custom_fields || {}),
          ...content.extra_sections.map((s) => `${s.heading} ${s.body}`),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [pageList, pageSearch, pageStatusFilter]);

  const customizedPagesCount = useMemo(
    () => pageList.filter((p) => p.content.is_customized).length,
    [pageList]
  );

  const hasPageFilters = pageSearch.trim() !== '' || pageStatusFilter !== 'all';
  const activePageSchema = editingPageKey ? SITE_PAGE_SCHEMAS[editingPageKey] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#111827]">
            Terms, Policies &amp; Website Page Content
          </h1>
          <p className="text-sm text-[#4B5563]">
            Edit Terms, Privacy Policy, SEBI Disclaimers, or customize headings, labels, notices, and sections on any page of the website.
          </p>
        </div>

        {activeTab === 'policies' && (
          <button
            type="button"
            onClick={openCreateModal}
            className="h-9.5 px-4 bg-[#111827] hover:bg-[#1F2937] text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Policy / Disclaimer</span>
          </button>
        )}
      </div>

      {/* Section Sub-Tab Switcher */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#EFE9DD] border border-[#E6DFD3] rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2 ${
            activeTab === 'policies'
              ? 'bg-[#14532D] text-white shadow-2xs'
              : 'text-[#57534E] hover:text-[#1C1917]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Terms, Policies &amp; Disclaimers ({policies.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pages')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-2 ${
            activeTab === 'pages'
              ? 'bg-[#14532D] text-white shadow-2xs'
              : 'text-[#57534E] hover:text-[#1C1917]'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Website Pages &amp; Content ({SITE_PAGE_KEYS.length})</span>
          {customizedPagesCount > 0 && (
            <span
              className={`px-1.5 py-0.5 text-[10px] rounded ${
                activeTab === 'pages'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#EEF6F0] text-[#14532D]'
              }`}
            >
              {customizedPagesCount} edited
            </span>
          )}
        </button>
      </div>

      {notice && (
        <div
          className={`p-3.5 rounded-lg text-sm flex items-center gap-2 border ${
            notice.type === 'success'
              ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#14532D]'
              : 'bg-red-50 border-red-200 text-[#DC2626]'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 1: TERMS, POLICIES & DISCLAIMERS                              */}
      {/* ================================================================= */}
      {activeTab === 'policies' && (
        <>
          {/* Filter Bar */}
          <div className="bg-white border border-[#EAEAEA] rounded-xl p-3.5 space-y-2.5">
            <div className="flex flex-col md:flex-row md:items-center gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by title, slug, subtitle, or clause text..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9.5 pl-9 pr-3 text-sm bg-[#FAFAFA] border border-[#E5E7EB] focus:bg-white focus:border-[#111827] rounded-lg outline-none text-[#111827]"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as 'all' | SitePolicyCategory)}
                className="h-9.5 px-3 text-xs bg-[#FAFAFA] border border-[#E5E7EB] focus:bg-white focus:border-[#111827] rounded-lg outline-none text-[#111827]"
              >
                <option value="all">All Categories</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                value={placementFilter}
                onChange={(e) =>
                  setPlacementFilter(
                    e.target.value as 'all' | 'footer_link' | 'footer_banner' | 'hidden'
                  )
                }
                className="h-9.5 px-3 text-xs bg-[#FAFAFA] border border-[#E5E7EB] focus:bg-white focus:border-[#111827] rounded-lg outline-none text-[#111827]"
              >
                <option value="all">All Placements</option>
                <option value="footer_link">Footer Link</option>
                <option value="footer_banner">Footer Disclaimer Box</option>
                <option value="hidden">Not Shown in Footer</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-xs text-[#6B7280]">
              <span>
                Showing <strong className="text-[#111827]">{filteredPolicies.length}</strong> of{' '}
                {policies.length} document(s)
              </span>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setCategoryFilter('all');
                    setPlacementFilter('all');
                  }}
                  className="inline-flex items-center gap-1 text-[#111827] font-medium hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Document List */}
          <div className="bg-white border border-[#EAEAEA] rounded-xl overflow-hidden">
            {loading ? (
              <div className="py-12 text-center text-sm text-[#6B7280]">
                Loading policies and disclaimers...
              </div>
            ) : filteredPolicies.length === 0 ? (
              <div className="py-14 px-6 text-center space-y-3">
                <FileText className="w-8 h-8 text-[#9CA3AF] mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#111827]">
                    {policies.length === 0
                      ? 'No policies or disclaimers published'
                      : 'No policies match your current filters'}
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    {policies.length === 0
                      ? 'Click "Add Policy / Disclaimer" above to publish a disclaimer, terms page, or privacy policy.'
                      : 'Try resetting your search or category filter above.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#F3F4F6]">
                {filteredPolicies.map((policy) => {
                  const routePath = getPolicyRoutePath(policy.slug);
                  const placements = [
                    policy.show_in_footer_links ? 'Footer Link' : null,
                    policy.show_in_footer_banner ? 'Footer Disclaimer Box' : null,
                  ].filter(Boolean);

                  return (
                    <div
                      key={policy.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-[#111827]">
                            {policy.title}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
                          <span>{CATEGORY_LABELS[policy.category]}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-[#4B5563]">{routePath}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            {policy.sections.length} section{policy.sections.length === 1 ? '' : 's'}
                          </span>
                          {placements.length > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#16A34A] font-medium">
                                {placements.join(' + ')}
                              </span>
                            </>
                          )}
                          {policy.updated_at && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Updated {formatIndianDate(policy.updated_at.slice(0, 10))}</span>
                            </>
                          )}
                        </div>
                        {policy.subtitle && (
                          <p className="text-xs text-[#4B5563] truncate max-w-2xl">
                            {policy.subtitle}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {confirmDeleteId === policy.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={deletingId === policy.id}
                              onClick={() => handleDelete(policy)}
                              className="px-2.5 py-1.5 text-xs font-medium bg-[#DC2626] hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                              {deletingId === policy.id ? 'Removing...' : 'Confirm Remove'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2.5 py-1.5 text-xs font-medium bg-white border border-[#E5E7EB] text-[#4B5563] rounded-lg hover:bg-[#FAFAFA]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(policy)}
                              className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E5E7EB] hover:border-[#111827] text-[#111827] rounded-lg transition-colors inline-flex items-center gap-1.5"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(policy.id)}
                              className="px-2.5 py-1.5 text-xs font-medium bg-white border border-[#E5E7EB] hover:border-red-300 hover:bg-red-50 text-[#DC2626] rounded-lg transition-colors inline-flex items-center gap-1"
                              title="Remove policy or disclaimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ================================================================= */}
      {/* TAB 2: WEBSITE PAGES & CONTENT EDITOR                             */}
      {/* ================================================================= */}
      {activeTab === 'pages' && (
        <>
          {/* Filter Bar */}
          <div className="bg-white border border-[#EAEAEA] rounded-xl p-3.5 space-y-2.5">
            <div className="flex flex-col md:flex-row md:items-center gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search pages by name, route, headline, label, or custom text..."
                  value={pageSearch}
                  onChange={(e) => setPageSearch(e.target.value)}
                  className="w-full h-9.5 pl-9 pr-3 text-sm bg-[#FAFAFA] border border-[#E5E7EB] focus:bg-white focus:border-[#111827] rounded-lg outline-none text-[#111827]"
                />
              </div>

              <select
                value={pageStatusFilter}
                onChange={(e) =>
                  setPageStatusFilter(e.target.value as 'all' | 'customized' | 'default')
                }
                className="h-9.5 px-3 text-xs bg-[#FAFAFA] border border-[#E5E7EB] focus:bg-white focus:border-[#111827] rounded-lg outline-none text-[#111827]"
              >
                <option value="all">All Pages ({SITE_PAGE_KEYS.length})</option>
                <option value="customized">Customized ({customizedPagesCount})</option>
                <option value="default">
                  Using Default ({SITE_PAGE_KEYS.length - customizedPagesCount})
                </option>
              </select>
            </div>

            <div className="flex items-center justify-between text-xs text-[#6B7280]">
              <span>
                Showing <strong className="text-[#111827]">{filteredPages.length}</strong> of{' '}
                {SITE_PAGE_KEYS.length} editable website page(s)
              </span>
              {hasPageFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setPageSearch('');
                    setPageStatusFilter('all');
                  }}
                  className="inline-flex items-center gap-1 text-[#111827] font-medium hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Website Pages List */}
          <div className="bg-white border border-[#EAEAEA] rounded-xl overflow-hidden">
            {pagesLoading ? (
              <div className="py-12 text-center text-sm text-[#6B7280]">
                Loading editable website pages...
              </div>
            ) : filteredPages.length === 0 ? (
              <div className="py-14 px-6 text-center space-y-2">
                <Globe className="w-8 h-8 text-[#9CA3AF] mx-auto" />
                <p className="text-sm font-semibold text-[#111827]">
                  No website pages match your current filter
                </p>
                <p className="text-xs text-[#6B7280]">
                  Try clearing your search or status filter above.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F3F4F6]">
                {filteredPages.map(({ key, schema, content }) => {
                  const hasBanner = Boolean(
                    (content.notice_banner_title || '').trim() ||
                      (content.notice_banner_body || '').trim()
                  );
                  return (
                    <div
                      key={key}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FAFAFA] transition-colors"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-[#111827]">
                            {schema.page_label}
                          </span>
                          <span className="font-mono text-xs text-[#57534E] bg-[#FAF6EE] border border-[#E6DFD3] px-2 py-0.5 rounded">
                            {schema.route_path}
                          </span>
                          {content.is_customized ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#14532D] bg-[#EEF6F0] border border-[#C6E2CE] px-2 py-0.5 rounded">
                              <Sparkles className="w-3 h-3" />
                              <span>Customized</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-[#78716C] bg-[#F5F2EB] px-2 py-0.5 rounded">
                              Default
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[#1C1917] font-medium truncate max-w-2xl">
                          {content.title}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
                          <span>{schema.customFields.length} configurable labels</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {content.extra_sections.length} custom section
                            {content.extra_sections.length === 1 ? '' : 's'}
                          </span>
                          {hasBanner && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#9A5B13] font-medium">Banner Active</span>
                            </>
                          )}
                          {content.is_customized && content.updated_at && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>
                                Saved {formatIndianDate(content.updated_at.slice(0, 10))}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {confirmResetKey === key ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={resettingKey === key}
                              onClick={() => handleResetPage(key)}
                              className="px-2.5 py-1.5 text-xs font-medium bg-[#B45309] hover:bg-[#92400E] text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                              {resettingKey === key ? 'Resetting...' : 'Confirm Reset'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmResetKey(null)}
                              className="px-2.5 py-1.5 text-xs font-medium bg-white border border-[#E5E7EB] text-[#4B5563] rounded-lg hover:bg-[#FAFAFA]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => openPageEditor(key)}
                              className="px-3.5 py-1.5 text-xs font-semibold bg-[#14532D] hover:bg-[#0F3F22] text-white rounded-lg transition-colors inline-flex items-center gap-1.5"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit Page Details</span>
                            </button>
                            {content.is_customized && (
                              <button
                                type="button"
                                onClick={() => setConfirmResetKey(key)}
                                className="px-2.5 py-1.5 text-xs font-medium bg-white border border-[#E5E7EB] hover:border-[#B45309] text-[#9A5B13] rounded-lg transition-colors inline-flex items-center gap-1"
                                title="Restore this page back to default text"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reset</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ================================================================= */}
      {/* MODAL 1: ADD / EDIT POLICY OR DISCLAIMER                          */}
      {/* ================================================================= */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl border border-[#EAEAEA] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
              <h3 className="text-lg font-semibold text-[#111827]">
                {editingPolicy ? `Edit: ${editingPolicy.title}` : 'Add New Policy or Disclaimer'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-[#6B7280] hover:text-[#111827] rounded-lg"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-[#DC2626] text-xs rounded-lg">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5 text-xs">
              {/* Metadata fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-[#111827] mb-1">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Refund Policy or SEBI Disclaimer"
                    className="w-full h-9.5 px-3 bg-white border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#111827] mb-1">
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(slugifyTitle(e.target.value));
                    }}
                    placeholder="e.g. refund-policy"
                    className="w-full h-9.5 px-3 font-mono bg-white border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-sm"
                  />
                  <span className="text-[11px] text-[#6B7280] mt-1 block">
                    Public URL: {getPolicyRoutePath(slug || 'policy')}
                  </span>
                </div>

                <div>
                  <label className="block font-medium text-[#111827] mb-1">
                    Subtitle / Effective Date
                  </label>
                  <input
                    type="text"
                    maxLength={300}
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. Effective Date: November 2026"
                    className="w-full h-9.5 px-3 bg-white border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[#111827] mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as SitePolicyCategory)}
                      className="w-full h-9.5 px-2.5 bg-white border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-sm"
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-[#111827] mb-1">
                      Footer Order
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="w-full h-9.5 px-3 bg-white border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-sm tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Footer Placement Controls */}
              <div className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl space-y-3">
                <div className="text-xs font-semibold text-[#111827]">
                  Footer Visibility &amp; Disclaimer Box
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <label className="flex items-center gap-2 text-xs text-[#111827] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showInFooterLinks}
                      onChange={(e) => setShowInFooterLinks(e.target.checked)}
                      className="rounded accent-[#111827]"
                    />
                    <span>Show link in Footer Disclosures list</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-[#111827] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showInFooterBanner}
                      onChange={(e) => setShowInFooterBanner(e.target.checked)}
                      className="rounded accent-[#111827]"
                    />
                    <span>Show summary inside Footer Disclaimer box</span>
                  </label>
                </div>

                {showInFooterBanner && (
                  <div className="space-y-1 pt-1">
                    <label className="block font-medium text-[#111827]">
                      Footer Disclaimer Text
                    </label>
                    <textarea
                      rows={5}
                      maxLength={2500}
                      value={footerSummary}
                      onChange={(e) => setFooterSummary(e.target.value)}
                      placeholder="Enter the disclaimer paragraphs to display in the website footer. Separate paragraphs with a blank line."
                      className="w-full p-3 bg-white border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-sm leading-relaxed"
                    />
                    <span className="text-[11px] text-[#6B7280] block">
                      Separate paragraphs with a blank line. Shown directly inside the footer disclosure box.
                    </span>
                  </div>
                )}
              </div>

              {/* Document Sections Editor */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#111827] block">
                      Page Content Sections ({sections.length})
                    </span>
                    <span className="text-[11px] text-[#6B7280]">
                      Add, reorder, edit, or remove sections shown on the full policy page.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addSection}
                    disabled={sections.length >= 30}
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E5E7EB] hover:border-[#111827] text-[#111827] rounded-lg inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Section</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {sections.map((sec, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-[#4B5563]">
                          Section {idx + 1}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveSection(idx, -1)}
                            disabled={idx === 0}
                            className="p-1 text-[#4B5563] hover:text-[#111827] disabled:opacity-30"
                            title="Move up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSection(idx, 1)}
                            disabled={idx === sections.length - 1}
                            className="p-1 text-[#4B5563] hover:text-[#111827] disabled:opacity-30"
                            title="Move down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSection(idx)}
                            className="p-1 text-[#DC2626] hover:bg-red-50 rounded"
                            title="Remove section"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        maxLength={200}
                        value={sec.heading}
                        onChange={(e) => updateSection(idx, 'heading', e.target.value)}
                        placeholder="Section heading (e.g. 1. Acceptance of Terms)"
                        className="w-full h-9 px-3 bg-white border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-sm font-medium"
                      />

                      <textarea
                        rows={4}
                        maxLength={8000}
                        value={sec.body}
                        onChange={(e) => updateSection(idx, 'body', e.target.value)}
                        placeholder="Write the clause or disclosure text here. Separate paragraphs with a blank line."
                        className="w-full p-2.5 bg-white border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-sm leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EAEAEA]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium bg-white border border-[#E5E7EB] text-[#4B5563] hover:text-[#111827] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold bg-[#111827] hover:bg-[#1F2937] text-white rounded-lg disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : editingPolicy
                    ? 'Save Changes'
                    : 'Publish Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 2: EDIT ANY WEBSITE PAGE DETAILS                            */}
      {/* ================================================================= */}
      {pageModalOpen && activePageSchema && editingPageKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          onClick={() => setPageModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl border border-[#EAEAEA] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#EAEAEA] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-[#111827]">
                    Edit: {activePageSchema.page_label}
                  </h3>
                  <span className="font-mono text-xs text-[#57534E] bg-[#FAF6EE] border border-[#E6DFD3] px-2 py-0.5 rounded">
                    {activePageSchema.route_path}
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mt-1">{activePageSchema.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setPageModalOpen(false)}
                className="p-1 text-[#6B7280] hover:text-[#111827] rounded-lg shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pageFormError && (
              <div className="p-3 bg-red-50 border border-red-200 text-[#DC2626] text-xs rounded-lg">
                {pageFormError}
              </div>
            )}

            <form onSubmit={handleSavePage} className="space-y-5 text-xs">
              {/* Primary Page Header & CTA Fields */}
              <div className="p-4 bg-[#FAF8F4] border border-[#E6DFD3] rounded-xl space-y-4">
                <div className="text-xs font-semibold text-[#1C1917]">
                  Main Header &amp; Primary Copy
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activePageSchema.showEyebrow && (
                    <div className="sm:col-span-2">
                      <label className="block font-medium text-[#111827] mb-1">
                        {activePageSchema.eyebrowLabel || 'Eyebrow / Section Kicker'}
                      </label>
                      <input
                        type="text"
                        maxLength={240}
                        value={pageEyebrow}
                        onChange={(e) => setPageEyebrow(e.target.value)}
                        className="w-full h-9.5 px-3 bg-white border border-[#E5E7EB] focus:border-[#14532D] rounded-lg outline-none text-sm"
                      />
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <label className="block font-medium text-[#111827] mb-1">
                      {activePageSchema.titleLabel} *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={280}
                      value={pageTitle}
                      onChange={(e) => setPageTitle(e.target.value)}
                      className="w-full h-9.5 px-3 bg-white border border-[#E5E7EB] focus:border-[#14532D] rounded-lg outline-none text-sm font-medium"
                    />
                  </div>

                  {activePageSchema.showSubtitle && (
                    <div className="sm:col-span-2">
                      <label className="block font-medium text-[#111827] mb-1">
                        {activePageSchema.subtitleLabel || 'Subtitle / Description'}
                      </label>
                      <textarea
                        rows={3}
                        maxLength={1900}
                        value={pageSubtitle}
                        onChange={(e) => setPageSubtitle(e.target.value)}
                        className="w-full p-2.5 bg-white border border-[#E5E7EB] focus:border-[#14532D] rounded-lg outline-none text-sm leading-relaxed"
                      />
                    </div>
                  )}

                  {activePageSchema.primaryCtaLabel && (
                    <div>
                      <label className="block font-medium text-[#111827] mb-1">
                        {activePageSchema.primaryCtaLabel}
                      </label>
                      <input
                        type="text"
                        maxLength={110}
                        value={pagePrimaryCta}
                        onChange={(e) => setPagePrimaryCta(e.target.value)}
                        className="w-full h-9.5 px-3 bg-white border border-[#E5E7EB] focus:border-[#14532D] rounded-lg outline-none text-sm"
                      />
                    </div>
                  )}

                  {activePageSchema.secondaryCtaLabel && (
                    <div>
                      <label className="block font-medium text-[#111827] mb-1">
                        {activePageSchema.secondaryCtaLabel}
                      </label>
                      <input
                        type="text"
                        maxLength={110}
                        value={pageSecondaryCta}
                        onChange={(e) => setPageSecondaryCta(e.target.value)}
                        className="w-full h-9.5 px-3 bg-white border border-[#E5E7EB] focus:border-[#14532D] rounded-lg outline-none text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Page-Specific Custom Labels */}
              {activePageSchema.customFields.length > 0 && (
                <div className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl space-y-3.5">
                  <div className="text-xs font-semibold text-[#111827]">
                    Page-Specific Labels &amp; Details
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {activePageSchema.customFields.map((field) => (
                      <div key={field.key} className={field.multiline ? 'sm:col-span-2' : ''}>
                        <label className="block font-medium text-[#111827] mb-1">
                          {field.label}
                        </label>
                        {field.multiline ? (
                          <textarea
                            rows={3}
                            maxLength={1000}
                            value={pageCustomFields[field.key] ?? ''}
                            onChange={(e) =>
                              setPageCustomFields((prev) => ({
                                ...prev,
                                [field.key]: e.target.value,
                              }))
                            }
                            placeholder={field.placeholder}
                            className="w-full p-2.5 bg-white border border-[#E5E7EB] focus:border-[#14532D] rounded-lg outline-none text-sm"
                          />
                        ) : (
                          <input
                            type="text"
                            maxLength={500}
                            value={pageCustomFields[field.key] ?? ''}
                            onChange={(e) =>
                              setPageCustomFields((prev) => ({
                                ...prev,
                                [field.key]: e.target.value,
                              }))
                            }
                            placeholder={field.placeholder}
                            className="w-full h-9.5 px-3 bg-white border border-[#E5E7EB] focus:border-[#14532D] rounded-lg outline-none text-sm"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notice / Announcement Banner */}
              <div className="p-4 bg-[#FDF8EE] border border-[#EBDCC3] rounded-xl space-y-3">
                <div>
                  <div className="text-xs font-semibold text-[#1C1917]">
                    Notice / Announcement Banner
                  </div>
                  {activePageSchema.noticeBannerHelp && (
                    <p className="text-[11px] text-[#7C4A15] mt-0.5">
                      {activePageSchema.noticeBannerHelp}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-medium text-[#111827] mb-1">Banner Title</label>
                  <input
                    type="text"
                    maxLength={280}
                    value={pageNoticeTitle}
                    onChange={(e) => setPageNoticeTitle(e.target.value)}
                    placeholder="Optional notice headline (leave blank to hide banner)"
                    className="w-full h-9.5 px-3 bg-white border border-[#DFD6C7] focus:border-[#14532D] rounded-lg outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#111827] mb-1">Banner Message</label>
                  <textarea
                    rows={3}
                    maxLength={4800}
                    value={pageNoticeBody}
                    onChange={(e) => setPageNoticeBody(e.target.value)}
                    placeholder="Optional notice or compliance message shown on this page..."
                    className="w-full p-2.5 bg-white border border-[#DFD6C7] focus:border-[#14532D] rounded-lg outline-none text-sm leading-relaxed"
                  />
                </div>
              </div>

              {/* Extra Custom Content Sections */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-[#111827] block">
                      Custom Content Sections ({pageExtraSections.length})
                    </span>
                    <span className="text-[11px] text-[#6B7280]">
                      Add optional guides, FAQs, notes, or custom blocks to display on this page.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addPageExtraSection}
                    disabled={pageExtraSections.length >= 20}
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E5E7EB] hover:border-[#14532D] text-[#111827] rounded-lg inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Content Block</span>
                  </button>
                </div>

                {pageExtraSections.length > 0 && (
                  <div className="space-y-3">
                    {pageExtraSections.map((sec, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-[#4B5563]">
                            Block {idx + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => movePageExtraSection(idx, -1)}
                              disabled={idx === 0}
                              className="p-1 text-[#4B5563] hover:text-[#111827] disabled:opacity-30"
                              title="Move up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => movePageExtraSection(idx, 1)}
                              disabled={idx === pageExtraSections.length - 1}
                              className="p-1 text-[#4B5563] hover:text-[#111827] disabled:opacity-30"
                              title="Move down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removePageExtraSection(idx)}
                              className="p-1 text-[#DC2626] hover:bg-red-50 rounded"
                              title="Remove block"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <input
                          type="text"
                          maxLength={250}
                          value={sec.heading}
                          onChange={(e) =>
                            updatePageExtraSection(idx, 'heading', e.target.value)
                          }
                          placeholder="Block heading (e.g. Important Note for Retail Applicants)"
                          className="w-full h-9 px-3 bg-white border border-[#E5E7EB] focus:border-[#14532D] rounded-lg outline-none text-sm font-medium"
                        />

                        <textarea
                          rows={3}
                          maxLength={8000}
                          value={sec.body}
                          onChange={(e) => updatePageExtraSection(idx, 'body', e.target.value)}
                          placeholder="Write content here. Separate paragraphs with a blank line."
                          className="w-full p-2.5 bg-white border border-[#E5E7EB] focus:border-[#14532D] rounded-lg outline-none text-sm leading-relaxed"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#EAEAEA]">
                <button
                  type="button"
                  onClick={loadDefaultsIntoPageForm}
                  className="px-3 py-2 text-xs font-medium text-[#9A5B13] hover:bg-[#FDF8EE] border border-[#EBDCC3] rounded-lg inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Load Default Copy</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPageModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium bg-white border border-[#E5E7EB] text-[#4B5563] hover:text-[#111827] rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pageSaving}
                    className="px-4 py-2 text-xs font-semibold bg-[#14532D] hover:bg-[#0F3F22] text-white rounded-lg disabled:opacity-50"
                  >
                    {pageSaving ? 'Saving...' : 'Save Page Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
