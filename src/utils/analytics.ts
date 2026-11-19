import type {
  AnalyticsSummary,
  CategoryMetric,
  InsightItem,
  IntelligenceReport,
  MonthlyMetric,
  ProductMetric,
  RecommendationItem,
  RegionMetric,
  SalesRecord,
} from '../types/bi';

export function generateSampleDataset(): SalesRecord[] {
  const catalog = [
    { product: 'ProBook Ultra 15', category: 'Electronics', unitPrice: 1280, costRatio: 0.68, weight: 1.4 },
    { product: 'Vision 4K Monitor', category: 'Electronics', unitPrice: 540, costRatio: 0.72, weight: 1.1 },
    { product: 'NoiseCancel Pro Headphones', category: 'Electronics', unitPrice: 290, costRatio: 0.56, weight: 1.2 },
    { product: 'Apex Standing Desk', category: 'Workspace Furniture', unitPrice: 780, costRatio: 0.62, weight: 1.3 },
    { product: 'ErgoMesh Executive Chair', category: 'Workspace Furniture', unitPrice: 460, costRatio: 0.58, weight: 1.25 },
    { product: 'Lumina Desk Lamp', category: 'Workspace Furniture', unitPrice: 85, costRatio: 0.69, weight: 0.45 },
    { product: 'MechKey Wireless Keyboard', category: 'Accessories', unitPrice: 145, costRatio: 0.48, weight: 1.1 },
    { product: 'ThunderDock USB-C Hub', category: 'Accessories', unitPrice: 165, costRatio: 0.76, weight: 0.85 },
    { product: 'AeroMouse Precision', category: 'Accessories', unitPrice: 75, costRatio: 0.66, weight: 0.4 },
    { product: 'CloudSync Pro License', category: 'Software & Services', unitPrice: 320, costRatio: 0.18, weight: 1.15 },
    { product: 'TeamFlow Annual Plan', category: 'Software & Services', unitPrice: 490, costRatio: 0.22, weight: 0.95 },
    { product: 'SmartShield Security Suite', category: 'Software & Services', unitPrice: 190, costRatio: 0.24, weight: 0.65 },
  ];

  const regions = [
    { name: 'North America', mult: 1.35 },
    { name: 'Europe', mult: 1.08 },
    { name: 'Asia Pacific', mult: 0.95 },
    { name: 'Latin America', mult: 0.55 },
  ];

  const months = [
    { ym: '2025-12', factor: 1.12 },
    { ym: '2026-01', factor: 0.82 },
    { ym: '2026-02', factor: 0.88 },
    { ym: '2026-03', factor: 0.96 },
    { ym: '2026-04', factor: 1.01 },
    { ym: '2026-05', factor: 1.07 },
    { ym: '2026-06', factor: 1.1 },
    { ym: '2026-07', factor: 0.98 },
    { ym: '2026-08', factor: 1.14 },
    { ym: '2026-09', factor: 1.22 },
    { ym: '2026-10', factor: 1.31 },
    { ym: '2026-11', factor: 1.44 },
  ];

  let seed = 4219;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const records: SalesRecord[] = [];
  months.forEach((m, mIdx) => {
    for (let i = 0; i < 11; i++) {
      const item = catalog[(mIdx * 5 + i * 3 + Math.floor(rand() * 4)) % catalog.length];
      const reg = regions[(mIdx + i + Math.floor(rand() * 3)) % regions.length];
      const day = String(Math.min(28, 2 + Math.floor(rand() * 26))).padStart(2, '0');
      const baseQty = Math.max(1, Math.round((1 + rand() * 5) * item.weight * m.factor * reg.mult));
      const priceVariance = 0.95 + rand() * 0.1;
      const revenue = Math.round(baseQty * item.unitPrice * priceVariance);
      const costVariance = item.costRatio * (0.96 + rand() * 0.08);
      const cost = Math.round(revenue * costVariance);
      const profit = revenue - cost;

      records.push({
        Date: `${m.ym}-${day}`,
        Product: item.product,
        Category: item.category,
        Quantity: baseQty,
        Revenue: revenue,
        Cost: cost,
        Profit: profit,
        Region: reg.name,
      });
    }
  });

  return records.sort((a, b) => a.Date.localeCompare(b.Date));
}

