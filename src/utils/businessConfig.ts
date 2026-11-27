import type {
  BusinessCategory,
  BusinessConfiguration,
  BusinessModuleId,
  BusinessSize,
  CurrencyCode,
  ShopProfile,
  ViewId,
} from '../types/bi';

export interface BusinessCategoryMeta {
  id: BusinessCategory;
  label: string;
  shortDesc: string;
  kpiFocus: string;
}

export interface UniversalModuleMeta {
  id: BusinessModuleId;
  label: string;
  description: string;
  mappedViews: ViewId[];
  isCoreRecommended?: boolean;
  /**
   * 'active' modules map directly to live interactive views already in SmartBiz AI.
   * 'configured' modules store activation preferences in Business Configuration for upcoming phases
   * without rendering fake stub screens.
   */
  availability: 'active' | 'configured';
}

export const BUSINESS_CATEGORIES: BusinessCategoryMeta[] = [
  {
    id: 'Retail',
    label: 'Retail',
    shortDesc: 'Kirana, electronics, pharmacy counters & multi-SKU general stores',
    kpiFocus: 'Daily billing velocity, SKU margins & reorder alerts',
  },
  {
    id: 'Clothing Store',
    label: 'Clothing Store',
    shortDesc: 'Apparel boutiques, ethnic wear, footwear & fashion showrooms',
    kpiFocus: 'Seasonal collection sell-through, size/SKU margins & supplier restocks',
  },
  {
    id: 'Restaurant',
    label: 'Restaurant',
    shortDesc: 'Cafes, bakeries, QSR outlets, cloud kitchens & dine-in restaurants',
    kpiFocus: 'Daily food cost %, per-item margin & ingredient stock',
  },
  {
    id: 'E-commerce',
    label: 'E-commerce',
    shortDesc: 'D2C brands, marketplace sellers & online storefronts',
    kpiFocus: 'Repeat buyer LTV, fulfillment readiness & regional demand',
  },
  {
    id: 'Manufacturing',
    label: 'Manufacturing',
    shortDesc: 'Workshops, small factories, fabrication & packaged goods units',
    kpiFocus: 'COGS tracking, raw material stock & production overhead',
  },
  {
    id: 'Wholesale',
    label: 'Wholesale',
    shortDesc: 'B2B distributors, mandi traders & bulk supply agencies',
    kpiFocus: 'Bulk order volume, wholesale client retention & supplier cycles',
  },
  {
    id: 'Education',
    label: 'Education',
    shortDesc: 'Coaching institutes, skill academies, ed-tech & training centers',
    kpiFocus: 'Fee collections, student/client CRM & monthly operating burn',
  },
  {
    id: 'Healthcare',
    label: 'Healthcare',
    shortDesc: 'Clinics, diagnostic labs, pharmacies & wellness studios',
    kpiFocus: 'Patient retention, consumable stock & monthly net surplus',
  },
  {
    id: 'Professional Services',
    label: 'Professional Services',
    shortDesc: 'Agencies, CA/legal firms, IT consultancies & service studios',
    kpiFocus: 'Client retainers, operating margin & monthly financial reports',
  },
  {
    id: 'Freelancer',
    label: 'Freelancer',
    shortDesc: 'Independent consultants, designers, developers & solo creators',
    kpiFocus: 'Client billing, project expenses, net margin & tax readiness',
  },
  {
    id: 'Other',
    label: 'Other',
    shortDesc: 'Custom trades, hybrid businesses & specialized local enterprises',
    kpiFocus: 'Balanced revenue, expense P&L & AI-driven advisory',
  },
];

export const BUSINESS_TYPE_OPTIONS: string[] = [
  'Sole Proprietorship',
  'Partnership Firm',
  'Private Limited (Pvt Ltd)',
  'Limited Liability Partnership (LLP)',
  'Independent / Freelance',
  'Franchise / Retail Outlet',
  'Online / D2C Brand',
  'Other',
];

export const BUSINESS_SIZES: BusinessSize[] = [
  'Solo / Micro (1)',
  'Small (2-20)',
  'Medium (21-100)',
  'Enterprise (100+)',
];

export interface CurrencyMeta {
  code: CurrencyCode;
  name: string;
  symbol: string;
  pdfPrefix: string;
  locale: string;
  decimals: 0 | 2;
  shortScale: 'indian' | 'international';
  defaultCountry: string;
}

