import React, { useState } from 'react';
import { Play, Pause, RotateCcw, FastForward, Sliders, Layers, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';
import { SimulationConfig, TelemetryData } from '../../lib/types';
import { FaultInjectionPanel } from './FaultInjectionPanel';
import { ManualWhatIf } from './ManualWhatIf';

interface SimulationStudioProps {
  simulationRunning: boolean;
  onSimulationToggle: (running: boolean) => void;
  latestTelemetry?: TelemetryData | null;
}

export const SimulationStudio: React.FC<SimulationStudioProps> = ({
  simulationRunning,
  onSimulationToggle,
}) => {
  const [subTab, setSubTab] = useState<'scenarios' | 'what-if'>('scenarios');
  const [config, setConfig] = useState<SimulationConfig>({
    mode: 'progressive',
    material: 'generic',
    enable_motor_current: false,
    ramp_seconds: 90,
    noise_level: 0.35,
    tick_delay: 0.25,
    manual_severity: 0.1,
    fault_vibration: null,
    fault_level: null,
    fault_load: null,
    fault_motor_current: null,
  });

  const handleConfigUpdate = async (newConfig: Partial<SimulationConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    try {
      await api.configureSimulation(updated);
    } catch (e) {
      console.error('Failed to configure simulation:', e);
    }
  };

  const handleStart = async () => {
    try {
      await api.startSimulation();
      onSimulationToggle(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStop = async () => {
    try {
      await api.stopSimulation();
      onSimulationToggle(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReset = async () => {
    try {
      await api.resetSimulation();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStep = async () => {
    try {
      await api.stepSimulation();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Header & Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            Simulation & Demonstration Studio
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full-featured offline demonstration environment with realistic physics synthesis & fault injection.
          </p>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex bg-industrial-900 p-1 rounded-xl border border-industrial-800 text-xs">
          <button
            onClick={() => setSubTab('scenarios')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
              subTab === 'scenarios' ? 'bg-cyan-500 text-industrial-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Live Scenarios
          </button>
          <button
            onClick={() => setSubTab('what-if')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
              subTab === 'what-if' ? 'bg-cyan-500 text-industrial-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Manual What-If
          </button>
        </div>
      </div>

      {subTab === 'scenarios' ? (
        <div className="space-y-6">
          {/* Main Control Strip */}
          <div className="rounded-xl border border-industrial-800 glass-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Playback controls */}
              <div className="flex items-center gap-2">
                {simulationRunning ? (
                  <button
                    onClick={handleStop}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-industrial-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all"
                  >
                    <Pause className="w-4 h-4 fill-current" />
                    Pause Stream
                  </button>
                ) : (
                  <button
                    onClick={handleStart}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-industrial-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Start Stream
                  </button>
                )}

                <button
                  onClick={handleStep}
                  disabled={simulationRunning}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-industrial-850 hover:bg-industrial-800 text-slate-300 border border-industrial-700 font-medium text-xs disabled:opacity-40 transition-all"
                >
                  <FastForward className="w-4 h-4" />
                  Step Once
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-industrial-850 hover:bg-industrial-800 text-slate-300 border border-industrial-700 font-medium text-xs transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">STATUS:</span>
                <span className={`px-2 py-0.5 rounded font-bold ${
                  simulationRunning ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-industrial-800 text-slate-400'
                }`}>
                  {simulationRunning ? '● GENERATING LIVE TICKS' : '❚❚ PAUSED'}
                </span>
              </div>
            </div>

            {/* Scenario Configuration Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-5 border-t border-industrial-800">
              {/* Simulation Mode */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 font-mono">
                  Scenario Flow Mode
                </label>
                <select
                  value={config.mode}
                  onChange={(e) => handleConfigUpdate({ mode: e.target.value as any })}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="progressive">Progressive Ramp (Gradual Jam)</option>
                  <option value="sudden">Sudden Blockage (Instant Accumulation)</option>
                  <option value="random">Random Walk (Dynamic Fluctuation)</option>
                  <option value="normal">Steady Normal Flow (Continuous Operation)</option>
                  <option value="custom">Custom Severity Slider</option>
                </select>
              </div>

              {/* Material Type */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 font-mono">
                  Bulk Material Type
                </label>
                <select
                  value={config.material}
                  onChange={(e) => handleConfigUpdate({ material: e.target.value as any })}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="generic">Generic Bulk Material</option>
                  <option value="iron_ore">Iron Ore (Heavy, High Friction)</option>
                  <option value="coal">Coal (Dampened Vibration)</option>
                  <option value="pellets">Iron Pellets (High Velocity)</option>
                  <option value="limestone">Limestone (High Abrasiveness)</option>
                </select>
              </div>

              {/* Ramp Duration */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-300 font-semibold">Ramp Duration</span>
                  <span className="text-cyan-400 font-bold">{config.ramp_seconds}s</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="180"
                  step="10"
                  value={config.ramp_seconds}
                  onChange={(e) => handleConfigUpdate({ ramp_seconds: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer mt-1"
                />
              </div>

              {/* Streaming Speed / Delay */}
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-slate-300 font-semibold">Tick Rate</span>
                  <span className="text-cyan-400 font-bold">{(1 / config.tick_delay).toFixed(1)} Hz</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={config.tick_delay}
                  onChange={(e) => handleConfigUpdate({ tick_delay: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer mt-1"
                />
              </div>
            </div>

            {/* Custom Severity slider if custom mode */}
            {config.mode === 'custom' && (
              <div className="mt-4 p-3 bg-industrial-900/60 rounded-lg border border-industrial-800">
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-cyan-300 font-semibold">Direct Severity Control</span>
                  <span className="text-cyan-400 font-bold">{((config.manual_severity || 0) * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.01"
                  value={config.manual_severity || 0}
                  onChange={(e) => handleConfigUpdate({ manual_severity: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Fault Injection Panel */}
          <FaultInjectionPanel
            faults={{
              vibration: config.fault_vibration,
              level: config.fault_level,
              load: config.fault_load,
              motor_current: config.fault_motor_current,
            }}
            onFaultChange={(sensor, fault) => {
              handleConfigUpdate({
                [`fault_${sensor}`]: fault,
              } as any);
            }}
          />
        </div>
      ) : (
        <ManualWhatIf />
      )}
    </div>
  );
};