export function fmtCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export function fmtNumber(val: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(val || 0));
}

export function fmtMonthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export function computeAnalytics(data: SalesRecord[]): AnalyticsSummary {
  const totalRevenue = data.reduce((s, r) => s + r.Revenue, 0);
  const totalCost = data.reduce((s, r) => s + r.Cost, 0);
  const totalProfit = data.reduce((s, r) => s + r.Profit, 0);
  const totalOrders = data.length;
  const totalUnits = data.reduce((s, r) => s + r.Quantity, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const monthMap: Record<string, MonthlyMetric> = {};
  data.forEach((r) => {
    const ym = r.Date.slice(0, 7);
    if (!monthMap[ym]) monthMap[ym] = { ym, orders: 0, units: 0, revenue: 0, cost: 0, profit: 0 };
    monthMap[ym].orders += 1;
    monthMap[ym].units += r.Quantity;
    monthMap[ym].revenue += r.Revenue;
    monthMap[ym].cost += r.Cost;
    monthMap[ym].profit += r.Profit;
  });
  const monthly = Object.values(monthMap).sort((a, b) => a.ym.localeCompare(b.ym));

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
    catMap[r.Category].revenue += r.Revenue;
    catMap[r.Category].cost += r.Cost;
    catMap[r.Category].profit += r.Profit;
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
    regMap[r.Region].revenue += r.Revenue;
    regMap[r.Region].cost += r.Cost;
    regMap[r.Region].profit += r.Profit;
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
    prodMap[r.Product].revenue += r.Revenue;
    prodMap[r.Product].cost += r.Cost;
    prodMap[r.Product].profit += r.Profit;
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
    categories,
    regions,
    products,
  };
}

