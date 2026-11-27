import { jsPDF } from 'jspdf';
import type {
  CurrencyCode,
  CustomerRecord,
  ExpenseRecord,
  InventoryItem,
  SalesRecord,
  ShopProfile,
} from '../types/bi';
import {
  computeAnalytics,
  computeCustomerAnalytics,
  computeProfitAndLoss,
  downloadCsvFile,
  fmtCurrency,
  fmtMonthLabel,
  fmtNumber,
  getActiveCurrency,
  isDemoDataset,
  roundCurrencyAmount,
} from './analytics';
import { getCurrencyMeta, normalizeCurrencyCode } from './businessConfig';

export type ReportGranularity = 'monthly' | 'yearly' | 'period';

function pdfCurrency(val: number, currency?: CurrencyCode): string {
  const cur = normalizeCurrencyCode(currency ?? getActiveCurrency());
  const meta = getCurrencyMeta(cur);
  const safe = roundCurrencyAmount(Number.isFinite(val) ? val : 0, cur);
  const abs = Math.abs(safe);
  const hasFraction = meta.decimals > 0 && Math.abs(abs - Math.round(abs)) >= 0.005;
  const formatted = new Intl.NumberFormat(meta.locale, {
    minimumFractionDigits: hasFraction ? meta.decimals : 0,
    maximumFractionDigits: meta.decimals,
  }).format(abs);
  return `${safe < 0 ? '-' : ''}${meta.pdfPrefix} ${formatted}`;
}

function getPeriodLabel(granularity: ReportGranularity, periodKey: string, currency?: CurrencyCode): string {
  if (granularity === 'yearly' && periodKey !== 'ALL') {
    return `Year ${periodKey}`;
  }
  if (granularity === 'monthly' && periodKey !== 'ALL') {
    return `${fmtMonthLabel(periodKey, currency)} (${periodKey})`;
  }
  return 'Active Filtered Period';
}

function truncatePdfText(text: string, maxChars = 54): string {
  const clean = String(text || '').trim();
  return clean.length > maxChars ? `${clean.slice(0, maxChars - 1)}…` : clean;
}

