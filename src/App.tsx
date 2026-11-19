import { useMemo, useRef, useState } from 'react';
import { Check, Download, Menu, Upload } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ExecutiveOverview } from './components/views/ExecutiveOverview';
import { SalesAnalytics } from './components/views/SalesAnalytics';
import { ProductAnalytics } from './components/views/ProductAnalytics';
import { AiInsightsView } from './components/views/AiInsightsView';
import { DataExplorerView } from './components/views/DataExplorerView';
import type { SalesRecord, ViewId } from './types/bi';
import {
  computeAnalytics,
  downloadSampleTemplateCsv,
  exportAnalyticsReportCsv,
  exportFilteredRawCsv,
  fmtNumber,
  generateIntelligence,
  generateSampleDataset,
  parseCsvDataset,
} from './utils/analytics';

const VIEW_META: Record<ViewId, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Executive Overview',
    subtitle: 'Real-time KPIs, revenue trajectory, and business health',
  },
  sales: {
    title: 'Sales Analytics',
    subtitle: 'Monthly trends, cost vs. revenue comparisons, and regional/category splits',
  },
  products: {
    title: 'Product Analytics',
    subtitle: 'Top best-sellers, underperforming SKUs, and margin breakdowns',
  },
  insights: {
    title: 'AI Insights & Strategy',
    subtitle: 'Automated intelligence, interactive Q&A, and actionable recommendations',
  },
  data: {
    title: 'CSV Upload & Data Explorer',
    subtitle: 'Import your own sales CSV or inspect live filtered transactions',
  },
};

export default function App() {
  const initialSample = useMemo(() => generateSampleDataset(), []);
  const [rawDataset, setRawDataset] = useState<SalesRecord[]>(initialSample);
  const [datasetLabel, setDatasetLabel] = useState('Sample Dataset');
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const initialDates = useMemo(() => {
    const dates = initialSample.map((r) => r.Date).sort();
    return { min: dates[0] || '', max: dates[dates.length - 1] || '' };
  }, [initialSample]);

  const [startDate, setStartDate] = useState(initialDates.min);
  const [endDate, setEndDate] = useState(initialDates.max);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedRegion, setSelectedRegion] = useState('ALL');

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const quickUploadInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 3200);
  };

  const categories = useMemo(
    () => [...new Set(rawDataset.map((r) => r.Category))].sort(),
    [rawDataset]
  );

  const regions = useMemo(
    () => [...new Set(rawDataset.map((r) => r.Region))].sort(),
    [rawDataset]
  );

  const filteredDataset = useMemo(() => {
    return rawDataset.filter((row) => {
      if (startDate && row.Date < startDate) return false;
      if (endDate && row.Date > endDate) return false;
      if (selectedCategory !== 'ALL' && row.Category !== selectedCategory) return false;
      if (selectedRegion !== 'ALL' && row.Region !== selectedRegion) return false;
      return true;
    });
  }, [rawDataset, startDate, endDate, selectedCategory, selectedRegion]);

  const stats = useMemo(() => computeAnalytics(filteredDataset), [filteredDataset]);
  const intel = useMemo(() => generateIntelligence(stats), [stats]);

  const resetFiltersForDataset = (data: SalesRecord[]) => {
    const dates = data.map((r) => r.Date).sort();
    setStartDate(dates[0] || '');
    setEndDate(dates[dates.length - 1] || '');
    setSelectedCategory('ALL');
    setSelectedRegion('ALL');
  };

  const handleResetFilters = () => {
    resetFiltersForDataset(rawDataset);
  };

  const handleResetSample = () => {
    const fresh = generateSampleDataset();
    setRawDataset(fresh);
    setDatasetLabel('Sample Dataset');
    setUploadError(null);
    resetFiltersForDataset(fresh);
    showToast(`Restored ${fresh.length}-record SmartBiz demo dataset`);
  };

  const handleUploadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = String(e.target?.result ?? '');
        const parsed = parseCsvDataset(text);
        setRawDataset(parsed);
        setDatasetLabel(file.name);
        setUploadError(null);
        resetFiltersForDataset(parsed);
        setActiveView('dashboard');
        showToast(`Loaded ${parsed.length} records from ${file.name}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to parse CSV file.';
        setUploadError(message);
        setActiveView('data');
      }
    };
    reader.readAsText(file);
  };

  const handleSelectView = (view: ViewId) => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
  };

  const meta = VIEW_META[activeView];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeView={activeView}
        onSelectView={handleSelectView}
        datasetLabel={datasetLabel}
        recordCount={rawDataset.length}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onResetSample={handleResetSample}
      />

      <div className="flex-1 lg:ml-[268px] flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-7 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                {meta.title}
              </h1>
              <p className="text-xs text-slate-500 truncate hidden sm:block">{meta.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <input
              ref={quickUploadInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadFile(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => quickUploadInputRef.current?.click()}
              className="min-h-[40px] px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold text-slate-800 transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Upload className="w-4 h-4 text-slate-600" />
              <span>Upload CSV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                exportAnalyticsReportCsv(filteredDataset);
                showToast('Analytics Report CSV downloaded');
              }}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-xs sm:text-sm font-semibold text-white transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Analytics CSV</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        </header>

        {/* Global Filter Bar */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-7 py-3 flex flex-wrap items-end gap-3.5">
          <div className="flex flex-col gap-1">
            <label htmlFor="filterStartDate" className="text-xs font-medium text-slate-500">
              Start Date
            </label>
            <input
              id="filterStartDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="min-h-[38px] px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="filterEndDate" className="text-xs font-medium text-slate-500">
              End Date
            </label>
            <input
              id="filterEndDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="min-h-[38px] px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="filterCategory" className="text-xs font-medium text-slate-500">
              Category
            </label>
            <select
              id="filterCategory"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="min-h-[38px] px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="filterRegion" className="text-xs font-medium text-slate-500">
              Region
            </label>
            <select
              id="filterRegion"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="min-h-[38px] px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="ALL">All Regions</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            className="min-h-[38px] px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            Reset Filters
          </button>

          <div className="sm:ml-auto text-xs text-slate-500 pb-1.5 tabular-nums">
            Showing <span className="font-semibold text-slate-900">{fmtNumber(filteredDataset.length)}</span>{' '}
            transactions
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-7 max-w-[1440px] w-full mx-auto">
          {filteredDataset.length === 0 && (
            <div
              role="status"
              className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
            >
              <span>
                No transactions match your current filter selection. Adjust dates or reset filters to view analytics.
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-semibold text-amber-900 hover:bg-amber-100 whitespace-nowrap shrink-0"
              >
                Reset Filters
              </button>
            </div>
          )}

          {activeView === 'dashboard' && (
            <ExecutiveOverview stats={stats} intel={intel} onNavigate={handleSelectView} />
          )}
          {activeView === 'sales' && <SalesAnalytics stats={stats} />}
          {activeView === 'products' && <ProductAnalytics stats={stats} />}
          {activeView === 'insights' && <AiInsightsView stats={stats} intel={intel} />}
          {activeView === 'data' && (
            <DataExplorerView
              filteredDataset={filteredDataset}
              onUploadFile={handleUploadFile}
              onDownloadTemplate={() => {
                downloadSampleTemplateCsv();
                showToast('Sample 132-row CSV template downloaded');
              }}
              onExportFiltered={() => {
                exportFilteredRawCsv(filteredDataset);
                showToast('Filtered Sales Dataset CSV downloaded');
              }}
              uploadError={uploadError}
              onClearError={() => setUploadError(null)}
            />
          )}
        </main>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-800 flex items-center gap-2.5 text-sm font-medium"
        >
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
