import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { AnalyticsSummary } from '../../types/bi';
import { fmtCurrency, fmtMonthLabel } from '../../utils/analytics';
import { ChartCanvas } from '../ChartCanvas';

interface SalesAnalyticsProps {
  stats: AnalyticsSummary;
}

export function SalesAnalytics({ stats }: SalesAnalyticsProps) {
  const mLabels = useMemo(() => stats.monthly.map((m) => fmtMonthLabel(m.ym)), [stats.monthly]);

  const baseTooltip = {
    backgroundColor: '#0F172A',
    padding: 11,
    cornerRadius: 8,
    callbacks: {
      label: (ctx: { dataset: { label?: string }; label: string; parsed: { y?: number | null; x?: number | null } }) =>
        `${ctx.dataset.label || ctx.label}: ${fmtCurrency(Number(ctx.parsed.y ?? ctx.parsed.x ?? 0))}`,
    },
  };

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
            label: 'Net Profit',
            data: stats.monthly.map((m) => m.profit),
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.12)',
            fill: true,
            tension: 0.35,
            borderWidth: 2.2,
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
              callback: (v) => {
                const n = Number(v);
                return '$' + (n >= 1000 ? (n / 1000).toFixed(0) + 'k' : n);
              },
            },
          },
        },
      },
    }),
    [mLabels, stats.monthly]
  );

  const revenueComparisonConfig = useMemo<ChartConfiguration>(
    () => ({
      type: 'bar',
      data: {
        labels: mLabels,
        datasets: [
          { label: 'Revenue', data: stats.monthly.map((m) => m.revenue), backgroundColor: '#6D28D9', borderRadius: 5 },
          { label: 'Cost (COGS)', data: stats.monthly.map((m) => m.cost), backgroundColor: '#CBD5E1', borderRadius: 5 },
          { label: 'Profit', data: stats.monthly.map((m) => m.profit), backgroundColor: '#0F172A', borderRadius: 5 },
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
              callback: (v) => {
                const n = Number(v);
                return '$' + (n >= 1000 ? (n / 1000).toFixed(0) + 'k' : n);
              },
            },
          },
        },
      },
    }),
    [mLabels, stats.monthly]
  );

  const salesByCategoryConfig = useMemo<ChartConfiguration>(
    () => ({
      type: 'bar',
      data: {
        labels: stats.categories.map((c) => c.name),
        datasets: [
          { label: 'Revenue', data: stats.categories.map((c) => c.revenue), backgroundColor: '#6D28D9', borderRadius: 6 },
          { label: 'Profit', data: stats.categories.map((c) => c.profit), backgroundColor: '#0F172A', borderRadius: 6 },
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
              callback: (v) => {
                const n = Number(v);
                return '$' + (n >= 1000 ? (n / 1000).toFixed(0) + 'k' : n);
              },
            },
          },
        },
      },
    }),
    [stats.categories]
  );

  const salesByRegionConfig = useMemo<ChartConfiguration>(
    () => ({
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
              callback: (v) => {
                const n = Number(v);
                return '$' + (n >= 1000 ? (n / 1000).toFixed(0) + 'k' : n);
              },
            },
          },
          y: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 12 }, color: '#334155' } },
        },
      },
    }),
    [stats.regions]
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-900">Monthly Sales Line Chart</h3>
            <p className="text-xs text-slate-500 mt-0.5">Total monthly revenue and net profit over time</p>
          </div>
          <div className="relative h-[320px] w-full">
            <ChartCanvas config={salesLineConfig} ariaLabel="Monthly sales line chart" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-900">Revenue vs. Cost Comparison</h3>
            <p className="text-xs text-slate-500 mt-0.5">Monthly revenue, COGS, and profit margin comparison</p>
          </div>
          <div className="relative h-[320px] w-full">
            <ChartCanvas config={revenueComparisonConfig} ariaLabel="Revenue vs cost comparison bar chart" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-900">Sales &amp; Profit by Category</h3>
            <p className="text-xs text-slate-500 mt-0.5">Comparing category revenue against profit contribution</p>
          </div>
          <div className="relative h-[290px] w-full">
            <ChartCanvas config={salesByCategoryConfig} ariaLabel="Sales and profit by category chart" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-900">Sales by Region</h3>
            <p className="text-xs text-slate-500 mt-0.5">Geographic revenue distribution and regional strength</p>
          </div>
          <div className="relative h-[290px] w-full">
            <ChartCanvas config={salesByRegionConfig} ariaLabel="Sales by region horizontal bar chart" />
          </div>
        </div>
      </div>
    </div>
  );
}
