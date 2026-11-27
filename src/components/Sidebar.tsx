import { useState } from 'react';
import {
  BarChart3,
  Bot,
  Boxes,
  Building2,
  ClipboardCheck,
  FileSpreadsheet,
  LayoutDashboard,
  Loader2,
  LogOut,
  Package,
  ReceiptText,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import type { BusinessConfiguration, ShopProfile, ViewId } from '../types/bi';
import { getBusinessId, isViewEnabledByModules } from '../utils/businessConfig';

interface SidebarProps {
  activeView: ViewId;
  onSelectView: (view: ViewId) => void;
  shopProfile: ShopProfile;
  businesses: ShopProfile[];
  businessConfig: BusinessConfiguration | null;
  onSwitchBusiness: (businessId: string) => void;
  recordCount: number;
  expenseCount: number;
  customerCount: number;
  lowStockCount: number;
  openTaskCount?: number;
  isDemoData: boolean;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onResetSample: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

const NAV_ITEMS: Array<{
  id: ViewId;
  label: string;
  section: 'Analytics' | 'Operations & P&L' | 'Intelligence & Reports' | 'Workspace';
  icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: 'Executive Overview', section: 'Analytics', icon: LayoutDashboard },
  { id: 'sales', label: 'Sales Analytics', section: 'Analytics', icon: TrendingUp },
  { id: 'products', label: 'Product Analytics', section: 'Analytics', icon: Package },
  { id: 'ledger', label: 'Sales, Expenses & P&L', section: 'Operations & P&L', icon: ReceiptText },
  { id: 'customers', label: 'Customers & CRM', section: 'Operations & P&L', icon: Users },
  { id: 'inventory', label: 'Inventory & Alerts', section: 'Operations & P&L', icon: Boxes },
  { id: 'employees', label: 'Employees & Tasks', section: 'Operations & P&L', icon: ClipboardCheck },
  { id: 'insights', label: 'AI Assistant & Forecast', section: 'Intelligence & Reports', icon: Bot },
  { id: 'data', label: 'Reports & WhatsApp', section: 'Intelligence & Reports', icon: FileSpreadsheet },
  { id: 'setup', label: 'Business Setup & Modules', section: 'Workspace', icon: SlidersHorizontal },
];

export function Sidebar({
  activeView,
  onSelectView,
  shopProfile,
  businesses,
  businessConfig,
  onSwitchBusiness,
  recordCount,
  expenseCount,
  customerCount,
  lowStockCount,
  openTaskCount = 0,
  isDemoData,
  isOpenMobile,
  onCloseMobile,
  onResetSample,
  onSignOut,
}: SidebarProps) {
  const [confirmDemoReset, setConfirmDemoReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const activeBizId = getBusinessId(shopProfile);
  const enabledModules = businessConfig?.enabledModules;

  const visibleNavItems = NAV_ITEMS.filter((item) =>
    isViewEnabledByModules(item.id, enabledModules)
  );

  const analyticsItems = visibleNavItems.filter((i) => i.section === 'Analytics');
  const opsItems = visibleNavItems.filter((i) => i.section === 'Operations & P&L');
  const intelItems = visibleNavItems.filter((i) => i.section === 'Intelligence & Reports');
  const workspaceItems = visibleNavItems.filter((i) => i.section === 'Workspace');

  const handleConfirmDemo = async () => {
    setIsResetting(true);
    try {
      await onResetSample();
      setConfirmDemoReset(false);
    } finally {
      setIsResetting(false);
    }
  };

  const renderNavButton = (item: (typeof NAV_ITEMS)[number]) => {
    const Icon = item.icon;
    const isActive = activeView === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSelectView(item.id)}
        className={`flex items-center justify-between gap-2 w-full min-h-[40px] px-3.5 py-2 rounded-lg text-sm font-medium transition-colors text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
          isActive
            ? 'bg-violet-600 text-white font-semibold shadow-sm'
            : 'text-slate-300 hover:bg-white/5 hover:text-white'
        }`}
      >
        <span className="flex items-center gap-3 min-w-0">
          <Icon className="w-[18px] h-[18px] shrink-0 opacity-90" />
          <span className="truncate">{item.label}</span>
        </span>
        {item.id === 'inventory' && lowStockCount > 0 && (
          <span
            className={`text-[11px] font-mono-num font-semibold shrink-0 ${
              isActive ? 'text-amber-200' : 'text-amber-400'
            }`}
          >
            {lowStockCount} low
          </span>
        )}
        {item.id === 'employees' && openTaskCount > 0 && (
          <span
            className={`text-[11px] font-mono-num font-semibold shrink-0 ${
              isActive ? 'text-violet-100' : 'text-slate-400'
            }`}
          >
            {openTaskCount} open
          </span>
        )}
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
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap">
                SmartBiz AI
              </div>
              <div className="text-xs text-slate-400 whitespace-nowrap truncate">
                Multi-Industry Business SaaS
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

        {/* Active Business Switcher */}
        <div className="px-3.5 pt-3.5 pb-2 border-b border-slate-800/70">
          <div className="flex items-center justify-between px-1 pb-1.5">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3 h-3 text-violet-400" />
              Active Business
            </span>
            <button
              type="button"
              onClick={() => onSelectView('setup')}
              className="text-[11px] font-semibold text-violet-300 hover:text-violet-200"
            >
              + Manage
            </button>
          </div>
          {businesses.length > 1 ? (
            <div className="flex items-center gap-2">
              {shopProfile.logoUrl && (
                <img
                  src={shopProfile.logoUrl}
                  alt={shopProfile.shopName}
                  className="w-9 h-9 rounded-lg object-cover border border-slate-700 bg-white shrink-0"
                />
              )}
              <select
                aria-label="Switch active business workspace"
                value={activeBizId}
                onChange={(e) => onSwitchBusiness(e.target.value)}
                className="w-full min-w-0 min-h-[36px] px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {businesses.map((biz) => {
                  const id = getBusinessId(biz);
                  return (
                    <option key={id} value={id}>
                      {biz.shopName} ({biz.category || biz.businessType})
                    </option>
                  );
                })}
              </select>
            </div>
          ) : (
            <div className="px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800/90 flex items-center gap-2.5">
              {shopProfile.logoUrl && (
                <img
                  src={shopProfile.logoUrl}
                  alt={shopProfile.shopName}
                  className="w-8 h-8 rounded-lg object-cover border border-slate-700 bg-white shrink-0"
                />
              )}
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{shopProfile.shopName}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  {businessConfig?.category || shopProfile.category || shopProfile.businessType}
                </div>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3.5 py-4 overflow-y-auto space-y-5" aria-label="Main navigation">
          {analyticsItems.length > 0 && (
            <div>
              <div className="px-3 pb-1.5 text-xs font-medium text-slate-400">Analytics</div>
              <div className="space-y-1">{analyticsItems.map(renderNavButton)}</div>
            </div>
          )}

          {opsItems.length > 0 && (
            <div>
              <div className="px-3 pb-1.5 text-xs font-medium text-slate-400">Operations &amp; P&amp;L</div>
              <div className="space-y-1">{opsItems.map(renderNavButton)}</div>
            </div>
          )}

          {intelItems.length > 0 && (
            <div>
              <div className="px-3 pb-1.5 text-xs font-medium text-slate-400">Intelligence &amp; Reports</div>
              <div className="space-y-1">{intelItems.map(renderNavButton)}</div>
            </div>
          )}

          {workspaceItems.length > 0 && (
            <div>
              <div className="px-3 pb-1.5 text-xs font-medium text-slate-400">Configuration</div>
              <div className="space-y-1">{workspaceItems.map(renderNavButton)}</div>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 space-y-3">
          <div className="px-1 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-white truncate" title={shopProfile.shopName}>
                {shopProfile.shopName}
              </div>
              {isDemoData && (
                <span className="text-[10px] font-semibold text-amber-300 shrink-0">Demo Data</span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 truncate" title={shopProfile.ownerEmail}>
              {shopProfile.city} · {shopProfile.ownerEmail}
            </div>
            <div className="text-[11px] text-slate-400 pt-0.5 tabular-nums">
              {recordCount} sales · {expenseCount} exp · {customerCount} cust
            </div>
          </div>

          {confirmDemoReset ? (
            <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 space-y-2">
              <div className="text-[11px] text-amber-200 leading-snug">
                Overwrite active business records with Indian SMB demo data?
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => void handleConfirmDemo()}
                  className="flex-1 min-h-[32px] px-2 rounded bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white inline-flex items-center justify-center gap-1"
                >
                  {isResetting && <Loader2 className="w-3 h-3 animate-spin" />}
                  Confirm
                </button>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => setConfirmDemoReset(false)}
                  className="flex-1 min-h-[32px] px-2 rounded border border-slate-600 text-xs font-medium text-slate-200 hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDemoReset(true)}
              className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Load Demo Data
            </button>
          )}

          <button
            type="button"
            onClick={() => void onSignOut()}
            className="w-full min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
