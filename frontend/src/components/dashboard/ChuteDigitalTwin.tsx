import React from 'react';
import { Layers, ArrowDown, Activity, Scale, Radio } from 'lucide-react';
import { RawSensors, RiskResult } from '../../lib/types';
import { getStatusColor } from '../../lib/utils';

interface ChuteDigitalTwinProps {
  sensors: RawSensors;
  riskResult: RiskResult;
  material?: string;
}

export const ChuteDigitalTwin: React.FC<ChuteDigitalTwinProps> = ({
  sensors,
  riskResult,
  material = 'generic',
}) => {
  const level = Math.max(0, Math.min(100, sensors.material_level));
  const risk = riskResult.risk;
  const status = riskResult.status;
  const colors = getStatusColor(status);

  // Material color styles
  const getMaterialColor = (mat: string) => {
    switch (mat) {
      case 'iron_ore':
        return {
          fill: 'from-amber-900 via-orange-950 to-amber-900',
          border: '#78350f',
          particle: 'bg-amber-600',
          label: 'Iron Ore (Dense / High Vib)',
        };
      case 'coal':
        return {
          fill: 'from-slate-900 via-zinc-900 to-slate-950',
          border: '#334155',
          particle: 'bg-zinc-600',
          label: 'Coal (Light / Dampened Vib)',
        };
      case 'pellets':
        return {
          fill: 'from-orange-900 via-amber-950 to-stone-900',
          border: '#9a3412',
          particle: 'bg-orange-600',
          label: 'Iron Pellets (Spherical Flow)',
        };
      case 'limestone':
        return {
          fill: 'from-stone-700 via-stone-800 to-stone-900',
          border: '#57534e',
          particle: 'bg-stone-400',
          label: 'Limestone (Abrasive)',
        };
      default:
        return {
          fill: 'from-amber-800 via-yellow-950 to-amber-900',
          border: '#92400e',
          particle: 'bg-amber-500',
          label: 'Generic Bulk Material',
        };
    }
  };

  const matConfig = getMaterialColor(material);
  const isBlocked = level > 75 || risk > 75;
  const isRestricted = (level > 40 || risk > 45) && !isBlocked;

  return (
    <div className="rounded-xl border border-industrial-800 glass-panel p-5 relative overflow-hidden flex flex-col justify-between">
      {/* Title Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-200">Chute Digital Twin (3D Physics Model)</h3>
        </div>
        <span className="text-[10px] text-slate-400 font-mono bg-industrial-900 px-2 py-0.5 rounded border border-industrial-800">
          {matConfig.label}
        </span>
      </div>

      {/* Main Chute Isometric / Cross-Section Diagram */}
      <div className="relative w-full h-72 flex items-center justify-center py-2">
        {/* Background Grid & Depth lines */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />

        {/* Chute Container */}
        <div className="relative w-48 h-64 flex flex-col items-center">
          {/* Top Hopper Inlet */}
          <div className="w-44 h-8 bg-industrial-850 border-2 border-industrial-700 rounded-t-lg relative flex items-center justify-center shadow-lg z-20">
            <span className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider">
              FEED HOPPER INLET
            </span>
            {/* Ultrasonic Sensor Target Marker */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center z-30">
              <div className="px-1.5 py-0.5 rounded bg-cyan-500 text-industrial-950 text-[9px] font-mono font-bold flex items-center gap-1 shadow-md shadow-cyan-500/30">
                <Radio className="w-2.5 h-2.5" />
                HC-SR04 ({sensors.distance_cm.toFixed(1)} cm)
              </div>
              <div className="w-0.5 h-3 bg-cyan-400 animate-pulse" />
            </div>
          </div>

          {/* Converging Chute Body */}
          <div className="w-36 h-44 bg-industrial-900/90 border-x-2 border-industrial-700 relative overflow-hidden flex items-end justify-center shadow-inner">
            {/* Ultrasonic Pulse Waves */}
            <div className="absolute top-0 left-0 right-0 h-16 pointer-events-none opacity-20 flex flex-col items-center justify-start gap-1 pt-1">
              <div className="w-20 h-0.5 bg-cyan-400 rounded-full animate-ping" />
              <div className="w-28 h-0.5 bg-cyan-400 rounded-full animate-pulse" />
            </div>

            {/* Dynamic Accumulation Material Fill */}
            <div
              className={`w-full bg-gradient-to-t ${matConfig.fill} border-t-2 border-amber-500/60 relative transition-all duration-700 ease-out flex flex-col items-center justify-start`}
              style={{ height: `${level}%` }}
            >
              {/* Fill percentage label on surface */}
              <div className="px-2 py-0.5 bg-industrial-950/80 rounded border border-white/20 text-[10px] font-mono font-bold text-white shadow-md mt-1 backdrop-blur-sm">
                {level.toFixed(0)}% FILL
              </div>
              {/* Internal material texture lines */}
              <div className="w-full h-full opacity-20 bg-grid-pattern" />
            </div>

            {/* MPU6050 Vibration Sensor Tag (Side Wall) */}
            <div className="absolute top-1/2 -left-1 -translate-y-1/2 -translate-x-full pr-2 flex items-center z-30">
              <div className="px-1.5 py-0.5 rounded bg-industrial-850 border border-cyan-500/40 text-[9px] font-mono text-cyan-300 flex items-center gap-1 shadow">
                <Activity className="w-2.5 h-2.5 text-cyan-400" />
                MPU ({sensors.vibration_g.toFixed(2)} g)
              </div>
              <div className="w-3 h-0.5 bg-cyan-500/60" />
            </div>

            {/* HX711 Load Cell Sensor Tag (Base Wall) */}
            <div className="absolute bottom-4 -right-1 translate-x-full pl-2 flex items-center z-30">
              <div className="w-3 h-0.5 bg-amber-500/60" />
              <div className="px-1.5 py-0.5 rounded bg-industrial-850 border border-amber-500/40 text-[9px] font-mono text-amber-300 flex items-center gap-1 shadow">
                <Scale className="w-2.5 h-2.5 text-amber-400" />
                HX711 ({sensors.load_kg.toFixed(1)} kg)
              </div>
            </div>
          </div>

          {/* Bottom Discharge Outlet */}
          <div className={`w-28 h-8 border-2 border-industrial-700 rounded-b-lg relative flex items-center justify-center shadow-lg transition-colors ${
            isBlocked ? 'bg-rose-950/80 border-rose-600' :
            isRestricted ? 'bg-amber-950/80 border-amber-600' : 'bg-industrial-850'
          }`}>
            <span className={`text-[10px] font-mono font-bold tracking-tight ${
              isBlocked ? 'text-rose-400' : isRestricted ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {isBlocked ? 'OUTLET BLOCKED' : isRestricted ? 'RESTRICTED' : 'DISCHARGE NORMAL'}
            </span>
          </div>

          {/* Discharging Material Flow Indicator */}
          {!isBlocked && (
            <div className="flex gap-1.5 mt-1 items-center animate-bounce">
              <div className={`w-1.5 h-3 rounded-full ${matConfig.particle} opacity-80`} />
              <div className={`w-1.5 h-4 rounded-full ${matConfig.particle}`} />
              <div className={`w-1.5 h-3 rounded-full ${matConfig.particle} opacity-80`} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-industrial-800/80 pt-3">
        <div className="bg-industrial-900/60 p-2 rounded border border-industrial-800">
          <span className="text-[10px] text-slate-400 font-mono block">MATERIAL HEIGHT</span>
          <span className="font-bold text-slate-200 font-mono">{level.toFixed(1)}%</span>
        </div>
        <div className="bg-industrial-900/60 p-2 rounded border border-industrial-800">
          <span className="text-[10px] text-slate-400 font-mono block">IMPACT LOAD</span>
          <span className="font-bold text-slate-200 font-mono">{sensors.load_kg.toFixed(1)} kg</span>
        </div>
        <div className="bg-industrial-900/60 p-2 rounded border border-industrial-800">
          <span className="text-[10px] text-slate-400 font-mono block">FLOW VELOCITY</span>
          <span className={`font-bold font-mono ${isBlocked ? 'text-rose-400' : isRestricted ? 'text-amber-400' : 'text-emerald-400'}`}>
            {isBlocked ? '0 m/s' : isRestricted ? '1.2 m/s' : '3.8 m/s'}
          </span>
        </div>
      </div>
    </div>
  );
};