export const CURRENCY_OPTIONS: CurrencyMeta[] = [
  {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    pdfPrefix: 'Rs.',
    locale: 'en-IN',
    decimals: 2,
    shortScale: 'indian',
    defaultCountry: 'India',
  },
  {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    pdfPrefix: 'USD',
    locale: 'en-US',
    decimals: 2,
    shortScale: 'international',
    defaultCountry: 'United States',
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    pdfPrefix: 'EUR',
    locale: 'en-IE',
    decimals: 2,
    shortScale: 'international',
    defaultCountry: 'European Union',
  },
  {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    pdfPrefix: 'GBP',
    locale: 'en-GB',
    decimals: 2,
    shortScale: 'international',
    defaultCountry: 'United Kingdom',
  },
  {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    pdfPrefix: 'JPY',
    locale: 'ja-JP',
    decimals: 0,
    shortScale: 'international',
    defaultCountry: 'Japan',
  },
  {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    pdfPrefix: 'AUD',
    locale: 'en-AU',
    decimals: 2,
    shortScale: 'international',
    defaultCountry: 'Australia',
  },
  {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    pdfPrefix: 'CAD',
    locale: 'en-CA',
    decimals: 2,
    shortScale: 'international',
    defaultCountry: 'Canada',
  },
  {
    code: 'SGD',
    name: 'Singapore Dollar',
    symbol: 'S$',
    pdfPrefix: 'SGD',
    locale: 'en-SG',
    decimals: 2,
    shortScale: 'international',
    defaultCountry: 'Singapore',
  },
  {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'AED ',
    pdfPrefix: 'AED',
    locale: 'en-AE',
    decimals: 2,
    shortScale: 'international',
    defaultCountry: 'United Arab Emirates',
  },
];

export const SUPPORTED_CURRENCY_CODES: CurrencyCode[] = CURRENCY_OPTIONS.map((c) => c.code);

export const COUNTRY_OPTIONS: Array<{ country: string; currency: CurrencyCode; label: string }> = [
  { country: 'India', currency: 'INR', label: 'India' },
  { country: 'United States', currency: 'USD', label: 'United States' },
  { country: 'European Union', currency: 'EUR', label: 'European Union' },
  { country: 'United Kingdom', currency: 'GBP', label: 'United Kingdom' },
  { country: 'Japan', currency: 'JPY', label: 'Japan' },
  { country: 'Australia', currency: 'AUD', label: 'Australia' },
  { country: 'Canada', currency: 'CAD', label: 'Canada' },
  { country: 'Singapore', currency: 'SGD', label: 'Singapore' },
  { country: 'United Arab Emirates', currency: 'AED', label: 'United Arab Emirates' },
  { country: 'Other', currency: 'USD', label: 'Other / Global' },
];

export function isValidCurrencyCode(val: unknown): val is CurrencyCode {
  return typeof val === 'string' && SUPPORTED_CURRENCY_CODES.includes(val as CurrencyCode);
}

export function normalizeCurrencyCode(val: unknown, fallback: CurrencyCode = 'INR'): CurrencyCode {
  return isValidCurrencyCode(val) ? val : fallback;
}

export function getCurrencyMeta(code?: string | null): CurrencyMeta {
  const found = CURRENCY_OPTIONS.find((c) => c.code === code);
  return found || CURRENCY_OPTIONS[0];
}

export function getDefaultCurrencyForCountry(country?: string): CurrencyCode {
  const match = COUNTRY_OPTIONS.find((c) => c.country === country);
  return match ? match.currency : 'INR';
}

export const BUSINESS_GOAL_OPTIONS: string[] = [
  'Increase Monthly Net Profit Margin',
  'Track Daily Sales, COGS & Cashflow',
  'Prevent Stockouts & Dead Stock',
  'Grow Repeat Customers & Retention',
  'Automate Monthly & Yearly P&L Reports',
  'Control Operating Expenses',
  'Manage Multiple Businesses Centrally',
];

