import { useEffect, useState, type FormEvent } from 'react';
import { Sparkles } from 'lucide-react';
import type { AnalyticsSummary, IntelligenceReport } from '../../types/bi';
import { answerUserQuestion, type QaAnswer } from '../../utils/analytics';

interface AiInsightsViewProps {
  stats: AnalyticsSummary;
  intel: IntelligenceReport;
}

const QUICK_PROMPTS = [
  { label: 'Best product?', query: 'Which product is performing best?' },
  { label: 'Peak revenue month?', query: 'Which month has the highest revenue?' },
  { label: 'Most profitable category?', query: 'Which category generates the most profit?' },
  { label: 'Products needing improvement?', query: 'Which products need improvement?' },
  { label: 'Regional opportunity?', query: 'Which region should we target?' },
  { label: 'Growth suggestions?', query: 'How can we increase sales and profits?' },
];

const VARIANT_TEXT_COLOR: Record<string, string> = {
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  info: 'text-blue-700',
  default: 'text-violet-700',
};

export function AiInsightsView({ stats, intel }: AiInsightsViewProps) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<QaAnswer>({
    headline: 'SmartBiz AI Ready',
    body: 'Select any quick prompt above or type your own business question to get an instant data-backed answer.',
  });

  useEffect(() => {
    if (query.trim()) {
      setAnswer(answerUserQuestion(query, stats));
    }
  }, [stats]);

  const runQuery = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setAnswer(answerUserQuestion(trimmed, stats));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    runQuery(query);
  };

  return (
    <div className="space-y-6">
      {/* Interactive Q&A Panel */}
      <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-7 border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-violet-300 mb-2">
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          <span>Local Analytical Engine</span>
        </div>
        <h3 className="text-xl font-bold tracking-tight text-white">
          Ask SmartBiz AI About Your Business
        </h3>
        <p className="text-sm text-slate-300 mt-1">
          Instant deterministic intelligence computed live from your current filtered dataset.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask e.g. 'Which product is best?', 'Which month had highest revenue?', 'How can we improve profit?'"
            aria-label="Ask a business question"
            className="flex-1 min-h-[44px] px-4 rounded-lg bg-slate-800/90 border border-slate-700 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
          <button
            type="submit"
            className="min-h-[44px] px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            Analyze Now
          </button>
        </form>

        <div className="mt-3.5 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setQuery(item.query);
                runQuery(item.query);
              }}
              className="min-h-[34px] px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 hover:bg-violet-600 hover:border-violet-500 hover:text-white transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4 bg-slate-950/70 border border-slate-800 rounded-lg p-4 text-sm leading-relaxed text-slate-100">
          <span className="font-semibold text-violet-300">{answer.headline}: </span>
          <span>{answer.body}</span>
        </div>
      </div>

      {/* Automated Business Insights */}
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

      {/* Actionable Business Recommendations */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3.5">Actionable Business Recommendations</h3>
        {intel.recommendations.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
            Recommendations will appear once active transaction data is available.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {intel.recommendations.map((rec) => (
              <div key={rec.title} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h4 className="text-sm font-bold text-slate-900">{rec.title}</h4>
                  <span
                    className={`text-xs font-semibold whitespace-nowrap shrink-0 ${
                      VARIANT_TEXT_COLOR[rec.variant] || 'text-violet-700'
                    }`}
                  >
                    {rec.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{rec.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
