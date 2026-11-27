import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ImagePlus,
  Layers,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  BusinessCategory,
  BusinessConfiguration,
  BusinessModuleId,
  BusinessSize,
  CurrencyCode,
  ShopProfile,
} from '../../types/bi';
import {
  BUSINESS_CATEGORIES,
  BUSINESS_GOAL_OPTIONS,
  BUSINESS_SIZES,
  BUSINESS_TYPE_OPTIONS,
  COUNTRY_OPTIONS,
  CURRENCY_OPTIONS,
  UNIVERSAL_MODULES,
  getBusinessId,
  getCurrencyMeta,
  getDefaultCurrencyForCountry,
  getRecommendedModulesForCategory,
  inferCategoryFromBusinessType,
  normalizeCurrencyCode,
} from '../../utils/businessConfig';
import { processBusinessLogoFile } from '../../utils/logoUtils';
import { formatFriendlyFirestoreError } from '../../firebase';

interface BusinessSetupViewProps {
  businesses: ShopProfile[];
  activeBusiness: ShopProfile;
  businessConfig: BusinessConfiguration;
  onSwitchBusiness: (businessId: string) => void;
  onCreateBusiness: (input: {
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
  }) => Promise<void>;
  onUpdateShopProfile: (patch: {
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
  }) => Promise<void>;
  onSaveBusinessConfig: (input: {
    category: BusinessCategory;
    businessSize: BusinessSize;
    country: string;
    currency: CurrencyCode;
    businessGoals: string[];
    enabledModules: BusinessModuleId[];
    autoConfigured: boolean;
  }) => Promise<void>;
  onCurrencyChange: (nextCurrency: CurrencyCode) => Promise<void>;
}

