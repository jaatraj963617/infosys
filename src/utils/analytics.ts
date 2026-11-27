import type {
  AnalyticsSummary,
  CategoryComparisonRow,
  CategoryMetric,
  ComparisonSummary,
  CurrencyCode,
  CustomerAnalyticsSummary,
  CustomerPerformanceMetric,
  CustomerRecord,
  CustomerSegment,
  ExpenseRecord,
  InsightItem,
  IntelligenceReport,
  InventoryItem,
  InventoryVelocityItem,
  MetricDelta,
  MonthlyMetric,
  ProductMetric,
  ProfitAndLossSummary,
  RecommendationItem,
  RegionComparisonRow,
  RegionMetric,
  SalesRecord,
  ShopProfile,
  YearlyMetric,
} from '../types/bi';
import { getCurrencyMeta, normalizeCurrencyCode } from './businessConfig';

export interface DemoBundle {
  sales: SalesRecord[];
  expenses: ExpenseRecord[];
  inventory: InventoryItem[];
  customers: CustomerRecord[];
}

export const EXPENSE_CATEGORIES = [
  'Rent & Utilities',
  'Payroll & Staff',
  'Logistics & Delivery',
  'Marketing & Ads',
  'Packaging & Supplies',
  'GST & Compliance',
  'Other Operating',
] as const;

export const PAYMENT_MODES = ['UPI', 'Bank Transfer', 'Card', 'Cash'] as const;

export function generateIndianSmbDemo(): DemoBundle {
  const catalog = [
    {
      sku: 'IND-101',
      product: 'Basmati Rice 25kg Bag',
      category: 'Groceries & Staples',
      unitPrice: 2450,
      costRatio: 0.74,
      weight: 1.4,
      stock: 6,
      reorderLevel: 12,
      supplier: 'Punjab Agro Mills',
    },
    {
      sku: 'IND-102',
      product: 'Cold-Pressed Mustard Oil 5L',
      category: 'Groceries & Staples',
      unitPrice: 1180,
      costRatio: 0.68,
      weight: 1.25,
      stock: 28,
      reorderLevel: 10,
      supplier: 'Jaipur Kachi Ghani Co.',
    },
    {
      sku: 'IND-103',
      product: 'Organic Turmeric Powder 1kg',
      category: 'Groceries & Staples',
      unitPrice: 360,
      costRatio: 0.56,
      weight: 1.35,
      stock: 34,
      reorderLevel: 15,
      supplier: 'Erode Spice Traders',
    },
    {
      sku: 'IND-201',
      product: 'Handloom Cotton Kurta Set',
      category: 'Apparel & Handloom',
      unitPrice: 1650,
      costRatio: 0.52,
      weight: 1.3,
      stock: 22,
      reorderLevel: 8,
      supplier: 'Surat Weave Studio',
    },
    {
      sku: 'IND-202',
      product: 'Jaipur Block-Print Bedsheet',
      category: 'Apparel & Handloom',
      unitPrice: 1320,
      costRatio: 0.55,
      weight: 1.15,
      stock: 19,
      reorderLevel: 8,
      supplier: 'Sanganer Textile House',
    },
    {
      sku: 'IND-203',
      product: 'Khadi Silk Stole',
      category: 'Apparel & Handloom',
      unitPrice: 890,
      costRatio: 0.48,
      weight: 0.75,
      stock: 0,
      reorderLevel: 6,
      supplier: 'Bhagalpur Silk Guild',
    },
    {
      sku: 'IND-301',
      product: 'Brass Pooja Thali Set',
      category: 'Home & Craft',
      unitPrice: 1420,
      costRatio: 0.57,
      weight: 1.1,
      stock: 5,
      reorderLevel: 8,
      supplier: 'Moradabad Metalcraft',
    },
    {
      sku: 'IND-302',
      product: 'Terracotta Tea Kulhad (50-Pack)',
      category: 'Home & Craft',
      unitPrice: 420,
      costRatio: 0.62,
      weight: 0.9,
      stock: 46,
      reorderLevel: 15,
      supplier: 'Khurja Clay Artisans',
    },
    {
      sku: 'IND-303',
      product: 'Copper Water Bottle 1L',
      category: 'Home & Craft',
      unitPrice: 680,
      costRatio: 0.61,
      weight: 1.0,
      stock: 18,
      reorderLevel: 8,
      supplier: 'Moradabad Metalcraft',
    },
    {
      sku: 'IND-401',
      product: 'POS Billing Tablet Stand',
      category: 'Retail Tech & Billing',
      unitPrice: 2850,
      costRatio: 0.64,
      weight: 0.95,
      stock: 14,
      reorderLevel: 5,
      supplier: 'Noida Hardware Systems',
    },
    {
      sku: 'IND-402',
      product: 'Thermal Receipt Roll (20-Pack)',
      category: 'Retail Tech & Billing',
      unitPrice: 740,
      costRatio: 0.54,
      weight: 0.85,
      stock: 4,
      reorderLevel: 10,
      supplier: 'Noida Hardware Systems',
    },
    {
      sku: 'IND-501',
      product: 'GST Billing Annual Plan',
      category: 'Digital Services',
      unitPrice: 4800,
      costRatio: 0.16,
      weight: 0.8,
      stock: 99,
      reorderLevel: 10,
      supplier: 'In-House SaaS License',
    },
  ];

  const regions = [
    { name: 'Maharashtra (West)', mult: 1.35 },
    { name: 'Delhi NCR (North)', mult: 1.12 },
    { name: 'Karnataka (South)', mult: 0.96 },
    { name: 'West Bengal (East)', mult: 0.62 },
  ];

  const months = [
    { ym: '2025-12', factor: 0.94 },
    { ym: '2026-01', factor: 0.9 },
    { ym: '2026-02', factor: 0.96 },
    { ym: '2026-03', factor: 1.03 },
    { ym: '2026-04', factor: 1.08 },
    { ym: '2026-05', factor: 1.14 },
    { ym: '2026-06', factor: 1.22 },
    { ym: '2026-07', factor: 1.26 },
    { ym: '2026-08', factor: 1.34 },
    { ym: '2026-09', factor: 1.44 },
    { ym: '2026-10', factor: 1.54 },
    { ym: '2026-11', factor: 1.66 },
  ];

  let seed = 4219;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const sales: SalesRecord[] = [];
  const expenses: ExpenseRecord[] = [];

  months.forEach((m, mIdx) => {
    const ordersInMonth = mIdx < 6 ? 15 : 17;
    for (let i = 0; i < ordersInMonth; i++) {
      const item = catalog[(mIdx + i) % catalog.length];
      const reg = regions[(mIdx + i + Math.floor(rand() * 2)) % regions.length];
      const day = String(Math.min(28, 2 + Math.floor(rand() * 26))).padStart(2, '0');
      const baseQty = Math.max(3, Math.round((3.8 + rand() * 4.2) * item.weight * m.factor * reg.mult));
      const priceVariance = 0.98 + rand() * 0.08;
      const revenue = Math.round(baseQty * item.unitPrice * priceVariance);
      const costVariance = item.costRatio * (0.94 + rand() * 0.06);
      const cost = Math.min(
        revenue - Math.max(50, Math.round(revenue * 0.15)),
        Math.round(revenue * costVariance)
      );
      const profit = revenue - cost;
      const payMode = PAYMENT_MODES[(mIdx + i) % PAYMENT_MODES.length];

      sales.push({
        id: `sale_${m.ym}_${i}`,
        Date: `${m.ym}-${day}`,
        Product: item.product,
        Category: item.category,
        Quantity: baseQty,
        Revenue: revenue,
        Cost: cost,
        Profit: profit,
        Region: reg.name,
        PaymentMode: payMode,
      });
    }

    const monthlyExpenseTemplates = [
      {
        title: 'Shop & Warehouse Rent',
        category: 'Rent & Utilities',
        amount: 14000,
        mode: 'Bank Transfer',
        day: '03',
      },
      {
        title: 'Store Staff Salaries',
        category: 'Payroll & Staff',
        amount: Math.round(18000 + mIdx * 350),
        mode: 'Bank Transfer',
        day: '05',
      },
      {
        title: 'Electricity, Wi-Fi & POS Internet',
        category: 'Rent & Utilities',
        amount: Math.round(2400 + rand() * 600),
        mode: 'UPI',
        day: '10',
      },
      {
        title: 'Delhivery & Local Transport Charges',
        category: 'Logistics & Delivery',
        amount: Math.round(3100 * m.factor + rand() * 700),
        mode: 'UPI',
        day: '16',
      },
      {
        title: 'WhatsApp & Meta Festival Ad Campaign',
        category: 'Marketing & Ads',
        amount: Math.round(2300 * m.factor + rand() * 600),
        mode: 'Card',
        day: '20',
      },
      {
        title: 'Corrugated Boxes & Kraft Packaging',
        category: 'Packaging & Supplies',
        amount: Math.round(1450 + rand() * 450),
        mode: 'Cash',
        day: '24',
      },
      {
        title: 'GST Filing & CA Retainer',
        category: 'GST & Compliance',
        amount: 1800,
        mode: 'Bank Transfer',
        day: '27',
      },
    ];

    monthlyExpenseTemplates.forEach((exp, eIdx) => {
      expenses.push({
        id: `exp_${m.ym}_${eIdx}`,
        Date: `${m.ym}-${exp.day}`,
        Title: exp.title,
        Category: exp.category,
        Amount: exp.amount,
        PaymentMode: exp.mode,
      });
    });
  });

  const demoCustomersSeed: Array<{
    id: string;
    name: string;
    phone: string;
    email: string;
    city: string;
    segment: CustomerSegment;
    notes: string;
  }> = [
    {
      id: 'cust_demo_1',
      name: 'Sharma Kirana & Provision Store',
      phone: '+91 98201 44120',
      email: 'orders@sharmakirana.in',
      city: 'Mumbai, Maharashtra',
      segment: 'Wholesale',
      notes: 'Monthly bulk basmati & oil buyer, settles via UPI/NEFT within 7 days.',
    },
    {
      id: 'cust_demo_2',
      name: 'Ananya Deshpande',
      phone: '+91 98230 71845',
      email: 'ananya.d@example.in',
      city: 'Pune, Maharashtra',
      segment: 'VIP',
      notes: 'Prefers handloom kurtas, brass decor, and organic pantry staples.',
    },
    {
      id: 'cust_demo_3',
      name: 'Mehta Corporate Gifting',
      phone: '+91 98112 65090',
      email: 'procurement@mehtagifts.in',
      city: 'Gurugram, Delhi NCR',
      segment: 'Wholesale',
      notes: 'Festive & corporate bulk hampers (brass thalis, copper bottles, khadi stoles).',
    },
    {
      id: 'cust_demo_4',
      name: 'Vikram Nair',
      phone: '+91 98450 22319',
      email: 'vikram.nair@example.in',
      city: 'Bengaluru, Karnataka',
      segment: 'VIP',
      notes: 'Retail tech & GST software subscriber with repeat hardware orders.',
    },
    {
      id: 'cust_demo_5',
      name: 'Priya Chatterjee',
      phone: '+91 98300 88412',
      email: 'priya.c@example.in',
      city: 'Kolkata, West Bengal',
      segment: 'Regular',
      notes: 'Bi-monthly household essentials and textile orders.',
    },
    {
      id: 'cust_demo_6',
      name: 'Gupta Sweets & Catering',
      phone: '+91 98104 39182',
      email: 'guptacatering@example.in',
      city: 'New Delhi, Delhi NCR',
      segment: 'Wholesale',
      notes: 'High-volume mustard oil, turmeric, and kulhad pack buyer.',
    },
    {
      id: 'cust_demo_7',
      name: 'Rohan Kulkarni',
      phone: '+91 97654 10934',
      email: '',
      city: 'Nashik, Maharashtra',
      segment: 'Regular',
      notes: 'Walk-in retail buyer using UPI.',
    },
    {
      id: 'cust_demo_8',
      name: 'Kavita Iyer',
      phone: '+91 99001 56278',
      email: 'kavita.iyer@example.in',
      city: 'Bengaluru, Karnataka',
      segment: 'New',
      notes: 'First-time online storefront customer.',
    },
  ];

  const customerStatsMap = new Map<string, { orders: number; spent: number; lastDate: string }>();
  demoCustomersSeed.forEach((c) => customerStatsMap.set(c.id, { orders: 0, spent: 0, lastDate: '' }));

  // Assign demo customers cleanly to a realistic subset of sales
  sales.forEach((sale, idx) => {
    if (idx % 5 === 4) return; // leave ~20% as Walk-in / Unlinked
    const cust = demoCustomersSeed[idx % demoCustomersSeed.length];
    sale.customerId = cust.id;
    sale.customerName = cust.name;
    const prev = customerStatsMap.get(cust.id)!;
    prev.orders += 1;
    prev.spent += sale.Revenue;
    if (!prev.lastDate || sale.Date > prev.lastDate) prev.lastDate = sale.Date;
  });

  const customers: CustomerRecord[] = demoCustomersSeed.map((c) => {
    const st = customerStatsMap.get(c.id)!;
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email || undefined,
      city: c.city,
      segment: c.segment,
      notes: c.notes,
      totalOrders: st.orders,
      totalSpent: st.spent,
      lastPurchaseDate: st.lastDate || undefined,
    };
  });

  const inventory: InventoryItem[] = catalog.map((c, idx) => ({
    id: `inv_${idx + 1}`,
    sku: c.sku,
    name: c.product,
    category: c.category,
    stock: c.stock,
    reorderLevel: c.reorderLevel,
    unitPrice: c.unitPrice,
    unitCost: Math.round(c.unitPrice * c.costRatio),
    supplier: c.supplier,
  }));

  return {
    sales: sales.sort((a, b) => a.Date.localeCompare(b.Date)),
    expenses: expenses.sort((a, b) => a.Date.localeCompare(b.Date)),
    inventory,
    customers,
  };
}