export function exportBusinessReportCsv(params: {
  granularity: ReportGranularity;
  periodKey: string;
  sales: SalesRecord[];
  expenses: ExpenseRecord[];
  inventory: InventoryItem[];
  customers?: CustomerRecord[];
  shopProfile?: ShopProfile | null;
  currency?: CurrencyCode;
}): void {
  const { granularity, periodKey, sales, expenses, inventory, customers = [], shopProfile, currency } = params;
  const cur = normalizeCurrencyCode(currency ?? shopProfile?.currency ?? getActiveCurrency());
  const meta = getCurrencyMeta(cur);
  const dec = meta.decimals;
  const stats = computeAnalytics(sales, expenses, cur);
  const pnl = computeProfitAndLoss(sales, expenses, cur);
  const custSummary = computeCustomerAnalytics(customers, sales);
  const label = getPeriodLabel(granularity, periodKey, cur);
  const isDemo = isDemoDataset(sales);

  const rows: Array<Array<string | number>> = [];
  rows.push([
    granularity === 'yearly'
      ? 'SMARTBIZ AI - YEARLY BUSINESS REPORT'
      : 'SMARTBIZ AI - MONTHLY BUSINESS REPORT',
  ]);
  if (shopProfile) {
    rows.push(['Shop Name', shopProfile.shopName]);
    rows.push(['Owner', shopProfile.ownerName]);
    rows.push(['City', shopProfile.city]);
    if (shopProfile.gstin) rows.push(['GSTIN', shopProfile.gstin]);
  }
  rows.push(['Data Source', isDemo ? 'Sample Demo Dataset' : 'Actual Shop Business Data']);
  rows.push(['Report Period', label]);
  rows.push(['Currency', meta.code]);
  rows.push(['Generated On', new Date().toLocaleString(meta.locale)]);
  rows.push([]);

  rows.push(['KEY PERFORMANCE INDICATORS', 'VALUE']);
  rows.push([`Total Revenue (${meta.code})`, pnl.grossRevenue.toFixed(dec)]);
  rows.push(['Total Orders', stats.totalOrders]);
  rows.push(['Total Units Sold', stats.totalUnits]);
  rows.push([`Average Order Value (${meta.code})`, stats.avgOrderValue.toFixed(dec)]);
  rows.push(['Gross Margin (%)', pnl.grossMarginPct.toFixed(2) + '%']);
  rows.push(['Net Margin (%)', pnl.netMarginPct.toFixed(2) + '%']);
  rows.push([]);

  rows.push(['PROFIT & LOSS STATEMENT', `AMOUNT (${meta.code})`]);
  rows.push(['Gross Sales Revenue', pnl.grossRevenue.toFixed(dec)]);
  rows.push(['Cost of Goods Sold (COGS)', pnl.totalCogs.toFixed(dec)]);
  rows.push(['Gross Profit', pnl.grossProfit.toFixed(dec)]);
  rows.push(['Total Operating Expenses', pnl.totalExpenses.toFixed(dec)]);
  rows.push([pnl.isLoss ? 'Net Loss' : 'Net Profit', pnl.netProfit.toFixed(dec)]);
  rows.push([]);

  if (customers.length > 0) {
    rows.push(['CUSTOMER ANALYTICS SUMMARY']);
    rows.push(['Total Customers', custSummary.totalCustomers]);
    rows.push(['Active Customers (Period)', custSummary.activeCustomers]);
    rows.push(['Repeat Buyers (2+ orders)', custSummary.repeatCustomers]);
    rows.push(['Top Segment', custSummary.topSegment]);
    rows.push([]);
  }

  if (stats.monthly.length > 0) {
    rows.push(['MONTH-BY-MONTH SUMMARY']);
    rows.push(['Month', 'Orders', 'Units', 'Revenue', 'COGS', 'Gross Profit', 'Expenses', 'Net Profit']);
    stats.monthly.forEach((m) =>
      rows.push([m.ym, m.orders, m.units, m.revenue, m.cost, m.profit, m.expenses, m.netProfit])
    );
    rows.push([]);
  }

  rows.push(['OPERATING EXPENSE BREAKDOWN']);
  rows.push(['Expense Category', `Amount (${meta.code})`, 'Share (%)']);
  pnl.expensesByCategory.forEach((e) => {
    rows.push([e.category, e.amount.toFixed(dec), e.sharePct.toFixed(1) + '%']);
  });
  rows.push([]);

  rows.push(['TOP SELLING PRODUCTS']);
  rows.push(['Product', 'Category', 'Units', 'Revenue', 'Gross Profit', 'Margin (%)']);
  stats.products.slice(0, 10).forEach((p) => {
    rows.push([p.name, p.category, p.units, p.revenue, p.profit, p.margin.toFixed(1) + '%']);
  });
  rows.push([]);

  const lowStock = inventory.filter((i) => i.stock <= i.reorderLevel);
  rows.push(['INVENTORY LOW-STOCK ALERTS']);
  rows.push(['SKU', 'Product', 'Current Stock', 'Reorder Level', 'Status']);
  if (lowStock.length === 0) {
    rows.push(['All SKUs healthy', '', '', '', 'In Stock']);
  } else {
    lowStock.forEach((i) => {
      rows.push([i.sku, i.name, i.stock, i.reorderLevel, i.stock === 0 ? 'Out of Stock' : 'Low Stock']);
    });
  }

  const slug = periodKey === 'ALL' ? 'Active_Period' : periodKey;
  const prefix = granularity === 'yearly' ? 'Yearly' : 'Monthly';
  downloadCsvFile(`SmartBiz_${prefix}_Report_${slug}.csv`, rows);
}

