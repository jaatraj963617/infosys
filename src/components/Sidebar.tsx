import { BarChart3, LayoutDashboard, Package, RotateCcw, Sparkles, TrendingUp, Upload, X } from 'lucide-react';
import type { ViewId } from '../types/bi';

interface SidebarProps {
  activeView: ViewId;
  onSelectView: (view: ViewId) => void;
  datasetLabel: string;
  recordCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onResetSample: () => void;
}

const NAV_ITEMS: Array<{
  id: ViewId;
  label: string;
  section: 'Analytics' | 'Intelligence & Data';
  icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: 'Executive Overview', section: 'Analytics', icon: LayoutDashboard },
  { id: 'sales', label: 'Sales Analytics', section: 'Analytics', icon: TrendingUp },
  { id: 'products', label: 'Product Analytics', section: 'Analytics', icon: Package },
  { id: 'insights', label: 'AI Insights & Strategy', section: 'Intelligence & Data', icon: Sparkles },
  { id: 'data', label: 'CSV Upload & Data', section: 'Intelligence & Data', icon: Upload },
];

export function Sidebar({
  activeView,
  onSelectView,
  datasetLabel,
  recordCount,
  isOpenMobile,
  onCloseMobile,
  onResetSample,
}: SidebarProps) {
  const analyticsItems = NAV_ITEMS.filter((i) => i.section === 'Analytics');
  const dataItems = NAV_ITEMS.filter((i) => i.section === 'Intelligence & Data');

  const renderNavButton = (item: (typeof NAV_ITEMS)[number]) => {
    const Icon = item.icon;
    const isActive = activeView === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSelectView(item.id)}
        className={`flex items-center gap-3 w-full min-h-[42px] px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
          isActive
            ? 'bg-violet-600 text-white font-semibold shadow-sm'
            : 'text-slate-300 hover:bg-white/5 hover:text-white'
        }`}
      >
        <Icon className="w-[18px] h-[18px] shrink-0 opacity-90" />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <>
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-40 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-[268px] bg-slate-950 text-white border-r border-slate-800/80 flex flex-col z-50 transition-transform duration-200 ease-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5 border-b border-slate-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap">
                SmartBiz AI
              </div>
              <div className="text-xs text-slate-400 whitespace-nowrap truncate">
                Business Intelligence
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3.5 py-5 overflow-y-auto space-y-6" aria-label="Main navigation">
          <div>
            <div className="px-3 pb-2 text-xs font-medium text-slate-400">Analytics</div>
            <div className="space-y-1">{analyticsItems.map(renderNavButton)}</div>
          </div>

          <div>
            <div className="px-3 pb-2 text-xs font-medium text-slate-400">Intelligence &amp; Data</div>
            <div className="space-y-1">{dataItems.map(renderNavButton)}</div>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 space-y-3">
          <div className="px-1">
            <div className="text-xs font-semibold text-white truncate" title={datasetLabel}>
              {datasetLabel}
            </div>
            <div className="text-xs text-slate-400 mt-0.5 tabular-nums">
              {recordCount} records loaded
            </div>
          </div>
          <button
            type="button"
            onClick={onResetSample}
            className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore Demo Dataset
          </button>
        </div>
      </aside>
    </>
  );
}
