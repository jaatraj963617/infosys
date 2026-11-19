export type ViewId = 'dashboard' | 'sales' | 'products' | 'insights' | 'data';

export interface SalesRecord {
  Date: string;
  Product: string;
  Category: string;
  Quantity: number;
  Revenue: number;
  Cost: number;
  Profit: number;
  Region: string;
}

export interface MonthlyMetric {
  ym: string;
  orders: number;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
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

export interface IntelligenceReport {
  insights: InsightItem[];
  recommendations: RecommendationItem[];
  summaryItems: InsightItem[];
}
