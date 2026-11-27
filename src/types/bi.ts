export type CurrencyCode =
  | 'INR'
  | 'USD'
  | 'EUR'
  | 'JPY'
  | 'GBP'
  | 'AUD'
  | 'CAD'
  | 'SGD'
  | 'AED';

export type AiLanguage = 'en' | 'hi' | 'bilingual';

export type ViewId =
  | 'dashboard'
  | 'sales'
  | 'ledger'
  | 'products'
  | 'customers'
  | 'inventory'
  | 'employees'
  | 'insights'
  | 'data'
  | 'setup'
  | 'billing';

export type BusinessCategory =
  | 'Retail'
  | 'Clothing Store'
  | 'Restaurant'
  | 'E-commerce'
  | 'Manufacturing'
  | 'Wholesale'
  | 'Education'
  | 'Healthcare'
  | 'Professional Services'
  | 'Freelancer'
  | 'Other';

export type BusinessSize =
  | 'Solo / Micro (1)'
  | 'Small (2-20)'
  | 'Medium (21-100)'
  | 'Enterprise (100+)';

export type BusinessModuleId =
  | 'finance'
  | 'sales'
  | 'expenses'
  | 'customers'
  | 'products'
  | 'inventory'
  | 'suppliers'
  | 'employees'
  | 'reports'
  | 'tasks';

export interface BusinessConfiguration {
  ownerId: string;
  businessId: string;
  category: BusinessCategory;
  businessSize: BusinessSize;
  country: string;
  currency: CurrencyCode;
  businessGoals: string[];
  recommendedModules: BusinessModuleId[];
  enabledModules: BusinessModuleId[];
  autoConfigured: boolean;
  updatedAtIso?: string;
}

export type CustomerSegment = 'Regular' | 'VIP' | 'Wholesale' | 'New';

export interface ShopProfile {
  ownerId: string;
  businessId?: string;
  shopName: string;
  ownerName: string;
  ownerEmail: string;
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
  dataSource?: 'demo' | 'live';
}

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city: string;
  segment: CustomerSegment;
  notes?: string;
  totalOrders: number;
  totalSpent: number;
  lastPurchaseDate?: string;
}

export type EmployeeStatus = 'Active' | 'On Leave' | 'Inactive';

export interface EmployeeRecord {
  id: string;
  name: string;
  role: string;
  department?: string;
  phone?: string;
  email?: string;
  monthlySalary: number;
  status: EmployeeStatus;
  joinedDate?: string;
}

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface TaskRecord {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  createdAtIso?: string;
  updatedAtIso?: string;
}

export interface ShopBackupLog {
  id: string;
  label: string;
  salesCount: number;
  expensesCount: number;
  inventoryCount: number;
  customersCount?: number;
  checksum: string;
  snapshotSizeKb: number;
  createdAtIso: string;
}

export interface ShopBackupFile {
  version: 1;
  exportedAt: string;
  checksum: string;
  shopProfile: Omit<ShopProfile, 'ownerId'>;
  sales: Array<Omit<SalesRecord, 'id'>>;
  expenses: Array<Omit<ExpenseRecord, 'id'>>;
  inventory: Array<Omit<InventoryItem, 'id'>>;
  customers?: Array<Omit<CustomerRecord, 'id'>>;
}

export interface SalesRecord {
  id?: string;
  Date: string;
  Product: string;
  Category: string;
  Quantity: number;
  Revenue: number;
  Cost: number;
  Profit: number;
  Region: string;
  PaymentMode?: string;
  customerId?: string;
  customerName?: string;
}

export interface ExpenseRecord {
  id: string;
  Date: string;
  Title: string;
  Category: string;
  Amount: number;
  PaymentMode: string;
  Notes?: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  reorderLevel: number;
  unitPrice: number;
  unitCost: number;
  supplier: string;
}

export interface InventoryVelocityItem {
  item: InventoryItem;
  unitsSoldInPeriod: number;
  dailyRunRate: number;
  daysUntilStockout: number | null;
  projectedStockoutDate: string | null;
  suggestedReorderQty: number;
  estimatedRestockCost: number;
  riskStatus: 'out' | 'critical' | 'low' | 'healthy' | 'overstocked';
}