export function BusinessSetupView({
  businesses,
  activeBusiness,
  businessConfig,
  onSwitchBusiness,
  onCreateBusiness,
  onUpdateShopProfile,
  onSaveBusinessConfig,
  onCurrencyChange,
}: BusinessSetupViewProps) {
  const activeId = getBusinessId(activeBusiness);

  // Active Business Profile & Config editor state
  const [shopName, setShopName] = useState(activeBusiness.shopName);
  const [ownerName, setOwnerName] = useState(activeBusiness.ownerName);
  const [ownerPhone, setOwnerPhone] = useState(activeBusiness.ownerPhone || '');
  const [businessType, setBusinessType] = useState(
    activeBusiness.businessType || 'Sole Proprietorship'
  );
  const [address, setAddress] = useState(activeBusiness.address || '');
  const [city, setCity] = useState(activeBusiness.city);
  const [gstin, setGstin] = useState(activeBusiness.gstin || '');
  const [whatsappNumber, setWhatsappNumber] = useState(activeBusiness.whatsappNumber || '');
  const [logoUrl, setLogoUrl] = useState(activeBusiness.logoUrl || '');
  const [logoBusy, setLogoBusy] = useState(false);

  const [category, setCategory] = useState<BusinessCategory>(businessConfig.category);
  const [businessSize, setBusinessSize] = useState<BusinessSize>(businessConfig.businessSize);
  const [country, setCountry] = useState<string>(
    businessConfig.country || activeBusiness.country || 'India'
  );
  const [currency, setCurrency] = useState<CurrencyCode>(() =>
    normalizeCurrencyCode(
      businessConfig.currency ?? activeBusiness.currency,
      getDefaultCurrencyForCountry(businessConfig.country || activeBusiness.country || 'India')
    )
  );
  const [businessGoals, setBusinessGoals] = useState<string[]>(businessConfig.businessGoals);
  const [enabledModules, setEnabledModules] = useState<BusinessModuleId[]>(
    businessConfig.enabledModules
  );
  const [autoConfigured, setAutoConfigured] = useState<boolean>(businessConfig.autoConfigured);

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [currencySaving, setCurrencySaving] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Add New Business wizard state
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [newShopName, setNewShopName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState(activeBusiness.ownerName);
  const [newOwnerPhone, setNewOwnerPhone] = useState(activeBusiness.ownerPhone || '');
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newCategory, setNewCategory] = useState<BusinessCategory>('Retail');
  const [newSize, setNewSize] = useState<BusinessSize>('Small (2-20)');
  const [newCountry, setNewCountry] = useState<string>('India');
  const [newCurrency, setNewCurrency] = useState<CurrencyCode>('INR');
  const [newBusinessType, setNewBusinessType] = useState('Sole Proprietorship');
  const [newGstin, setNewGstin] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [newLogoBusy, setNewLogoBusy] = useState(false);
  const [newGoals, setNewGoals] = useState<string[]>([
    'Increase Monthly Net Profit Margin',
    'Track Daily Sales, COGS & Cashflow',
  ]);
  const [newEnabledModules, setNewEnabledModules] = useState<BusinessModuleId[]>(() =>
    getRecommendedModulesForCategory('Retail', 'Small (2-20)')
  );
  const [newPreloadDemo, setNewPreloadDemo] = useState(false);
  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    setShopName(activeBusiness.shopName);
    setOwnerName(activeBusiness.ownerName);
    setOwnerPhone(activeBusiness.ownerPhone || '');
    setBusinessType(activeBusiness.businessType || 'Sole Proprietorship');
    setAddress(activeBusiness.address || '');
    setCity(activeBusiness.city);
    setGstin(activeBusiness.gstin || '');
    setWhatsappNumber(activeBusiness.whatsappNumber || '');
    setLogoUrl(activeBusiness.logoUrl || '');
    if (activeBusiness.country) setCountry(activeBusiness.country);
    if (activeBusiness.currency) setCurrency(normalizeCurrencyCode(activeBusiness.currency));
    setProfileError(null);
  }, [activeBusiness]);

  useEffect(() => {
    const resolvedCountry = businessConfig.country || activeBusiness.country || 'India';
    setCategory(businessConfig.category);
    setBusinessSize(businessConfig.businessSize);
    setCountry(resolvedCountry);
    setCurrency(
      normalizeCurrencyCode(
        businessConfig.currency ?? activeBusiness.currency,
        getDefaultCurrencyForCountry(resolvedCountry)
      )
    );
    setBusinessGoals(businessConfig.businessGoals);
    setEnabledModules(businessConfig.enabledModules);
    setAutoConfigured(businessConfig.autoConfigured);
    setConfigError(null);
  }, [businessConfig, activeBusiness.country, activeBusiness.currency]);

  const recommendedForSelected = useMemo(
    () => getRecommendedModulesForCategory(category, businessSize),
    [category, businessSize]
  );

  const selectedCategoryMeta = useMemo(
    () => BUSINESS_CATEGORIES.find((c) => c.id === category) || BUSINESS_CATEGORIES[0],
    [category]
  );

  const newRecommendedModules = useMemo(
    () => getRecommendedModulesForCategory(newCategory, newSize),
    [newCategory, newSize]
  );

  const activeBusinessTypeOptions = useMemo(() => {
    if (!businessType || BUSINESS_TYPE_OPTIONS.includes(businessType)) {
      return BUSINESS_TYPE_OPTIONS;
    }
    return [businessType, ...BUSINESS_TYPE_OPTIONS];
  }, [businessType]);

  const handleCategoryChange = (nextCategory: BusinessCategory) => {
    setCategory(nextCategory);
    const nextSize = nextCategory === 'Freelancer' ? 'Solo / Micro (1)' : businessSize;
    if (nextCategory === 'Freelancer') {
      setBusinessSize('Solo / Micro (1)');
      if (!businessType || BUSINESS_TYPE_OPTIONS.includes(businessType)) {
        setBusinessType('Independent / Freelance');
      }
    }
    const nextRec = getRecommendedModulesForCategory(nextCategory, nextSize);
    setEnabledModules(nextRec);
    setAutoConfigured(true);
  };

  const handleSizeChange = (nextSize: BusinessSize) => {
    setBusinessSize(nextSize);
    const nextRec = getRecommendedModulesForCategory(category, nextSize);
    setEnabledModules(nextRec);
    setAutoConfigured(true);
  };

  const handleToggleModule = (moduleId: BusinessModuleId) => {
    setConfigError(null);
    setAutoConfigured(false);
    setEnabledModules((prev) => {
      if (prev.includes(moduleId)) {
        if (prev.length <= 1) {
          setConfigError('At least one business module must remain enabled.');
          return prev;
        }
        return prev.filter((id) => id !== moduleId);
      }
      return [...prev, moduleId];
    });
  };

  const handleApplyRecommended = () => {
    setConfigError(null);
    setEnabledModules([...recommendedForSelected]);
    setAutoConfigured(true);
  };

  const handleImmediateCurrencySelect = async (nextCurrency: CurrencyCode) => {
    const normalized = normalizeCurrencyCode(nextCurrency);
    const prevCurrency = currency;
    setProfileError(null);
    setCurrency(normalized);
    if (normalized === prevCurrency && businessConfig.currency === normalized) return;
    setCurrencySaving(true);
    try {
      await onCurrencyChange(normalized);
    } catch (err) {
      setCurrency(prevCurrency);
      setProfileError(formatFriendlyFirestoreError(err));
    } finally {
      setCurrencySaving(false);
    }
  };

  const handleToggleGoal = (goal: string) => {
    setBusinessGoals((prev) => {
      if (prev.includes(goal)) {
        return prev.filter((g) => g !== goal);
      }
      if (prev.length >= 10) return prev;
      return [...prev, goal];
    });
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    const cleanShop = shopName.trim();
    const cleanOwner = ownerName.trim();
    const cleanOwnerPhone = ownerPhone.trim();
    const cleanType = (businessType || 'Sole Proprietorship').trim();
    const cleanAddress = address.trim();
    const cleanCity = city.trim();
    const cleanGstin = gstin.trim().toUpperCase();
    const cleanWhatsapp = whatsappNumber.trim();

    if (cleanShop.length < 2 || cleanOwner.length < 2 || cleanCity.length < 2) {
      setProfileError('Business name, owner name, and city must each be at least 2 characters.');
      return;
    }
    if (cleanOwnerPhone && cleanOwnerPhone.replace(/\D/g, '').length < 7) {
      setProfileError('If provided, owner phone number must have at least 7 digits.');
      return;
    }
    if (cleanGstin && !/^[A-Z0-9]{10,20}$/.test(cleanGstin)) {
      setProfileError('If provided, Tax ID / GSTIN must be 10–20 alphanumeric characters.');
      return;
    }
    if (cleanWhatsapp && cleanWhatsapp.replace(/\D/g, '').length < 10) {
      setProfileError('If provided, WhatsApp number must have at least 10 digits.');
      return;
    }

    setProfileSaving(true);
    try {
      await onUpdateShopProfile({
        shopName: cleanShop,
        ownerName: cleanOwner,
        ownerPhone: cleanOwnerPhone,
        businessType: cleanType,
        category,
        businessSize,
        country,
        currency,
        address: cleanAddress,
        city: cleanCity,
        gstin: cleanGstin,
        whatsappNumber: cleanWhatsapp,
        logoUrl,
      });
    } catch (err) {
      setProfileError(formatFriendlyFirestoreError(err));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    setConfigError(null);
    if (enabledModules.length === 0) {
      setConfigError('Select at least one active module before saving.');
      return;
    }
    setConfigSaving(true);
    try {
      await onSaveBusinessConfig({
        category,
        businessSize,
        country,
        currency,
        businessGoals,
        enabledModules,
        autoConfigured,
      });
    } catch (err) {
      setConfigError(formatFriendlyFirestoreError(err));
    } finally {
      setConfigSaving(false);
    }
  };

  const handleCreateNewBusinessSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const cleanShop = newShopName.trim();
    const cleanOwner = newOwnerName.trim();
    const cleanOwnerPhone = newOwnerPhone.trim();
    const cleanAddress = newAddress.trim();
    const cleanCity = newCity.trim();
    const cleanGstin = newGstin.trim().toUpperCase();
    const cleanWa = newWhatsapp.trim();

    if (cleanShop.length < 2 || cleanOwner.length < 2 || cleanCity.length < 2) {
      setCreateError('Business name, owner name, and city must each be at least 2 characters.');
      return;
    }
    if (cleanOwnerPhone && cleanOwnerPhone.replace(/\D/g, '').length < 7) {
      setCreateError('If provided, owner phone number must have at least 7 digits.');
      return;
    }
    if (cleanGstin && !/^[A-Z0-9]{10,20}$/.test(cleanGstin)) {
      setCreateError('If provided, Tax ID / GSTIN must be 10–20 alphanumeric characters.');
      return;
    }
    if (cleanWa && cleanWa.replace(/\D/g, '').length < 10) {
      setCreateError('If provided, WhatsApp number must have at least 10 digits.');
      return;
    }
    if (newEnabledModules.length === 0) {
      setCreateError('Please keep at least one module enabled for the new business.');
      return;
    }

    setCreatingBusiness(true);
    try {
      await onCreateBusiness({
        shopName: cleanShop,
        ownerName: cleanOwner,
        ownerPhone: cleanOwnerPhone,
        businessType: newBusinessType.trim() || 'Sole Proprietorship',
        category: newCategory,
        businessSize: newSize,
        country: newCountry,
        currency: newCurrency,
        address: cleanAddress,
        city: cleanCity,
        gstin: cleanGstin,
        whatsappNumber: cleanWa,
        logoUrl: newLogoUrl,
        businessGoals: newGoals,
        enabledModules: newEnabledModules,
        preloadDemo: newPreloadDemo,
      });
      setShowAddBusiness(false);
      setNewShopName('');
      setNewAddress('');
      setNewCity('');
      setNewGstin('');
      setNewWhatsapp('');
      setNewLogoUrl('');
      setNewCountry('India');
      setNewCurrency('INR');
      setNewPreloadDemo(false);
    } catch (err) {
      setCreateError(formatFriendlyFirestoreError(err));
    } finally {
      setCreatingBusiness(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Multi-Business Account Directory */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Businesses Under Your Account ({businesses.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Each business keeps its own separate configuration, sales ledger, expenses, inventory, and customers.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setShowAddBusiness((v) => !v);
            }}
            className="min-h-[38px] px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-xs font-semibold text-white inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            {showAddBusiness ? 'Close New Business Form' : 'Add Another Business'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {businesses.map((biz) => {
            const bizId = getBusinessId(biz);
            const isSelected = bizId === activeId;
            const resolvedCategory =
              biz.category || inferCategoryFromBusinessType(biz.businessType);
            return (
              <button
                key={bizId}
                type="button"
                onClick={() => !isSelected && onSwitchBusiness(bizId)}
                className={`text-left rounded-xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                  isSelected
                    ? 'border-violet-600 bg-violet-50/50'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                      {biz.logoUrl ? (
                        <img
                          src={biz.logoUrl}
                          alt={`${biz.shopName} logo`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">{biz.shopName}</div>
                      <div className="text-xs text-slate-600 mt-0.5 truncate">
                        {resolvedCategory} · {biz.city}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold whitespace-nowrap shrink-0 ${
                      isSelected ? 'text-violet-700' : 'text-slate-400'
                    }`}
                  >
                    {isSelected ? 'Active Workspace' : 'Switch'}
                  </span>
                </div>
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate pr-2">
                    {biz.businessType || resolvedCategory} · {normalizeCurrencyCode(biz.currency, 'INR')}
                  </span>
                  <span className="shrink-0">
                    {biz.dataSource === 'demo' ? 'Sample Demo Data' : 'Live Business Data'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {showAddBusiness && (
          <form
            onSubmit={handleCreateNewBusinessSubmit}
            className="mt-4 pt-5 border-t border-slate-200 space-y-4"
          >
            <div>
              <h3 className="text-sm font-bold text-slate-900">Create Additional Business Workspace</h3>
              <p className="text-xs text-slate-500">
                Register another business under your account with its own logo, address, currency, and recommended modules.
              </p>
            </div>

            {createError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{createError}</span>
              </div>
            )}

            {/* New Business Logo Upload */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
              <div className="w-12 h-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                {newLogoUrl ? (
                  <img src={newLogoUrl} alt="New business logo preview" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-slate-800">Business Logo (Optional)</div>
                  <div className="text-[11px] text-slate-500">PNG, JPG, WebP, or SVG</div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="min-h-[32px] px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer">
                    {newLogoBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="w-3.5 h-3.5 text-violet-600" />
                    )}
                    <span>{newLogoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      disabled={newLogoBusy}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        setCreateError(null);
                        setNewLogoBusy(true);
                        try {
                          const processed = await processBusinessLogoFile(file);
                          setNewLogoUrl(processed);
                        } catch (err) {
                          setCreateError(err instanceof Error ? err.message : 'Unable to process logo.');
                        } finally {
                          setNewLogoBusy(false);
                        }
                      }}
                    />
                  </label>
                  {newLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setNewLogoUrl('')}
                      className="min-h-[32px] px-2.5 rounded-lg text-xs font-medium text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div>
                <label htmlFor="newBizName" className="block text-xs font-medium text-slate-700 mb-1">
                  Business Name
                </label>
                <input
                  id="newBizName"
                  type="text"
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  placeholder="e.g. Spice Route Cloud Kitchen"
                  maxLength={100}
                  required
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="newBizCategory" className="block text-xs font-medium text-slate-700 mb-1">
                  Industry
                </label>
                <select
                  id="newBizCategory"
                  value={newCategory}
                  onChange={(e) => {
                    const cat = e.target.value as BusinessCategory;
                    setNewCategory(cat);
                    if (cat === 'Freelancer') {
                      setNewBusinessType('Independent / Freelance');
                      setNewSize('Solo / Micro (1)');
                      setNewEnabledModules(getRecommendedModulesForCategory(cat, 'Solo / Micro (1)'));
                    } else {
                      setNewEnabledModules(getRecommendedModulesForCategory(cat, newSize));
                    }
                  }}
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {BUSINESS_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="newBizType" className="block text-xs font-medium text-slate-700 mb-1">
                  Business Type
                </label>
                <select
                  id="newBizType"
                  value={newBusinessType}
                  onChange={(e) => setNewBusinessType(e.target.value)}
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {BUSINESS_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="newBizSize" className="block text-xs font-medium text-slate-700 mb-1">
                  Team Size
                </label>
                <select
                  id="newBizSize"
                  value={newSize}
                  onChange={(e) => {
                    const sz = e.target.value as BusinessSize;
                    setNewSize(sz);
                    setNewEnabledModules(getRecommendedModulesForCategory(newCategory, sz));
                  }}
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {BUSINESS_SIZES.map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="newBizCountry" className="block text-xs font-medium text-slate-700 mb-1">
                  Country / Region
                </label>
                <select
                  id="newBizCountry"
                  value={newCountry}
                  onChange={(e) => {
                    const nextCountry = e.target.value;
                    setNewCountry(nextCountry);
                    setNewCurrency(getDefaultCurrencyForCountry(nextCountry));
                  }}
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.country} value={c.country}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="newBizCurrency" className="block text-xs font-medium text-slate-700 mb-1">
                  Preferred Currency
                </label>
                <select
                  id="newBizCurrency"
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(normalizeCurrencyCode(e.target.value))}
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol.trim()}) — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="newBizAddress" className="block text-xs font-medium text-slate-700 mb-1">
                  Business Address
                </label>
                <input
                  id="newBizAddress"
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Street, building, area, postal code"
                  maxLength={200}
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="newBizCity" className="block text-xs font-medium text-slate-700 mb-1">
                  City / State
                </label>
                <input
                  id="newBizCity"
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="e.g. Bengaluru, Karnataka"
                  maxLength={80}
                  required
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="newBizOwner" className="block text-xs font-medium text-slate-700 mb-1">
                  Owner / Lead Name
                </label>
                <input
                  id="newBizOwner"
                  type="text"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  maxLength={100}
                  required
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="newBizOwnerPhone" className="block text-xs font-medium text-slate-700 mb-1">
                  Owner Phone (Optional)
                </label>
                <input
                  id="newBizOwnerPhone"
                  type="tel"
                  value={newOwnerPhone}
                  onChange={(e) => setNewOwnerPhone(e.target.value)}
                  placeholder="e.g. +91 98201 44110"
                  maxLength={20}
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono-num text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="newBizWhatsapp" className="block text-xs font-medium text-slate-700 mb-1">
                  WhatsApp Number (Optional)
                </label>
                <input
                  id="newBizWhatsapp"
                  type="tel"
                  value={newWhatsapp}
                  onChange={(e) => setNewWhatsapp(e.target.value)}
                  placeholder="e.g. +91 98201 44110"
                  maxLength={20}
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono-num text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="newBizGstin" className="block text-xs font-medium text-slate-700 mb-1">
                  Tax ID / GSTIN (Optional)
                </label>
                <input
                  id="newBizGstin"
                  type="text"
                  value={newGstin}
                  onChange={(e) => setNewGstin(e.target.value)}
                  placeholder="e.g. 29AABCU9603R1ZM"
                  maxLength={20}
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono-num text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800">
                  Auto-Recommended Modules for {newCategory} ({newEnabledModules.length} selected)
                </span>
                <button
                  type="button"
                  onClick={() => setNewEnabledModules([...newRecommendedModules])}
                  className="text-xs font-semibold text-violet-700 hover:underline"
                >
                  Reset to Recommended
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {UNIVERSAL_MODULES.map((mod) => {
                  const active = newEnabledModules.includes(mod.id);
                  const isRec = newRecommendedModules.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => {
                        setNewEnabledModules((prev) =>
                          prev.includes(mod.id)
                            ? prev.length > 1
                              ? prev.filter((id) => id !== mod.id)
                              : prev
                            : [...prev, mod.id]
                        );
                      }}
                      className={`min-h-[32px] px-3 rounded-lg border text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-violet-600 border-violet-600 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {mod.label}
                      {isRec && !active ? ' (Rec)' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPreloadDemo}
                  onChange={(e) => setNewPreloadDemo(e.target.checked)}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span>Preload sample Indian SMB demo data in this new business (clearly labeled)</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBusiness(false)}
                  className="min-h-[38px] px-3.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingBusiness}
                  className="min-h-[38px] px-4 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-xs font-semibold text-white inline-flex items-center gap-2"
                >
                  {creatingBusiness && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {creatingBusiness ? 'Creating Business...' : 'Create Business Workspace'}
                </button>
              </div>
            </div>
          </form>
        )}
      </section>

      {/* Main 2-Column Setup: Business Profile + Separate Module Configuration */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Business Profile Section */}
        <form
          onSubmit={handleSaveProfile}
          className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Business Profile</h2>
              <p className="text-xs text-slate-500">
                Logo, legal type, address, currency &amp; owner details
              </p>
            </div>
          </div>

          {profileError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{profileError}</span>
            </div>
          )}

          {/* Active Business Logo Editor */}
          <div className="flex items-center gap-3.5 p-3 rounded-xl border border-slate-200 bg-slate-50/70">
            <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt={`${shopName} logo`} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-800">Business Logo</div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Shown in workspace switcher &amp; business profile.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="min-h-[30px] px-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer">
                  {logoBusy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="w-3.5 h-3.5 text-violet-600" />
                  )}
                  <span>{logoUrl ? 'Replace Logo' : 'Upload Logo'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    disabled={logoBusy}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      setProfileError(null);
                      setLogoBusy(true);
                      try {
                        const processed = await processBusinessLogoFile(file);
                        setLogoUrl(processed);
                      } catch (err) {
                        setProfileError(err instanceof Error ? err.message : 'Unable to process logo.');
                      } finally {
                        setLogoBusy(false);
                      }
                    }}
                  />
                </label>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl('')}
                    className="min-h-[30px] px-2 rounded-lg text-xs font-medium text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3.5">
            <div>
              <label htmlFor="setupProfShopName" className="block text-xs font-medium text-slate-700 mb-1">
                Business Name
              </label>
              <input
                id="setupProfShopName"
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                maxLength={100}
                required
                className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="setupProfType" className="block text-xs font-medium text-slate-700 mb-1">
                  Business Type
                </label>
                <select
                  id="setupProfType"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {activeBusinessTypeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="setupProfCountry" className="block text-xs font-medium text-slate-700 mb-1">
                  Country / Region
                </label>
                <select
                  id="setupProfCountry"
                  value={country}
                  onChange={(e) => {
                    const nextCountry = e.target.value;
                    const prevDefault = getDefaultCurrencyForCountry(country);
                    const nextDefault = getDefaultCurrencyForCountry(nextCountry);
                    setCountry(nextCountry);
                    if (currency === prevDefault && nextDefault !== currency) {
                      void handleImmediateCurrencySelect(nextDefault);
                    }
                  }}
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.country} value={c.country}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label htmlFor="setupProfCurrency" className="block text-xs font-medium text-slate-700">
                  Preferred Currency
                </label>
                {currencySaving && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </span>
                )}
              </div>
              <select
                id="setupProfCurrency"
                value={currency}
                disabled={currencySaving}
                onChange={(e) => void handleImmediateCurrencySelect(normalizeCurrencyCode(e.target.value))}
                className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol.trim()}) — {c.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Saves immediately to Business Configuration and updates all KPIs, charts, P&amp;L ledgers, inventory, AI advisor &amp; PDF reports.
              </p>
            </div>

            <div>
              <label htmlFor="setupProfAddress" className="block text-xs font-medium text-slate-700 mb-1">
                Business Address
              </label>
              <input
                id="setupProfAddress"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop / Office number, street, locality, postal code"
                maxLength={200}
                className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="setupProfCity" className="block text-xs font-medium text-slate-700 mb-1">
                  City / State
                </label>
                <input
                  id="setupProfCity"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  maxLength={80}
                  required
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="setupProfGstin" className="block text-xs font-medium text-slate-700 mb-1">
                  Tax ID / GSTIN (Optional)
                </label>
                <input
                  id="setupProfGstin"
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="27AABCU9603R1ZM"
                  maxLength={20}
                  className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono-num text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="text-xs font-bold text-slate-800">Owner Details</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="setupProfOwner" className="block text-xs font-medium text-slate-700 mb-1">
                    Owner Name
                  </label>
                  <input
                    id="setupProfOwner"
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    maxLength={100}
                    required
                    className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label htmlFor="setupProfOwnerPhone" className="block text-xs font-medium text-slate-700 mb-1">
                    Owner Phone
                  </label>
                  <input
                    id="setupProfOwnerPhone"
                    type="tel"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="+91 98201 44110"
                    maxLength={20}
                    className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono-num text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label htmlFor="setupProfOwnerEmail" className="block text-xs font-medium text-slate-700 mb-1">
                    Verified Owner Email
                  </label>
                  <input
                    id="setupProfOwnerEmail"
                    type="email"
                    value={activeBusiness.ownerEmail}
                    readOnly
                    className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-100 text-xs text-slate-600 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label htmlFor="setupProfWhatsapp" className="block text-xs font-medium text-slate-700 mb-1">
                    WhatsApp Report Number
                  </label>
                  <input
                    id="setupProfWhatsapp"
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+91 98201 44110"
                    maxLength={20}
                    className="w-full min-h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono-num text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
            <span className="text-[11px] font-mono-num text-slate-400 truncate">ID: {activeId}</span>
            <button
              type="submit"
              disabled={profileSaving}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-xs font-semibold text-white inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              {profileSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              {profileSaving ? 'Saving Profile...' : 'Save Business Profile'}
            </button>
          </div>
        </form>

        {/* Right: Industry Selection, Automatic Recommendation & Dynamic Module Configuration */}
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Industry &amp; Dynamic Module Configuration
                </h2>
                <p className="text-xs text-slate-500">
                  Saved separately per business · dynamically configures sidebar modules &amp; workflows
                </p>
              </div>
            </div>

            {businessConfig.updatedAtIso && (
              <span className="text-[11px] font-mono-num text-slate-500 whitespace-nowrap">
                Synced {new Date(businessConfig.updatedAtIso).toLocaleDateString(getCurrencyMeta(currency).locale)}
              </span>
            )}
          </div>

          {/* Step 1: Select Industry */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800">
                1. Select Industry (Auto-Recommends Relevant Modules)
              </label>
              <div className="flex items-center gap-2">
                <label htmlFor="setupBizSize" className="text-xs font-medium text-slate-600">
                  Team Size:
                </label>
                <select
                  id="setupBizSize"
                  value={businessSize}
                  onChange={(e) => handleSizeChange(e.target.value as BusinessSize)}
                  className="min-h-[32px] px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {BUSINESS_SIZES.map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {BUSINESS_CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`text-left p-3 rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                      isSelected
                        ? 'border-violet-600 bg-violet-50/70'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold text-slate-900">{cat.label}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-violet-600 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-snug">
                      {cat.shortDesc}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-start gap-2 text-slate-700">
                <Sparkles className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-900">{selectedCategoryMeta.label} Focus:</strong>{' '}
                  {selectedCategoryMeta.kpiFocus}
                </span>
              </div>
              <button
                type="button"
                onClick={handleApplyRecommended}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:text-violet-800 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Apply Recommended ({recommendedForSelected.length})
              </button>
            </div>
          </div>

          {/* Step 2: Enable / Disable Modules */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800">
                2. Enable or Disable Modules ({enabledModules.length} of {UNIVERSAL_MODULES.length} enabled)
              </span>
              <span className="text-[11px] text-slate-500">
                {autoConfigured ? 'Auto-configured for industry' : 'Custom module selection'}
              </span>
            </div>

            {configError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{configError}</span>
              </div>
            )}

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {UNIVERSAL_MODULES.map((mod) => {
                const isEnabled = enabledModules.includes(mod.id);
                const isRecommended = recommendedForSelected.includes(mod.id);
                return (
                  <div
                    key={mod.id}
                    className={`p-3.5 flex items-center justify-between gap-4 transition-colors ${
                      isEnabled ? 'bg-white' : 'bg-slate-50/70'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{mod.label}</span>
                        {isRecommended && (
                          <span className="text-[11px] font-semibold text-violet-700">
                            Recommended
                          </span>
                        )}
                        <span
                          className={`text-[11px] font-medium ${
                            mod.availability === 'active' ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          {mod.availability === 'active' ? 'Active Live Module' : 'Phase 2 Upcoming'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{mod.description}</p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={isEnabled}
                      aria-label={`Toggle ${mod.label} module`}
                      onClick={() => handleToggleModule(mod.id)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                        isEnabled ? 'bg-violet-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-150 ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Business Goals */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-800">
              3. Business Goals (Used for AI &amp; Dashboard Prioritization)
            </span>
            <div className="flex flex-wrap gap-2">
              {BUSINESS_GOAL_OPTIONS.map((goal) => {
                const selected = businessGoals.includes(goal);
                return (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => handleToggleGoal(goal)}
                    className={`min-h-[32px] px-3 py-1 rounded-lg border text-xs font-medium transition-colors text-left ${
                      selected
                        ? 'border-violet-600 bg-violet-50 text-violet-800 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {goal}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500">
              Configuration path: <span className="font-mono-num">shops/{activeId}/config/active</span>
            </p>
            <button
              type="button"
              disabled={configSaving}
              onClick={() => void handleSaveConfig()}
              className="min-h-[42px] px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-xs font-semibold text-white inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              {configSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {configSaving ? 'Saving Configuration...' : 'Save Business Configuration'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
