import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Minus,
  PackagePlus,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  AiLanguage,
  CurrencyCode,
  InventoryItem,
  InventoryPredictionResponse,
  SalesRecord,
  ShopProfile,
} from '../../types/bi';
import {
  buildAiBusinessContext,
  computeAnalytics,
  computeInventoryVelocity,
  computeProfitAndLoss,
  fmtCurrency,
  fmtNumber,
  roundCurrencyAmount,
} from '../../utils/analytics';
import { getCurrencyMeta } from '../../utils/businessConfig';
import { formatFriendlyFirestoreError } from '../../firebase';

interface InventoryViewProps {
  currency: CurrencyCode;
  shopProfile: ShopProfile;
  inventory: InventoryItem[];
  allSales: SalesRecord[];
  onAddProduct: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  onAdjustStock: (id: string, delta: number) => Promise<void>;
  onUpdateReorderLevel: (id: string, level: number) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
}

const URGENCY_STYLE: Record<string, string> = {
  Critical: 'text-rose-700',
  High: 'text-amber-700',
  Medium: 'text-violet-700',
  Watch: 'text-slate-600',
};

export function InventoryView({
  currency,
  shopProfile,
  inventory,
  allSales,
  onAddProduct,
  onAdjustStock,
  onUpdateReorderLevel,
  onDeleteProduct,
}: InventoryViewProps) {
  const currencyMeta = getCurrencyMeta(currency);
  const currencyStep = currencyMeta.decimals === 0 ? '1' : '0.01';
  const minCurrencyAmount = currencyMeta.decimals === 0 ? 1 : 0.01;
  const [filterMode, setFilterMode] = useState<'all' | 'alerts'>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Product form state
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Groceries & Staples');
  const [stock, setStock] = useState('25');
  const [reorderLevel, setReorderLevel] = useState('8');
  const [unitPrice, setUnitPrice] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [supplier, setSupplier] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [tableError, setTableError] = useState<string | null>(null);

  // Smart AI Inventory Prediction state
  const [aiLang, setAiLang] = useState<AiLanguage>('en');
  const [prediction, setPrediction] = useState<InventoryPredictionResponse | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictError, setPredictError] = useState<string | null>(null);

  const velocityItems = useMemo(
    () => computeInventoryVelocity(inventory, allSales, currency),
    [inventory, allSales, currency]
  );

  const outOfStockItems = useMemo(() => inventory.filter((i) => i.stock === 0), [inventory]);
  const lowStockItems = useMemo(
    () => inventory.filter((i) => i.stock > 0 && i.stock <= i.reorderLevel),
    [inventory]
  );
  const alertItems = useMemo(
    () =>
      velocityItems.filter(
        (v) => v.riskStatus === 'out' || v.riskStatus === 'critical' || v.riskStatus === 'low'
      ),
    [velocityItems]
  );

  const totalInventoryValue = useMemo(
    () => roundCurrencyAmount(inventory.reduce((sum, i) => sum + i.stock * i.unitCost, 0), currency),
    [inventory, currency]
  );

  const totalSuggestedRestockCost = useMemo(
    () => roundCurrencyAmount(alertItems.reduce((sum, v) => sum + v.estimatedRestockCost, 0), currency),
    [alertItems, currency]
  );

  const visibleItems = useMemo(() => {
    const base = filterMode === 'alerts' ? alertItems : velocityItems;
    const rankOrder: Record<string, number> = {
      out: 0,
      critical: 1,
      low: 2,
      healthy: 3,
      overstocked: 4,
    };
    return [...base].sort((a, b) => {
      const ra = rankOrder[a.riskStatus] ?? 3;
      const rb = rankOrder[b.riskStatus] ?? 3;
      if (ra !== rb) return ra - rb;
      return a.item.stock - b.item.stock;
    });
  }, [velocityItems, alertItems, filterMode]);

  const handleRunSmartPrediction = async () => {
    if (isPredicting || inventory.length === 0) return;
    setPredictError(null);
    setIsPredicting(true);
    try {
      const stats = computeAnalytics(allSales, [], currency);
      const pnl = computeProfitAndLoss(allSales, [], currency);
      const context = buildAiBusinessContext({
        shopProfile: { ...shopProfile, currency },
        dateRange: 'Full Shop History',
        stats,
        pnl,
        inventory,
        recentSales: allSales,
      });

      const res = await fetch('/api/ai/inventory-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, language: aiLang }),
      });

      const data = (await res.json()) as { prediction?: InventoryPredictionResponse; error?: string };
      if (!res.ok || !data.prediction) {
        throw new Error(data.error || `Prediction request failed with status ${res.status}.`);
      }
      setPrediction(data.prediction);
    } catch (err) {
      setPredictError(err instanceof Error ? err.message : 'Unable to generate smart stock prediction.');
    } finally {
      setIsPredicting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setFormError(null);

    const cleanSku = sku.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanCategory = category.trim();
    const cleanSupplier = supplier.trim() || 'Direct Vendor';
    const numStock = Math.round(Number(stock));
    const numReorder = Math.round(Number(reorderLevel));
    const numPrice = Number(unitPrice);
    const numCost = Number(unitCost);

    if (!cleanSku || cleanSku.length > 40) {
      setFormError('SKU code is required (1–40 characters).');
      return;
    }
    if (inventory.some((i) => i.sku.toUpperCase() === cleanSku)) {
      setFormError(`SKU ${cleanSku} already exists in inventory.`);
      return;
    }
    if (!cleanName || cleanName.length > 140) {
      setFormError('Product name is required (1–140 characters).');
      return;
    }
    if (!cleanCategory || cleanCategory.length > 80) {
      setFormError('Category is required (1–80 characters).');
      return;
    }
    if (!Number.isFinite(numStock) || numStock < 0 || numStock > 10000000) {
      setFormError('Initial stock must be between 0 and 10,000,000.');
      return;
    }
    if (!Number.isFinite(numReorder) || numReorder < 1 || numReorder > 1000000) {
      setFormError('Reorder threshold must be between 1 and 1,000,000.');
      return;
    }
    if (!Number.isFinite(numPrice) || numPrice < minCurrencyAmount || numPrice > 100000000) {
      setFormError(
        `Unit selling price must be between ${fmtCurrency(minCurrencyAmount, currency)} and ${fmtCurrency(100000000, currency)}.`
      );
      return;
    }
    if (!Number.isFinite(numCost) || numCost < 0 || numCost > 100000000) {
      setFormError(
        `Unit cost must be between ${fmtCurrency(0, currency)} and ${fmtCurrency(100000000, currency)}.`
      );
      return;
    }

    setIsSaving(true);
    try {
      await onAddProduct({
        sku: cleanSku,
        name: cleanName,
        category: cleanCategory,
        stock: numStock,
        reorderLevel: numReorder,
        unitPrice: roundCurrencyAmount(numPrice, currency),
        unitCost: roundCurrencyAmount(numCost, currency),
        supplier: cleanSupplier.slice(0, 120),
      });

      setSku('');
      setName('');
      setUnitPrice('');
      setUnitCost('');
      setSupplier('');
      setStock('25');
      setReorderLevel('8');
      setShowAddForm(false);
    } catch (err) {
      setFormError(formatFriendlyFirestoreError(err));
    } finally {
      setIsSaving(false);
    }
  };

  const runItemAction = async (id: string, fn: () => Promise<void>) => {
    setTableError(null);
    setBusyItemId(id);
    try {
      await fn();
    } catch (err) {
      setTableError(formatFriendlyFirestoreError(err));
    } finally {
      setBusyItemId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Tracked Product SKUs</div>
          <div className="font-mono-num text-2xl font-bold text-slate-900 mt-2">
            {fmtNumber(inventory.length, currency)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">Active catalog items</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Inventory Valuation (At Cost)</div>
          <div className="font-mono-num text-2xl font-bold text-slate-900 mt-2">
            {fmtCurrency(totalInventoryValue, currency)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">Capital tied in stock</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Low-Stock &amp; Velocity Risks</div>
          <div className="font-mono-num text-2xl font-bold text-amber-700 mt-2">
            {fmtNumber(alertItems.length, currency)}
          </div>
          <div className="text-xs text-amber-700 mt-1.5">
            {fmtNumber(lowStockItems.length, currency)} below reorder · Est. {fmtCurrency(totalSuggestedRestockCost, currency)} to restock
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Out-of-Stock SKUs</div>
          <div className="font-mono-num text-2xl font-bold text-rose-700 mt-2">
            {fmtNumber(outOfStockItems.length, currency)}
          </div>
          <div className="text-xs text-rose-700 mt-1.5">Immediate restock needed</div>
        </div>
      </div>

      {/* Low-Stock Alert Callout */}
      {alertItems.length > 0 ? (
        <div
          role="status"
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                Smart Stockout Alert: {alertItems.length} SKU{alertItems.length === 1 ? '' : 's'} Need Attention
              </h3>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                {alertItems
                  .map((v) =>
                    v.daysUntilStockout !== null
                      ? `${v.item.name} (${v.item.stock} left · ~${v.daysUntilStockout}d cover)`
                      : `${v.item.name} (${v.item.stock} left)`
                  )
                  .join(' · ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFilterMode(filterMode === 'alerts' ? 'all' : 'alerts')}
            className="min-h-[38px] px-4 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-semibold text-amber-950 hover:bg-amber-100 whitespace-nowrap shrink-0"
          >
            {filterMode === 'alerts' ? 'Show All SKUs' : `View ${alertItems.length} Risks Only`}
          </button>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-900 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>All {inventory.length} inventory SKUs are comfortably above reorder and 14-day cover thresholds.</span>
        </div>
      )}

      {/* Smart AI Inventory Prediction Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Inventory Prediction · Sales Velocity + Gemini AI</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              AI Restock Planner &amp; Slow-Moving Stock Detector
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Computes daily sales run-rates from your actual ledger to recommend exact reorder quantities in {currencyMeta.code} ({currencyMeta.symbol.trim()})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              {(
                [
                  ['en', 'English'],
                  ['hi', 'हिन्दी'],
                ] as Array<[AiLanguage, string]>
              ).map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setAiLang(code)}
                  className={`min-h-[32px] px-2.5 rounded-md text-xs font-semibold transition-colors ${
                    aiLang === code ? 'bg-violet-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={isPredicting || inventory.length === 0}
              onClick={() => void handleRunSmartPrediction()}
              className="min-h-[38px] px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-xs font-semibold text-white transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              {isPredicting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {prediction ? 'Refresh AI Stock Plan' : 'Run Smart Stock Prediction'}
            </button>
          </div>
        </div>

        {predictError && (
          <div
            role="alert"
            className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{predictError}</span>
          </div>
        )}

        {isPredicting ? (
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
            <span>Calculating SKU depletion windows and optimal restock order quantities...</span>
          </div>
        ) : prediction ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-700 leading-relaxed">{prediction.summary}</p>
              <div className="shrink-0 text-right">
                <div className="text-[11px] font-medium text-slate-500">Total Suggested Restock</div>
                <div className="font-mono-num text-base font-bold text-violet-700">
                  {fmtCurrency(prediction.totalEstimatedRestock ?? prediction.totalEstimatedRestockInr ?? 0, currency)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {prediction.recommendations.map((rec, idx) => {
                const matched = inventory.find(
                  (i) => i.sku.toLowerCase() === rec.sku.toLowerCase()
                );
                return (
                  <div
                    key={`${rec.sku}-${idx}`}
                    className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono-num text-xs font-semibold text-slate-500">{rec.sku}</span>
                        <span className={`text-xs font-bold ${URGENCY_STYLE[rec.urgency] || 'text-slate-700'}`}>
                          {rec.urgency} Urgency
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-900">{rec.productName}</div>
                      <p className="text-xs text-slate-600 leading-relaxed">{rec.reason}</p>
                    </div>
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="text-xs text-slate-700 font-mono-num">
                        Order <strong>+{fmtNumber(rec.suggestedOrderQty, currency)}</strong> (
                        {fmtCurrency(rec.estimatedCost ?? rec.estimatedCostInr ?? 0, currency)})
                      </div>
                      {matched && rec.suggestedOrderQty > 0 && (
                        <button
                          type="button"
                          disabled={busyItemId === matched.id}
                          onClick={() =>
                            void runItemAction(matched.id, () =>
                              onAdjustStock(matched.id, Math.round(rec.suggestedOrderQty))
                            )
                          }
                          className="min-h-[30px] px-3 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-xs font-semibold text-white whitespace-nowrap"
                        >
                          Apply +{Math.round(rec.suggestedOrderQty)} Stock
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {prediction.slowMovingAlerts.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                <div className="text-xs font-bold text-amber-900">Slow-Moving / Overstock Alerts</div>
                <ul className="list-disc pl-4 text-xs text-amber-900 space-y-1">
                  {prediction.slowMovingAlerts.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            Click &ldquo;Run Smart Stock Prediction&rdquo; to get Gemini AI restock recommendations prioritized by stockout urgency and {currencyMeta.code} working-capital impact.
          </div>
        )}
      </div>

      {/* Product & Stock Catalog */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">Product &amp; Velocity Catalog</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live daily run-rate, estimated days of cover, reorder thresholds &amp; quick restock
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`min-h-[34px] px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  filterMode === 'all' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({inventory.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('alerts')}
                className={`min-h-[34px] px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  filterMode === 'alerts' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Risks ({alertItems.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="min-h-[38px] px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white transition-colors inline-flex items-center gap-2 whitespace-nowrap"
            >
              <PackagePlus className="w-4 h-4" />
              {showAddForm ? 'Close Form' : 'Add New Product'}
            </button>
          </div>
        </div>

        {showAddForm && (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Add Product to Inventory</h4>
            {formError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label htmlFor="invSku" className="block text-xs font-medium text-slate-600 mb-1">
                  SKU Code
                </label>
                <input
                  id="invSku"
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. IND-601"
                  maxLength={40}
                  required
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-sm font-mono-num text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="invName" className="block text-xs font-medium text-slate-600 mb-1">
                  Product Name
                </label>
                <input
                  id="invName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Darjeeling First Flush Tea 500g"
                  maxLength={140}
                  required
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="invCat" className="block text-xs font-medium text-slate-600 mb-1">
                  Category
                </label>
                <input
                  id="invCat"
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  maxLength={80}
                  required
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="invStock" className="block text-xs font-medium text-slate-600 mb-1">
                  Initial Stock
                </label>
                <input
                  id="invStock"
                  type="number"
                  min="0"
                  max="10000000"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  required
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-sm font-mono-num text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="invReorder" className="block text-xs font-medium text-slate-600 mb-1">
                  Reorder Alert Threshold
                </label>
                <input
                  id="invReorder"
                  type="number"
                  min="1"
                  max="1000000"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value)}
                  required
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-sm font-mono-num text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="invPrice" className="block text-xs font-medium text-slate-600 mb-1">
                  Selling Price ({currencyMeta.symbol.trim()})
                </label>
                <input
                  id="invPrice"
                  type="number"
                  min={minCurrencyAmount}
                  step={currencyStep}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="e.g. 950"
                  required
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-sm font-mono-num text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="invCost" className="block text-xs font-medium text-slate-600 mb-1">
                  Unit Cost ({currencyMeta.symbol.trim()})
                </label>
                <input
                  id="invCost"
                  type="number"
                  min="0"
                  step={currencyStep}
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="e.g. 580"
                  required
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-sm font-mono-num text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label htmlFor="invSupplier" className="block text-xs font-medium text-slate-600 mb-1">
                  Supplier Name
                </label>
                <input
                  id="invSupplier"
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="e.g. Siliguri Tea Growers Co-op"
                  maxLength={120}
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full min-h-[38px] px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-xs font-semibold text-white transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isSaving ? 'Saving SKU...' : 'Save Product SKU'}
                </button>
              </div>
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

        {/* Inventory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="text-left py-3 px-4 whitespace-nowrap">SKU</th>
                <th className="text-left py-3 px-4 whitespace-nowrap">Product &amp; Supplier</th>
                <th className="text-right py-3 px-4 whitespace-nowrap">Unit Price</th>
                <th className="text-right py-3 px-4 whitespace-nowrap">In Stock</th>
                <th className="text-right py-3 px-4 whitespace-nowrap">Run Rate</th>
                <th className="text-right py-3 px-4 whitespace-nowrap">Est. Days Left</th>
                <th className="text-right py-3 px-4 whitespace-nowrap">Reorder At</th>
                <th className="text-left py-3 px-4 whitespace-nowrap">Prediction</th>
                <th className="text-right py-3 px-4 whitespace-nowrap">Quick Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500 text-sm">
                    No inventory items match this view.
                  </td>
                </tr>
              ) : (
                visibleItems.map((vel) => {
                  const { item, dailyRunRate, daysUntilStockout, suggestedReorderQty, riskStatus } = vel;
                  const isOut = riskStatus === 'out';
                  const isCritOrLow = riskStatus === 'critical' || riskStatus === 'low';
                  const isBusy = busyItemId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono-num text-xs font-semibold text-slate-700 whitespace-nowrap">
                        {item.sku}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500">
                          {item.category} · {item.supplier}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                        {fmtCurrency(item.unitPrice, currency)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono-num font-bold whitespace-nowrap ${
                          isOut ? 'text-rose-700' : isCritOrLow ? 'text-amber-700' : 'text-slate-900'
                        }`}
                      >
                        {fmtNumber(item.stock, currency)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num text-xs text-slate-600 whitespace-nowrap">
                        {dailyRunRate > 0 ? `${dailyRunRate.toFixed(2)}/day` : '—'}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono-num text-xs font-semibold whitespace-nowrap ${
                          daysUntilStockout !== null && daysUntilStockout <= 7
                            ? 'text-rose-700'
                            : daysUntilStockout !== null && daysUntilStockout <= 14
                              ? 'text-amber-700'
                              : 'text-slate-700'
                        }`}
                      >
                        {daysUntilStockout === null ? '—' : `${daysUntilStockout}d`}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <input
                          type="number"
                          min="1"
                          max="1000000"
                          aria-label={`Reorder threshold for ${item.name}`}
                          defaultValue={item.reorderLevel}
                          key={`${item.id}-${item.reorderLevel}`}
                          onBlur={(e) => {
                            const val = Math.max(1, Math.min(1000000, Math.round(Number(e.target.value) || 1)));
                            if (val !== item.reorderLevel) {
                              void runItemAction(item.id, () => onUpdateReorderLevel(item.id, val));
                            }
                          }}
                          className="w-16 min-h-[30px] px-2 text-right rounded border border-slate-200 bg-slate-50 font-mono-num text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {riskStatus === 'out' ? (
                          <span className="text-xs font-bold text-rose-700">Out of Stock</span>
                        ) : riskStatus === 'critical' ? (
                          <span className="text-xs font-bold text-rose-700">Critical (&le;7d)</span>
                        ) : riskStatus === 'low' ? (
                          <span className="text-xs font-bold text-amber-700">Reorder Soon</span>
                        ) : riskStatus === 'overstocked' ? (
                          <span className="text-xs font-semibold text-blue-700">High Cover</span>
                        ) : (
                          <span className="text-xs font-semibold text-emerald-700">Healthy</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={item.stock <= 0 || isBusy}
                            onClick={() => void runItemAction(item.id, () => onAdjustStock(item.id, -1))}
                            aria-label={`Decrease stock for ${item.name}`}
                            className="min-h-[30px] min-w-[30px] px-2 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-xs font-semibold text-slate-700 inline-flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void runItemAction(item.id, () => onAdjustStock(item.id, 5))}
                            aria-label={`Restock 5 units for ${item.name}`}
                            className="min-h-[30px] px-2.5 rounded border border-violet-200 bg-violet-50 hover:bg-violet-100 disabled:opacity-40 text-xs font-semibold text-violet-800 inline-flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />5
                          </button>
                          {suggestedReorderQty > 0 ? (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                void runItemAction(item.id, () => onAdjustStock(item.id, suggestedReorderQty))
                              }
                              title={`Restock suggested ${suggestedReorderQty} units (${fmtCurrency(vel.estimatedRestockCost, currency)})`}
                              className="min-h-[30px] px-2.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-xs font-semibold text-white"
                            >
                              +{suggestedReorderQty}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void runItemAction(item.id, () => onAdjustStock(item.id, 15))}
                              aria-label={`Restock 15 units for ${item.name}`}
                              className="min-h-[30px] px-2.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-xs font-semibold text-white"
                            >
                              +15
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void runItemAction(item.id, () => onDeleteProduct(item.id))}
                            aria-label={`Delete SKU ${item.name}`}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 transition-colors"
                          >
                            {isBusy ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
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