export const UNIVERSAL_MODULES: UniversalModuleMeta[] = [
  {
    id: 'finance',
    label: 'Finance & P&L',
    description: 'Automatic Profit & Loss statements, gross/net margins, and period comparisons.',
    mappedViews: ['dashboard', 'ledger'],
    isCoreRecommended: true,
    availability: 'active',
  },
  {
    id: 'sales',
    label: 'Sales',
    description: 'Daily sales entry, revenue trajectory charts, regional & payment-mode analytics.',
    mappedViews: ['sales', 'ledger'],
    isCoreRecommended: true,
    availability: 'active',
  },
  {
    id: 'expenses',
    label: 'Expenses',
    description: 'Operating expense tracking across rent, salaries, utilities, and marketing.',
    mappedViews: ['ledger'],
    isCoreRecommended: true,
    availability: 'active',
  },
  {
    id: 'customers',
    label: 'Customers',
    description: 'Customer directory, VIP/Wholesale segments, repeat rate, and LTV analytics.',
    mappedViews: ['customers'],
    availability: 'active',
  },
  {
    id: 'products',
    label: 'Products',
    description: 'Top-performing & low-margin SKU matrix, unit economics, and category splits.',
    mappedViews: ['products'],
    availability: 'active',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    description: 'SKU stock levels, reorder thresholds, stockout velocity, and AI restock plans.',
    mappedViews: ['inventory'],
    availability: 'active',
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    description: 'Monthly & yearly PDF/CSV reports, WhatsApp digests, CSV sync & SHA-256 backups.',
    mappedViews: ['data'],
    isCoreRecommended: true,
    availability: 'active',
  },
  {
    id: 'suppliers',
    label: 'Suppliers & Purchases',
    description: 'Vendor directory, purchase orders & procurement cost tracking (Phase 2 module).',
    mappedViews: [],
    availability: 'configured',
  },
  {
    id: 'employees',
    label: 'Employees & Tasks',
    description: 'Workforce directory, role & salary management, and team coordination.',
    mappedViews: ['employees'],
    availability: 'active',
  },
  {
    id: 'tasks',
    label: 'Operations & Tasks',
    description: 'Operational tasks with Pending, In Progress, and Completed status tracking & filtering.',
    mappedViews: ['employees'],
    availability: 'active',
  },
];

const CATEGORY_MODULE_MAP: Record<BusinessCategory, BusinessModuleId[]> = {
  Retail: ['finance', 'sales', 'expenses', 'customers', 'products', 'inventory', 'suppliers', 'employees', 'tasks', 'reports'],
  'Clothing Store': ['finance', 'sales', 'expenses', 'customers', 'products', 'inventory', 'suppliers', 'employees', 'tasks', 'reports'],
  Restaurant: ['finance', 'sales', 'expenses', 'customers', 'products', 'inventory', 'suppliers', 'employees', 'tasks', 'reports'],
  'E-commerce': ['finance', 'sales', 'expenses', 'customers', 'products', 'inventory', 'suppliers', 'employees', 'tasks', 'reports'],
  Manufacturing: ['finance', 'sales', 'expenses', 'products', 'inventory', 'suppliers', 'employees', 'tasks', 'reports'],
  Wholesale: ['finance', 'sales', 'expenses', 'customers', 'products', 'inventory', 'suppliers', 'employees', 'tasks', 'reports'],
  Education: ['finance', 'sales', 'expenses', 'customers', 'employees', 'tasks', 'reports'],
  Healthcare: ['finance', 'sales', 'expenses', 'customers', 'inventory', 'suppliers', 'employees', 'tasks', 'reports'],
  'Professional Services': ['finance', 'sales', 'expenses', 'customers', 'employees', 'tasks', 'reports'],
  Freelancer: ['finance', 'sales', 'expenses', 'customers', 'reports', 'tasks'],
  Other: ['finance', 'sales', 'expenses', 'customers', 'products', 'employees', 'tasks', 'reports'],
};

const ALL_MODULE_IDS: BusinessModuleId[] = UNIVERSAL_MODULES.map((m) => m.id);

export function isValidBusinessCategory(val: unknown): val is BusinessCategory {
  return typeof val === 'string' && BUSINESS_CATEGORIES.some((c) => c.id === val);
}

export function isValidBusinessSize(val: unknown): val is BusinessSize {
  return typeof val === 'string' && BUSINESS_SIZES.includes(val as BusinessSize);
}

export function normalizeModuleList(list: unknown): BusinessModuleId[] {
  if (!Array.isArray(list)) return [];
  const valid = new Set<BusinessModuleId>();
  list.forEach((item) => {
    if (typeof item === 'string' && ALL_MODULE_IDS.includes(item as BusinessModuleId)) {
      valid.add(item as BusinessModuleId);
    }
  });
  return Array.from(valid);
}

