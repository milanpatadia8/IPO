import React, { useState, useEffect, useMemo } from 'react';
import { IPO, IPOCategory, GMPSnapshot, AdminUser } from '../../types/ipo';
import { api } from '../../lib/api';
import { formatIndianTimestamp, isObservationStale } from '../../lib/calculations';
import { Plus, Trash2, CheckCircle, AlertCircle, X, ExternalLink, Search, RotateCcw } from 'lucide-react';

interface AdminGMPPageProps {
  adminUser: AdminUser;
}

export const AdminGMPPage: React.FC<AdminGMPPageProps> = ({ adminUser }) => {
  const [ipos, setIPOs] = useState<IPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; ipoName: string; amount: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter State
  const [search, setSearch] = useState('');
  const [boardFilter, setBoardFilter] = useState<'ALL' | IPOCategory>('ALL');
  const [ipoFilter, setIpoFilter] = useState('ALL');
  const [freshnessFilter, setFreshnessFilter] = useState<'ALL' | 'FRESH' | 'STALE'>('ALL');
  const [spreadFilter, setSpreadFilter] = useState<'ALL' | 'POSITIVE' | 'NON_POSITIVE'>('ALL');

  // Form State
  const [selectedIpoId, setSelectedIpoId] = useState('');
  const [gmpAmount, setGmpAmount] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [observedAt, setObservedAt] = useState('');

  const showBanner = (type: 'success' | 'error', message: string) => {
    setStatusBanner({ type, message });
    setTimeout(() => {
      setStatusBanner((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getAllIPOs();
      setIPOs(data);
      if (data.length > 0 && !selectedIpoId) {
        setSelectedIpoId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load IPOs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateGMP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIpoId || gmpAmount.trim() === '') return;

    setSubmitting(true);
    try {
      await api.adminAddGMP(
        {
          ipo_id: selectedIpoId,
          gmp_amount: parseFloat(gmpAmount),
          source_name: sourceName,
          source_url: sourceUrl,
          notes,
          observed_at: observedAt ? new Date(observedAt).toISOString() : new Date().toISOString(),
          verification_status: 'verified',
        },
        adminUser
      );

      setModalOpen(false);
      setGmpAmount('');
      setNotes('');
      showBanner('success', 'Unlisted price observation recorded successfully.');
      await loadData();
    } catch (err: unknown) {
      showBanner(
        'error',
        err instanceof Error ? err.message : 'Failed to record unlisted price observation.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.adminDeleteGMP(deleteTarget.id, adminUser);
      const label = `${deleteTarget.ipoName} (₹${deleteTarget.amount})`;
      setDeleteTarget(null);
      showBanner('success', `Deleted unlisted price observation for ${label}.`);
      await loadData();
    } catch (err: unknown) {
      setDeleteTarget(null);
      showBanner('error', err instanceof Error ? err.message : 'Failed to delete unlisted price observation.');
    } finally {
      setDeleting(false);
    }
  };

  // Collect all snapshots across IPOs
  const allSnapshots = useMemo(() => {
    const rows: Array<{ ipoId: string; ipoName: string; ipoCategory: IPOCategory; snapshot: GMPSnapshot }> = [];
    ipos.forEach((ipo) => {
      if (ipo.gmp_history) {
        ipo.gmp_history.forEach((g) => {
          rows.push({
            ipoId: ipo.id,
            ipoName: ipo.company?.name || ipo.slug,
            ipoCategory: ipo.category,
            snapshot: g,
          });
        });
      }
    });
    rows.sort(
      (a, b) =>
        new Date(b.snapshot.observed_at).getTime() - new Date(a.snapshot.observed_at).getTime()
    );
    return rows;
  }, [ipos]);

  const filteredSnapshots = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allSnapshots.filter(({ ipoId, ipoName, ipoCategory, snapshot }) => {
      if (boardFilter !== 'ALL' && ipoCategory !== boardFilter) return false;
      if (ipoFilter !== 'ALL' && ipoId !== ipoFilter) return false;
      const stale = isObservationStale(snapshot.observed_at, 24);
      if (freshnessFilter === 'FRESH' && stale) return false;
      if (freshnessFilter === 'STALE' && !stale) return false;
      if (spreadFilter === 'POSITIVE' && snapshot.gmp_amount <= 0) return false;
      if (spreadFilter === 'NON_POSITIVE' && snapshot.gmp_amount > 0) return false;
      if (q) {
        const hay = `${ipoName} ${snapshot.source_name || ''} ${snapshot.notes || ''} ${snapshot.created_by || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allSnapshots, boardFilter, ipoFilter, freshnessFilter, spreadFilter, search]);

  const hasActiveFilters =
    search.trim() !== '' ||
    boardFilter !== 'ALL' ||
    ipoFilter !== 'ALL' ||
    freshnessFilter !== 'ALL' ||
    spreadFilter !== 'ALL';

  const resetFilters = () => {
    setSearch('');
    setBoardFilter('ALL');
    setIpoFilter('ALL');
    setFreshnessFilter('ALL');
    setSpreadFilter('ALL');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Unlisted Price Desk &amp; Market Quotes</h1>
          <p className="text-xs text-slate-500">
            Log manual unlisted price references, verify imported estimates, and monitor observation freshness.
          </p>
        </div>

        <button
          onClick={() => {
            setObservedAt(new Date().toISOString().slice(0, 16));
            setModalOpen(true);
          }}
          className="h-9 px-3.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Unlisted Price Quote</span>
        </button>
      </div>

      {statusBanner && (
        <div
          className={`p-3 rounded-md border text-xs flex items-center justify-between gap-2 ${
            statusBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusBanner.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-current opacity-70 hover:opacity-100 p-0.5"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by IPO, source, recorder, or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
            value={ipoFilter}
            onChange={(e) => setIpoFilter(e.target.value)}
            className="h-9 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 outline-none focus:bg-white focus:border-slate-400 max-w-[200px]"
          >
            <option value="ALL">All IPOs</option>
            {ipos.map((i) => (
              <option key={i.id} value={i.id}>
                {i.company?.name || i.slug}
              </option>
            ))}
          </select>

          <select
            value={freshnessFilter}
            onChange={(e) => setFreshnessFilter(e.target.value as 'ALL' | 'FRESH' | 'STALE')}
            className="h-9 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 outline-none focus:bg-white focus:border-slate-400"
          >
            <option value="ALL">All Freshness</option>
            <option value="FRESH">Verified (&le;24h)</option>
            <option value="STALE">Stale (&gt;24h)</option>
          </select>

          <select
            value={spreadFilter}
            onChange={(e) => setSpreadFilter(e.target.value as 'ALL' | 'POSITIVE' | 'NON_POSITIVE')}
            className="h-9 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 outline-none focus:bg-white focus:border-slate-400"
          >
            <option value="ALL">All Spreads</option>
            <option value="POSITIVE">Positive (+)</option>
            <option value="NON_POSITIVE">Flat / Discount (&le;0)</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>
            Showing <strong className="text-slate-800">{filteredSnapshots.length}</strong> of{' '}
            {allSnapshots.length} quote(s)
          </span>
          {hasActiveFilters && (
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

      {/* Snapshot Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">IPO Company</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Unlisted Spread (₹)</th>
                <th className="py-3 px-4">Observed At (IST)</th>
                <th className="py-3 px-4">Source Name</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                    Loading unlisted price observations...
                  </td>
                </tr>
              ) : filteredSnapshots.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                    {allSnapshots.length === 0
                      ? 'No unlisted price observations logged yet.'
                      : 'No unlisted price observations match your current filters.'}
                  </td>
                </tr>
              ) : (
                filteredSnapshots.map(({ ipoName, ipoCategory, snapshot }) => {
                  const isStale = isObservationStale(snapshot.observed_at, 24);

                  return (
                    <tr key={snapshot.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                        {ipoName}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600">{ipoCategory}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ₹{snapshot.gmp_amount}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600 text-[11px]">
                        {formatIndianTimestamp(snapshot.observed_at)}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600">
                        {snapshot.source_url ? (
                          <a
                            href={snapshot.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-slate-900 flex items-center gap-1"
                          >
                            <span>{snapshot.source_name}</span>
                            <ExternalLink className="w-3 h-3 opacity-50" />
                          </a>
                        ) : (
                          snapshot.source_name
                        )}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-500">
                        {snapshot.created_by || 'system_sync'}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-500 text-[11px] truncate max-w-xs">
                        {snapshot.notes || '-'}
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        {isStale ? (
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Stale (&gt;24h)
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Verified
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget({
                              id: snapshot.id,
                              ipoName,
                              amount: snapshot.gmp_amount,
                            })
                          }
                          className="p-1.5 text-rose-600 hover:text-rose-900 rounded hover:bg-rose-50 transition-colors"
                          title="Delete unlisted price observation"
                          aria-label={`Delete unlisted price for ${ipoName}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Unlisted Price Observation */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Add Unlisted Price Observation
            </h3>

            <form onSubmit={handleCreateGMP} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target IPO *</label>
                <select
                  required
                  value={selectedIpoId}
                  onChange={(e) => setSelectedIpoId(e.target.value)}
                  className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded font-sans"
                >
                  {ipos.length === 0 ? (
                    <option value="">No IPOs available — add an IPO first</option>
                  ) : (
                    ipos.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.company?.name || i.slug} ({i.category} - {i.status})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Unlisted Price Spread (₹ per share) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={gmpAmount}
                  onChange={(e) => setGmpAmount(e.target.value)}
                  className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded font-mono"
                  placeholder="e.g. 45"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Source Name</label>
                <input
                  type="text"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Source URL</label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observation Time</label>
                <input
                  type="datetime-local"
                  value={observedAt}
                  onChange={(e) => setObservedAt(e.target.value)}
                  className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Analyst Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded"
                  placeholder="e.g. Pre-listing market reference update"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedIpoId || submitting}
                  className="px-3.5 py-1.5 bg-slate-900 text-white font-medium rounded hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Record Observation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Unlisted Price Observation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Delete Unlisted Price Observation
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to delete the unlisted price spread of{' '}
                  <strong>₹{deleteTarget.amount}</strong> for{' '}
                  <strong>{deleteTarget.ipoName}</strong>? This immediately updates the IPO&apos;s
                  latest unlisted price and history.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