export function generateIntelligence(stats: AnalyticsSummary): IntelligenceReport {
  if (stats.totalOrders === 0) {
    return { insights: [], recommendations: [], summaryItems: [] };
  }

  const bestProduct = stats.products[0];
  const bestProfitProduct = [...stats.products].sort((a, b) => b.profit - a.profit)[0];
  const worstProduct = stats.products[stats.products.length - 1];
  const lowMarginProducts = [...stats.products].sort((a, b) => a.margin - b.margin);
  const lowestMarginProd = lowMarginProducts[0];

  const peakMonth = [...stats.monthly].sort((a, b) => b.revenue - a.revenue)[0];
  const slowMonth = [...stats.monthly].sort((a, b) => a.revenue - b.revenue)[0];

  const topProfitCat = [...stats.categories].sort((a, b) => b.profit - a.profit)[0];
  const highestMarginCat = [...stats.categories].sort((a, b) => b.margin - a.margin)[0];
  const lowestCat = stats.categories[stats.categories.length - 1];

  const topRegion = stats.regions[0];
  const weakRegion = stats.regions[stats.regions.length - 1];

  const insights: InsightItem[] = [
    {
      type: 'Star Product',
      title: `${bestProduct.name} Leads Revenue`,
      body: `Generating ${fmtCurrency(bestProduct.revenue)} across ${fmtNumber(bestProduct.units)} units (${((bestProduct.revenue / stats.totalRevenue) * 100).toFixed(1)}% of total sales) with a ${bestProduct.margin.toFixed(1)}% profit margin.`,
    },
    {
      type: 'Peak Seasonality',
      title: `${fmtMonthLabel(peakMonth.ym)} Was Your Best Month`,
      body: `Revenue peaked at ${fmtCurrency(peakMonth.revenue)} (${fmtCurrency(peakMonth.profit)} profit), outperforming your slowest month (${fmtMonthLabel(slowMonth.ym)} at ${fmtCurrency(slowMonth.revenue)}) by ${slowMonth.revenue > 0 ? (((peakMonth.revenue - slowMonth.revenue) / slowMonth.revenue) * 100).toFixed(0) : 0}%.`,
    },
    {
      type: 'Profitability Leader',
      title: `${topProfitCat.name} Drives Most Profit`,
      body: `${topProfitCat.name} delivered ${fmtCurrency(topProfitCat.profit)} in net profit. Meanwhile, ${highestMarginCat.name} achieves the highest margin efficiency at ${highestMarginCat.margin.toFixed(1)}%.`,
    },
    {
      type: 'Underperformer Alert',
      title: `${worstProduct.name} Trails Portfolio`,
      body: `With only ${fmtCurrency(worstProduct.revenue)} in revenue and ${fmtNumber(worstProduct.units)} units sold, this item contributes ${((worstProduct.revenue / stats.totalRevenue) * 100).toFixed(1)}% of total sales.`,
    },
    {
      type: 'Margin Watch',
      title: `${lowestMarginProd.name} Has Tightest Margin`,
      body: `Operating at a ${lowestMarginProd.margin.toFixed(1)}% margin (${fmtCurrency(lowestMarginProd.cost)} cost vs. ${fmtCurrency(lowestMarginProd.revenue)} revenue), indicating high unit costs or heavy discounting.`,
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
          : `Comparing ${stats.growthContext.toLowerCase()}, business revenue shifted by ${stats.growthPct >= 0 ? '+' : ''}${stats.growthPct.toFixed(1)}%, led by ${topRegion.name} (${fmtCurrency(topRegion.revenue)}).`,
    },
  ];

  const recommendations: RecommendationItem[] = [
    {
      variant: 'success',
      badge: 'Scale Winner',
      title: `Bundle & Upsell ${bestProduct.name}`,
      desc: `Your top SKU (${bestProduct.name}) and highest-profit item (${bestProfitProduct.name}) show strong customer demand. Create product bundles pairing ${bestProduct.name} with high-margin ${highestMarginCat.name} add-ons to lift Average Order Value above ${fmtCurrency(stats.avgOrderValue * 1.12)}.`,
    },
    {
      variant: 'warning',
      badge: 'Category Lift',
      title: `Revitalize ${lowestCat.name} Performance`,
      desc: `${lowestCat.name} generates ${fmtCurrency(lowestCat.revenue)} (${((lowestCat.revenue / stats.totalRevenue) * 100).toFixed(1)}% share). Introduce seasonal promotions, cross-sell placements at checkout, or phase out slow SKUs like ${worstProduct.name}.`,
    },
    {
      variant: 'info',
      badge: 'Campaign Timing',
      title: `Capitalize on ${fmtMonthLabel(peakMonth.ym)} & Offset ${fmtMonthLabel(slowMonth.ym)}`,
      desc: `Pre-stock top inventory 4 weeks before your ${fmtMonthLabel(peakMonth.ym)} surge (${fmtCurrency(peakMonth.revenue)}). Run retention email campaigns and early-bird discounts during ${fmtMonthLabel(slowMonth.ym)} to smooth cash flow.`,
    },
    {
      variant: 'default',
      badge: 'Market Expansion',
      title: `Targeted Marketing in ${weakRegion.name}`,
      desc: `${weakRegion.name} currently accounts for ${fmtCurrency(weakRegion.revenue)} (${((weakRegion.revenue / stats.totalRevenue) * 100).toFixed(1)}% of sales) vs. ${topRegion.name} at ${fmtCurrency(topRegion.revenue)}. Launch localized ad campaigns promoting ${highestMarginCat.name} where delivery costs don't erode margin.`,
    },
    {
      variant: 'warning',
      badge: 'Margin Optimization',
      title: `Improve Margins on ${lowestMarginProd.name}`,
      desc: `${lowestMarginProd.name} has a ${lowestMarginProd.margin.toFixed(1)}% margin compared to your company average of ${stats.profitMargin.toFixed(1)}%. Negotiate supplier COGS down by 5–8% or test a modest 6% price increase to unlock extra profit.`,
    },
    {
      variant: 'success',
      badge: 'Profit Focus',
      title: `Shift Ad Spend Toward ${highestMarginCat.name}`,
      desc: `Every $1,000 in ${highestMarginCat.name} sales yields ~${fmtCurrency(highestMarginCat.margin * 10)} in gross profit. Reallocating 15% of ad spend toward ${highestMarginCat.name} will accelerate net profit faster than volume discounts.`,
    },
  ];

  return {
    insights,
    recommendations,
    summaryItems: insights.slice(0, 4),
  };
}