export interface CustomerPerformanceMetric {
  customer: CustomerRecord;
  ordersInPeriod: number;
  spentInPeriod: number;
  profitInPeriod: number;
  avgOrderValue: number;
  lastOrderDate: string;
}

export interface CustomerAnalyticsSummary {
  totalCustomers: number;
  activeCustomers: number;
  repeatCustomers: number;
  totalLinkedRevenue: number;
  avgLifetimeValue: number;
  topSegment: string;
  segmentBreakdown: Array<{
    segment: CustomerSegment;
    count: number;
    revenue: number;
  }>;
  rankedCustomers: CustomerPerformanceMetric[];
}

export interface MonthlyMetric {
  ym: string;
  orders: number;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  expenses: number;
  netProfit: number;
}

export interface YearlyMetric {
  year: string;
  orders: number;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  expenses: number;
  netProfit: number;
  grossMarginPct: number;
  netMarginPct: number;
}

export interface CategoryMetric {
  name: string;
  orders: number;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface RegionMetric {
  name: string;
  orders: number;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface ProductMetric {
  name: string;
  category: string;
  orders: number;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface ProfitAndLossSummary {
  grossRevenue: number;
  totalCogs: number;
  grossProfit: number;
  grossMarginPct: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPct: number;
  isLoss: boolean;
  expensesByCategory: Array<{
    category: string;
    amount: number;
    sharePct: number;
  }>;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  totalOrders: number;
  totalUnits: number;
  avgOrderValue: number;
  profitMargin: number;
  growthPct: number | null;
  growthContext: string;
  monthly: MonthlyMetric[];
  yearly: YearlyMetric[];
  categories: CategoryMetric[];
  regions: RegionMetric[];
  products: ProductMetric[];
}

export interface InsightItem {
  type: string;
  title: string;
  body: string;
}

export interface RecommendationItem {
  variant: 'success' | 'warning' | 'info' | 'default';
  badge: string;
  title: string;
  desc: string;
}

export interface AiRecommendation {
  category: string;
  priority: string;
  title: string;
  rationale: string;
  impact: string;
}

export interface ForecastMonthProjection {
  ym: string;
  label: string;
  projectedRevenue: number;
  conservativeRevenue: number;
  optimisticRevenue: number;
  projectedNetProfit: number;
  keyDriver: string;
}

export interface SalesForecastResponse {
  methodologySummary: string;
  confidenceLevel: 'High' | 'Medium' | 'Low';
  projectedMonths: ForecastMonthProjection[];
  riskFactors: string[];
  growthLevers: string[];
}

export interface InventoryAiRecommendation {
  sku: string;
  productName: string;
  urgency: 'Critical' | 'High' | 'Medium' | 'Watch';
  suggestedOrderQty: number;
  estimatedCost?: number;
  estimatedCostInr?: number;
  reason: string;
}

export interface InventoryPredictionResponse {
  summary: string;
  totalEstimatedRestock?: number;
  totalEstimatedRestockInr?: number;
  recommendations: InventoryAiRecommendation[];
  slowMovingAlerts: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface IntelligenceReport {
  insights: InsightItem[];
  recommendations: RecommendationItem[];
  summaryItems: InsightItem[];
}

export interface MetricDelta {
  primary: number;
  compare: number;
  diff: number;
  pct: number | null;
}

export interface CategoryComparisonRow {
  name: string;
  primaryRevenue: number;
  compareRevenue: number;
  revenueDeltaPct: number | null;
  primaryProfit: number;
  compareProfit: number;
  profitDeltaPct: number | null;
}

export interface RegionComparisonRow {
  name: string;
  primaryRevenue: number;
  compareRevenue: number;
  revenueDeltaPct: number | null;
}

export interface ComparisonSummary {
  primaryLabel: string;
  compareLabel: string;
  revenue: MetricDelta;
  profit: MetricDelta;
  orders: MetricDelta;
  units: MetricDelta;
  avgOrderValue: MetricDelta;
  expenses: MetricDelta;
  netProfit: MetricDelta;
  marginDiffPp: number;
  categories: CategoryComparisonRow[];
  regions: RegionComparisonRow[];
}
