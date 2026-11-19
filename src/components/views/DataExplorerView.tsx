import { useMemo, useRef, useState, type DragEvent } from 'react';
import { AlertCircle, ArrowUpDown, Download, FileSpreadsheet, Search, Upload } from 'lucide-react';
import type { SalesRecord } from '../../types/bi';
import { fmtCurrency, fmtNumber } from '../../utils/analytics';

interface DataExplorerViewProps {
  filteredDataset: SalesRecord[];
  onUploadFile: (file: File) => void;
  onDownloadTemplate: () => void;
  onExportFiltered: () => void;
  uploadError: string | null;
  onClearError: () => void;
}

type TableSortKey = 'Date' | 'Product' | 'Category' | 'Region' | 'Quantity' | 'Revenue' | 'Cost' | 'Profit';

export function DataExplorerView({
  filteredDataset,
  onUploadFile,
  onDownloadTemplate,
  onExportFiltered,
  uploadError,
  onClearError,
}: DataExplorerViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [sortKey, setSortKey] = useState<TableSortKey>('Date');
  const [sortAsc, setSortAsc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const visibleRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const matched = filteredDataset.filter((r) => {
      if (!q) return true;
      return (
        r.Product.toLowerCase().includes(q) ||
        r.Category.toLowerCase().includes(q) ||
        r.Region.toLowerCase().includes(q) ||
        r.Date.includes(q)
      );
    });

    const sorted = [...matched].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortAsc ? va - vb : vb - va;
      }
      return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });

    return sorted.slice(0, 300);
  }, [filteredDataset, searchQuery, sortKey, sortAsc]);

  const handleSort = (key: TableSortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'Product' || key === 'Category' || key === 'Region');
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files[0]) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-5">
      {/* CSV Upload Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Upload Custom Sales Dataset (CSV)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Columns: Date, Product, Category, Quantity, Revenue, Cost, Profit, Region (Profit is auto-calculated if omitted)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onDownloadTemplate}
              className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors inline-flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-600" />
              Download Sample CSV
            </button>
            <button
              type="button"
              onClick={onExportFiltered}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white transition-colors inline-flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Download className="w-4 h-4" />
              Export Filtered Rows CSV
            </button>
          </div>
        </div>

        {uploadError && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{uploadError}</span>
            </div>
            <button
              type="button"
              onClick={onClearError}
              className="font-semibold underline hover:text-rose-950 whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        )}

        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl py-9 px-6 text-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            isDragOver
              ? 'border-violet-600 bg-violet-50/70'
              : 'border-slate-300 bg-slate-50/70 hover:border-violet-500 hover:bg-violet-50/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadFile(file);
              e.target.value = '';
            }}
          />
          <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center mx-auto mb-3">
            <Upload className="w-5 h-5" />
          </div>
          <div className="text-sm font-bold text-slate-900">
            Drop your CSV file here or click to browse
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Supports UTF-8 CSV files. Dashboard metrics, charts, and AI insights recalculate immediately.
          </p>
        </div>
      </div>

      {/* Transaction Explorer Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Transaction Explorer</h3>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              Showing {fmtNumber(visibleRows.length)} of {fmtNumber(filteredDataset.length)} filtered records
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product, category, region..."
              aria-label="Search transactions"
              className="w-full min-h-[40px] pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
              <tr className="text-xs font-semibold text-slate-500">
                {(
                  [
                    ['Date', 'Date', 'left'],
                    ['Product', 'Product', 'left'],
                    ['Category', 'Category', 'left'],
                    ['Region', 'Region', 'left'],
                    ['Quantity', 'Qty', 'right'],
                    ['Revenue', 'Revenue', 'right'],
                    ['Cost', 'Cost', 'right'],
                    ['Profit', 'Profit', 'right'],
                  ] as Array<[TableSortKey, string, 'left' | 'right']>
                ).map(([key, label, align]) => (
                  <th
                    key={key}
                    className={`py-3 px-4 whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(key)}
                      className="inline-flex items-center gap-1 hover:text-slate-900 focus-visible:outline-none focus-visible:underline"
                    >
                      {label}
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500 text-sm">
                    No matching transactions found. Try clearing your search or adjusting the date/category filters.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, i) => (
                  <tr key={`${row.Date}-${row.Product}-${row.Region}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono-num text-xs text-slate-600 whitespace-nowrap">
                      {row.Date}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">{row.Product}</td>
                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">{row.Category}</td>
                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">{row.Region}</td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-slate-700 whitespace-nowrap">
                      {fmtNumber(row.Quantity)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                      {fmtCurrency(row.Revenue)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono-num text-slate-600 whitespace-nowrap">
                      {fmtCurrency(row.Cost)}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono-num font-semibold whitespace-nowrap ${
                        row.Profit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {fmtCurrency(row.Profit)}
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