export function isDemoDataset(sales: SalesRecord[]): boolean {
  if (sales.length === 0) return false;
  return sales.every((s) => /^sale_(20\d{2}-\d{2}|demo)_\d+$/.test(s.id || ''));
}

let activeCurrency: CurrencyCode = 'INR';

export function setActiveCurrency(code?: CurrencyCode | string | null): void {
  activeCurrency = normalizeCurrencyCode(code, 'INR');
}

export function getActiveCurrency(): CurrencyCode {
  return activeCurrency;
}

export function roundCurrencyAmount(val: number, currency?: CurrencyCode): number {
  const safeVal = Number.isFinite(val) ? val : 0;
  const cur = normalizeCurrencyCode(currency ?? activeCurrency);
  const meta = getCurrencyMeta(cur);
  if (meta.decimals === 0) {
    return Math.round(safeVal);
  }
  return Math.round((safeVal + Number.EPSILON) * 100) / 100;
}

export function fmtCurrency(val: number, currency?: CurrencyCode): string {
  const cur = normalizeCurrencyCode(currency ?? activeCurrency);
  const meta = getCurrencyMeta(cur);
  const safeVal = roundCurrencyAmount(Number.isFinite(val) ? val : 0, cur);
  const hasFraction = meta.decimals > 0 && Math.abs(safeVal - Math.round(safeVal)) >= 0.005;
  return new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency: meta.code,
    minimumFractionDigits: hasFraction ? meta.decimals : 0,
    maximumFractionDigits: meta.decimals,
  }).format(safeVal);
}

