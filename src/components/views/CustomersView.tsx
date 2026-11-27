import { useMemo, useState, type FormEvent } from 'react';
import type { ChartConfiguration } from 'chart.js';
import {
  AlertCircle,
  Loader2,
  MessageCircle,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import type {
  CurrencyCode,
  CustomerRecord,
  CustomerSegment,
  SalesRecord,
  ShopProfile,
} from '../../types/bi';
import {
  computeCustomerAnalytics,
  fmtCurrency,
  fmtNumber,
  fmtShortAxisCurrency,
} from '../../utils/analytics';
import { getCurrencyMeta } from '../../utils/businessConfig';
import { buildWhatsAppShareUrl } from '../../utils/reports';
import { formatFriendlyFirestoreError } from '../../firebase';
import { ChartCanvas } from '../ChartCanvas';

interface CustomersViewProps {
  currency: CurrencyCode;
  shopProfile: ShopProfile;
  customers: CustomerRecord[];
  filteredSales: SalesRecord[];
  onAddCustomer: (customer: Omit<CustomerRecord, 'id'>) => Promise<void>;
  onUpdateCustomer: (
    id: string,
    patch: Partial<Pick<CustomerRecord, 'name' | 'phone' | 'email' | 'city' | 'segment' | 'notes'>>
  ) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
}

const SEGMENTS: CustomerSegment[] = ['VIP', 'Wholesale', 'Regular', 'New'];

const SEGMENT_TEXT_COLOR: Record<CustomerSegment, string> = {
  VIP: 'text-violet-700',
  Wholesale: 'text-blue-700',
  Regular: 'text-emerald-700',
  New: 'text-amber-700',
};

export function CustomersView({
  currency,
  shopProfile,
  customers,
  filteredSales,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
}: CustomersViewProps) {
  const currencyMeta = getCurrencyMeta(currency);
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<'ALL' | CustomerSegment>('ALL');
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Customer form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState(shopProfile.city || '');
  const [segment, setSegment] = useState<CustomerSegment>('Regular');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);

  const analytics = useMemo(
    () => computeCustomerAnalytics(customers, filteredSales),
    [customers, filteredSales]
  );

  const visibleCustomers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return analytics.rankedCustomers.filter((entry) => {
      if (segmentFilter !== 'ALL' && entry.customer.segment !== segmentFilter) return false;
      if (!q) return true;
      return (
        entry.customer.name.toLowerCase().includes(q) ||
        entry.customer.phone.toLowerCase().includes(q) ||
        entry.customer.city.toLowerCase().includes(q) ||
        (entry.customer.email || '').toLowerCase().includes(q)
      );
    });
  }, [analytics.rankedCustomers, searchQuery, segmentFilter]);

  const segmentChartConfig = useMemo<ChartConfiguration>(() => {
    return {
      type: 'bar',
      data: {
        labels: analytics.segmentBreakdown.map((s) => `${s.segment} (${s.count})`),
        datasets: [
          {
            label: `Revenue (${currencyMeta.code} ${currencyMeta.symbol.trim()})`,
            data: analytics.segmentBreakdown.map((s) => s.revenue),
            backgroundColor: ['#6D28D9', '#2563EB', '#059669', '#D97706'],
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 11,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => `Revenue: ${fmtCurrency(Number(ctx.parsed.y ?? 0), currency)}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 }, color: '#64748B' } },
          y: {
            grid: { color: '#F1F5F9' },
            ticks: {
              font: { family: 'JetBrains Mono', size: 11 },
              color: '#64748B',
              callback: (v) => fmtShortAxisCurrency(Number(v), currency),
            },
          },
        },
      },
    };
  }, [analytics.segmentBreakdown, currency, currencyMeta.code, currencyMeta.symbol]);

  const topCustomersChartConfig = useMemo<ChartConfiguration>(() => {
    const topFive = analytics.rankedCustomers.slice(0, 6);
    return {
      type: 'bar',
      data: {
        labels: topFive.map((r) => r.customer.name),
        datasets: [
          {
            label: 'Period Spend',
            data: topFive.map((r) => (r.ordersInPeriod > 0 ? r.spentInPeriod : r.customer.totalSpent)),
            backgroundColor: '#6D28D9',
            borderRadius: 5,
          },
          {
            label: 'Gross Profit',
            data: topFive.map((r) => r.profitInPeriod),
            backgroundColor: '#059669',
            borderRadius: 5,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { usePointStyle: true, boxWidth: 8, font: { family: 'DM Sans', size: 12 } },
          },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 11,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${fmtCurrency(Number(ctx.parsed.x ?? 0), currency)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: '#F1F5F9' },
            ticks: {
              font: { family: 'JetBrains Mono', size: 11 },
              color: '#64748B',
              callback: (v) => fmtShortAxisCurrency(Number(v), currency),
            },
          },
          y: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 }, color: '#334155' } },
        },
      },
    };
  }, [analytics.rankedCustomers, currency]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setFormError(null);

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();
    const cleanCity = city.trim();
    const cleanNotes = notes.trim();

    if (cleanName.length < 2 || cleanName.length > 120) {
      setFormError('Customer name must be 2–120 characters.');
      return;
    }
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    if (digitsOnly.length < 7 || cleanPhone.length > 20) {
      setFormError('Enter a valid phone / WhatsApp number (7–20 characters).');
      return;
    }
    if (cleanCity.length < 1 || cleanCity.length > 80) {
      setFormError('City is required (1–80 characters).');
      return;
    }
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFormError('Please enter a valid email address or leave it blank.');
      return;
    }
    if (cleanNotes.length > 240) {
      setFormError('Notes must be 240 characters or fewer.');
      return;
    }

    setIsSaving(true);
    try {
      await onAddCustomer({
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail || undefined,
        city: cleanCity,
        segment,
        notes: cleanNotes || undefined,
        totalOrders: 0,
        totalSpent: 0,
      });

      setName('');
      setPhone('');
      setEmail('');
      setNotes('');
      setSegment('Regular');
      setShowAddForm(false);
    } catch (err) {
      setFormError(formatFriendlyFirestoreError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSegmentChange = async (id: string, nextSegment: CustomerSegment) => {
    setTableError(null);
    setBusyId(id);
    try {
      await onUpdateCustomer(id, { segment: nextSegment });
    } catch (err) {
      setTableError(formatFriendlyFirestoreError(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDelete = async (id: string) => {
    setTableError(null);
    setBusyId(id);
    try {
      await onDeleteCustomer(id);
      setConfirmDeleteId(null);
    } catch (err) {
      setTableError(formatFriendlyFirestoreError(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Customer KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Saved Customers</span>
            <Users className="w-4 h-4 text-violet-700" aria-hidden="true" />
          </div>
          <div className="font-mono-num text-2xl font-bold text-slate-900 mt-2">
            {fmtNumber(analytics.totalCustomers, currency)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 tabular-nums">
            {fmtNumber(analytics.activeCustomers, currency)} active in selected period
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">Repeat Buyers (2+ Orders)</span>
            <UserCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          </div>
          <div className="font-mono-num text-2xl font-bold text-emerald-700 mt-2">
            {fmtNumber(analytics.repeatCustomers, currency)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5 tabular-nums">
            {analytics.totalCustomers > 0
              ? `${((analytics.repeatCustomers / analytics.totalCustomers) * 100).toFixed(0)}% retention base`
              : 'Add customers to track retention'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Customer-Linked Revenue</div>
          <div className="font-mono-num text-2xl font-bold text-slate-900 mt-2">
            {fmtCurrency(analytics.totalLinkedRevenue, currency)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            Top segment: <strong className="text-slate-700">{analytics.topSegment}</strong>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Avg. Customer Value</div>
          <div className="font-mono-num text-2xl font-bold text-slate-900 mt-2">
            {fmtCurrency(analytics.avgLifetimeValue, currency)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">Across customer directory</div>
        </div>
      </div>

      {/* Customer Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Revenue by Customer Segment</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Compares VIP, Wholesale, Regular, and New buyer contribution
            </p>
          </div>
          {customers.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-xs text-slate-500">
              Add customers to view segment analytics.
            </div>
          ) : (
            <div className="relative h-[240px] w-full">
              <ChartCanvas config={segmentChartConfig} ariaLabel="Revenue by customer segment chart" />
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Top Customers by Spend &amp; Gross Profit</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Linked directly from your sales ledger in the active date range
            </p>
          </div>
          {analytics.rankedCustomers.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-xs text-slate-500">
              No customer purchase records yet.
            </div>
          ) : (
            <div className="relative h-[240px] w-full">
              <ChartCanvas config={topCustomersChartConfig} ariaLabel="Top customers spend and profit chart" />
            </div>
          )}
        </div>
      </div>

      {/* Customer Directory & Management */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Customer Directory &amp; CRM</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage buyer profiles, update segments, link sales in Ledger, or message on WhatsApp
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, city..."
                aria-label="Search customers"
                className="w-full min-h-[38px] pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 overflow-x-auto max-w-full">
              {(['ALL', ...SEGMENTS] as const).map((seg) => (
                <button
                  key={seg}
                  type="button"
                  onClick={() => setSegmentFilter(seg)}
                  className={`min-h-[34px] px-2.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    segmentFilter === seg
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {seg === 'ALL' ? `All (${customers.length})` : seg}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="min-h-[38px] px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              {showAddForm ? 'Close Form' : 'Add Customer'}
            </button>
          </div>
        </div>

        {showAddForm && (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Add New Customer</h4>
            {formError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div>
                <label htmlFor="custName" className="block text-xs font-medium text-slate-600 mb-1">
                  Customer / Party Name
                </label>
                <input
                  id="custName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Meera Boutique & Studio"
                  maxLength={120}
                  required
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="custPhone" className="block text-xs font-medium text-slate-600 mb-1">
                  Phone / WhatsApp Number
                </label>
                <input
                  id="custPhone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98201 44110"
                  maxLength={20}
                  required
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-sm font-mono-num text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="custCity" className="block text-xs font-medium text-slate-600 mb-1">
                  City / State
                </label>
                <input
                  id="custCity"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Pune"
                  maxLength={80}
                  required
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="custSegment" className="block text-xs font-medium text-slate-600 mb-1">
                  Customer Segment
                </label>
                <select
                  id="custSegment"
                  value={segment}
                  onChange={(e) => setSegment(e.target.value as CustomerSegment)}
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {SEGMENTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="custEmail" className="block text-xs font-medium text-slate-600 mb-1">
                  Email (Optional)
                </label>
                <input
                  id="custEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. buyer@company.in"
                  maxLength={160}
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="custNotes" className="block text-xs font-medium text-slate-600 mb-1">
                  Notes / Preferences (Optional)
                </label>
                <input
                  id="custNotes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Monthly GST invoice preferred"
                  maxLength={240}
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="min-h-[38px] px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-xs font-semibold text-white transition-colors inline-flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isSaving ? 'Saving Customer...' : 'Save Customer'}
              </button>
            </div>
          </form>
        )}

        {tableError && (
          <div
            role="alert"
            className="mx-5 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{tableError}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="text-left py-3 px-4 whitespace-nowrap">Customer</th>
                <th className="text-left py-3 px-4 whitespace-nowrap">Phone &amp; City</th>
                <th className="text-left py-3 px-4 whitespace-nowrap">Segment</th>
                <th className="text-right py-3 px-4 whitespace-nowrap">Orders</th>
                <th className="text-right py-3 px-4 whitespace-nowrap">Period Spend</th>
                <th className="text-right py-3 px-4 whitespace-nowrap">Avg. Order</th>
                <th className="text-left py-3 px-4 whitespace-nowrap">Last Purchase</th>
                <th className="text-right py-3 px-4 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500 text-sm">
                    {customers.length === 0
                      ? 'No customers added yet. Click "Add Customer" to build your shop CRM.'
                      : 'No customers match your search or segment filter.'}
                  </td>
                </tr>
              ) : (
                visibleCustomers.map((entry) => {
                  const { customer, ordersInPeriod, spentInPeriod, avgOrderValue, lastOrderDate } = entry;
                  const displayOrders = ordersInPeriod > 0 ? ordersInPeriod : customer.totalOrders;
                  const displaySpend = ordersInPeriod > 0 ? spentInPeriod : customer.totalSpent;
                  const displayAvg =
                    ordersInPeriod > 0
                      ? avgOrderValue
                      : customer.totalOrders > 0
                        ? customer.totalSpent / customer.totalOrders
                        : 0;
                  const isBusy = busyId === customer.id;
                  const waUrl = buildWhatsAppShareUrl(
                    customer.phone,
                    `Namaste ${customer.name}, thank you for shopping with ${shopProfile.shopName}! Let us know if you need any restocks or assistance today.`
                  );

                  return (
                    <tr key={customer.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{customer.name}</div>
                        {customer.notes && (
                          <div className="text-xs text-slate-500 max-w-[230px] truncate" title={customer.notes}>
                            {customer.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono-num text-xs font-medium text-slate-800">{customer.phone}</div>
                        <div className="text-xs text-slate-500">{customer.city}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <select
                          aria-label={`Segment for ${customer.name}`}
                          value={customer.segment}
                          disabled={isBusy}
                          onChange={(e) =>
                            void handleSegmentChange(customer.id, e.target.value as CustomerSegment)
                          }
                          className={`min-h-[30px] px-2 rounded border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                            SEGMENT_TEXT_COLOR[customer.segment]
                          }`}
                        >
                          {SEGMENTS.map((s) => (
                            <option key={s} value={s} className="text-slate-900">
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-semibold text-slate-800 whitespace-nowrap">
                        {fmtNumber(displayOrders, currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-bold text-slate-900 whitespace-nowrap">
                        {fmtCurrency(displaySpend, currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num text-slate-600 whitespace-nowrap">
                        {fmtCurrency(displayAvg, currency)}
                      </td>
                      <td className="py-3 px-4 font-mono-num text-xs text-slate-600 whitespace-nowrap">
                        {lastOrderDate || '—'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Message ${customer.name} on WhatsApp`}
                            className="min-h-[30px] px-2.5 rounded border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 inline-flex items-center gap-1 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>

                          {confirmDeleteId === customer.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleConfirmDelete(customer.id)}
                                className="min-h-[30px] px-2 rounded bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white"
                              >
                                {isBusy ? '...' : 'Confirm'}
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => setConfirmDeleteId(null)}
                                className="min-h-[30px] px-2 rounded border border-slate-200 text-xs text-slate-600 hover:bg-slate-100"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setConfirmDeleteId(customer.id)}
                              aria-label={`Delete customer ${customer.name}`}
                              className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 transition-colors"
                            >
                              {isBusy ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
