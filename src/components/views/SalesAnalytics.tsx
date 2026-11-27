import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { AnalyticsSummary, ComparisonSummary, CurrencyCode } from '../../types/bi';
import { fmtCurrency, fmtMonthLabel, fmtNumber, fmtShortAxisCurrency } from '../../utils/analytics';
import { ChartCanvas } from '../ChartCanvas';

interface SalesAnalyticsProps {
  currency: CurrencyCode;
  stats: AnalyticsSummary;
  comparison?: ComparisonSummary | null;
}

export function SalesAnalytics({ currency, stats, comparison }: SalesAnalyticsProps) {
  const mLabels = useMemo(
    () => stats.monthly.map((m) => fmtMonthLabel(m.ym, currency)),
    [stats.monthly, currency]
  );

  const baseTooltip = useMemo(
    () => ({
      backgroundColor: '#0F172A',
      padding: 11,
      cornerRadius: 8,
      callbacks: {
        label: (ctx: { dataset: { label?: string }; label: string; parsed: { y?: number | null; x?: number | null } }) =>
          `${ctx.dataset.label || ctx.label}: ${fmtCurrency(Number(ctx.parsed.y ?? ctx.parsed.x ?? 0), currency)}`,
      },
    }),
    [currency]
  );

  const salesLineConfig = useMemo<ChartConfiguration>(
    () => ({
      type: 'line',
      data: {
        labels: mLabels,
        datasets: [
          {
            label: 'Monthly Revenue',
            data: stats.monthly.map((m) => m.revenue),
            borderColor: '#6D28D9',
            backgroundColor: 'rgba(109, 40, 217, 0.12)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.6,
            pointRadius: 4,
          },
          {
            label: 'Gross Profit',
            data: stats.monthly.map((m) => m.profit),
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.08)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.2,
            pointRadius: 3,
          },
          {
            label: 'Net Profit (After Expenses)',
            data: stats.monthly.map((m) => m.netProfit),
            borderColor: '#0F172A',
            backgroundColor: 'transparent',
            borderDash: [4, 4],
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { family: 'DM Sans', size: 12 } } },
          tooltip: baseTooltip,
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
    }),
    [mLabels, stats.monthly, baseTooltip, currency]
  );

  const revenueComparisonConfig = useMemo<ChartConfiguration>(
    () => ({
      type: 'bar',
      data: {
        labels: mLabels,
        datasets: [
          { label: 'Revenue', data: stats.monthly.map((m) => m.revenue), backgroundColor: '#6D28D9', borderRadius: 5 },
          { label: 'COGS', data: stats.monthly.map((m) => m.cost), backgroundColor: '#CBD5E1', borderRadius: 5 },
          { label: 'OpEx', data: stats.monthly.map((m) => m.expenses), backgroundColor: '#F59E0B', borderRadius: 5 },
          { label: 'Net Profit', data: stats.monthly.map((m) => m.netProfit), backgroundColor: '#0F172A', borderRadius: 5 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { family: 'DM Sans', size: 12 } } },
          tooltip: baseTooltip,
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
    }),
    [mLabels, stats.monthly, baseTooltip, currency]
  );

  const salesByCategoryConfig = useMemo<ChartConfiguration>(() => {
    if (comparison) {
      return {
        type: 'bar',
        data: {
          labels: comparison.categories.map((c) => c.name),
          datasets: [
            {
              label: `Period A Revenue`,
              data: comparison.categories.map((c) => c.primaryRevenue),
              backgroundColor: '#6D28D9',
              borderRadius: 6,
            },
            {
              label: `Period B Revenue`,
              data: comparison.categories.map((c) => c.compareRevenue),
              backgroundColor: '#94A3B8',
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { family: 'DM Sans', size: 12 } } },
            tooltip: baseTooltip,
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
    }

    return {
      type: 'bar',
      data: {
        labels: stats.categories.map((c) => c.name),
        datasets: [
          { label: 'Revenue', data: stats.categories.map((c) => c.revenue), backgroundColor: '#6D28D9', borderRadius: 6 },
          { label: 'Gross Profit', data: stats.categories.map((c) => c.profit), backgroundColor: '#0F172A', borderRadius: 6 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { family: 'DM Sans', size: 12 } } },
          tooltip: baseTooltip,
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
  }, [stats.categories, comparison, baseTooltip, currency]);

  const salesByRegionConfig = useMemo<ChartConfiguration>(() => {
    if (comparison) {
      return {
        type: 'bar',
        data: {
          labels: comparison.regions.map((r) => r.name),
          datasets: [
            {
              label: 'Period A Revenue',
              data: comparison.regions.map((r) => r.primaryRevenue),
              backgroundColor: '#6D28D9',
              borderRadius: 6,
            },
            {
              label: 'Period B Revenue',
              data: comparison.regions.map((r) => r.compareRevenue),
              backgroundColor: '#94A3B8',
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { family: 'DM Sans', size: 12 } } },
            tooltip: baseTooltip,
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
            y: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 12 }, color: '#334155' } },
          },
        },
      };
    }

    return {
      type: 'bar',
      data: {
        labels: stats.regions.map((r) => r.name),
        datasets: [
          {
            label: 'Regional Revenue',
            data: stats.regions.map((r) => r.revenue),
            backgroundColor: ['#6D28D9', '#0F172A', '#2563EB', '#059669'],
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: baseTooltip,
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
          y: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 12 }, color: '#334155' } },
        },
      },
    };
  }, [stats.regions, comparison, baseTooltip, currency]);

  return (
    <div className="space-y-5">
      {comparison && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Revenue Comparison',
              primary: fmtCurrency(comparison.revenue.primary, currency),
              compare: fmtCurrency(comparison.revenue.compare, currency),
              pct: comparison.revenue.pct,
            },
            {
              title: 'Gross Profit Comparison',
              primary: fmtCurrency(comparison.profit.primary, currency),
              compare: fmtCurrency(comparison.profit.compare, currency),
              pct: comparison.profit.pct,
            },
            {
              title: 'Order Volume Comparison',
              primary: `${fmtNumber(comparison.orders.primary, currency)} orders`,
              compare: `${fmtNumber(comparison.orders.compare, currency)} orders`,
              pct: comparison.orders.pct,
            },
          ].map((item) => {
            const isUp = (item.pct ?? 0) >= 0;
            return (
              <div key={item.title} className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
                <div className="text-xs font-medium text-slate-500">{item.title}</div>
                <div className="mt-2 flex items-baseline justify-between gap-2">
                  <span className="font-mono-num text-lg font-bold text-slate-900">{item.primary}</span>
                  <span className="font-mono-num text-xs text-slate-500">vs. {item.compare}</span>
                </div>
                {item.pct !== null && (
                  <div
                    className={`mt-1.5 text-xs font-semibold flex items-center gap-1 tabular-nums ${
                      isUp ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    <span>
                      {isUp ? '+' : ''}
                      {item.pct.toFixed(1)}% Period A vs. Period B
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-900">Monthly Sales &amp; Net Profit Line Chart</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {comparison ? `Period A (${comparison.primaryLabel})` : 'Total monthly revenue, gross profit, and net profit over time'}
            </p>
          </div>
          <div className="relative h-[320px] w-full">
            <ChartCanvas config={salesLineConfig} ariaLabel="Monthly sales line chart" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-900">Revenue vs. COGS, OpEx &amp; Net Profit</h3>
            <p className="text-xs text-slate-500 mt-0.5">Monthly revenue, cost of goods, operating expenses, and net profit</p>
          </div>
          <div className="relative h-[320px] w-full">
            <ChartCanvas config={revenueComparisonConfig} ariaLabel="Revenue vs cost and expenses comparison bar chart" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-900">
              {comparison ? 'Category Revenue: Period A vs. Period B' : 'Sales & Profit by Category'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {comparison
                ? 'Side-by-side category revenue across both selected periods'
                : 'Comparing category revenue against gross profit contribution'}
            </p>
          </div>
          <div className="relative h-[290px] w-full">
            <ChartCanvas config={salesByCategoryConfig} ariaLabel="Sales by category chart" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-900">
              {comparison ? 'Regional Revenue: Period A vs. Period B' : 'Sales by Region'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {comparison
                ? 'Side-by-side regional revenue across both selected periods'
                : 'Geographic revenue distribution and regional strength'}
            </p>
          </div>
          <div className="relative h-[290px] w-full">
            <ChartCanvas config={salesByRegionConfig} ariaLabel="Sales by region horizontal bar chart" />
          </div>
        </div>
      </div>
    </div>
  );
}