export function exportBusinessReportPdf(params: {
  granularity: ReportGranularity;
  periodKey: string;
  sales: SalesRecord[];
  expenses: ExpenseRecord[];
  inventory: InventoryItem[];
  customers?: CustomerRecord[];
  shopProfile?: ShopProfile | null;
  currency?: CurrencyCode;
}): void {
  const { granularity, periodKey, sales, expenses, inventory, customers = [], shopProfile, currency } = params;
  const cur = normalizeCurrencyCode(currency ?? shopProfile?.currency ?? getActiveCurrency());
  const meta = getCurrencyMeta(cur);
  const stats = computeAnalytics(sales, expenses, cur);
  const pnl = computeProfitAndLoss(sales, expenses, cur);
  const custSummary = computeCustomerAnalytics(customers, sales);
  const label = getPeriodLabel(granularity, periodKey, cur);
  const isDemo = isDemoDataset(sales);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 48;

  const ensureSpace = (needed: number) => {
    if (y + needed > 765) {
      doc.addPage();
      y = 48;
    }
  };

  doc.setFillColor(109, 40, 217);
  doc.rect(0, 0, pageWidth, 96, 'F');
  doc.setFillColor(124, 58, 237);
  doc.rect(0, 90, pageWidth, 6, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  const reportTitle =
    granularity === 'yearly'
      ? 'SmartBiz AI - Yearly Business Report'
      : 'SmartBiz AI - Monthly Business Report';
  doc.text(reportTitle, 40, 35);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const shopLine = shopProfile
    ? `${shopProfile.shopName} (${shopProfile.city})${shopProfile.gstin ? `  |  GSTIN: ${shopProfile.gstin}` : ''}`
    : 'SmartBiz AI Small Business Platform';
  doc.text(shopLine, 40, 55);
  doc.text(
    `Period: ${label}   |   Source: ${isDemo ? 'Sample Demo Data' : 'Actual Shop Data'}   |   Generated: ${new Date().toLocaleDateString(meta.locale)}`,
    40,
    73
  );

  y = 122;

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('1. Key Performance Indicators (KPIs)', 40, y);
  y += 14;

  const kpiCards: Array<{ label: string; value: string; sub: string; accent: [number, number, number] }> = [
    {
      label: 'TOTAL REVENUE',
      value: pdfCurrency(stats.totalRevenue, cur),
      sub: `${fmtNumber(stats.totalOrders, cur)} orders / ${fmtNumber(stats.totalUnits, cur)} units`,
      accent: [109, 40, 217],
    },
    {
      label: pnl.isLoss ? 'NET LOSS' : 'NET PROFIT',
      value: pdfCurrency(pnl.netProfit, cur),
      sub: `${pnl.netMarginPct.toFixed(1)}% net margin`,
      accent: pnl.isLoss ? [225, 29, 72] : [5, 150, 105],
    },
    {
      label: 'AVG. ORDER VALUE',
      value: pdfCurrency(stats.avgOrderValue, cur),
      sub: `${pnl.grossMarginPct.toFixed(1)}% gross margin`,
      accent: [15, 23, 42],
    },
    {
      label: 'OPERATING EXPENSES',
      value: pdfCurrency(pnl.totalExpenses, cur),
      sub: `${pnl.expensesByCategory.length} expense categories`,
      accent: [217, 119, 6],
    },
  ];

  const cardGap = 10;
  const cardWidth = (pageWidth - 80 - cardGap * 3) / 4;
  const cardHeight = 58;

  kpiCards.forEach((card, idx) => {
    const x = 40 + idx * (cardWidth + cardGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, cardWidth, cardHeight, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, x + 9, y + 16);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(card.value.length > 13 ? 9.5 : 11.5);
    doc.setTextColor(card.accent[0], card.accent[1], card.accent[2]);
    doc.text(card.value, x + 9, y + 34, { maxWidth: cardWidth - 18 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(card.sub, x + 9, y + 48, { maxWidth: cardWidth - 18 });
  });

  y += cardHeight + 24;
  let sectionNum = 2;

  ensureSpace(140);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`${sectionNum++}. Profit & Loss Statement`, 40, y);
  y += 18;

  const pnlLines: Array<[string, string, boolean?]> = [
    ['Gross Sales Revenue', pdfCurrency(pnl.grossRevenue, cur)],
    ['Less: Cost of Goods Sold (COGS)', pdfCurrency(pnl.totalCogs, cur)],
    [`Gross Profit (${pnl.grossMarginPct.toFixed(1)}% margin)`, pdfCurrency(pnl.grossProfit, cur), true],
    ['Less: Operating Expenses', pdfCurrency(pnl.totalExpenses, cur)],
    [
      `${pnl.isLoss ? 'Net Loss' : 'Net Profit'} (${pnl.netMarginPct.toFixed(1)}% margin)`,
      pdfCurrency(pnl.netProfit, cur),
      true,
    ],
  ];

  pnlLines.forEach(([k, v, bold]) => {
    ensureSpace(22);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(k, 48, y);
    doc.setTextColor(bold ? 109 : 15, bold ? 40 : 23, bold ? 217 : 42);
    doc.text(v, pageWidth - 48, y, { align: 'right' });
    doc.setDrawColor(226, 232, 240);
    doc.line(48, y + 6, pageWidth - 48, y + 6);
    y += 22;
  });

  y += 12;

  if (stats.monthly.length > 1) {
    ensureSpace(70);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`${sectionNum++}. Month-by-Month Performance`, 40, y);
    y += 16;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Month', 48, y);
    doc.text('Revenue', 240, y, { align: 'right' });
    doc.text('Gross Profit', 345, y, { align: 'right' });
    doc.text('Expenses', 445, y, { align: 'right' });
    doc.text('Net Profit', pageWidth - 48, y, { align: 'right' });
    doc.setDrawColor(203, 213, 225);
    doc.line(48, y + 5, pageWidth - 48, y + 5);
    y += 18;

    stats.monthly.forEach((m) => {
      ensureSpace(18);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(`${fmtMonthLabel(m.ym, cur)} (${m.ym})`, 48, y);
      doc.text(pdfCurrency(m.revenue, cur), 240, y, { align: 'right' });
      doc.text(pdfCurrency(m.profit, cur), 345, y, { align: 'right' });
      doc.text(pdfCurrency(m.expenses, cur), 445, y, { align: 'right' });
      doc.setTextColor(m.netProfit < 0 ? 225 : 5, m.netProfit < 0 ? 29 : 150, m.netProfit < 0 ? 72 : 105);
      doc.text(pdfCurrency(m.netProfit, cur), pageWidth - 48, y, { align: 'right' });
      y += 17;
    });
    y += 12;
  }

  if (customers.length > 0) {
    ensureSpace(70);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`${sectionNum++}. Customer Analytics Summary`, 40, y);
    y += 18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text(
      `Total Customers: ${custSummary.totalCustomers}   |   Active in Period: ${custSummary.activeCustomers}   |   Repeat Buyers: ${custSummary.repeatCustomers}   |   Top Segment: ${custSummary.topSegment}`,
      48,
      y
    );
    y += 18;

    custSummary.rankedCustomers.slice(0, 4).forEach((entry, idx) => {
      ensureSpace(18);
      const spent = entry.ordersInPeriod > 0 ? entry.spentInPeriod : entry.customer.totalSpent;
      const ord = entry.ordersInPeriod > 0 ? entry.ordersInPeriod : entry.customer.totalOrders;
      doc.text(
        truncatePdfText(`${idx + 1}. ${entry.customer.name} (${entry.customer.segment}, ${entry.customer.city}) - ${ord} orders`, 62),
        48,
        y
      );
      doc.text(pdfCurrency(spent, cur), pageWidth - 48, y, { align: 'right' });
      y += 17;
    });
    y += 10;
  }

  ensureSpace(60);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`${sectionNum++}. Operating Expense Breakdown`, 40, y);
  y += 18;

  if (pnl.expensesByCategory.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('No operating expenses recorded for this period.', 48, y);
    y += 22;
  } else {
    pnl.expensesByCategory.forEach((e) => {
      ensureSpace(20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text(`${e.category} (${e.sharePct.toFixed(1)}%)`, 48, y);
      doc.setTextColor(15, 23, 42);
      doc.text(pdfCurrency(e.amount, cur), pageWidth - 48, y, { align: 'right' });
      y += 18;
    });
  }

  y += 12;

  ensureSpace(60);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`${sectionNum++}. Top Performing Products`, 40, y);
  y += 18;

  if (stats.products.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('No product sales recorded for this period.', 48, y);
    y += 22;
  } else {
    stats.products.slice(0, 6).forEach((p, idx) => {
      ensureSpace(20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text(
        truncatePdfText(`${idx + 1}. ${p.name} (${fmtNumber(p.units, cur)} units, ${p.margin.toFixed(1)}% margin)`, 62),
        48,
        y
      );
      doc.setTextColor(15, 23, 42);
      doc.text(pdfCurrency(p.revenue, cur), pageWidth - 48, y, { align: 'right' });
      y += 18;
    });
  }

  y += 12;

  const lowStock = inventory.filter((i) => i.stock <= i.reorderLevel);
  ensureSpace(60);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`${sectionNum}. Inventory & Low-Stock Alerts`, 40, y);
  y += 18;

  if (inventory.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('No inventory SKUs tracked yet.', 48, y);
  } else if (lowStock.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(5, 150, 105);
    doc.text(`All ${inventory.length} tracked inventory SKUs are above reorder thresholds.`, 48, y);
  } else {
    lowStock.forEach((item) => {
      ensureSpace(20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(180, 83, 9);
      const status = item.stock === 0 ? 'OUT OF STOCK' : 'LOW STOCK';
      doc.text(truncatePdfText(`[${status}] ${item.sku} - ${item.name}`, 56), 48, y);
      doc.text(`Stock: ${item.stock} / Reorder: ${item.reorderLevel}`, pageWidth - 48, y, { align: 'right' });
      y += 18;
    });
  }

  const pageCount = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(40, pageHeight - 40, pageWidth - 40, pageHeight - 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`SmartBiz AI - Small Business Management Platform | ${meta.code} Business Report`, 40, pageHeight - 25);
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - 40, pageHeight - 25, { align: 'right' });
  }

  const slug = periodKey === 'ALL' ? 'Active_Period' : periodKey;
  const prefix = granularity === 'yearly' ? 'Yearly' : 'Monthly';
  doc.save(`SmartBiz_${prefix}_Report_${slug}.pdf`);
}

