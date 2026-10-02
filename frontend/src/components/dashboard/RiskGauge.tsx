import React from 'react';
import { RiskResult } from '../../lib/types';
import { getStatusColor } from '../../lib/utils';
import { Clock, ShieldAlert } from 'lucide-react';

interface RiskGaugeProps {
  riskResult: RiskResult;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ riskResult }) => {
  const risk = Math.max(0, Math.min(100, riskResult.risk));
  const colors = getStatusColor(riskResult.status);

  // SVG dimensions & calculations for 180° semi-circular gauge
  const radius = 85;
  const strokeWidth = 14;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (risk / 100) * circumference;

  return (
    <div className="rounded-xl border border-industrial-800 glass-panel p-5 flex flex-col items-center justify-between relative overflow-hidden">
      <div className="w-full flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-200">Blockage Risk Meter</h3>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${colors.badge}`}>
          {riskResult.risk_level}
        </span>
      </div>

      {/* SVG Semi-Circle Gauge */}
      <div className="relative w-56 h-32 flex items-center justify-center my-2">
        <svg className="w-56 h-32 overflow-visible" viewBox="0 0 200 110">
          {/* Defs for gradients */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <path
            d="M 15 100 A 85 85 0 0 1 185 100"
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Value Arc */}
          <path
            d="M 15 100 A 85 85 0 0 1 185 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />

          {/* Needle / Value Indicator */}
          {(() => {
            const angle = Math.PI - (risk / 100) * Math.PI;
            const needleX = 100 + 72 * Math.cos(angle);
            const needleY = 100 - 72 * Math.sin(angle);
            return (
              <circle
                cx={needleX}
                cy={needleY}
                r="6"
                fill="#ffffff"
                stroke={risk > 75 ? '#f43f5e' : risk > 50 ? '#f97316' : risk > 25 ? '#f59e0b' : '#10b981'}
                strokeWidth="3"
                className="transition-all duration-500 ease-out"
              />
            );
          })()}
        </svg>

        {/* Center Readout */}
        <div className="absolute bottom-0 text-center flex flex-col items-center">
          <span className={`text-4xl font-black font-mono tracking-tight ${colors.text}`}>
            {risk.toFixed(1)}%
          </span>
          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
            Fused Risk Index
          </span>
        </div>
      </div>

      {/* Threshold Labels */}
      <div className="w-full grid grid-cols-4 text-center text-[10px] text-slate-400 border-t border-industrial-800/80 pt-3 mt-1">
        <div>
          <span className="text-emerald-400 font-bold block">0–25%</span>
          <span>Normal</span>
        </div>
        <div>
          <span className="text-amber-400 font-bold block">25–50%</span>
          <span>Early</span>
        </div>
        <div>
          <span className="text-orange-400 font-bold block">50–75%</span>
          <span>Develop</span>
        </div>
        <div>
          <span className="text-rose-400 font-bold block">75–100%</span>
          <span>Critical</span>
        </div>
      </div>
    </div>
  );
};
