import React from 'react';
import { Layers, Radio, Scale, Activity, Zap, ArrowRight, ShieldCheck } from 'lucide-react';
import { SensorHealth, RiskResult, HealthState } from '../../lib/types';
import { getHealthColor } from '../../lib/utils';

interface FusionNetworkGraphProps {
  sensorHealth: SensorHealth;
  riskResult: RiskResult;
}

export const FusionNetworkGraph: React.FC<FusionNetworkGraphProps> = ({
  sensorHealth,
  riskResult,
}) => {
  const sw = (riskResult as any)?.sensor_weights || {
    level: 0.333,
    vibration: 0.333,
    load: 0.333,
    motor_current: 0.0,
  };

  const nodes = [
    {
      id: 'ultrasonic',
      name: 'HC-SR04 Ultrasonic',
      type: 'Surface Distance -> Level %',
      icon: Radio,
      health: sensorHealth.level,
      weight: `${Math.round(sw.level * 100)}%`,
      color: 'cyan',
    },
    {
      id: 'loadcell',
      name: 'HX711 Load Cell',
      type: 'Impact Bed Weight (kg)',
      icon: Scale,
      health: sensorHealth.load,
      weight: `${Math.round(sw.load * 100)}%`,
      color: 'amber',
    },
    {
      id: 'imu',
      name: 'MPU6050 Vibration',
      type: 'Tri-Axial Acceleration (g)',
      icon: Activity,
      health: sensorHealth.vibration,
      weight: `${Math.round(sw.vibration * 100)}%`,
      color: 'emerald',
    },
    {
      id: 'motor',
      name: 'Drive Motor Inverter',
      type: 'Current Draw (A)',
      icon: Zap,
      health: (sensorHealth.motor_current && sensorHealth.motor_current !== 'NOT_CONNECTED' ? sensorHealth.motor_current : 'NOT_CONNECTED') as HealthState,
      weight: '0% (EXCLUDED)',
      color: 'purple',
    },
  ];

  return (
    <div className="rounded-xl border border-industrial-800 glass-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-200">Multi-Sensor Fusion Network Topology</h3>
        </div>
        <span className="text-[10px] text-slate-400 font-mono bg-industrial-900 px-2 py-0.5 rounded border border-industrial-800">
          Dynamic Reliability Weighting
        </span>
      </div>

      {/* Network Node Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center my-4">
        {/* Sensor Nodes Column (Left) */}
        <div className="lg:col-span-5 space-y-3">
          {nodes.map((node) => {
            const Icon = node.icon;
            const healthStyle = getHealthColor(node.health);
            return (
              <div
                key={node.id}
                className="p-3 bg-industrial-900/80 rounded-xl border border-industrial-800 flex items-center justify-between shadow-sm hover:border-industrial-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-industrial-800 text-cyan-400 border border-industrial-700">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">{node.name}</h5>
                    <p className="text-[10px] text-slate-400 font-mono">{node.type}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${healthStyle.bg} ${healthStyle.text} ${healthStyle.border}`}>
                    {healthStyle.label}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">Weight: {node.weight}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fusion Direction Arrows (Center) */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center text-slate-500 py-2">
          <div className="hidden lg:flex flex-col items-center gap-2">
            <div className="w-12 h-0.5 bg-gradient-to-r from-industrial-700 to-cyan-500/50" />
            <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold">FUSE</span>
            <div className="w-12 h-0.5 bg-gradient-to-r from-industrial-700 to-cyan-500/50" />
          </div>
          <ArrowRight className="w-6 h-6 text-cyan-400 animate-pulse lg:hidden" />
        </div>

        {/* Risk Fusion Hub Engine Node (Right) */}
        <div className="lg:col-span-5 p-5 rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-industrial-900 to-industrial-950 flex flex-col justify-between shadow-lg shadow-cyan-500/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <h4 className="text-sm font-black text-white font-mono">FUSION ENGINE</h4>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
              ACTIVE
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Combines Random Forest classification probabilities, Isolation Forest anomaly scoring, and physical accumulation trends. Degraded sensors are automatically down-weighted.
          </p>

          <div className="border-t border-industrial-800 pt-3 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Fused Output Risk:</span>
            <span className="text-xl font-bold text-cyan-400">{riskResult.risk.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
