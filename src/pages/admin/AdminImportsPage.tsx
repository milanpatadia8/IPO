import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminUser, FeedRun, IPO } from '../../types/ipo';
import {
  api,
  IpoAlertsCandidate,
  IpoAlertsFetchResponse,
  IpoAlertsQuotaStatus,
  IpoAlertsSaveReport,
} from '../../lib/api';
import {
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Play,
  RefreshCw,
  CloudDownload,
  Save,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Search,
  RotateCcw,
} from 'lucide-react';

interface AdminImportsPageProps {
  adminUser: AdminUser;
}

const CSV_HEADER_TEMPLATE = `company,category,exchange,price,lot_size,issue_size,status\n`;

export const AdminImportsPage: React.FC<AdminImportsPageProps> = ({ adminUser }) => {
  // --- ipoalerts.in Sync State ---
  const [quota, setQuota] = useState<IpoAlertsQuotaStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [syncMode, setSyncMode] = useState<'open_list' | 'single_slug'>('open_list');
  const [statusFilter, setStatusFilter] = useState<
    'open' | 'upcoming' | 'announced' | 'open_and_upcoming' | 'closed' | 'listed'
  >('upcoming');
  const [sourceFilter, setSourceFilter] = useState<'auto' | 'public_feed' | 'ipoalerts'>('auto');
  const [typeFilter, setTypeFilter] = useState<'EQ,SME' | 'EQ' | 'SME' | ''>('EQ,SME');
  const [exchangeFilter, setExchangeFilter] = useState<'all' | 'nse_bse' | 'nse_emerge' | 'bse_sme'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageNum, setPageNum] = useState(1);
  const [limitNum, setLimitNum] = useState(30);
  const [slugInput, setSlugInput] = useState('');
  const [fetchingApi, setFetchingApi] = useState(false);
  const [savingApi, setSavingApi] = useState(false);
  const [apiError, setApiError] = useState('');
  const [fetchResponse, setFetchResponse] = useState<IpoAlertsFetchResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [preserveExistingFields, setPreserveExistingFields] = useState(true);
  const [hideAlreadyImported, setHideAlreadyImported] = useState(true);
  const [recentlySavedIds, setRecentlySavedIds] = useState<Record<string, boolean>>({});
  const [saveReport, setSaveReport] = useState<IpoAlertsSaveReport | null>(null);
  const [existingIpos, setExistingIpos] = useState<IPO[]>([]);
  const [recentRuns, setRecentRuns] = useState<FeedRun[]>([]);

  // Client-side filters on fetched preview & run history
  const [resultSearch, setResultSearch] = useState('');
  const [resultCategoryFilter, setResultCategoryFilter] = useState<'all' | 'Mainboard' | 'SME'>('all');
  const [resultStageFilter, setResultStageFilter] = useState<'all' | 'dated' | 'approval_received' | 'drhp_filed'>('all');
  const [runSearch, setRunSearch] = useState('');
  const [runStatusFilter, setRunStatusFilter] = useState<'all' | 'success' | 'partial' | 'failed'>('all');

  // --- CSV Import State ---
  const [csvText, setCsvText] = useState(CSV_HEADER_TEMPLATE);
  const [isDryRun, setIsDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [result, setResult] = useState<{
    totalRows: number;
    accepted: number;
    rejected: number;
    errors: string[];
    importedIPOs: Array<{ name: string; slug: string; status: string }>;
  } | null>(null);

  const loadSyncContext = useCallback(async () => {
    setStatusLoading(true);
    try {
      const [statusData, allIpos, feedsData] = await Promise.all([
        api.adminGetIpoAlertsStatus().catch(() => null),
        api.getAllIPOs().catch(() => [] as IPO[]),
        api.adminGetFeeds().catch(() => ({ sources: [], runs: [] as FeedRun[] })),
      ]);
      if (statusData) setQuota(statusData);
      setExistingIpos(allIpos);
      setRecentRuns(feedsData.runs.slice(0, 25));
      return allIpos;
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSyncContext();
  }, [loadSyncContext]);

  const normalizeName = (name: string) =>
    name
      .toLowerCase()
      .replace(/\b(limited|ltd|ipo|pvt|private|india)\b/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const findExistingMatch = useCallback(
    (candidate: IpoAlertsCandidate, list: IPO[] = existingIpos): IPO | undefined => {
      const slugLower = candidate.slug.toLowerCase();
      const nameLower = candidate.companyName.trim().toLowerCase();
      const normCandidate = normalizeName(candidate.companyName);
      return list.find((i) => {
        if (i.slug.toLowerCase() === slugLower) return true;
        const dbName = (i.company?.name || '').trim().toLowerCase();
        if (dbName && dbName === nameLower) return true;
        if (normCandidate.length >= 4 && dbName && normalizeName(dbName) === normCandidate) return true;
        return false;
      });
    },
    [existingIpos]
  );

  const isAlreadyImported = useCallback(
    (candidate: IpoAlertsCandidate, list: IPO[] = existingIpos): boolean => {
      return Boolean(recentlySavedIds[candidate.external_id] || findExistingMatch(candidate, list));
    },
    [existingIpos, findExistingMatch, recentlySavedIds]
  );

  const handleFetchIpoAlerts = async (
    overridePage?: number,
    bypassCache = false,
    overrideStatus?: 'open' | 'upcoming' | 'announced' | 'open_and_upcoming' | 'closed' | 'listed',
    overrideExchange?: 'all' | 'nse_bse' | 'nse_emerge' | 'bse_sme'
  ) => {
    const targetPage = overridePage ?? pageNum;
    const targetStatus = overrideStatus ?? statusFilter;
    const targetExchange = overrideExchange ?? exchangeFilter;
    if (overrideStatus) {
      setSyncMode('open_list');
      setStatusFilter(overrideStatus);
    }
    if (overrideExchange) {
      setExchangeFilter(overrideExchange);
    }
    if (!overrideStatus && syncMode === 'single_slug' && !slugInput.trim()) {
      setApiError('Please enter an IPO name, slug, or symbol (e.g., Encube Ethicals, Milestone Gears, or swiggy).');
      return;
    }

    setFetchingApi(true);
    setApiError('');
    setSaveReport(null);
    try {
      const [data, latestExisting] = await Promise.all([
        api.adminFetchIpoAlerts(
          !overrideStatus && syncMode === 'single_slug'
            ? { identifier: slugInput.trim(), bypassCache, source: sourceFilter }
            : {
                status: targetStatus,
                type: typeFilter || undefined,
                exchange: targetExchange !== 'all' ? targetExchange : undefined,
                search: searchQuery.trim() || undefined,
                page: targetPage,
                limit: limitNum,
                bypassCache,
                source: sourceFilter,
              }
        ),
        api.getAllIPOs().catch(() => existingIpos),
      ]);
      setExistingIpos(latestExisting);
      setFetchResponse(data);
      setQuota(data.quota);
      if (overridePage !== undefined) {
        setPageNum(overridePage);
      }

      // Never auto-select already-imported IPOs; only auto-select brand-new equity/SME IPOs
      const nextSelected: Record<string, boolean> = {};
      data.ipos.forEach((item) => {
        const alreadySaved = isAlreadyImported(item, latestExisting);
        nextSelected[item.external_id] = !alreadySaved && item.sourceType !== 'DEBT';
      });
      setSelectedIds(nextSelected);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Could not fetch from ipoalerts.in.');
      api.adminGetIpoAlertsStatus().then(setQuota).catch(() => {});
    } finally {
      setFetchingApi(false);
    }
  };

  const hiddenImportedCount = useMemo(() => {
    if (!fetchResponse) return 0;
    return fetchResponse.ipos.filter((item) => isAlreadyImported(item)).length;
  }, [fetchResponse, isAlreadyImported]);

  const visibleCandidates = useMemo(() => {
    if (!fetchResponse) return [];
    const q = resultSearch.trim().toLowerCase();
    return fetchResponse.ipos.filter((item) => {
      if (hideAlreadyImported && isAlreadyImported(item)) return false;
      if (resultCategoryFilter !== 'all' && item.category !== resultCategoryFilter) return false;
      if (resultStageFilter !== 'all') {
        const stage = item.pipeline_stage || 'dated';
        if (stage !== resultStageFilter) return false;
      }
      if (q) {
        const haystack = [
          item.companyName,
          item.slug,
          item.exchange,
          item.industry,
          item.status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    fetchResponse,
    hideAlreadyImported,
    isAlreadyImported,
    resultCategoryFilter,
    resultStageFilter,
    resultSearch,
  ]);

  const handleSaveFetched = async () => {
    if (!fetchResponse || visibleCandidates.length === 0) return;
    const chosen = visibleCandidates.filter((i) => selectedIds[i.external_id]);
    if (chosen.length === 0) {
      setApiError('Select at least one fetched IPO to save.');
      return;
    }

    setSavingApi(true);
    setApiError('');
    try {
      const report = await api.adminSaveIpoAlertsRecords(
        chosen,
        { preserveExistingFields },
        adminUser
      );
      setSaveReport(report);
      const refreshedIpos = await loadSyncContext();

      // Determine which chosen records succeeded (not listed in report.errors)
      const errorPrefixes = new Set(
        report.errors.map((err) => err.split(':')[0]?.trim().toLowerCase()).filter(Boolean)
      );
      const savedExternalIds = new Set<string>();
      chosen.forEach((item) => {
        const failed = errorPrefixes.has(item.companyName.trim().toLowerCase());
        if (!failed || findExistingMatch(item, refreshedIpos)) {
          savedExternalIds.add(item.external_id);
        }
      });

      // Immediately unselect every saved IPO and mark it saved so it disappears and won't show again
      if (savedExternalIds.size > 0) {
        setRecentlySavedIds((prev) => {
          const next = { ...prev };
          savedExternalIds.forEach((id) => {
            next[id] = true;
          });
          return next;
        });
        setSelectedIds((prev) => {
          const next = { ...prev };
          savedExternalIds.forEach((id) => {
            next[id] = false;
          });
          return next;
        });
      }
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to save synced IPOs.');
    } finally {
      setSavingApi(false);
    }
  };

  const handleProcessImport = async () => {
    if (!csvText.trim()) return;
    setLoading(true);
    setImportError('');
    try {
      const outcome = await api.adminImportCSV(csvText, adminUser, isDryRun);
      setResult(outcome);
      if (!isDryRun) {
        await loadSyncContext();
      }
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = visibleCandidates.filter((i) => selectedIds[i.external_id]).length;

  const filteredRuns = useMemo(() => {
    const q = runSearch.trim().toLowerCase();
    return recentRuns.filter((run) => {
      if (runStatusFilter !== 'all' && run.status !== runStatusFilter) return false;
      if (q && !(run.provider_name || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [recentRuns, runSearch, runStatusFilter]);

  return (
    <div className="space-y-8">
      {/* ============================================================
          SECTION 1: IPOALERTS.IN API SYNC (FREE PLAN OPTIMIZED)
         ============================================================ */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">ipoalerts.in Automatic IPO Sync</h1>
            <p className="text-xs text-slate-500">
              Fetch live Indian IPO data via the server-side ipoalerts.in proxy and save selected offerings permanently to Firestore.
            </p>
          </div>
          {quota && (
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`px-2.5 py-1 rounded-md border font-medium ${
                  quota.configured
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {quota.configured ? 'API Key Configured' : 'API Key Not Set'}
              </span>
              <span className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 font-mono">
                {quota.dailyUsed} / {quota.dailyLimit} today
              </span>
            </div>
          )}
        </div>

        {/* Missing Key Configuration Notice */}
        {!statusLoading && quota && !quota.configured && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1.5">
            <div className="font-semibold flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Add IPOALERTS_API_KEY in AI Studio Secrets to Enable Live Sync</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              For your security, API keys are never stored in browser code or source files. Open{' '}
              <strong>Settings → Secrets</strong>, add a secret named{' '}
              <code className="px-1.5 py-0.5 bg-amber-100 rounded font-mono">IPOALERTS_API_KEY</code>{' '}
              with your ipoalerts.in key, then restart the app to start syncing.
            </p>
          </div>
        )}

        {apiError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Sync Controls Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSyncMode('open_list');
                  setApiError('');
                }}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  syncMode === 'open_list'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Open / Filtered IPOs
              </button>
              <button
                type="button"
                onClick={() => {
                  setSyncMode('single_slug');
                  setApiError('');
                }}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  syncMode === 'single_slug'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Lookup by Slug / Symbol
              </button>
            </div>
            <span className="text-[11px] text-slate-500">
              Auto Hybrid Mode: ipoalerts.in (Open) + Live Indian Feed (Upcoming, Closed, Listed, Announced)
            </span>
          </div>

          {/* Quick-Fetch Shortcuts */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500">Quick Fetch:</span>
            <button
              type="button"
              disabled={fetchingApi}
              onClick={() => handleFetchIpoAlerts(1, false, 'upcoming', 'all')}
              className="px-2.5 py-1 bg-[#14532D] hover:bg-[#0F3F22] text-white rounded text-[11px] font-medium transition-colors disabled:opacity-50"
            >
              All Upcoming (Mainboard + SME)
            </button>
            <button
              type="button"
              disabled={fetchingApi}
              onClick={() => handleFetchIpoAlerts(1, false, 'upcoming', 'nse_bse')}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded text-[11px] font-medium transition-colors disabled:opacity-50"
            >
              Upcoming Mainboard (NSE/BSE)
            </button>
            <button
              type="button"
              disabled={fetchingApi}
              onClick={() => handleFetchIpoAlerts(1, false, 'upcoming', 'nse_emerge')}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded text-[11px] font-medium transition-colors disabled:opacity-50"
            >
              Upcoming NSE Emerge (SME)
            </button>
            <button
              type="button"
              disabled={fetchingApi}
              onClick={() => handleFetchIpoAlerts(1, false, 'upcoming', 'bse_sme')}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded text-[11px] font-medium transition-colors disabled:opacity-50"
            >
              Upcoming BSE SME
            </button>
            <button
              type="button"
              disabled={fetchingApi}
              onClick={() => handleFetchIpoAlerts(1, false, 'open', 'all')}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded text-[11px] font-medium transition-colors disabled:opacity-50"
            >
              Open IPOs
            </button>
            <button
              type="button"
              disabled={fetchingApi}
              onClick={() => handleFetchIpoAlerts(1, false, 'closed', 'all')}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded text-[11px] font-medium transition-colors disabled:opacity-50"
            >
              Closed IPOs
            </button>
            <button
              type="button"
              disabled={fetchingApi}
              onClick={() => handleFetchIpoAlerts(1, false, 'listed', 'all')}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded text-[11px] font-medium transition-colors disabled:opacity-50"
            >
              Listed IPOs
            </button>
          </div>

          {syncMode === 'open_list' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Data Source
                  </label>
                  <select
                    value={sourceFilter}
                    onChange={(e) => {
                      setSourceFilter(e.target.value as 'auto' | 'public_feed' | 'ipoalerts');
                      setPageNum(1);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 outline-none focus:border-slate-400"
                  >
                    <option value="auto">Auto (ipoalerts + Live Feeds)</option>
                    <option value="public_feed">Live Indian Feeds (All Exchanges)</option>
                    <option value="ipoalerts">ipoalerts.in API Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Status Filter
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(
                        e.target.value as
                          | 'open'
                          | 'upcoming'
                          | 'announced'
                          | 'open_and_upcoming'
                          | 'closed'
                          | 'listed'
                      );
                      setPageNum(1);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 outline-none focus:border-slate-400"
                  >
                    <option value="upcoming">Upcoming (Dated + SEBI Approved + DRHP)</option>
                    <option value="open">Open (Live)</option>
                    <option value="open_and_upcoming">Open + Upcoming</option>
                    <option value="closed">Closed</option>
                    <option value="listed">Listed</option>
                    <option value="announced">DRHP Filed (Awaiting Approval)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Exchange / Board
                  </label>
                  <select
                    value={exchangeFilter}
                    onChange={(e) => {
                      setExchangeFilter(
                        e.target.value as 'all' | 'nse_bse' | 'nse_emerge' | 'bse_sme'
                      );
                      setPageNum(1);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 outline-none focus:border-slate-400"
                  >
                    <option value="all">All Exchanges (Mainboard + SME)</option>
                    <option value="nse_bse">Mainboard (NSE &amp; BSE)</option>
                    <option value="nse_emerge">SME — NSE Emerge</option>
                    <option value="bse_sme">SME — BSE SME</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    IPO Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value as 'EQ,SME' | 'EQ' | 'SME' | '');
                      setPageNum(1);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 outline-none focus:border-slate-400"
                  >
                    <option value="EQ,SME">Mainboard &amp; SME</option>
                    <option value="EQ">Mainboard Only</option>
                    <option value="SME">SME Only</option>
                    <option value="">All (incl. Debt)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Page
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={pageNum}
                    onChange={(e) => setPageNum(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Per Page (max 200)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={limitNum}
                    onChange={(e) => setLimitNum(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-end">
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Search Company or Industry (Optional)
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPageNum(1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleFetchIpoAlerts(1, false);
                      }
                    }}
                    placeholder="e.g., Encube Ethicals, Travelstack, Milestone Gears, Pharmaceuticals..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={fetchingApi || (sourceFilter === 'ipoalerts' && quota !== null && !quota.configured)}
                    onClick={() => handleFetchIpoAlerts(pageNum, false)}
                    className="px-5 py-2 bg-[#14532D] hover:bg-[#0F3F22] text-white rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <CloudDownload className="w-3.5 h-3.5" />
                    <span>{fetchingApi ? 'Fetching...' : 'Fetch IPOs'}</span>
                  </button>
                  {fetchResponse && (
                    <button
                      type="button"
                      title="Bypass 5-min cache and fetch fresh data"
                      disabled={fetchingApi}
                      onClick={() => handleFetchIpoAlerts(pageNum, true)}
                      className="px-2.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${fetchingApi ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  IPO Name, Slug, or Symbol
                </label>
                <input
                  type="text"
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value)}
                  placeholder="e.g., airpro-technology or SWIGGY"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md bg-white text-slate-900 outline-none focus:border-slate-400"
                />
              </div>
              <button
                type="button"
                disabled={fetchingApi}
                onClick={() => handleFetchIpoAlerts(1, false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                <CloudDownload className="w-3.5 h-3.5" />
                <span>{fetchingApi ? 'Looking up...' : 'Fetch Details'}</span>
              </button>
            </div>
          )}

          {/* Fetched Preview Results */}
          {fetchResponse && (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-slate-700">
                  <span className="font-semibold text-slate-900">
                    Fetched {fetchResponse.ipos.length} of {fetchResponse.meta.count} matching IPO(s)
                  </span>
                  {fetchResponse.provider && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[11px]">
                      {fetchResponse.provider === 'ipoalerts'
                        ? 'Source: ipoalerts.in API'
                        : fetchResponse.provider === 'hybrid'
                        ? 'Source: ipoalerts.in + Live Indian Feed'
                        : 'Source: Live Indian IPO Feed'}
                    </span>
                  )}
                  {fetchResponse.cached && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px]">
                      Served from 5-min cache (0 quota used)
                    </span>
                  )}
                </div>

                {syncMode === 'open_list' && fetchResponse.meta.totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={fetchingApi || fetchResponse.meta.page <= 1}
                      onClick={() => handleFetchIpoAlerts(fetchResponse.meta.page - 1, false)}
                      className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 text-[11px] font-mono text-slate-600">
                      Page {fetchResponse.meta.page} / {fetchResponse.meta.totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={fetchingApi || fetchResponse.meta.page >= fetchResponse.meta.totalPages}
                      onClick={() => handleFetchIpoAlerts(fetchResponse.meta.page + 1, false)}
                      className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {fetchResponse.upstreamNotice && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600">
                  API Notice: {fetchResponse.upstreamNotice}
                </div>
              )}

              {fetchResponse.ipos.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded text-slate-600 text-center">
                  No IPO records returned for this filter right now. Try clearing the search filter or switching exchange/status.
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Instant Filter Bar for Fetched Results */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                      <div className="relative flex-1 min-w-[180px] max-w-xs">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
                        <input
                          type="text"
                          value={resultSearch}
                          onChange={(e) => setResultSearch(e.target.value)}
                          placeholder="Filter fetched list..."
                          className="w-full h-7.5 pl-8 pr-2.5 text-[11px] bg-white border border-slate-200 rounded outline-none focus:border-slate-400"
                        />
                      </div>

                      <select
                        value={resultCategoryFilter}
                        onChange={(e) =>
                          setResultCategoryFilter(e.target.value as 'all' | 'Mainboard' | 'SME')
                        }
                        className="h-7.5 px-2 text-[11px] bg-white border border-slate-200 rounded text-slate-700 outline-none focus:border-slate-400"
                      >
                        <option value="all">All Boards</option>
                        <option value="Mainboard">Mainboard</option>
                        <option value="SME">SME</option>
                      </select>

                      <select
                        value={resultStageFilter}
                        onChange={(e) =>
                          setResultStageFilter(
                            e.target.value as 'all' | 'dated' | 'approval_received' | 'drhp_filed'
                          )
                        }
                        className="h-7.5 px-2 text-[11px] bg-white border border-slate-200 rounded text-slate-700 outline-none focus:border-slate-400"
                      >
                        <option value="all">All Stages</option>
                        <option value="dated">Dated / Active</option>
                        <option value="approval_received">SEBI / Exchange Approved</option>
                        <option value="drhp_filed">DRHP Filed</option>
                      </select>

                      {(resultSearch || resultCategoryFilter !== 'all' || resultStageFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setResultSearch('');
                            setResultCategoryFilter('all');
                            setResultStageFilter('all');
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>

                    <label className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={hideAlreadyImported}
                        onChange={(e) => setHideAlreadyImported(e.target.checked)}
                        className="rounded text-[#14532D]"
                      />
                      <span>
                        Hide already imported
                        {hiddenImportedCount > 0 ? ` (${hiddenImportedCount} hidden)` : ''}
                      </span>
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                    <span>
                      Showing <strong>{visibleCandidates.length}</strong> IPO(s) · Selected{' '}
                      <strong>{selectedCount}</strong>
                      {hideAlreadyImported && hiddenImportedCount > 0 && (
                        <span className="text-emerald-700 ml-1.5">
                          ({hiddenImportedCount} already in database &amp; hidden)
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedIds((prev) => {
                            const next = { ...prev };
                            visibleCandidates.forEach((i) => {
                              if (!isAlreadyImported(i)) {
                                next[i.external_id] = true;
                              }
                            });
                            return next;
                          });
                        }}
                        className="text-[#14532D] font-medium hover:underline"
                      >
                        Select All New
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedIds({})}
                        className="text-slate-600 hover:text-slate-900 hover:underline"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>

                  {visibleCandidates.length === 0 ? (
                    <div className="p-5 bg-emerald-50/60 border border-emerald-200 rounded-lg text-center space-y-1.5">
                      <p className="text-xs font-semibold text-emerald-900">
                        {hiddenImportedCount > 0 && hideAlreadyImported
                          ? `All ${hiddenImportedCount} IPO(s) on this page are already imported into your database.`
                          : 'No fetched IPOs match the current result filters.'}
                      </p>
                      <p className="text-[11px] text-emerald-800">
                        {hiddenImportedCount > 0 && hideAlreadyImported
                          ? 'Already-imported IPOs are automatically unselected and hidden so you do not re-import them. Switch page or uncheck "Hide already imported" if you need to update an existing record.'
                          : 'Try clearing the result filter above to view all available IPOs.'}
                      </p>
                    </div>
                  ) : (
                    visibleCandidates.map((item) => {
                      const matched = findExistingMatch(item);
                      const checked = Boolean(selectedIds[item.external_id]);
                      return (
                        <div
                          key={item.external_id}
                          className={`p-3.5 rounded-lg border transition-colors ${
                            checked
                              ? 'border-slate-300 bg-slate-50/70'
                              : 'border-slate-200 bg-white opacity-75'
                          }`}
                        >
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex items-start gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setSelectedIds((prev) => ({
                                  ...prev,
                                  [item.external_id]: e.target.checked,
                                }))
                              }
                              className="mt-0.5 rounded text-slate-900"
                            />
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-sm text-slate-900">
                                  {item.companyName}
                                </span>
                                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-medium text-slate-700">
                                  {item.category} · {item.exchange}
                                </span>
                                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] capitalize text-slate-700">
                                  {item.status}
                                </span>
                                {item.pipeline_stage === 'approval_received' && (
                                  <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-[11px] font-medium">
                                    SEBI / Exchange Approved
                                  </span>
                                )}
                                {item.pipeline_stage === 'drhp_filed' && (
                                  <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded text-[11px] font-medium">
                                    DRHP Filed
                                  </span>
                                )}
                                {item.sourceType === 'DEBT' && (
                                  <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded text-[11px]">
                                    Debt / NCD Issue
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                                <span>
                                  Dates:{' '}
                                  <strong className="text-slate-800">
                                    {item.open_date || 'TBA'} → {item.close_date || 'TBA'}
                                  </strong>
                                </span>
                                {item.sebi_approval_date && (
                                  <span>
                                    Approved:{' '}
                                    <strong className="text-emerald-800">{item.sebi_approval_date}</strong>
                                  </span>
                                )}
                                {item.drhp_filing_date && (
                                  <span>
                                    DRHP Filed:{' '}
                                    <strong className="text-slate-800">{item.drhp_filing_date}</strong>
                                  </span>
                                )}
                                {item.industry && (
                                  <span>
                                    Sector: <strong className="text-slate-800">{item.industry}</strong>
                                  </span>
                                )}
                                {item.listing_date && (
                                  <span>
                                    Listing: <strong className="text-slate-800">{item.listing_date}</strong>
                                  </span>
                                )}
                                {(item.price_band_min || item.price_band_max) && (
                                  <span>
                                    Price Band:{' '}
                                    <strong className="text-slate-800">
                                      ₹{item.price_band_min ?? item.price_band_max}
                                      {item.price_band_max && item.price_band_max !== item.price_band_min
                                        ? ` – ₹${item.price_band_max}`
                                        : ''}
                                    </strong>
                                  </span>
                                )}
                                {item.lot_size && (
                                  <span>
                                    Lot Size: <strong className="text-slate-800">{item.lot_size} shares</strong>
                                  </span>
                                )}
                                {item.issue_size && (
                                  <span>
                                    Issue Size: <strong className="text-slate-800">₹{item.issue_size} Cr</strong>
                                  </span>
                                )}
                                {item.fresh_issue_size && (
                                  <span>
                                    Fresh: <strong className="text-slate-800">₹{item.fresh_issue_size} Cr</strong>
                                  </span>
                                )}
                                {item.offer_for_sale_size && (
                                  <span>
                                    OFS: <strong className="text-slate-800">₹{item.offer_for_sale_size} Cr</strong>
                                  </span>
                                )}
                              </div>

                              {(item.rhp_url || item.drhp_url) && (
                                <div className="pt-0.5">
                                  <a
                                    href={item.rhp_url || item.drhp_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-slate-700 hover:text-slate-900 underline"
                                  >
                                    <span>Prospectus Link Provided</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </label>

                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium shrink-0 ${
                              matched
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {matched ? 'Already Imported' : 'New IPO'}
                          </span>
                        </div>
                      </div>
                      );
                    })
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preserveExistingFields}
                        onChange={(e) => setPreserveExistingFields(e.target.checked)}
                        className="rounded text-slate-900"
                      />
                      <span>
                        Preserve my manually entered fields (RHP/DRHP links, quotas, registrar) when updating existing IPOs
                      </span>
                    </label>

                    <button
                      type="button"
                      disabled={savingApi || selectedCount === 0}
                      onClick={handleSaveFetched}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>
                        {savingApi
                          ? 'Saving to Firestore...'
                          : `Save Selected (${selectedCount}) to Database`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Save Report */}
          {saveReport && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
              <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>
                  Sync Saved Permanently · Created: {saveReport.created} · Updated: {saveReport.updated}
                  {saveReport.skipped > 0 ? ` · Skipped: ${saveReport.skipped}` : ''}
                </span>
              </div>
              {saveReport.errors.length > 0 && (
                <ul className="list-disc pl-5 text-[11px] text-rose-700 space-y-0.5">
                  {saveReport.errors.map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Recent Sync History */}
        {recentRuns.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-600" />
                <span>Recent Data Sync &amp; Import Runs ({filteredRuns.length})</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
                  <input
                    type="text"
                    value={runSearch}
                    onChange={(e) => setRunSearch(e.target.value)}
                    placeholder="Filter provider..."
                    className="h-7 pl-7 pr-2.5 text-[11px] bg-slate-50 border border-slate-200 rounded outline-none focus:bg-white focus:border-slate-400"
                  />
                </div>
                <select
                  value={runStatusFilter}
                  onChange={(e) =>
                    setRunStatusFilter(e.target.value as 'all' | 'success' | 'partial' | 'failed')
                  }
                  className="h-7 px-2 text-[11px] bg-slate-50 border border-slate-200 rounded text-slate-700 outline-none focus:bg-white focus:border-slate-400"
                >
                  <option value="all">All Statuses</option>
                  <option value="success">Success</option>
                  <option value="partial">Partial</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredRuns.length === 0 ? (
                <div className="py-4 text-center text-slate-400">
                  No sync runs match the selected filter.
                </div>
              ) : (
                filteredRuns.slice(0, 10).map((run) => (
                  <div key={run.id} className="py-2 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-medium text-slate-800">{run.provider_name}</span>
                      <span className="text-slate-400 ml-2 font-mono text-[11px]">
                        {new Date(run.started_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="text-slate-600">
                        Accepted: {run.records_accepted}/{run.records_fetched}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded capitalize ${
                          run.status === 'success'
                            ? 'bg-emerald-50 text-emerald-700'
                            : run.status === 'partial'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {run.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </section>

      {/* ============================================================
          SECTION 2: BULK CSV DATA INGESTION PIPELINE
         ============================================================ */}
      <section className="space-y-4 pt-4 border-t border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Bulk CSV Data Ingestion Pipeline</h2>
          <p className="text-xs text-slate-500">
            Upload and validate historical IPO records, price determinations, and syndicate details with automatic schema verification.
          </p>
        </div>

        {importError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Import error: {importError}</span>
          </div>
        )}

        {/* Schema Requirement Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 text-xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-slate-700" />
            <span>Expected CSV Schema Definition</span>
          </h3>
          <p className="text-slate-600">
            The uploaded file must contain the following comma-separated header row:
          </p>
          <code className="block p-2.5 bg-slate-50 border border-slate-200 rounded font-mono text-[11px] text-slate-800 overflow-x-auto">
            company,category,exchange,price,lot_size,issue_size,status
          </code>
          <ul className="list-disc pl-5 space-y-1 text-slate-500 text-[11px]">
            <li>
              <strong>category:</strong> Must be <code>Mainboard</code> or <code>SME</code>.
            </li>
            <li>
              <strong>status:</strong> <code>upcoming</code>, <code>ongoing</code>, or <code>listed</code>.
            </li>
            <li>
              <strong>issue_size:</strong> Denominated in INR Crores.
            </li>
          </ul>
        </div>

        {/* Import Area */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-slate-800">CSV Input Data</label>
            <button
              type="button"
              onClick={() => setCsvText(CSV_HEADER_TEMPLATE)}
              className="text-[11px] text-slate-500 hover:text-slate-900 underline"
            >
              Reset Header Template
            </button>
          </div>

          <textarea
            rows={7}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded outline-none focus:bg-white focus:border-slate-400"
            placeholder="Paste CSV rows here..."
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 text-slate-700 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={isDryRun}
                onChange={(e) => setIsDryRun(e.target.checked)}
                className="rounded text-slate-900"
              />
              <span>Dry-Run Validation Only (Preview errors without database writes)</span>
            </label>

            <button
              type="button"
              onClick={handleProcessImport}
              disabled={loading}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium transition-colors flex items-center justify-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Processing...' : isDryRun ? 'Validate Schema' : 'Execute Import'}</span>
            </button>
          </div>
        </div>

        {/* Import Result Report */}
        {result && (
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Import Execution Summary</span>
              </h3>
              <span className="font-mono text-slate-500">
                Total Rows: {result.totalRows} · Accepted: {result.accepted} · Rejected: {result.rejected}
              </span>
            </div>

            {result.errors.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Validation Discrepancies ({result.errors.length})</span>
                </span>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                  {result.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.importedIPOs.length > 0 && (
              <div className="space-y-2">
                <span className="font-semibold text-slate-800 block">Accepted Offerings:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {result.importedIPOs.map((i, idx) => (
                    <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded">
                      <span className="font-bold text-slate-900 block">{i.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{i.slug}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
