import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  Copy,
  Download,
  FileDown,
  FileSpreadsheet,
  HardDriveDownload,
  Loader2,
  MessageCircle,
  Search,
  ShieldCheck,
  Store,
  Upload,
} from 'lucide-react';
import type {
  CurrencyCode,
  CustomerRecord,
  ExpenseRecord,
  InventoryItem,
  SalesRecord,
  ShopBackupLog,
  ShopProfile,
} from '../../types/bi';
import {
  computeProfitAndLoss,
  fmtCurrency,
  fmtMonthLabel,
  fmtNumber,
} from '../../utils/analytics';
import {
  CURRENCY_OPTIONS,
  getCurrencyMeta,
  normalizeCurrencyCode,
} from '../../utils/businessConfig';
import {
  buildWhatsAppShareUrl,
  exportBusinessReportCsv,
  exportBusinessReportPdf,
  generateDailyWhatsAppReportText,
  type ReportGranularity,
} from '../../utils/reports';
import { formatFriendlyFirestoreError } from '../../firebase';

interface DataExplorerViewProps {
  currency: CurrencyCode;
  shopProfile: ShopProfile;
  filteredDataset: SalesRecord[];
  allSales: SalesRecord[];
  allExpenses: ExpenseRecord[];
  filteredExpenses: ExpenseRecord[];
  inventory: InventoryItem[];
  customers: CustomerRecord[];
  backups: ShopBackupLog[];
  onUploadFile: (file: File, mode: 'append' | 'replace') => Promise<void>;
  onDownloadTemplate: () => void;
  onExportFiltered: () => void;
  onUpdateShopProfile: (patch: {
    shopName: string;
    ownerName: string;
    businessType: string;
    currency?: CurrencyCode;
    city: string;
    gstin?: string;
    whatsappNumber?: string;
  }) => Promise<void>;
  onCreateBackup: (label: string) => Promise<void>;
  onRestoreBackup: (file: File) => Promise<void>;
  uploadError: string | null;
  onClearError: () => void;
  onNotify: (msg: string) => void;
}

type TableSortKey = 'Date' | 'Product' | 'Category' | 'Region' | 'Quantity' | 'Revenue' | 'Cost' | 'Profit';

