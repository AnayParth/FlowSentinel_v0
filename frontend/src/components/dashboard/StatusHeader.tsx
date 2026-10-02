import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { RiskResult, SystemStatus } from '../../lib/types';
import { getStatusColor } from '../../lib/utils';

interface StatusHeaderProps {
  riskResult: RiskResult;
  predictedState: string;
}

export const StatusHeader: React.FC<StatusHeaderProps> = ({ riskResult, predictedState }) => {
  const status = riskResult.status;
  const colors = getStatusColor(status);

  const getStatusIcon = (st: SystemStatus) => {
    switch (st) {
      case 'NORMAL':
        return <CheckCircle2 className="w-8 h-8 text-emerald-400" />;
      case 'EARLY ANOMALY':
        return <AlertTriangle className="w-8 h-8 text-amber-400 animate-pulse" />;
      case 'DEVELOPING BLOCKAGE':
        return <AlertTriangle className="w-8 h-8 text-orange-400 animate-bounce" />;
      case 'CRITICAL':
      default:
        return <AlertOctagon className="w-8 h-8 text-rose-400 animate-pulse" />;
    }
  };

  return (
    <div className={`rounded-xl border p-5 glass-panel ${colors.border} ${colors.bg} relative overflow-hidden transition-all duration-300`}>
      {/* Background radial glow */}
      <div className={`absolute -right-16 -top-16 w-48 h-48 rounded-full blur-3xl opacity-20 ${
        status === 'NORMAL' ? 'bg-emerald-500' :
        status === 'EARLY ANOMALY' ? 'bg-amber-500' :
        status === 'DEVELOPING BLOCKAGE' ? 'bg-orange-500' : 'bg-rose-500'
      }`} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        {/* Status indicator */}
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-industrial-900/80 border border-industrial-800 shadow-inner">
            {getStatusIcon(status)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors.dot}`} />
              <p className="text-xs font-mono uppercase tracking-wider text-slate-400">System Status</p>
            </div>
            <h2 className={`text-2xl font-black tracking-tight ${colors.text}`}>{status}</h2>
          </div>
        </div>

        {/* Blockage Risk */}
        <div className="border-t md:border-t-0 md:border-l border-industrial-800/80 pt-4 md:pt-0 md:pl-6">
          <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Blockage Risk</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-3xl font-black font-mono ${colors.text}`}>
              {riskResult.risk.toFixed(1)}%
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${colors.badge}`}>
              {riskResult.risk_level}
            </span>
          </div>
        </div>

        {/* Model Prediction */}
        <div className="border-t md:border-t-0 md:border-l border-industrial-800/80 pt-4 md:pt-0 md:pl-6">
          <p className="text-xs font-mono uppercase tracking-wider text-slate-400">RF Classification</p>
          <div className="mt-1">
            <span className="text-lg font-bold text-slate-100 block">
              {predictedState}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Class Score: {(riskResult.class_contrib * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* System Confidence */}
        <div className="border-t md:border-t-0 md:border-l border-industrial-800/80 pt-4 md:pt-0 md:pl-6">
          <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Health Confidence</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-3xl font-black font-mono ${
              riskResult.confidence > 80 ? 'text-emerald-400' :
              riskResult.confidence > 50 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {riskResult.confidence.toFixed(0)}%
            </span>
            <span className="text-xs text-slate-400">
              {riskResult.confidence >= 90 ? 'Full Sensor Trust' : 'Degraded Trust'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
