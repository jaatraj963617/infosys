import { useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, Loader2, Plus, ReceiptText, ShoppingCart, Trash2 } from 'lucide-react';
import type {
  CurrencyCode,
  CustomerRecord,
  ExpenseRecord,
  InventoryItem,
  ProfitAndLossSummary,
  SalesRecord,
} from '../../types/bi';
import {
  EXPENSE_CATEGORIES,
  PAYMENT_MODES,
  fmtCurrency,
  fmtNumber,
  roundCurrencyAmount,
} from '../../utils/analytics';
import { getCurrencyMeta } from '../../utils/businessConfig';
import { formatFriendlyFirestoreError } from '../../firebase';

interface LedgerAndPnLViewProps {
  currency: CurrencyCode;
  filteredSales: SalesRecord[];
  filteredExpenses: ExpenseRecord[];
  inventory: InventoryItem[];
  customers: CustomerRecord[];
  pnl: ProfitAndLossSummary;
  defaultDate: string;
  onAddSale: (sale: Omit<SalesRecord, 'id'>, matchedSkuId?: string) => Promise<void>;
  onDeleteSale: (id: string) => Promise<void>;
  onAddExpense: (expense: Omit<ExpenseRecord, 'id'>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
}

const REGION_PRESETS = [
  'Maharashtra (West)',
  'Delhi NCR (North)',
  'Karnataka (South)',
  'West Bengal (East)',
  'Gujarat (West)',
  'Tamil Nadu (South)',
];

export function LedgerAndPnLView({
  currency,
  filteredSales,
  filteredExpenses,
  inventory,
  customers,
  pnl,
  defaultDate,
  onAddSale,
  onDeleteSale,
  onAddExpense,
  onDeleteExpense,
}: LedgerAndPnLViewProps) {
  const currencyMeta = getCurrencyMeta(currency);
  const currencyStep = currencyMeta.decimals === 0 ? '1' : '0.01';
  const minCurrencyAmount = currencyMeta.decimals === 0 ? 1 : 0.01;
  const safeDefaultDate = defaultDate || new Date().toISOString().slice(0, 10);

  // Add Sale state
  const [selectedSkuId, setSelectedSkuId] = useState<string>('CUSTOM');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('WALKIN');
  const [saleDate, setSaleDate] = useState(safeDefaultDate);
  const [saleProduct, setSaleProduct] = useState('');
  const [saleCategory, setSaleCategory] = useState('Groceries & Staples');
  const [saleRegion, setSaleRegion] = useState('Maharashtra (West)');
  const [saleQty, setSaleQty] = useState('1');
  const [saleUnitPrice, setSaleUnitPrice] = useState('');
  const [saleUnitCost, setSaleUnitCost] = useState('');
  const [salePaymentMode, setSalePaymentMode] = useState<string>('UPI');
  const [saleError, setSaleError] = useState<string | null>(null);
  const [isSavingSale, setIsSavingSale] = useState(false);

  // Add Expense state
  const [expDate, setExpDate] = useState(safeDefaultDate);
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [expAmount, setExpAmount] = useState('');
  const [expPaymentMode, setExpPaymentMode] = useState<string>('UPI');
  const [expNotes, setExpNotes] = useState('');
  const [expError, setExpError] = useState<string | null>(null);
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  // Ledger table switcher
  const [ledgerTab, setLedgerTab] = useState<'expenses' | 'sales'>('expenses');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [ledgerError, setLedgerError] = useState<string | null>(null);

  const selectedSkuItem = useMemo(
    () => inventory.find((item) => item.id === selectedSkuId) || null,
    [inventory, selectedSkuId]
  );

  const handleSelectSku = (skuId: string) => {
    setSelectedSkuId(skuId);
    setSaleError(null);
    if (skuId === 'CUSTOM') {
      return;
    }
    const found = inventory.find((i) => i.id === skuId);
    if (found) {
      setSaleProduct(found.name);
      setSaleCategory(found.category);
      setSaleUnitPrice(String(found.unitPrice));
      setSaleUnitCost(String(found.unitCost));
    }
  };

  const parsedQty = Math.max(0, Math.round(Number(saleQty) || 0));
  const parsedUnitPrice = roundCurrencyAmount(Math.max(0, Number(saleUnitPrice) || 0), currency);
  const parsedUnitCost = roundCurrencyAmount(Math.max(0, Number(saleUnitCost) || 0), currency);
  const previewRevenue = roundCurrencyAmount(parsedQty * parsedUnitPrice, currency);
  const previewCost = roundCurrencyAmount(parsedQty * parsedUnitCost, currency);
  const previewProfit = roundCurrencyAmount(previewRevenue - previewCost, currency);

  const handleSubmitSale = async (e: FormEvent) => {
    e.preventDefault();
    if (isSavingSale) return;
    setSaleError(null);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(saleDate)) {
      setSaleError('Please choose a valid sale date (YYYY-MM-DD).');
      return;
    }
    const cleanProd = saleProduct.trim();
    if (!cleanProd || cleanProd.length > 140) {
      setSaleError('Product name is required (1–140 characters).');
      return;
    }
    if (parsedQty < 1 || parsedQty > 1000000) {
      setSaleError('Quantity must be between 1 and 1,000,000.');
      return;
    }
    if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice <= 0) {
      setSaleError('Unit selling price must be greater than 0.');
      return;
    }
    if (!Number.isFinite(parsedUnitCost) || parsedUnitCost < 0) {
      setSaleError('Unit cost cannot be negative.');
      return;
    }
    if (previewRevenue > 1000000000 || previewCost > 1000000000) {
      setSaleError(
        `Total sale revenue or cost exceeds the allowed maximum (${fmtCurrency(1000000000, currency)}).`
      );
      return;
    }

