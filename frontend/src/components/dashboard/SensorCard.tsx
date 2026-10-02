import React from 'react';
import { HealthState } from '../../lib/types';
import { getHealthColor } from '../../lib/utils';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

interface SensorCardProps {
  title: string;
  hardwareChip: string;
  value: number | string;
  unit: string;
  secondaryLabel?: string;
  secondaryValue?: string | number;
  health: HealthState;
  trend?: 'rising' | 'falling' | 'stable';
  icon: LucideIcon;
  accentColor?: 'cyan' | 'amber' | 'emerald' | 'blue' | 'purple';
}

export const SensorCard: React.FC<SensorCardProps> = ({
  title,
  hardwareChip,
  value,
  unit,
  secondaryLabel,
  secondaryValue,
  health,
  trend = 'stable',
  icon: Icon,
  accentColor = 'cyan',
}) => {
  const healthStyle = getHealthColor(health);

  const getAccentBorder = (col: string) => {
    switch (col) {
      case 'amber':
        return 'group-hover:border-amber-500/50';
      case 'emerald':
        return 'group-hover:border-emerald-500/50';
      case 'blue':
        return 'group-hover:border-blue-500/50';
      case 'purple':
        return 'group-hover:border-purple-500/50';
      default:
        return 'group-hover:border-cyan-500/50';
    }
  };

  const getIconColor = (col: string) => {
    switch (col) {
      case 'amber':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'emerald':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'blue':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'purple':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      default:
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    }
  };

  return (
    <div className={`rounded-xl border border-industrial-800 glass-panel p-4 flex flex-col justify-between transition-all duration-200 group ${getAccentBorder(accentColor)}`}>
      {/* Top row: Icon, title, health badge */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg border ${getIconColor(accentColor)}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
              {title}
            </h4>
            <span className="text-[10px] font-mono text-slate-500">
              {hardwareChip}
            </span>
          </div>
        </div>

        {/* Health status badge */}
        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${healthStyle.bg} ${healthStyle.text} ${healthStyle.border}`}>
          {healthStyle.label}
        </span>
      </div>

      {/* Center value readout */}
      <div className="my-3 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
            {typeof value === 'number' ? (unit === 'kg' ? value.toFixed(3) : value.toFixed(2)) : value}
          </span>
          <span className="text-xs font-mono font-semibold text-slate-400">
            {unit}
          </span>
        </div>

        {/* Trend badge */}
        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
          {trend === 'rising' && <TrendingUp className="w-3.5 h-3.5 text-rose-400" />}
          {trend === 'falling' && <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />}
          {trend === 'stable' && <Minus className="w-3.5 h-3.5 text-slate-500" />}
          <span className="capitalize">{trend}</span>
        </div>
      </div>

      {/* Bottom secondary metric */}
      {secondaryLabel && (
        <div className="pt-2.5 border-t border-industrial-800/80 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-400">{secondaryLabel}</span>
          <span className="font-mono font-bold text-slate-200">{secondaryValue}</span>
        </div>
      )}
    </div>
  );
};
