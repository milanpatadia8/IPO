import React, { useState, useEffect } from 'react';
import {
  IPO,
  IPOCategory,
  IPOExchange,
  IPOStatus,
  AnnouncementStatus,
  AdminUser,
  InvestorLotCategory,
  CategoryLotLimitsMap,
  MinInvestmentMultiples,
} from '../../types/ipo';
import { api } from '../../lib/api';
import {
  formatIndianDate,
  formatCrores,
  deriveIPOStatusFromDates,
  getEffectiveMinInvestment,
  INVESTOR_LOT_CATEGORIES,
  buildInvestmentMultiplesSchedule,
} from '../../lib/calculations';
import { StatusIndicator } from '../../components/StatusIndicator';
import { Plus, Edit2, Trash2, CheckCircle, Search, AlertTriangle, X, RotateCcw } from 'lucide-react';

interface AdminIPOsPageProps {
  adminUser: AdminUser;
}

type CategoryLotFormRow = { min_lots: string; max_lots: string };
type CategoryLotFormMap = Record<InvestorLotCategory, CategoryLotFormRow>;

const CATEGORY_LABELS: Record<InvestorLotCategory, string> = {
  Retail: 'Retail (RII)',
  Employee: 'Employee',
  Shareholder: 'Shareholder',
  sHNI: 'sHNI (Small HNI)',
  bHNI: 'bHNI (Big HNI)',
  QIB: 'QIB',
};

const createEmptyCategoryLotForm = (): CategoryLotFormMap => ({
  Retail: { min_lots: '', max_lots: '' },
  Employee: { min_lots: '', max_lots: '' },
  Shareholder: { min_lots: '', max_lots: '' },
  sHNI: { min_lots: '', max_lots: '' },
  bHNI: { min_lots: '', max_lots: '' },
  QIB: { min_lots: '', max_lots: '' },
});

const categoryLimitsToForm = (limits?: CategoryLotLimitsMap): CategoryLotFormMap => {
  const form = createEmptyCategoryLotForm();
  if (!limits) return form;
  for (const cat of INVESTOR_LOT_CATEGORIES) {
    const entry = limits[cat];
    if (entry) {
      form[cat] = {
        min_lots: entry.min_lots !== undefined ? String(entry.min_lots) : '',
        max_lots: entry.max_lots !== undefined ? String(entry.max_lots) : '',
      };
    }
  }
  return form;
};

type MinInvestmentFormState = {
  min_lots: string;
  multiple_lots: string;
  min_shares: string;
  multiple_shares: string;
  min_amount: string;
  multiple_amount: string;
  max_multiples: string;
};

const createEmptyMinInvestmentForm = (): MinInvestmentFormState => ({
  min_lots: '',
  multiple_lots: '',
  min_shares: '',
  multiple_shares: '',
  min_amount: '',
  multiple_amount: '',
  max_multiples: '',
});

