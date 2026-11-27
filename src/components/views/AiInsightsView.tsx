import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { ChartConfiguration } from 'chart.js';
import {
  AlertCircle,
  Bot,
  Languages,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type {
  AiLanguage,
  AiRecommendation,
  AnalyticsSummary,
  ChatMessage,
  CurrencyCode,
  CustomerRecord,
  ExpenseRecord,
  IntelligenceReport,
  InventoryItem,
  ProfitAndLossSummary,
  SalesForecastResponse,
  SalesRecord,
  ShopProfile,
} from '../../types/bi';
import {
  buildAiBusinessContext,
  computeSalesForecastBaseline,
  fmtCurrency,
  fmtMonthLabel,
  fmtShortAxisCurrency,
  roundCurrencyAmount,
} from '../../utils/analytics';
import { getCurrencyMeta } from '../../utils/businessConfig';
import { ChartCanvas } from '../ChartCanvas';

interface AiInsightsViewProps {
  currency: CurrencyCode;
  shopProfile: ShopProfile;
  stats: AnalyticsSummary;
  pnl: ProfitAndLossSummary;
  intel: IntelligenceReport;
  inventory: InventoryItem[];
  customers: CustomerRecord[];
  filteredSales: SalesRecord[];
  filteredExpenses: ExpenseRecord[];
  dateRangeLabel: string;
}

const QUICK_PROMPTS_EN = [
  { label: 'P&L & Profit Health', query: 'Summarize my current sales, operating expenses, and net profit or loss.' },
  { label: 'Best & Weakest Products', query: 'Which products drive the most revenue and margin, and which need attention?' },
  { label: 'Urgent Inventory Restocks', query: 'Which inventory SKUs are low or out of stock and what should I reorder first?' },
  { label: 'Top Customers & Retention', query: 'Analyze my customer base and tell me how to increase repeat orders.' },
  { label: 'Cut Operating Costs', query: 'Analyze my operating expense categories and suggest practical ways to reduce overhead.' },
];

const QUICK_PROMPTS_HI = [
  { label: 'मुनाफा और खर्च (P&L)', query: 'मेरी कुल बिक्री, खर्च और शुद्ध मुनाफे (Net Profit) का पूरा विश्लेषण हिंदी में बताएं।' },
  { label: 'टॉप और कमज़ोर उत्पाद', query: 'मेरे कौन से प्रोडक्ट सबसे ज्यादा कमाई और मार्जिन दे रहे हैं और किस पर ध्यान देना चाहिए?' },
  { label: 'स्टॉक री-ऑर्डर अलर्ट', query: 'कौन से आइटम लो-स्टॉक या आउट-ऑफ-स्टॉक हैं और पहले क्या मंगवाना चाहिए?' },
  { label: 'ग्राहक और रिपीट ऑर्डर', query: 'मेरे टॉप ग्राहक कौन हैं और रिपीट बिक्री बढ़ाने के लिए क्या करना चाहिए?' },
  { label: 'खर्च कम करने के उपाय', query: 'मेरे मुख्य खर्च क्या हैं और मुनाफा बढ़ाने के लिए खर्च कैसे कम करें?' },
];

const PRIORITY_STYLE: Record<string, string> = {
  High: 'text-rose-700',
  Medium: 'text-amber-700',
  'Quick Win': 'text-emerald-700',
};

export function AiInsightsView({
  currency,
  shopProfile,
  stats,
  pnl,
  intel,
  inventory,
  customers,
  filteredSales,
  filteredExpenses,
  dateRangeLabel,
}: AiInsightsViewProps) {
  const currencyMeta = getCurrencyMeta(currency);
  const currencyLabel = `${currencyMeta.code} (${currencyMeta.symbol.trim()})`;
  const [language, setLanguage] = useState<AiLanguage>('bilingual');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      text: `Namaste ${shopProfile.ownerName}! I am SmartBiz AI, connected directly to ${shopProfile.shopName}'s live sales, operating expenses, customers, P&L statement, and inventory catalog in ${currencyLabel}.\n\nआप मुझसे English, हिन्दी या Hinglish में कोई भी बिज़नेस सवाल पूछ सकते हैं।`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Forecasting state
  const [horizonMonths, setHorizonMonths] = useState<3 | 6>(3);
  const [forecast, setForecast] = useState<SalesForecastResponse | null>(null);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);

  // Recommendations state
  const [aiRecs, setAiRecs] = useState<AiRecommendation[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [recsError, setRecsError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === 'welcome'
          ? {
              ...m,
              text: `Namaste ${shopProfile.ownerName}! I am SmartBiz AI, connected directly to ${shopProfile.shopName}'s live sales, operating expenses, customers, P&L statement, and inventory catalog in ${currencyLabel}.\n\nआप मुझसे English, हिन्दी या Hinglish में कोई भी बिज़नेस सवाल पूछ सकते हैं।`,
            }
          : m
      )
    );
  }, [shopProfile.ownerName, shopProfile.shopName, currencyLabel]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const contextPayload = useMemo(
    () =>
      buildAiBusinessContext({
        shopProfile: { ...shopProfile, currency },
        dateRange: dateRangeLabel,
        stats,
        pnl,
        inventory,
        customers,
        recentSales: filteredSales,
        recentExpenses: filteredExpenses,
      }),
    [shopProfile, currency, dateRangeLabel, stats, pnl, inventory, customers, filteredSales, filteredExpenses]
  );

  const forecastBaseline = useMemo(
    () => computeSalesForecastBaseline(filteredSales, filteredExpenses, currency),
    [filteredSales, filteredExpenses, currency]
  );

  const forecastChartConfig = useMemo<ChartConfiguration | null>(() => {
    if (!forecast || forecast.projectedMonths.length === 0) return null;
    const histMonths = stats.monthly.slice(-6);
    const projMonths = forecast.projectedMonths;

    const labels = [
      ...histMonths.map((m) => fmtMonthLabel(m.ym, currency)),
      ...projMonths.map((p) => p.label || fmtMonthLabel(p.ym, currency)),
    ];

    const histData: Array<number | null> = [
      ...histMonths.map((m) => roundCurrencyAmount(m.revenue, currency)),
      ...projMonths.map(() => null),
    ];

    const lastHistRev =
      histMonths.length > 0 ? roundCurrencyAmount(histMonths[histMonths.length - 1].revenue, currency) : null;
    const bridgePrefix: Array<number | null> = histMonths.map((_, idx) =>
      idx === histMonths.length - 1 ? lastHistRev : null
    );

    const projectedData: Array<number | null> = [
      ...bridgePrefix,
      ...projMonths.map((p) => roundCurrencyAmount(p.projectedRevenue, currency)),
    ];
    const optimisticData: Array<number | null> = [
      ...bridgePrefix,
      ...projMonths.map((p) => roundCurrencyAmount(p.optimisticRevenue, currency)),
    ];
    const conservativeData: Array<number | null> = [
      ...bridgePrefix,
      ...projMonths.map((p) => roundCurrencyAmount(p.conservativeRevenue, currency)),
    ];

    return {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Actual Historical Revenue',
            data: histData,
            borderColor: '#0F172A',
            backgroundColor: 'rgba(15, 23, 42, 0.08)',
            borderWidth: 2.5,
            tension: 0.3,
            pointRadius: 3.5,
          },
          {
            label: 'AI Projected Revenue',
            data: projectedData,
            borderColor: '#6D28D9',
            backgroundColor: 'rgba(109, 40, 217, 0.10)',
            borderDash: [6, 4],
            borderWidth: 2.5,
            tension: 0.3,
            pointRadius: 4,
          },
          {
            label: 'Optimistic Upper Bound',
            data: optimisticData,
            borderColor: '#059669',
            borderDash: [3, 3],
            borderWidth: 1.5,
            tension: 0.3,
            pointRadius: 2.5,
          },
          {
            label: 'Conservative Floor',
            data: conservativeData,
            borderColor: '#D97706',
            borderDash: [3, 3],
            borderWidth: 1.5,
            tension: 0.3,
            pointRadius: 2.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { usePointStyle: true, boxWidth: 8, font: { family: 'DM Sans', size: 12 } },
          },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 11,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) =>
                ctx.parsed.y !== null
                  ? `${ctx.dataset.label}: ${fmtCurrency(Number(ctx.parsed.y), currency)}`
                  : '',
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 }, color: '#64748B' } },
          y: {
            grid: { color: '#F1F5F9' },
            ticks: {
              font: { family: 'JetBrains Mono', size: 11 },
              color: '#64748B',
              callback: (v) => fmtShortAxisCurrency(Number(v), currency),
            },
          },
        },
      },
    };
  }, [forecast, stats.monthly, currency]);

  const sendMessage = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isSending) return;

    setChatError(null);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setIsSending(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          language,
          history: messages
            .filter((m) => m.id !== 'welcome')
            .map((m) => ({ role: m.role, text: m.text })),
          context: contextPayload,
        }),
      });

      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        throw new Error(data.error || `AI request failed with status ${res.status}.`);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: data.reply!,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to reach the AI assistant.';
      setChatError(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleChatSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const handleGenerateForecast = async () => {
    if (isLoadingForecast || !forecastBaseline.hasEnoughHistory) return;
    setForecastError(null);
    setIsLoadingForecast(true);
    try {
      const nextMonths = forecastBaseline.nextMonthYmList(horizonMonths);
      const res = await fetch('/api/ai/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: contextPayload,
          horizonMonths,
          nextMonths,
          language,
        }),
      });
      const data = (await res.json()) as { forecast?: SalesForecastResponse; error?: string };
      if (!res.ok || !data.forecast) {
        throw new Error(data.error || `Sales forecast failed with status ${res.status}.`);
      }
      setForecast(data.forecast);
    } catch (err) {
      setForecastError(err instanceof Error ? err.message : 'Unable to generate sales forecast.');
    } finally {
      setIsLoadingForecast(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    if (isLoadingRecs) return;
    setRecsError(null);
    setIsLoadingRecs(true);
    try {
      const res = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: contextPayload, language }),
      });

      const data = (await res.json()) as { recommendations?: AiRecommendation[]; error?: string };
      if (!res.ok || !Array.isArray(data.recommendations)) {
        throw new Error(data.error || `AI recommendations failed with status ${res.status}.`);
      }
      setAiRecs(data.recommendations);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to generate AI recommendations.';
      setRecsError(msg);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const quickPrompts = language === 'hi' ? QUICK_PROMPTS_HI : QUICK_PROMPTS_EN;

  return (
    <div className="space-y-6">
      {/* Live Bilingual AI Business Chatbot */}
      <div className="bg-slate-900 text-white rounded-xl border border-slate-800 overflow-hidden flex flex-col">
        <div className="p-5 sm:p-6 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-violet-300 mb-1">
              <Bot className="w-4 h-4" aria-hidden="true" />
              <span>AI Business Advisor · {shopProfile.shopName}</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Ask SmartBiz AI in English or हिन्दी (Hindi)
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Grounded in your live ledger, P&amp;L, customers &amp; inventory ({contextPayload.dataSource}, {dateRangeLabel})
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto">
            <Languages className="w-4 h-4 text-violet-300 shrink-0" aria-hidden="true" />
            <div className="inline-flex rounded-lg border border-slate-700 p-0.5 bg-slate-950">
              {(
                [
                  ['bilingual', 'Auto / Hinglish'],
                  ['en', 'English'],
                  ['hi', 'हिन्दी'],
                ] as Array<[AiLanguage, string]>
              ).map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguage(code)}
                  className={`min-h-[32px] px-2.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    language === code
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Conversation Thread */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[360px] overflow-y-auto bg-slate-950/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-800/90 border border-slate-700 text-slate-100'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 px-1">
                {msg.role === 'user' ? 'You' : 'SmartBiz AI'} · {msg.timestamp}
              </span>
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-violet-300">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {language === 'hi'
                  ? 'आपके बिज़नेस डेटा का विश्लेषण हो रहा है...'
                  : 'Analyzing live business metrics...'}
              </span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {chatError && (
          <div
            role="alert"
            className="mx-5 sm:mx-6 mt-3 p-3 rounded-lg bg-rose-950/80 border border-rose-700 text-rose-200 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{chatError}</span>
          </div>
        )}

        <div className="p-5 sm:p-6 border-t border-slate-800 space-y-3">
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={isSending}
                onClick={() => void sendMessage(item.query)}
                className="min-h-[32px] px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 hover:bg-violet-600 hover:border-violet-500 hover:text-white disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {item.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleChatSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                language === 'hi'
                  ? "पूछें जैसे: 'इस महीने का नेट प्रॉफिट कितना है?' या 'कौन सा स्टॉक खत्म होने वाला है?'"
                  : "Ask in English or Hindi: 'What is my net profit?', 'अगले महीने की बिक्री कैसे बढ़ाएं?'"
              }
              aria-label="Ask SmartBiz AI a business question"
              className="flex-1 min-h-[44px] px-4 rounded-lg bg-slate-800/90 border border-slate-700 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="min-h-[44px] px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Send className="w-4 h-4" />
              {language === 'hi' ? 'भेजें' : 'Send'}
            </button>
          </form>
        </div>
      </div>

      {/* AI-Powered Sales Forecasting */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>AI Sales Forecasting · Grounded in {forecastBaseline.monthCount} Historical Months</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              AI-Powered Revenue &amp; Net Profit Forecast ({currencyLabel})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Combines your observed trailing monthly trend ({fmtCurrency(forecastBaseline.trailingAvgRevenue, currency)}/mo avg) with Gemini seasonal &amp; category analysis
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
              {([3, 6] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHorizonMonths(h)}
                  className={`min-h-[34px] px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    horizonMonths === h
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {h} Months
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={isLoadingForecast || !forecastBaseline.hasEnoughHistory}
              onClick={() => void handleGenerateForecast()}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-xs font-semibold text-white transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              {isLoadingForecast ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TrendingUp className="w-4 h-4" />
              )}
              {forecast ? 'Regenerate Forecast' : `Generate ${horizonMonths}-Month Forecast`}
            </button>
          </div>
        </div>

        {forecastError && (
          <div
            role="alert"
            className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{forecastError}</span>
          </div>
        )}

        {!forecastBaseline.hasEnoughHistory ? (
          <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            <strong>Insufficient Historical Data:</strong> At least 2 distinct months of sales transactions are
            required to generate a real AI sales forecast (currently {forecastBaseline.monthCount} month
            {forecastBaseline.monthCount === 1 ? '' : 's'} in active filter). Expand your date range or upload
            more months of CSV history.
          </div>
        ) : isLoadingForecast ? (
          <div className="h-[260px] rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center gap-2.5 text-sm text-slate-600">
            <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
            <span>Computing {horizonMonths}-month {currencyMeta.code} revenue &amp; profit projections...</span>
          </div>
        ) : forecast && forecastChartConfig ? (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-700 leading-relaxed">{forecast.methodologySummary}</p>
              <span className="text-xs font-bold text-violet-700 whitespace-nowrap shrink-0">
                Confidence: {forecast.confidenceLevel}
              </span>
            </div>

            <div className="relative h-[280px] w-full">
              <ChartCanvas config={forecastChartConfig} ariaLabel="AI Sales Forecast Trajectory Chart" />
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="text-left py-2.5 px-4 whitespace-nowrap">Month</th>
                    <th className="text-right py-2.5 px-4 whitespace-nowrap">Conservative</th>
                    <th className="text-right py-2.5 px-4 whitespace-nowrap">Projected Revenue</th>
                    <th className="text-right py-2.5 px-4 whitespace-nowrap">Optimistic</th>
                    <th className="text-right py-2.5 px-4 whitespace-nowrap">Est. Net Profit</th>
                    <th className="text-left py-2.5 px-4 whitespace-nowrap">Key Driver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {forecast.projectedMonths.map((m) => (
                    <tr key={m.ym} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">{m.label}</td>
                      <td className="py-2.5 px-4 text-right font-mono-num text-amber-700 whitespace-nowrap">
                        {fmtCurrency(m.conservativeRevenue, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-num font-bold text-violet-700 whitespace-nowrap">
                        {fmtCurrency(m.projectedRevenue, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-num text-emerald-700 whitespace-nowrap">
                        {fmtCurrency(m.optimisticRevenue, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                        {fmtCurrency(m.projectedNetProfit, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{m.keyDriver}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="text-xs font-bold text-emerald-700">Growth Levers Identified</div>
                <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
                  {forecast.growthLevers.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="text-xs font-bold text-amber-700">Forecast Risks to Watch</div>
                <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
                  {forecast.riskFactors.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>
              Click &ldquo;Generate {horizonMonths}-Month Forecast&rdquo; to build a Gemini-powered projection
              anchored strictly in your {forecastBaseline.monthCount} observed months of shop sales.
            </span>
          </div>
        )}
      </div>

      {/* AI-Powered Strategic Recommendations (Gemini) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI CFO &amp; Operations Strategy</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              AI-Powered Business Recommendations
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tailored action plan in {language === 'hi' ? 'हिन्दी (Hindi)' : 'English'} from your sales, customers, expenses &amp; stock alerts
            </p>
          </div>
          <button
            type="button"
            disabled={isLoadingRecs}
            onClick={() => void handleGenerateRecommendations()}
            className="min-h-[40px] px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-xs font-semibold text-white transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            {isLoadingRecs ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {aiRecs.length > 0 ? 'Refresh with Latest Data' : 'Generate AI Recommendations'}
          </button>
        </div>

        {recsError && (
          <div
            role="alert"
            className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{recsError}</span>
          </div>
        )}

        {isLoadingRecs ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="border border-slate-200 rounded-xl p-5 animate-pulse space-y-2">
                <div className="h-3 w-24 bg-slate-200 rounded" />
                <div className="h-4 w-3/4 bg-slate-200 rounded" />
                <div className="h-12 w-full bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : aiRecs.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            Click &ldquo;Generate AI Recommendations&rdquo; to have Gemini analyze your live P&amp;L, customer repeat rate, operating expenses, and low-stock SKUs.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {aiRecs.map((rec, idx) => (
              <div key={`${rec.title}-${idx}`} className="border border-slate-200 rounded-xl p-5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-violet-700">{rec.category}</span>
                  <span
                    className={`text-xs font-bold ${
                      PRIORITY_STYLE[rec.priority] || 'text-slate-700'
                    }`}
                  >
                    {rec.priority} Priority
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">{rec.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{rec.rationale}</p>
                <div className="pt-2 border-t border-slate-100 text-xs font-medium text-emerald-700">
                  Expected Impact: {rec.impact}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Quantitative Insights */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3.5">Automated Business Insights</h3>
        {intel.insights.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
            No transactions match the current filter selection. Reset filters to generate insights.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {intel.insights.map((ins) => (
              <div key={ins.type} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-violet-700">{ins.type}</span>
                <h4 className="text-sm font-bold text-slate-900">{ins.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{ins.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
