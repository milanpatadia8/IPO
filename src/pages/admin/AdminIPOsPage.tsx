import React, { useState, useEffect } from 'react';
import { IPO, IPOCategory, IPOExchange, IPOStatus, AnnouncementStatus, AdminUser } from '../../types/ipo';
import { api } from '../../lib/api';
import { formatIndianDate, formatCrores } from '../../lib/calculations';
import { StatusIndicator } from '../../components/StatusIndicator';
import { Plus, Edit2, Trash2, CheckCircle, Search, AlertTriangle, X } from 'lucide-react';

interface AdminIPOsPageProps {
  adminUser: AdminUser;
}

const normalizeUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export const AdminIPOsPage: React.FC<AdminIPOsPageProps> = ({ adminUser }) => {
  const [ipos, setIPOs] = useState<IPO[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIpo, setEditingIpo] = useState<IPO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [formError, setFormError] = useState('');
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Listing result modal
  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [selectedIpoForListing, setSelectedIpoForListing] = useState<IPO | null>(null);
  const [listingPriceInput, setListingPriceInput] = useState('');
  const [firstDayCloseInput, setFirstDayCloseInput] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    companyName: '',
    description: '',
    industry: '',
    category: 'Mainboard' as IPOCategory,
    exchange: 'NSE, BSE' as IPOExchange,
    status: 'upcoming' as IPOStatus,
    announcement_status: 'confirmed' as AnnouncementStatus,
    open_date: '',
    close_date: '',
    allotment_date: '',
    listing_date: '',
    price_band_min: '',
    price_band_max: '',
    issue_price: '',
    lot_size: '',
    issue_size: '',
    fresh_issue_size: '',
    offer_for_sale_size: '',
    registrar_name: '',
    registrar_url: '',
    drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
  });

  const loadIPOs = async () => {
    setLoading(true);
    try {
      const data = await api.getAllIPOs();
      setIPOs(data);
    } catch (err) {
      console.error('Failed to load IPOs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIPOs();
  }, []);

  const showBanner = (type: 'success' | 'error', message: string) => {
    setStatusBanner({ type, message });
    setTimeout(() => {
      setStatusBanner((prev) => (prev?.message === message ? null : prev));
    }, 5000);
  };

  const openCreateModal = () => {
    setEditingIpo(null);
    setFormError('');
    setFormData({
      companyName: '',
      description: '',
      industry: '',
      category: 'Mainboard',
      exchange: 'NSE, BSE',
      status: 'upcoming',
      announcement_status: 'confirmed',
      open_date: '',
      close_date: '',
      allotment_date: '',
      listing_date: '',
      price_band_min: '',
      price_band_max: '',
      issue_price: '',
      lot_size: '',
      issue_size: '',
      fresh_issue_size: '',
      offer_for_sale_size: '',
      registrar_name: 'Link Intime India Private Limited',
      registrar_url: 'https://linkintime.co.in',
      drhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
      rhp_url: 'https://www.sebi.gov.in/filings/public-issues.html',
    });
    setModalOpen(true);
  };

  const openEditModal = (ipo: IPO) => {
    setEditingIpo(ipo);
    setFormError('');
    setFormData({
      companyName: ipo.company?.name || '',
      description: ipo.company?.description || '',
      industry: ipo.company?.industry || '',
      category: ipo.category,
      exchange: ipo.exchange,
      status: ipo.status,
      announcement_status: ipo.announcement_status,
      open_date: ipo.open_date || '',
      close_date: ipo.close_date || '',
      allotment_date: ipo.allotment_date || '',
      listing_date: ipo.listing_date || '',
      price_band_min: ipo.price_band_min !== undefined ? String(ipo.price_band_min) : '',
      price_band_max: ipo.price_band_max !== undefined ? String(ipo.price_band_max) : '',
      issue_price: ipo.issue_price !== undefined ? String(ipo.issue_price) : '',
      lot_size: ipo.lot_size !== undefined ? String(ipo.lot_size) : '',
      issue_size: ipo.issue_size !== undefined ? String(ipo.issue_size) : '',
      fresh_issue_size: ipo.fresh_issue_size !== undefined ? String(ipo.fresh_issue_size) : '',
      offer_for_sale_size: ipo.offer_for_sale_size !== undefined ? String(ipo.offer_for_sale_size) : '',
      registrar_name: ipo.registrar_name || '',
      registrar_url: ipo.registrar_url || '',
      drhp_url: ipo.drhp_url || 'https://www.sebi.gov.in/filings/public-issues.html',
      rhp_url: ipo.rhp_url || 'https://www.sebi.gov.in/filings/public-issues.html',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const parseNum = (val: string, isInt = false) => {
        if (!val.trim()) return editingIpo ? null : undefined;
        const parsed = isInt ? parseInt(val, 10) : parseFloat(val);
        return Number.isFinite(parsed) ? parsed : editingIpo ? null : undefined;
      };

      const payload = {
        ...formData,
        companyName: formData.companyName.trim(),
        registrar_url: normalizeUrl(formData.registrar_url),
        drhp_url: normalizeUrl(formData.drhp_url),
        rhp_url: normalizeUrl(formData.rhp_url),
        price_band_min: parseNum(formData.price_band_min),
        price_band_max: parseNum(formData.price_band_max),
        issue_price: parseNum(formData.issue_price),
        lot_size: parseNum(formData.lot_size, true),
        issue_size: parseNum(formData.issue_size),
        fresh_issue_size: parseNum(formData.fresh_issue_size),
        offer_for_sale_size: parseNum(formData.offer_for_sale_size),
      };

      if (editingIpo) {
        const updated = await api.adminUpdateIPO(editingIpo.id, payload, adminUser);
        if (!updated) {
          throw new Error('Could not update this IPO record on the server.');
        }
        showBanner('success', `Updated "${updated.company?.name || formData.companyName}" successfully.`);
      } else {
        const created = await api.adminCreateIPO(payload, adminUser);
        showBanner('success', `Created "${created.company?.name || formData.companyName}" successfully.`);
      }

      setModalOpen(false);
      await loadIPOs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save IPO changes.';
      setFormError(msg);
      showBanner('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const ok = await api.adminDeleteIPO(deleteTarget.id, adminUser);
      if (!ok) {
        throw new Error('IPO record could not be deleted.');
      }
      const deletedName = deleteTarget.name;
      setDeleteTarget(null);
      showBanner('success', `Deleted "${deletedName}" successfully.`);
      await loadIPOs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete IPO.';
      setDeleteTarget(null);
      showBanner('error', msg);
    } finally {
      setDeleting(false);
    }
  };

  const openListingModal = (ipo: IPO) => {
    setSelectedIpoForListing(ipo);
    setListingPriceInput(ipo.price_band_max ? String(ipo.price_band_max) : '');
    setFirstDayCloseInput('');
    setListingModalOpen(true);
  };

  const handleRecordListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIpoForListing || !listingPriceInput) return;
    setSubmitting(true);
    try {
      const issuePrice = selectedIpoForListing.issue_price || selectedIpoForListing.price_band_max || 100;
      const listingPrice = parseFloat(listingPriceInput);
      const firstDayClose = firstDayCloseInput ? parseFloat(firstDayCloseInput) : listingPrice;

      await api.adminRecordListing(
        {
          ipo_id: selectedIpoForListing.id,
          issue_price: issuePrice,
          listing_price: listingPrice,
          listing_date: selectedIpoForListing.listing_date || new Date().toISOString().split('T')[0],
          first_day_close: firstDayClose,
        },
        adminUser
      );

      setListingModalOpen(false);
      showBanner('success', `Recorded listing result for "${selectedIpoForListing.company?.name || selectedIpoForListing.slug}".`);
      await loadIPOs();
    } catch (err: unknown) {
      showBanner('error', err instanceof Error ? err.message : 'Failed to record listing result.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = ipos.filter((i) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      i.company?.name.toLowerCase().includes(q) ||
      i.slug.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Create CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">IPO Record Management</h1>
          <p className="text-xs text-slate-500">
            Create, update, archive, and record listing results for Mainboard & SME offerings.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="h-9 px-3.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Create New IPO</span>
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
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
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

      {/* Search Input */}
      <div className="relative max-w-md">
        <input
          type="text"
          placeholder="Filter IPOs by name or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-md outline-none focus:border-slate-400"
        />
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Price Band</th>
                <th className="py-3 px-4 text-right">Issue Size</th>
                <th className="py-3 px-4">Close Date</th>
                <th className="py-3 px-4">Listing Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {filtered.map((ipo) => (
                <tr key={ipo.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                    <div>{ipo.company?.name || ipo.slug}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{ipo.slug}</div>
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-700">
                    {ipo.category} ({ipo.exchange})
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <StatusIndicator status={ipo.status} />
                  </td>
                  <td className="py-3 px-4 text-right text-slate-900">
                    {ipo.price_band_min && ipo.price_band_max
                      ? `₹${ipo.price_band_min} - ₹${ipo.price_band_max}`
                      : 'TBA'}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900">
                    {formatCrores(ipo.issue_size)}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-600">
                    {formatIndianDate(ipo.close_date)}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-600">
                    {formatIndianDate(ipo.listing_date)}
                  </td>
                  <td className="py-3 px-4 text-right font-sans space-x-1.5 whitespace-nowrap">
                    {ipo.status !== 'listed' && (
                      <button
                        onClick={() => openListingModal(ipo)}
                        className="px-2 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200"
                        title="Enter actual listing price outcome"
                      >
                        Listing Result
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditModal(ipo)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
                      title="Edit IPO"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: ipo.id, name: ipo.company?.name || ipo.slug })}
                      className="p-1.5 text-rose-600 hover:text-rose-900 rounded hover:bg-rose-50"
                      title="Delete IPO"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create or Edit IPO */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-2xl w-full p-6 my-auto max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingIpo ? 'Edit Offering Prospectus' : 'Create New Initial Public Offering'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded"
                    placeholder="e.g. Acme Renewable Limited"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Industry Sector</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded"
                    placeholder="e.g. Renewable Power Generation"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Business Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded"
                  placeholder="Summary of corporate operations and market standing..."
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as IPOCategory })
                    }
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                  >
                    <option value="Mainboard">Mainboard</option>
                    <option value="SME">SME</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Exchange</label>
                  <select
                    value={formData.exchange}
                    onChange={(e) =>
                      setFormData({ ...formData, exchange: e.target.value as IPOExchange })
                    }
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                  >
                    <option value="NSE, BSE">NSE, BSE</option>
                    <option value="NSE">NSE Only</option>
                    <option value="BSE">BSE Only</option>
                    <option value="NSE Emerge">NSE Emerge (SME)</option>
                    <option value="BSE SME">BSE SME</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as IPOStatus })
                    }
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="closed">Closed</option>
                    <option value="listed">Listed</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Announcement</label>
                  <select
                    value={formData.announcement_status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        announcement_status: e.target.value as AnnouncementStatus,
                      })
                    }
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="dates_announced">Dates Announced</option>
                    <option value="expected">Expected / DRHP</option>
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Open Date</label>
                  <input
                    type="date"
                    value={formData.open_date}
                    onChange={(e) => setFormData({ ...formData, open_date: e.target.value })}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Close Date</label>
                  <input
                    type="date"
                    value={formData.close_date}
                    onChange={(e) => setFormData({ ...formData, close_date: e.target.value })}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Allotment Date</label>
                  <input
                    type="date"
                    value={formData.allotment_date}
                    onChange={(e) => setFormData({ ...formData, allotment_date: e.target.value })}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Listing Date</label>
                  <input
                    type="date"
                    value={formData.listing_date}
                    onChange={(e) => setFormData({ ...formData, listing_date: e.target.value })}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
              </div>

              {/* Financial Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price Min (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.price_band_min}
                    onChange={(e) => setFormData({ ...formData, price_band_min: e.target.value })}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price Max (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.price_band_max}
                    onChange={(e) => setFormData({ ...formData, price_band_max: e.target.value })}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lot Size</label>
                  <input
                    type="number"
                    step="1"
                    value={formData.lot_size}
                    onChange={(e) => setFormData({ ...formData, lot_size: e.target.value })}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Issue Size (₹ Cr)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.issue_size}
                    onChange={(e) => setFormData({ ...formData, issue_size: e.target.value })}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
              </div>

              {/* Registrar & Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Registrar Name</label>
                  <input
                    type="text"
                    value={formData.registrar_name}
                    onChange={(e) => setFormData({ ...formData, registrar_name: e.target.value })}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Registrar URL</label>
                  <input
                    type="text"
                    placeholder="https://linkintime.co.in"
                    value={formData.registrar_url}
                    onChange={(e) => setFormData({ ...formData, registrar_url: e.target.value })}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
              </div>

              {/* Regulatory Filings (SEBI) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    RHP Document URL (SEBI / ROC)
                  </label>
                  <input
                    type="text"
                    placeholder="https://www.sebi.gov.in/filings/public-issues.html"
                    value={formData.rhp_url}
                    onChange={(e) => setFormData({ ...formData, rhp_url: e.target.value })}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded text-xs"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Defaults to SEBI Public Issues filing portal
                  </span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    DRHP Document URL (SEBI Draft)
                  </label>
                  <input
                    type="text"
                    placeholder="https://www.sebi.gov.in/filings/public-issues.html"
                    value={formData.drhp_url}
                    onChange={(e) => setFormData({ ...formData, drhp_url: e.target.value })}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded text-xs"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Defaults to SEBI Public Issues filing portal
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-900 text-white font-medium rounded hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting
                    ? editingIpo
                      ? 'Updating...'
                      : 'Saving...'
                    : editingIpo
                    ? 'Update Offering'
                    : 'Save New IPO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Listing Outcome */}
      {listingModalOpen && selectedIpoForListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Record Exchange Listing Result
            </h3>
            <p className="text-xs text-slate-500">
              Entering actual listing prices will update {selectedIpoForListing.company?.name || selectedIpoForListing.slug}&apos;s status to <strong>Listed</strong> and calculate verified listing gains.
            </p>

            <form onSubmit={handleRecordListing} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Issue Price (₹ per share)
                </label>
                <input
                  type="number"
                  disabled
                  value={selectedIpoForListing.issue_price || selectedIpoForListing.price_band_max || 0}
                  className="w-full h-8 px-2 bg-slate-100 border border-slate-200 rounded font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Actual Listing Price (Debut Price on NSE/BSE) *
                </label>
                <input
                  type="number"
                  step="0.05"
                  required
                  value={listingPriceInput}
                  onChange={(e) => setListingPriceInput(e.target.value)}
                  className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded font-mono"
                  placeholder="e.g. 2550.00"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  First-Day Closing Price (Optional)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={firstDayCloseInput}
                  onChange={(e) => setFirstDayCloseInput(e.target.value)}
                  className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded font-mono"
                  placeholder="e.g. 2345.00"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setListingModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3.5 py-1.5 bg-emerald-700 text-white font-medium rounded hover:bg-emerald-800 disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Confirm & Publish Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete IPO (In-app modal replacing blocked window.confirm) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Delete IPO Record</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong>? This action removes the IPO and its snapshots from the registry and logs an audit entry.
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
                onClick={confirmDelete}
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