export interface QaAnswer {
  headline: string;
  body: string;
}

export function answerUserQuestion(query: string, stats: AnalyticsSummary): QaAnswer {
  if (stats.totalOrders === 0) {
    return {
      headline: 'No Active Data',
      body: 'No records are currently available in the active filter range. Adjust your filters or upload a CSV dataset.',
    };
  }

  const q = query.toLowerCase().trim();
  const bestProd = stats.products[0];
  const worstProd = stats.products[stats.products.length - 1];
  const bestProfitProd = [...stats.products].sort((a, b) => b.profit - a.profit)[0];
  const peakMonth = [...stats.monthly].sort((a, b) => b.revenue - a.revenue)[0];
  const slowMonth = [...stats.monthly].sort((a, b) => a.revenue - b.revenue)[0];
  const topProfitCat = [...stats.categories].sort((a, b) => b.profit - a.profit)[0];
  const highMarginCat = [...stats.categories].sort((a, b) => b.margin - a.margin)[0];
  const topReg = stats.regions[0];
  const weakReg = stats.regions[stats.regions.length - 1];
  const lowMarginProd = [...stats.products].sort((a, b) => a.margin - b.margin)[0];

  if (q.includes('best') || q.includes('top product') || q.includes('performing')) {
    return {
      headline: 'Top Performing Product',
      body: `${bestProd.name} leads revenue at ${fmtCurrency(bestProd.revenue)} (${fmtNumber(bestProd.units)} units sold, ${bestProd.margin.toFixed(1)}% margin). In terms of net profit dollars, ${bestProfitProd.name} contributed ${fmtCurrency(bestProfitProd.profit)}.`,
    };
  }
  if (q.includes('month') || q.includes('peak') || q.includes('highest revenue') || q.includes('when')) {
    return {
      headline: 'Peak Revenue Month',
      body: `${fmtMonthLabel(peakMonth.ym)} achieved your highest revenue at ${fmtCurrency(peakMonth.revenue)} (Profit: ${fmtCurrency(peakMonth.profit)} across ${peakMonth.orders} orders). Your lowest month was ${fmtMonthLabel(slowMonth.ym)} at ${fmtCurrency(slowMonth.revenue)}.`,
    };
  }
  if (q.includes('category') || q.includes('most profit')) {
    return {
      headline: 'Category Profitability',
      body: `${topProfitCat.name} generated the highest total profit at ${fmtCurrency(topProfitCat.profit)} on ${fmtCurrency(topProfitCat.revenue)} revenue. For margin efficiency, ${highMarginCat.name} leads at ${highMarginCat.margin.toFixed(1)}%.`,
    };
  }
  if (q.includes('worst') || q.includes('low') || q.includes('improvement') || q.includes('weak')) {
    return {
      headline: 'Products Needing Improvement',
      body: `${worstProd.name} has the lowest sales (${fmtCurrency(worstProd.revenue)}, ${fmtNumber(worstProd.units)} units). Additionally, ${lowMarginProd.name} has the lowest profit margin at ${lowMarginProd.margin.toFixed(1)}% and would benefit from supplier renegotiation or repricing.`,
    };
  }
  if (q.includes('region') || q.includes('where') || q.includes('country') || q.includes('market')) {
    return {
      headline: 'Regional Breakdown',
      body: `${topReg.name} is your strongest market with ${fmtCurrency(topReg.revenue)} (${((topReg.revenue / stats.totalRevenue) * 100).toFixed(1)}% share). ${weakReg.name} is your smallest market at ${fmtCurrency(weakReg.revenue)}, representing an untapped expansion opportunity.`,
    };
  }
  if (q.includes('increase') || q.includes('suggest') || q.includes('recommend') || q.includes('grow') || q.includes('profit')) {
    return {
      headline: 'Top Growth Levers',
      body: `(1) Focus marketing on high-margin ${highMarginCat.name} (${highMarginCat.margin.toFixed(1)}% margin); (2) Bundle ${bestProd.name} with accessories to push AOV beyond ${fmtCurrency(stats.avgOrderValue)}; (3) Improve unit economics on ${lowMarginProd.name}; and (4) Target campaigns in ${weakReg.name}.`,
    };
  }

  return {
    headline: 'Executive Snapshot',
    body: `Across ${fmtNumber(stats.totalOrders)} orders, total revenue is ${fmtCurrency(stats.totalRevenue)} with ${fmtCurrency(stats.totalProfit)} profit (${stats.profitMargin.toFixed(1)}% margin). Your #1 product is ${bestProd.name}, your #1 profit category is ${topProfitCat.name}, and your peak month was ${fmtMonthLabel(peakMonth.ym)}.`,
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

function parseNumeric(val: unknown): number {
  if (typeof val === 'number') return val;
  const cleaned = String(val ?? '0').replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function normalizeDate(dateStr: string): string {
  const s = String(dateStr || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return '2026-01-01';
}

export function parseCsvDataset(csvText: string): SalesRecord[] {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row.');
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const findCol = (aliases: string[]) => headers.findIndex((h) => aliases.some((a) => h.includes(a)));

  const idxDate = findCol(['date', 'orderdate', 'time']);
  const idxProd = findCol(['product', 'item', 'sku', 'name']);
  const idxCat = findCol(['category', 'dept', 'segment']);
  const idxQty = findCol(['quantity', 'qty', 'units']);
  const idxRev = findCol(['revenue', 'sales', 'amount', 'total']);
  const idxCost = findCol(['cost', 'cogs', 'expense']);
  const idxProf = findCol(['profit', 'margin', 'net']);
  const idxReg = findCol(['region', 'location', 'country', 'area']);

  if (idxProd === -1 || idxRev === -1) {
    throw new Error("CSV must include at least 'Product' and 'Revenue' columns.");
  }

  const parsed: SalesRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length < 2) continue;

    const revenue = parseNumeric(cols[idxRev]);
    const cost = idxCost !== -1 ? parseNumeric(cols[idxCost]) : Math.round(revenue * 0.65);
    const profit = idxProf !== -1 ? parseNumeric(cols[idxProf]) : revenue - cost;
    const qty = idxQty !== -1 ? Math.max(1, Math.round(parseNumeric(cols[idxQty]))) : 1;

    parsed.push({
      Date: idxDate !== -1 ? normalizeDate(cols[idxDate]) : '2026-01-15',
      Product: cols[idxProd] || `Product ${i}`,
      Category: idxCat !== -1 && cols[idxCat] ? cols[idxCat] : 'General',
      Quantity: qty,
      Revenue: revenue,
      Cost: cost,
      Profit: profit,
      Region: idxReg !== -1 && cols[idxReg] ? cols[idxReg] : 'Global',
    });
  }

  if (parsed.length === 0) {
    throw new Error('No valid rows could be parsed from this CSV.');
  }

  return parsed.sort((a, b) => a.Date.localeCompare(b.Date));
}

function csvEscape(val: unknown): string {
  const s = String(val ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsvFile(filename: string, rows: Array<Array<string | number>>): void {
  const csvContent = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
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

export function exportAnalyticsReportCsv(filteredDataset: SalesRecord[]): void {
  const stats = computeAnalytics(filteredDataset);
  const intel = generateIntelligence(stats);
  const rows: Array<Array<string | number>> = [];

  rows.push(['SMARTBIZ AI - BUSINESS INTELLIGENCE ANALYTICS REPORT']);
  rows.push(['Generated On', new Date().toLocaleString()]);
  rows.push(['Active Records', stats.totalOrders]);
  rows.push([]);

  rows.push(['EXECUTIVE SUMMARY KPIs', 'VALUE']);
  rows.push(['Total Revenue', stats.totalRevenue.toFixed(2)]);
  rows.push(['Total Cost', stats.totalCost.toFixed(2)]);
  rows.push(['Total Profit', stats.totalProfit.toFixed(2)]);
  rows.push(['Profit Margin (%)', stats.profitMargin.toFixed(2) + '%']);
  rows.push(['Total Orders', stats.totalOrders]);
  rows.push(['Total Units Sold', stats.totalUnits]);
  rows.push(['Average Order Value', stats.avgOrderValue.toFixed(2)]);
  rows.push(['Revenue Growth (%)', stats.growthPct !== null ? stats.growthPct.toFixed(2) + '%' : 'N/A']);
  rows.push([]);

  rows.push(['MONTHLY PERFORMANCE']);
  rows.push(['Month', 'Orders', 'Units', 'Revenue', 'Cost', 'Profit']);
  stats.monthly.forEach((m) => rows.push([m.ym, m.orders, m.units, m.revenue, m.cost, m.profit]));
  rows.push([]);

  rows.push(['PRODUCT PERFORMANCE']);
  rows.push(['Product', 'Category', 'Orders', 'Units', 'Revenue', 'Cost', 'Profit', 'Margin (%)']);
  stats.products.forEach((p) =>
    rows.push([p.name, p.category, p.orders, p.units, p.revenue, p.cost, p.profit, p.margin.toFixed(2)])
  );
  rows.push([]);

  rows.push(['AI INSIGHTS & RECOMMENDATIONS']);
  rows.push(['Type', 'Title', 'Details']);
  intel.insights.forEach((i) => rows.push([i.type, i.title, i.body]));
  intel.recommendations.forEach((r) => rows.push([`Recommendation: ${r.badge}`, r.title, r.desc]));

  const dateTag = new Date().toISOString().slice(0, 10);
  downloadCsvFile(`SmartBiz_AI_Analytics_Report_${dateTag}.csv`, rows);
}

export function exportFilteredRawCsv(filteredDataset: SalesRecord[]): void {
  const rows: Array<Array<string | number>> = [
    ['Date', 'Product', 'Category', 'Quantity', 'Revenue', 'Cost', 'Profit', 'Region'],
  ];
  filteredDataset.forEach((r) => {
    rows.push([r.Date, r.Product, r.Category, r.Quantity, r.Revenue, r.Cost, r.Profit, r.Region]);
  });
  const dateTag = new Date().toISOString().slice(0, 10);
  downloadCsvFile(`SmartBiz_Sales_Data_${dateTag}.csv`, rows);
}

export function downloadSampleTemplateCsv(): void {
  const sample = generateSampleDataset();
  const rows: Array<Array<string | number>> = [
    ['Date', 'Product', 'Category', 'Quantity', 'Revenue', 'Cost', 'Profit', 'Region'],
  ];
  sample.forEach((r) => {
    rows.push([r.Date, r.Product, r.Category, r.Quantity, r.Revenue, r.Cost, r.Profit, r.Region]);
  });
  downloadCsvFile('SmartBiz_Sample_Sales_Template.csv', rows);
}
