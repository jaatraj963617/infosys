import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertCircle,
  Check,
  Download,
  GitCompareArrows,
  Info,
  Loader2,
  Menu,
  Plus,
  Trash2,
  Upload,
  WifiOff,
} from 'lucide-react';
import {
  auth,
  formatFriendlyFirestoreError,
  onAuthStateChanged,
  refreshCurrentUser,
  signOutShopOwner,
  testFirestoreConnection,
} from './firebase';
import { AuthGate } from './components/AuthGate';
import { Sidebar } from './components/Sidebar';
import { ExecutiveOverview } from './components/views/ExecutiveOverview';
import { SalesAnalytics } from './components/views/SalesAnalytics';
import { ProductAnalytics } from './components/views/ProductAnalytics';
import { LedgerAndPnLView } from './components/views/LedgerAndPnLView';
import { CustomersView } from './components/views/CustomersView';
import { InventoryView } from './components/views/InventoryView';
import { AiInsightsView } from './components/views/AiInsightsView';
import { DataExplorerView } from './components/views/DataExplorerView';
import { BusinessSetupView } from './components/views/BusinessSetupView';
import { EmployeesAndTasksView } from './components/views/EmployeesAndTasksView';
import type {
  BusinessCategory,
  BusinessConfiguration,
  BusinessModuleId,
  BusinessSize,
  CurrencyCode,
  CustomerRecord,
  EmployeeRecord,
  ExpenseRecord,
  InventoryItem,
  SalesRecord,
  ShopBackupLog,
  ShopProfile,
  TaskRecord,
  ViewId,
} from './types/bi';
import {
  computeAnalytics,
  computeComparison,
  computeProfitAndLoss,
  downloadSampleTemplateCsv,
  exportAnalyticsReportCsv,
  exportComparisonAnalyticsReportCsv,
  exportFilteredRawCsv,
  fmtNumber,
  generateIntelligence,
  getSuggestedComparisonRanges,
  isDemoDataset,
  parseCsvDataset,
  setActiveCurrency,
} from './utils/analytics';
import {
  getBusinessId,
  getCurrencyMeta,
  isViewEnabledByModules,
  normalizeCurrencyCode,
} from './utils/businessConfig';
import {
  addShopCustomer,
  addShopEmployee,
  addShopExpense,
  addShopInventoryItem,
  addShopSale,
  addShopTask,
  clearAllShopData,
  createAndRecordBackup,
  createBusinessWorkspace,
  deleteShopCustomer,
  deleteShopEmployee,
  deleteShopExpense,
  deleteShopInventoryItem,
  deleteShopSale,
  deleteShopTask,
  fetchBusinessConfig,
  fetchUserBusinesses,
  importShopSalesBatch,
  saveBusinessConfig,
  seedShopDemoData,
  subscribeShopData,
  updateShopCustomer,
  updateShopEmployee,
  updateShopInventoryItem,
  updateShopProfile,
  updateShopTask,
  verifyAndRestoreBackup,
} from './utils/shopService';

