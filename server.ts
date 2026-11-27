import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function callWithTransientRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTransient = msg.includes('429') || msg.includes('503') || msg.includes('UNAVAILABLE');
    if (!isTransient) throw err;
    await new Promise((r) => setTimeout(r, 700));
    return await fn();
  }
}

type AiLanguage = 'en' | 'hi' | 'bilingual';

interface ChatHistoryTurn {
  role: 'user' | 'assistant';
  text: string;
}

interface BusinessContextPayload {
  businessName?: string;
  businessType?: string;
  country?: string;
  city?: string;
  dataSource?: string;
  currency?: string;
  currencyCode?: string;
  dateRange?: string;
  kpis?: Record<string, unknown>;
  pnl?: Record<string, unknown>;
  customerSummary?: Record<string, unknown>;
  topProducts?: unknown[];
  lowProducts?: unknown[];
  categories?: unknown[];
  regions?: unknown[];
  expenseCategories?: unknown[];
  lowStockItems?: unknown[];
  inventoryVelocity?: unknown[];
  monthlySummary?: Array<{
    month: string;
    revenueNum?: number;
    expensesNum?: number;
    netProfitNum?: number;
    orders?: number;
    revenue?: string;
    expenses?: string;
    netProfit?: string;
  }>;
  yearlySummary?: unknown[];
  recentSalesSample?: unknown[];
  recentExpensesSample?: unknown[];
}

function normalizeLanguage(lang: unknown): AiLanguage {
  if (lang === 'hi' || lang === 'bilingual' || lang === 'en') return lang;
  return 'bilingual';
}

function getCurrencyLabel(context?: BusinessContextPayload): string {
  return context?.currency && context.currency.trim() ? context.currency.trim() : 'INR (₹)';
}

function getLanguageInstruction(
  lang: AiLanguage,
  isStructuredJson = false,
  currencyDisplay = 'INR (₹)'
): string {
  if (lang === 'hi') {
    return isStructuredJson
      ? `Respond with natural, clear Hindi written in Devanagari script (हिन्दी) for all human-readable text values (titles, summaries, reasons, drivers, alerts, risks, growthLevers), while keeping JSON keys, SKU codes, and product/category names exact. Use ${currencyDisplay} for monetary figures.`
      : `Respond in clear, professional Hindi (Devanagari script / हिन्दी) suited for business owners, keeping product/SKU names accurate and citing exact ${currencyDisplay} figures.`;
  }
  if (lang === 'bilingual') {
    return isStructuredJson
      ? `Write crisp, clear English for structured insights; keep product names and ${currencyDisplay} numbers exact.`
      : `Support both Hindi (Devanagari / Hinglish) and English seamlessly: automatically reply in Hindi (Devanagari) if the user writes in Hindi, Hinglish if they write in Hinglish, or English if they ask in English. Always cite exact ${currencyDisplay} numbers from the data.`;
  }
  return `Respond in crisp, professional English suited for SMB owners, citing exact ${currencyDisplay} figures.`;
}

