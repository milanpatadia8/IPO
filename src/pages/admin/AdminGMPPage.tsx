import React, { useState, useEffect } from 'react';
import { IPO, GMPSnapshot, AdminUser } from '../../types/ipo';
import { api } from '../../lib/api';
import { formatIndianTimestamp, isObservationStale } from '../../lib/calculations';
import { Plus, Check, X, AlertCircle, Clock, ExternalLink } from 'lucide-react';

interface AdminGMPPageProps {
  adminUser: AdminUser;
}

export const AdminGMPPage: React.FC<AdminGMPPageProps> = ({ adminUser }) => {
  const [ipos, setIPOs] = useState<IPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [selectedIpoId, setSelectedIpoId] = useState('');
  const [gmpAmount, setGmpAmount] = useState('');
  const [sourceName, setSourceName] = useState('InvestorGain Market Estimates');
  const [sourceUrl, setSourceUrl] = useState('https://www.investorgain.com');
  const [notes, setNotes] = useState('');
  const [observedAt, setObservedAt] = useState('');

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
    if (!selectedIpoId || !gmpAmount) return;

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
    loadData();
  };

  // Collect all snapshots across IPOs
  const allSnapshots: Array<{ ipoName: string; ipoCategory: string; snapshot: GMPSnapshot }> = [];
  ipos.forEach((ipo) => {
    if (ipo.gmp_history) {
      ipo.gmp_history.forEach((g) => {
        allSnapshots.push({
          ipoName: ipo.company?.name || ipo.slug,
          ipoCategory: ipo.category,
          snapshot: g,
        });
      });
    }
  });

  // Sort descending by observed_at
  allSnapshots.sort(
    (a, b) =>
      new Date(b.snapshot.observed_at).getTime() - new Date(a.snapshot.observed_at).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">GMP Desk & Market Quotes</h1>
          <p className="text-xs text-slate-500">
            Log manual dealer quotations, verify imported estimates, and monitor observation freshness.
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
          <span>Add GMP Observation</span>
        </button>
      </div>

      {/* Snapshot Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">IPO Company</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">GMP Quote (₹)</th>
                <th className="py-3 px-4">Observed At (IST)</th>
                <th className="py-3 px-4">Source Name</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {allSnapshots.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                    No GMP observations logged yet.
                  </td>
                </tr>
              ) : (
                allSnapshots.map(({ ipoName, ipoCategory, snapshot }) => {
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add GMP */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Add Grey Market Premium Quote
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
                  {ipos.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.company?.name || i.slug} ({i.category} - {i.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  GMP Amount (₹ per share) *
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
                <label className="block font-semibold text-slate-700 mb-1">Source Name *</label>
                <input
                  type="text"
                  required
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Source URL</label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
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
                  placeholder="e.g. Robust dealer inquiries from Ahmedabad & Mumbai circles"
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
                  className="px-3.5 py-1.5 bg-slate-900 text-white font-medium rounded hover:bg-slate-800"
                >
                  Record Observation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
