import React, { useState, useEffect } from 'react';
import { IPO, AdminUser } from '../../types/ipo';
import { api } from '../../lib/api';
import { formatIndianTimestamp } from '../../lib/calculations';
import { Plus, BarChart3, CheckCircle2 } from 'lucide-react';

interface AdminSubscriptionsPageProps {
  adminUser: AdminUser;
}

export const AdminSubscriptionsPage: React.FC<AdminSubscriptionsPageProps> = ({ adminUser }) => {
  const [ipos, setIPOs] = useState<IPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIpoId, setSelectedIpoId] = useState('');

  // Form State
  const [retailMultiple, setRetailMultiple] = useState('15.5');
  const [niiMultiple, setNiiMultiple] = useState('28.0');
  const [qibMultiple, setQibMultiple] = useState('4.2');
  const [dayNumber, setDayNumber] = useState('2');
  const [successMsg, setSuccessMsg] = useState('');

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

  const handleRecordSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIpoId) return;

    await api.adminAddSubscription(
      {
        ipo_id: selectedIpoId,
        retail_multiple: parseFloat(retailMultiple) || 0,
        nii_multiple: parseFloat(niiMultiple) || 0,
        qib_multiple: parseFloat(qibMultiple) || 0,
        day_number: parseInt(dayNumber, 10) || 1,
        observed_at: new Date().toISOString(),
      },
      adminUser
    );

    setSuccessMsg('Subscription multiple snapshot recorded successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
    loadData();
  };

  const selectedIpo = ipos.find((i) => i.id === selectedIpoId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Subscription Status Desk</h1>
        <p className="text-xs text-slate-500">
          Enter verified exchange bidding numbers, category-wise demand multiples, and daily day-by-day bidding progress.
        </p>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Subscription Input Form Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
          <BarChart3 className="w-4 h-4 text-slate-700" />
          <span>Record Daily Subscription Multiple</span>
        </h2>

        <form onSubmit={handleRecordSubscription} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select IPO *</label>
              <select
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
                Retail Quota Multiple (x) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={retailMultiple}
                onChange={(e) => setRetailMultiple(e.target.value)}
                className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded font-mono"
                placeholder="e.g. 15.5"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                NII / HNI Multiple (x) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={niiMultiple}
                onChange={(e) => setNiiMultiple(e.target.value)}
                className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded font-mono"
                placeholder="e.g. 28.0"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                QIB Multiple (x) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={qibMultiple}
                onChange={(e) => setQibMultiple(e.target.value)}
                className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded font-mono"
                placeholder="e.g. 4.2"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 transition-colors"
            >
              Commit Subscription Snapshot
            </button>
          </div>
        </form>
      </div>

      {/* Snapshot History Table for Selected IPO */}
      {selectedIpo && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900">
            Recorded Snapshots: {selectedIpo.company?.name || selectedIpo.slug}
          </h2>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs font-mono tabular-nums">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-sans">Observation Time (IST)</th>
                  <th className="py-2.5 px-3 font-sans">Day</th>
                  <th className="py-2.5 px-3 text-right">Retail</th>
                  <th className="py-2.5 px-3 text-right">NII</th>
                  <th className="py-2.5 px-3 text-right">QIB</th>
                  <th className="py-2.5 px-3 text-right">Total Subscribed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!selectedIpo.subscription_history || selectedIpo.subscription_history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                      No subscription snapshots found for this issue.
                    </td>
                  </tr>
                ) : (
                  selectedIpo.subscription_history.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
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
      )}
    </div>
  );
};