export function inferCategoryFromBusinessType(businessType: string): BusinessCategory {
  const lower = (businessType || '').toLowerCase();
  if (isValidBusinessCategory(businessType)) return businessType;
  if (lower.includes('cloth') || lower.includes('apparel') || lower.includes('fashion') || lower.includes('boutique') || lower.includes('garment')) {
    return 'Clothing Store';
  }
  if (lower.includes('freelanc') || lower.includes('solo creator') || lower.includes('independent')) {
    return 'Freelancer';
  }
  if (lower.includes('restaurant') || lower.includes('food') || lower.includes('bakery') || lower.includes('kitchen') || lower.includes('cafe')) {
    return 'Restaurant';
  }
  if (lower.includes('e-comm') || lower.includes('ecommerce') || lower.includes('online') || lower.includes('d2c')) {
    return 'E-commerce';
  }
  if (lower.includes('manufactur') || lower.includes('factory') || lower.includes('fabricat')) {
    return 'Manufacturing';
  }
  if (lower.includes('wholesale') || lower.includes('distribut') || lower.includes('trader')) {
    return 'Wholesale';
  }
  if (lower.includes('educat') || lower.includes('coach') || lower.includes('academy') || lower.includes('school')) {
    return 'Education';
  }
  if (lower.includes('health') || lower.includes('clinic') || lower.includes('pharma') || lower.includes('medical') || lower.includes('wellness')) {
    return 'Healthcare';
  }
  if (lower.includes('service') || lower.includes('consult') || lower.includes('agency') || lower.includes('saas') || lower.includes('b2b')) {
    return 'Professional Services';
  }
  if (lower.includes('retail') || lower.includes('kirana') || lower.includes('store') || lower.includes('electronic') || lower.includes('hardware') || lower.includes('decor')) {
    return 'Retail';
  }
  return 'Other';
}

export function getRecommendedModulesForCategory(
  category: BusinessCategory,
  size: BusinessSize = 'Small (2-20)'
): BusinessModuleId[] {
  const base = new Set<BusinessModuleId>(CATEGORY_MODULE_MAP[category] || CATEGORY_MODULE_MAP.Other);
  if (size === 'Medium (21-100)' || size === 'Enterprise (100+)') {
    base.add('employees');
    base.add('tasks');
  }
  return ALL_MODULE_IDS.filter((id) => base.has(id));
}

export function buildDefaultBusinessConfig(params: {
  ownerId: string;
  businessId: string;
  category?: BusinessCategory;
  businessType?: string;
  businessSize?: BusinessSize;
  country?: string;
  currency?: CurrencyCode;
  businessGoals?: string[];
}): BusinessConfiguration {
  const category = params.category || inferCategoryFromBusinessType(params.businessType || '');
  const businessSize = params.businessSize || 'Small (2-20)';
  const country = params.country || 'India';
  const currency = normalizeCurrencyCode(params.currency, getDefaultCurrencyForCountry(country));
  const recommended = getRecommendedModulesForCategory(category, businessSize);
  return {
    ownerId: params.ownerId,
    businessId: params.businessId,
    category,
    businessSize,
    country,
    currency,
    businessGoals:
      params.businessGoals && params.businessGoals.length > 0
        ? params.businessGoals.slice(0, 10)
        : ['Increase Monthly Net Profit Margin', 'Track Daily Sales, COGS & Cashflow'],
    recommendedModules: recommended,
    enabledModules: [...recommended],
    autoConfigured: true,
  };
}

export function getBusinessId(profile: ShopProfile): string {
  return profile.businessId || profile.ownerId;
}

export function isViewEnabledByModules(
  view: ViewId,
  enabledModules?: BusinessModuleId[]
): boolean {
  if (!enabledModules || enabledModules.length === 0) return true;
  switch (view) {
    case 'dashboard':
    case 'insights':
    case 'setup':
    case 'billing':
      return true;
    case 'sales':
      return enabledModules.includes('sales');
    case 'products':
      return enabledModules.includes('products');
    case 'ledger':
      return (
        enabledModules.includes('finance') ||
        enabledModules.includes('sales') ||
        enabledModules.includes('expenses')
      );
    case 'customers':
      return enabledModules.includes('customers');
    case 'inventory':
      return enabledModules.includes('inventory');
    case 'employees':
      return enabledModules.includes('employees') || enabledModules.includes('tasks');
    case 'data':
      return enabledModules.includes('reports');
    default:
      return true;
  }
}
