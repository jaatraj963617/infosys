import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { ArrowDownRight, ArrowRight, ArrowUpRight, CreditCard, DollarSign, ShoppingBag, TrendingUp, BarChart2 } from 'lucide-react';
import type { AnalyticsSummary, IntelligenceReport, ViewId } from '../../types/bi';
import { fmtCurrency, fmtMonthLabel, fmtNumber } from '../../utils/analytics';
import { ChartCanvas } from '../ChartCanvas';

interface ExecutiveOverviewProps {
  stats: AnalyticsSummary;
  intel: IntelligenceReport;
  onNavigate: (view: ViewId) => void;
}

const CHART_PALETTE = ['#6D28D9', '#0F172A', '#2563EB', '#059669', '#D97706', '#DB2777'];

export function ExecutiveOverview({ stats, intel, onNavigate }: ExecutiveOverviewProps) {
  const trendChartConfig = useMemo<ChartConfiguration>(() => {
    const labels = stats.monthly.map((m) => fmtMonthLabel(m.ym));
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
            label: 'Profit',
            data: stats.monthly.map((m) => m.profit),
            borderColor: '#0F172A',
            backgroundColor: 'transparent',
            tension: 0.35,
            borderWidth: 2,
            borderDash: [5, 4],
            pointRadius: 3,
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
              label: (ctx) => `${ctx.dataset.label || ctx.label}: ${fmtCurrency(Number(ctx.parsed.y ?? 0))}`,
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
              callback: (v) => {
                const num = Number(v);
                return '$' + (num >= 1000 ? (num / 1000).toFixed(0) + 'k' : num);
              },
            },
          },
        },
      },
    };
  }, [stats.monthly]);

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
              label: (ctx) => `${ctx.label}: ${fmtCurrency(Number(ctx.parsed ?? 0))}`,
            },
          },
        },
      },
    };
  }, [stats.categories]);

  const topProducts = stats.products.slice(0, 4);

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Total Revenue</span>
            <DollarSign className="w-4 h-4 text-violet-700" aria-hidden="true" />
          </div>
          <div className="font-mono-num text-2xl font-bold text-slate-900 tracking-tight">
            {fmtCurrency(stats.totalRevenue)}
          </div>
          <div className="mt-2 text-xs text-slate-500 tabular-nums">
            {fmtNumber(stats.totalUnits)} units sold
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Total Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          </div>
          <div className="font-mono-num text-2xl font-bold text-slate-900 tracking-tight">
            {fmtCurrency(stats.totalProfit)}
          </div>
          <div
            className={`mt-2 text-xs font-medium tabular-nums ${
              stats.profitMargin >= 20 ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {stats.profitMargin.toFixed(1)}% net margin
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-slate-700" aria-hidden="true" />
          </div>
          <div className="font-mono-num text-2xl font-bold text-slate-900 tracking-tight">
            {fmtNumber(stats.totalOrders)}
          </div>
          <div className="mt-2 text-xs text-slate-500 tabular-nums">
            {stats.products.length} active SKUs
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Avg. Order Value</span>
            <CreditCard className="w-4 h-4 text-blue-600" aria-hidden="true" />
          </div>
          <div className="font-mono-num text-2xl font-bold text-slate-900 tracking-tight">
            {fmtCurrency(stats.avgOrderValue)}
          </div>
          <div className="mt-2 text-xs text-slate-500">Revenue per order</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Revenue Growth</span>
            <BarChart2 className="w-4 h-4 text-amber-600" aria-hidden="true" />
          </div>
          <div className="font-mono-num text-2xl font-bold text-slate-900 tracking-tight">
            {stats.growthPct === null
              ? 'N/A'
              : `${stats.growthPct >= 0 ? '+' : ''}${stats.growthPct.toFixed(1)}%`}
          </div>
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
        </div>
      </div>

      {/* Primary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Monthly Revenue &amp; Profit Trajectory</h3>
              <p className="text-xs text-slate-500 mt-0.5">Performance trend across selected timeframe</p>
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
              Full AI Report
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
                      {product.category} · {fmtNumber(product.units)} units · {product.margin.toFixed(1)}% margin
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono-num text-sm font-bold text-slate-900">
                      {fmtCurrency(product.revenue)}
                    </div>
                    <div className="font-mono-num text-xs text-emerald-700 mt-0.5">
                      Profit {fmtCurrency(product.profit)}
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
