import { useState, type FormEvent } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  LogIn,
  LogOut,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
} from 'lucide-react';
import {
  formatAuthError,
  formatFriendlyFirestoreError,
  resendVerificationEmail,
  sendShopPasswordReset,
  signInShopOwner,
  signInWithEmail,
  signOutShopOwner,
  signUpWithEmail,
} from '../firebase';
import type {
  BusinessCategory,
  BusinessConfiguration,
  BusinessModuleId,
  BusinessSize,
  CurrencyCode,
  ShopProfile,
} from '../types/bi';
import {
  BUSINESS_CATEGORIES,
  BUSINESS_GOAL_OPTIONS,
  BUSINESS_SIZES,
  BUSINESS_TYPE_OPTIONS,
  COUNTRY_OPTIONS,
  CURRENCY_OPTIONS,
  UNIVERSAL_MODULES,
  getDefaultCurrencyForCountry,
  getRecommendedModulesForCategory,
  normalizeCurrencyCode,
} from '../utils/businessConfig';
import { processBusinessLogoFile } from '../utils/logoUtils';
import { createBusinessWorkspace } from '../utils/shopService';

interface AuthGateProps {
  user: User | null;
  shopProfile: ShopProfile | null;
  onProfileCreated: (workspace: { profile: ShopProfile; config: BusinessConfiguration }) => void;
  onRefreshUser: () => Promise<void>;
}

