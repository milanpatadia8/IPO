import React, { useState, useEffect, useMemo } from 'react';
import { IPO, IPOCategory, IPOStatus, AdminUser, SubscriptionSnapshot } from '../../types/ipo';
import { api } from '../../lib/api';
import { formatIndianTimestamp } from '../../lib/calculations';
import { BarChart3, CheckCircle2, Search, RotateCcw } from 'lucide-react';

interface AdminSubscriptionsPageProps {
  adminUser: AdminUser;
}

export const AdminSubscriptionsPage: React.FC<AdminSubscriptionsPageProps> = ({ adminUser }) => {
  const [ipos, setIPOs] = useState<IPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIpoId, setSelectedIpoId] = useState('');

  // Filter State
  const [ipoSearch, setIpoSearch] = useState('');
  const [boardFilter, setBoardFilter] = useState<'ALL' | IPOCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | IPOStatus>('ALL');
  const [historyScope, setHistoryScope] = useState<'selected' | 'all'>('selected');
  const [dayFilter, setDayFilter] = useState<'ALL' | '1' | '2' | '3' | '4'>('ALL');

  // Form State (All subscription multiples are optional)
  const [retailMultiple, setRetailMultiple] = useState('');
  const [niiMultiple, setNiiMultiple] = useState('');
  const [qibMultiple, setQibMultiple] = useState('');
  const [employeeMultiple, setEmployeeMultiple] = useState('');
  const [shareholderMultiple, setShareholderMultiple] = useState('');
  const [totalMultiple, setTotalMultiple] = useState('');
  const [dayNumber, setDayNumber] = useState('1');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getAllIPOs();
      setIPOs(data);
      const ongoing = data.find((i) => i.status === 'ongoing');
      if (ongoing) setSelectedIpoId(ongoing.id);
      else if (data.length > 0) setSelectedIpoId(data[0].id);
    } catch (err) {
      console.error('Failed to load IPOs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const parseOptionalNumber = (val: string): number | undefined => {
    if (!val.trim()) return undefined;
    const parsed = parseFloat(val);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  };

  const handleRecordSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIpoId) return;
    setErrorMsg('');

    try {
      await api.adminAddSubscription(
        {
          ipo_id: selectedIpoId,
          retail_multiple: parseOptionalNumber(retailMultiple),
          nii_multiple: parseOptionalNumber(niiMultiple),
          qib_multiple: parseOptionalNumber(qibMultiple),
          employee_multiple: parseOptionalNumber(employeeMultiple),
          shareholder_multiple: parseOptionalNumber(shareholderMultiple),
          total_multiple: parseOptionalNumber(totalMultiple),
          day_number: parseInt(dayNumber, 10) || 1,
          observed_at: new Date().toISOString(),
        },
        adminUser
      );

      setRetailMultiple('');
      setNiiMultiple('');
      setQibMultiple('');
      setEmployeeMultiple('');
      setShareholderMultiple('');
      setTotalMultiple('');
      setSuccessMsg('Subscription multiple snapshot recorded successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to record subscription snapshot.');
    }
  };

  const filteredIpos = useMemo(() => {
    const q = ipoSearch.trim().toLowerCase();
    return ipos.filter((i) => {
      if (boardFilter !== 'ALL' && i.category !== boardFilter) return false;
      if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;
      if (q) {
        const hay = `${i.company?.name || ''} ${i.slug} ${i.exchange}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ipos, boardFilter, statusFilter, ipoSearch]);

  useEffect(() => {
    if (filteredIpos.length > 0 && !filteredIpos.some((i) => i.id === selectedIpoId)) {
      setSelectedIpoId(filteredIpos[0].id);
    }
  }, [filteredIpos, selectedIpoId]);

  const selectedIpo = ipos.find((i) => i.id === selectedIpoId);

  const visibleSnapshots = useMemo(() => {
    const rows: Array<{ ipoName: string; ipoCategory: IPOCategory; snapshot: SubscriptionSnapshot }> = [];
    const targetIpos =
      historyScope === 'selected'
        ? selectedIpo
          ? [selectedIpo]
          : []
        : filteredIpos;
    targetIpos.forEach((ipo) => {
      (ipo.subscription_history || []).forEach((s) => {
        if (dayFilter !== 'ALL' && String(s.day_number || 1) !== dayFilter) return;
        rows.push({
          ipoName: ipo.company?.name || ipo.slug,
          ipoCategory: ipo.category,
          snapshot: s,
        });
      });
    });
    rows.sort(
      (a, b) =>
        new Date(b.snapshot.observed_at).getTime() - new Date(a.snapshot.observed_at).getTime()
    );
    return rows;
  }, [historyScope, selectedIpo, filteredIpos, dayFilter]);

  const hasFilters =
    ipoSearch.trim() !== '' ||
    boardFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    dayFilter !== 'ALL';

  const resetFilters = () => {
    setIpoSearch('');
    setBoardFilter('ALL');
    setStatusFilter('ALL');
    setDayFilter('ALL');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Subscription Status Desk</h1>
        <p className="text-xs text-slate-500">
          Enter verified exchange bidding numbers, category-wise demand multiples, and daily day-by-day bidding progress. All multiple fields are optional.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs">
          {errorMsg}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter IPOs by company name, slug, or exchange..."
              value={ipoSearch}
              onChange={(e) => setIpoSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-slate-400"
            />
          </div>

          <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-md p-0.5 text-xs self-start">
            {(['ALL', 'Mainboard', 'SME'] as const).map((board) => (
              <button
                key={board}
                type="button"
                onClick={() => setBoardFilter(board)}
                className={`px-3 py-1.5 rounded font-medium transition-colors ${
                  boardFilter === board
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {board === 'ALL' ? 'All Boards' : board}
              </button>
            ))}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | IPOStatus)}
            className="h-9 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 outline-none focus:bg-white focus:border-slate-400"
          >
            <option value="ALL">All Statuses</option>
            <option value="ongoing">Open (Ongoing)</option>
            <option value="upcoming">Upcoming</option>
            <option value="closed">Closed</option>
            <option value="listed">Listed</option>
          </select>

          <select
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value as 'ALL' | '1' | '2' | '3' | '4')}
            className="h-9 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 outline-none focus:bg-white focus:border-slate-400"
          >
            <option value="ALL">All Bidding Days</option>
            <option value="1">Day 1</option>
            <option value="2">Day 2</option>
            <option value="3">Day 3</option>
            <option value="4">Day 4</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>
            Matching <strong className="text-slate-800">{filteredIpos.length}</strong> of {ipos.length} IPO(s)
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Subscription Input Form Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-700" />
            <span>Record Daily Subscription Multiple</span>
          </h2>
          <span className="text-[11px] text-slate-500">
            Leave any category blank if not applicable
          </span>
        </div>

        <form onSubmit={handleRecordSubscription} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Select IPO ({filteredIpos.length})
              </label>
              <select
                value={selectedIpoId}
                onChange={(e) => setSelectedIpoId(e.target.value)}
                className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded font-sans"
              >
                {filteredIpos.length === 0 ? (
                  <option value="">
                    {ipos.length === 0
                      ? 'No IPOs available — add an IPO first'
                      : 'No IPOs match your current filter'}
                  </option>
                ) : (
                  filteredIpos.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.company?.name || i.slug} ({i.category} - {i.status})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bidding Day Number</label>
              <select
                value={dayNumber}
                onChange={(e) => setDayNumber(e.target.value)}
                className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
              >
                <option value="1">Day 1 (Opening Day)</option>
                <option value="2">Day 2 (Intermediate)</option>
                <option value="3">Day 3 (Final Close)</option>
                <option value="4">Day 4 (Extended SME)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Retail Quota Multiple (x)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={retailMultiple}
                onChange={(e) => setRetailMultiple(e.target.value)}
                className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded font-mono"
                placeholder="Optional (e.g. 15.5)"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                NII / HNI Multiple (x)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={niiMultiple}
                onChange={(e) => setNiiMultiple(e.target.value)}
                className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded font-mono"
                placeholder="Optional (e.g. 28.0)"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                QIB Multiple (x)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={qibMultiple}
                onChange={(e) => setQibMultiple(e.target.value)}
                className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded font-mono"
                placeholder="Optional (e.g. 4.2)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Employee Multiple (x)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={employeeMultiple}
                onChange={(e) => setEmployeeMultiple(e.target.value)}
                className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded font-mono"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Shareholder Multiple (x)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={shareholderMultiple}
                onChange={(e) => setShareholderMultiple(e.target.value)}
                className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded font-mono"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Total Subscription (x)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={totalMultiple}
                onChange={(e) => setTotalMultiple(e.target.value)}
                className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded font-mono"
                placeholder="Auto-calculated if blank"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={!selectedIpoId}
              className="px-4 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Commit Subscription Snapshot
            </button>
          </div>
        </form>
      </div>

      {/* Snapshot History Table */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900">
            {historyScope === 'selected' && selectedIpo
              ? `Recorded Snapshots: ${selectedIpo.company?.name || selectedIpo.slug} (${visibleSnapshots.length})`
              : `Recorded Snapshots Across Filtered IPOs (${visibleSnapshots.length})`}
          </h2>
          <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-md p-0.5 text-xs self-start">
            <button
              type="button"
              onClick={() => setHistoryScope('selected')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                historyScope === 'selected'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Selected IPO
            </button>
            <button
              type="button"
              onClick={() => setHistoryScope('all')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                historyScope === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Filtered IPOs
            </button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs font-mono tabular-nums">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                {historyScope === 'all' && <th className="py-2.5 px-3 font-sans">IPO Company</th>}
                <th className="py-2.5 px-3 font-sans">Observation Time (IST)</th>
                <th className="py-2.5 px-3 font-sans">Day</th>
                <th className="py-2.5 px-3 text-right">Retail</th>
                <th className="py-2.5 px-3 text-right">NII</th>
                <th className="py-2.5 px-3 text-right">QIB</th>
                <th className="py-2.5 px-3 text-right">Total Subscribed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={historyScope === 'all' ? 7 : 6} className="py-8 text-center text-slate-400 font-sans">
                    Loading subscription snapshots...
                  </td>
                </tr>
              ) : visibleSnapshots.length === 0 ? (
                <tr>
                  <td colSpan={historyScope === 'all' ? 7 : 6} className="py-8 text-center text-slate-400 font-sans">
                    No subscription snapshots match the selected filters.
                  </td>
                </tr>
              ) : (
                visibleSnapshots.map(({ ipoName, ipoCategory, snapshot: s }) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    {historyScope === 'all' && (
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">
                        {ipoName}{' '}
                        <span className="text-[10px] font-normal text-slate-500">({ipoCategory})</span>
                      </td>
                    )}
                    <td className="py-2.5 px-3 font-sans text-slate-600">
                      {formatIndianTimestamp(s.observed_at)}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">Day {s.day_number || 1}</td>
                    <td className="py-2.5 px-3 text-right">{s.retail_multiple.toFixed(2)}x</td>
                    <td className="py-2.5 px-3 text-right">{s.nii_multiple.toFixed(2)}x</td>
                    <td className="py-2.5 px-3 text-right">{s.qib_multiple.toFixed(2)}x</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {s.total_multiple.toFixed(2)}x
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
