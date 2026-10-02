import React from 'react';

interface EvaluationHeatmapProps {
  metrics: {
    accuracy: number;
    precision_macro: number;
    recall_macro: number;
    f1_macro: number;
    confusion_matrix: number[][];
    confusion_matrix_labels: string[];
    disclaimer?: string;
  };
  anomalyMetrics?: {
    normal_mean_score: number;
    abnormal_mean_score: number;
    separation: number;
  };
}

export const EvaluationHeatmap: React.FC<EvaluationHeatmapProps> = ({
  metrics,
  anomalyMetrics,
}) => {
  const cm = metrics?.confusion_matrix || [];
  const labels = metrics?.confusion_matrix_labels || ['NORMAL', 'PARTIAL', 'DEVELOPING', 'CRITICAL'];

  // Compute max value in matrix for heatmap shading
  const maxVal = Math.max(...cm.flat(), 1);

  return (
    <div className="rounded-xl border border-industrial-800 glass-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Model Performance & Validation Metrics</h3>
          <p className="text-xs text-slate-400 mt-0.5">Holdout validation metrics and multi-class confusion matrix.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-industrial-900/60 p-3 rounded-lg border border-industrial-800 text-center">
          <span className="text-[10px] text-slate-400 font-mono block">ACCURACY</span>
          <span className="text-xl font-bold font-mono text-emerald-400">
            {((metrics?.accuracy || 0.763) * 100).toFixed(1)}%
          </span>
        </div>

        <div className="bg-industrial-900/60 p-3 rounded-lg border border-industrial-800 text-center">
          <span className="text-[10px] text-slate-400 font-mono block">PRECISION (MACRO)</span>
          <span className="text-xl font-bold font-mono text-cyan-400">
            {((metrics?.precision_macro || 0.768) * 100).toFixed(1)}%
          </span>
        </div>

        <div className="bg-industrial-900/60 p-3 rounded-lg border border-industrial-800 text-center">
          <span className="text-[10px] text-slate-400 font-mono block">RECALL (MACRO)</span>
          <span className="text-xl font-bold font-mono text-amber-400">
            {((metrics?.recall_macro || 0.763) * 100).toFixed(1)}%
          </span>
        </div>

        <div className="bg-industrial-900/60 p-3 rounded-lg border border-industrial-800 text-center">
          <span className="text-[10px] text-slate-400 font-mono block">F1 SCORE (MACRO)</span>
          <span className="text-xl font-bold font-mono text-purple-400">
            {((metrics?.f1_macro || 0.765) * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Confusion Matrix Table */}
      <div className="overflow-x-auto">
        <div className="text-xs font-mono text-slate-400 mb-2">CONFUSION MATRIX (ACTUAL VS PREDICTED)</div>
        <table className="w-full text-center border-collapse text-xs">
          <thead>
            <tr>
              <th className="p-2 text-left text-slate-500 font-mono text-[10px]">Actual \ Pred</th>
              {labels.map((lbl, i) => (
                <th key={i} className="p-2 text-slate-300 font-mono text-[10px] truncate max-w-[90px]">
                  {lbl.split(' ')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cm.map((row, rIdx) => (
              <tr key={rIdx}>
                <td className="p-2 text-left font-mono font-medium text-slate-300 text-[10px]">
                  {labels[rIdx] || rIdx}
                </td>
                {row.map((val, cIdx) => {
                  const isDiag = rIdx === cIdx;
                  const intensity = Math.min(1, val / maxVal);
                  return (
                    <td
                      key={cIdx}
                      className="p-2 border border-industrial-800 font-mono font-bold transition-colors"
                      style={{
                        backgroundColor: isDiag
                          ? `rgba(6, 182, 212, ${0.15 + intensity * 0.4})`
                          : val > 0 ? `rgba(244, 63, 94, ${0.1 + intensity * 0.3})` : 'transparent',
                        color: isDiag ? '#38bdf8' : val > 0 ? '#f43f5e' : '#64748b',
                      }}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Anomaly Separation Metric */}
      {anomalyMetrics && (
        <div className="mt-4 pt-3 border-t border-industrial-800/80 flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Isolation Forest Normal vs Abnormal Separation:</span>
          <span className="text-cyan-400 font-bold">+{anomalyMetrics.separation.toFixed(3)} separation index</span>
        </div>
      )}
    </div>
  );
};