export function AuthGate({
  user,
  shopProfile,
  onProfileCreated,
  onRefreshUser,
}: AuthGateProps) {
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);

  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Shop setup state
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState(user?.displayName || '');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [category, setCategory] = useState<BusinessCategory>('Retail');
  const [businessSize, setBusinessSize] = useState<BusinessSize>('Small (2-20)');
  const [country, setCountry] = useState<string>('India');
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [businessType, setBusinessType] = useState<string>('Sole Proprietorship');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [gstin, setGstin] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const [businessGoals, setBusinessGoals] = useState<string[]>([
    'Increase Monthly Net Profit Margin',
    'Track Daily Sales, COGS & Cashflow',
  ]);
  const [enabledModules, setEnabledModules] = useState<BusinessModuleId[]>(() =>
    getRecommendedModulesForCategory('Retail', 'Small (2-20)')
  );
  const [preloadDemo, setPreloadDemo] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setAuthInfo(null);
    setAuthLoading(true);
    try {
      await signInShopOwner();
    } catch (err) {
      setAuthError(formatAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (authLoading) return;
    setAuthError(null);
    setAuthInfo(null);

    const cleanEmail = emailInput.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (passwordInput.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    if (authTab === 'signup') {
      if (displayNameInput.trim().length < 2) {
        setAuthError('Please enter your full name (at least 2 characters).');
        return;
      }
      if (passwordInput !== confirmPasswordInput) {
        setAuthError('Passwords do not match.');
        return;
      }
    }

    setAuthLoading(true);
    try {
      if (authTab === 'signup') {
        await signUpWithEmail(displayNameInput.trim(), cleanEmail, passwordInput);
      } else {
        await signInWithEmail(cleanEmail, passwordInput);
      }
    } catch (err) {
      setAuthError(formatAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setAuthError(null);
    setAuthInfo(null);
    const cleanEmail = emailInput.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError('Enter your registered email above first, then click Forgot Password.');
      return;
    }
    setAuthLoading(true);
    try {
      await sendShopPasswordReset(cleanEmail);
      setAuthInfo(`Password reset link sent to ${cleanEmail}. Check your inbox and spam folder.`);
    } catch (err) {
      setAuthError(formatAuthError(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setVerifyError(null);
    setVerifyMsg(null);
    setVerifyBusy(true);
    try {
      await resendVerificationEmail();
      setVerifyMsg(`Verification email sent to ${user?.email}. Open the link, then click "I've Verified — Continue".`);
    } catch (err) {
      setVerifyError(formatAuthError(err));
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleRefreshVerification = async () => {
    setVerifyError(null);
    setVerifyMsg(null);
    setVerifyBusy(true);
    try {
      await onRefreshUser();
    } catch (err) {
      setVerifyError(formatAuthError(err));
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleCreateProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSetupError(null);

    const cleanShop = shopName.trim();
    const cleanOwner = (ownerName || user.displayName || '').trim();
    const cleanOwnerPhone = ownerPhone.trim();
    const cleanAddress = address.trim();
    const cleanCity = city.trim();
    const cleanType = businessType.trim();
    const cleanGstin = gstin.trim().toUpperCase();
    const cleanWa = whatsappNumber.trim();

    if (cleanShop.length < 2) {
      setSetupError('Business / Shop name must be at least 2 characters.');
      return;
    }
    if (cleanOwner.length < 2) {
      setSetupError('Owner name must be at least 2 characters.');
      return;
    }
    if (cleanOwnerPhone && cleanOwnerPhone.replace(/\D/g, '').length < 7) {
      setSetupError('If provided, owner phone number should have at least 7 digits.');
      return;
    }
    if (cleanCity.length < 2) {
      setSetupError('City / State must be at least 2 characters.');
      return;
    }
    if (cleanGstin && !/^[A-Z0-9]{10,20}$/.test(cleanGstin)) {
      setSetupError('If provided, Tax ID / GSTIN must be 10–20 alphanumeric characters.');
      return;
    }
    if (cleanWa && cleanWa.replace(/\D/g, '').length < 10) {
      setSetupError('If provided, WhatsApp number should have at least 10 digits.');
      return;
    }

    if (enabledModules.length === 0) {
      setSetupError('Please keep at least one business module enabled.');
      return;
    }

    setSetupLoading(true);
    try {
      const workspace = await createBusinessWorkspace(user.uid, user.email || '', {
        shopName: cleanShop,
        ownerName: cleanOwner,
        ownerPhone: cleanOwnerPhone,
        businessType: cleanType || 'Sole Proprietorship',
        category,
        businessSize,
        country,
        currency,
        address: cleanAddress,
        city: cleanCity,
        gstin: cleanGstin,
        whatsappNumber: cleanWa,
        logoUrl,
        businessGoals,
        enabledModules,
        preloadDemo,
        isFirstBusiness: true,
      });
      onProfileCreated(workspace);
    } catch (err) {
      setSetupError(formatFriendlyFirestoreError(err));
    } finally {
      setSetupLoading(false);
    }
  };

  // Unauthenticated View: Shop Owner Login & Signup
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-slate-950 text-white p-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">SmartBiz AI</h1>
                <p className="text-xs text-slate-300">
                  Intelligent SaaS Platform for Indian Small Businesses
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 rounded-xl border border-slate-200 p-1 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('login');
                  setAuthError(null);
                  setAuthInfo(null);
                }}
                className={`min-h-[36px] rounded-lg text-xs font-semibold transition-colors ${
                  authTab === 'login' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('signup');
                  setAuthError(null);
                  setAuthInfo(null);
                }}
                className={`min-h-[36px] rounded-lg text-xs font-semibold transition-colors ${
                  authTab === 'signup' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {authInfo && (
              <div
                role="status"
                className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{authInfo}</span>
              </div>
            )}

            <form onSubmit={handleEmailAuthSubmit} className="space-y-3">
              {authTab === 'signup' && (
                <div>
                  <label htmlFor="authName" className="block text-xs font-medium text-slate-700 mb-1">
                    Owner Full Name
                  </label>
                  <input
                    id="authName"
                    type="text"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    placeholder="e.g. Rajesh Deshmukh"
                    maxLength={80}
                    required
                    className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              )}

              <div>
                <label htmlFor="authEmail" className="block text-xs font-medium text-slate-700 mb-1">
                  Business Email
                </label>
                <input
                  id="authEmail"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="owner@yourshop.in"
                  autoComplete="email"
                  required
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="authPassword" className="text-xs font-medium text-slate-700">
                    Password
                  </label>
                  {authTab === 'login' && (
                    <button
                      type="button"
                      onClick={() => void handleForgotPassword()}
                      className="text-[11px] font-semibold text-violet-700 hover:text-violet-800"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="authPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder={authTab === 'signup' ? 'At least 6 characters' : 'Enter password'}
                    autoComplete={authTab === 'signup' ? 'new-password' : 'current-password'}
                    required
                    minLength={6}
                    className="w-full min-h-[40px] pl-3 pr-10 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authTab === 'signup' && (
                <div>
                  <label htmlFor="authConfirmPassword" className="block text-xs font-medium text-slate-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    id="authConfirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-sm font-semibold text-white transition-colors inline-flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : authTab === 'signup' ? (
                  <UserPlus className="w-4 h-4" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>
                  {authLoading
                    ? authTab === 'signup'
                      ? 'Creating Account...'
                      : 'Signing In...'
                    : authTab === 'signup'
                      ? 'Create Shop Account'
                      : 'Sign In with Email'}
                </span>
              </button>
            </form>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-slate-200" />
              <span className="shrink mx-3 text-[11px] font-medium text-slate-400">OR</span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <button
              type="button"
              disabled={authLoading}
              onClick={() => void handleGoogleLogin()}
              className="w-full min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60 text-sm font-semibold text-slate-800 transition-colors inline-flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-violet-600" />
              <span>Continue with Google</span>
            </button>

            <div className="space-y-1.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Private shop ledger isolated per verified owner account</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                <span>Hindi &amp; English AI advisor, forecasting, CRM &amp; WhatsApp reports</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Email Verification Gate
  if (!user.emailVerified) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-amber-700">
            <MailCheck className="w-5 h-5 shrink-0 text-violet-600" />
            <h1 className="text-base font-bold text-slate-900">Verify Your Business Email</h1>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            We sent a verification link to <strong className="text-slate-900">{user.email}</strong>. Click
            the link in your email inbox to unlock your private shop database, then click below to continue.
          </p>

          {verifyMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              {verifyMsg}
            </div>
          )}
          {verifyError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {verifyError}
            </div>
          )}

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={verifyBusy}
              onClick={() => void handleRefreshVerification()}
              className="w-full min-h-[42px] px-4 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-xs font-semibold text-white inline-flex items-center justify-center gap-2"
            >
              {verifyBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              I&apos;ve Verified — Continue
            </button>

            <button
              type="button"
              disabled={verifyBusy}
              onClick={() => void handleResendVerification()}
              className="w-full min-h-[38px] px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
            >
              Resend Verification Email
            </button>

            <button
              type="button"
              onClick={() => void signOutShopOwner()}
              className="w-full min-h-[38px] px-4 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out &amp; Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // First-time onboarding: Business Setup & Automatic Module Configuration
  if (!shopProfile) {
    const recommendedIds = getRecommendedModulesForCategory(category, businessSize);
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
        <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-slate-950 text-white p-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold tracking-tight">Set Up Your Business Workspace</h1>
                <p className="text-xs text-slate-300 truncate">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void signOutShopOwner()}
              className="min-h-[34px] px-3 rounded-lg border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-800 inline-flex items-center gap-1.5 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>

          <form onSubmit={handleCreateProfile} className="p-6 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Select your industry category and business size to automatically recommend and configure
              relevant modules. You can customize modules or add more businesses later anytime.
            </p>

            {setupError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{setupError}</span>
              </div>
            )}

            {/* Business Logo Upload */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
              <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Business logo preview" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-800">Business Logo (Optional)</div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  PNG, JPG, WebP, or SVG. Automatically optimized for your workspace &amp; reports.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="min-h-[32px] px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer">
                    {logoBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5 text-violet-600" />}
                    <span>{logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      disabled={logoBusy}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        setSetupError(null);
                        setLogoBusy(true);
                        try {
                          const processed = await processBusinessLogoFile(file);
                          setLogoUrl(processed);
                        } catch (err) {
                          setSetupError(err instanceof Error ? err.message : 'Unable to process logo.');
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
                      className="min-h-[32px] px-2.5 rounded-lg text-xs font-medium text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label htmlFor="setupShopName" className="block text-xs font-medium text-slate-700 mb-1">
                  Business Name
                </label>
                <input
                  id="setupShopName"
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Deshmukh Supermart & Traders"
                  maxLength={100}
                  required
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="setupCategory" className="block text-xs font-medium text-slate-700 mb-1">
                  Industry
                </label>
                <select
                  id="setupCategory"
                  value={category}
                  onChange={(e) => {
                    const nextCat = e.target.value as BusinessCategory;
                    setCategory(nextCat);
                    if (nextCat === 'Freelancer') {
                      setBusinessType('Independent / Freelance');
                      setBusinessSize('Solo / Micro (1)');
                      setEnabledModules(getRecommendedModulesForCategory(nextCat, 'Solo / Micro (1)'));
                    } else {
                      setEnabledModules(getRecommendedModulesForCategory(nextCat, businessSize));
                    }
                  }}
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {BUSINESS_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="setupType" className="block text-xs font-medium text-slate-700 mb-1">
                  Business Type
                </label>
                <select
                  id="setupType"
                  value={BUSINESS_TYPE_OPTIONS.includes(businessType) ? businessType : 'Other'}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {BUSINESS_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="setupSize" className="block text-xs font-medium text-slate-700 mb-1">
                  Team Size
                </label>
                <select
                  id="setupSize"
                  value={businessSize}
                  onChange={(e) => {
                    const nextSize = e.target.value as BusinessSize;
                    setBusinessSize(nextSize);
                    setEnabledModules(getRecommendedModulesForCategory(category, nextSize));
                  }}
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {BUSINESS_SIZES.map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="setupCountry" className="block text-xs font-medium text-slate-700 mb-1">
                  Country / Region
                </label>
                <select
                  id="setupCountry"
                  value={country}
                  onChange={(e) => {
                    const nextCountry = e.target.value;
                    setCountry((prev) => {
                      if (currency === getDefaultCurrencyForCountry(prev)) {
                        setCurrency(getDefaultCurrencyForCountry(nextCountry));
                      }
                      return nextCountry;
                    });
                  }}
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.country} value={c.country}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="setupCurrency" className="block text-xs font-medium text-slate-700 mb-1">
                  Preferred Currency
                </label>
                <select
                  id="setupCurrency"
                  value={currency}
                  onChange={(e) => setCurrency(normalizeCurrencyCode(e.target.value))}
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol.trim()}) — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="setupCity" className="block text-xs font-medium text-slate-700 mb-1">
                  City / State
                </label>
                <input
                  id="setupCity"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Pune, Maharashtra"
                  maxLength={80}
                  required
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="setupAddress" className="block text-xs font-medium text-slate-700 mb-1">
                  Business Address
                </label>
                <input
                  id="setupAddress"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Shop / Office number, street, locality, postal code"
                  maxLength={200}
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="setupOwnerName" className="block text-xs font-medium text-slate-700 mb-1">
                  Owner Full Name
                </label>
                <input
                  id="setupOwnerName"
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Rajesh Deshmukh"
                  maxLength={100}
                  required
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="setupOwnerPhone" className="block text-xs font-medium text-slate-700 mb-1">
                  Owner Phone (Optional)
                </label>
                <input
                  id="setupOwnerPhone"
                  type="tel"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="e.g. +91 98201 44110"
                  maxLength={20}
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono-num text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="setupWhatsapp" className="block text-xs font-medium text-slate-700 mb-1">
                  WhatsApp Report Number (Optional)
                </label>
                <input
                  id="setupWhatsapp"
                  type="tel"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. +91 98201 44110"
                  maxLength={20}
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono-num text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label htmlFor="setupGstin" className="block text-xs font-medium text-slate-700 mb-1">
                  Tax ID / GSTIN (Optional · {currency})
                </label>
                <input
                  id="setupGstin"
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="e.g. 27AABCU9603R1ZM"
                  maxLength={20}
                  className="w-full min-h-[40px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-mono-num text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Auto-Recommended Modules Preview & Toggle */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Recommended Modules for {category} ({enabledModules.length} active)
                </span>
                <button
                  type="button"
                  onClick={() => setEnabledModules([...recommendedIds])}
                  className="text-xs font-semibold text-violet-700 hover:underline"
                >
                  Apply Recommended
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {UNIVERSAL_MODULES.map((mod) => {
                  const active = enabledModules.includes(mod.id);
                  const isRec = recommendedIds.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => {
                        setEnabledModules((prev) =>
                          prev.includes(mod.id)
                            ? prev.length > 1
                              ? prev.filter((id) => id !== mod.id)
                              : prev
                            : [...prev, mod.id]
                        );
                      }}
                      className={`min-h-[30px] px-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-violet-600 border-violet-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {mod.label}
                      {isRec && !active ? ' (Rec)' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Business Goals */}
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-700">Primary Business Goals</span>
              <div className="flex flex-wrap gap-1.5">
                {BUSINESS_GOAL_OPTIONS.slice(0, 5).map((goal) => {
                  const active = businessGoals.includes(goal);
                  return (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => {
                        setBusinessGoals((prev) =>
                          prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
                        );
                      }}
                      className={`min-h-[28px] px-2.5 rounded-lg border text-[11px] font-medium transition-colors ${
                        active
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

            <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-violet-200 bg-violet-50/50 cursor-pointer">
              <input
                type="checkbox"
                checked={preloadDemo}
                onChange={(e) => setPreloadDemo(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              />
              <div className="text-xs">
                <span className="font-semibold text-slate-900 block">
                  Preload Sample Demo Data (12-Month Indian SMB Dataset)
                </span>
                <span className="text-slate-600">
                  Clearly labeled as sample demo data (sales, expenses, inventory SKUs, and customers).
                  Uncheck to start with a blank ledger for your actual CSV or live entries.
                </span>
              </div>
            </label>

            <button
              type="submit"
              disabled={setupLoading}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-sm font-semibold text-white transition-colors inline-flex items-center justify-center gap-2"
            >
              {setupLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{setupLoading ? 'Configuring Business Workspace...' : 'Create My Business Dashboard'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}