    const matchedCustomer = customers.find((c) => c.id === selectedCustomerId);

    setIsSavingSale(true);
    try {
      await onAddSale(
        {
          Date: saleDate,
          Product: cleanProd,
          Category: saleCategory.trim().slice(0, 80) || 'General',
          Quantity: parsedQty,
          Revenue: previewRevenue,
          Cost: previewCost,
          Profit: previewProfit,
          Region: saleRegion.trim().slice(0, 80) || 'India',
          PaymentMode: salePaymentMode,
          ...(matchedCustomer
            ? { customerId: matchedCustomer.id, customerName: matchedCustomer.name }
            : {}),
        },
        selectedSkuItem ? selectedSkuItem.id : undefined
      );

      if (selectedSkuId === 'CUSTOM') {
        setSaleProduct('');
        setSaleUnitPrice('');
        setSaleUnitCost('');
      }
      setSaleQty('1');
    } catch (err) {
      setSaleError(formatFriendlyFirestoreError(err));
    } finally {
      setIsSavingSale(false);
    }
  };

  const handleSubmitExpense = async (e: FormEvent) => {
    e.preventDefault();
    if (isSavingExpense) return;
    setExpError(null);

    const amount = roundCurrencyAmount(Number(expAmount), currency);
    const cleanTitle = expTitle.trim();
    const cleanNotes = expNotes.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(expDate)) {
      setExpError('Please choose a valid expense date (YYYY-MM-DD).');
      return;
    }
    if (!cleanTitle || cleanTitle.length > 140) {
      setExpError('Expense description is required (1–140 characters).');
      return;
    }
    if (!Number.isFinite(amount) || amount < minCurrencyAmount || amount > 1000000000) {
      setExpError(
        `Expense amount must be between ${fmtCurrency(minCurrencyAmount, currency)} and ${fmtCurrency(1000000000, currency)}.`
      );
      return;
    }
    if (cleanNotes.length > 240) {
      setExpError('Notes must be 240 characters or fewer.');
      return;
    }

    setIsSavingExpense(true);
    try {
      await onAddExpense({
        Date: expDate,
        Title: cleanTitle,
        Category: expCategory,
        Amount: amount,
        PaymentMode: expPaymentMode,
        Notes: cleanNotes || undefined,
      });

      setExpTitle('');
      setExpAmount('');
      setExpNotes('');
    } catch (err) {
      setExpError(formatFriendlyFirestoreError(err));
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteRow = async (kind: 'sale' | 'expense', id: string) => {
    setLedgerError(null);
    setDeletingId(id);
    try {
      if (kind === 'sale') {
        await onDeleteSale(id);
      } else {
        await onDeleteExpense(id);
      }
    } catch (err) {
      setLedgerError(formatFriendlyFirestoreError(err));
    } finally {
      setDeletingId(null);
    }
  };

  const sortedExpenses = useMemo(
    () => [...filteredExpenses].sort((a, b) => b.Date.localeCompare(a.Date)),
    [filteredExpenses]
  );

  const sortedSales = useMemo(
    () => [...filteredSales].sort((a, b) => b.Date.localeCompare(a.Date)).slice(0, 120),
    [filteredSales]
  );

  return (
    <div className="space-y-6">
      {/* Live Automatic Profit & Loss Statement */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Automatic Profit &amp; Loss (P&amp;L) Statement
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Recalculates live whenever sales, COGS, operating expenses, or filters change
            </p>
          </div>
          <span
            className={`text-xs font-mono-num font-bold whitespace-nowrap ${
              pnl.isLoss ? 'text-rose-700' : 'text-emerald-700'
            }`}
          >
            {pnl.isLoss ? 'NET LOSS' : 'NET PROFIT'}: {pnl.isLoss ? '-' : ''}
            {fmtCurrency(Math.abs(pnl.netProfit), currency)} ({pnl.netMarginPct.toFixed(1)}%)
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-5">
          {/* Income Statement Waterfall */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Line Item</span>
              <span>
                Amount ({currencyMeta.code} {currencyMeta.symbol.trim()})
              </span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">Gross Sales Revenue</span>
              <span className="font-mono-num font-semibold text-slate-900">
                {fmtCurrency(pnl.grossRevenue, currency)}
              </span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-slate-600">Less: Cost of Goods Sold (COGS)</span>
              <span className="font-mono-num text-slate-700">
                -{fmtCurrency(pnl.totalCogs, currency)}
              </span>
            </div>
            <div className="px-4 py-3 bg-violet-50/50 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-900">
                Gross Profit ({pnl.grossMarginPct.toFixed(1)}% margin)
              </span>
              <span className="font-mono-num font-bold text-violet-700">
                {fmtCurrency(pnl.grossProfit, currency)}
              </span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-slate-600">Less: Total Operating Expenses</span>
              <span className="font-mono-num text-amber-700 font-medium">
                -{fmtCurrency(pnl.totalExpenses, currency)}
              </span>
            </div>
            <div
              className={`px-4 py-3.5 flex items-center justify-between text-sm ${
                pnl.isLoss ? 'bg-rose-50/70' : 'bg-emerald-50/70'
              }`}
            >
              <span className="font-bold text-slate-900">
                {pnl.isLoss ? 'Net Operating Loss' : 'Net Operating Profit'} ({pnl.netMarginPct.toFixed(1)}%)
              </span>
              <span
                className={`font-mono-num text-base font-bold ${
                  pnl.isLoss ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {pnl.isLoss ? '-' : ''}
                {fmtCurrency(Math.abs(pnl.netProfit), currency)}
              </span>
            </div>
          </div>

          {/* Operating Expenses Breakdown by Category */}
          <div className="border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-900">Operating Expense Breakdown</h4>
                <span className="text-xs text-slate-500 tabular-nums">
                  {filteredExpenses.length} entries
                </span>
              </div>

              {pnl.expensesByCategory.length === 0 ? (
                <p className="text-xs text-slate-500 py-6">
                  No expenses recorded in the active period. Add an expense below to track operating overhead.
                </p>
              ) : (
                <div className="space-y-3">
                  {pnl.expensesByCategory.map((item) => (
                    <div key={item.category}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">{item.category}</span>
                        <span className="font-mono-num font-semibold text-slate-900">
                          {fmtCurrency(item.amount, currency)}{' '}
                          <span className="text-slate-400 font-normal">({item.sharePct.toFixed(1)}%)</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-violet-600 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(2, item.sharePct))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Sale & Add Expense Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Add Sale Form */}
        <form
          onSubmit={handleSubmitSale}
          className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Record New Sale</h3>
                <p className="text-xs text-slate-500">Auto-updates revenue, profit &amp; linked SKU stock</p>
              </div>
            </div>
          </div>

          {saleError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{saleError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label htmlFor="saleSkuSelect" className="block text-xs font-medium text-slate-600 mb-1">
                Select Product from Inventory (Optional)
              </label>
              <select
                id="saleSkuSelect"
                value={selectedSkuId}
                onChange={(e) => handleSelectSku(e.target.value)}
                className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="CUSTOM">Custom / Non-inventory Item</option>
                {inventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    [{item.sku}] {item.name} — {item.stock} in stock ({fmtCurrency(item.unitPrice, currency)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="saleDate" className="block text-xs font-medium text-slate-600 mb-1">
                Sale Date
              </label>
              <input
                id="saleDate"
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                required
                className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label htmlFor="salePayment" className="block text-xs font-medium text-slate-600 mb-1">
                Payment Mode
              </label>
              <select
                id="salePayment"
                value={salePaymentMode}
                onChange={(e) => setSalePaymentMode(e.target.value)}
                className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="saleProduct" className="block text-xs font-medium text-slate-600 mb-1">
                Product Name
              </label>
              <input
                id="saleProduct"
                type="text"
                value={saleProduct}
                onChange={(e) => setSaleProduct(e.target.value)}
                placeholder="e.g. Basmati Rice 25kg Bag"
                maxLength={140}
                required
                className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label htmlFor="saleCategory" className="block text-xs font-medium text-slate-600 mb-1">
                Category
              </label>
              <input
                id="saleCategory"
                type="text"
                value={saleCategory}
                onChange={(e) => setSaleCategory(e.target.value)}
                placeholder="e.g. Groceries & Staples"
                maxLength={80}
                required
                className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label htmlFor="saleRegion" className="block text-xs font-medium text-slate-600 mb-1">
                Region
              </label>
              <input
                id="saleRegion"
                list="region-presets"
                value={saleRegion}
                onChange={(e) => setSaleRegion(e.target.value)}
                placeholder="e.g. Maharashtra (West)"
                maxLength={80}
                required
                className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <datalist id="region-presets">
                {REGION_PRESETS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>

            <div>
              <label htmlFor="saleQty" className="block text-xs font-medium text-slate-600 mb-1">
                Quantity
              </label>
              <input
                id="saleQty"
                type="number"
                min="1"
                max="1000000"
                step="1"
                value={saleQty}
                onChange={(e) => setSaleQty(e.target.value)}
                required
                className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono-num text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label htmlFor="saleUnitPrice" className="block text-xs font-medium text-slate-600 mb-1">
                Unit Selling Price ({currencyMeta.symbol.trim()})
              </label>
              <input
                id="saleUnitPrice"
                type="number"
                min={minCurrencyAmount}
                step={currencyStep}
                value={saleUnitPrice}
                onChange={(e) => setSaleUnitPrice(e.target.value)}
                placeholder="e.g. 2450"
                required
                className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono-num text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label htmlFor="saleUnitCost" className="block text-xs font-medium text-slate-600 mb-1">
                Unit Cost / COGS ({currencyMeta.symbol.trim()})
              </label>
              <input
                id="saleUnitCost"
                type="number"
                min="0"
                step={currencyStep}
                value={saleUnitCost}
                onChange={(e) => setSaleUnitCost(e.target.value)}
                placeholder="e.g. 1800"
                required
                className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono-num text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label htmlFor="saleCustomerSelect" className="block text-xs font-medium text-slate-600 mb-1">
                Customer (Optional)
              </label>
              <select
                id="saleCustomerSelect"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="WALKIN">Walk-in / Unlinked Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.segment})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-600">
              Total Revenue:{' '}
              <strong className="font-mono-num text-slate-900">{fmtCurrency(previewRevenue, currency)}</strong>
            </span>
            <span className="text-slate-600">
              Gross Profit:{' '}
              <strong
                className={`font-mono-num ${previewProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
              >
                {fmtCurrency(previewProfit, currency)}
              </strong>
            </span>
          </div>

          <button
            type="submit"
            disabled={isSavingSale}
            className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-sm font-semibold text-white transition-colors inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            {isSavingSale ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isSavingSale ? 'Saving Sale...' : 'Add Sale Entry'}
          </button>
        </form>

        {/* Add Expense Form */}
        <form
          onSubmit={handleSubmitExpense}
          className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <ReceiptText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Operating Expense</h3>
                <p className="text-xs text-slate-500">Rent, payroll, logistics, GST compliance, marketing &amp; utilities</p>
              </div>
            </div>

            {expError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{expError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="expDate" className="block text-xs font-medium text-slate-600 mb-1">
                  Expense Date
                </label>
                <input
                  id="expDate"
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  required
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="expCategory" className="block text-xs font-medium text-slate-600 mb-1">
                  Expense Category
                </label>
                <select
                  id="expCategory"
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="expTitle" className="block text-xs font-medium text-slate-600 mb-1">
                  Expense Description
                </label>
                <input
                  id="expTitle"
                  type="text"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="e.g. Warehouse Electricity Bill or Delhivery Invoice"
                  maxLength={140}
                  required
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="expAmount" className="block text-xs font-medium text-slate-600 mb-1">
                  Amount ({currencyMeta.symbol.trim()})
                </label>
                <input
                  id="expAmount"
                  type="number"
                  min={minCurrencyAmount}
                  max="1000000000"
                  step={currencyStep}
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="e.g. 4500"
                  required
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono-num text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="expPayment" className="block text-xs font-medium text-slate-600 mb-1">
                  Payment Mode
                </label>
                <select
                  id="expPayment"
                  value={expPaymentMode}
                  onChange={(e) => setExpPaymentMode(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="expNotes" className="block text-xs font-medium text-slate-600 mb-1">
                  Notes / GST Reference (Optional)
                </label>
                <input
                  id="expNotes"
                  type="text"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  placeholder="e.g. Invoice #INV-2041"
                  maxLength={240}
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSavingExpense}
            className="w-full min-h-[42px] px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-sm font-semibold text-white transition-colors inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            {isSavingExpense ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isSavingExpense ? 'Saving Expense...' : 'Add Expense Entry'}
          </button>
        </form>
      </div>

      {/* Ledger History Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Sales &amp; Expenses Ledger</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing entries within the active date range filter
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 self-start">
            <button
              type="button"
              onClick={() => setLedgerTab('expenses')}
              className={`min-h-[34px] px-3.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                ledgerTab === 'expenses'
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Expenses ({fmtNumber(filteredExpenses.length, currency)})
            </button>
            <button
              type="button"
              onClick={() => setLedgerTab('sales')}
              className={`min-h-[34px] px-3.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                ledgerTab === 'sales'
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sales ({fmtNumber(filteredSales.length, currency)})
            </button>
          </div>
        </div>

        {ledgerError && (
          <div
            role="alert"
            className="mx-5 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{ledgerError}</span>
          </div>
        )}

        <div className="overflow-x-auto max-h-[420px]">
          {ledgerTab === 'expenses' ? (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="text-left py-3 px-4 whitespace-nowrap">Date</th>
                  <th className="text-left py-3 px-4 whitespace-nowrap">Description</th>
                  <th className="text-left py-3 px-4 whitespace-nowrap">Category</th>
                  <th className="text-left py-3 px-4 whitespace-nowrap">Mode</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">Amount</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500 text-sm">
                      No operating expenses in the selected date range.
                    </td>
                  </tr>
                ) : (
                  sortedExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono-num text-xs text-slate-600 whitespace-nowrap">
                        {exp.Date}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {exp.Title}
                        {exp.Notes && <span className="ml-2 text-xs font-normal text-slate-400">({exp.Notes})</span>}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">{exp.Category}</td>
                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">{exp.PaymentMode}</td>
                      <td className="py-2.5 px-4 text-right font-mono-num font-semibold text-rose-700 whitespace-nowrap">
                        -{fmtCurrency(exp.Amount, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={deletingId === exp.id}
                          onClick={() => void handleDeleteRow('expense', exp.id)}
                          aria-label={`Delete expense ${exp.Title}`}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 transition-colors"
                        >
                          {deletingId === exp.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="text-left py-3 px-4 whitespace-nowrap">Date</th>
                  <th className="text-left py-3 px-4 whitespace-nowrap">Product</th>
                  <th className="text-left py-3 px-4 whitespace-nowrap">Region</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">Qty</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">Revenue</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">Gross Profit</th>
                  <th className="text-right py-3 px-4 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500 text-sm">
                      No sales entries match the current filters.
                    </td>
                  </tr>
                ) : (
                  sortedSales.map((sale, idx) => (
                    <tr key={sale.id || `${sale.Date}-${sale.Product}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-4 font-mono-num text-xs text-slate-600 whitespace-nowrap">
                        {sale.Date}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{sale.Product}</div>
                        {sale.customerName && (
                          <div className="text-[11px] text-slate-500">Buyer: {sale.customerName}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">{sale.Region}</td>
                      <td className="py-2.5 px-4 text-right font-mono-num text-slate-700 whitespace-nowrap">
                        {fmtNumber(sale.Quantity, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                        {fmtCurrency(sale.Revenue, currency)}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono-num font-semibold whitespace-nowrap ${
                          sale.Profit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {fmtCurrency(sale.Profit, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        {sale.id && (
                          <button
                            type="button"
                            disabled={deletingId === sale.id}
                            onClick={() => void handleDeleteRow('sale', sale.id!)}
                            aria-label={`Delete sale ${sale.Product}`}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 transition-colors"
                          >
                            {deletingId === sale.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