const minInvestmentToForm = (m?: MinInvestmentMultiples): MinInvestmentFormState => {
  if (!m) return createEmptyMinInvestmentForm();
  return {
    min_lots: m.min_lots !== undefined ? String(m.min_lots) : '',
    multiple_lots: m.multiple_lots !== undefined ? String(m.multiple_lots) : '',
    min_shares: m.min_shares !== undefined ? String(m.min_shares) : '',
    multiple_shares: m.multiple_shares !== undefined ? String(m.multiple_shares) : '',
    min_amount: m.min_amount !== undefined ? String(m.min_amount) : '',
    multiple_amount: m.multiple_amount !== undefined ? String(m.multiple_amount) : '',
    max_multiples: m.max_multiples !== undefined ? String(m.max_multiples) : '',
  };
};

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
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | IPOCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | IPOStatus>('ALL');
  const [exchangeFilter, setExchangeFilter] = useState<'ALL' | IPOExchange>('ALL');
  const [minInvFilter, setMinInvFilter] = useState<'ALL' | 'CUSTOM' | 'MISSING'>('ALL');
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
    qib_quota_percent: '',
    nii_quota_percent: '',
    retail_quota_percent: '',
    employee_quota_percent: '',
    shareholder_quota_percent: '',
    other_quota_percent: '',
    category_lot_limits: createEmptyCategoryLotForm(),
    min_investment_multiples: createEmptyMinInvestmentForm(),
    registrar_name: '',
    registrar_url: '',
    drhp_url: '',
    rhp_url: '',
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
      qib_quota_percent: '',
      nii_quota_percent: '',
      retail_quota_percent: '',
      employee_quota_percent: '',
      shareholder_quota_percent: '',
      other_quota_percent: '',
      category_lot_limits: createEmptyCategoryLotForm(),
      min_investment_multiples: createEmptyMinInvestmentForm(),
      registrar_name: '',
      registrar_url: '',
      drhp_url: '',
      rhp_url: '',
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
      qib_quota_percent: ipo.qib_quota_percent !== undefined ? String(ipo.qib_quota_percent) : '',
      nii_quota_percent: ipo.nii_quota_percent !== undefined ? String(ipo.nii_quota_percent) : '',
      retail_quota_percent: ipo.retail_quota_percent !== undefined ? String(ipo.retail_quota_percent) : '',
      employee_quota_percent:
        ipo.employee_quota_percent !== undefined ? String(ipo.employee_quota_percent) : '',
      shareholder_quota_percent:
        ipo.shareholder_quota_percent !== undefined ? String(ipo.shareholder_quota_percent) : '',
      other_quota_percent:
        ipo.other_quota_percent !== undefined ? String(ipo.other_quota_percent) : '',
      category_lot_limits: categoryLimitsToForm(ipo.category_lot_limits),
      min_investment_multiples: minInvestmentToForm(ipo.min_investment_multiples),
      registrar_name: ipo.registrar_name || '',
      registrar_url: ipo.registrar_url || '',
      drhp_url: ipo.drhp_url || '',
      rhp_url: ipo.rhp_url || '',
    });
    setModalOpen(true);
  };

  const handleCategoryChange = (nextCategory: IPOCategory) => {
    setFormData((prev) => {
      const isSmeExchange = prev.exchange === 'NSE Emerge' || prev.exchange === 'BSE SME';
      let nextExchange: IPOExchange = prev.exchange;
      if (nextCategory === 'SME' && !isSmeExchange) {
        nextExchange = 'NSE Emerge';
      } else if (nextCategory === 'Mainboard' && isSmeExchange) {
        nextExchange = 'NSE, BSE';
      }
      return {
        ...prev,
        category: nextCategory,
        exchange: nextExchange,
      };
    });
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

      const autoStatus = deriveIPOStatusFromDates({
        open_date: formData.open_date,
        close_date: formData.close_date,
        listing_date: formData.listing_date,
        has_listing_result: Boolean(editingIpo?.listing_result),
        fallback_status: 'upcoming',
      });

      const parsedCategoryLimits: CategoryLotLimitsMap = {};
      for (const cat of INVESTOR_LOT_CATEGORIES) {
        const row = formData.category_lot_limits[cat];
        const minVal = row.min_lots.trim() ? parseInt(row.min_lots, 10) : undefined;
        const maxVal = row.max_lots.trim() ? parseInt(row.max_lots, 10) : undefined;
        const validMin = minVal !== undefined && Number.isFinite(minVal) && minVal >= 1 ? minVal : undefined;
        const validMax = maxVal !== undefined && Number.isFinite(maxVal) && maxVal >= 1 ? maxVal : undefined;
        if (validMin !== undefined || validMax !== undefined) {
          parsedCategoryLimits[cat] = {
            min_lots: validMin,
            max_lots: validMin !== undefined && validMax !== undefined ? Math.max(validMin, validMax) : validMax,
          };
        }
      }

      const mForm = formData.min_investment_multiples;
      const parsePosInt = (v: string) => {
        if (!v.trim()) return undefined;
        const n = parseInt(v, 10);
        return Number.isFinite(n) && n >= 1 ? n : undefined;
      };
      const parsePosAmt = (v: string) => {
        if (!v.trim()) return undefined;
        const n = parseFloat(v);
        return Number.isFinite(n) && n > 0 ? Number(n.toFixed(2)) : undefined;
      };
      const parsedMinMultiples: MinInvestmentMultiples = {};
      const mMinLots = parsePosInt(mForm.min_lots);
      const mMultLots = parsePosInt(mForm.multiple_lots);
      const mMinShares = parsePosInt(mForm.min_shares);
      const mMultShares = parsePosInt(mForm.multiple_shares);
      const mMinAmt = parsePosAmt(mForm.min_amount);
      const mMultAmt = parsePosAmt(mForm.multiple_amount);
      const mMaxMult = parsePosInt(mForm.max_multiples);
      if (mMinLots !== undefined) parsedMinMultiples.min_lots = mMinLots;
      if (mMultLots !== undefined) parsedMinMultiples.multiple_lots = mMultLots;
      if (mMinShares !== undefined) parsedMinMultiples.min_shares = mMinShares;
      if (mMultShares !== undefined) parsedMinMultiples.multiple_shares = mMultShares;
      if (mMinAmt !== undefined) parsedMinMultiples.min_amount = mMinAmt;
      if (mMultAmt !== undefined) parsedMinMultiples.multiple_amount = mMultAmt;
      if (mMaxMult !== undefined) parsedMinMultiples.max_multiples = mMaxMult;

      const payload = {
        ...formData,
        status: autoStatus,
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
        qib_quota_percent: parseNum(formData.qib_quota_percent),
        nii_quota_percent: parseNum(formData.nii_quota_percent),
        retail_quota_percent: parseNum(formData.retail_quota_percent),
        employee_quota_percent: parseNum(formData.employee_quota_percent),
        shareholder_quota_percent: parseNum(formData.shareholder_quota_percent),
        other_quota_percent: parseNum(formData.other_quota_percent),
        category_lot_limits:
          Object.keys(parsedCategoryLimits).length > 0
            ? parsedCategoryLimits
            : editingIpo
            ? null
            : undefined,
        min_investment_multiples:
          Object.keys(parsedMinMultiples).length > 0
            ? parsedMinMultiples
            : editingIpo
            ? null
            : undefined,
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
    if (categoryFilter !== 'ALL' && i.category !== categoryFilter) return false;
    if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;
    if (exchangeFilter !== 'ALL' && i.exchange !== exchangeFilter) return false;
    if (minInvFilter === 'CUSTOM' && !i.min_investment_multiples?.min_amount) return false;
    if (minInvFilter === 'MISSING' && getEffectiveMinInvestment(i)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (i.company?.name || '').toLowerCase().includes(q) ||
      i.slug.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      (i.company?.industry || '').toLowerCase().includes(q) ||
      (i.registrar_name || '').toLowerCase().includes(q)
    );
  });

  const hasActiveFilters =
    search.trim() !== '' ||
    categoryFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    exchangeFilter !== 'ALL' ||
    minInvFilter !== 'ALL';

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setExchangeFilter('ALL');
    setMinInvFilter('ALL');
  };

  const autoDerivedStatus: IPOStatus = deriveIPOStatusFromDates({
    open_date: formData.open_date,
    close_date: formData.close_date,
    listing_date: formData.listing_date,
    has_listing_result: Boolean(editingIpo?.listing_result),
    fallback_status: 'upcoming',
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

      {/* Search & Multi-Facet Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by company, slug, sector, or registrar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:bg-white focus:border-slate-400"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          </div>

          <div className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-md p-0.5 text-xs self-start">
            {(['ALL', 'Mainboard', 'SME'] as const).map((board) => (
              <button
                key={board}
                type="button"
                onClick={() => setCategoryFilter(board)}
                className={`px-3 py-1.5 rounded font-medium transition-colors ${
                  categoryFilter === board
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
            value={exchangeFilter}
            onChange={(e) => setExchangeFilter(e.target.value as 'ALL' | IPOExchange)}
            className="h-9 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 outline-none focus:bg-white focus:border-slate-400"
          >
            <option value="ALL">All Exchanges</option>
            <option value="NSE, BSE">NSE, BSE</option>
            <option value="NSE">NSE</option>
            <option value="BSE">BSE</option>
            <option value="NSE Emerge">NSE Emerge (SME)</option>
            <option value="BSE SME">BSE SME</option>
          </select>

          <select
            value={minInvFilter}
            onChange={(e) => setMinInvFilter(e.target.value as 'ALL' | 'CUSTOM' | 'MISSING')}
            className="h-9 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 outline-none focus:bg-white focus:border-slate-400"
          >
            <option value="ALL">Min Investment: All</option>
            <option value="CUSTOM">Custom Override Set</option>
            <option value="MISSING">Missing / TBA</option>
          </select>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
          <span>
            Showing <strong className="text-slate-800">{filtered.length}</strong> of {ipos.length} IPO(s)
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
                <th className="py-3 px-4 text-right">Min Investment</th>
                <th className="py-3 px-4 text-right">Issue Size</th>
                <th className="py-3 px-4">Open – Close</th>
                <th className="py-3 px-4">Listing Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {filtered.map((ipo) => {
                const effectiveMinInv = getEffectiveMinInvestment(ipo);
                const hasCustomMinInv = Boolean(ipo.min_investment_multiples?.min_amount);
                return (
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
                  <td className="py-3 px-4 text-right text-slate-900">
                    {effectiveMinInv ? (
                      <div>
                        <span className="font-semibold">₹{effectiveMinInv.toLocaleString('en-IN')}</span>
                        {hasCustomMinInv && (
                          <div className="text-[10px] font-sans text-[#14532D] font-medium">Custom</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">TBA</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900">
                    {formatCrores(ipo.issue_size)}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-600 whitespace-nowrap">
                    {ipo.open_date || ipo.close_date
                      ? `${formatIndianDate(ipo.open_date)} – ${formatIndianDate(ipo.close_date)}`
                      : 'TBA'}
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
                );
              })}
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
              {/* Board / Segment Selection: Mainboard vs SME */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <label className="block font-semibold text-slate-800">
                  IPO Board / Segment *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('Mainboard')}
                    className={`flex flex-col items-start px-3.5 py-2.5 rounded-md border text-left transition-all ${
                      formData.category === 'Mainboard'
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <span className="font-semibold text-xs">Mainboard IPO</span>
                    <span
                      className={`text-[11px] mt-0.5 ${
                        formData.category === 'Mainboard' ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      NSE / BSE Mainboard listings
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('SME')}
                    className={`flex flex-col items-start px-3.5 py-2.5 rounded-md border text-left transition-all ${
                      formData.category === 'SME'
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <span className="font-semibold text-xs">SME IPO</span>
                    <span
                      className={`text-[11px] mt-0.5 ${
                        formData.category === 'SME' ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      NSE Emerge / BSE SME platform
                    </span>
                  </button>
                </div>
              </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Exchange</label>
                  <select
                    value={formData.exchange}
                    onChange={(e) =>
                      setFormData({ ...formData, exchange: e.target.value as IPOExchange })
                    }
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                  >
                    {formData.category === 'SME' ? (
                      <>
                        <option value="NSE Emerge">NSE Emerge (SME)</option>
                        <option value="BSE SME">BSE SME</option>
                        <option value="NSE, BSE">NSE, BSE</option>
                        <option value="NSE">NSE Only</option>
                        <option value="BSE">BSE Only</option>
                      </>
                    ) : (
                      <>
                        <option value="NSE, BSE">NSE, BSE</option>
                        <option value="NSE">NSE Only</option>
                        <option value="BSE">BSE Only</option>
                        <option value="NSE Emerge">NSE Emerge (SME)</option>
                        <option value="BSE SME">BSE SME</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status (Auto)
                  </label>
                  <div className="w-full h-8 px-2.5 bg-slate-100 border border-slate-200 rounded flex items-center justify-between">
                    <StatusIndicator status={autoDerivedStatus} />
                    <span className="text-[10px] text-slate-500">By date</span>
                  </div>
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

              {/* Dates (Automatically control Upcoming / Open / Closed / Listed status) */}
              <div className="space-y-1.5">
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
                <p className="text-[11px] text-slate-500">
                  Status updates automatically from Open, Close, and Listing dates (Upcoming &rarr; Open &rarr; Closed &rarr; Listed).
                </p>
              </div>

              {/* Financial Specs */}
              <div className="space-y-3">
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
                    <label className="block font-semibold text-slate-700 mb-1">Lot Size (Shares)</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={formData.lot_size}
                      onChange={(e) => setFormData({ ...formData, lot_size: e.target.value })}
                      className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Total Issue Size (₹ Cr)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.issue_size}
                      onChange={(e) => setFormData({ ...formData, issue_size: e.target.value })}
                      className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                    />
                  </div>
                </div>

                {/* Direct Minimum Investment Override */}
                {(() => {
                  const lotNum = parseInt(formData.lot_size, 10) || 0;
                  const priceNum =
                    parseFloat(formData.issue_price) ||
                    parseFloat(formData.price_band_max) ||
                    parseFloat(formData.price_band_min) ||
                    0;
                  const autoCalcMin = lotNum > 0 && priceNum > 0 ? Math.round(lotNum * priceNum) : 0;
                  return (
                    <div className="p-3 bg-[#EEF6F0]/70 border border-[#C6E2CE] rounded-lg flex flex-col sm:flex-row sm:items-end gap-3">
                      <div className="flex-1">
                        <label className="block font-semibold text-[#14532D] mb-1">
                          Minimum Investment Value (₹)
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="1"
                          placeholder={
                            autoCalcMin > 0
                              ? `Auto: ₹${autoCalcMin.toLocaleString('en-IN')} (Price Max × Lot Size)`
                              : 'e.g. 14950 or 228000'
                          }
                          value={formData.min_investment_multiples.min_amount}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              min_investment_multiples: {
                                ...prev.min_investment_multiples,
                                min_amount: e.target.value,
                              },
                            }))
                          }
                          className="w-full h-8 px-2.5 bg-white border border-[#C6E2CE] rounded font-mono tabular-nums text-slate-900 focus:outline-none focus:border-[#14532D]"
                        />
                      </div>
                      <p className="text-[11px] text-[#3F624D] sm:max-w-xs leading-snug">
                        Directly sets the Minimum Investment shown across the Home, Open, Upcoming, Detail, and Calculator pages. Leave blank to auto-calculate from Price Max × Lot Size.
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Minimum Investment in Multiples */}
              {(() => {
                const lotSizeNum = parseInt(formData.lot_size, 10) || 0;
                const upperPriceNum =
                  parseFloat(formData.issue_price) ||
                  parseFloat(formData.price_band_max) ||
                  parseFloat(formData.price_band_min) ||
                  0;
                const mf = formData.min_investment_multiples;

                const updateMultiplesField = (patch: Partial<MinInvestmentFormState>) => {
                  setFormData((prev) => ({
                    ...prev,
                    min_investment_multiples: {
                      ...prev.min_investment_multiples,
                      ...patch,
                    },
                  }));
                };

                const handleAutoCalculateMultiples = () => {
                  const defaultMinLots = formData.category === 'SME' ? 2 : 1;
                  const defaultMultLots = 1;
                  const minLotsVal = parseInt(mf.min_lots, 10) || defaultMinLots;
                  const multLotsVal = parseInt(mf.multiple_lots, 10) || defaultMultLots;
                  const minSh = lotSizeNum > 0 ? minLotsVal * lotSizeNum : 0;
                  const multSh = lotSizeNum > 0 ? multLotsVal * lotSizeNum : 0;
                  const minAmt = minSh > 0 && upperPriceNum > 0 ? Math.round(minSh * upperPriceNum) : 0;
                  const multAmt = multSh > 0 && upperPriceNum > 0 ? Math.round(multSh * upperPriceNum) : 0;
                  const retailMax =
                    formData.category === 'Mainboard' && minAmt > 0 && multAmt > 0
                      ? Math.max(1, 1 + Math.floor(Math.max(0, 200000 - minAmt) / multAmt))
                      : undefined;

                  updateMultiplesField({
                    min_lots: String(minLotsVal),
                    multiple_lots: String(multLotsVal),
                    min_shares: minSh > 0 ? String(minSh) : mf.min_shares,
                    multiple_shares: multSh > 0 ? String(multSh) : mf.multiple_shares,
                    min_amount: minAmt > 0 ? String(minAmt) : mf.min_amount,
                    multiple_amount: multAmt > 0 ? String(multAmt) : mf.multiple_amount,
                    max_multiples:
                      mf.max_multiples || (retailMax && retailMax > 1 ? String(retailMax) : ''),
                  });
                };

                const previewInput: MinInvestmentMultiples | undefined =
                  mf.min_lots ||
                  mf.multiple_lots ||
                  mf.min_shares ||
                  mf.multiple_shares ||
                  mf.min_amount ||
                  mf.multiple_amount
                    ? {
                        min_lots: parseInt(mf.min_lots, 10) || undefined,
                        multiple_lots: parseInt(mf.multiple_lots, 10) || undefined,
                        min_shares: parseInt(mf.min_shares, 10) || undefined,
                        multiple_shares: parseInt(mf.multiple_shares, 10) || undefined,
                        min_amount: parseFloat(mf.min_amount) || undefined,
                        multiple_amount: parseFloat(mf.multiple_amount) || undefined,
                        max_multiples: parseInt(mf.max_multiples, 10) || undefined,
                      }
                    : undefined;

                const schedulePreview = buildInvestmentMultiplesSchedule({
                  min_investment_multiples: previewInput,
                  lot_size: lotSizeNum || undefined,
                  price_per_share: upperPriceNum || undefined,
                  previewCount: 5,
                });

                return (
                  <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-slate-800 block">
                          Minimum Investment in Multiples
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Configure minimum lots/shares/amount and step multiples (e.g. 1 Lot min, in multiples of 1 Lot thereafter).
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={handleAutoCalculateMultiples}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-medium transition-colors"
                        >
                          Auto-Calculate
                        </button>
                        <button
                          type="button"
                          onClick={() => updateMultiplesField(createEmptyMinInvestmentForm())}
                          className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded text-[11px]"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">
                          Min Lots
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder={formData.category === 'SME' ? 'e.g. 2' : 'e.g. 1'}
                          value={mf.min_lots}
                          onChange={(e) => {
                            const nextVal = e.target.value;
                            const n = parseInt(nextVal, 10);
                            const patch: Partial<MinInvestmentFormState> = { min_lots: nextVal };
                            if (Number.isFinite(n) && n >= 1 && lotSizeNum > 0) {
                              const sh = n * lotSizeNum;
                              patch.min_shares = String(sh);
                              if (upperPriceNum > 0) {
                                patch.min_amount = String(Math.round(sh * upperPriceNum));
                              }
                            }
                            updateMultiplesField(patch);
                          }}
                          className="w-full h-8 px-2 bg-white border border-slate-200 rounded tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block font-medium text-slate-700 mb-1">
                          In Multiples of (Lots)
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="e.g. 1"
                          value={mf.multiple_lots}
                          onChange={(e) => {
                            const nextVal = e.target.value;
                            const n = parseInt(nextVal, 10);
                            const patch: Partial<MinInvestmentFormState> = { multiple_lots: nextVal };
                            if (Number.isFinite(n) && n >= 1 && lotSizeNum > 0) {
                              const sh = n * lotSizeNum;
                              patch.multiple_shares = String(sh);
                              if (upperPriceNum > 0) {
                                patch.multiple_amount = String(Math.round(sh * upperPriceNum));
                              }
                            }
                            updateMultiplesField(patch);
                          }}
                          className="w-full h-8 px-2 bg-white border border-slate-200 rounded tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block font-medium text-slate-700 mb-1">
                          Min Shares
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder={lotSizeNum > 0 ? String(lotSizeNum) : 'Shares'}
                          value={mf.min_shares}
                          onChange={(e) => {
                            const nextVal = e.target.value;
                            const n = parseInt(nextVal, 10);
                            const patch: Partial<MinInvestmentFormState> = { min_shares: nextVal };
                            if (Number.isFinite(n) && n >= 1 && upperPriceNum > 0) {
                              patch.min_amount = String(Math.round(n * upperPriceNum));
                            }
                            updateMultiplesField(patch);
                          }}
                          className="w-full h-8 px-2 bg-white border border-slate-200 rounded tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block font-medium text-slate-700 mb-1">
                          Multiple of (Shares)
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder={lotSizeNum > 0 ? String(lotSizeNum) : 'Shares'}
                          value={mf.multiple_shares}
                          onChange={(e) => {
                            const nextVal = e.target.value;
                            const n = parseInt(nextVal, 10);
                            const patch: Partial<MinInvestmentFormState> = {
                              multiple_shares: nextVal,
                            };
                            if (Number.isFinite(n) && n >= 1 && upperPriceNum > 0) {
                              patch.multiple_amount = String(Math.round(n * upperPriceNum));
                            }
                            updateMultiplesField(patch);
                          }}
                          className="w-full h-8 px-2 bg-white border border-slate-200 rounded tabular-nums"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block font-medium text-slate-700 mb-1">
                          Minimum Investment (₹)
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          placeholder="e.g. 14200"
                          value={mf.min_amount}
                          onChange={(e) => updateMultiplesField({ min_amount: e.target.value })}
                          className="w-full h-8 px-2 bg-white border border-slate-200 rounded tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block font-medium text-slate-700 mb-1">
                          Each Additional Multiple (₹)
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          placeholder="e.g. 14200"
                          value={mf.multiple_amount}
                          onChange={(e) => updateMultiplesField({ multiple_amount: e.target.value })}
                          className="w-full h-8 px-2 bg-white border border-slate-200 rounded tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block font-medium text-slate-700 mb-1">
                          Max Multiples (Optional)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          step="1"
                          placeholder="e.g. 13 (Retail max)"
                          value={mf.max_multiples}
                          onChange={(e) => updateMultiplesField({ max_multiples: e.target.value })}
                          className="w-full h-8 px-2 bg-white border border-slate-200 rounded tabular-nums"
                        />
                      </div>
                    </div>

                    {schedulePreview && schedulePreview.rows.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-slate-700 block">
                          Live Multiples Preview
                        </span>
                        <div className="overflow-x-auto border border-slate-200 rounded bg-white">
                          <table className="w-full text-left text-[11px] tabular-nums">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                              <tr>
                                <th className="py-1.5 px-2.5 font-semibold">Multiple</th>
                                <th className="py-1.5 px-2.5 text-right font-semibold">Lots</th>
                                <th className="py-1.5 px-2.5 text-right font-semibold">Shares</th>
                                <th className="py-1.5 px-2.5 text-right font-semibold">Investment (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {schedulePreview.rows.map((r) => (
                                <tr key={r.step}>
                                  <td className="py-1.5 px-2.5 font-medium text-slate-800">{r.label}</td>
                                  <td className="py-1.5 px-2.5 text-right text-slate-600">{r.lots}</td>
                                  <td className="py-1.5 px-2.5 text-right text-slate-600">
                                    {r.shares > 0 ? r.shares.toLocaleString('en-IN') : '—'}
                                  </td>
                                  <td className="py-1.5 px-2.5 text-right font-semibold text-slate-900">
                                    {r.amount > 0 ? `₹${r.amount.toLocaleString('en-IN')}` : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Fresh Issue & Offer for Sale (OFS) */}
              <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Issue Structure (Fresh Issue &amp; OFS)</span>
                  <span className="text-[11px] text-slate-500">Values in ₹ Crores</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Fresh Issue (₹ Cr)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 500"
                      value={formData.fresh_issue_size}
                      onChange={(e) => setFormData({ ...formData, fresh_issue_size: e.target.value })}
                      className="w-full h-8 px-2 bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Offer for Sale — OFS (₹ Cr)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 250"
                      value={formData.offer_for_sale_size}
                      onChange={(e) => setFormData({ ...formData, offer_for_sale_size: e.target.value })}
                      className="w-full h-8 px-2 bg-white border border-slate-200 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Quota Distribution (%) */}
              <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Quota Distribution (%)</span>
                  <span className="text-[11px] font-medium text-slate-600 tabular-nums">
                    Total:{' '}
                    {(
                      (parseFloat(formData.qib_quota_percent) || 0) +
                      (parseFloat(formData.nii_quota_percent) || 0) +
                      (parseFloat(formData.retail_quota_percent) || 0) +
                      (parseFloat(formData.employee_quota_percent) || 0) +
                      (parseFloat(formData.shareholder_quota_percent) || 0) +
                      (parseFloat(formData.other_quota_percent) || 0)
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">QIB Quota (%)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      placeholder="Optional"
                      value={formData.qib_quota_percent}
                      onChange={(e) => setFormData({ ...formData, qib_quota_percent: e.target.value })}
                      className="w-full h-8 px-2 bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">NII / HNI Quota (%)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      placeholder="Optional"
                      value={formData.nii_quota_percent}
                      onChange={(e) => setFormData({ ...formData, nii_quota_percent: e.target.value })}
                      className="w-full h-8 px-2 bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Retail Quota (%)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      placeholder="Optional"
                      value={formData.retail_quota_percent}
                      onChange={(e) => setFormData({ ...formData, retail_quota_percent: e.target.value })}
                      className="w-full h-8 px-2 bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Employee Quota (%)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      placeholder="Optional"
                      value={formData.employee_quota_percent}
                      onChange={(e) => setFormData({ ...formData, employee_quota_percent: e.target.value })}
                      className="w-full h-8 px-2 bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Shareholder Quota (%)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      placeholder="Optional"
                      value={formData.shareholder_quota_percent}
                      onChange={(e) => setFormData({ ...formData, shareholder_quota_percent: e.target.value })}
                      className="w-full h-8 px-2 bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Other / Market Maker (%)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      placeholder="Optional"
                      value={formData.other_quota_percent}
                      onChange={(e) => setFormData({ ...formData, other_quota_percent: e.target.value })}
                      className="w-full h-8 px-2 bg-white border border-slate-200 rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Category-wise Lots to Apply (Retail, Employee, Shareholder, sHNI, bHNI, QIB) */}
              <div className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg space-y-2.5">
                <div>
                  <span className="font-semibold text-slate-800 block">
                    Number of Lots to Apply (By Category)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Set minimum and maximum lots allowed for Retail, Employee, Shareholder, sHNI, bHNI, and QIB. Only entered categories will be shown.
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-2 px-2.5 font-semibold">Category</th>
                        <th className="py-2 px-2.5 font-semibold">Min Lots</th>
                        <th className="py-2 px-2.5 font-semibold">Max Lots</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Shares &amp; Investment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {INVESTOR_LOT_CATEGORIES.map((cat) => {
                        const row = formData.category_lot_limits[cat];
                        const lotSizeNum = parseInt(formData.lot_size, 10) || 0;
                        const upperPriceNum =
                          parseFloat(formData.issue_price) ||
                          parseFloat(formData.price_band_max) ||
                          parseFloat(formData.price_band_min) ||
                          0;
                        const minL = parseInt(row.min_lots, 10) || 0;
                        const maxL = parseInt(row.max_lots, 10) || 0;
                        const minSharesVal = lotSizeNum > 0 && minL > 0 ? minL * lotSizeNum : 0;
                        const maxSharesVal = lotSizeNum > 0 && maxL > 0 ? maxL * lotSizeNum : 0;
                        const minAmtVal = minSharesVal > 0 && upperPriceNum > 0 ? Math.round(minSharesVal * upperPriceNum) : 0;
                        const maxAmtVal = maxSharesVal > 0 && upperPriceNum > 0 ? Math.round(maxSharesVal * upperPriceNum) : 0;
                        return (
                          <tr key={cat}>
                            <td className="py-1.5 px-2.5 font-medium text-slate-800 whitespace-nowrap">
                              {CATEGORY_LABELS[cat]}
                            </td>
                            <td className="py-1.5 px-2.5">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                placeholder="Min"
                                value={row.min_lots}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    category_lot_limits: {
                                      ...formData.category_lot_limits,
                                      [cat]: { ...row, min_lots: e.target.value },
                                    },
                                  })
                                }
                                className="w-20 h-7 px-2 bg-slate-50 border border-slate-200 rounded tabular-nums"
                              />
                            </td>
                            <td className="py-1.5 px-2.5">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                placeholder="Max / No cap"
                                value={row.max_lots}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    category_lot_limits: {
                                      ...formData.category_lot_limits,
                                      [cat]: { ...row, max_lots: e.target.value },
                                    },
                                  })
                                }
                                className="w-24 h-7 px-2 bg-slate-50 border border-slate-200 rounded tabular-nums"
                              />
                            </td>
                            <td className="py-1.5 px-2.5 text-right text-slate-500 tabular-nums whitespace-nowrap">
                              {lotSizeNum > 0 && (minL > 0 || maxL > 0) ? (
                                <div>
                                  <div>
                                    {maxL > 0 && minL > 0
                                      ? `${minSharesVal.toLocaleString('en-IN')} – ${maxSharesVal.toLocaleString('en-IN')} sh`
                                      : minL > 0
                                      ? `${minSharesVal.toLocaleString('en-IN')}+ sh`
                                      : `Up to ${maxSharesVal.toLocaleString('en-IN')} sh`}
                                  </div>
                                  {(minAmtVal > 0 || maxAmtVal > 0) && (
                                    <div className="text-[10px] font-semibold text-slate-800">
                                      {minAmtVal > 0 && maxAmtVal > 0
                                        ? `₹${minAmtVal.toLocaleString('en-IN')} – ₹${maxAmtVal.toLocaleString('en-IN')}`
                                        : minAmtVal > 0
                                        ? `₹${minAmtVal.toLocaleString('en-IN')}+`
                                        : `Up to ₹${maxAmtVal.toLocaleString('en-IN')}`}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Registrar & Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Registrar Name</label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={formData.registrar_name}
                    onChange={(e) => setFormData({ ...formData, registrar_name: e.target.value })}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Registrar URL</label>
                  <input
                    type="text"
                    placeholder="Paste registrar link (optional)"
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
                    placeholder="Paste RHP link (optional)"
                    value={formData.rhp_url}
                    onChange={(e) => setFormData({ ...formData, rhp_url: e.target.value })}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded text-xs"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Only displayed on the IPO page when you attach a link
                  </span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    DRHP Document URL (SEBI Draft)
                  </label>
                  <input
                    type="text"
                    placeholder="Paste DRHP link (optional)"
                    value={formData.drhp_url}
                    onChange={(e) => setFormData({ ...formData, drhp_url: e.target.value })}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded text-xs"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Only displayed on the IPO page when you attach a link
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
