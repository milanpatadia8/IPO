import React, { useState, useEffect, useMemo } from 'react';
import {
  AdminUser,
  ClientRecord,
  ClientStatus,
  FeePaymentStatus,
  PaymentMode,
} from '../../types/ipo';
import { api, IPOApplication } from '../../lib/api';
import { formatIndianDate, formatIndianTimestamp } from '../../lib/calculations';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  IndianRupee,
  Receipt,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';

interface AdminClientsPageProps {
  adminUser: AdminUser;
}

const PAYMENT_MODES: PaymentMode[] = [
  'UPI',
  'NEFT/IMPS',
  'Bank Transfer',
  'Card',
  'Cash',
  'Cheque',
  'Other',
];

function formatRupees(amount: number): string {
  return `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

export const AdminClientsPage: React.FC<AdminClientsPageProps> = ({ adminUser: _adminUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<'clients' | 'applications'>('clients');
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [applications, setApplications] = useState<IPOApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [feeFilter, setFeeFilter] = useState<FeePaymentStatus | 'all'>('all');
  const [clientStatusFilter, setClientStatusFilter] = useState<ClientStatus | 'all'>('all');
  const [appSearch, setAppSearch] = useState('');
  const [appBoardFilter, setAppBoardFilter] = useState<'all' | 'Mainboard' | 'SME'>('all');
  const [appCategoryFilter, setAppCategoryFilter] = useState<string>('all');
  const [appStatusFilter, setAppStatusFilter] = useState<'all' | 'submitted' | 'cancelled'>('all');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add / Edit Client Modal
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [savingClient, setSavingClient] = useState(false);
  const [formError, setFormError] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pan, setPan] = useState('');
  const [dematId, setDematId] = useState('');
  const [clientCode, setClientCode] = useState('');
  const [servicePlan, setServicePlan] = useState('');
  const [clientStatus, setClientStatus] = useState<ClientStatus>('active');
  const [joinedDate, setJoinedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [totalFeeAgreed, setTotalFeeAgreed] = useState('');
  const [feeDueDate, setFeeDueDate] = useState('');
  const [feeWaived, setFeeWaived] = useState(false);
  const [initialFeePaid, setInitialFeePaid] = useState('');
  const [initialPaymentMode, setInitialPaymentMode] = useState<PaymentMode>('UPI');
  const [initialPaymentDate, setInitialPaymentDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [initialPaymentRef, setInitialPaymentRef] = useState('');
  const [notes, setNotes] = useState('');

  // Payment Ledger Modal
  const [ledgerClient, setLedgerClient] = useState<ClientRecord | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payMode, setPayMode] = useState<PaymentMode>('UPI');
  const [payRef, setPayRef] = useState('');
  const [payDesc, setPayDesc] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState('');

  // Inline delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => {
      setNotice((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientList, appList] = await Promise.all([
        api.adminGetClients(),
        api.adminGetAllApplications(),
      ]);
      setClients(clientList);
      setApplications(appList);
      if (ledgerClient) {
        const refreshed = clientList.find((c) => c.id === ledgerClient.id) || null;
        setLedgerClient(refreshed);
      }
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to load client records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const activeCount = clients.filter((c) => c.status === 'active').length;
    const totalAgreed = clients.reduce((s, c) => s + (c.total_fee_agreed || 0), 0);
    const totalPaid = clients.reduce((s, c) => s + (c.total_fee_paid || 0), 0);
    const totalDue = clients.reduce((s, c) => s + (c.balance_due || 0), 0);
    return { activeCount, totalAgreed, totalPaid, totalDue };
  }, [clients]);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (feeFilter !== 'all' && c.fee_status !== feeFilter) return false;
      if (clientStatusFilter !== 'all' && c.status !== clientStatusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = [
          c.full_name,
          c.email,
          c.phone,
          c.pan,
          c.demat_id,
          c.client_code,
          c.service_plan,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [clients, feeFilter, clientStatusFilter, search]);

  const filteredApplications = useMemo(() => {
    const q = appSearch.trim().toLowerCase();
    return applications.filter((app) => {
      if (appBoardFilter !== 'all' && app.category !== appBoardFilter) return false;
      if (appCategoryFilter !== 'all' && app.investorCategory !== appCategoryFilter) return false;
      if (appStatusFilter !== 'all' && app.status !== appStatusFilter) return false;
      if (q) {
        const hay = [
          app.userName,
          app.userEmail,
          app.companyName,
          app.pan,
          app.upiId,
          app.investorCategory,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [applications, appBoardFilter, appCategoryFilter, appStatusFilter, appSearch]);

  const openCreateModal = () => {
    const today = new Date().toISOString().slice(0, 10);
    setEditingClient(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setPan('');
    setDematId('');
    setClientCode('');
    setServicePlan('');
    setClientStatus('active');
    setJoinedDate(today);
    setTotalFeeAgreed('');
    setFeeDueDate('');
    setFeeWaived(false);
    setInitialFeePaid('');
    setInitialPaymentMode('UPI');
    setInitialPaymentDate(today);
    setInitialPaymentRef('');
    setNotes('');
    setFormError('');
    setClientModalOpen(true);
  };

  const openEditModal = (client: ClientRecord) => {
    setEditingClient(client);
    setFullName(client.full_name);
    setEmail(client.email || '');
    setPhone(client.phone || '');
    setPan(client.pan || '');
    setDematId(client.demat_id || '');
    setClientCode(client.client_code || '');
    setServicePlan(client.service_plan || '');
    setClientStatus(client.status);
    setJoinedDate(client.joined_date || new Date().toISOString().slice(0, 10));
    setTotalFeeAgreed(String(client.total_fee_agreed ?? 0));
    setFeeDueDate(client.fee_due_date || '');
    setFeeWaived(Boolean(client.fee_waived));
    setInitialFeePaid('');
    setNotes(client.notes || '');
    setFormError('');
    setClientModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSavingClient(true);
    try {
      const basePayload = {
        full_name: fullName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        pan: pan.trim().toUpperCase() || null,
        demat_id: dematId.trim() || null,
        client_code: clientCode.trim() || null,
        service_plan: servicePlan.trim() || null,
        status: clientStatus,
        joined_date: joinedDate,
        total_fee_agreed: totalFeeAgreed === '' ? 0 : Number(totalFeeAgreed),
        fee_due_date: feeDueDate || null,
        fee_waived: feeWaived,
        notes: notes.trim() || null,
      };

      if (editingClient) {
        await api.adminUpdateClient(editingClient.id, basePayload);
        showNotice('success', `Updated client record for ${fullName.trim()}.`);
      } else {
        await api.adminCreateClient({
          ...basePayload,
          initial_fee_paid: initialFeePaid === '' ? 0 : Number(initialFeePaid),
          initial_payment_mode: initialPaymentMode,
          initial_payment_date: initialPaymentDate,
          initial_payment_ref: initialPaymentRef.trim() || undefined,
        });
        showNotice('success', `Added client ${fullName.trim()} to directory.`);
      }

      setClientModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save client record.');
    } finally {
      setSavingClient(false);
    }
  };

  const handleDeleteClient = async (client: ClientRecord) => {
    try {
      await api.adminDeleteClient(client.id);
      setConfirmDeleteId(null);
      if (ledgerClient?.id === client.id) setLedgerClient(null);
      showNotice('success', `Removed client ${client.full_name}.`);
      await loadData();
    } catch (err) {
      showNotice('error', err instanceof Error ? err.message : 'Failed to delete client.');
    }
  };

  const openPaymentLedger = (client: ClientRecord) => {
    setLedgerClient(client);
    setPayAmount(client.balance_due > 0 ? String(client.balance_due) : '');
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayMode('UPI');
    setPayRef('');
    setPayDesc('');
    setPayError('');
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerClient) return;
    setPayError('');
    setPayBusy(true);
    try {
      const updated = await api.adminAddClientPayment(ledgerClient.id, {
        amount: Number(payAmount),
        payment_date: payDate,
        payment_mode: payMode,
        reference_no: payRef.trim() || undefined,
        description: payDesc.trim() || undefined,
      });
      setLedgerClient(updated);
      setPayAmount('');
      setPayRef('');
      setPayDesc('');
      showNotice('success', `Recorded fee payment for ${updated.full_name}.`);
      await loadData();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Unable to record payment.');
    } finally {
      setPayBusy(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!ledgerClient) return;
    setPayBusy(true);
    try {
      const updated = await api.adminDeleteClientPayment(ledgerClient.id, paymentId);
      setLedgerClient(updated);
      showNotice('success', 'Payment entry removed.');
      await loadData();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Unable to remove payment.');
    } finally {
      setPayBusy(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Client Code',
      'Full Name',
      'Email',
      'Phone',
      'PAN',
      'Demat ID',
      'Service Plan',
      'Client Status',
      'Joined Date',
      'Fees Agreed (INR)',
      'Fees Paid (INR)',
      'Balance Due (INR)',
      'Fee Status',
      'Fee Due Date',
      'Notes',
    ];
    const rows = filteredClients.map((c) =>
      [
        c.client_code || '',
        c.full_name,
        c.email || '',
        c.phone || '',
        c.pan || '',
        c.demat_id || '',
        c.service_plan || '',
        c.status,
        c.joined_date,
        c.total_fee_agreed,
        c.total_fee_paid,
        c.balance_due,
        c.fee_status,
        c.fee_due_date || '',
        c.notes || '',
      ]
        .map(escapeCsvCell)
        .join(',')
    );

    const csv = [headers.map(escapeCsvCell).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clients-fees-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderFeeStatusBadge = (status: FeePaymentStatus) => {
    switch (status) {
      case 'paid':
        return (
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            Paid
          </span>
        );
      case 'partial':
        return (
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            Partial
          </span>
        );
      case 'pending':
        return (
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
            Pending
          </span>
        );
      case 'waived':
      default:
        return (
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
            No Fee / Waived
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#111827]">Client Data &amp; Fees Ledger</h1>
          <p className="text-sm text-[#4B5563]">
            Manage client KYC details, service plans, fees billed, payments received, pending balances, and IPO application history.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {activeSubTab === 'clients' && (
            <>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={filteredClients.length === 0}
                className="h-9 px-3 text-xs font-medium bg-white border border-[#E5E7EB] hover:bg-[#FAFAFA] text-[#111827] rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                className="h-9 px-3.5 text-xs font-semibold text-white bg-[#111827] hover:bg-[#1F2937] rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Client</span>
              </button>
            </>
          )}
        </div>
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

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#EAEAEA] rounded-xl p-4">
          <span className="text-xs font-medium text-[#6B7280] block">Total Clients</span>
          <span className="text-2xl font-bold tabular-nums text-[#111827] mt-1 block">
            {clients.length}
          </span>
          <span className="text-xs text-[#4B5563] mt-0.5 block">
            {stats.activeCount} Active
          </span>
        </div>

        <div className="bg-white border border-[#EAEAEA] rounded-xl p-4">
          <span className="text-xs font-medium text-[#6B7280] block">Total Fees Agreed</span>
          <span className="text-2xl font-bold tabular-nums text-[#111827] mt-1 block">
            {formatRupees(stats.totalAgreed)}
          </span>
          <span className="text-xs text-[#4B5563] mt-0.5 block">Billed across clients</span>
        </div>

        <div className="bg-white border border-[#EAEAEA] rounded-xl p-4">
          <span className="text-xs font-medium text-[#6B7280] block">Fees Paid / Collected</span>
          <span className="text-2xl font-bold tabular-nums text-[#16A34A] mt-1 block">
            {formatRupees(stats.totalPaid)}
          </span>
          <span className="text-xs text-[#16A34A] mt-0.5 block">Verified receipts</span>
        </div>

        <div className="bg-white border border-[#EAEAEA] rounded-xl p-4">
          <span className="text-xs font-medium text-[#6B7280] block">Pending Balance Due</span>
          <span
            className={`text-2xl font-bold tabular-nums mt-1 block ${
              stats.totalDue > 0 ? 'text-amber-700' : 'text-[#111827]'
            }`}
          >
            {formatRupees(stats.totalDue)}
          </span>
          <span className="text-xs text-[#4B5563] mt-0.5 block">Outstanding receivables</span>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[#F3F4F6] rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab('clients')}
          className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'clients'
              ? 'bg-white text-[#111827] shadow-2xs'
              : 'text-[#4B5563] hover:text-[#111827]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Client Directory &amp; Fees ({clients.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('applications')}
          className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'applications'
              ? 'bg-white text-[#111827] shadow-2xs'
              : 'text-[#4B5563] hover:text-[#111827]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>IPO Applications ({applications.length})</span>
        </button>
      </div>

      {activeSubTab === 'clients' ? (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-white border border-[#EAEAEA] rounded-xl p-3.5 space-y-2.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by client name, email, phone, PAN, code, or plan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9.5 pl-9 pr-3 text-sm bg-[#FAFAFA] border border-[#E5E7EB] focus:bg-white focus:border-[#111827] rounded-lg outline-none text-[#111827]"
                />
              </div>

              <select
                value={clientStatusFilter}
                onChange={(e) => setClientStatusFilter(e.target.value as ClientStatus | 'all')}
                className="h-9.5 px-3 text-xs bg-[#FAFAFA] border border-[#E5E7EB] focus:bg-white focus:border-[#111827] rounded-lg outline-none text-[#111827]"
              >
                <option value="all">All Client Statuses</option>
                <option value="active">Active</option>
                <option value="lead">Lead</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>

              <div className="flex items-center gap-1 p-1 bg-[#F3F4F6] rounded-lg overflow-x-auto">
                {(
                  [
                    { id: 'all', label: 'All Fees' },
                    { id: 'paid', label: 'Paid' },
                    { id: 'partial', label: 'Partial' },
                    { id: 'pending', label: 'Pending' },
                    { id: 'waived', label: 'No Fee' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFeeFilter(opt.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      feeFilter === opt.id
                        ? 'bg-white text-[#111827] shadow-2xs'
                        : 'text-[#4B5563] hover:text-[#111827]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#6B7280]">
              <span>
                Showing <strong className="text-[#111827]">{filteredClients.length}</strong> of{' '}
                {clients.length} client(s)
              </span>
              {(search.trim() !== '' || feeFilter !== 'all' || clientStatusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setFeeFilter('all');
                    setClientStatusFilter('all');
                  }}
                  className="inline-flex items-center gap-1 text-[#111827] font-medium hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Client Table */}
          <div className="bg-white border border-[#EAEAEA] rounded-xl overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] border-b border-[#EAEAEA] text-[#4B5563] font-semibold">
                  <tr>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-3">PAN / Demat</th>
                    <th className="py-3 px-3">Plan</th>
                    <th className="py-3 px-3 text-right">Fee Agreed</th>
                    <th className="py-3 px-3 text-right">Fee Paid</th>
                    <th className="py-3 px-3 text-right">Balance</th>
                    <th className="py-3 px-3">Fee Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#6B7280]">
                        Loading client records...
                      </td>
                    </tr>
                  ) : filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center space-y-2">
                        <p className="text-sm font-medium text-[#111827]">
                          {clients.length === 0
                            ? 'No clients recorded yet'
                            : 'No clients match your search or filter'}
                        </p>
                        <p className="text-xs text-[#6B7280]">
                          {clients.length === 0
                            ? 'Click "Add Client" to record client KYC details, advisory plans, and fees paid.'
                            : 'Try clearing the search query or switching the fee status filter.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-sm text-[#111827]">
                            {client.full_name}
                          </div>
                          <div className="text-[11px] text-[#6B7280] flex items-center gap-1.5 mt-0.5">
                            <span className="capitalize">{client.status}</span>
                            {client.client_code && (
                              <>
                                <span>·</span>
                                <span className="font-mono">{client.client_code}</span>
                              </>
                            )}
                            <span>·</span>
                            <span>Joined {formatIndianDate(client.joined_date)}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-[#4B5563]">
                          <div>{client.email || '—'}</div>
                          {client.phone && (
                            <div className="text-[11px] text-[#6B7280] tabular-nums">
                              {client.phone}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-3 font-mono text-[11px] text-[#4B5563]">
                          <div>{client.pan || '—'}</div>
                          {client.demat_id && (
                            <div className="text-[#6B7280] truncate max-w-[130px]" title={client.demat_id}>
                              {client.demat_id}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-[#111827]">
                          <div>{client.service_plan || '—'}</div>
                          {client.fee_due_date && client.balance_due > 0 && (
                            <div className="text-[11px] text-amber-700">
                              Due {formatIndianDate(client.fee_due_date)}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right tabular-nums font-medium text-[#111827]">
                          {formatRupees(client.total_fee_agreed)}
                        </td>

                        <td className="py-3.5 px-3 text-right tabular-nums font-semibold text-[#16A34A]">
                          {formatRupees(client.total_fee_paid)}
                          {client.payments.length > 0 && (
                            <div className="text-[10px] font-normal text-[#6B7280]">
                              {client.payments.length} receipt{client.payments.length > 1 ? 's' : ''}
                            </div>
                          )}
                        </td>

                        <td
                          className={`py-3.5 px-3 text-right tabular-nums font-semibold ${
                            client.balance_due > 0 ? 'text-amber-700' : 'text-[#6B7280]'
                          }`}
                        >
                          {formatRupees(client.balance_due)}
                        </td>

                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {renderFeeStatusBadge(client.fee_status)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {confirmDeleteId === client.id ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDeleteClient(client)}
                                className="px-2 py-1 text-xs font-medium bg-[#DC2626] text-white rounded hover:bg-red-700"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 text-xs font-medium bg-white border border-[#E5E7EB] text-[#4B5563] rounded hover:bg-[#FAFAFA]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openPaymentLedger(client)}
                                className="px-2.5 py-1 text-xs font-medium bg-[#111827] hover:bg-[#1F2937] text-white rounded-md transition-colors inline-flex items-center gap-1"
                                title="Record or view fee payments"
                              >
                                <IndianRupee className="w-3 h-3" />
                                <span>Fees</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(client)}
                                className="p-1.5 text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-md transition-colors"
                                title="Edit client"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(client.id)}
                                className="p-1.5 text-[#6B7280] hover:text-[#DC2626] hover:bg-red-50 rounded-md transition-colors"
                                title="Delete client"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* IPO Applications Sub-Tab */
        <div className="space-y-4">
          {/* Applications Filter Bar */}
          <div className="bg-white border border-[#EAEAEA] rounded-xl p-3.5 space-y-2.5">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by applicant, email, IPO, PAN, or UPI..."
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  className="w-full h-9.5 pl-9 pr-3 text-sm bg-[#FAFAFA] border border-[#E5E7EB] focus:bg-white focus:border-[#111827] rounded-lg outline-none text-[#111827]"
                />
              </div>

              <select
                value={appBoardFilter}
                onChange={(e) => setAppBoardFilter(e.target.value as 'all' | 'Mainboard' | 'SME')}
                className="h-9.5 px-3 text-xs bg-[#FAFAFA] border border-[#E5E7EB] focus:bg-white focus:border-[#111827] rounded-lg outline-none text-[#111827]"
              >
                <option value="all">All Boards</option>
                <option value="Mainboard">Mainboard</option>
                <option value="SME">SME</option>
              </select>

              <select
                value={appCategoryFilter}
                onChange={(e) => setAppCategoryFilter(e.target.value)}
                className="h-9.5 px-3 text-xs bg-[#FAFAFA] border border-[#E5E7EB] focus:bg-white focus:border-[#111827] rounded-lg outline-none text-[#111827]"
              >
                <option value="all">All Investor Categories</option>
                <option value="Retail">Retail</option>
                <option value="sHNI">sHNI</option>
                <option value="bHNI">bHNI</option>
                <option value="Employee">Employee</option>
                <option value="Shareholder">Shareholder</option>
                <option value="QIB">QIB</option>
              </select>

              <select
                value={appStatusFilter}
                onChange={(e) =>
                  setAppStatusFilter(e.target.value as 'all' | 'submitted' | 'cancelled')
                }
                className="h-9.5 px-3 text-xs bg-[#FAFAFA] border border-[#E5E7EB] focus:bg-white focus:border-[#111827] rounded-lg outline-none text-[#111827]"
              >
                <option value="all">All Statuses</option>
                <option value="submitted">Submitted</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-xs text-[#6B7280]">
              <span>
                Showing <strong className="text-[#111827]">{filteredApplications.length}</strong> of{' '}
                {applications.length} application(s)
              </span>
              {(appSearch.trim() !== '' ||
                appBoardFilter !== 'all' ||
                appCategoryFilter !== 'all' ||
                appStatusFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setAppSearch('');
                    setAppBoardFilter('all');
                    setAppCategoryFilter('all');
                    setAppStatusFilter('all');
                  }}
                  className="inline-flex items-center gap-1 text-[#111827] font-medium hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#EAEAEA] rounded-xl overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] border-b border-[#EAEAEA] text-[#4B5563] font-semibold">
                  <tr>
                    <th className="py-3 px-4">Applicant</th>
                    <th className="py-3 px-3">IPO</th>
                    <th className="py-3 px-3">Category / Lots</th>
                    <th className="py-3 px-3 text-right">Total Bid</th>
                    <th className="py-3 px-3">PAN / UPI</th>
                    <th className="py-3 px-3">Submitted (IST)</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {filteredApplications.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#6B7280]">
                        {applications.length === 0
                          ? 'No IPO applications have been submitted by end users yet.'
                          : 'No IPO applications match your current filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-[#FAFAFA]">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#111827]">{app.userName}</div>
                          <div className="text-[11px] text-[#6B7280]">{app.userEmail}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-[#111827]">{app.companyName}</div>
                          <div className="text-[11px] text-[#6B7280]">{app.category}</div>
                        </td>
                        <td className="py-3 px-3 tabular-nums text-[#111827]">
                          {app.investorCategory} · {app.lots} lot{app.lots > 1 ? 's' : ''} ({app.shares} sh)
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums font-semibold text-[#111827]">
                          {formatRupees(app.totalAmount)}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-[#4B5563]">
                          <div>{app.pan}</div>
                          <div className="text-[#6B7280]">{app.upiId}</div>
                        </td>
                        <td className="py-3 px-3 text-[#6B7280] whitespace-nowrap">
                          {formatIndianTimestamp(app.created_at)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-md border ${
                              app.status === 'submitted'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {app.status === 'submitted' ? 'Submitted' : 'Cancelled'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Client */}
      {clientModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          onClick={() => setClientModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl border border-[#EAEAEA] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
              <h3 className="text-lg font-semibold text-[#111827]">
                {editingClient ? `Edit Client — ${editingClient.full_name}` : 'Add New Client'}
              </h3>
              <button
                type="button"
                onClick={() => setClientModalOpen(false)}
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

            <form onSubmit={handleSaveClient} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-medium text-[#111827] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Client full name"
                    className="w-full h-9 px-3 bg-white border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#111827] mb-1">Client Code</label>
                  <input
                    type="text"
                    value={clientCode}
                    onChange={(e) => setClientCode(e.target.value)}
                    placeholder="e.g. CLI-001"
                    className="w-full h-9 px-3 bg-white border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#111827] mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@email.com"
                    className="w-full h-9 px-3 bg-white border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#111827] mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full h-9 px-3 bg-white border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#111827] mb-1">PAN Number</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    className="w-full h-9 px-3 uppercase font-mono bg-white border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#111827] mb-1">Demat / BO ID</label>
                  <input
                    type="text"
                    value={dematId}
                    onChange={(e) => setDematId(e.target.value)}
                    placeholder="16-digit CDSL / NSDL ID"
                    className="w-full h-9 px-3 font-mono bg-white border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#111827] mb-1">Service Plan / Tier</label>
                  <input
                    type="text"
                    value={servicePlan}
                    onChange={(e) => setServicePlan(e.target.value)}
                    placeholder="e.g. IPO Advisory, HNI Desk, Annual"
                    className="w-full h-9 px-3 bg-white border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-[#111827] mb-1">Status</label>
                    <select
                      value={clientStatus}
                      onChange={(e) => setClientStatus(e.target.value as ClientStatus)}
                      className="w-full h-9 px-2 bg-white border border-[#E5E7EB] rounded-lg outline-none text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="lead">Lead</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-[#111827] mb-1">Joined Date</label>
                    <input
                      type="date"
                      value={joinedDate}
                      onChange={(e) => setJoinedDate(e.target.value)}
                      className="w-full h-9 px-2 bg-white border border-[#E5E7EB] rounded-lg outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Fee Billing Section */}
              <div className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#111827] uppercase tracking-wider">
                    Fees &amp; Billing
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-[#4B5563] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feeWaived}
                      onChange={(e) => setFeeWaived(e.target.checked)}
                      className="rounded accent-[#111827]"
                    />
                    <span>No Fee / Waived</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[#111827] mb-1">
                      Total Fee Agreed (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={totalFeeAgreed}
                      onChange={(e) => setTotalFeeAgreed(e.target.value)}
                      placeholder="0"
                      className="w-full h-9 px-3 bg-white border border-[#E5E7EB] rounded-lg outline-none text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#111827] mb-1">Fee Due Date</label>
                    <input
                      type="date"
                      value={feeDueDate}
                      onChange={(e) => setFeeDueDate(e.target.value)}
                      className="w-full h-9 px-3 bg-white border border-[#E5E7EB] rounded-lg outline-none text-sm"
                    />
                  </div>
                </div>

                {!editingClient && (
                  <div className="pt-2 border-t border-[#EAEAEA] grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-[#111827] mb-1">
                        Initial Fee Paid Now (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={initialFeePaid}
                        onChange={(e) => setInitialFeePaid(e.target.value)}
                        placeholder="0 (leave blank if unpaid)"
                        className="w-full h-9 px-3 bg-white border border-[#E5E7EB] rounded-lg outline-none text-sm tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[#111827] mb-1">Payment Mode</label>
                      <select
                        value={initialPaymentMode}
                        onChange={(e) => setInitialPaymentMode(e.target.value as PaymentMode)}
                        className="w-full h-9 px-2 bg-white border border-[#E5E7EB] rounded-lg outline-none text-sm"
                      >
                        {PAYMENT_MODES.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-[#111827] mb-1">Payment Date</label>
                      <input
                        type="date"
                        value={initialPaymentDate}
                        onChange={(e) => setInitialPaymentDate(e.target.value)}
                        className="w-full h-9 px-3 bg-white border border-[#E5E7EB] rounded-lg outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[#111827] mb-1">
                        UTR / Receipt Ref
                      </label>
                      <input
                        type="text"
                        value={initialPaymentRef}
                        onChange={(e) => setInitialPaymentRef(e.target.value)}
                        placeholder="Optional transaction reference"
                        className="w-full h-9 px-3 bg-white border border-[#E5E7EB] rounded-lg outline-none text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-medium text-[#111827] mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Account preferences, family accounts linked, fee remarks..."
                  className="w-full p-2.5 bg-white border border-[#E5E7EB] focus:border-[#111827] rounded-lg outline-none text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EAEAEA]">
                <button
                  type="button"
                  onClick={() => setClientModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium bg-white border border-[#E5E7EB] text-[#4B5563] rounded-lg hover:bg-[#FAFAFA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingClient}
                  className="px-4 py-2 text-sm font-medium bg-[#111827] hover:bg-[#1F2937] text-white rounded-lg disabled:opacity-50"
                >
                  {savingClient
                    ? 'Saving...'
                    : editingClient
                    ? 'Update Client'
                    : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Client Fee Payment Ledger */}
      {ledgerClient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          onClick={() => setLedgerClient(null)}
        >
          <div
            className="bg-white rounded-xl border border-[#EAEAEA] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
              <div>
                <h3 className="text-lg font-semibold text-[#111827] flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#111827]" />
                  <span>Fee Ledger — {ledgerClient.full_name}</span>
                </h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  {ledgerClient.email || ledgerClient.phone || 'Client fee payments & receipts'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLedgerClient(null)}
                className="p-1 text-[#6B7280] hover:text-[#111827] rounded-lg"
                aria-label="Close fee ledger"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Balance Strip */}
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl text-sm tabular-nums">
              <div>
                <span className="text-xs text-[#6B7280] block">Fees Agreed</span>
                <span className="font-semibold text-[#111827]">
                  {formatRupees(ledgerClient.total_fee_agreed)}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#6B7280] block">Total Paid</span>
                <span className="font-semibold text-[#16A34A]">
                  {formatRupees(ledgerClient.total_fee_paid)}
                </span>
              </div>
              <div>
                <span className="text-xs text-[#6B7280] block">Balance Due</span>
                <span
                  className={`font-semibold ${
                    ledgerClient.balance_due > 0 ? 'text-amber-700' : 'text-[#111827]'
                  }`}
                >
                  {formatRupees(ledgerClient.balance_due)}
                </span>
              </div>
            </div>

            {payError && (
              <div className="p-3 bg-red-50 border border-red-200 text-[#DC2626] text-xs rounded-lg">
                {payError}
              </div>
            )}

            {/* Add Payment Form */}
            <form
              onSubmit={handleAddPayment}
              className="p-4 bg-white border border-[#EAEAEA] rounded-xl space-y-3 text-xs"
            >
              <div className="font-semibold text-[#111827]">Record New Fee Payment</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-[#4B5563] mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full h-9 px-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg outline-none text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#4B5563] mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full h-9 px-2.5 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#4B5563] mb-1">Payment Mode *</label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                    className="w-full h-9 px-2 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg outline-none text-sm"
                  >
                    {PAYMENT_MODES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#4B5563] mb-1">
                    UTR / Receipt Reference
                  </label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="Optional UTR / Cheque / Txn ID"
                    className="w-full h-9 px-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#4B5563] mb-1">Description</label>
                  <input
                    type="text"
                    value={payDesc}
                    onChange={(e) => setPayDesc(e.target.value)}
                    placeholder="e.g. Q1 Advisory Fee"
                    className="w-full h-9 px-3 bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg outline-none text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={payBusy}
                  className="px-4 py-2 bg-[#111827] hover:bg-[#1F2937] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {payBusy ? 'Recording...' : 'Add Payment Receipt'}
                </button>
              </div>
            </form>

            {/* Payment History List */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#111827]">
                Payment Receipts ({ledgerClient.payments.length})
              </div>
              {ledgerClient.payments.length === 0 ? (
                <div className="p-6 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl text-center text-xs text-[#6B7280]">
                  No fee payments recorded for this client yet.
                </div>
              ) : (
                <div className="border border-[#EAEAEA] rounded-xl divide-y divide-[#F3F4F6] text-xs">
                  {ledgerClient.payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#FAFAFA]"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[#16A34A] tabular-nums">
                            {formatRupees(p.amount)}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#F3F4F6] text-[#111827] text-[11px] font-medium">
                            {p.payment_mode}
                          </span>
                          <span className="text-[#6B7280] tabular-nums">
                            {formatIndianDate(p.payment_date)}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#4B5563]">
                          {p.description || 'Fee payment'}
                          {p.reference_no ? ` · Ref: ${p.reference_no}` : ''}
                          {' · '}Recorded by {p.recorded_by}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={payBusy}
                        onClick={() => handleDeletePayment(p.id)}
                        className="p-1.5 text-[#6B7280] hover:text-[#DC2626] rounded transition-colors"
                        title="Remove payment entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
