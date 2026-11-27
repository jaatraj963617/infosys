import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import {
  AlertTriangle,
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Banknote,
  BarChart2,
  CreditCard,
  DollarSign,
  Euro,
  IndianRupee,
  JapaneseYen,
  Minus,
  PoundSterling,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import type {
  AnalyticsSummary,
  ComparisonSummary,
  CurrencyCode,
  IntelligenceReport,
  MetricDelta,
  ProfitAndLossSummary,
  ViewId,
} from '../../types/bi';
import { fmtCurrency, fmtMonthLabel, fmtNumber, fmtShortAxisCurrency } from '../../utils/analytics';
import { ChartCanvas } from '../ChartCanvas';

interface ExecutiveOverviewProps {
  currency: CurrencyCode;
  stats: AnalyticsSummary;
  pnl: ProfitAndLossSummary;
  intel: IntelligenceReport;
  lowStockCount: number;
  onNavigate: (view: ViewId) => void;
  isCompareEnabled?: boolean;
  compareStats?: AnalyticsSummary | null;
  comparison?: ComparisonSummary | null;
}

function CurrencyKpiIcon({ currency }: { currency: CurrencyCode }) {
  const cls = 'w-4 h-4 text-violet-700';
  switch (currency) {
    case 'INR':
      return <IndianRupee className={cls} aria-hidden="true" />;
    case 'EUR':
      return <Euro className={cls} aria-hidden="true" />;
    case 'GBP':
      return <PoundSterling className={cls} aria-hidden="true" />;
    case 'JPY':
      return <JapaneseYen className={cls} aria-hidden="true" />;
    case 'USD':
    case 'AUD':
    case 'CAD':
    case 'SGD':
      return <DollarSign className={cls} aria-hidden="true" />;
    default:
      return <Banknote className={cls} aria-hidden="true" />;
  }
}

const CHART_PALETTE = ['#6D28D9', '#0F172A', '#2563EB', '#059669', '#D97706', '#DB2777'];

function calcPctDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function formatDeltaBadge(pct: number | null) {
  if (pct === null) return 'N/A';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function TrendArrowBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-xs font-mono-num font-medium text-slate-400 whitespace-nowrap"
        aria-label="No baseline data"
      >
        <Minus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>N/A</span>
      </span>
    );
  }
  const isUp = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-mono-num font-semibold whitespace-nowrap ${
        isUp ? 'text-emerald-600' : 'text-rose-600'
      }`}
      aria-label={`${isUp ? 'Up' : 'Down'} ${Math.abs(pct).toFixed(1)} percent vs. Period B`}
    >
      {isUp ? (
        <ArrowUp className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" aria-hidden="true" />
      ) : (
        <ArrowDown className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" aria-hidden="true" />
      )}
      <span>{formatDeltaBadge(pct)}</span>
    </span>
  );
}

function DeltaIndicator({
  pct,
  baselineText,
}: {
  pct: number | null;
  baselineText: string;
}) {
  if (pct === null) {
    return <div className="mt-2 text-xs text-slate-500 tabular-nums">Period B: {baselineText}</div>;
  }
  const isUp = pct >= 0;
  return (
    <div
      className={`mt-2 text-xs font-medium flex items-center gap-1 tabular-nums ${
        isUp ? 'text-emerald-700' : 'text-rose-700'
      }`}
    >
      {isUp ? (
        <ArrowUp className="w-3.5 h-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
      ) : (
        <ArrowDown className="w-3.5 h-3.5 shrink-0 text-rose-600" aria-hidden="true" />
      )}
      <span>
        {formatDeltaBadge(pct)} vs. {baselineText}
      </span>
    </div>
  );
}

export function ExecutiveOverview({
  currency,
  stats,
  pnl,
  intel,
  lowStockCount,
  onNavigate,
  isCompareEnabled,
  compareStats,
  comparison,
}: ExecutiveOverviewProps) {
  const compareActive = Boolean((isCompareEnabled ?? Boolean(comparison)) && compareStats);

  const kpiTrends = useMemo(() => {
    if (!compareActive || !compareStats) return null;
    return {
      revenue: calcPctDelta(stats.totalRevenue, compareStats.totalRevenue),
      profit: calcPctDelta(stats.totalProfit, compareStats.totalProfit),
      orders: calcPctDelta(stats.totalOrders, compareStats.totalOrders),
      avgOrderValue: calcPctDelta(stats.avgOrderValue, compareStats.avgOrderValue),
      units: calcPctDelta(stats.totalUnits, compareStats.totalUnits),
    };
  }, [compareActive, stats, compareStats]);

  const trendChartConfig = useMemo<ChartConfiguration>(() => {
    const labels = stats.monthly.map((m) => fmtMonthLabel(m.ym, currency));
    return {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Revenue',
            data: stats.monthly.map((m) => m.revenue),
            borderColor: '#6D28D9',
            backgroundColor: 'rgba(109, 40, 217, 0.10)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 3.5,
          },
          {
            label: 'Gross Profit',
            data: stats.monthly.map((m) => m.profit),
            borderColor: '#0F172A',
            backgroundColor: 'transparent',
            tension: 0.35,
            borderWidth: 2,
            borderDash: [5, 4],
            pointRadius: 3,
          },
          {
            label: 'Net Profit (After Expenses)',
            data: stats.monthly.map((m) => m.netProfit),
            borderColor: '#059669',
            backgroundColor: 'transparent',
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 2.5,
          },
        ],
      },
      options: {
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
              label: (ctx) =>
                `${ctx.dataset.label || ctx.label}: ${fmtCurrency(Number(ctx.parsed.y ?? 0), currency)}`,
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
  }, [stats.monthly, currency]);

  const categoryChartConfig = useMemo<ChartConfiguration>(() => {
    return {
      type: 'doughnut',
      data: {
        labels: stats.categories.map((c) => c.name),
        datasets: [
          {
            data: stats.categories.map((c) => c.revenue),
            backgroundColor: CHART_PALETTE,
            borderWidth: 2,
            borderColor: '#FFFFFF',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, padding: 14, font: { family: 'DM Sans', size: 12 } },
          },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 11,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => `${ctx.label}: ${fmtCurrency(Number(ctx.parsed ?? 0), currency)}`,
            },
          },
        },
      },
    };
  }, [stats.categories, currency]);

  const sideBySideCategoryConfig = useMemo<ChartConfiguration | null>(() => {
    if (!comparison) return null;
    return {
      type: 'bar',
      data: {
        labels: comparison.categories.map((c) => c.name),
        datasets: [
          {
            label: `Period A (${comparison.primaryLabel})`,
            data: comparison.categories.map((c) => c.primaryRevenue),
            backgroundColor: '#6D28D9',
            borderRadius: 5,
          },
          {
            label: `Period B (${comparison.compareLabel})`,
            data: comparison.categories.map((c) => c.compareRevenue),
            backgroundColor: '#94A3B8',
            borderRadius: 5,
          },
        ],
      },
      options: {
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
              label: (ctx) => `${ctx.dataset.label}: ${fmtCurrency(Number(ctx.parsed.y ?? 0), currency)}`,
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
  }, [comparison, currency]);

  const topProducts = stats.products.slice(0, 4);

  const comparisonRows: Array<{
    label: string;
    primaryFormatted: string;
    compareFormatted: string;
    varianceFormatted: string;
    pct: number | null;
    isPositive: boolean;
  }> = useMemo(() => {
    if (!comparison || !compareStats) return [];
    const buildCurrencyRow = (label: string, delta: MetricDelta, lowerIsBetter = false) => ({
      label,
      primaryFormatted: fmtCurrency(delta.primary, currency),
      compareFormatted: fmtCurrency(delta.compare, currency),
      varianceFormatted: `${delta.diff >= 0 ? '+' : '-'}${fmtCurrency(Math.abs(delta.diff), currency)}`,
      pct: delta.pct,
      isPositive: lowerIsBetter ? delta.diff <= 0 : delta.diff >= 0,
    });
    const buildCountRow = (label: string, delta: MetricDelta) => ({
      label,
      primaryFormatted: fmtNumber(delta.primary, currency),
      compareFormatted: fmtNumber(delta.compare, currency),
      varianceFormatted: `${delta.diff >= 0 ? '+' : '-'}${fmtNumber(Math.abs(delta.diff), currency)}`,
      pct: delta.pct,
      isPositive: delta.diff >= 0,
    });
    return [
      buildCurrencyRow('Total Revenue', comparison.revenue),
      buildCurrencyRow('Total Gross Profit', comparison.profit),
      buildCurrencyRow('Operating Expenses', comparison.expenses, true),
      buildCurrencyRow('Net Profit (After Expenses)', comparison.netProfit),
      {
        label: 'Gross Margin',
        primaryFormatted: `${stats.profitMargin.toFixed(1)}%`,
        compareFormatted: `${compareStats.profitMargin.toFixed(1)}%`,
        varianceFormatted: `${comparison.marginDiffPp >= 0 ? '+' : ''}${comparison.marginDiffPp.toFixed(1)} pp`,
        pct: null,
        isPositive: comparison.marginDiffPp >= 0,
      },
      buildCountRow('Total Orders', comparison.orders),
      buildCountRow('Units Sold', comparison.units),
      buildCurrencyRow('Avg. Order Value', comparison.avgOrderValue),
    ];
  }, [comparison, compareStats, stats.profitMargin, currency]);

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-medium text-slate-500">Total Revenue</span>
            {kpiTrends ? (
              <TrendArrowBadge pct={kpiTrends.revenue} />
            ) : (
              <CurrencyKpiIcon currency={currency} />
            )}
          </div>
          <div className="font-mono-num text-2xl font-bold text-slate-900 tracking-tight">
            {fmtCurrency(stats.totalRevenue, currency)}
          </div>
          {kpiTrends && compareStats ? (
            <DeltaIndicator
              pct={kpiTrends.revenue}
              baselineText={fmtCurrency(compareStats.totalRevenue, currency)}
            />
          ) : (
            <div className="mt-2 text-xs text-slate-500 tabular-nums">
              {fmtNumber(stats.totalUnits, currency)} units sold
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-medium text-slate-500">Gross Profit</span>
            {kpiTrends ? (
              <TrendArrowBadge pct={kpiTrends.profit} />
            ) : (
              <TrendingUp className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            )}
          </div>
          <div className="font-mono-num text-2xl font-bold text-slate-900 tracking-tight">
            {fmtCurrency(stats.totalProfit, currency)}
          </div>
          {kpiTrends && compareStats ? (
            <DeltaIndicator
              pct={kpiTrends.profit}
              baselineText={fmtCurrency(compareStats.totalProfit, currency)}
            />
          ) : (
            <div
              className={`mt-2 text-xs font-medium tabular-nums ${
                stats.profitMargin >= 20 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {stats.profitMargin.toFixed(1)}% gross margin
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-medium text-slate-500">Total Orders</span>
            {kpiTrends ? (
              <TrendArrowBadge pct={kpiTrends.orders} />
            ) : (
              <ShoppingBag className="w-4 h-4 text-slate-700" aria-hidden="true" />
            )}
          </div>
          <div className="font-mono-num text-2xl font-bold text-slate-900 tracking-tight">
            {fmtNumber(stats.totalOrders, currency)}
          </div>
          {kpiTrends && compareStats ? (
            <DeltaIndicator pct={kpiTrends.orders} baselineText={`${fmtNumber(compareStats.totalOrders, currency)} orders`} />
          ) : (
            <div className="mt-2 text-xs text-slate-500 tabular-nums">
              {stats.products.length} active SKUs
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-medium text-slate-500">Avg. Order Value</span>
            {kpiTrends ? (
              <TrendArrowBadge pct={kpiTrends.avgOrderValue} />
            ) : (
              <CreditCard className="w-4 h-4 text-blue-600" aria-hidden="true" />
            )}
          </div>
          <div className="font-mono-num text-2xl font-bold text-slate-900 tracking-tight">
            {fmtCurrency(stats.avgOrderValue, currency)}
          </div>
          {kpiTrends && compareStats ? (
            <DeltaIndicator
              pct={kpiTrends.avgOrderValue}
              baselineText={fmtCurrency(compareStats.avgOrderValue, currency)}
            />
          ) : (
            <div className="mt-2 text-xs text-slate-500">Revenue per order</div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-medium text-slate-500">
              {kpiTrends ? 'Units Sold' : 'Revenue Growth'}
            </span>
            {kpiTrends ? (
              <TrendArrowBadge pct={kpiTrends.units} />
            ) : (
              <BarChart2 className="w-4 h-4 text-amber-600" aria-hidden="true" />
            )}
          </div>
          <div className="font-mono-num text-2xl font-bold text-slate-900 tracking-tight">
            {kpiTrends
              ? fmtNumber(stats.totalUnits, currency)
              : stats.growthPct === null
                ? 'N/A'
                : `${stats.growthPct >= 0 ? '+' : ''}${stats.growthPct.toFixed(1)}%`}
          </div>
          {kpiTrends && compareStats ? (
            <DeltaIndicator
              pct={kpiTrends.units}
              baselineText={`${fmtNumber(compareStats.totalUnits, currency)} units`}
            />
          ) : (
            <div
              className={`mt-2 text-xs font-medium flex items-center gap-1 ${
                stats.growthPct === null
                  ? 'text-slate-500'
                  : stats.growthPct >= 0
                    ? 'text-emerald-700'
                    : 'text-rose-700'
              }`}
            >
              {stats.growthPct !== null &&
                (stats.growthPct >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
                ))}
              <span>{stats.growthContext}</span>
            </div>
          )}
        </div>
      </div>

      {/* Live P&L & Inventory Operations Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
        <div>
          <div className="text-xs font-medium text-slate-500">Operating Expenses (Active Period)</div>
          <div className="font-mono-num text-lg font-bold text-slate-900 mt-0.5">
            {fmtCurrency(pnl.totalExpenses, currency)}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-500">
            {pnl.isLoss ? 'Net Business Loss' : 'Net Profit (After Expenses)'}
          </div>
          <div
            className={`font-mono-num text-lg font-bold mt-0.5 ${
              pnl.isLoss ? 'text-rose-700' : 'text-emerald-700'
            }`}
          >
            {pnl.isLoss ? '-' : ''}
            {fmtCurrency(Math.abs(pnl.netProfit), currency)}{' '}
            <span className="text-xs font-medium text-slate-500">({pnl.netMarginPct.toFixed(1)}%)</span>
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-slate-500">Inventory Alert Status</div>
          {lowStockCount > 0 ? (
            <div className="text-sm font-semibold text-amber-700 mt-0.5 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{lowStockCount} SKUs need restocking</span>
            </div>
          ) : (
            <div className="text-sm font-semibold text-emerald-700 mt-0.5">All SKU stock levels healthy</div>
          )}
        </div>
        <div className="flex flex-wrap sm:justify-end gap-2">
          <button
            type="button"
            onClick={() => onNavigate('ledger')}
            className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors whitespace-nowrap"
          >
            Add Entry
          </button>
          <button
            type="button"
            onClick={() => onNavigate('customers')}
            className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors whitespace-nowrap"
          >
            Customers
          </button>
          <button
            type="button"
            onClick={() => onNavigate('insights')}
            className="min-h-[38px] px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50 hover:bg-violet-100 text-xs font-semibold text-violet-800 transition-colors whitespace-nowrap"
          >
            AI Forecast
          </button>
          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="min-h-[38px] px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white transition-colors whitespace-nowrap"
          >
            Manage Stock
          </button>
        </div>
      </div>

      {/* Side-by-Side Period Comparison Panel */}
      {comparison && sideBySideCategoryConfig && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="p-5 sm:p-6 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Side-by-Side Period Growth Comparison</h3>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                Period A ({comparison.primaryLabel}) vs. Period B ({comparison.compareLabel})
              </p>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="text-left py-2.5 px-4 whitespace-nowrap">Metric</th>
                    <th className="text-right py-2.5 px-4 whitespace-nowrap">Period A</th>
                    <th className="text-right py-2.5 px-4 whitespace-nowrap">Period B</th>
                    <th className="text-right py-2.5 px-4 whitespace-nowrap">Variance</th>
                    <th className="text-right py-2.5 px-4 whitespace-nowrap">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparisonRows.map((row) => (
                    <tr key={row.label} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">{row.label}</td>
                      <td className="py-3 px-4 text-right font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                        {row.primaryFormatted}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-num text-slate-600 whitespace-nowrap">
                        {row.compareFormatted}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono-num font-medium whitespace-nowrap ${
                          row.isPositive ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {row.varianceFormatted}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono-num font-semibold whitespace-nowrap ${
                          row.pct === null
                            ? 'text-slate-500'
                            : row.isPositive
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                        }`}
                      >
                        {row.pct === null ? '—' : formatDeltaBadge(row.pct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900">Category Revenue Comparison</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Side-by-side revenue performance across both date ranges
              </p>
            </div>
            <div className="relative h-[268px] w-full">
              <ChartCanvas
                config={sideBySideCategoryConfig}
                ariaLabel="Side-by-side category revenue comparison chart"
              />
            </div>
          </div>
        </div>
      )}

      {/* Primary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Monthly Revenue, Gross &amp; Net Profit</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {comparison
                  ? `Primary Period (${comparison.primaryLabel})`
                  : 'Performance trend across selected timeframe'}
              </p>
            </div>
            <span className="text-xs font-medium text-violet-700 whitespace-nowrap">
              {stats.monthly.length} {stats.monthly.length === 1 ? 'month' : 'months'}
            </span>
          </div>
          <div className="relative h-[290px] w-full">
            <ChartCanvas config={trendChartConfig} ariaLabel="Monthly revenue and profit trajectory chart" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-900">Revenue by Category</h3>
            <p className="text-xs text-slate-500 mt-0.5">Share of total sales</p>
          </div>
          <div className="relative h-[290px] w-full">
            <ChartCanvas config={categoryChartConfig} ariaLabel="Revenue by category doughnut chart" />
          </div>
        </div>
      </div>

      {/* Executive Briefing + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">AI Executive Briefing</h3>
              <p className="text-xs text-slate-500 mt-0.5">Automatically synthesized from your active dataset</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('insights')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:text-violet-800 whitespace-nowrap shrink-0 py-1.5 px-2.5 rounded-lg hover:bg-violet-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              Open AI Assistant
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {intel.summaryItems.length === 0 ? (
            <p className="text-sm text-slate-500 py-6">No data available for synthesis.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {intel.summaryItems.map((item) => (
                <div key={item.type} className="py-3.5 first:pt-4 last:pb-0">
                  <div className="text-xs font-semibold text-violet-700">{item.type}</div>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5">{item.title}</div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Top Performing Products</h3>
              <p className="text-xs text-slate-500 mt-0.5">Highest revenue contributors</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('products')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:text-violet-800 whitespace-nowrap shrink-0 py-1.5 px-2.5 rounded-lg hover:bg-violet-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              View All
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {topProducts.length === 0 ? (
            <p className="text-sm text-slate-500 py-6">No products to display.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {topProducts.map((product, index) => (
                <div key={product.name} className="py-3.5 first:pt-4 last:pb-0 flex items-center gap-3.5">
                  <div className="w-7 h-7 rounded-md bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 truncate">{product.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {product.category} · {fmtNumber(product.units, currency)} units · {product.margin.toFixed(1)}% margin
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono-num text-sm font-bold text-slate-900">
                      {fmtCurrency(product.revenue, currency)}
                    </div>
                    <div className="font-mono-num text-xs text-emerald-700 mt-0.5">
                      Profit {fmtCurrency(product.profit, currency)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