export function fmtShortAxisCurrency(val: number, currency?: CurrencyCode): string {
  const cur = normalizeCurrencyCode(currency ?? activeCurrency);
  const meta = getCurrencyMeta(cur);
  const safeVal = Number.isFinite(val) ? val : 0;
  const abs = Math.abs(safeVal);
  const sign = safeVal < 0 ? '-' : '';
  const sym = meta.symbol.trim();
  const sep = sym.length > 2 ? `${sym} ` : sym;

  if (meta.shortScale === 'indian') {
    if (abs >= 10000000) return `${sign}${sep}${(abs / 10000000).toFixed(1)}Cr`;
    if (abs >= 100000) return `${sign}${sep}${(abs / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `${sign}${sep}${(abs / 1000).toFixed(0)}k`;
  } else {
    if (abs >= 1000000000) return `${sign}${sep}${(abs / 1000000000).toFixed(1)}B`;
    if (abs >= 1000000) return `${sign}${sep}${(abs / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `${sign}${sep}${(abs / 1000).toFixed(0)}k`;
  }

  if (meta.decimals > 0 && Math.abs(abs - Math.round(abs)) >= 0.01) {
    return `${sign}${sep}${abs.toFixed(2)}`;
  }
  return `${sign}${sep}${Math.round(abs)}`;
}

export function fmtNumber(val: number, currency?: CurrencyCode): string {
  const cur = normalizeCurrencyCode(currency ?? activeCurrency);
  const meta = getCurrencyMeta(cur);
  const safeVal = Number.isFinite(val) ? val : 0;
  return new Intl.NumberFormat(meta.locale).format(Math.round(safeVal));
}

export function fmtMonthLabel(ym: string, currency?: CurrencyCode): string {
  const [y, m] = ym.split('-');
  if (!y || !m) return ym;
  const cur = normalizeCurrencyCode(currency ?? activeCurrency);
  const meta = getCurrencyMeta(cur);
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString(meta.locale, { month: 'short', year: '2-digit' });
}

export function computeProfitAndLoss(
  sales: SalesRecord[],
  expenses: ExpenseRecord[],
  currency?: CurrencyCode
): ProfitAndLossSummary {
  const cur = normalizeCurrencyCode(currency ?? activeCurrency);
  const grossRevenue = roundCurrencyAmount(
    sales.reduce((s, r) => s + (Number.isFinite(r.Revenue) ? r.Revenue : 0), 0),
    cur
  );
  const totalCogs = roundCurrencyAmount(
    sales.reduce((s, r) => s + (Number.isFinite(r.Cost) ? r.Cost : 0), 0),
    cur
  );
  const grossProfit = roundCurrencyAmount(grossRevenue - totalCogs, cur);
  const grossMarginPct = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0;

  const totalExpenses = roundCurrencyAmount(
    expenses.reduce((s, e) => s + (Number.isFinite(e.Amount) ? e.Amount : 0), 0),
    cur
  );
  const netProfit = roundCurrencyAmount(grossProfit - totalExpenses, cur);
  const netMarginPct = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

  const catTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    const amt = Number.isFinite(e.Amount) ? e.Amount : 0;
    catTotals[e.Category] = roundCurrencyAmount((catTotals[e.Category] || 0) + amt, cur);
  });

  const expensesByCategory = Object.entries(catTotals)
    .map(([category, amount]) => ({
      category,
      amount: roundCurrencyAmount(amount, cur),
      sharePct: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    grossRevenue,
    totalCogs,
    grossProfit,
    grossMarginPct,
    totalExpenses,
    netProfit,
    netMarginPct,
    isLoss: netProfit < 0,
    expensesByCategory,
  };
}

export function computeAnalytics(
  data: SalesRecord[],
  expenses: ExpenseRecord[] = [],
  currency?: CurrencyCode
): AnalyticsSummary {
  const cur = normalizeCurrencyCode(currency ?? activeCurrency);
  const totalRevenue = roundCurrencyAmount(
    data.reduce((s, r) => s + (Number.isFinite(r.Revenue) ? r.Revenue : 0), 0),
    cur
  );
  const totalCost = roundCurrencyAmount(
    data.reduce((s, r) => s + (Number.isFinite(r.Cost) ? r.Cost : 0), 0),
    cur
  );
  const totalProfit = roundCurrencyAmount(totalRevenue - totalCost, cur);
  const totalOrders = data.length;
  const totalUnits = data.reduce((s, r) => s + (Number.isFinite(r.Quantity) ? r.Quantity : 0), 0);
  const avgOrderValue = totalOrders > 0 ? roundCurrencyAmount(totalRevenue / totalOrders, cur) : 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const monthMap: Record<string, MonthlyMetric> = {};
  data.forEach((r) => {
    const ym = r.Date.slice(0, 7);
    if (!monthMap[ym]) {
      monthMap[ym] = { ym, orders: 0, units: 0, revenue: 0, cost: 0, profit: 0, expenses: 0, netProfit: 0 };
    }
    const lineProfit = r.Revenue - r.Cost;
    monthMap[ym].orders += 1;
    monthMap[ym].units += r.Quantity;
    monthMap[ym].revenue = roundCurrencyAmount(monthMap[ym].revenue + r.Revenue, cur);
    monthMap[ym].cost = roundCurrencyAmount(monthMap[ym].cost + r.Cost, cur);
    monthMap[ym].profit = roundCurrencyAmount(monthMap[ym].profit + lineProfit, cur);
  });

  expenses.forEach((e) => {
    const ym = e.Date.slice(0, 7);
    if (!monthMap[ym]) {
      monthMap[ym] = { ym, orders: 0, units: 0, revenue: 0, cost: 0, profit: 0, expenses: 0, netProfit: 0 };
    }
    monthMap[ym].expenses = roundCurrencyAmount(monthMap[ym].expenses + e.Amount, cur);
  });

  const monthly = Object.values(monthMap)
    .map((m) => ({ ...m, netProfit: roundCurrencyAmount(m.profit - m.expenses, cur) }))
    .sort((a, b) => a.ym.localeCompare(b.ym));

  const yearMap: Record<string, Omit<YearlyMetric, 'grossMarginPct' | 'netMarginPct'>> = {};
  monthly.forEach((m) => {
    const yr = m.ym.slice(0, 4);
    if (!yearMap[yr]) {
      yearMap[yr] = {
        year: yr,
        orders: 0,
        units: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
        expenses: 0,
        netProfit: 0,
      };
    }
    yearMap[yr].orders += m.orders;
    yearMap[yr].units += m.units;
    yearMap[yr].revenue = roundCurrencyAmount(yearMap[yr].revenue + m.revenue, cur);
    yearMap[yr].cost = roundCurrencyAmount(yearMap[yr].cost + m.cost, cur);
    yearMap[yr].profit = roundCurrencyAmount(yearMap[yr].profit + m.profit, cur);
    yearMap[yr].expenses = roundCurrencyAmount(yearMap[yr].expenses + m.expenses, cur);
    yearMap[yr].netProfit = roundCurrencyAmount(yearMap[yr].netProfit + m.netProfit, cur);
  });

  const yearly: YearlyMetric[] = Object.values(yearMap)
    .map((y) => ({
      ...y,
      grossMarginPct: y.revenue > 0 ? (y.profit / y.revenue) * 100 : 0,
      netMarginPct: y.revenue > 0 ? (y.netProfit / y.revenue) * 100 : 0,
    }))
    .sort((a, b) => a.year.localeCompare(b.year));

  let growthPct: number | null = null;
  let growthContext = 'Need 2+ months';
  if (monthly.length >= 2) {
    const mid = Math.floor(monthly.length / 2);
    const firstHalf = monthly.slice(0, mid).reduce((s, m) => s + m.revenue, 0);
    const secondHalf = monthly.slice(mid).reduce((s, m) => s + m.revenue, 0);
    if (firstHalf > 0) {
      const firstAvg = firstHalf / mid;
      const secondAvg = secondHalf / (monthly.length - mid);
      growthPct = ((secondAvg - firstAvg) / firstAvg) * 100;
      growthContext = monthly.length === 2 ? 'Latest vs. prior month' : '2nd half vs. 1st half';
    }
  }

  const catMap: Record<string, Omit<CategoryMetric, 'margin'>> = {};
  data.forEach((r) => {
    if (!catMap[r.Category]) {
      catMap[r.Category] = { name: r.Category, orders: 0, units: 0, revenue: 0, cost: 0, profit: 0 };
    }
    catMap[r.Category].orders += 1;
    catMap[r.Category].units += r.Quantity;
    catMap[r.Category].revenue = roundCurrencyAmount(catMap[r.Category].revenue + r.Revenue, cur);
    catMap[r.Category].cost = roundCurrencyAmount(catMap[r.Category].cost + r.Cost, cur);
    catMap[r.Category].profit = roundCurrencyAmount(catMap[r.Category].profit + (r.Revenue - r.Cost), cur);
  });
  const categories: CategoryMetric[] = Object.values(catMap)
    .map((c) => ({ ...c, margin: c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0 }))
    .sort((a, b) => b.revenue - a.revenue);

  const regMap: Record<string, Omit<RegionMetric, 'margin'>> = {};
  data.forEach((r) => {
    if (!regMap[r.Region]) {
      regMap[r.Region] = { name: r.Region, orders: 0, units: 0, revenue: 0, cost: 0, profit: 0 };
    }
    regMap[r.Region].orders += 1;
    regMap[r.Region].units += r.Quantity;
    regMap[r.Region].revenue = roundCurrencyAmount(regMap[r.Region].revenue + r.Revenue, cur);
    regMap[r.Region].cost = roundCurrencyAmount(regMap[r.Region].cost + r.Cost, cur);
    regMap[r.Region].profit = roundCurrencyAmount(regMap[r.Region].profit + (r.Revenue - r.Cost), cur);
  });
  const regions: RegionMetric[] = Object.values(regMap)
    .map((rg) => ({ ...rg, margin: rg.revenue > 0 ? (rg.profit / rg.revenue) * 100 : 0 }))
    .sort((a, b) => b.revenue - a.revenue);

  const prodMap: Record<string, Omit<ProductMetric, 'margin'>> = {};
  data.forEach((r) => {
    if (!prodMap[r.Product]) {
      prodMap[r.Product] = {
        name: r.Product,
        category: r.Category,
        orders: 0,
        units: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
    }
    prodMap[r.Product].orders += 1;
    prodMap[r.Product].units += r.Quantity;
    prodMap[r.Product].revenue = roundCurrencyAmount(prodMap[r.Product].revenue + r.Revenue, cur);
    prodMap[r.Product].cost = roundCurrencyAmount(prodMap[r.Product].cost + r.Cost, cur);
    prodMap[r.Product].profit = roundCurrencyAmount(prodMap[r.Product].profit + (r.Revenue - r.Cost), cur);
  });
  const products: ProductMetric[] = Object.values(prodMap)
    .map((p) => ({ ...p, margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0 }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    totalRevenue,
    totalCost,
    totalProfit,
    totalOrders,
    totalUnits,
    avgOrderValue,
    profitMargin,
    growthPct,
    growthContext,
    monthly,
    yearly,
    categories,
    regions,
    products,
  };
}

export function generateIntelligence(
  stats: AnalyticsSummary,
  pnl?: ProfitAndLossSummary,
  inventory: InventoryItem[] = [],
  currency?: CurrencyCode
): IntelligenceReport {
  if (stats.totalOrders === 0) {
    return { insights: [], recommendations: [], summaryItems: [] };
  }

  const cur = normalizeCurrencyCode(currency ?? activeCurrency);
  const bestProduct = stats.products[0];
  const bestProfitProduct = [...stats.products].sort((a, b) => b.profit - a.profit)[0];
  const worstProduct = stats.products[stats.products.length - 1];
  const lowMarginProducts = [...stats.products].sort((a, b) => a.margin - b.margin);
  const lowestMarginProd = lowMarginProducts[0];

  const salesMonths = stats.monthly.filter((m) => m.orders > 0);
  const peakMonth =
    salesMonths.length > 0 ? [...salesMonths].sort((a, b) => b.revenue - a.revenue)[0] : stats.monthly[0];
  const slowMonth =
    salesMonths.length > 0 ? [...salesMonths].sort((a, b) => a.revenue - b.revenue)[0] : stats.monthly[0];

  const topProfitCat = [...stats.categories].sort((a, b) => b.profit - a.profit)[0];
  const highestMarginCat = [...stats.categories].sort((a, b) => b.margin - a.margin)[0];
  const lowestCat = stats.categories[stats.categories.length - 1];

  const topRegion = stats.regions[0];
  const weakRegion = stats.regions[stats.regions.length - 1];

  const lowStockCount = inventory.filter((i) => i.stock <= i.reorderLevel).length;

  const insights: InsightItem[] = [
    {
      type: 'Star Product',
      title: `${bestProduct.name} Leads Revenue`,
      body: `Generating ${fmtCurrency(bestProduct.revenue, cur)} across ${fmtNumber(bestProduct.units, cur)} units (${((bestProduct.revenue / stats.totalRevenue) * 100).toFixed(1)}% of total sales) with a ${bestProduct.margin.toFixed(1)}% gross margin.`,
    },
    {
      type: 'Peak Seasonality',
      title: `${fmtMonthLabel(peakMonth.ym, cur)} Was Your Best Month`,
      body: `Revenue peaked at ${fmtCurrency(peakMonth.revenue, cur)} (${fmtCurrency(peakMonth.profit, cur)} gross profit), outperforming your slowest month (${fmtMonthLabel(slowMonth.ym, cur)} at ${fmtCurrency(slowMonth.revenue, cur)}) by ${slowMonth.revenue > 0 ? (((peakMonth.revenue - slowMonth.revenue) / slowMonth.revenue) * 100).toFixed(0) : 0}%.`,
    },
    {
      type: 'Profitability & P&L',
      title: pnl
        ? `Net ${pnl.isLoss ? 'Loss' : 'Profit'}: ${fmtCurrency(Math.abs(pnl.netProfit), cur)}`
        : `${topProfitCat.name} Drives Most Profit`,
      body: pnl
        ? `After ${fmtCurrency(pnl.totalExpenses, cur)} in operating expenses, your net margin is ${pnl.netMarginPct.toFixed(1)}%. ${highestMarginCat.name} delivers the strongest product margin at ${highestMarginCat.margin.toFixed(1)}%.`
        : `${topProfitCat.name} delivered ${fmtCurrency(topProfitCat.profit, cur)} in gross profit. Meanwhile, ${highestMarginCat.name} achieves ${highestMarginCat.margin.toFixed(1)}% margin.`,
    },
    {
      type: 'Inventory Health',
      title:
        inventory.length === 0
          ? 'No Inventory SKUs Tracked'
          : lowStockCount > 0
            ? `${lowStockCount} SKU${lowStockCount === 1 ? '' : 's'} at or Below Reorder Point`
            : 'All Inventory Levels Healthy',
      body:
        inventory.length === 0
          ? 'Add product SKUs in Inventory & Alerts to monitor stock levels and prevent stockouts.'
          : lowStockCount > 0
            ? `Review Inventory & Alerts — ${lowStockCount} tracked item${lowStockCount === 1 ? ' needs' : 's need'} restocking to avoid missed orders.`
            : `All ${inventory.length} tracked SKUs currently have stock above their configured reorder thresholds.`,
    },
    {
      type: 'Margin Watch',
      title: `${lowestMarginProd.name} Has Tightest Margin`,
      body: `Operating at a ${lowestMarginProd.margin.toFixed(1)}% margin (${fmtCurrency(lowestMarginProd.cost, cur)} cost vs. ${fmtCurrency(lowestMarginProd.revenue, cur)} revenue), indicating higher procurement cost or tight pricing.`,
    },
    {
      type: 'Growth Trajectory',
      title:
        stats.growthPct === null
          ? 'Single-Month Snapshot'
          : stats.growthPct >= 0
            ? `Positive +${stats.growthPct.toFixed(1)}% Growth Momentum`
            : `Revenue Contraction of ${stats.growthPct.toFixed(1)}%`,
      body:
        stats.growthPct === null
          ? 'Expand the date filter across multiple months to measure period-over-period growth trends.'
          : `Comparing ${stats.growthContext.toLowerCase()}, revenue shifted by ${stats.growthPct >= 0 ? '+' : ''}${stats.growthPct.toFixed(1)}%, led by ${topRegion.name} (${fmtCurrency(topRegion.revenue, cur)}).`,
    },
  ];

  const recommendations: RecommendationItem[] = [
    {
      variant: 'success',
      badge: 'Scale Winner',
      title: `Bundle & Upsell ${bestProduct.name}`,
      desc: `Your top SKU (${bestProduct.name}) and highest-profit item (${bestProfitProduct.name}) show strong demand. Bundle ${bestProduct.name} with high-margin ${highestMarginCat.name} add-ons to lift Average Order Value above ${fmtCurrency(stats.avgOrderValue * 1.12, cur)}.`,
    },
    {
      variant: 'warning',
      badge: 'Category Lift',
      title: `Revitalize ${lowestCat.name} Performance`,
      desc: `${lowestCat.name} generates ${fmtCurrency(lowestCat.revenue, cur)} (${((lowestCat.revenue / stats.totalRevenue) * 100).toFixed(1)}% share). Introduce festive combo offers or phase out slow-moving items like ${worstProduct.name}.`,
    },
    {
      variant: 'info',
      badge: 'Campaign Timing',
      title: `Capitalize on ${fmtMonthLabel(peakMonth.ym, cur)} & Lift ${fmtMonthLabel(slowMonth.ym, cur)}`,
      desc: `Pre-stock top inventory 4 weeks before your ${fmtMonthLabel(peakMonth.ym, cur)} surge (${fmtCurrency(peakMonth.revenue, cur)}). Run WhatsApp retention campaigns during ${fmtMonthLabel(slowMonth.ym, cur)} to stabilize monthly cash flow.`,
    },
    {
      variant: 'default',
      badge: 'Market Expansion',
      title: `Expand Distribution in ${weakRegion.name}`,
      desc: `${weakRegion.name} accounts for ${fmtCurrency(weakRegion.revenue, cur)} (${((weakRegion.revenue / stats.totalRevenue) * 100).toFixed(1)}% of sales) vs. ${topRegion.name} at ${fmtCurrency(topRegion.revenue, cur)}. Target localized B2B/retail outreach there.`,
    },
  ];

  return {
    insights,
    recommendations,
    summaryItems: insights.slice(0, 4),
  };
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseStrictNumeric(val: unknown, fieldName: string, rowNum: number): number {
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) {
      throw new Error(`Row ${rowNum}: invalid numeric value for ${fieldName}.`);
    }
    return val;
  }
  const raw = String(val ?? '').trim();
  if (!raw) {
    throw new Error(`Row ${rowNum}: missing required numeric value for ${fieldName}.`);
  }
  // Allow currency symbols, commas, and spaces around digits
  const cleaned = raw.replace(/[₹$€£¥,\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    throw new Error(`Row ${rowNum}: invalid number "${raw}" in ${fieldName} column.`);
  }
  const num = Number(cleaned);
  if (!Number.isFinite(num)) {
    throw new Error(`Row ${rowNum}: invalid number "${raw}" in ${fieldName} column.`);
  }
  return num;
}

function isRealCalendarDate(yyyy: number, mm: number, dd: number): boolean {
  if (yyyy < 1990 || yyyy > 2100 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
  const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
  return (
    dt.getUTCFullYear() === yyyy &&
    dt.getUTCMonth() === mm - 1 &&
    dt.getUTCDate() === dd
  );
}

function parseStrictDate(dateStr: string, rowNum: number): string {
  const s = String(dateStr || '').trim();
  if (!s) {
    throw new Error(`Row ${rowNum}: missing Date (expected YYYY-MM-DD or DD/MM/YYYY).`);
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    if (isRealCalendarDate(y, m, d)) return s;
    throw new Error(`Row ${rowNum}: invalid calendar date "${s}".`);
  }
  // Support DD/MM/YYYY or DD-MM-YYYY common in Indian spreadsheets
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const dd = Number(dmy[1]);
    const mm = Number(dmy[2]);
    const yyyy = Number(dmy[3]);
    if (isRealCalendarDate(yyyy, mm, dd)) {
      return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
    throw new Error(`Row ${rowNum}: invalid DD/MM/YYYY date "${s}".`);
  }
  throw new Error(
    `Row ${rowNum}: invalid Date "${s}". Use YYYY-MM-DD or DD/MM/YYYY format.`
  );
}

export function parseCsvDataset(
  csvText: string,
  currency?: CurrencyCode,
  defaultRegion = 'India',
  maxRows = 5000
): Array<Omit<SalesRecord, 'id'>> {
  const cur = normalizeCurrencyCode(currency ?? activeCurrency);
  const effectiveMaxRows = Math.max(1, Math.min(5000, maxRows));
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row.');
  }
  if (lines.length - 1 > effectiveMaxRows) {
    throw new Error(
      `CSV upload has ${lines.length - 1} rows, which exceeds your current plan limit of ${effectiveMaxRows.toLocaleString()} rows per import.`
    );
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const findCol = (aliases: string[]) => headers.findIndex((h) => aliases.some((a) => h.includes(a)));

  const idxDate = findCol(['date', 'orderdate', 'time']);
  const idxProd = findCol(['product', 'item', 'sku', 'name']);
  const idxCat = findCol(['category', 'dept', 'segment']);
  const idxQty = findCol(['quantity', 'qty', 'units']);
  const idxRev = findCol(['revenue', 'sales', 'amount', 'total']);
  const idxCost = findCol(['cost', 'cogs', 'expense']);
  const idxReg = findCol(['region', 'location', 'country', 'area', 'state', 'city']);
  const idxMode = findCol(['payment', 'mode', 'method']);
  const idxCustomer = findCol(['customer', 'client', 'buyer', 'party']);

  if (idxProd === -1 || idxRev === -1) {
    throw new Error("CSV must include at least 'Product' and 'Revenue' columns.");
  }

  const parsed: Array<Omit<SalesRecord, 'id'>> = [];
  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const cols = splitCsvLine(lines[i]);
    if (cols.every((c) => !c.trim())) continue;

    const rawProd = (cols[idxProd] || '').trim().slice(0, 140);
    if (!rawProd) {
      throw new Error(`Row ${rowNum}: missing Product name.`);
    }

    const rawRev = parseStrictNumeric(cols[idxRev], 'Revenue', rowNum);
    if (rawRev < 0 || rawRev > 1000000000) {
      throw new Error(`Row ${rowNum}: Revenue must be between 0 and 1,000,000,000.`);
    }
    const revenue = roundCurrencyAmount(rawRev, cur);

    let cost: number;
    if (idxCost !== -1 && (cols[idxCost] ?? '').trim() !== '') {
      const rawCost = parseStrictNumeric(cols[idxCost], 'Cost', rowNum);
      if (rawCost < 0 || rawCost > 1000000000) {
        throw new Error(`Row ${rowNum}: Cost must be between 0 and 1,000,000,000.`);
      }
      cost = roundCurrencyAmount(rawCost, cur);
    } else {
      cost = roundCurrencyAmount(revenue * 0.65, cur);
    }

    const profit = roundCurrencyAmount(revenue - cost, cur);

    let qty = 1;
    if (idxQty !== -1 && (cols[idxQty] ?? '').trim() !== '') {
      const rawQty = parseStrictNumeric(cols[idxQty], 'Quantity', rowNum);
      if (!Number.isInteger(rawQty) || rawQty < 1 || rawQty > 1000000) {
        throw new Error(`Row ${rowNum}: Quantity must be a whole number between 1 and 1,000,000.`);
      }
      qty = rawQty;
    }

    const parsedDate =
      idxDate !== -1
        ? parseStrictDate(cols[idxDate] || '', rowNum)
        : new Date().toISOString().slice(0, 10);

    const customerName =
      idxCustomer !== -1 && cols[idxCustomer] ? cols[idxCustomer].trim().slice(0, 120) : '';

    parsed.push({
      Date: parsedDate,
      Product: rawProd,
      Category: (idxCat !== -1 && cols[idxCat] ? cols[idxCat].trim() : 'General').slice(0, 80) || 'General',
      Quantity: qty,
      Revenue: revenue,
      Cost: cost,
      Profit: Math.max(-1000000000, Math.min(1000000000, profit)),
      Region: (idxReg !== -1 && cols[idxReg] ? cols[idxReg].trim() : defaultRegion).slice(0, 80) || defaultRegion,
      PaymentMode: (idxMode !== -1 && cols[idxMode] ? cols[idxMode].trim() : 'UPI').slice(0, 40) || 'UPI',
      ...(customerName ? { customerName } : {}),
    });
  }

  if (parsed.length === 0) {
    throw new Error('No valid sales rows could be parsed from this CSV.');
  }

  return parsed.sort((a, b) => a.Date.localeCompare(b.Date));
}

function csvEscape(val: unknown): string {
  const s = String(val ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsvFile(filename: string, rows: Array<Array<string | number>>): void {
  const csvContent = '\uFEFF' + rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAnalyticsReportCsv(
  filteredDataset: SalesRecord[],
  filteredExpenses: ExpenseRecord[] = [],
  shopName = 'SmartBiz Shop',
  currency?: CurrencyCode
): void {
  const cur = normalizeCurrencyCode(currency ?? activeCurrency);
  const meta = getCurrencyMeta(cur);
  const dec = meta.decimals;
  const stats = computeAnalytics(filteredDataset, filteredExpenses, cur);
  const pnl = computeProfitAndLoss(filteredDataset, filteredExpenses, cur);
  const intel = generateIntelligence(stats, pnl, [], cur);
  const rows: Array<Array<string | number>> = [];

  rows.push(['SMARTBIZ AI - BUSINESS INTELLIGENCE & P&L REPORT']);
  rows.push(['Shop Name', shopName]);
  rows.push(['Generated On', new Date().toLocaleString(meta.locale)]);
  rows.push(['Currency', meta.code]);
  rows.push(['Active Sales Records', stats.totalOrders]);
  rows.push(['Active Expense Records', filteredExpenses.length]);
  rows.push([]);

  rows.push(['PROFIT & LOSS SUMMARY', `VALUE (${meta.code})`]);
  rows.push(['Gross Revenue', pnl.grossRevenue.toFixed(dec)]);
  rows.push(['Cost of Goods Sold (COGS)', pnl.totalCogs.toFixed(dec)]);
  rows.push(['Gross Profit', pnl.grossProfit.toFixed(dec)]);
  rows.push(['Gross Margin (%)', pnl.grossMarginPct.toFixed(2) + '%']);
  rows.push(['Operating Expenses', pnl.totalExpenses.toFixed(dec)]);
  rows.push([pnl.isLoss ? 'Net Loss' : 'Net Profit', pnl.netProfit.toFixed(dec)]);
  rows.push(['Net Margin (%)', pnl.netMarginPct.toFixed(2) + '%']);
  rows.push(['Total Orders', stats.totalOrders]);
  rows.push(['Total Units Sold', stats.totalUnits]);
  rows.push(['Average Order Value', stats.avgOrderValue.toFixed(dec)]);
  rows.push([]);

  rows.push(['MONTHLY PERFORMANCE']);
  rows.push(['Month', 'Orders', 'Units', 'Revenue', 'COGS', 'Gross Profit', 'Expenses', 'Net Profit']);
  stats.monthly.forEach((m) =>
    rows.push([m.ym, m.orders, m.units, m.revenue, m.cost, m.profit, m.expenses, m.netProfit])
  );
  rows.push([]);

  rows.push(['PRODUCT PERFORMANCE']);
  rows.push(['Product', 'Category', 'Orders', 'Units', 'Revenue', 'Cost', 'Gross Profit', 'Margin (%)']);
  stats.products.forEach((p) =>
    rows.push([p.name, p.category, p.orders, p.units, p.revenue, p.cost, p.profit, p.margin.toFixed(2)])
  );
  rows.push([]);

  rows.push(['BUSINESS INSIGHTS']);
  rows.push(['Type', 'Title', 'Details']);
  intel.insights.forEach((i) => rows.push([i.type, i.title, i.body]));

  const dateTag = new Date().toISOString().slice(0, 10);
  downloadCsvFile(`SmartBiz_AI_Analytics_Report_${dateTag}.csv`, rows);
}

export function exportComparisonAnalyticsReportCsv(
  primaryDataset: SalesRecord[],
  compareDataset: SalesRecord[],
  primaryLabel: string,
  compareLabel: string,
  primaryExpenses: ExpenseRecord[] = [],
  compareExpenses: ExpenseRecord[] = [],
  currency?: CurrencyCode
): void {
  const cur = normalizeCurrencyCode(currency ?? activeCurrency);
  const meta = getCurrencyMeta(cur);
  const dec = meta.decimals;
  const pStats = computeAnalytics(primaryDataset, primaryExpenses, cur);
  const cStats = computeAnalytics(compareDataset, compareExpenses, cur);
  const pPnl = computeProfitAndLoss(primaryDataset, primaryExpenses, cur);
  const cPnl = computeProfitAndLoss(compareDataset, compareExpenses, cur);
  const comp = computeComparison(pStats, cStats, primaryLabel, compareLabel, pPnl, cPnl, cur);
  const intel = generateIntelligence(pStats, pPnl, [], cur);
  const rows: Array<Array<string | number>> = [];

  rows.push(['SMARTBIZ AI - PERIOD COMPARISON ANALYTICS REPORT']);
  rows.push(['Generated On', new Date().toLocaleString(meta.locale)]);
  rows.push(['Currency', meta.code]);
  rows.push(['Period A (Primary)', primaryLabel, `Records: ${pStats.totalOrders}`]);
  rows.push(['Period B (Comparison)', compareLabel, `Records: ${cStats.totalOrders}`]);
  rows.push([]);

  rows.push(['METRIC', 'PERIOD A', 'PERIOD B', 'VARIANCE', 'CHANGE (%)']);
  const fmtPct = (v: number | null) => (v === null ? 'N/A' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`);
  rows.push(['Total Revenue', comp.revenue.primary.toFixed(dec), comp.revenue.compare.toFixed(dec), comp.revenue.diff.toFixed(dec), fmtPct(comp.revenue.pct)]);
  rows.push(['Total Gross Profit', comp.profit.primary.toFixed(dec), comp.profit.compare.toFixed(dec), comp.profit.diff.toFixed(dec), fmtPct(comp.profit.pct)]);
  rows.push(['Operating Expenses', comp.expenses.primary.toFixed(dec), comp.expenses.compare.toFixed(dec), comp.expenses.diff.toFixed(dec), fmtPct(comp.expenses.pct)]);
  rows.push(['Net Profit', comp.netProfit.primary.toFixed(dec), comp.netProfit.compare.toFixed(dec), comp.netProfit.diff.toFixed(dec), fmtPct(comp.netProfit.pct)]);
  rows.push([
    'Gross Margin (%)',
    pStats.profitMargin.toFixed(2) + '%',
    cStats.profitMargin.toFixed(2) + '%',
    (comp.marginDiffPp >= 0 ? '+' : '') + comp.marginDiffPp.toFixed(2) + ' pp',
    '—',
  ]);
  rows.push(['Total Orders', comp.orders.primary, comp.orders.compare, comp.orders.diff, fmtPct(comp.orders.pct)]);
  rows.push(['Total Units Sold', comp.units.primary, comp.units.compare, comp.units.diff, fmtPct(comp.units.pct)]);
  rows.push(['Average Order Value', comp.avgOrderValue.primary.toFixed(dec), comp.avgOrderValue.compare.toFixed(dec), comp.avgOrderValue.diff.toFixed(dec), fmtPct(comp.avgOrderValue.pct)]);
  rows.push([]);

  rows.push(['CATEGORY COMPARISON', 'PERIOD A REV', 'PERIOD B REV', 'REV CHANGE (%)', 'PERIOD A PROFIT', 'PERIOD B PROFIT']);
  comp.categories.forEach((c) => {
    rows.push([c.name, c.primaryRevenue.toFixed(dec), c.compareRevenue.toFixed(dec), fmtPct(c.revenueDeltaPct), c.primaryProfit.toFixed(dec), c.compareProfit.toFixed(dec)]);
  });
  rows.push([]);

  rows.push(['BUSINESS INSIGHTS (PERIOD A)']);
  rows.push(['Type', 'Title', 'Details']);
  intel.insights.forEach((i) => rows.push([i.type, i.title, i.body]));

  const dateTag = new Date().toISOString().slice(0, 10);
  downloadCsvFile(`SmartBiz_AI_Comparison_Report_${dateTag}.csv`, rows);
}

function makeDelta(primary: number, compare: number, currency?: CurrencyCode): MetricDelta {
  const diff = roundCurrencyAmount(primary - compare, currency);
  const pct = compare !== 0 ? ((primary - compare) / Math.abs(compare)) * 100 : null;
  return { primary, compare, diff, pct };
}

export function computeComparison(
  primaryStats: AnalyticsSummary,
  compareStats: AnalyticsSummary,
  primaryLabel: string,
  compareLabel: string,
  primaryPnl?: ProfitAndLossSummary,
  comparePnl?: ProfitAndLossSummary,
  currency?: CurrencyCode
): ComparisonSummary {
  const cur = normalizeCurrencyCode(currency ?? activeCurrency);
  const categoryNames = Array.from(
    new Set([
      ...primaryStats.categories.map((c) => c.name),
      ...compareStats.categories.map((c) => c.name),
    ])
  );

  const categories: CategoryComparisonRow[] = categoryNames
    .map((name) => {
      const p = primaryStats.categories.find((c) => c.name === name);
      const c = compareStats.categories.find((cat) => cat.name === name);
      const primaryRevenue = p?.revenue ?? 0;
      const compareRevenue = c?.revenue ?? 0;
      const primaryProfit = p?.profit ?? 0;
      const compareProfit = c?.profit ?? 0;
      return {
        name,
        primaryRevenue,
        compareRevenue,
        revenueDeltaPct: compareRevenue > 0 ? ((primaryRevenue - compareRevenue) / compareRevenue) * 100 : null,
        primaryProfit,
        compareProfit,
        profitDeltaPct: compareProfit !== 0 ? ((primaryProfit - compareProfit) / Math.abs(compareProfit)) * 100 : null,
      };
    })
    .sort((a, b) => b.primaryRevenue - a.primaryRevenue);

  const regionNames = Array.from(
    new Set([
      ...primaryStats.regions.map((r) => r.name),
      ...compareStats.regions.map((r) => r.name),
    ])
  );

  const regions: RegionComparisonRow[] = regionNames
    .map((name) => {
      const p = primaryStats.regions.find((r) => r.name === name);
      const c = compareStats.regions.find((reg) => reg.name === name);
      const primaryRevenue = p?.revenue ?? 0;
      const compareRevenue = c?.revenue ?? 0;
      return {
        name,
        primaryRevenue,
        compareRevenue,
        revenueDeltaPct: compareRevenue > 0 ? ((primaryRevenue - compareRevenue) / compareRevenue) * 100 : null,
      };
    })
    .sort((a, b) => b.primaryRevenue - a.primaryRevenue);

  const pExp = primaryPnl?.totalExpenses ?? 0;
  const cExp = comparePnl?.totalExpenses ?? 0;
  const pNet = primaryPnl?.netProfit ?? primaryStats.totalProfit;
  const cNet = comparePnl?.netProfit ?? compareStats.totalProfit;

  return {
    primaryLabel,
    compareLabel,
    revenue: makeDelta(primaryStats.totalRevenue, compareStats.totalRevenue, cur),
    profit: makeDelta(primaryStats.totalProfit, compareStats.totalProfit, cur),
    orders: makeDelta(primaryStats.totalOrders, compareStats.totalOrders, 'JPY'),
    units: makeDelta(primaryStats.totalUnits, compareStats.totalUnits, 'JPY'),
    avgOrderValue: makeDelta(primaryStats.avgOrderValue, compareStats.avgOrderValue, cur),
    expenses: makeDelta(pExp, cExp, cur),
    netProfit: makeDelta(pNet, cNet, cur),
    marginDiffPp: primaryStats.profitMargin - compareStats.profitMargin,
    categories,
    regions,
  };
}

function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function getSuggestedComparisonRanges(
  currentStart: string,
  currentEnd: string,
  datasetMin: string,
  datasetMax: string
): {
  primaryStart: string;
  primaryEnd: string;
  compareStart: string;
  compareEnd: string;
} {
  if (!currentStart || !currentEnd) {
    return {
      primaryStart: currentStart,
      primaryEnd: currentEnd,
      compareStart: datasetMin,
      compareEnd: datasetMax,
    };
  }

  const startMs = Date.parse(currentStart + 'T00:00:00Z');
  const endMs = Date.parse(currentEnd + 'T00:00:00Z');
  const spanDays = Math.max(1, Math.round((endMs - startMs) / 86400000));

  if (currentStart <= datasetMin && currentEnd >= datasetMax && spanDays >= 14) {
    const halfDays = Math.floor(spanDays / 2);
    const compareEnd = addDaysIso(currentStart, halfDays);
    const primaryStart = addDaysIso(compareEnd, 1);
    return {
      primaryStart,
      primaryEnd: currentEnd,
      compareStart: currentStart,
      compareEnd,
    };
  }

  const shiftedEnd = addDaysIso(currentStart, -1);
  const shiftedStart = addDaysIso(shiftedEnd, -spanDays);

  if (datasetMin && shiftedEnd < datasetMin) {
    const minMs = Date.parse(datasetMin + 'T00:00:00Z');
    const maxMs = Date.parse(datasetMax + 'T00:00:00Z');
    const totalSpan = Math.max(2, Math.round((maxMs - minMs) / 86400000));
    const halfEnd = addDaysIso(datasetMin, Math.floor(totalSpan / 2));
    return {
      primaryStart: currentStart,
      primaryEnd: currentEnd,
      compareStart: datasetMin,
      compareEnd: halfEnd,
    };
  }

  return {
    primaryStart: currentStart,
    primaryEnd: currentEnd,
    compareStart: shiftedStart < datasetMin ? datasetMin : shiftedStart,
    compareEnd: shiftedEnd,
  };
}

export function exportFilteredRawCsv(filteredDataset: SalesRecord[]): void {
  const rows: Array<Array<string | number>> = [
    ['Date', 'Product', 'Category', 'Quantity', 'Revenue', 'Cost', 'Profit', 'Region', 'PaymentMode', 'Customer'],
  ];
  filteredDataset.forEach((r) => {
    rows.push([
      r.Date,
      r.Product,
      r.Category,
      r.Quantity,
      r.Revenue,
      r.Cost,
      r.Profit,
      r.Region,
      r.PaymentMode || 'UPI',
      r.customerName || 'Walk-in',
    ]);
  });
  const dateTag = new Date().toISOString().slice(0, 10);
  downloadCsvFile(`SmartBiz_Sales_Data_${dateTag}.csv`, rows);
}

export function downloadSampleTemplateCsv(): void {
  const sample = generateIndianSmbDemo().sales;
  const rows: Array<Array<string | number>> = [
    ['Date', 'Product', 'Category', 'Quantity', 'Revenue', 'Cost', 'Profit', 'Region', 'PaymentMode', 'Customer'],
  ];
  sample.forEach((r) => {
    rows.push([
      r.Date,
      r.Product,
      r.Category,
      r.Quantity,
      r.Revenue,
      r.Cost,
      r.Profit,
      r.Region,
      r.PaymentMode || 'UPI',
      r.customerName || 'Walk-in',
    ]);
  });
  downloadCsvFile('SmartBiz_Indian_SMB_Sample_Template.csv', rows);
}

export function computeCustomerAnalytics(
  customers: CustomerRecord[],
  sales: SalesRecord[]
): CustomerAnalyticsSummary {
  const byId = new Map<string, { orders: number; spent: number; profit: number; lastDate: string }>();
  const byName = new Map<string, { orders: number; spent: number; profit: number; lastDate: string }>();

  let totalLinkedRevenue = 0;

  sales.forEach((sale) => {
    const rev = Number.isFinite(sale.Revenue) ? sale.Revenue : 0;
    const prof = Number.isFinite(sale.Profit) ? sale.Profit : rev - (Number(sale.Cost) || 0);
    if (sale.customerId) {
      totalLinkedRevenue += rev;
      const cur = byId.get(sale.customerId) || { orders: 0, spent: 0, profit: 0, lastDate: '' };
      cur.orders += 1;
      cur.spent += rev;
      cur.profit += prof;
      if (!cur.lastDate || sale.Date > cur.lastDate) cur.lastDate = sale.Date;
      byId.set(sale.customerId, cur);
    } else if (sale.customerName && sale.customerName.trim() && sale.customerName.toLowerCase() !== 'walk-in') {
      totalLinkedRevenue += rev;
      const key = sale.customerName.trim().toLowerCase();
      const cur = byName.get(key) || { orders: 0, spent: 0, profit: 0, lastDate: '' };
      cur.orders += 1;
      cur.spent += rev;
      cur.profit += prof;
      if (!cur.lastDate || sale.Date > cur.lastDate) cur.lastDate = sale.Date;
      byName.set(key, cur);
    }
  });

  const rankedCustomers: CustomerPerformanceMetric[] = customers
    .map((customer) => {
      const idStats = byId.get(customer.id);
      const nameStats = byName.get(customer.name.trim().toLowerCase());
      const ordersInPeriod = (idStats?.orders ?? 0) + (nameStats?.orders ?? 0);
      const spentInPeriod = (idStats?.spent ?? 0) + (nameStats?.spent ?? 0);
      const profitInPeriod = (idStats?.profit ?? 0) + (nameStats?.profit ?? 0);
      const lastOrderDate =
        [idStats?.lastDate || '', nameStats?.lastDate || '', customer.lastPurchaseDate || '']
          .filter(Boolean)
          .sort()
          .pop() || '';
      return {
        customer,
        ordersInPeriod,
        spentInPeriod,
        profitInPeriod,
        avgOrderValue: ordersInPeriod > 0 ? spentInPeriod / ordersInPeriod : 0,
        lastOrderDate,
      };
    })
    .sort((a, b) => b.spentInPeriod - a.spentInPeriod || b.customer.totalSpent - a.customer.totalSpent);

  const activeCustomers = rankedCustomers.filter((c) => c.ordersInPeriod > 0).length;
  const repeatCustomers = rankedCustomers.filter(
    (c) => c.ordersInPeriod >= 2 || c.customer.totalOrders >= 2
  ).length;
  const totalBaseRevenue =
    totalLinkedRevenue > 0
      ? totalLinkedRevenue
      : customers.reduce((sum, c) => sum + (Number(c.totalSpent) || 0), 0);
  const avgLifetimeValue = customers.length > 0 ? totalBaseRevenue / customers.length : 0;

  const segments: CustomerSegment[] = ['VIP', 'Wholesale', 'Regular', 'New'];
  const segmentBreakdown = segments.map((segment) => {
    const group = rankedCustomers.filter((r) => r.customer.segment === segment);
    const revenue = group.reduce(
      (s, r) => s + (r.ordersInPeriod > 0 ? r.spentInPeriod : r.customer.totalSpent),
      0
    );
    return {
      segment,
      count: group.length,
      revenue,
    };
  });

  const topSeg = [...segmentBreakdown].sort((a, b) => b.revenue - a.revenue)[0];

  return {
    totalCustomers: customers.length,
    activeCustomers,
    repeatCustomers,
    totalLinkedRevenue,
    avgLifetimeValue,
    topSegment: topSeg && topSeg.revenue > 0 ? topSeg.segment : 'N/A',
    segmentBreakdown,
    rankedCustomers,
  };
}

export function computeInventoryVelocity(
  inventory: InventoryItem[],
  sales: SalesRecord[],
  currency?: CurrencyCode
): InventoryVelocityItem[] {
  const cur = normalizeCurrencyCode(currency ?? activeCurrency);
  const dates = sales.map((s) => s.Date).filter(Boolean).sort();
  let observedDays = 30;
  if (dates.length >= 2) {
    const firstMs = Date.parse(`${dates[0]}T00:00:00Z`);
    const lastMs = Date.parse(`${dates[dates.length - 1]}T00:00:00Z`);
    if (Number.isFinite(firstMs) && Number.isFinite(lastMs)) {
      observedDays = Math.max(1, Math.round((lastMs - firstMs) / 86400000) + 1);
    }
  }

  const unitsByProduct = new Map<string, number>();
  sales.forEach((s) => {
    const key = s.Product.trim().toLowerCase();
    unitsByProduct.set(key, (unitsByProduct.get(key) || 0) + (Number(s.Quantity) || 0));
  });

  const referenceAnchorDate = dates.length > 0 ? dates[dates.length - 1] : new Date().toISOString().slice(0, 10);

  return inventory.map((item) => {
    const unitsSoldInPeriod = unitsByProduct.get(item.name.trim().toLowerCase()) || 0;
    const dailyRunRate = unitsSoldInPeriod > 0 ? unitsSoldInPeriod / observedDays : 0;
    const daysUntilStockout =
      dailyRunRate > 0 ? Math.max(0, Math.round(item.stock / dailyRunRate)) : null;

    let projectedStockoutDate: string | null = null;
    if (daysUntilStockout !== null) {
      projectedStockoutDate = addDaysIso(referenceAnchorDate, daysUntilStockout);
    }

    // Target 30 days of stock cover + reorder buffer
    const target30DayCover =
      dailyRunRate > 0 ? Math.ceil(dailyRunRate * 30) : Math.max(item.reorderLevel * 2, 10);
    const desiredStock = Math.max(item.reorderLevel * 2, target30DayCover);
    const suggestedReorderQty = Math.max(0, desiredStock - item.stock);
    const estimatedRestockCost = roundCurrencyAmount(suggestedReorderQty * item.unitCost, cur);

    let riskStatus: InventoryVelocityItem['riskStatus'] = 'healthy';
    if (item.stock === 0) {
      riskStatus = 'out';
    } else if (
      item.stock <= item.reorderLevel ||
      (daysUntilStockout !== null && daysUntilStockout <= 14)
    ) {
      riskStatus = daysUntilStockout !== null && daysUntilStockout <= 7 ? 'critical' : 'low';
    } else if (daysUntilStockout !== null && daysUntilStockout > 150 && item.stock > item.reorderLevel * 4) {
      riskStatus = 'overstocked';
    }

    return {
      item,
      unitsSoldInPeriod,
      dailyRunRate,
      daysUntilStockout,
      projectedStockoutDate,
      suggestedReorderQty,
      estimatedRestockCost,
      riskStatus,
    };
  });
}

export function computeSalesForecastBaseline(
  sales: SalesRecord[],
  expenses: ExpenseRecord[],
  currency?: CurrencyCode
): {
  hasEnoughHistory: boolean;
  monthCount: number;
  trailingAvgRevenue: number;
  trailingAvgNetProfit: number;
  monthlySlope: number;
  nextMonthYmList: (horizon: number) => Array<{ ym: string; label: string }>;
} {
  const cur = normalizeCurrencyCode(currency ?? activeCurrency);
  const stats = computeAnalytics(sales, expenses, cur);
  const months = stats.monthly;
  const monthCount = months.length;
  const recent = months.slice(-3);
  const trailingAvgRevenue =
    recent.length > 0 ? roundCurrencyAmount(recent.reduce((s, m) => s + m.revenue, 0) / recent.length, cur) : 0;
  const trailingAvgNetProfit =
    recent.length > 0 ? roundCurrencyAmount(recent.reduce((s, m) => s + m.netProfit, 0) / recent.length, cur) : 0;

  let monthlySlope = 0;
  if (monthCount >= 2) {
    const n = monthCount;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    months.forEach((m, i) => {
      sumX += i;
      sumY += m.revenue;
      sumXY += i * m.revenue;
      sumXX += i * i;
    });
    const denom = n * sumXX - sumX * sumX;
    if (denom !== 0) {
      monthlySlope = (n * sumXY - sumX * sumY) / denom;
    }
  }

  const lastYm = monthCount > 0 ? months[monthCount - 1].ym : new Date().toISOString().slice(0, 7);

  const nextMonthYmList = (horizon: number) => {
    const [startY, startM] = lastYm.split('-').map(Number);
    const out: Array<{ ym: string; label: string }> = [];
    for (let i = 1; i <= horizon; i++) {
      const dt = new Date(startY, (startM || 1) - 1 + i, 1);
      const ym = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      out.push({ ym, label: fmtMonthLabel(ym, cur) });
    }
    return out;
  };

  return {
    hasEnoughHistory: monthCount >= 2 && sales.length >= 2,
    monthCount,
    trailingAvgRevenue,
    trailingAvgNetProfit,
    monthlySlope,
    nextMonthYmList,
  };
}

export function buildAiBusinessContext(params: {
  shopProfile?: ShopProfile | null;
  currency?: CurrencyCode;
  dateRange: string;
  stats: AnalyticsSummary;
  pnl: ProfitAndLossSummary;
  inventory: InventoryItem[];
  customers?: CustomerRecord[];
  employees?: EmployeeRecord[];
  tasks?: TaskRecord[];
  recentSales?: SalesRecord[];
  recentExpenses?: ExpenseRecord[];
}) {
  const {
    shopProfile,
    currency,
    dateRange,
    stats,
    pnl,
    inventory,
    customers = [],
    employees = [],
    tasks = [],
    recentSales = [],
    recentExpenses = [],
  } = params;
  const cur = normalizeCurrencyCode(currency ?? shopProfile?.currency ?? activeCurrency);
  const meta = getCurrencyMeta(cur);
  const isDemo = isDemoDataset(recentSales);
  const velocity = computeInventoryVelocity(inventory, recentSales, cur);
  const custSummary = computeCustomerAnalytics(customers, recentSales);

  const lowStockItems = velocity
    .filter((v) => v.riskStatus === 'out' || v.riskStatus === 'critical' || v.riskStatus === 'low')
    .map((v) => ({
      sku: v.item.sku,
      name: v.item.name,
      category: v.item.category,
      stock: v.item.stock,
      reorderLevel: v.item.reorderLevel,
      dailyRunRate: Number(v.dailyRunRate.toFixed(2)),
      daysUntilStockout: v.daysUntilStockout,
      suggestedReorderQty: v.suggestedReorderQty,
      unitCost: v.item.unitCost,
      status: v.item.stock === 0 ? 'Out of Stock' : 'Low Stock',
    }));

  return {
    businessName: shopProfile?.shopName || 'SmartBiz Shop',
    businessType: shopProfile?.businessType || 'Small Business',
    country: shopProfile?.country || meta.defaultCountry,
    city: shopProfile?.city || meta.defaultCountry,
    dataSource: isDemo ? 'Sample Demo Dataset' : 'Actual Shop Business Data',
    currency: `${meta.code} (${meta.symbol.trim()})`,
    currencyCode: meta.code,
    dateRange,
    kpis: {
      totalRevenue: fmtCurrency(stats.totalRevenue, cur),
      totalCogs: fmtCurrency(stats.totalCost, cur),
      grossProfit: fmtCurrency(stats.totalProfit, cur),
      grossMarginPct: `${stats.profitMargin.toFixed(1)}%`,
      totalOrders: stats.totalOrders,
      totalUnitsSold: stats.totalUnits,
      avgOrderValue: fmtCurrency(stats.avgOrderValue, cur),
      revenueGrowthPct: stats.growthPct !== null ? `${stats.growthPct.toFixed(1)}%` : 'N/A',
    },
    pnl: {
      grossRevenue: fmtCurrency(pnl.grossRevenue, cur),
      cogs: fmtCurrency(pnl.totalCogs, cur),
      grossProfit: fmtCurrency(pnl.grossProfit, cur),
      operatingExpenses: fmtCurrency(pnl.totalExpenses, cur),
      netProfitOrLoss: `${pnl.isLoss ? '-' : ''}${fmtCurrency(Math.abs(pnl.netProfit), cur)}`,
      netMarginPct: `${pnl.netMarginPct.toFixed(1)}%`,
      status: pnl.isLoss ? 'Net Loss' : 'Net Profit',
    },
    customerSummary: {
      totalCustomers: custSummary.totalCustomers,
      activeCustomers: custSummary.activeCustomers,
      repeatCustomers: custSummary.repeatCustomers,
      avgLifetimeValue: fmtCurrency(custSummary.avgLifetimeValue, cur),
      topSegment: custSummary.topSegment,
      topCustomers: custSummary.rankedCustomers.slice(0, 5).map((c) => ({
        name: c.customer.name,
        segment: c.customer.segment,
        orders: c.ordersInPeriod || c.customer.totalOrders,
        spent: fmtCurrency(c.spentInPeriod || c.customer.totalSpent, cur),
      })),
    },
    expenseCategories: pnl.expensesByCategory.map((e) => ({
      category: e.category,
      amount: fmtCurrency(e.amount, cur),
      sharePct: `${e.sharePct.toFixed(1)}%`,
    })),
    topProducts: stats.products.slice(0, 6).map((p) => ({
      name: p.name,
      category: p.category,
      units: p.units,
      revenue: fmtCurrency(p.revenue, cur),
      grossProfit: fmtCurrency(p.profit, cur),
      marginPct: `${p.margin.toFixed(1)}%`,
    })),
    lowProducts: [...stats.products]
      .reverse()
      .slice(0, 4)
      .map((p) => ({
        name: p.name,
        category: p.category,
        units: p.units,
        revenue: fmtCurrency(p.revenue, cur),
        marginPct: `${p.margin.toFixed(1)}%`,
      })),
    categories: stats.categories.map((c) => ({
      name: c.name,
      revenue: fmtCurrency(c.revenue, cur),
      profit: fmtCurrency(c.profit, cur),
      marginPct: `${c.margin.toFixed(1)}%`,
    })),
    regions: stats.regions.map((r) => ({
      name: r.name,
      revenue: fmtCurrency(r.revenue, cur),
      orders: r.orders,
    })),
    lowStockItems,
    inventoryVelocity: velocity.map((v) => ({
      sku: v.item.sku,
      name: v.item.name,
      stock: v.item.stock,
      reorderLevel: v.item.reorderLevel,
      unitCost: v.item.unitCost,
      unitsSoldInPeriod: v.unitsSoldInPeriod,
      dailyRunRate: Number(v.dailyRunRate.toFixed(2)),
      daysUntilStockout: v.daysUntilStockout,
      suggestedReorderQty: v.suggestedReorderQty,
      riskStatus: v.riskStatus,
    })),
    monthlySummary: stats.monthly.slice(-12).map((m) => ({
      month: m.ym,
      revenueNum: roundCurrencyAmount(m.revenue, cur),
      expensesNum: roundCurrencyAmount(m.expenses, cur),
      netProfitNum: roundCurrencyAmount(m.netProfit, cur),
      orders: m.orders,
      revenue: fmtCurrency(m.revenue, cur),
      expenses: fmtCurrency(m.expenses, cur),
      netProfit: fmtCurrency(m.netProfit, cur),
    })),
    yearlySummary: stats.yearly.map((y) => ({
      year: y.year,
      orders: y.orders,
      revenue: fmtCurrency(y.revenue, cur),
      expenses: fmtCurrency(y.expenses, cur),
      netProfit: fmtCurrency(y.netProfit, cur),
      netMarginPct: `${y.netMarginPct.toFixed(1)}%`,
    })),
    recentSalesSample: [...recentSales]
      .sort((a, b) => b.Date.localeCompare(a.Date))
      .slice(0, 10)
      .map((s) => ({
        date: s.Date,
        product: s.Product,
        qty: s.Quantity,
        revenue: fmtCurrency(s.Revenue, cur),
        profit: fmtCurrency(s.Revenue - s.Cost, cur),
        customer: s.customerName || 'Walk-in',
      })),
    recentExpensesSample: [...recentExpenses]
      .sort((a, b) => b.Date.localeCompare(a.Date))
      .slice(0, 10)
      .map((e) => ({
        date: e.Date,
        title: e.Title,
        category: e.Category,
        amount: fmtCurrency(e.Amount, cur),
      })),
    teamSummary: {
      totalEmployees: employees.length,
      activeEmployees: employees.filter((e) => e.status === 'Active').length,
      monthlyPayroll: fmtCurrency(
        employees
          .filter((e) => e.status === 'Active')
          .reduce((sum, e) => sum + (Number(e.monthlySalary) || 0), 0),
        cur
      ),
      totalTasks: tasks.length,
      pendingTasks: tasks.filter((t) => t.status === 'Pending').length,
      inProgressTasks: tasks.filter((t) => t.status === 'In Progress').length,
      completedTasks: tasks.filter((t) => t.status === 'Completed').length,
    },
  };
}