export function DataExplorerView({
  currency,
  shopProfile,
  filteredDataset,
  allSales,
  allExpenses,
  filteredExpenses,
  inventory,
  customers,
  backups,
  onUploadFile,
  onDownloadTemplate,
  onExportFiltered,
  onUpdateShopProfile,
  onCreateBackup,
  onRestoreBackup,
  uploadError,
  onClearError,
  onNotify,
}: DataExplorerViewProps) {
  const activeCurrency = normalizeCurrencyCode(currency ?? shopProfile.currency, 'INR');
  const currencyMeta = getCurrencyMeta(activeCurrency);
  const effectiveProfile = useMemo(
    () => ({ ...shopProfile, currency: activeCurrency }),
    [shopProfile, activeCurrency]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [sortKey, setSortKey] = useState<TableSortKey>('Date');
  const [sortAsc, setSortAsc] = useState(false);
  const [csvImportMode, setCsvImportMode] = useState<'append' | 'replace'>('append');
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allSales.forEach((s) => months.add(s.Date.slice(0, 7)));
    allExpenses.forEach((e) => months.add(e.Date.slice(0, 7)));
    return Array.from(months).filter(Boolean).sort().reverse();
  }, [allSales, allExpenses]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    allSales.forEach((s) => years.add(s.Date.slice(0, 4)));
    allExpenses.forEach((e) => years.add(e.Date.slice(0, 4)));
    return Array.from(years).filter(Boolean).sort().reverse();
  }, [allSales, allExpenses]);

  const [reportGranularity, setReportGranularity] = useState<ReportGranularity>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0] || 'ALL');
  const [selectedYear, setSelectedYear] = useState<string>(availableYears[0] || 'ALL');

  const activeMonth = availableMonths.includes(selectedMonth)
    ? selectedMonth
    : availableMonths[0] || 'ALL';
  const activeYear = availableYears.includes(selectedYear)
    ? selectedYear
    : availableYears[0] || 'ALL';

  const activePeriodKey =
    reportGranularity === 'monthly'
      ? activeMonth
      : reportGranularity === 'yearly'
        ? activeYear
        : 'ALL';

  const reportSales = useMemo(() => {
    if (reportGranularity === 'period' || activePeriodKey === 'ALL') return filteredDataset;
    return allSales.filter((s) => s.Date.startsWith(activePeriodKey));
  }, [reportGranularity, activePeriodKey, filteredDataset, allSales]);

  const reportExpenses = useMemo(() => {
    if (reportGranularity === 'period' || activePeriodKey === 'ALL') return filteredExpenses;
    return allExpenses.filter((e) => e.Date.startsWith(activePeriodKey));
  }, [reportGranularity, activePeriodKey, filteredExpenses, allExpenses]);

  const reportPnl = useMemo(
    () => computeProfitAndLoss(reportSales, reportExpenses, activeCurrency),
    [reportSales, reportExpenses, activeCurrency]
  );

  const lowStockCount = useMemo(
    () => inventory.filter((i) => i.stock <= i.reorderLevel).length,
    [inventory]
  );

  // Daily WhatsApp Report state
  const latestSaleDate = useMemo(() => {
    const dates = allSales.map((s) => s.Date).filter(Boolean).sort();
    return dates[dates.length - 1] || new Date().toISOString().slice(0, 10);
  }, [allSales]);

  const [waDate, setWaDate] = useState(latestSaleDate);
  const [waLanguage, setWaLanguage] = useState<'en' | 'hi'>('en');
  const [waRecipient, setWaRecipient] = useState(shopProfile.whatsappNumber || '');
  const [waCustomDraft, setWaCustomDraft] = useState<string | null>(null);

  useEffect(() => {
    if (latestSaleDate && allSales.length > 0 && !allSales.some((s) => s.Date === waDate)) {
      setWaDate(latestSaleDate);
      setWaCustomDraft(null);
    }
  }, [latestSaleDate, allSales, waDate]);

  const generatedWaText = useMemo(
    () =>
      generateDailyWhatsAppReportText({
        date: waDate,
        language: waLanguage,
        shopProfile: effectiveProfile,
        currency: activeCurrency,
        allSales,
        allExpenses,
        inventory,
      }),
    [waDate, waLanguage, effectiveProfile, activeCurrency, allSales, allExpenses, inventory]
  );

  const waMessage = waCustomDraft ?? generatedWaText;
  const waShareUrl = useMemo(
    () => buildWhatsAppShareUrl(waRecipient, waMessage),
    [waRecipient, waMessage]
  );

  // Shop Profile editing state
  const [profShopName, setProfShopName] = useState(shopProfile.shopName);
  const [profOwnerName, setProfOwnerName] = useState(shopProfile.ownerName);
  const [profBusinessType, setProfBusinessType] = useState(shopProfile.businessType);
  const [profCurrency, setProfCurrency] = useState<CurrencyCode>(activeCurrency);
  const [profCity, setProfCity] = useState(shopProfile.city);
  const [profGstin, setProfGstin] = useState(shopProfile.gstin || '');
  const [profWhatsapp, setProfWhatsapp] = useState(shopProfile.whatsappNumber || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    setProfShopName(shopProfile.shopName);
    setProfOwnerName(shopProfile.ownerName);
    setProfBusinessType(shopProfile.businessType);
    setProfCurrency(normalizeCurrencyCode(currency ?? shopProfile.currency, 'INR'));
    setProfCity(shopProfile.city);
    setProfGstin(shopProfile.gstin || '');
    setProfWhatsapp(shopProfile.whatsappNumber || '');
    setWaRecipient((prev) => prev || shopProfile.whatsappNumber || '');
  }, [shopProfile, currency]);

  // Backup & Restore state
  const [backupLabel, setBackupLabel] = useState('Monthly Snapshot');
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);

  const visibleRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const matched = filteredDataset.filter((r) => {
      if (!q) return true;
      return (
        r.Product.toLowerCase().includes(q) ||
        r.Category.toLowerCase().includes(q) ||
        r.Region.toLowerCase().includes(q) ||
        r.Date.includes(q)
      );
    });

    const sorted = [...matched].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortAsc ? va - vb : vb - va;
      }
      return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });

    return sorted.slice(0, 300);
  }, [filteredDataset, searchQuery, sortKey, sortAsc]);

  const handleSort = (key: TableSortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'Product' || key === 'Category' || key === 'Region');
    }
  };

  const triggerCsvUpload = async (file: File) => {
    setIsUploadingCsv(true);
    try {
      await onUploadFile(file, csvImportMode);
    } finally {
      setIsUploadingCsv(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files[0]) {
      void triggerCsvUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    const cleanShop = profShopName.trim();
    const cleanOwner = profOwnerName.trim();
    const cleanType = profBusinessType.trim();
    const cleanCity = profCity.trim();
    const cleanGstin = profGstin.trim().toUpperCase();
    const cleanWhatsapp = profWhatsapp.trim();

    if (cleanShop.length < 2 || cleanOwner.length < 2 || cleanType.length < 2 || cleanCity.length < 2) {
      setProfileError('Shop name, owner name, business type, and city must each be at least 2 characters.');
      return;
    }
    if (cleanGstin && !/^[A-Z0-9]{10,20}$/.test(cleanGstin)) {
      setProfileError('If provided, GSTIN must be 10–20 alphanumeric characters.');
      return;
    }
    if (cleanWhatsapp && cleanWhatsapp.replace(/\D/g, '').length < 10) {
      setProfileError('If provided, WhatsApp number should have at least 10 digits.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await onUpdateShopProfile({
        shopName: cleanShop,
        ownerName: cleanOwner,
        businessType: cleanType,
        currency: profCurrency,
        city: cleanCity,
        gstin: cleanGstin,
        whatsappNumber: cleanWhatsapp,
      });
    } catch (err) {
      setProfileError(formatFriendlyFirestoreError(err));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCreateBackupClick = async () => {
    setBackupError(null);
    setIsCreatingBackup(true);
    try {
      await onCreateBackup(backupLabel.trim() || 'Shop Backup');
    } catch (err) {
      setBackupError(formatFriendlyFirestoreError(err));
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreFile) return;
    setBackupError(null);
    setIsRestoringBackup(true);
    try {
      await onRestoreBackup(pendingRestoreFile);
      setPendingRestoreFile(null);
    } catch (err) {
      setBackupError(formatFriendlyFirestoreError(err));
    } finally {
      setIsRestoringBackup(false);
    }
  };

  const reportButtonLabel =
    reportGranularity === 'yearly'
      ? 'Yearly'
      : reportGranularity === 'monthly'
        ? 'Monthly'
        : 'Period';

  return (
    <div className="space-y-5">
      {/* Monthly & Yearly Business Reports (PDF & CSV) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Monthly &amp; Yearly Business Reports (PDF &amp; CSV)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate {currencyMeta.code} ({currencyMeta.symbol.trim()}) P&amp;L statements, month-by-month rollups, expense breakdowns, and low-stock alerts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              {(
                [
                  ['monthly', 'Monthly'],
                  ['yearly', 'Yearly'],
                  ['period', 'Active Filter'],
                ] as Array<[ReportGranularity, string]>
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setReportGranularity(mode)}
                  className={`min-h-[34px] px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    reportGranularity === mode
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {reportGranularity === 'monthly' && (
              <select
                aria-label="Select report month"
                value={activeMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {availableMonths.length === 0 ? (
                  <option value="ALL">No monthly records yet</option>
                ) : (
                  availableMonths.map((ym) => (
                    <option key={ym} value={ym}>
                      {fmtMonthLabel(ym, activeCurrency)} ({ym})
                    </option>
                  ))
                )}
              </select>
            )}

            {reportGranularity === 'yearly' && (
              <select
                aria-label="Select report year"
                value={activeYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {availableYears.length === 0 ? (
                  <option value="ALL">No yearly records yet</option>
                ) : (
                  availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      Year {yr}
                    </option>
                  ))
                )}
              </select>
            )}

            <button
              type="button"
              onClick={() => {
                exportBusinessReportPdf({
                  granularity: reportGranularity,
                  periodKey: activePeriodKey,
                  sales: reportSales,
                  expenses: reportExpenses,
                  inventory,
                  customers,
                  shopProfile: effectiveProfile,
                  currency: activeCurrency,
                });
                onNotify(`${reportButtonLabel} Business Report PDF downloaded`);
              }}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <FileDown className="w-4 h-4" />
              Download {reportButtonLabel} PDF Report
            </button>

            <button
              type="button"
              onClick={() => {
                exportBusinessReportCsv({
                  granularity: reportGranularity,
                  periodKey: activePeriodKey,
                  sales: reportSales,
                  expenses: reportExpenses,
                  inventory,
                  customers,
                  shopProfile: effectiveProfile,
                  currency: activeCurrency,
                });
                onNotify(`${reportButtonLabel} Business Report CSV downloaded`);
              }}
              className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-600" />
              Download {reportButtonLabel} CSV
            </button>
          </div>
        </div>

        {/* Live Report Preview Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-slate-100">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-medium text-slate-500">Orders</div>
            <div className="font-mono-num text-sm font-bold text-slate-900 mt-1">
              {fmtNumber(reportSales.length, activeCurrency)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-medium text-slate-500">Gross Revenue</div>
            <div className="font-mono-num text-sm font-bold text-slate-900 mt-1">
              {fmtCurrency(reportPnl.grossRevenue, activeCurrency)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-medium text-slate-500">Avg. Order Value</div>
            <div className="font-mono-num text-sm font-bold text-slate-700 mt-1">
              {fmtCurrency(reportSales.length > 0 ? reportPnl.grossRevenue / reportSales.length : 0, activeCurrency)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-medium text-slate-500">Operating Expenses</div>
            <div className="font-mono-num text-sm font-bold text-amber-700 mt-1">
              {fmtCurrency(reportPnl.totalExpenses, activeCurrency)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-medium text-slate-500">
              {reportPnl.isLoss ? 'Net Loss' : 'Net Profit'} ({reportPnl.netMarginPct.toFixed(1)}%)
            </div>
            <div
              className={`font-mono-num text-sm font-bold mt-1 ${
                reportPnl.isLoss ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              {reportPnl.isLoss ? '-' : ''}
              {fmtCurrency(Math.abs(reportPnl.netProfit), activeCurrency)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-medium text-slate-500">Low-Stock SKUs</div>
            <div
              className={`font-mono-num text-sm font-bold mt-1 ${
                lowStockCount > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {fmtNumber(lowStockCount, activeCurrency)}
            </div>
          </div>
        </div>
      </div>

      {/* Daily WhatsApp Business Report Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Daily WhatsApp Business Report (English &amp; हिन्दी)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Auto-formatted daily sales, operating expenses, net profit, MTD totals &amp; low-stock alerts ready to send on WhatsApp
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="date"
              aria-label="Daily WhatsApp report date"
              value={waDate}
              onChange={(e) => {
                setWaDate(e.target.value);
                setWaCustomDraft(null);
              }}
              className="min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />

            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              {(
                [
                  ['en', 'English'],
                  ['hi', 'हिन्दी'],
                ] as const
              ).map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setWaLanguage(code);
                    setWaCustomDraft(null);
                  }}
                  className={`min-h-[34px] px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    waLanguage === code ? 'bg-violet-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <input
              type="tel"
              aria-label="WhatsApp recipient phone number"
              value={waRecipient}
              onChange={(e) => setWaRecipient(e.target.value)}
              placeholder="Recipient e.g. +91 98201..."
              maxLength={20}
              className="min-h-[38px] w-44 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono-num text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          <div className="lg:col-span-2 flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="waPreviewBox" className="text-xs font-semibold text-slate-700">
                WhatsApp Message Preview (Editable)
              </label>
              {waCustomDraft !== null && (
                <button
                  type="button"
                  onClick={() => setWaCustomDraft(null)}
                  className="text-xs font-semibold text-violet-700 hover:underline"
                >
                  Reset to Auto-Generated
                </button>
              )}
            </div>
            <textarea
              id="waPreviewBox"
              rows={9}
              value={waMessage}
              onChange={(e) => setWaCustomDraft(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs font-mono-num text-slate-800 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 flex flex-col justify-between gap-4">
            <div className="space-y-2 text-xs text-slate-600">
              <div className="font-bold text-slate-900">Quick Send Checklist</div>
              <p>
                Includes exact {currencyMeta.code} ({currencyMeta.symbol.trim()}) revenue, payment mode breakdown (UPI/Cash/Card), top items, MTD P&amp;L, and stockout alerts for <strong>{waDate}</strong>.
              </p>
              <p className="text-[11px] text-slate-500">
                Save your default owner/partner WhatsApp number in Shop Profile below so it prefills automatically.
              </p>
            </div>

            <div className="space-y-2">
              <a
                href={waShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4" />
                Send via WhatsApp
              </a>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(waMessage);
                    onNotify('Daily WhatsApp report copied to clipboard');
                  } catch {
                    onNotify('Select and copy the report text from the preview box');
                  }
                }}
                className="w-full min-h-[38px] px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5 text-slate-600" />
                Copy Report Text
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CSV Upload Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Upload Custom Sales Dataset (CSV)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Columns: Date (YYYY-MM-DD or DD/MM/YYYY), Product, Category, Quantity, Revenue, Cost, Region, PaymentMode
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onDownloadTemplate}
              className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors inline-flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-600" />
              Download Sample CSV
            </button>
            <button
              type="button"
              onClick={onExportFiltered}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white transition-colors inline-flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Download className="w-4 h-4" />
              Export Filtered Rows CSV
            </button>
          </div>
        </div>

        {/* Import Mode Toggle */}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-semibold text-slate-700">Import Mode:</span>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              type="button"
              onClick={() => setCsvImportMode('append')}
              className={`min-h-[32px] px-3 rounded-md font-semibold transition-colors ${
                csvImportMode === 'append' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Append to Shop Sales
            </button>
            <button
              type="button"
              onClick={() => setCsvImportMode('replace')}
              className={`min-h-[32px] px-3 rounded-md font-semibold transition-colors ${
                csvImportMode === 'replace' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Replace All Shop Sales
            </button>
          </div>
          {csvImportMode === 'replace' && (
            <span className="text-amber-700 font-medium">
              Note: Uploading in Replace mode clears existing sales rows before importing.
            </span>
          )}
        </div>

        {uploadError && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{uploadError}</span>
            </div>
            <button
              type="button"
              onClick={onClearError}
              className="font-semibold underline hover:text-rose-950 whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        )}

        <div
          role="button"
          tabIndex={0}
          onClick={() => !isUploadingCsv && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (!isUploadingCsv && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl py-8 px-6 text-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            isDragOver
              ? 'border-violet-600 bg-violet-50/70'
              : 'border-slate-300 bg-slate-50/70 hover:border-violet-500 hover:bg-violet-50/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void triggerCsvUpload(file);
              e.target.value = '';
            }}
          />
          <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center mx-auto mb-3">
            {isUploadingCsv ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          </div>
          <div className="text-sm font-bold text-slate-900">
            {isUploadingCsv
              ? 'Validating & syncing CSV rows to your shop ledger...'
              : 'Drop your CSV file here or click to browse'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Supports UTF-8 CSV files up to 5,000 rows per upload. Dashboard metrics and AI insights sync automatically.
          </p>
        </div>
      </div>

      {/* Shop Profile & Secure SHA-256 Cloud Backups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Shop Profile Card */}
        <form
          onSubmit={handleSaveProfile}
          className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Shop Profile &amp; Branding</h3>
              <p className="text-xs text-slate-500">Appears on PDF/CSV reports and AI advisor context</p>
            </div>
          </div>

          {profileError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{profileError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label htmlFor="profShopName" className="block text-xs font-medium text-slate-600 mb-1">
                Shop / Business Name
              </label>
              <input
                id="profShopName"
                type="text"
                value={profShopName}
                onChange={(e) => setProfShopName(e.target.value)}
                maxLength={100}
                required
                className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label htmlFor="profOwnerName" className="block text-xs font-medium text-slate-600 mb-1">
                Owner Name
              </label>
              <input
                id="profOwnerName"
                type="text"
                value={profOwnerName}
                onChange={(e) => setProfOwnerName(e.target.value)}
                maxLength={100}
                required
                className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label htmlFor="profCity" className="block text-xs font-medium text-slate-600 mb-1">
                City / State
              </label>
              <input
                id="profCity"
                type="text"
                value={profCity}
                onChange={(e) => setProfCity(e.target.value)}
                maxLength={80}
                required
                className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label htmlFor="profType" className="block text-xs font-medium text-slate-600 mb-1">
                Business Type
              </label>
              <input
                id="profType"
                type="text"
                value={profBusinessType}
                onChange={(e) => setProfBusinessType(e.target.value)}
                maxLength={80}
                required
                className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label htmlFor="profCurrency" className="block text-xs font-medium text-slate-600 mb-1">
                Preferred Currency
              </label>
              <select
                id="profCurrency"
                value={profCurrency}
                onChange={(e) => setProfCurrency(normalizeCurrencyCode(e.target.value))}
                className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol.trim()}) — {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="profGstin" className="block text-xs font-medium text-slate-600 mb-1">
                Tax ID / GSTIN (Optional)
              </label>
              <input
                id="profGstin"
                type="text"
                value={profGstin}
                onChange={(e) => setProfGstin(e.target.value)}
                placeholder="e.g. 27AABCU9603R1ZM"
                maxLength={20}
                className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono-num text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label htmlFor="profWhatsapp" className="block text-xs font-medium text-slate-600 mb-1">
                Default WhatsApp Report Number (Optional)
              </label>
              <input
                id="profWhatsapp"
                type="tel"
                value={profWhatsapp}
                onChange={(e) => setProfWhatsapp(e.target.value)}
                placeholder="e.g. +91 98201 44110"
                maxLength={20}
                className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono-num text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingProfile}
            className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-xs font-semibold text-white transition-colors inline-flex items-center gap-2"
          >
            {isSavingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {isSavingProfile ? 'Updating Profile...' : 'Save Shop Profile'}
          </button>
        </form>

        {/* Secure Checksum-Verified Backup & Restore Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Secure Shop Backups (SHA-256 Verified)</h3>
              <p className="text-xs text-slate-500">
                Export tamper-evident full backups or restore verified snapshots
              </p>
            </div>
          </div>

          {backupError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{backupError}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={backupLabel}
              onChange={(e) => setBackupLabel(e.target.value)}
              placeholder="Backup label (e.g. FY 2026 Close)"
              maxLength={100}
              aria-label="Backup snapshot label"
              className="flex-1 min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              type="button"
              disabled={isCreatingBackup}
              onClick={() => void handleCreateBackupClick()}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-xs font-semibold text-white transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isCreatingBackup ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <HardDriveDownload className="w-4 h-4" />
              )}
              Download Verified Backup
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <input
              ref={restoreInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setBackupError(null);
                  setPendingRestoreFile(file);
                }
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={isRestoringBackup}
              onClick={() => restoreInputRef.current?.click()}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 inline-flex items-center gap-2"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              Restore from Backup JSON
            </button>
            <span className="text-[11px] text-slate-500">
              {backups.length} cloud-logged snapshot{backups.length === 1 ? '' : 's'}
            </span>
          </div>

          {pendingRestoreFile && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5">
              <div className="text-xs text-amber-950 font-medium">
                Ready to verify SHA-256 checksum and restore{' '}
                <strong className="font-mono-num">{pendingRestoreFile.name}</strong>? This replaces current
                shop sales, expenses, and inventory with the backup contents.
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isRestoringBackup}
                  onClick={() => void handleConfirmRestore()}
                  className="min-h-[34px] px-3.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-xs font-semibold text-white inline-flex items-center gap-1.5"
                >
                  {isRestoringBackup && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isRestoringBackup ? 'Verifying & Restoring...' : 'Verify & Restore Backup'}
                </button>
                <button
                  type="button"
                  disabled={isRestoringBackup}
                  onClick={() => setPendingRestoreFile(null)}
                  className="min-h-[34px] px-3 rounded-lg bg-white border border-amber-300 text-xs font-medium text-amber-950 hover:bg-amber-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Cloud Backup Audit Log */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[160px]">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="text-left py-2 px-3 whitespace-nowrap">Label</th>
                    <th className="text-right py-2 px-3 whitespace-nowrap">Records</th>
                    <th className="text-right py-2 px-3 whitespace-nowrap">Size</th>
                    <th className="text-left py-2 px-3 whitespace-nowrap">SHA-256</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {backups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-slate-500">
                        No cloud backup checkpoints recorded yet.
                      </td>
                    </tr>
                  ) : (
                    backups.slice(0, 6).map((b) => (
                      <tr key={b.id}>
                        <td className="py-2 px-3 font-medium text-slate-800 whitespace-nowrap">
                          {b.label}
                          <div className="text-[10px] text-slate-400">
                            {new Date(b.createdAtIso).toLocaleDateString(currencyMeta.locale)}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-mono-num text-slate-600 whitespace-nowrap">
                          {b.salesCount}S / {b.expensesCount}E / {b.inventoryCount}I / {b.customersCount ?? 0}C
                        </td>
                        <td className="py-2 px-3 text-right font-mono-num text-slate-600 whitespace-nowrap">
                          {b.snapshotSizeKb} KB
                        </td>
                        <td className="py-2 px-3 font-mono-num text-[11px] text-emerald-700 whitespace-nowrap">
                          {b.checksum.slice(0, 12)}...
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Explorer Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Transaction Explorer</h3>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Showing {fmtNumber(visibleRows.length, activeCurrency)} of {fmtNumber(filteredDataset.length, activeCurrency)} filtered records
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product, category, region..."
              aria-label="Search transactions"
              className="w-full min-h-[40px] pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
              <tr className="text-xs font-semibold text-slate-500">
                {(
                  [
                    ['Date', 'Date', 'left'],
                    ['Product', 'Product', 'left'],
                    ['Category', 'Category', 'left'],
                    ['Region', 'Region', 'left'],
                    ['Quantity', 'Qty', 'right'],
                    ['Revenue', 'Revenue', 'right'],
                    ['Cost', 'Cost', 'right'],
                    ['Profit', 'Profit', 'right'],
                  ] as Array<[TableSortKey, string, 'left' | 'right']>
                ).map(([key, label, align]) => (
                  <th
                    key={key}
                    className={`py-3 px-4 whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(key)}
                      className="inline-flex items-center gap-1 hover:text-slate-900 focus-visible:outline-none focus-visible:underline"
                    >
                      {label}
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500 text-sm">
                    No matching transactions found. Try clearing your search or adjusting the date/category filters.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, i) => (
                  <tr key={row.id || `${row.Date}-${row.Product}-${row.Region}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono-num text-xs text-slate-600 whitespace-nowrap">
                      {row.Date}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">{row.Product}</td>
                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">{row.Category}</td>
                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">{row.Region}</td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-slate-700 whitespace-nowrap">
                      {fmtNumber(row.Quantity, activeCurrency)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                      {fmtCurrency(row.Revenue, activeCurrency)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-slate-600 whitespace-nowrap">
                      {fmtCurrency(row.Cost, activeCurrency)}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono-num font-semibold whitespace-nowrap ${
                        row.Profit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {fmtCurrency(row.Profit, activeCurrency)}
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
}