export function generateDailyWhatsAppReportText(params: {
  date: string;
  language: 'en' | 'hi';
  shopProfile?: ShopProfile | null;
  currency?: CurrencyCode;
  allSales: SalesRecord[];
  allExpenses: ExpenseRecord[];
  inventory: InventoryItem[];
}): string {
  const { date, language, shopProfile, currency, allSales, allExpenses, inventory } = params;
  const cur = normalizeCurrencyCode(currency ?? shopProfile?.currency ?? getActiveCurrency());
  const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);
  const targetMonth = targetDate.slice(0, 7);

  const daySales = allSales.filter((s) => s.Date === targetDate);
  const dayExpenses = allExpenses.filter((e) => e.Date === targetDate);
  const dayStats = computeAnalytics(daySales, dayExpenses, cur);
  const dayPnl = computeProfitAndLoss(daySales, dayExpenses, cur);

  const mtdSales = allSales.filter((s) => s.Date.startsWith(targetMonth) && s.Date <= targetDate);
  const mtdExpenses = allExpenses.filter((e) => e.Date.startsWith(targetMonth) && e.Date <= targetDate);
  const mtdPnl = computeProfitAndLoss(mtdSales, mtdExpenses, cur);

  const lowStock = inventory.filter((i) => i.stock <= i.reorderLevel);
  const paymentBreakdown: Record<string, number> = {};
  daySales.forEach((s) => {
    const mode = s.PaymentMode || 'UPI';
    paymentBreakdown[mode] = (paymentBreakdown[mode] || 0) + s.Revenue;
  });
  const paymentLine = Object.entries(paymentBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([mode, amt]) => `${mode}: ${fmtCurrency(amt, cur)}`)
    .join(' | ');

  const isDemo = isDemoDataset(allSales);
  const shopName = shopProfile?.shopName || 'SmartBiz Shop';
  const city = shopProfile?.city || shopProfile?.country || 'Global';
  const topDayProducts = dayStats.products.slice(0, 3);

  if (language === 'hi') {
    const lines: string[] = [
      `*${shopName}* (${city}) — दैनिक बिज़नेस रिपोर्ट`,
      `दिनांक: ${targetDate}${isDemo ? ' [सैंपल डेमो डेटा]' : ''}`,
      '--------------------------------',
      `आज की बिक्री (Revenue): ${fmtCurrency(dayPnl.grossRevenue, cur)} (${fmtNumber(dayStats.totalOrders, cur)} ऑर्डर / ${fmtNumber(dayStats.totalUnits, cur)} यूनिट)`,
      `सकल लाभ (Gross Profit): ${fmtCurrency(dayPnl.grossProfit, cur)} (${dayPnl.grossMarginPct.toFixed(1)}%)`,
      `आज के खर्च (Expenses): ${fmtCurrency(dayPnl.totalExpenses, cur)}`,
      `${dayPnl.isLoss ? 'शुद्ध घाटा (Net Loss)' : 'शुद्ध मुनाफा (Net Profit)'}: ${dayPnl.isLoss ? '-' : ''}${fmtCurrency(Math.abs(dayPnl.netProfit), cur)}`,
    ];

    if (paymentLine) {
      lines.push(`भुगतान माध्यम: ${paymentLine}`);
    }

    if (topDayProducts.length > 0) {
      lines.push('', '*आज के टॉप उत्पाद:*');
      topDayProducts.forEach((p, idx) => {
        lines.push(`${idx + 1}. ${p.name} — ${fmtNumber(p.units, cur)} यूनिट (${fmtCurrency(p.revenue, cur)})`);
      });
    } else {
      lines.push('', 'आज के लिए कोई बिक्री दर्ज नहीं हुई है।');
    }

    lines.push(
      '',
      `*माह-दर-दिनांक (${fmtMonthLabel(targetMonth, cur)} MTD):*`,
      `कुल बिक्री: ${fmtCurrency(mtdPnl.grossRevenue, cur)} | शुद्ध मुनाफा: ${mtdPnl.isLoss ? '-' : ''}${fmtCurrency(Math.abs(mtdPnl.netProfit), cur)}`
    );

    if (lowStock.length > 0) {
      lines.push(
        '',
        `*लो-स्टॉक अलर्ट (${lowStock.length} SKU):*`,
        ...lowStock.slice(0, 4).map((i) => `• ${i.name}: ${i.stock} शेष (Reorder: ${i.reorderLevel})`)
      );
    } else if (inventory.length > 0) {
      lines.push('', `स्टॉक स्थिति: सभी ${inventory.length} SKU पर्याप्त स्टॉक में हैं।`);
    }

    lines.push('', 'SmartBiz AI द्वारा जनित');
    return lines.join('\n');
  }

  const lines: string[] = [
    `*${shopName}* (${city}) — Daily Business Digest`,
    `Date: ${targetDate}${isDemo ? ' [Sample Demo Data]' : ''}`,
    '--------------------------------',
    `Today's Revenue: ${fmtCurrency(dayPnl.grossRevenue, cur)} (${fmtNumber(dayStats.totalOrders, cur)} orders / ${fmtNumber(dayStats.totalUnits, cur)} units)`,
    `Gross Profit: ${fmtCurrency(dayPnl.grossProfit, cur)} (${dayPnl.grossMarginPct.toFixed(1)}% margin)`,
    `Operating Expenses: ${fmtCurrency(dayPnl.totalExpenses, cur)}`,
    `${dayPnl.isLoss ? 'Net Loss' : 'Net Profit'}: ${dayPnl.isLoss ? '-' : ''}${fmtCurrency(Math.abs(dayPnl.netProfit), cur)}`,
  ];

  if (paymentLine) {
    lines.push(`Payment Split: ${paymentLine}`);
  }

  if (topDayProducts.length > 0) {
    lines.push('', '*Top Items Sold Today:*');
    topDayProducts.forEach((p, idx) => {
      lines.push(`${idx + 1}. ${p.name} — ${fmtNumber(p.units, cur)} units (${fmtCurrency(p.revenue, cur)})`);
    });
  } else {
    lines.push('', 'No sales recorded on this date.');
  }

  lines.push(
    '',
    `*Month-to-Date (${fmtMonthLabel(targetMonth, cur)} MTD):*`,
    `Revenue: ${fmtCurrency(mtdPnl.grossRevenue, cur)} | Net Profit: ${mtdPnl.isLoss ? '-' : ''}${fmtCurrency(Math.abs(mtdPnl.netProfit), cur)}`
  );

  if (lowStock.length > 0) {
    lines.push(
      '',
      `*Low-Stock Alerts (${lowStock.length} SKUs):*`,
      ...lowStock.slice(0, 4).map((i) => `• ${i.name}: ${i.stock} left (Reorder at ${i.reorderLevel})`)
    );
  } else if (inventory.length > 0) {
    lines.push('', `Inventory: All ${inventory.length} tracked SKUs healthy.`);
  }

  lines.push('', 'Sent via SmartBiz AI');
  return lines.join('\n');
}

export function buildWhatsAppShareUrl(phone: string | undefined, text: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  const normalizedPhone = digits.length === 10 ? `91${digits}` : digits;
  const encoded = encodeURIComponent(text);
  return normalizedPhone ? `https://wa.me/${normalizedPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}
