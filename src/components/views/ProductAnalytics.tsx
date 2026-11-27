import { useMemo, useState } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { ArrowUpDown } from 'lucide-react';
import type { AnalyticsSummary, CurrencyCode, ProductMetric } from '../../types/bi';
import { fmtCurrency, fmtNumber, fmtShortAxisCurrency } from '../../utils/analytics';
import { ChartCanvas } from '../ChartCanvas';

interface ProductAnalyticsProps {
  currency: CurrencyCode;
  stats: AnalyticsSummary;
}

type SortKey = 'name' | 'orders' | 'units' | 'revenue' | 'cost' | 'profit' | 'margin';

export function ProductAnalytics({ currency, stats }: ProductAnalyticsProps) {
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortAsc, setSortAsc] = useState(false);

  const top5 = stats.products.slice(0, 5);
  const low4 = useMemo(
    () => [...stats.products].reverse().slice(0, Math.min(4, stats.products.length)),
    [stats.products]
  );

  const sortedMatrix = useMemo<ProductMetric[]>(() => {
    const copy = [...stats.products];
    copy.sort((a, b) => {
      if (sortKey === 'name') {
        return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      return sortAsc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey];
    });
    return copy;
  }, [stats.products, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'name');
    }
  };

  const productRevenueConfig = useMemo<ChartConfiguration>(
    () => ({
      type: 'bar',
      data: {
        labels: stats.products.map((p) => p.name),
        datasets: [
          {
            label: 'Revenue',
            data: stats.products.map((p) => p.revenue),
            backgroundColor: '#6D28D9',
            borderRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 11,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => `Revenue: ${fmtCurrency(Number(ctx.parsed.x ?? 0), currency)}`,
            },
          },
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
          y: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 }, color: '#334155' } },
        },
      },
    }),
    [stats.products, currency]
  );

  const productProfitConfig = useMemo<ChartConfiguration>(() => {
    const profSorted = [...stats.products].sort((a, b) => b.profit - a.profit);
    return {
      type: 'bar',
      data: {
        labels: profSorted.map((p) => p.name),
        datasets: [
          {
            label: 'Gross Profit',
            data: profSorted.map((p) => p.profit),
            backgroundColor: profSorted.map((p) => (p.profit >= 0 ? '#0F172A' : '#DC2626')),
            borderRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 11,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => `Profit: ${fmtCurrency(Number(ctx.parsed.x ?? 0), currency)}`,
            },
          },
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
          y: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 }, color: '#334155' } },
        },
      },
    };
  }, [stats.products, currency]);

  const renderRankList = (list: ProductMetric[], isLow: boolean) => {
    if (list.length === 0) {
      return <p className="text-sm text-slate-500 py-4">No products to display.</p>;
    }
    return (
      <div className="divide-y divide-slate-100">
        {list.map((p, idx) => (
          <div key={p.name} className="py-3.5 first:pt-4 last:pb-0 flex items-center gap-3.5">
            <div
              className={`w-7 h-7 rounded-md text-white text-xs font-bold flex items-center justify-center shrink-0 tabular-nums ${
                isLow ? 'bg-rose-600' : 'bg-violet-700'
              }`}
            >
              {idx + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900 truncate">{p.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {p.category} · {fmtNumber(p.units, currency)} units · {p.margin.toFixed(1)}% margin
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono-num text-sm font-bold text-slate-900">{fmtCurrency(p.revenue, currency)}</div>
              <div className="font-mono-num text-xs text-slate-500 mt-0.5">
                Profit {fmtCurrency(p.profit, currency)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Top 5 & Low Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Top 5 Best-Selling Products</h3>
              <p className="text-xs text-slate-500 mt-0.5">Ranked by total revenue generated</p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 whitespace-nowrap">Top 5</span>
          </div>
          {renderRankList(top5, false)}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Lowest-Performing Products</h3>
              <p className="text-xs text-slate-500 mt-0.5">Products needing pricing, bundling, or marketing focus</p>
            </div>
            <span className="text-xs font-semibold text-rose-700 whitespace-nowrap">Needs Attention</span>
          </div>
          {renderRankList(low4, true)}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-900">Product-Wise Revenue</h3>
            <p className="text-xs text-slate-500 mt-0.5">Gross revenue across all active SKUs</p>
          </div>
          <div className="relative h-[340px] w-full">
            <ChartCanvas config={productRevenueConfig} ariaLabel="Product-wise revenue horizontal bar chart" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-900">Product-Wise Gross Profit</h3>
            <p className="text-xs text-slate-500 mt-0.5">Gross profit generated per SKU</p>
          </div>
          <div className="relative h-[340px] w-full">
            <ChartCanvas config={productProfitConfig} ariaLabel="Product-wise profit horizontal bar chart" />
          </div>
        </div>
      </div>

      {/* Product Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900">Complete Product Performance Matrix</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Click column headers to sort by orders, units sold, revenue, cost, profit, or margin
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="text-left py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('name')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 focus-visible:outline-none focus-visible:underline"
                  >
                    Product <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left py-3 px-4 whitespace-nowrap">Category</th>
                <th className="text-right py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('orders')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 focus-visible:outline-none focus-visible:underline"
                  >
                    Orders <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-right py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('units')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 focus-visible:outline-none focus-visible:underline"
                  >
                    Units Sold <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-right py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('revenue')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 focus-visible:outline-none focus-visible:underline"
                  >
                    Revenue <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-right py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('cost')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 focus-visible:outline-none focus-visible:underline"
                  >
                    Cost <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-right py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('profit')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 focus-visible:outline-none focus-visible:underline"
                  >
                    Profit <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-right py-3 px-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleSort('margin')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 focus-visible:outline-none focus-visible:underline"
                  >
                    Margin <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedMatrix.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    No products match the active filter selection.
                  </td>
                </tr>
              ) : (
                sortedMatrix.map((p) => (
                  <tr key={p.name} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">{p.name}</td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{p.category}</td>
                    <td className="py-3 px-4 text-right font-mono-num text-slate-700 whitespace-nowrap">
                      {fmtNumber(p.orders, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-slate-700 whitespace-nowrap">
                      {fmtNumber(p.units, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                      {fmtCurrency(p.revenue, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-slate-600 whitespace-nowrap">
                      {fmtCurrency(p.cost, currency)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono-num font-semibold whitespace-nowrap ${
                        p.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {fmtCurrency(p.profit, currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-num text-slate-700 whitespace-nowrap">
                      {p.margin.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
