import React, { useEffect, useState } from 'react';
import { BrainCircuit, Info, Sparkles, Layers, ShieldAlert } from 'lucide-react';
import { TelemetryData } from '../../lib/types';
import { api } from '../../lib/api';
import { ProbabilityBreakdown } from './ProbabilityBreakdown';
import { FeatureImportanceChart } from './FeatureImportanceChart';
import { EvaluationHeatmap } from './EvaluationHeatmap';

interface AIAnalysisViewProps {
  latestTelemetry?: TelemetryData | null;
}

export const AIAnalysisView: React.FC<AIAnalysisViewProps> = ({ latestTelemetry }) => {
  const [featureImportances, setFeatureImportances] = useState<Record<string, number>>({});
  const [evalMetrics, setEvalMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [fi, ev] = await Promise.all([
          api.getFeatureImportance(),
          api.getEvaluationMetrics(),
        ]);
        setFeatureImportances(fi);
        setEvalMetrics(ev);
      } catch (e) {
        console.error('Failed to load AI analytics:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const riskResult = latestTelemetry?.risk_result;
  const explanation = riskResult?.explanation || {
    "Material Accumulation Rate": "LOW",
    "Behavioral Anomaly Index": "LOW",
    "Blockage State Progression": "LOW",
  };
  const contributions = riskResult?.contributions || {
    "Random Forest Classification": 15.0,
    "Isolation Forest Anomaly": 8.0,
    "Temporal Slope Trend": 2.0,
  };

  const getImpactBadge = (val: string) => {
    if (val === 'HIGH') return 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold';
    if (val === 'MEDIUM') return 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  };

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-cyan-400" />
            Explainable AI & Prediction Reasoning
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Transparent, multi-model explainability breaking down Random Forest classifications, Isolation Forest anomalies, and physical accumulation trends.
          </p>
        </div>
      </div>

      {/* Decision Factor Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(explanation).map(([factor, rating]) => (
          <div key={factor} className="rounded-xl border border-industrial-800 glass-panel p-4 flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block mb-1">
                EXPLAINABILITY FACTOR
              </span>
              <h4 className="text-sm font-bold text-slate-100">{factor}</h4>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-industrial-800/80 pt-3">
              <span className="text-xs text-slate-400">Risk Contribution:</span>
              <span className={`text-xs px-2 py-0.5 rounded border font-mono ${getImpactBadge(rating)}`}>
                {rating} IMPACT
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Risk Points Contribution Waterfall */}
      <div className="rounded-xl border border-industrial-800 glass-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">Risk Fusion Points Decomposition</h3>
          </div>
          <span className="text-xs font-mono text-cyan-400 font-bold">
            Total Fused Risk: {riskResult?.risk.toFixed(1) || '—'}%
          </span>
        </div>

        <div className="space-y-3">
          {Object.entries(contributions).map(([name, points]) => (
            <div key={name}>
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-300">{name}</span>
                <span className="text-cyan-400 font-bold">+{points.toFixed(1)} pts</span>
              </div>
              <div className="w-full bg-industrial-900 rounded-full h-2 overflow-hidden border border-industrial-800">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (points / 60) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Probability Breakdown & Feature Importance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProbabilityBreakdown
          probabilities={latestTelemetry?.class_probabilities || {
            'NORMAL': 0.85,
            'PARTIAL BLOCKAGE': 0.10,
            'DEVELOPING BLOCKAGE': 0.04,
            'CRITICAL / BLOCKED': 0.01,
          }}
        />
        <FeatureImportanceChart importances={featureImportances} />
      </div>

      {/* Evaluation Heatmap & Confusion Matrix */}
      {evalMetrics && evalMetrics.rf_metrics && (
        <EvaluationHeatmap
          metrics={evalMetrics.rf_metrics}
          anomalyMetrics={evalMetrics.if_metrics}
        />
      )}
    </div>
  );
};