function buildContextBrief(context: BusinessContextPayload | undefined): string {
  if (!context) return 'No business dataset summary provided.';
  return JSON.stringify(context, null, 2);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, model: MODEL_NAME });
  });

  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, history, context, language } = req.body as {
        message?: string;
        history?: ChatHistoryTurn[];
        context?: BusinessContextPayload;
        language?: AiLanguage;
      };

      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'A non-empty message is required.' });
        return;
      }

      const lang = normalizeLanguage(language);
      const currencyDisplay = getCurrencyLabel(context);
      const ai = getGeminiClient();
      const systemInstruction = [
        `You are SmartBiz AI, an expert Business Intelligence & Financial Advisor for small and medium businesses operating in ${currencyDisplay}.`,
        getLanguageInstruction(lang, false, currencyDisplay),
        'Answer questions strictly using the shop profile, live KPIs, Profit & Loss statement, customer analytics, monthly/yearly trends, category & regional splits, recent transactions, operating expenses, and inventory velocity/stock data provided in the context.',
        `Be concise, quantitative, and practical. Always cite exact figures in ${currencyDisplay} when available.`,
        'Note whether the snapshot is marked as Sample Demo Dataset or Actual Shop Business Data when relevant, and never invent sales figures, customers, or products that are not in the context.',
        'If the user has zero transactions yet, acknowledge that honestly and guide them on adding sales, expenses, or uploading a CSV rather than inventing numbers.',
        'If a user asks for strategic advice (pricing, cost reduction, customer retention, restocking, marketing), tie recommendations directly to their actual products, customers, expense categories, regions, and stock levels.',
        '',
        'LIVE SHOP BUSINESS DATA SNAPSHOT:',
        buildContextBrief(context),
      ].join('\n');

      const recentHistory = Array.isArray(history) ? history.slice(-10) : [];
      const contents = [
        ...recentHistory.map((turn) => ({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(turn.text || '').slice(0, 4000) }],
        })),
        {
          role: 'user',
          parts: [{ text: message.trim().slice(0, 4000) }],
        },
      ];

      const response = await callWithTransientRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents,
          config: {
            systemInstruction,
          },
        })
      );

      const reply = response.text?.trim();
      if (!reply) {
        res.status(502).json({ error: 'The AI model returned an empty response. Please try again.' });
        return;
      }

      res.json({ reply });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to communicate with Gemini AI.';
      const status = msg.includes('GEMINI_API_KEY') ? 503 : 500;
      res.status(status).json({ error: msg });
    }
  });

  app.post('/api/ai/recommendations', async (req, res) => {
    try {
      const { context, language } = req.body as {
        context?: BusinessContextPayload;
        language?: AiLanguage;
      };
      if (!context) {
        res.status(400).json({ error: 'Business context is required to generate recommendations.' });
        return;
      }

      const lang = normalizeLanguage(language);
      const currencyDisplay = getCurrencyLabel(context);
      const ai = getGeminiClient();
      const response = await callWithTransientRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: [
            `Analyze the following live shop business data (${currencyDisplay} sales, P&L, customer analytics, operating expenses, categories, regions, yearly/monthly trajectory, product performance, and inventory stock levels) and produce 4 to 6 specific, high-impact business recommendations.`,
            'Each recommendation must cite real product names, categories, expense items, customers, or stock counts from the data.',
            getLanguageInstruction(lang, true, currencyDisplay),
            '',
            buildContextBrief(context),
          ].join('\n'),
          config: {
            systemInstruction: [
              `You are a senior Small Business CFO and Operations Advisor for SMBs operating in ${currencyDisplay}. Return strictly structured JSON recommendations grounded in the provided shop business snapshot.`,
              getLanguageInstruction(lang, true, currencyDisplay),
            ].join(' '),
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: {
                    type: Type.STRING,
                    description: 'Short area label such as Pricing, Cost Control, Inventory, Customers, Growth, or Margin.',
                  },
                  priority: {
                    type: Type.STRING,
                    description: 'One of: High, Medium, or Quick Win.',
                  },
                  title: {
                    type: Type.STRING,
                    description: 'Concise action-oriented headline under 12 words.',
                  },
                  rationale: {
                    type: Type.STRING,
                    description: `2-3 sentence data-backed explanation referencing exact ${currencyDisplay} figures from the snapshot.`,
                  },
                  impact: {
                    type: Type.STRING,
                    description: `Expected measurable business outcome (e.g., ${currencyDisplay} profit lift, stockout prevention, or expense savings).`,
                  },
                },
                required: ['category', 'priority', 'title', 'rationale', 'impact'],
              },
            },
          },
        })
      );

      const rawJson = (response.text ?? '[]').trim();
      const parsed = JSON.parse(rawJson);
      if (!Array.isArray(parsed)) {
        res.status(502).json({ error: 'Unexpected response format from Gemini AI.' });
        return;
      }

      res.json({ recommendations: parsed });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate AI recommendations.';
      const status = msg.includes('GEMINI_API_KEY') ? 503 : 500;
      res.status(status).json({ error: msg });
    }
  });

  app.post('/api/ai/forecast', async (req, res) => {
    try {
      const { context, horizonMonths, nextMonths, language } = req.body as {
        context?: BusinessContextPayload;
        horizonMonths?: number;
        nextMonths?: Array<{ ym: string; label: string }>;
        language?: AiLanguage;
      };

      if (!context || !Array.isArray(context.monthlySummary)) {
        res.status(400).json({ error: 'Monthly historical data is required for forecasting.' });
        return;
      }

      const validMonths = context.monthlySummary.filter((m) => (m.orders ?? 0) > 0 || (m.revenueNum ?? 0) > 0);
      if (validMonths.length < 2) {
        res.status(400).json({
          error:
            'Insufficient historical data for AI forecasting. Please record or upload at least 2 months of sales transactions.',
        });
        return;
      }

      const horizon = horizonMonths === 6 ? 6 : 3;
      const currencyDisplay = getCurrencyLabel(context);
      const labelLocale = context.currencyCode === 'INR' ? 'en-IN' : 'en-US';
      const targetMonths =
        Array.isArray(nextMonths) && nextMonths.length === horizon
          ? nextMonths
          : Array.from({ length: horizon }, (_, idx) => {
              const lastYm = validMonths[validMonths.length - 1].month;
              const [y, m] = lastYm.split('-').map(Number);
              const dt = new Date(y || 2026, (m || 1) - 1 + (idx + 1), 1);
              const ym = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
              const label = dt.toLocaleDateString(labelLocale, { month: 'short', year: 'numeric' });
              return { ym, label };
            });

      const lang = normalizeLanguage(language);
      const ai = getGeminiClient();

      const response = await callWithTransientRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: [
            `Generate a ${horizon}-month AI Sales & Net Profit Forecast in ${currencyDisplay} strictly grounded in the shop's observed monthly trajectory, product categories, customer base, and operating expense structure.`,
            `You MUST output exactly ${horizon} items in projectedMonths matching these target months in exact order:`,
            JSON.stringify(targetMonths),
            'Ensure conservativeRevenue <= projectedRevenue <= optimisticRevenue, and projectedNetProfit reflects realistic COGS + operating expense ratios from the data.',
            getLanguageInstruction(lang, true, currencyDisplay),
            '',
            'OBSERVED SHOP DATA:',
            buildContextBrief(context),
          ].join('\n'),
          config: {
            systemInstruction: [
              `You are a Quantitative Financial Forecasting Analyst for SMBs (${currencyDisplay}).`,
              'Never fabricate unrelated industries or ignore the historical baseline in monthlySummary.',
              'Return strictly structured JSON matching the schema.',
              getLanguageInstruction(lang, true, currencyDisplay),
            ].join(' '),
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                methodologySummary: {
                  type: Type.STRING,
                  description: '2-3 sentences explaining how the forecast was derived from the historical monthly trend and expense ratio.',
                },
                confidenceLevel: {
                  type: Type.STRING,
                  description: 'Must be one of: High, Medium, or Low based on data depth and variance.',
                },
                projectedMonths: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      ym: { type: Type.STRING },
                      label: { type: Type.STRING },
                      projectedRevenue: { type: Type.NUMBER },
                      conservativeRevenue: { type: Type.NUMBER },
                      optimisticRevenue: { type: Type.NUMBER },
                      projectedNetProfit: { type: Type.NUMBER },
                      keyDriver: { type: Type.STRING },
                    },
                    required: [
                      'ym',
                      'label',
                      'projectedRevenue',
                      'conservativeRevenue',
                      'optimisticRevenue',
                      'projectedNetProfit',
                      'keyDriver',
                    ],
                  },
                },
                riskFactors: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                growthLevers: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                'methodologySummary',
                'confidenceLevel',
                'projectedMonths',
                'riskFactors',
                'growthLevers',
              ],
            },
          },
        })
      );

      const raw = (response.text ?? '{}').trim();
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!Array.isArray(parsed.projectedMonths) || parsed.projectedMonths.length === 0) {
        res.status(502).json({ error: 'Gemini AI returned an incomplete forecast payload. Please retry.' });
        return;
      }

      res.json({ forecast: parsed });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate AI sales forecast.';
      const status = msg.includes('GEMINI_API_KEY') ? 503 : 500;
      res.status(status).json({ error: msg });
    }
  });

  app.post('/api/ai/inventory-prediction', async (req, res) => {
    try {
      const { context, language } = req.body as {
        context?: BusinessContextPayload;
        language?: AiLanguage;
      };

      if (!context || !Array.isArray(context.inventoryVelocity) || context.inventoryVelocity.length === 0) {
        res.status(400).json({
          error: 'No inventory SKUs found. Add products in Inventory & Alerts first to run smart stock prediction.',
        });
        return;
      }

      const lang = normalizeLanguage(language);
      const currencyDisplay = getCurrencyLabel(context);
      const ai = getGeminiClient();

      const response = await callWithTransientRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: [
            'Analyze inventoryVelocity (current stock, reorderLevel, unitCost, dailyRunRate, daysUntilStockout, suggestedReorderQty) alongside recent sales velocity and topProducts.',
            `Prioritize SKUs at highest risk of stockout, calculate exact ${currencyDisplay} restock budget (suggestedOrderQty * unitCost), and flag any slow-moving or overstocked SKUs tying up working capital.`,
            getLanguageInstruction(lang, true, currencyDisplay),
            '',
            buildContextBrief({
              businessName: context.businessName,
              currency: currencyDisplay,
              currencyCode: context.currencyCode,
              dataSource: context.dataSource,
              dateRange: context.dateRange,
              topProducts: context.topProducts,
              inventoryVelocity: context.inventoryVelocity,
              lowStockItems: context.lowStockItems,
            }),
          ].join('\n'),
          config: {
            systemInstruction: [
              `You are an Inventory & Supply Chain Optimization Specialist for SMBs (${currencyDisplay}).`,
              'Return strictly structured JSON grounded only in the provided SKUs and run rates.',
              getLanguageInstruction(lang, true, currencyDisplay),
            ].join(' '),
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: {
                  type: Type.STRING,
                  description: `2-3 sentence executive summary of stockout risk and total restock capital needed in ${currencyDisplay}.`,
                },
                totalEstimatedRestock: {
                  type: Type.NUMBER,
                },
                recommendations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      sku: { type: Type.STRING },
                      productName: { type: Type.STRING },
                      urgency: {
                        type: Type.STRING,
                        description: 'One of: Critical, High, Medium, Watch',
                      },
                      suggestedOrderQty: { type: Type.NUMBER },
                      estimatedCost: { type: Type.NUMBER },
                      reason: { type: Type.STRING },
                    },
                    required: [
                      'sku',
                      'productName',
                      'urgency',
                      'suggestedOrderQty',
                      'estimatedCost',
                      'reason',
                    ],
                  },
                },
                slowMovingAlerts: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['summary', 'totalEstimatedRestock', 'recommendations', 'slowMovingAlerts'],
            },
          },
        })
      );

      const raw = (response.text ?? '{}').trim();
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!Array.isArray(parsed.recommendations)) {
        res.status(502).json({ error: 'Gemini AI returned an unexpected inventory prediction format.' });
        return;
      }

      res.json({ prediction: parsed });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate AI inventory prediction.';
      const status = msg.includes('GEMINI_API_KEY') ? 503 : 500;
      res.status(status).json({ error: msg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartBiz AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SmartBiz AI server:', err);
  process.exit(1);
});
