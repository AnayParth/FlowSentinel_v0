import React from 'react';
import { Sliders, Cpu, ArrowRightLeft, Radio, AlertCircle } from 'lucide-react';
import { OperatingMode } from '../../lib/types';

interface ModeBannerProps {
  mode: OperatingMode;
  hardwareConnected: boolean;
  hardwarePort?: string | null;
  onSwitchMode: (mode: OperatingMode) => void;
  simulationRunning?: boolean;
}

export const ModeBanner: React.FC<ModeBannerProps> = ({
  mode,
  hardwareConnected,
  hardwarePort,
  onSwitchMode,
  simulationRunning = true,
}) => {
  const isSim = mode === 'simulation' || mode === 'manual';

  return (
    <div className={`border-b transition-colors ${
      isSim 
        ? 'bg-gradient-to-r from-cyan-950/40 via-industrial-900 to-industrial-950 border-cyan-500/20' 
        : 'bg-gradient-to-r from-emerald-950/40 via-industrial-900 to-industrial-950 border-emerald-500/20'
    }`}>
      <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Mode Pill & Description */}
          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono font-bold uppercase tracking-wider text-[11px] ${
              isSim
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
            }`}>
              {isSim ? (
                <>
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  SIMULATION MODE
                </>
              ) : (
                <>
                  <Radio className={`w-3.5 h-3.5 text-emerald-400 ${hardwareConnected ? 'animate-pulse' : ''}`} />
                  LIVE ESP32 MODE
                </>
              )}
            </span>

            <span className="text-slate-400 hidden sm:inline">
              {isSim ? (
                <>
                  Operating on synthetic time-series and what-if scenarios (
                  <span className={simulationRunning ? 'text-emerald-400' : 'text-amber-400'}>
                    {simulationRunning ? 'Streaming 4 Hz' : 'Paused'}
                  </span>
                  ). Physical hardware offline.
                </>
              ) : (
                <>
                  Authoritative stream from physical ESP32 sensors (
                  <span className={hardwareConnected ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-medium'}>
                    {hardwareConnected
                      ? `Active on ${hardwarePort || 'Serial Port'}`
                      : `Waiting for data on ${hardwarePort || 'COM Port'} / Offline`}
                  </span>
                  ). Retaining Live Mode.
                </>
              )}
            </span>
          </div>


          {/* Action Switch Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSwitchMode(isSim ? 'hardware' : 'simulation')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium text-xs transition-all border ${
                isSim
                  ? 'bg-industrial-800 hover:bg-industrial-700 text-slate-200 border-industrial-700 hover:border-cyan-500/50'
                  : 'bg-industrial-800 hover:bg-industrial-700 text-slate-200 border-industrial-700 hover:border-emerald-500/50'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span>Switch to {isSim ? 'Live ESP32 Hardware' : 'Simulation Suite'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
