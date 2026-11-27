export type SubscriptionPlanId = 'free' | 'starter' | 'business' | 'premium';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due';

export interface SubscriptionPlanSpec {
  id: SubscriptionPlanId;
  name: string;
  targetAudience: string;
  tagline: string;
  monthlyPriceInr: number;
  monthlyPriceUsd: number;
  maxBusinesses: number;
  monthlyAiQueries: number;
  maxTeamMembers: number;
  csvMaxRows: number;
  pdfAndWhatsappReports: boolean;
  sha256Backups: boolean;
  limitsSummary: string[];
  featured?: boolean;
}

export interface UserSubscriptionRecord {
  ownerId: string;
  planId: SubscriptionPlanId;
  status: SubscriptionStatus;
  billingInterval: 'monthly';
  currency: 'INR' | 'USD';
  stripeSessionId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  entitlementSignature?: string;
  aiMonthKey: string;
  aiQueriesUsed: number;
  updatedAtIso?: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanSpec[] = [
  {
    id: 'free',
    name: 'Free',
    targetAudience: 'For solo shops getting started',
    tagline: 'Core ledger, analytics, CSV sync & starter AI advisor for 1 business.',
    monthlyPriceInr: 0,
    monthlyPriceUsd: 0,
    maxBusinesses: 1,
    monthlyAiQueries: 15,
    maxTeamMembers: 3,
    csvMaxRows: 250,
    pdfAndWhatsappReports: true,
    sha256Backups: true,
    limitsSummary: [
      '1 active business workspace',
      '15 Gemini AI advisor / forecast queries per month',
      'Up to 3 team members in Employees & Tasks',
      'Up to 250 rows per CSV upload',
      'PDF, CSV, WhatsApp reports & SHA-256 backups',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    targetAudience: 'For growing local stores',
    tagline: 'Multi-store operations, higher AI advisory quota & expanded CSV imports.',
    monthlyPriceInr: 499,
    monthlyPriceUsd: 9,
    maxBusinesses: 3,
    monthlyAiQueries: 150,
    maxTeamMembers: 10,
    csvMaxRows: 2000,
    pdfAndWhatsappReports: true,
    sha256Backups: true,
    limitsSummary: [
      'Up to 3 separate business workspaces',
      '150 Gemini AI advisor / forecast queries per month',
      'Up to 10 team members per business',
      'Up to 2,000 rows per CSV upload',
      'All analytics, inventory alerts & CRM modules',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    targetAudience: 'For multi-outlet SMEs',
    tagline: 'Built for multi-branch owners, larger teams & frequent AI forecasting.',
    monthlyPriceInr: 1499,
    monthlyPriceUsd: 29,
    maxBusinesses: 10,
    monthlyAiQueries: 600,
    maxTeamMembers: 50,
    csvMaxRows: 5000,
    pdfAndWhatsappReports: true,
    sha256Backups: true,
    featured: true,
    limitsSummary: [
      'Up to 10 separate business workspaces',
      '600 Gemini AI advisor / forecast queries per month',
      'Up to 50 team members per business',
      'Full 5,000 rows per CSV upload',
      'Multi-currency, full P&L & period comparisons',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    targetAudience: 'For scaling chains & advisors',
    tagline: 'High-volume multi-business capacity for retail groups & business advisors.',
    monthlyPriceInr: 3499,
    monthlyPriceUsd: 69,
    maxBusinesses: 25,
    monthlyAiQueries: 2500,
    maxTeamMembers: 200,
    csvMaxRows: 5000,
    pdfAndWhatsappReports: true,
    sha256Backups: true,
    limitsSummary: [
      'Up to 25 separate business workspaces',
      '2,500 Gemini AI advisor / forecast queries per month',
      'Up to 200 team members per business',
      'Full 5,000 rows per CSV upload',
      'Priority billing & multi-tenant management',
    ],
  },
];

export function isValidPlanId(val: unknown): val is SubscriptionPlanId {
  return val === 'free' || val === 'starter' || val === 'business' || val === 'premium';
}

export function getPlanSpec(planId?: unknown): SubscriptionPlanSpec {
  const found = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
  return found || SUBSCRIPTION_PLANS[0];
}

export function getCurrentMonthKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
