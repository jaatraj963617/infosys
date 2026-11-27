import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  BusinessCategory,
  BusinessConfiguration,
  BusinessModuleId,
  BusinessSize,
  CurrencyCode,
  CustomerRecord,
  CustomerSegment,
  EmployeeRecord,
  EmployeeStatus,
  ExpenseRecord,
  InventoryItem,
  SalesRecord,
  ShopBackupFile,
  ShopBackupLog,
  ShopProfile,
  TaskPriority,
  TaskRecord,
  TaskStatus,
} from '../types/bi';
import { generateIndianSmbDemo } from './analytics';
import {
  buildDefaultBusinessConfig,
  getDefaultCurrencyForCountry,
  getRecommendedModulesForCategory,
  inferCategoryFromBusinessType,
  isValidBusinessCategory,
  isValidBusinessSize,
  normalizeCurrencyCode,
  normalizeModuleList,
} from './businessConfig';
import { isValidLogoDataUrl } from './logoUtils';

const SAFE_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;
const CONFIG_DOC_ID = 'active';

function makeSafeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const raw = `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '_');
  return raw.slice(0, 120);
}

function sanitizeText(val: string, maxLen: number): string {
  return String(val ?? '').trim().slice(0, maxLen);
}

function normalizeSegment(val: unknown): CustomerSegment {
  if (val === 'VIP' || val === 'Wholesale' || val === 'Regular' || val === 'New') {
    return val;
  }
  return 'Regular';
}

function normalizeEmployeeStatus(val: unknown): EmployeeStatus {
  if (val === 'Active' || val === 'On Leave' || val === 'Inactive') {
    return val;
  }
  return 'Active';
}

function normalizeTaskStatus(val: unknown): TaskStatus {
  if (val === 'Pending' || val === 'In Progress' || val === 'Completed') {
    return val;
  }
  return 'Pending';
}

function normalizeTaskPriority(val: unknown): TaskPriority {
  if (val === 'Low' || val === 'Medium' || val === 'High') {
    return val;
  }
  return 'Medium';
}

function mapDocToShopProfile(docId: string, d: Record<string, unknown>, fallbackUid: string): ShopProfile {
  const businessType = String(d.businessType || '');
  const category = isValidBusinessCategory(d.category)
    ? d.category
    : inferCategoryFromBusinessType(businessType);
  const businessSize = isValidBusinessSize(d.businessSize) ? d.businessSize : 'Small (2-20)';
  const country = d.country ? String(d.country) : 'India';
  const rawLogo = d.logoUrl ? String(d.logoUrl) : '';
  return {
    ownerId: String(d.ownerId || fallbackUid),
    businessId: d.businessId ? String(d.businessId) : docId,
    shopName: String(d.shopName || ''),
    ownerName: String(d.ownerName || ''),
    ownerEmail: String(d.ownerEmail || ''),
    ownerPhone: d.ownerPhone ? String(d.ownerPhone) : '',
    businessType,
    category,
    businessSize,
    country,
    currency: normalizeCurrencyCode(d.currency, 'INR'),
    address: d.address ? String(d.address) : '',
    city: String(d.city || ''),
    gstin: d.gstin ? String(d.gstin) : '',
    whatsappNumber: d.whatsappNumber ? String(d.whatsappNumber) : '',
    logoUrl: isValidLogoDataUrl(rawLogo) ? rawLogo : '',
    dataSource: d.dataSource === 'demo' || d.dataSource === 'live' ? d.dataSource : undefined,
  };
}

function buildSalePayload(uid: string, sale: Omit<SalesRecord, 'id'>) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sale.Date)
    ? sale.Date
    : new Date().toISOString().slice(0, 10);
  const qty = Math.max(1, Math.min(1000000, Math.round(Number(sale.Quantity) || 1)));
  const revenue = Math.max(0, Math.min(1000000000, Number(sale.Revenue) || 0));
  const cost = Math.max(0, Math.min(1000000000, Number(sale.Cost) || 0));
  const profit = Math.max(-1000000000, Math.min(1000000000, revenue - cost));
  const customerId = sale.customerId && SAFE_ID_RE.test(sale.customerId) ? sale.customerId : '';
  const customerName = sanitizeText(sale.customerName || '', 120);

  const payload: Record<string, unknown> = {
    ownerId: uid,
    Date: date,
    Product: sanitizeText(sale.Product, 140) || 'Unnamed Product',
    Category: sanitizeText(sale.Category, 80) || 'General',
    Quantity: qty,
    Revenue: revenue,
    Cost: cost,
    Profit: profit,
    Region: sanitizeText(sale.Region, 80) || 'India',
    PaymentMode: sanitizeText(sale.PaymentMode || 'UPI', 40) || 'UPI',
    createdAt: serverTimestamp(),
  };

  if (customerId) {
    payload.customerId = customerId;
  }
  if (customerName) {
    payload.customerName = customerName;
  }
  return payload;
}

function buildExpensePayload(uid: string, expense: Omit<ExpenseRecord, 'id'>) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(expense.Date)
    ? expense.Date
    : new Date().toISOString().slice(0, 10);
  const amount = Math.max(0.01, Math.min(1000000000, Number(expense.Amount) || 0.01));
  const notes = sanitizeText(expense.Notes || '', 240);

  const payload: Record<string, unknown> = {
    ownerId: uid,
    Date: date,
    Title: sanitizeText(expense.Title, 140) || 'Operating Expense',
    Category: sanitizeText(expense.Category, 80) || 'Other Operating',
    Amount: amount,
    PaymentMode: sanitizeText(expense.PaymentMode || 'UPI', 40) || 'UPI',
    createdAt: serverTimestamp(),
  };
  if (notes) {
    payload.Notes = notes;
  }
  return payload;
}

function buildInventoryPayload(uid: string, item: Omit<InventoryItem, 'id'>) {
  return {
    ownerId: uid,
    sku: sanitizeText(item.sku, 40).toUpperCase() || 'SKU-01',
    name: sanitizeText(item.name, 140) || 'Product',
    category: sanitizeText(item.category, 80) || 'General',
    stock: Math.max(0, Math.min(10000000, Math.round(Number(item.stock) || 0))),
    reorderLevel: Math.max(1, Math.min(1000000, Math.round(Number(item.reorderLevel) || 5))),
    unitPrice: Math.max(0.01, Math.min(100000000, Number(item.unitPrice) || 1)),
    unitCost: Math.max(0, Math.min(100000000, Number(item.unitCost) || 0)),
    supplier: sanitizeText(item.supplier, 120) || 'Direct Supplier',
    updatedAt: serverTimestamp(),
  };
}

function buildCustomerPayload(uid: string, customer: Omit<CustomerRecord, 'id'>) {
  const cleanName = sanitizeText(customer.name, 120);
  const cleanPhone = sanitizeText(customer.phone, 20);
  const cleanEmail = sanitizeText(customer.email || '', 160);
  const cleanCity = sanitizeText(customer.city, 80) || 'India';
  const cleanNotes = sanitizeText(customer.notes || '', 240);
  const lastPurchaseDate =
    customer.lastPurchaseDate && /^\d{4}-\d{2}-\d{2}$/.test(customer.lastPurchaseDate)
      ? customer.lastPurchaseDate
      : '';

  const payload: Record<string, unknown> = {
    ownerId: uid,
    name: cleanName.length >= 2 ? cleanName : 'Customer',
    phone: cleanPhone.length >= 7 ? cleanPhone : '+91 0000000000',
    city: cleanCity,
    segment: normalizeSegment(customer.segment),
    totalOrders: Math.max(0, Math.min(1000000, Math.round(Number(customer.totalOrders) || 0))),
    totalSpent: Math.max(0, Math.min(1000000000, Number(customer.totalSpent) || 0)),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (cleanEmail) payload.email = cleanEmail;
  if (cleanNotes) payload.notes = cleanNotes;
  if (lastPurchaseDate) payload.lastPurchaseDate = lastPurchaseDate;

  return payload;
}

function buildEmployeePayload(uid: string, employee: Omit<EmployeeRecord, 'id'>) {
  const cleanName = sanitizeText(employee.name, 100);
  const cleanRole = sanitizeText(employee.role, 80);
  const cleanDept = sanitizeText(employee.department || '', 80);
  const cleanPhone = sanitizeText(employee.phone || '', 20);
  const cleanEmail = sanitizeText(employee.email || '', 160);
  const joinedDate =
    employee.joinedDate && /^\d{4}-\d{2}-\d{2}$/.test(employee.joinedDate)
      ? employee.joinedDate
      : '';

  const payload: Record<string, unknown> = {
    ownerId: uid,
    name: cleanName.length >= 2 ? cleanName : 'Team Member',
    role: cleanRole.length >= 2 ? cleanRole : 'Staff',
    monthlySalary: Math.max(0, Math.min(100000000, Number(employee.monthlySalary) || 0)),
    status: normalizeEmployeeStatus(employee.status),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (cleanDept) payload.department = cleanDept;
  if (cleanPhone) payload.phone = cleanPhone;
  if (cleanEmail) payload.email = cleanEmail;
  if (joinedDate) payload.joinedDate = joinedDate;

  return payload;
}

function buildTaskPayload(uid: string, task: Omit<TaskRecord, 'id'>) {
  const cleanTitle = sanitizeText(task.title, 140);
  const cleanDescription = sanitizeText(task.description || '', 400);
  const cleanAssigneeId =
    task.assigneeId && SAFE_ID_RE.test(task.assigneeId) ? task.assigneeId : '';
  const cleanAssigneeName = sanitizeText(task.assigneeName || '', 100);
  const cleanDueDate =
    task.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate) ? task.dueDate : '';

  const payload: Record<string, unknown> = {
    ownerId: uid,
    title: cleanTitle.length >= 2 ? cleanTitle : 'Untitled Task',
    status: normalizeTaskStatus(task.status),
    priority: normalizeTaskPriority(task.priority),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (cleanDescription) payload.description = cleanDescription;
  if (cleanAssigneeId) payload.assigneeId = cleanAssigneeId;
  if (cleanAssigneeName) payload.assigneeName = cleanAssigneeName;
  if (cleanDueDate) payload.dueDate = cleanDueDate;

  return payload;
}

export async function fetchUserBusinesses(uid: string): Promise<ShopProfile[]> {
  const path = 'shops';
  try {
    const q = query(collection(db, 'shops'), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    const profiles = snap.docs.map((d) => mapDocToShopProfile(d.id, d.data(), uid));

    if (profiles.length === 0) {
      const legacySnap = await getDoc(doc(db, 'shops', uid));
      if (legacySnap.exists()) {
        profiles.push(mapDocToShopProfile(legacySnap.id, legacySnap.data(), uid));
      }
    }

    return profiles.sort((a, b) => {
      if ((a.businessId || a.ownerId) === uid) return -1;
      if ((b.businessId || b.ownerId) === uid) return 1;
      return a.shopName.localeCompare(b.shopName);
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function fetchShopProfile(uid: string, businessId?: string): Promise<ShopProfile | null> {
  const targetId = businessId || uid;
  const path = `shops/${targetId}`;
  try {
    const snap = await getDoc(doc(db, 'shops', targetId));
    if (!snap.exists()) return null;
    return mapDocToShopProfile(snap.id, snap.data(), uid);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function fetchBusinessConfig(
  uid: string,
  businessId: string,
  fallbackProfile?: ShopProfile
): Promise<BusinessConfiguration> {
  const path = `shops/${businessId}/config/${CONFIG_DOC_ID}`;
  try {
    const snap = await getDoc(doc(db, 'shops', businessId, 'config', CONFIG_DOC_ID));
    if (snap.exists()) {
      const d = snap.data();
      const category = isValidBusinessCategory(d.category)
        ? d.category
        : inferCategoryFromBusinessType(fallbackProfile?.businessType || '');
      const businessSize = isValidBusinessSize(d.businessSize) ? d.businessSize : 'Small (2-20)';
      const recommendedModules = normalizeModuleList(d.recommendedModules);
      const enabledModules = normalizeModuleList(d.enabledModules);
      const fallbackRecommended = getRecommendedModulesForCategory(category, businessSize);
      const ts = d.updatedAt?.toDate ? d.updatedAt.toDate() : null;

      return {
        ownerId: String(d.ownerId || uid),
        businessId: String(d.businessId || businessId),
        category,
        businessSize,
        country: String(d.country || fallbackProfile?.country || 'India'),
        currency: normalizeCurrencyCode(d.currency, fallbackProfile?.currency || 'INR'),
        businessGoals: Array.isArray(d.businessGoals)
          ? d.businessGoals.map((g) => sanitizeText(String(g), 100)).filter(Boolean).slice(0, 10)
          : [],
        recommendedModules: recommendedModules.length > 0 ? recommendedModules : fallbackRecommended,
        enabledModules: enabledModules.length > 0 ? enabledModules : fallbackRecommended,
        autoConfigured: Boolean(d.autoConfigured),
        updatedAtIso: ts ? ts.toISOString() : undefined,
      };
    }

    const derived = buildDefaultBusinessConfig({
      ownerId: uid,
      businessId,
      category: fallbackProfile?.category,
      businessType: fallbackProfile?.businessType,
      businessSize: fallbackProfile?.businessSize,
      country: fallbackProfile?.country || 'India',
      currency: fallbackProfile?.currency,
    });

    await setDoc(doc(db, 'shops', businessId, 'config', CONFIG_DOC_ID), {
      ownerId: uid,
      businessId,
      category: derived.category,
      businessSize: derived.businessSize,
      country: derived.country,
      currency: derived.currency,
      businessGoals: derived.businessGoals,
      recommendedModules: derived.recommendedModules,
      enabledModules: derived.enabledModules,
      autoConfigured: derived.autoConfigured,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return derived;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function saveBusinessConfig(
  uid: string,
  businessId: string,
  input: {
    category: BusinessCategory;
    businessSize: BusinessSize;
    country: string;
    currency?: CurrencyCode;
    businessGoals: string[];
    enabledModules: BusinessModuleId[];
    autoConfigured?: boolean;
  }
): Promise<BusinessConfiguration> {
  if (!SAFE_ID_RE.test(businessId)) throw new Error('Invalid business workspace ID.');
  const path = `shops/${businessId}/config/${CONFIG_DOC_ID}`;
  const category = isValidBusinessCategory(input.category) ? input.category : 'Other';
  const businessSize = isValidBusinessSize(input.businessSize) ? input.businessSize : 'Small (2-20)';
  const country = sanitizeText(input.country || 'India', 60) || 'India';
  const currency = normalizeCurrencyCode(input.currency, getDefaultCurrencyForCountry(country));
  const recommendedModules = getRecommendedModulesForCategory(category, businessSize);
  const cleanEnabled = normalizeModuleList(input.enabledModules);
  const enabledModules = cleanEnabled.length > 0 ? cleanEnabled : [...recommendedModules];
  const businessGoals = input.businessGoals
    .map((g) => sanitizeText(g, 100))
    .filter(Boolean)
    .slice(0, 10);
  const autoConfigured = input.autoConfigured ?? false;

  const docRef = doc(db, 'shops', businessId, 'config', CONFIG_DOC_ID);
  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      await updateDoc(docRef, {
        category,
        businessSize,
        country,
        currency,
        businessGoals,
        recommendedModules,
        enabledModules,
        autoConfigured,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        ownerId: uid,
        businessId,
        category,
        businessSize,
        country,
        currency,
        businessGoals,
        recommendedModules,
        enabledModules,
        autoConfigured,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Keep summary category/size/country/currency mirrored on the business profile for quick switching & AI context
    try {
      await updateDoc(doc(db, 'shops', businessId), {
        category,
        businessSize,
        country,
        currency,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Non-fatal mirror sync
    }

    return {
      ownerId: uid,
      businessId,
      category,
      businessSize,
      country,
      currency,
      businessGoals,
      recommendedModules,
      enabledModules,
      autoConfigured,
      updatedAtIso: new Date().toISOString(),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function createBusinessWorkspace(
  uid: string,
  ownerEmail: string,
  input: {
    shopName: string;
    ownerName: string;
    ownerPhone?: string;
    businessType?: string;
    category: BusinessCategory;
    businessSize: BusinessSize;
    country?: string;
    currency?: CurrencyCode;
    address?: string;
    city: string;
    gstin?: string;
    whatsappNumber?: string;
    logoUrl?: string;
    businessGoals?: string[];
    enabledModules?: BusinessModuleId[];
    preloadDemo?: boolean;
    isFirstBusiness?: boolean;
  }
): Promise<{ profile: ShopProfile; config: BusinessConfiguration }> {
  const businessId = input.isFirstBusiness ? uid : makeSafeDocId('biz');
  const path = `shops/${businessId}`;
  const cleanGstin = sanitizeText(input.gstin || '', 20);
  const cleanWhatsapp = sanitizeText(input.whatsappNumber || '', 20);
  const cleanOwnerPhone = sanitizeText(input.ownerPhone || '', 20);
  const cleanAddress = sanitizeText(input.address || '', 200);
  const cleanLogo = isValidLogoDataUrl(input.logoUrl) ? input.logoUrl : '';
  const dataSource: 'demo' | 'live' = input.preloadDemo ? 'demo' : 'live';
  const category = isValidBusinessCategory(input.category) ? input.category : 'Other';
  const businessSize = isValidBusinessSize(input.businessSize) ? input.businessSize : 'Small (2-20)';
  const country = sanitizeText(input.country || 'India', 60) || 'India';
  const currency = normalizeCurrencyCode(input.currency, getDefaultCurrencyForCountry(country));
  const businessType = sanitizeText(input.businessType || category, 80) || category;

  const profile: ShopProfile = {
    ownerId: uid,
    businessId,
    shopName: sanitizeText(input.shopName, 100),
    ownerName: sanitizeText(input.ownerName, 100),
    ownerEmail: sanitizeText(ownerEmail, 160),
    businessType,
    category,
    businessSize,
    country,
    currency,
    city: sanitizeText(input.city, 80),
    dataSource,
    ...(cleanOwnerPhone ? { ownerPhone: cleanOwnerPhone } : {}),
    ...(cleanAddress ? { address: cleanAddress } : {}),
    ...(cleanGstin ? { gstin: cleanGstin } : {}),
    ...(cleanWhatsapp ? { whatsappNumber: cleanWhatsapp } : {}),
    ...(cleanLogo ? { logoUrl: cleanLogo } : {}),
  };

  try {
    await setDoc(doc(db, 'shops', businessId), {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }

  const defaultConfig = buildDefaultBusinessConfig({
    ownerId: uid,
    businessId,
    category,
    businessType,
    businessSize,
    country,
    currency,
    businessGoals: input.businessGoals,
  });

  const cleanEnabled = normalizeModuleList(input.enabledModules);
  const finalEnabled = cleanEnabled.length > 0 ? cleanEnabled : defaultConfig.enabledModules;

  const configPath = `shops/${businessId}/config/${CONFIG_DOC_ID}`;
  try {
    await setDoc(doc(db, 'shops', businessId, 'config', CONFIG_DOC_ID), {
      ownerId: uid,
      businessId,
      category: defaultConfig.category,
      businessSize: defaultConfig.businessSize,
      country: defaultConfig.country,
      currency: defaultConfig.currency,
      businessGoals: defaultConfig.businessGoals,
      recommendedModules: defaultConfig.recommendedModules,
      enabledModules: finalEnabled,
      autoConfigured: cleanEnabled.length === 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, configPath);
  }

  if (input.preloadDemo) {
    await seedShopDemoData(uid, businessId, false);
  }

  return {
    profile,
    config: {
      ...defaultConfig,
      enabledModules: finalEnabled,
      autoConfigured: cleanEnabled.length === 0,
      updatedAtIso: new Date().toISOString(),
    },
  };
}

export async function createShopProfile(
  uid: string,
  ownerEmail: string,
  input: {
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
    businessGoals?: string[];
    enabledModules?: BusinessModuleId[];
    preloadDemo?: boolean;
  }
): Promise<ShopProfile> {
  const category = input.category || inferCategoryFromBusinessType(input.businessType);
  const res = await createBusinessWorkspace(uid, ownerEmail, {
    ...input,
    category,
    businessSize: input.businessSize || 'Small (2-20)',
    isFirstBusiness: true,
  });
  return res.profile;
}

export async function updateShopProfile(
  businessId: string,
  currentProfile: ShopProfile,
  patch: {
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
    dataSource?: 'demo' | 'live';
  }
): Promise<ShopProfile> {
  const path = `shops/${businessId}`;
  const cleanGstin = sanitizeText(patch.gstin || '', 20);
  const cleanWhatsapp = sanitizeText(
    patch.whatsappNumber !== undefined ? patch.whatsappNumber : currentProfile.whatsappNumber || '',
    20
  );
  const cleanOwnerPhone = sanitizeText(
    patch.ownerPhone !== undefined ? patch.ownerPhone : currentProfile.ownerPhone || '',
    20
  );
  const cleanAddress = sanitizeText(
    patch.address !== undefined ? patch.address : currentProfile.address || '',
    200
  );
  const rawLogo = patch.logoUrl !== undefined ? patch.logoUrl : currentProfile.logoUrl || '';
  const cleanLogo = isValidLogoDataUrl(rawLogo) ? rawLogo : '';
  const nextSource = patch.dataSource ?? currentProfile.dataSource ?? 'live';
  const nextCategory = patch.category ?? currentProfile.category ?? inferCategoryFromBusinessType(patch.businessType);
  const nextSize = patch.businessSize ?? currentProfile.businessSize ?? 'Small (2-20)';
  const nextCountry = sanitizeText(patch.country ?? currentProfile.country ?? 'India', 60) || 'India';
  const nextCurrency = normalizeCurrencyCode(
    patch.currency ?? currentProfile.currency,
    getDefaultCurrencyForCountry(nextCountry)
  );

  const updated: ShopProfile = {
    ...currentProfile,
    businessId,
    shopName: sanitizeText(patch.shopName, 100),
    ownerName: sanitizeText(patch.ownerName, 100),
    ownerPhone: cleanOwnerPhone,
    businessType: sanitizeText(patch.businessType, 80),
    category: nextCategory,
    businessSize: nextSize,
    country: nextCountry,
    currency: nextCurrency,
    address: cleanAddress,
    city: sanitizeText(patch.city, 80),
    gstin: cleanGstin,
    whatsappNumber: cleanWhatsapp,
    logoUrl: cleanLogo,
    dataSource: nextSource,
  };

  try {
    await updateDoc(doc(db, 'shops', businessId), {
      businessId,
      shopName: updated.shopName,
      ownerName: updated.ownerName,
      ownerPhone: cleanOwnerPhone,
      businessType: updated.businessType,
      category: nextCategory,
      businessSize: nextSize,
      country: nextCountry,
      currency: nextCurrency,
      address: cleanAddress,
      city: updated.city,
      gstin: cleanGstin,
      whatsappNumber: cleanWhatsapp,
      logoUrl: cleanLogo,
      dataSource: nextSource,
      updatedAt: serverTimestamp(),
    });

    // Mirror country & currency into config/active if present so both docs stay synchronized
    try {
      const cfgRef = doc(db, 'shops', businessId, 'config', CONFIG_DOC_ID);
      const cfgSnap = await getDoc(cfgRef);
      if (cfgSnap.exists()) {
        await updateDoc(cfgRef, {
          country: nextCountry,
          currency: nextCurrency,
          updatedAt: serverTimestamp(),
        });
      }
    } catch {
      // Non-fatal mirror sync
    }

    return updated;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function markShopDataSource(businessId: string, dataSource: 'demo' | 'live'): Promise<void> {
  const path = `shops/${businessId}`;
  try {
    await updateDoc(doc(db, 'shops', businessId), {
      dataSource,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeShopData(
  uid: string,
  businessId: string,
  handlers: {
    onSales: (sales: SalesRecord[]) => void;
    onExpenses: (expenses: ExpenseRecord[]) => void;
    onInventory: (inventory: InventoryItem[]) => void;
    onCustomers: (customers: CustomerRecord[]) => void;
    onEmployees?: (employees: EmployeeRecord[]) => void;
    onTasks?: (tasks: TaskRecord[]) => void;
    onBackups: (backups: ShopBackupLog[]) => void;
  },
  onError: (err: unknown) => void
): () => void {
  const unsubs: Unsubscribe[] = [];

  const salesPath = `shops/${businessId}/sales`;
  const salesQ = query(collection(db, 'shops', businessId, 'sales'), where('ownerId', '==', uid));
  unsubs.push(
    onSnapshot(
      salesQ,
      (snap) => {
        const rows: SalesRecord[] = snap.docs
          .map((d) => {
            const data = d.data();
            const rev = Number(data.Revenue) || 0;
            const cost = Number(data.Cost) || 0;
            return {
              id: d.id,
              Date: String(data.Date || ''),
              Product: String(data.Product || ''),
              Category: String(data.Category || 'General'),
              Quantity: Number(data.Quantity) || 1,
              Revenue: rev,
              Cost: cost,
              Profit: Number.isFinite(Number(data.Profit)) ? Number(data.Profit) : rev - cost,
              Region: String(data.Region || 'India'),
              PaymentMode: String(data.PaymentMode || 'UPI'),
              customerId: data.customerId ? String(data.customerId) : undefined,
              customerName: data.customerName ? String(data.customerName) : undefined,
            };
          })
          .sort((a, b) => a.Date.localeCompare(b.Date));
        handlers.onSales(rows);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, salesPath);
        } catch (wrapped) {
          onError(wrapped);
        }
      }
    )
  );

  const expPath = `shops/${businessId}/expenses`;
  const expQ = query(collection(db, 'shops', businessId, 'expenses'), where('ownerId', '==', uid));
  unsubs.push(
    onSnapshot(
      expQ,
      (snap) => {
        const rows: ExpenseRecord[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              Date: String(data.Date || ''),
              Title: String(data.Title || ''),
              Category: String(data.Category || 'Other Operating'),
              Amount: Number(data.Amount) || 0,
              PaymentMode: String(data.PaymentMode || 'UPI'),
              Notes: data.Notes ? String(data.Notes) : undefined,
            };
          })
          .sort((a, b) => a.Date.localeCompare(b.Date));
        handlers.onExpenses(rows);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, expPath);
        } catch (wrapped) {
          onError(wrapped);
        }
      }
    )
  );

  const invPath = `shops/${businessId}/inventory`;
  const invQ = query(collection(db, 'shops', businessId, 'inventory'), where('ownerId', '==', uid));
  unsubs.push(
    onSnapshot(
      invQ,
      (snap) => {
        const rows: InventoryItem[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              sku: String(data.sku || ''),
              name: String(data.name || ''),
              category: String(data.category || 'General'),
              stock: Number(data.stock) || 0,
              reorderLevel: Number(data.reorderLevel) || 5,
              unitPrice: Number(data.unitPrice) || 0,
              unitCost: Number(data.unitCost) || 0,
              supplier: String(data.supplier || ''),
            };
          })
          .sort((a, b) => a.sku.localeCompare(b.sku));
        handlers.onInventory(rows);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, invPath);
        } catch (wrapped) {
          onError(wrapped);
        }
      }
    )
  );

  const custPath = `shops/${businessId}/customers`;
  const custQ = query(collection(db, 'shops', businessId, 'customers'), where('ownerId', '==', uid));
  unsubs.push(
    onSnapshot(
      custQ,
      (snap) => {
        const rows: CustomerRecord[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: String(data.name || ''),
              phone: String(data.phone || ''),
              email: data.email ? String(data.email) : undefined,
              city: String(data.city || ''),
              segment: normalizeSegment(data.segment),
              notes: data.notes ? String(data.notes) : undefined,
              totalOrders: Number(data.totalOrders) || 0,
              totalSpent: Number(data.totalSpent) || 0,
              lastPurchaseDate: data.lastPurchaseDate ? String(data.lastPurchaseDate) : undefined,
            };
          })
          .sort((a, b) => b.totalSpent - a.totalSpent || a.name.localeCompare(b.name));
        handlers.onCustomers(rows);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, custPath);
        } catch (wrapped) {
          onError(wrapped);
        }
      }
    )
  );

  const backupsPath = `shops/${businessId}/backups`;
  const backupsQ = query(collection(db, 'shops', businessId, 'backups'), where('ownerId', '==', uid));
  unsubs.push(
    onSnapshot(
      backupsQ,
      (snap) => {
        const rows: ShopBackupLog[] = snap.docs
          .map((d) => {
            const data = d.data();
            const ts = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
            return {
              id: d.id,
              label: String(data.label || 'Backup'),
              salesCount: Number(data.salesCount) || 0,
              expensesCount: Number(data.expensesCount) || 0,
              inventoryCount: Number(data.inventoryCount) || 0,
              customersCount: data.customersCount !== undefined ? Number(data.customersCount) : undefined,
              checksum: String(data.checksum || ''),
              snapshotSizeKb: Number(data.snapshotSizeKb) || 0,
              createdAtIso: ts.toISOString(),
            };
          })
          .sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
        handlers.onBackups(rows);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, backupsPath);
        } catch (wrapped) {
          onError(wrapped);
        }
      }
    )
  );

  if (handlers.onEmployees) {
    const empPath = `shops/${businessId}/employees`;
    const empQ = query(collection(db, 'shops', businessId, 'employees'), where('ownerId', '==', uid));
    unsubs.push(
      onSnapshot(
        empQ,
        (snap) => {
          const rows: EmployeeRecord[] = snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                name: String(data.name || ''),
                role: String(data.role || ''),
                department: data.department ? String(data.department) : undefined,
                phone: data.phone ? String(data.phone) : undefined,
                email: data.email ? String(data.email) : undefined,
                monthlySalary: Number(data.monthlySalary) || 0,
                status: normalizeEmployeeStatus(data.status),
                joinedDate: data.joinedDate ? String(data.joinedDate) : undefined,
              };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
          handlers.onEmployees?.(rows);
        },
        (err) => {
          try {
            handleFirestoreError(err, OperationType.LIST, empPath);
          } catch (wrapped) {
            onError(wrapped);
          }
        }
      )
    );
  }

  if (handlers.onTasks) {
    const taskPath = `shops/${businessId}/tasks`;
    const taskQ = query(collection(db, 'shops', businessId, 'tasks'), where('ownerId', '==', uid));
    unsubs.push(
      onSnapshot(
        taskQ,
        (snap) => {
          const rows: TaskRecord[] = snap.docs
            .map((d) => {
              const data = d.data();
              const createdTs = data.createdAt?.toDate ? data.createdAt.toDate() : null;
              const updatedTs = data.updatedAt?.toDate ? data.updatedAt.toDate() : null;
              return {
                id: d.id,
                title: String(data.title || ''),
                description: data.description ? String(data.description) : undefined,
                status: normalizeTaskStatus(data.status),
                priority: normalizeTaskPriority(data.priority),
                assigneeId: data.assigneeId ? String(data.assigneeId) : undefined,
                assigneeName: data.assigneeName ? String(data.assigneeName) : undefined,
                dueDate: data.dueDate ? String(data.dueDate) : undefined,
                createdAtIso: createdTs ? createdTs.toISOString() : undefined,
                updatedAtIso: updatedTs ? updatedTs.toISOString() : undefined,
              };
            })
            .sort((a, b) => (b.updatedAtIso || '').localeCompare(a.updatedAtIso || ''));
          handlers.onTasks?.(rows);
        },
        (err) => {
          try {
            handleFirestoreError(err, OperationType.LIST, taskPath);
          } catch (wrapped) {
            onError(wrapped);
          }
        }
      )
    );
  }

  return () => {
    unsubs.forEach((fn) => fn());
  };
}

export async function addShopSale(
  uid: string,
  businessId: string,
  sale: Omit<SalesRecord, 'id'>
): Promise<string> {
  const saleId = makeSafeDocId('sale');
  const path = `shops/${businessId}/sales/${saleId}`;
  try {
    await setDoc(doc(db, 'shops', businessId, 'sales', saleId), buildSalePayload(uid, sale));
    if (sale.customerId && SAFE_ID_RE.test(sale.customerId)) {
      try {
        await updateDoc(doc(db, 'shops', businessId, 'customers', sale.customerId), {
          totalOrders: increment(1),
          totalSpent: increment(Math.max(0, Number(sale.Revenue) || 0)),
          lastPurchaseDate: /^\d{4}-\d{2}-\d{2}$/.test(sale.Date)
            ? sale.Date
            : new Date().toISOString().slice(0, 10),
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Ignore if linked customer was removed in the meantime
      }
    }
    return saleId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteShopSale(businessId: string, saleId: string): Promise<void> {
  if (!SAFE_ID_RE.test(saleId)) throw new Error('Invalid sale ID.');
  const path = `shops/${businessId}/sales/${saleId}`;
  try {
    await deleteDoc(doc(db, 'shops', businessId, 'sales', saleId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function addShopExpense(
  uid: string,
  businessId: string,
  expense: Omit<ExpenseRecord, 'id'>
): Promise<string> {
  const expenseId = makeSafeDocId('exp');
  const path = `shops/${businessId}/expenses/${expenseId}`;
  try {
    await setDoc(doc(db, 'shops', businessId, 'expenses', expenseId), buildExpensePayload(uid, expense));
    return expenseId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteShopExpense(businessId: string, expenseId: string): Promise<void> {
  if (!SAFE_ID_RE.test(expenseId)) throw new Error('Invalid expense ID.');
  const path = `shops/${businessId}/expenses/${expenseId}`;
  try {
    await deleteDoc(doc(db, 'shops', businessId, 'expenses', expenseId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function addShopInventoryItem(
  uid: string,
  businessId: string,
  item: Omit<InventoryItem, 'id'>
): Promise<string> {
  const itemId = makeSafeDocId('inv');
  const path = `shops/${businessId}/inventory/${itemId}`;
  try {
    await setDoc(doc(db, 'shops', businessId, 'inventory', itemId), buildInventoryPayload(uid, item));
    return itemId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateShopInventoryItem(
  businessId: string,
  itemId: string,
  patch: Partial<
    Pick<InventoryItem, 'stock' | 'reorderLevel' | 'unitPrice' | 'unitCost' | 'supplier' | 'name' | 'category'>
  >
): Promise<void> {
  if (!SAFE_ID_RE.test(itemId)) throw new Error('Invalid inventory item ID.');
  const path = `shops/${businessId}/inventory/${itemId}`;
  const cleanPatch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (patch.stock !== undefined) {
    cleanPatch.stock = Math.max(0, Math.min(10000000, Math.round(patch.stock)));
  }
  if (patch.reorderLevel !== undefined) {
    cleanPatch.reorderLevel = Math.max(1, Math.min(1000000, Math.round(patch.reorderLevel)));
  }
  if (patch.unitPrice !== undefined) {
    cleanPatch.unitPrice = Math.max(0.01, Math.min(100000000, patch.unitPrice));
  }
  if (patch.unitCost !== undefined) {
    cleanPatch.unitCost = Math.max(0, Math.min(100000000, patch.unitCost));
  }
  if (patch.supplier !== undefined) {
    cleanPatch.supplier = sanitizeText(patch.supplier, 120) || 'Direct Supplier';
  }
  if (patch.name !== undefined) {
    cleanPatch.name = sanitizeText(patch.name, 140) || 'Product';
  }
  if (patch.category !== undefined) {
    cleanPatch.category = sanitizeText(patch.category, 80) || 'General';
  }

  try {
    await updateDoc(doc(db, 'shops', businessId, 'inventory', itemId), cleanPatch);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteShopInventoryItem(businessId: string, itemId: string): Promise<void> {
  if (!SAFE_ID_RE.test(itemId)) throw new Error('Invalid inventory item ID.');
  const path = `shops/${businessId}/inventory/${itemId}`;
  try {
    await deleteDoc(doc(db, 'shops', businessId, 'inventory', itemId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function addShopCustomer(
  uid: string,
  businessId: string,
  customer: Omit<CustomerRecord, 'id'>
): Promise<string> {
  const customerId = makeSafeDocId('cust');
  const path = `shops/${businessId}/customers/${customerId}`;
  try {
    await setDoc(doc(db, 'shops', businessId, 'customers', customerId), buildCustomerPayload(uid, customer));
    return customerId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateShopCustomer(
  businessId: string,
  customerId: string,
  patch: Partial<Pick<CustomerRecord, 'name' | 'phone' | 'email' | 'city' | 'segment' | 'notes'>>
): Promise<void> {
  if (!SAFE_ID_RE.test(customerId)) throw new Error('Invalid customer ID.');
  const path = `shops/${businessId}/customers/${customerId}`;
  const cleanPatch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (patch.name !== undefined) cleanPatch.name = sanitizeText(patch.name, 120);
  if (patch.phone !== undefined) cleanPatch.phone = sanitizeText(patch.phone, 20);
  if (patch.email !== undefined) cleanPatch.email = sanitizeText(patch.email, 160);
  if (patch.city !== undefined) cleanPatch.city = sanitizeText(patch.city, 80);
  if (patch.segment !== undefined) cleanPatch.segment = normalizeSegment(patch.segment);
  if (patch.notes !== undefined) cleanPatch.notes = sanitizeText(patch.notes, 240);

  try {
    await updateDoc(doc(db, 'shops', businessId, 'customers', customerId), cleanPatch);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteShopCustomer(businessId: string, customerId: string): Promise<void> {
  if (!SAFE_ID_RE.test(customerId)) throw new Error('Invalid customer ID.');
  const path = `shops/${businessId}/customers/${customerId}`;
  try {
    await deleteDoc(doc(db, 'shops', businessId, 'customers', customerId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function addShopEmployee(
  uid: string,
  businessId: string,
  employee: Omit<EmployeeRecord, 'id'>
): Promise<string> {
  const employeeId = makeSafeDocId('emp');
  const path = `shops/${businessId}/employees/${employeeId}`;
  try {
    await setDoc(doc(db, 'shops', businessId, 'employees', employeeId), buildEmployeePayload(uid, employee));
    return employeeId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateShopEmployee(
  businessId: string,
  employeeId: string,
  patch: Partial<
    Pick<
      EmployeeRecord,
      'name' | 'role' | 'department' | 'phone' | 'email' | 'monthlySalary' | 'status' | 'joinedDate'
    >
  >
): Promise<void> {
  if (!SAFE_ID_RE.test(employeeId)) throw new Error('Invalid employee ID.');
  const path = `shops/${businessId}/employees/${employeeId}`;
  const cleanPatch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (patch.name !== undefined) {
    const cleaned = sanitizeText(patch.name, 100);
    cleanPatch.name = cleaned.length >= 2 ? cleaned : 'Team Member';
  }
  if (patch.role !== undefined) {
    const cleaned = sanitizeText(patch.role, 80);
    cleanPatch.role = cleaned.length >= 2 ? cleaned : 'Staff';
  }
  if (patch.department !== undefined) cleanPatch.department = sanitizeText(patch.department, 80);
  if (patch.phone !== undefined) cleanPatch.phone = sanitizeText(patch.phone, 20);
  if (patch.email !== undefined) cleanPatch.email = sanitizeText(patch.email, 160);
  if (patch.monthlySalary !== undefined) {
    cleanPatch.monthlySalary = Math.max(0, Math.min(100000000, Number(patch.monthlySalary) || 0));
  }
  if (patch.status !== undefined) cleanPatch.status = normalizeEmployeeStatus(patch.status);
  if (patch.joinedDate !== undefined) {
    cleanPatch.joinedDate = /^\d{4}-\d{2}-\d{2}$/.test(patch.joinedDate) ? patch.joinedDate : '';
  }

  try {
    await updateDoc(doc(db, 'shops', businessId, 'employees', employeeId), cleanPatch);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteShopEmployee(businessId: string, employeeId: string): Promise<void> {
  if (!SAFE_ID_RE.test(employeeId)) throw new Error('Invalid employee ID.');
  const path = `shops/${businessId}/employees/${employeeId}`;
  try {
    await deleteDoc(doc(db, 'shops', businessId, 'employees', employeeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function addShopTask(
  uid: string,
  businessId: string,
  task: Omit<TaskRecord, 'id'>
): Promise<string> {
  const taskId = makeSafeDocId('task');
  const path = `shops/${businessId}/tasks/${taskId}`;
  try {
    await setDoc(doc(db, 'shops', businessId, 'tasks', taskId), buildTaskPayload(uid, task));
    return taskId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateShopTask(
  businessId: string,
  taskId: string,
  patch: Partial<
    Pick<TaskRecord, 'title' | 'description' | 'status' | 'priority' | 'assigneeId' | 'assigneeName' | 'dueDate'>
  >
): Promise<void> {
  if (!SAFE_ID_RE.test(taskId)) throw new Error('Invalid task ID.');
  const path = `shops/${businessId}/tasks/${taskId}`;
  const cleanPatch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (patch.title !== undefined) {
    const cleaned = sanitizeText(patch.title, 140);
    cleanPatch.title = cleaned.length >= 2 ? cleaned : 'Untitled Task';
  }
  if (patch.description !== undefined) cleanPatch.description = sanitizeText(patch.description, 400);
  if (patch.status !== undefined) cleanPatch.status = normalizeTaskStatus(patch.status);
  if (patch.priority !== undefined) cleanPatch.priority = normalizeTaskPriority(patch.priority);
  if (patch.assigneeId !== undefined) {
    cleanPatch.assigneeId = SAFE_ID_RE.test(patch.assigneeId) ? patch.assigneeId : '';
  }
  if (patch.assigneeName !== undefined) cleanPatch.assigneeName = sanitizeText(patch.assigneeName, 100);
  if (patch.dueDate !== undefined) {
    cleanPatch.dueDate = /^\d{4}-\d{2}-\d{2}$/.test(patch.dueDate) ? patch.dueDate : '';
  }

  try {
    await updateDoc(doc(db, 'shops', businessId, 'tasks', taskId), cleanPatch);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteShopTask(businessId: string, taskId: string): Promise<void> {
  if (!SAFE_ID_RE.test(taskId)) throw new Error('Invalid task ID.');
  const path = `shops/${businessId}/tasks/${taskId}`;
  try {
    await deleteDoc(doc(db, 'shops', businessId, 'tasks', taskId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

async function clearSubcollection(
  uid: string,
  businessId: string,
  subcol: 'sales' | 'expenses' | 'inventory' | 'customers'
): Promise<void> {
  const path = `shops/${businessId}/${subcol}`;
  try {
    const q = query(collection(db, 'shops', businessId, subcol), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

async function commitChunkedWrites(
  ops: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }>,
  pathLabel: string
): Promise<void> {
  try {
    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(db);
      ops.slice(i, i + 400).forEach((op) => batch.set(op.ref, op.data));
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, pathLabel);
  }
}

export interface DemoCounts {
  sales: number;
  expenses: number;
  inventory: number;
  customers: number;
}

export async function seedShopDemoData(
  uid: string,
  businessId: string,
  clearExisting = true
): Promise<DemoCounts> {
  if (clearExisting) {
    await Promise.all([
      clearSubcollection(uid, businessId, 'sales'),
      clearSubcollection(uid, businessId, 'expenses'),
      clearSubcollection(uid, businessId, 'inventory'),
      clearSubcollection(uid, businessId, 'customers'),
    ]);
  }

  const demo = generateIndianSmbDemo();
  const ops: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];

  demo.sales.forEach((s, idx) => {
    const safeId = s.id && SAFE_ID_RE.test(s.id) ? s.id : `sale_demo_${idx}`;
    ops.push({
      ref: doc(db, 'shops', businessId, 'sales', safeId),
      data: buildSalePayload(uid, s),
    });
  });

  demo.expenses.forEach((e, idx) => {
    const safeId = e.id && SAFE_ID_RE.test(e.id) ? e.id : `exp_demo_${idx}`;
    ops.push({
      ref: doc(db, 'shops', businessId, 'expenses', safeId),
      data: buildExpensePayload(uid, e),
    });
  });

  demo.inventory.forEach((item, idx) => {
    const safeId = item.id && SAFE_ID_RE.test(item.id) ? item.id : `inv_demo_${idx}`;
    ops.push({
      ref: doc(db, 'shops', businessId, 'inventory', safeId),
      data: buildInventoryPayload(uid, item),
    });
  });

  demo.customers.forEach((cust, idx) => {
    const safeId = cust.id && SAFE_ID_RE.test(cust.id) ? cust.id : `cust_demo_${idx}`;
    ops.push({
      ref: doc(db, 'shops', businessId, 'customers', safeId),
      data: buildCustomerPayload(uid, cust),
    });
  });

  await commitChunkedWrites(ops, `shops/${businessId}/demo_seed`);
  try {
    await markShopDataSource(businessId, 'demo');
  } catch {
    // Ignore if shop profile is created alongside
  }

  return {
    sales: demo.sales.length,
    expenses: demo.expenses.length,
    inventory: demo.inventory.length,
    customers: demo.customers.length,
  };
}

export async function clearAllShopData(uid: string, businessId: string): Promise<void> {
  await Promise.all([
    clearSubcollection(uid, businessId, 'sales'),
    clearSubcollection(uid, businessId, 'expenses'),
    clearSubcollection(uid, businessId, 'inventory'),
    clearSubcollection(uid, businessId, 'customers'),
  ]);
  await markShopDataSource(businessId, 'live');
}

export async function importShopSalesBatch(
  uid: string,
  businessId: string,
  records: Array<Omit<SalesRecord, 'id'>>,
  mode: 'append' | 'replace'
): Promise<number> {
  if (mode === 'replace') {
    await clearSubcollection(uid, businessId, 'sales');
  }
  const ops = records.map((rec, idx) => ({
    ref: doc(db, 'shops', businessId, 'sales', makeSafeDocId(`csv_${idx}`)),
    data: buildSalePayload(uid, rec),
  }));
  await commitChunkedWrites(ops, `shops/${businessId}/sales`);
  try {
    await markShopDataSource(businessId, 'live');
  } catch {
    // non-fatal
  }
  return records.length;
}

async function computeSha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createAndRecordBackup(params: {
  uid: string;
  businessId: string;
  shopProfile: ShopProfile;
  sales: SalesRecord[];
  expenses: ExpenseRecord[];
  inventory: InventoryItem[];
  customers?: CustomerRecord[];
  label: string;
}): Promise<ShopBackupFile> {
  const { uid, businessId, shopProfile, sales, expenses, inventory, customers = [], label } = params;
  const cleanSales = sales.map(({ id: _id, ...rest }) => rest);
  const cleanExpenses = expenses.map(({ id: _id, ...rest }) => rest);
  const cleanInventory = inventory.map(({ id: _id, ...rest }) => rest);
  const cleanCustomers = customers.map(({ id: _id, ...rest }) => rest);
  const { ownerId: _ownerId, ...cleanProfile } = shopProfile;

  const corePayload = {
    version: 1 as const,
    shopProfile: cleanProfile,
    sales: cleanSales,
    expenses: cleanExpenses,
    inventory: cleanInventory,
    customers: cleanCustomers,
  };

  const checksum = await computeSha256Hex(JSON.stringify(corePayload));
  const backupFile: ShopBackupFile = {
    ...corePayload,
    exportedAt: new Date().toISOString(),
    checksum,
  };

  const jsonBytes = new TextEncoder().encode(JSON.stringify(backupFile)).length;
  const sizeKb = Math.max(0.1, Number((jsonBytes / 1024).toFixed(1)));
  const backupId = makeSafeDocId('bkp');
  const path = `shops/${businessId}/backups/${backupId}`;

  try {
    await setDoc(doc(db, 'shops', businessId, 'backups', backupId), {
      ownerId: uid,
      label: sanitizeText(label, 100) || 'Manual Backup',
      salesCount: cleanSales.length,
      expensesCount: cleanExpenses.length,
      inventoryCount: cleanInventory.length,
      customersCount: cleanCustomers.length,
      checksum,
      snapshotSizeKb: sizeKb,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }

  return backupFile;
}

export async function verifyAndRestoreBackup(
  uid: string,
  businessId: string,
  currentProfile: ShopProfile,
  rawJsonText: string
): Promise<{
  sales: number;
  expenses: number;
  inventory: number;
  customers: number;
  updatedProfile: ShopProfile;
}> {
  let parsed: Partial<ShopBackupFile>;
  try {
    parsed = JSON.parse(rawJsonText) as Partial<ShopBackupFile>;
  } catch {
    throw new Error('Invalid backup file: not valid JSON.');
  }

  if (
    parsed.version !== 1 ||
    !parsed.checksum ||
    !parsed.shopProfile ||
    !Array.isArray(parsed.sales) ||
    !Array.isArray(parsed.expenses) ||
    !Array.isArray(parsed.inventory)
  ) {
    throw new Error('Invalid backup structure. Please select a SmartBiz AI v1 backup JSON file.');
  }

  const corePayload: Record<string, unknown> = {
    version: 1 as const,
    shopProfile: parsed.shopProfile,
    sales: parsed.sales,
    expenses: parsed.expenses,
    inventory: parsed.inventory,
  };
  if (parsed.customers !== undefined) {
    corePayload.customers = parsed.customers;
  }

  const computed = await computeSha256Hex(JSON.stringify(corePayload));
  if (computed !== parsed.checksum) {
    throw new Error(
      'Backup integrity verification failed: SHA-256 checksum mismatch. The file may be corrupted or modified.'
    );
  }

  const updatedProfile = await updateShopProfile(businessId, currentProfile, {
    shopName: parsed.shopProfile.shopName || currentProfile.shopName,
    ownerName: parsed.shopProfile.ownerName || currentProfile.ownerName,
    ownerPhone: parsed.shopProfile.ownerPhone || currentProfile.ownerPhone || '',
    businessType: parsed.shopProfile.businessType || currentProfile.businessType,
    category: parsed.shopProfile.category || currentProfile.category,
    businessSize: parsed.shopProfile.businessSize || currentProfile.businessSize,
    country: parsed.shopProfile.country || currentProfile.country,
    currency: parsed.shopProfile.currency || currentProfile.currency,
    address: parsed.shopProfile.address || currentProfile.address || '',
    city: parsed.shopProfile.city || currentProfile.city,
    gstin: parsed.shopProfile.gstin || '',
    whatsappNumber: parsed.shopProfile.whatsappNumber || currentProfile.whatsappNumber || '',
    logoUrl: parsed.shopProfile.logoUrl ?? currentProfile.logoUrl ?? '',
    dataSource: parsed.shopProfile.dataSource || 'live',
  });

  await Promise.all([
    clearSubcollection(uid, businessId, 'sales'),
    clearSubcollection(uid, businessId, 'expenses'),
    clearSubcollection(uid, businessId, 'inventory'),
    clearSubcollection(uid, businessId, 'customers'),
  ]);

  const ops: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];
  parsed.sales.forEach((s, idx) => {
    ops.push({
      ref: doc(db, 'shops', businessId, 'sales', makeSafeDocId(`rs_${idx}`)),
      data: buildSalePayload(uid, s),
    });
  });
  parsed.expenses.forEach((e, idx) => {
    ops.push({
      ref: doc(db, 'shops', businessId, 'expenses', makeSafeDocId(`re_${idx}`)),
      data: buildExpensePayload(uid, e),
    });
  });
  parsed.inventory.forEach((i, idx) => {
    ops.push({
      ref: doc(db, 'shops', businessId, 'inventory', makeSafeDocId(`ri_${idx}`)),
      data: buildInventoryPayload(uid, i),
    });
  });
  const custList = Array.isArray(parsed.customers) ? parsed.customers : [];
  custList.forEach((c, idx) => {
    ops.push({
      ref: doc(db, 'shops', businessId, 'customers', makeSafeDocId(`rc_${idx}`)),
      data: buildCustomerPayload(uid, c),
    });
  });

  await commitChunkedWrites(ops, `shops/${businessId}/restore`);

  return {
    sales: parsed.sales.length,
    expenses: parsed.expenses.length,
    inventory: parsed.inventory.length,
    customers: custList.length,
    updatedProfile,
  };
}