const VIEW_META: Record<ViewId, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Executive Overview',
    subtitle: 'Real-time INR KPIs, Profit & Loss summary, revenue trajectory, and stock alerts',
  },
  sales: {
    title: 'Sales Analytics',
    subtitle: 'Monthly revenue, COGS, operating expenses, net profit, and regional splits',
  },
  products: {
    title: 'Product Analytics',
    subtitle: 'Top best-sellers, underperforming SKUs, and margin breakdowns',
  },
  ledger: {
    title: 'Sales, Expenses & P&L',
    subtitle: 'Record daily sales & expenses with live automatic Profit & Loss calculations',
  },
  customers: {
    title: 'Customers & CRM',
    subtitle: 'Manage customer directory, repeat buyer retention, segment revenue & WhatsApp outreach',
  },
  inventory: {
    title: 'Inventory & Smart Alerts',
    subtitle: 'Daily sales velocity, stockout predictions, AI restock planning & low-stock alerts',
  },
  employees: {
    title: 'Employees & Tasks',
    subtitle: 'Team directory, monthly payroll, and task status tracking (Pending, In Progress, Completed)',
  },
  insights: {
    title: 'AI Assistant & Sales Forecast',
    subtitle: 'Hindi & English Gemini AI advisor, 3–6 month INR sales forecasting, and CFO strategy',
  },
  data: {
    title: 'Reports, WhatsApp & CSV Data',
    subtitle: 'Monthly & Yearly PDF/CSV reports, Daily WhatsApp digest, CSV sync, and SHA-256 backups',
  },
  setup: {
    title: 'Business Setup & Modules',
    subtitle: 'Business profile, industry category recommendations, module toggles, and multi-business workspaces',
  },
};

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [businesses, setBusinesses] = useState<ShopProfile[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string>('');
  const [businessConfig, setBusinessConfig] = useState<BusinessConfiguration | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const shopProfile = useMemo(() => {
    if (businesses.length === 0) return null;
    return businesses.find((b) => getBusinessId(b) === activeBusinessId) || businesses[0];
  }, [businesses, activeBusinessId]);

  const resolvedBusinessId = shopProfile ? getBusinessId(shopProfile) : '';
  const configCurrency: CurrencyCode = normalizeCurrencyCode(
    businessConfig?.currency ?? shopProfile?.currency,
    'INR'
  );
  const [activeCurrency, setActiveCurrencyState] = useState<CurrencyCode>(configCurrency);
  const currencyMeta = useMemo(() => getCurrencyMeta(activeCurrency), [activeCurrency]);
  setActiveCurrency(activeCurrency);

  useEffect(() => {
    setActiveCurrencyState(configCurrency);
    setActiveCurrency(configCurrency);
  }, [configCurrency]);

  const [rawDataset, setRawDataset] = useState<SalesRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [backups, setBackups] = useState<ShopBackupLog[]>([]);
  const [confirmClearDemo, setConfirmClearDemo] = useState(false);
  const [isClearingDemo, setIsClearingDemo] = useState(false);

  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCompareEnabled, setIsCompareEnabled] = useState(false);
  const [compareStartDate, setCompareStartDate] = useState('');
  const [compareEndDate, setCompareEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedRegion, setSelectedRegion] = useState('ALL');

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const quickUploadInputRef = useRef<HTMLInputElement | null>(null);
  const hasInitializedBoundsRef = useRef(false);

  const [snapshotsReady, setSnapshotsReady] = useState({ sales: false, expenses: false });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 3600);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const selectPreferredBusiness = (uid: string, list: ShopProfile[]) => {
    if (list.length === 0) {
      setActiveBusinessId('');
      return;
    }
    let savedId = '';
    try {
      savedId = window.localStorage.getItem(`smartbiz_active_biz_${uid}`) || '';
    } catch {
      savedId = '';
    }
    const matched = list.find((b) => getBusinessId(b) === savedId);
    setActiveBusinessId(getBusinessId(matched || list[0]));
  };

  // Initial Firestore connectivity probe & Auth listener
  useEffect(() => {
    void testFirestoreConnection().then((res) => {
      if (res.offline) setIsOffline(true);
    });

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setGlobalError(null);
      if (!u) {
        setBusinesses([]);
        setActiveBusinessId('');
        setBusinessConfig(null);
        setRawDataset([]);
        setExpenses([]);
        setInventory([]);
        setCustomers([]);
        setEmployees([]);
        setTasks([]);
        setBackups([]);
        setSnapshotsReady({ sales: false, expenses: false });
        hasInitializedBoundsRef.current = false;
        setStartDate('');
        setEndDate('');
        setAuthReady(true);
        setProfileLoading(false);
        return;
      }

      if (!u.emailVerified) {
        setBusinesses([]);
        setActiveBusinessId('');
        setBusinessConfig(null);
        setAuthReady(true);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);
      try {
        const list = await fetchUserBusinesses(u.uid);
        setBusinesses(list);
        selectPreferredBusiness(u.uid, list);
      } catch (err) {
        setGlobalError(formatFriendlyFirestoreError(err));
      } finally {
        setProfileLoading(false);
        setAuthReady(true);
      }
    });

    return () => unsubAuth();
  }, []);

  // Load separate BusinessConfiguration & subscribe to private Firestore collections for the active business
  useEffect(() => {
    if (!user || !user.emailVerified || !shopProfile || !resolvedBusinessId) return;

    let cancelled = false;
    setSnapshotsReady({ sales: false, expenses: false });
    hasInitializedBoundsRef.current = false;
    setRawDataset([]);
    setExpenses([]);
    setInventory([]);
    setCustomers([]);
    setEmployees([]);
    setTasks([]);
    setBackups([]);
    setStartDate('');
    setEndDate('');
    setSelectedCategory('ALL');
    setSelectedRegion('ALL');
    setIsCompareEnabled(false);

    void fetchBusinessConfig(user.uid, resolvedBusinessId, shopProfile)
      .then((cfg) => {
        if (!cancelled) setBusinessConfig(cfg);
      })
      .catch((err) => {
        if (!cancelled) setGlobalError(formatFriendlyFirestoreError(err));
      });

    const unsub = subscribeShopData(
      user.uid,
      resolvedBusinessId,
      {
        onSales: (salesRows) => {
          setRawDataset(salesRows);
          setSnapshotsReady((prev) => (prev.sales ? prev : { ...prev, sales: true }));
        },
        onExpenses: (expRows) => {
          setExpenses(expRows);
          setSnapshotsReady((prev) => (prev.expenses ? prev : { ...prev, expenses: true }));
        },
        onInventory: (invRows) => setInventory(invRows),
        onCustomers: (custRows) => setCustomers(custRows),
        onEmployees: (empRows) => setEmployees(empRows),
        onTasks: (taskRows) => setTasks(taskRows),
        onBackups: (bkpRows) => setBackups(bkpRows),
      },
      (err) => {
        setGlobalError(formatFriendlyFirestoreError(err));
      }
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [user, resolvedBusinessId]);

  useEffect(() => {
    if (businessConfig && !isViewEnabledByModules(activeView, businessConfig.enabledModules)) {
      setActiveView('dashboard');
    }
  }, [businessConfig, activeView]);

  const datasetBounds = useMemo(() => {
    const dates = [...rawDataset.map((r) => r.Date), ...expenses.map((e) => e.Date)]
      .filter(Boolean)
      .sort();
    return { min: dates[0] || '', max: dates[dates.length - 1] || '' };
  }, [rawDataset, expenses]);

  // Initialize combined date filter bounds once both sales and expenses snapshots arrive
  useEffect(() => {
    if (!hasInitializedBoundsRef.current && snapshotsReady.sales && snapshotsReady.expenses) {
      if (datasetBounds.min || datasetBounds.max) {
        setStartDate(datasetBounds.min);
        setEndDate(datasetBounds.max);
      }
      hasInitializedBoundsRef.current = true;
    }
  }, [snapshotsReady, datasetBounds]);

  const categories = useMemo(
    () => [...new Set(rawDataset.map((r) => r.Category))].sort(),
    [rawDataset]
  );

  const regions = useMemo(
    () => [...new Set(rawDataset.map((r) => r.Region))].sort(),
    [rawDataset]
  );

  const filteredDataset = useMemo(() => {
    return rawDataset.filter((row) => {
      if (startDate && row.Date < startDate) return false;
      if (endDate && row.Date > endDate) return false;
      if (selectedCategory !== 'ALL' && row.Category !== selectedCategory) return false;
      if (selectedRegion !== 'ALL' && row.Region !== selectedRegion) return false;
      return true;
    });
  }, [rawDataset, startDate, endDate, selectedCategory, selectedRegion]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (startDate && exp.Date < startDate) return false;
      if (endDate && exp.Date > endDate) return false;
      return true;
    });
  }, [expenses, startDate, endDate]);

  const compareDataset = useMemo(() => {
    if (!isCompareEnabled) return [];
    return rawDataset.filter((row) => {
      if (compareStartDate && row.Date < compareStartDate) return false;
      if (compareEndDate && row.Date > compareEndDate) return false;
      if (selectedCategory !== 'ALL' && row.Category !== selectedCategory) return false;
      if (selectedRegion !== 'ALL' && row.Region !== selectedRegion) return false;
      return true;
    });
  }, [rawDataset, isCompareEnabled, compareStartDate, compareEndDate, selectedCategory, selectedRegion]);

  const compareExpenses = useMemo(() => {
    if (!isCompareEnabled) return [];
    return expenses.filter((exp) => {
      if (compareStartDate && exp.Date < compareStartDate) return false;
      if (compareEndDate && exp.Date > compareEndDate) return false;
      return true;
    });
  }, [expenses, isCompareEnabled, compareStartDate, compareEndDate]);

  const stats = useMemo(
    () => computeAnalytics(filteredDataset, filteredExpenses, activeCurrency),
    [filteredDataset, filteredExpenses, activeCurrency]
  );
  const pnl = useMemo(
    () => computeProfitAndLoss(filteredDataset, filteredExpenses, activeCurrency),
    [filteredDataset, filteredExpenses, activeCurrency]
  );
  const compareStats = useMemo(
    () => (isCompareEnabled ? computeAnalytics(compareDataset, compareExpenses, activeCurrency) : null),
    [isCompareEnabled, compareDataset, compareExpenses, activeCurrency]
  );
  const comparePnl = useMemo(
    () => (isCompareEnabled ? computeProfitAndLoss(compareDataset, compareExpenses, activeCurrency) : undefined),
    [isCompareEnabled, compareDataset, compareExpenses, activeCurrency]
  );
  const comparison = useMemo(() => {
    if (!isCompareEnabled || !compareStats) return null;
    const primaryLabel = `${startDate || 'Start'} to ${endDate || 'End'}`;
    const compareLabel = `${compareStartDate || 'Start'} to ${compareEndDate || 'End'}`;
    return computeComparison(stats, compareStats, primaryLabel, compareLabel, pnl, comparePnl, activeCurrency);
  }, [
    isCompareEnabled,
    compareStats,
    stats,
    pnl,
    comparePnl,
    startDate,
    endDate,
    compareStartDate,
    compareEndDate,
    activeCurrency,
  ]);

  const intel = useMemo(
    () => generateIntelligence(stats, pnl, inventory, activeCurrency),
    [stats, pnl, inventory, activeCurrency]
  );

  const lowStockCount = useMemo(
    () => inventory.filter((i) => i.stock <= i.reorderLevel).length,
    [inventory]
  );

  const openTaskCount = useMemo(
    () => tasks.filter((t) => t.status !== 'Completed').length,
    [tasks]
  );

  const isDemoData = useMemo(() => isDemoDataset(rawDataset), [rawDataset]);

  const resetFiltersForData = (salesData: SalesRecord[], expenseData: ExpenseRecord[]) => {
    const dates = [...salesData.map((r) => r.Date), ...expenseData.map((e) => e.Date)]
      .filter(Boolean)
      .sort();
    const min = dates[0] || '';
    const max = dates[dates.length - 1] || '';
    setStartDate(min);
    setEndDate(max);
    setIsCompareEnabled(false);
    setCompareStartDate('');
    setCompareEndDate('');
    setSelectedCategory('ALL');
    setSelectedRegion('ALL');
  };

  const handleToggleCompare = () => {
    if (isCompareEnabled) {
      setIsCompareEnabled(false);
      return;
    }
    const suggested = getSuggestedComparisonRanges(
      startDate,
      endDate,
      datasetBounds.min,
      datasetBounds.max
    );
    setStartDate(suggested.primaryStart);
    setEndDate(suggested.primaryEnd);
    setCompareStartDate(suggested.compareStart);
    setCompareEndDate(suggested.compareEnd);
    setIsCompareEnabled(true);
  };

  const handleMatchPriorSpan = () => {
    const suggested = getSuggestedComparisonRanges(
      startDate,
      endDate,
      datasetBounds.min,
      datasetBounds.max
    );
    setCompareStartDate(suggested.compareStart);
    setCompareEndDate(suggested.compareEnd);
  };

  const handleResetFilters = () => {
    resetFiltersForData(rawDataset, expenses);
  };

  const handleResetSample = async () => {
    if (!user || !resolvedBusinessId) return;
    setGlobalError(null);
    try {
      setSnapshotsReady({ sales: false, expenses: false });
      hasInitializedBoundsRef.current = false;
      const counts = await seedShopDemoData(user.uid, resolvedBusinessId, true);
      setUploadError(null);
      setIsCompareEnabled(false);
      setSelectedCategory('ALL');
      setSelectedRegion('ALL');
      showToast(
        `Loaded Indian SMB demo (${counts.sales} sales, ${counts.expenses} expenses, ${counts.inventory} SKUs, ${counts.customers} customers)`
      );
    } catch (err) {
      setGlobalError(formatFriendlyFirestoreError(err));
    }
  };

  const handleClearDemoData = async () => {
    if (!user || !resolvedBusinessId) return;
    setIsClearingDemo(true);
    setGlobalError(null);
    try {
      await clearAllShopData(user.uid, resolvedBusinessId);
      setConfirmClearDemo(false);
      setStartDate('');
      setEndDate('');
      setIsCompareEnabled(false);
      setSelectedCategory('ALL');
      setSelectedRegion('ALL');
      showToast('Demo data cleared. You can now add live sales or upload your shop CSV.');
    } catch (err) {
      setGlobalError(formatFriendlyFirestoreError(err));
    } finally {
      setIsClearingDemo(false);
    }
  };

  const handleUploadFile = async (file: File, mode: 'append' | 'replace' = 'append') => {
    if (!user || !resolvedBusinessId) return;
    try {
      const text = await file.text();
      const parsed = parseCsvDataset(
        text,
        activeCurrency,
        businessConfig?.country || shopProfile?.country || 'India'
      );
      const count = await importShopSalesBatch(user.uid, resolvedBusinessId, parsed, mode);
      setUploadError(null);
      const dates = parsed.map((p) => p.Date).sort();
      if (mode === 'replace') {
        setStartDate(dates[0] || '');
        setEndDate(dates[dates.length - 1] || '');
        setSelectedCategory('ALL');
        setSelectedRegion('ALL');
      } else {
        if (dates[0] && (!startDate || dates[0] < startDate)) setStartDate(dates[0]);
        if (dates[dates.length - 1] && (!endDate || dates[dates.length - 1] > endDate)) {
          setEndDate(dates[dates.length - 1]);
        }
      }
      setActiveView('dashboard');
      showToast(`${mode === 'replace' ? 'Replaced with' : 'Imported'} ${count} sales rows from ${file.name}`);
    } catch (err) {
      const message = err instanceof Error ? formatFriendlyFirestoreError(err) : 'Unable to parse CSV file.';
      setUploadError(message);
      setActiveView('data');
    }
  };

  const handleSelectView = (view: ViewId) => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
  };

  // Firestore Ledger handlers
  const handleAddSale = async (sale: Omit<SalesRecord, 'id'>, matchedSkuId?: string) => {
    if (!user || !resolvedBusinessId) return;
    await addShopSale(user.uid, resolvedBusinessId, sale);

    if (sale.Date && (!startDate || sale.Date < startDate)) setStartDate(sale.Date);
    if (sale.Date && (!endDate || sale.Date > endDate)) setEndDate(sale.Date);

    if (matchedSkuId) {
      const skuItem = inventory.find((item) => item.id === matchedSkuId);
      if (skuItem) {
        const nextStock = Math.max(0, skuItem.stock - sale.Quantity);
        await updateShopInventoryItem(resolvedBusinessId, matchedSkuId, { stock: nextStock });
        if (nextStock <= skuItem.reorderLevel) {
          showToast(
            `Sale saved · Low stock alert: ${skuItem.name} now at ${nextStock} units (reorder at ${skuItem.reorderLevel})`
          );
          return;
        }
      }
    }
    showToast(`Saved sale for ${sale.Product}`);
  };

  const handleDeleteSale = async (id: string) => {
    if (!user || !resolvedBusinessId) return;
    await deleteShopSale(resolvedBusinessId, id);
    showToast('Sale entry deleted');
  };

  const handleAddExpense = async (expense: Omit<ExpenseRecord, 'id'>) => {
    if (!user || !resolvedBusinessId) return;
    await addShopExpense(user.uid, resolvedBusinessId, expense);
    if (expense.Date && (!startDate || expense.Date < startDate)) setStartDate(expense.Date);
    if (expense.Date && (!endDate || expense.Date > endDate)) setEndDate(expense.Date);
    showToast(`Saved expense: ${expense.Title}`);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!user || !resolvedBusinessId) return;
    await deleteShopExpense(resolvedBusinessId, id);
    showToast('Expense entry deleted');
  };

  // Firestore Inventory handlers
  const handleAddInventoryProduct = async (item: Omit<InventoryItem, 'id'>) => {
    if (!user || !resolvedBusinessId) return;
    await addShopInventoryItem(user.uid, resolvedBusinessId, item);
    showToast(`Added ${item.sku} (${item.name}) to inventory`);
  };

  const handleAdjustStock = async (id: string, delta: number) => {
    if (!user || !resolvedBusinessId) return;
    const item = inventory.find((i) => i.id === id);
    if (!item) return;
    const nextStock = Math.max(0, item.stock + delta);
    await updateShopInventoryItem(resolvedBusinessId, id, { stock: nextStock });
    showToast(`Updated ${item.sku} stock to ${nextStock}`);
  };

  const handleUpdateReorderLevel = async (id: string, level: number) => {
    if (!user || !resolvedBusinessId) return;
    await updateShopInventoryItem(resolvedBusinessId, id, { reorderLevel: level });
    showToast('Updated reorder alert threshold');
  };

  const handleDeleteInventoryProduct = async (id: string) => {
    if (!user || !resolvedBusinessId) return;
    await deleteShopInventoryItem(resolvedBusinessId, id);
    showToast('Product removed from inventory');
  };

  // Customer CRM handlers
  const handleAddCustomer = async (customer: Omit<CustomerRecord, 'id'>) => {
    if (!user || !resolvedBusinessId) return;
    await addShopCustomer(user.uid, resolvedBusinessId, customer);
    showToast(`Added customer ${customer.name}`);
  };

  const handleUpdateCustomer = async (
    id: string,
    patch: Partial<Pick<CustomerRecord, 'name' | 'phone' | 'email' | 'city' | 'segment' | 'notes'>>
  ) => {
    if (!user || !resolvedBusinessId) return;
    await updateShopCustomer(resolvedBusinessId, id, patch);
    showToast('Updated customer profile');
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!user || !resolvedBusinessId) return;
    await deleteShopCustomer(resolvedBusinessId, id);
    showToast('Customer removed from directory');
  };

  // Employees & Tasks handlers
  const handleAddEmployee = async (employee: Omit<EmployeeRecord, 'id'>) => {
    if (!user || !resolvedBusinessId) return;
    await addShopEmployee(user.uid, resolvedBusinessId, employee);
    showToast(`Added ${employee.name} to team directory`);
  };

  const handleUpdateEmployee = async (
    id: string,
    patch: Partial<
      Pick<
        EmployeeRecord,
        'name' | 'role' | 'department' | 'phone' | 'email' | 'monthlySalary' | 'status' | 'joinedDate'
      >
    >
  ) => {
    if (!user || !resolvedBusinessId) return;
    await updateShopEmployee(resolvedBusinessId, id, patch);
    showToast('Updated employee profile');
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!user || !resolvedBusinessId) return;
    await deleteShopEmployee(resolvedBusinessId, id);
    showToast('Employee removed from directory');
  };

  const handleAddTask = async (task: Omit<TaskRecord, 'id'>) => {
    if (!user || !resolvedBusinessId) return;
    await addShopTask(user.uid, resolvedBusinessId, task);
    showToast(`Task created (${task.status})`);
  };

  const handleUpdateTask = async (
    id: string,
    patch: Partial<
      Pick<TaskRecord, 'title' | 'description' | 'status' | 'priority' | 'assigneeId' | 'assigneeName' | 'dueDate'>
    >
  ) => {
    if (!user || !resolvedBusinessId) return;
    await updateShopTask(resolvedBusinessId, id, patch);
    showToast(patch.status ? `Task status updated to ${patch.status}` : 'Task updated');
  };

  const handleDeleteTask = async (id: string) => {
    if (!user || !resolvedBusinessId) return;
    await deleteShopTask(resolvedBusinessId, id);
    showToast('Task deleted');
  };

  // Shop Profile, Business Config & Multi-Business handlers
  const handleUpdateShopProfile = async (patch: {
    shopName: string;
    ownerName: string;
    ownerPhone?: string;
    businessType: string;
    category?: BusinessCategory;
    businessSize?: BusinessSize;
    country?: string;
    currency?: CurrencyCode;
    address?: string;
    city: string;
    gstin?: string;
    whatsappNumber?: string;
    logoUrl?: string;
  }) => {
    if (!user || !shopProfile || !resolvedBusinessId) return;
    const updated = await updateShopProfile(resolvedBusinessId, shopProfile, patch);
    setBusinesses((prev) =>
      prev.map((b) => (getBusinessId(b) === resolvedBusinessId ? updated : b))
    );
    if (patch.currency || patch.country || patch.category || patch.businessSize) {
      if (patch.currency) {
        setActiveCurrencyState(patch.currency);
        setActiveCurrency(patch.currency);
      }
      setBusinessConfig((prev) =>
        prev
          ? {
              ...prev,
              ...(patch.category ? { category: patch.category } : {}),
              ...(patch.businessSize ? { businessSize: patch.businessSize } : {}),
              ...(patch.country ? { country: patch.country } : {}),
              ...(patch.currency ? { currency: patch.currency } : {}),
            }
          : prev
      );
    }
    showToast('Business profile saved');
  };

  const handleSaveBusinessConfig = async (input: {
    category: BusinessCategory;
    businessSize: BusinessSize;
    country: string;
    currency: CurrencyCode;
    businessGoals: string[];
    enabledModules: BusinessModuleId[];
    autoConfigured: boolean;
  }) => {
    if (!user || !resolvedBusinessId) return;
    const saved = await saveBusinessConfig(user.uid, resolvedBusinessId, input);
    setActiveCurrencyState(saved.currency);
    setActiveCurrency(saved.currency);
    setBusinessConfig(saved);
    setBusinesses((prev) =>
      prev.map((b) =>
        getBusinessId(b) === resolvedBusinessId
          ? {
              ...b,
              category: saved.category,
              businessSize: saved.businessSize,
              country: saved.country,
              currency: saved.currency,
            }
          : b
      )
    );
    showToast(`Business configuration saved (${saved.enabledModules.length} active modules)`);
  };

  const handleCurrencyChange = async (nextCurrency: CurrencyCode) => {
    if (!user || !resolvedBusinessId || !businessConfig) return;
    const normalized = normalizeCurrencyCode(nextCurrency, activeCurrency);
    const previousCurrency = activeCurrency;
    setActiveCurrencyState(normalized);
    setActiveCurrency(normalized);
    try {
      const saved = await saveBusinessConfig(user.uid, resolvedBusinessId, {
        category: businessConfig.category,
        businessSize: businessConfig.businessSize,
        country: businessConfig.country,
        currency: normalized,
        businessGoals: businessConfig.businessGoals,
        enabledModules: businessConfig.enabledModules,
        autoConfigured: businessConfig.autoConfigured,
      });
      setBusinessConfig(saved);
      setBusinesses((prev) =>
        prev.map((b) =>
          getBusinessId(b) === resolvedBusinessId
            ? {
                ...b,
                currency: saved.currency,
              }
            : b
        )
      );
      const nextMeta = getCurrencyMeta(saved.currency);
      showToast(`Preferred currency updated to ${nextMeta.code} (${nextMeta.symbol.trim()})`);
    } catch (err) {
      setActiveCurrencyState(previousCurrency);
      setActiveCurrency(previousCurrency);
      throw err;
    }
  };

  const handleSwitchBusiness = (businessId: string) => {
    if (!user || businessId === resolvedBusinessId) return;
    const target = businesses.find((b) => getBusinessId(b) === businessId);
    if (!target) return;
    try {
      window.localStorage.setItem(`smartbiz_active_biz_${user.uid}`, businessId);
    } catch {
      // ignore storage errors
    }
    const targetCurrency = normalizeCurrencyCode(target.currency, 'INR');
    setActiveCurrencyState(targetCurrency);
    setActiveCurrency(targetCurrency);
    setActiveBusinessId(businessId);
    setBusinessConfig(null);
    setActiveView('dashboard');
    setIsMobileMenuOpen(false);
    showToast(`Switched workspace to ${target.shopName}`);
  };

  const handleCreateBusiness = async (input: {
    shopName: string;
    ownerName: string;
    ownerPhone?: string;
    businessType: string;
    category: BusinessCategory;
    businessSize: BusinessSize;
    country: string;
    currency: CurrencyCode;
    address?: string;
    city: string;
    gstin?: string;
    whatsappNumber?: string;
    logoUrl?: string;
    businessGoals: string[];
    enabledModules: BusinessModuleId[];
    preloadDemo: boolean;
  }) => {
    if (!user) return;
    const { profile, config } = await createBusinessWorkspace(user.uid, user.email || '', {
      ...input,
      isFirstBusiness: false,
    });
    const newId = getBusinessId(profile);
    try {
      window.localStorage.setItem(`smartbiz_active_biz_${user.uid}`, newId);
    } catch {
      // ignore
    }
    setActiveCurrencyState(config.currency);
    setActiveCurrency(config.currency);
    setBusinesses((prev) => [...prev, profile]);
    setActiveBusinessId(newId);
    setBusinessConfig(config);
    setActiveView('setup');
    showToast(`Created workspace for ${profile.shopName} (${config.category})`);
  };

  const handleCreateBackup = async (label: string) => {
    if (!user || !shopProfile || !resolvedBusinessId) return;
    const backupFile = await createAndRecordBackup({
      uid: user.uid,
      businessId: resolvedBusinessId,
      shopProfile,
      sales: rawDataset,
      expenses,
      inventory,
      customers,
      label,
    });
    const jsonBlob = new Blob([JSON.stringify(backupFile, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(jsonBlob);
    const a = document.createElement('a');
    a.href = url;
    const safeSlug = shopProfile.shopName.replace(/[^a-zA-Z0-9]+/g, '_');
    a.download = `SmartBiz_Backup_${safeSlug}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('SHA-256 verified backup downloaded & logged to cloud');
  };

  const handleRestoreBackup = async (file: File) => {
    if (!user || !shopProfile || !resolvedBusinessId) return;
    const text = await file.text();
    setSnapshotsReady({ sales: false, expenses: false });
    hasInitializedBoundsRef.current = false;
    const res = await verifyAndRestoreBackup(user.uid, resolvedBusinessId, shopProfile, text);
    setBusinesses((prev) =>
      prev.map((b) => (getBusinessId(b) === resolvedBusinessId ? res.updatedProfile : b))
    );
    setBusinessConfig((prev) =>
      prev
        ? {
            ...prev,
            category: res.updatedProfile.category ?? prev.category,
            businessSize: res.updatedProfile.businessSize ?? prev.businessSize,
            country: res.updatedProfile.country ?? prev.country,
            currency: res.updatedProfile.currency ?? prev.currency,
          }
        : prev
    );
    showToast(
      `Restored verified backup (${res.sales} sales, ${res.expenses} expenses, ${res.inventory} SKUs, ${res.customers} customers)`
    );
  };

  const handleRefreshUser = async () => {
    const refreshed = await refreshCurrentUser();
    setUser(refreshed ? ({ ...refreshed } as User) : null);
    if (refreshed && refreshed.emailVerified) {
      setProfileLoading(true);
      try {
        const list = await fetchUserBusinesses(refreshed.uid);
        setBusinesses(list);
        selectPreferredBusiness(refreshed.uid, list);
      } finally {
        setProfileLoading(false);
      }
    }
  };

  const handleSignOut = async () => {
    await signOutShopOwner();
  };

  // Loading gate while Firebase Auth / Shop Profile resolves
  if (!authReady || profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-violet-600" />
        <p className="text-sm font-medium text-slate-600">Loading your SmartBiz AI workspace...</p>
      </div>
    );
  }

  // Auth / First-time Shop Setup Gate
  if (!user || !user.emailVerified || !shopProfile) {
    return (
      <AuthGate
        user={user}
        shopProfile={shopProfile}
        onRefreshUser={handleRefreshUser}
        onProfileCreated={({ profile, config }) => {
          hasInitializedBoundsRef.current = false;
          setBusinesses([profile]);
          setActiveBusinessId(getBusinessId(profile));
          setBusinessConfig(config);
          showToast(`Welcome to SmartBiz AI, ${profile.shopName}!`);
        }}
      />
    );
  }

  const meta =
    activeView === 'dashboard'
      ? {
          title: VIEW_META.dashboard.title,
          subtitle: `Real-time ${currencyMeta.code} (${currencyMeta.symbol.trim()}) KPIs, Profit & Loss summary, revenue trajectory, and stock alerts`,
        }
      : activeView === 'insights'
        ? {
            title: VIEW_META.insights.title,
            subtitle: `Hindi & English Gemini AI advisor, 3–6 month ${currencyMeta.code} sales forecasting, and CFO strategy`,
          }
        : VIEW_META[activeView];
  const dateRangeLabel = `${startDate || 'Start'} to ${endDate || 'End'}`;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar
        activeView={activeView}
        onSelectView={handleSelectView}
        shopProfile={shopProfile}
        businesses={businesses}
        businessConfig={businessConfig}
        onSwitchBusiness={handleSwitchBusiness}
        recordCount={rawDataset.length}
        expenseCount={expenses.length}
        customerCount={customers.length}
        lowStockCount={lowStockCount}
        openTaskCount={openTaskCount}
        isDemoData={isDemoData}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onResetSample={handleResetSample}
        onSignOut={handleSignOut}
      />

      <div className="flex-1 lg:ml-[268px] flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-7 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                {meta.title}
              </h1>
              <p className="text-xs text-slate-500 truncate hidden sm:block">{meta.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => handleSelectView('ledger')}
              className="hidden md:inline-flex min-h-[40px] px-3.5 py-2 rounded-lg border border-violet-200 bg-violet-50 hover:bg-violet-100 text-xs sm:text-sm font-semibold text-violet-800 transition-colors items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Plus className="w-4 h-4" />
              <span>Add Sale / Expense</span>
            </button>

            <input
              ref={quickUploadInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUploadFile(file, 'append');
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => quickUploadInputRef.current?.click()}
              className="min-h-[40px] px-3 sm:px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold text-slate-800 transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Upload className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Upload CSV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isCompareEnabled && comparison) {
                  exportComparisonAnalyticsReportCsv(
                    filteredDataset,
                    compareDataset,
                    comparison.primaryLabel,
                    comparison.compareLabel,
                    filteredExpenses,
                    compareExpenses,
                    activeCurrency
                  );
                  showToast('Period Comparison Report CSV downloaded');
                } else {
                  exportAnalyticsReportCsv(filteredDataset, filteredExpenses, shopProfile.shopName, activeCurrency);
                  showToast('Analytics & P&L Report CSV downloaded');
                }
              }}
              className="min-h-[40px] px-3.5 sm:px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-xs sm:text-sm font-semibold text-white transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isCompareEnabled ? 'Export Comparison CSV' : 'Export Report CSV'}
              </span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        </header>

        {/* Global Filter Bar */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-7 py-3 space-y-3">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-end gap-2.5 sm:gap-3">
            <div className="hidden sm:flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-500">Currency</span>
              <button
                type="button"
                onClick={() => handleSelectView('setup')}
                title="Change preferred currency in Business Setup"
                className="min-h-[38px] px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-violet-50 hover:border-violet-200 text-xs font-semibold text-slate-900 inline-flex items-center whitespace-nowrap transition-colors"
              >
                {currencyMeta.code} ({currencyMeta.symbol.trim()})
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="filterStartDate" className="text-xs font-medium text-slate-500">
                {isCompareEnabled ? 'Period A Start' : 'Start Date'}
              </label>
              <input
                id="filterStartDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-auto min-h-[38px] px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="filterEndDate" className="text-xs font-medium text-slate-500">
                {isCompareEnabled ? 'Period A End' : 'End Date'}
              </label>
              <input
                id="filterEndDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-auto min-h-[38px] px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="filterCategory" className="text-xs font-medium text-slate-500">
                Category
              </label>
              <select
                id="filterCategory"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto min-h-[38px] px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="filterRegion" className="text-xs font-medium text-slate-500">
                Region
              </label>
              <select
                id="filterRegion"
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full sm:w-auto min-h-[38px] px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="ALL">All Regions</option>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1 flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => handleSelectView('setup')}
                title="Change preferred currency in Business Setup"
                className="sm:hidden min-h-[38px] px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-violet-50 text-xs font-semibold text-slate-900 inline-flex items-center whitespace-nowrap"
              >
                {currencyMeta.code} ({currencyMeta.symbol.trim()})
              </button>

              <button
                type="button"
                aria-pressed={isCompareEnabled}
                onClick={handleToggleCompare}
                className={`min-h-[38px] px-3.5 rounded-lg border text-xs font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                  isCompareEnabled
                    ? 'bg-violet-600 border-violet-600 text-white hover:bg-violet-700'
                    : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                }`}
              >
                <GitCompareArrows className="w-3.5 h-3.5" />
                <span>Compare Date Range</span>
              </button>

              <button
                type="button"
                onClick={handleResetFilters}
                className="min-h-[38px] px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                Reset Filters
              </button>
            </div>

            <div className="col-span-2 sm:col-span-1 sm:ml-auto text-xs text-slate-500 pb-0.5 sm:pb-1.5 tabular-nums">
              {isCompareEnabled ? (
                <span>
                  Period A: <span className="font-semibold text-slate-900">{fmtNumber(filteredDataset.length, activeCurrency)}</span>
                  {' · '}
                  Period B: <span className="font-semibold text-slate-900">{fmtNumber(compareDataset.length, activeCurrency)}</span>
                </span>
              ) : (
                <span>
                  Showing <span className="font-semibold text-slate-900">{fmtNumber(filteredDataset.length, activeCurrency)}</span>{' '}
                  sales · <span className="font-semibold text-slate-900">{fmtNumber(filteredExpenses.length, activeCurrency)}</span>{' '}
                  expenses
                </span>
              )}
            </div>
          </div>

          {isCompareEnabled && (
            <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 sm:flex sm:flex-wrap sm:items-end gap-2.5 sm:gap-3.5">
              <div className="flex flex-col gap-1">
                <label htmlFor="compareStartDate" className="text-xs font-medium text-violet-700">
                  Period B Start (Comparison)
                </label>
                <input
                  id="compareStartDate"
                  type="date"
                  value={compareStartDate}
                  onChange={(e) => setCompareStartDate(e.target.value)}
                  className="w-full sm:w-auto min-h-[38px] px-2.5 rounded-lg border border-violet-200 bg-violet-50/40 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="compareEndDate" className="text-xs font-medium text-violet-700">
                  Period B End (Comparison)
                </label>
                <input
                  id="compareEndDate"
                  type="date"
                  value={compareEndDate}
                  onChange={(e) => setCompareEndDate(e.target.value)}
                  className="w-full sm:w-auto min-h-[38px] px-2.5 rounded-lg border border-violet-200 bg-violet-50/40 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="col-span-2 sm:col-span-1 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleMatchPriorSpan}
                  className="min-h-[38px] px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  Match Prior Period
                </button>

                <div className="text-xs text-slate-500">
                  Comparing Period A against Period B across Executive Overview and Sales Analytics
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-7 max-w-[1440px] w-full mx-auto">
          {isOffline && (
            <div
              role="status"
              className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3 text-xs sm:text-sm"
            >
              <WifiOff className="w-4 h-4 shrink-0 text-amber-700" />
              <span>Cloud Firestore connection appears offline. Changes will sync once connectivity is restored.</span>
            </div>
          )}

          {globalError && (
            <div
              role="alert"
              className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-3 text-xs sm:text-sm"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{globalError}</span>
              </div>
              <button
                type="button"
                onClick={() => setGlobalError(null)}
                className="font-semibold underline whitespace-nowrap"
              >
                Dismiss
              </button>
            </div>
          )}

          {isDemoData && (
            <div
              role="status"
              className="mb-5 p-3.5 sm:p-4 rounded-xl bg-violet-50 border border-violet-200 text-violet-950 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs sm:text-sm"
            >
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 shrink-0 text-violet-700 mt-0.5" />
                <div>
                  <span className="font-semibold">Sample Demo Data Active:</span>{' '}
                  <span className="text-violet-900">
                    You are currently viewing the 12-month Indian SMB sample dataset. Upload your shop CSV or clear demo data to start with your actual records.
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => quickUploadInputRef.current?.click()}
                  className="min-h-[34px] px-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white whitespace-nowrap"
                >
                  Upload My CSV
                </button>
                {confirmClearDemo ? (
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isClearingDemo}
                      onClick={() => void handleClearDemoData()}
                      className="min-h-[34px] px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      {isClearingDemo && <Loader2 className="w-3 h-3 animate-spin" />}
                      Confirm Clear All
                    </button>
                    <button
                      type="button"
                      disabled={isClearingDemo}
                      onClick={() => setConfirmClearDemo(false)}
                      className="min-h-[34px] px-2.5 rounded-lg bg-white border border-violet-200 text-xs font-medium text-violet-900"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClearDemo(true)}
                    className="min-h-[34px] px-3 rounded-lg bg-white border border-violet-200 hover:bg-violet-100 text-xs font-semibold text-violet-900 inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear Demo Data
                  </button>
                )}
              </div>
            </div>
          )}

          {filteredDataset.length === 0 &&
            activeView !== 'inventory' &&
            activeView !== 'ledger' &&
            activeView !== 'customers' &&
            activeView !== 'employees' &&
            activeView !== 'data' &&
            activeView !== 'setup' && (
              <div
                role="status"
                className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
              >
                <span>
                  {rawDataset.length === 0
                    ? 'Your shop has no sales records yet. Add a sale, upload a CSV, or load the Indian SMB demo dataset.'
                    : 'No transactions match your current filter selection. Adjust dates or reset filters to view analytics.'}
                </span>
                {rawDataset.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => handleSelectView('ledger')}
                    className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-semibold text-amber-900 hover:bg-amber-100 whitespace-nowrap shrink-0"
                  >
                    Add First Sale
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-white border border-amber-300 text-xs font-semibold text-amber-900 hover:bg-amber-100 whitespace-nowrap shrink-0"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            )}

          {activeView === 'dashboard' && (
            <ExecutiveOverview
              currency={activeCurrency}
              stats={stats}
              pnl={pnl}
              intel={intel}
              lowStockCount={lowStockCount}
              onNavigate={handleSelectView}
              isCompareEnabled={isCompareEnabled}
              compareStats={compareStats}
              comparison={comparison}
            />
          )}
          {activeView === 'sales' && (
            <SalesAnalytics currency={activeCurrency} stats={stats} comparison={comparison} />
          )}
          {activeView === 'products' && <ProductAnalytics currency={activeCurrency} stats={stats} />}
          {activeView === 'ledger' && (
            <LedgerAndPnLView
              currency={activeCurrency}
              filteredSales={filteredDataset}
              filteredExpenses={filteredExpenses}
              inventory={inventory}
              customers={customers}
              pnl={pnl}
              defaultDate={datasetBounds.max}
              onAddSale={handleAddSale}
              onDeleteSale={handleDeleteSale}
              onAddExpense={handleAddExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          )}
          {activeView === 'customers' && (
            <CustomersView
              currency={activeCurrency}
              shopProfile={shopProfile}
              customers={customers}
              filteredSales={filteredDataset}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
            />
          )}
          {activeView === 'inventory' && (
            <InventoryView
              currency={activeCurrency}
              shopProfile={shopProfile}
              inventory={inventory}
              allSales={rawDataset}
              onAddProduct={handleAddInventoryProduct}
              onAdjustStock={handleAdjustStock}
              onUpdateReorderLevel={handleUpdateReorderLevel}
              onDeleteProduct={handleDeleteInventoryProduct}
            />
          )}
          {activeView === 'employees' && (
            <EmployeesAndTasksView
              currency={activeCurrency}
              shopProfile={shopProfile}
              employees={employees}
              tasks={tasks}
              onAddEmployee={handleAddEmployee}
              onUpdateEmployee={handleUpdateEmployee}
              onDeleteEmployee={handleDeleteEmployee}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
            />
          )}
          {activeView === 'insights' && (
            <AiInsightsView
              currency={activeCurrency}
              shopProfile={shopProfile}
              stats={stats}
              pnl={pnl}
              intel={intel}
              inventory={inventory}
              customers={customers}
              filteredSales={filteredDataset}
              filteredExpenses={filteredExpenses}
              dateRangeLabel={dateRangeLabel}
            />
          )}
          {activeView === 'data' && (
            <DataExplorerView
              currency={activeCurrency}
              shopProfile={shopProfile}
              filteredDataset={filteredDataset}
              allSales={rawDataset}
              allExpenses={expenses}
              filteredExpenses={filteredExpenses}
              inventory={inventory}
              customers={customers}
              backups={backups}
              onUploadFile={handleUploadFile}
              onDownloadTemplate={() => {
                downloadSampleTemplateCsv();
                showToast('Indian SMB sample CSV template downloaded');
              }}
              onExportFiltered={() => {
                exportFilteredRawCsv(filteredDataset);
                showToast('Filtered Sales Dataset CSV downloaded');
              }}
              onUpdateShopProfile={handleUpdateShopProfile}
              onCreateBackup={handleCreateBackup}
              onRestoreBackup={handleRestoreBackup}
              uploadError={uploadError}
              onClearError={() => setUploadError(null)}
              onNotify={showToast}
            />
          )}
          {activeView === 'setup' && businessConfig && (
            <BusinessSetupView
              businesses={businesses}
              activeBusiness={shopProfile}
              businessConfig={businessConfig}
              onSwitchBusiness={handleSwitchBusiness}
              onCreateBusiness={handleCreateBusiness}
              onUpdateShopProfile={handleUpdateShopProfile}
              onSaveBusinessConfig={handleSaveBusinessConfig}
              onCurrencyChange={handleCurrencyChange}
            />
          )}
          {activeView === 'setup' && !businessConfig && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 flex items-center justify-center gap-3 text-sm text-slate-600">
              <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
              <span>Loading business configuration...</span>
            </div>
          )}
        </main>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-800 flex items-center gap-2.5 text-sm font-medium max-w-[90vw]"
        >
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
