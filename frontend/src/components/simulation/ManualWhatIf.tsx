import React, { useState } from 'react';
import { Sliders, Sparkles, Play, RotateCcw } from 'lucide-react';
import { api } from '../../lib/api';
import { TelemetryData } from '../../lib/types';
import { StatusHeader } from '../dashboard/StatusHeader';
import { RiskGauge } from '../dashboard/RiskGauge';
import { ChuteDigitalTwin } from '../dashboard/ChuteDigitalTwin';

interface ManualWhatIfProps {
  onEvaluationComplete?: (data: TelemetryData) => void;
}

const PRESETS = {
  NORMAL: { vibration_g: 1.0, material_level: 12.0, load_kg: 25.0, motor_current_a: 8.0, sensor_noise: 0.2 },
  PARTIAL: { vibration_g: 1.6, material_level: 35.0, load_kg: 65.0, motor_current_a: 9.5, sensor_noise: 0.3 },
  DEVELOPING: { vibration_g: 2.6, material_level: 62.0, load_kg: 115.0, motor_current_a: 11.2, sensor_noise: 0.4 },
  CRITICAL: { vibration_g: 3.8, material_level: 92.0, load_kg: 175.0, motor_current_a: 13.0, sensor_noise: 0.45 },
};

export const ManualWhatIf: React.FC<ManualWhatIfProps> = ({ onEvaluationComplete }) => {
  const [params, setParams] = useState({
    vibration_g: 1.0,
    material_level: 12.0,
    load_kg: 25.0,
    motor_current_a: 8.0,
    sensor_noise: 0.2,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TelemetryData | null>(null);

  const handlePreset = async (presetName: keyof typeof PRESETS) => {
    const preset = PRESETS[presetName];
    setParams(preset);
    await evaluateParams(preset);
  };

  const evaluateParams = async (overrideParams?: typeof params) => {
    setLoading(true);
    try {
      const data = await api.manualPredict(overrideParams || params);
      setResult(data);
      onEvaluationComplete?.(data);
    } catch (e) {
      console.error('Manual prediction error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Preset Buttons */}
      <div className="rounded-xl border border-industrial-800 glass-panel p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">Instant Operating Scenario Presets</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">1-Click What-If Testing</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => handlePreset('NORMAL')}
            className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-semibold text-xs transition-all text-left flex flex-col justify-between"
          >
            <span className="font-bold text-sm">🟢 Normal Flow</span>
            <span className="text-[10px] text-emerald-400/80 font-mono mt-1">12% fill · 1.0 g · 25 kg</span>
          </button>

          <button
            onClick={() => handlePreset('PARTIAL')}
            className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs transition-all text-left flex flex-col justify-between"
          >
            <span className="font-bold text-sm">🟡 Partial Blockage</span>
            <span className="text-[10px] text-amber-400/80 font-mono mt-1">35% fill · 1.6 g · 65 kg</span>
          </button>

          <button
            onClick={() => handlePreset('DEVELOPING')}
            className="p-3 rounded-lg border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 font-semibold text-xs transition-all text-left flex flex-col justify-between"
          >
            <span className="font-bold text-sm">🟠 Developing Jam</span>
            <span className="text-[10px] text-orange-400/80 font-mono mt-1">62% fill · 2.6 g · 115 kg</span>
          </button>

          <button
            onClick={() => handlePreset('CRITICAL')}
            className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs transition-all text-left flex flex-col justify-between"
          >
            <span className="font-bold text-sm">🔴 Critical Blockage</span>
            <span className="text-[10px] text-rose-400/80 font-mono mt-1">92% fill · 3.8 g · 175 kg</span>
          </button>
        </div>
      </div>

      {/* Manual Sliders */}
      <div className="rounded-xl border border-industrial-800 glass-panel p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">Interactive Sensor Value Sliders</h3>
          </div>
          <button
            onClick={() => evaluateParams()}
            disabled={loading}
            className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-industrial-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {loading ? 'Evaluating...' : 'Run ML Inference'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Level Slider */}
          <div className="bg-industrial-900/60 p-3.5 rounded-lg border border-industrial-800">
            <div className="flex justify-between text-xs mb-1.5 font-mono">
              <span className="text-slate-300 font-semibold">Material Fill Level</span>
              <span className="text-cyan-400 font-bold">{params.material_level}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={params.material_level}
              onChange={(e) => setParams({ ...params, material_level: Number(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">HC-SR04 Ultrasonic (Derived)</span>
          </div>

          {/* Load Slider */}
          <div className="bg-industrial-900/60 p-3.5 rounded-lg border border-industrial-800">
            <div className="flex justify-between text-xs mb-1.5 font-mono">
              <span className="text-slate-300 font-semibold">Material Load</span>
              <span className="text-amber-400 font-bold">{params.load_kg} kg</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              step="1"
              value={params.load_kg}
              onChange={(e) => setParams({ ...params, load_kg: Number(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">HX711 Calibrated Weight</span>
          </div>

          {/* Vibration Slider */}
          <div className="bg-industrial-900/60 p-3.5 rounded-lg border border-industrial-800">
            <div className="flex justify-between text-xs mb-1.5 font-mono">
              <span className="text-slate-300 font-semibold">Vibration Magnitude</span>
              <span className="text-emerald-400 font-bold">{params.vibration_g.toFixed(2)} g</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="5.0"
              step="0.05"
              value={params.vibration_g}
              onChange={(e) => setParams({ ...params, vibration_g: Number(e.target.value) })}
              className="w-full accent-emerald-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">MPU6050 Acceleration</span>
          </div>

          {/* Motor Current Slider */}
          <div className="bg-industrial-900/60 p-3.5 rounded-lg border border-industrial-800">
            <div className="flex justify-between text-xs mb-1.5 font-mono">
              <span className="text-slate-300 font-semibold">Motor Current</span>
              <span className="text-purple-400 font-bold">{params.motor_current_a} A</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="0.2"
              value={params.motor_current_a}
              onChange={(e) => setParams({ ...params, motor_current_a: Number(e.target.value) })}
              className="w-full accent-purple-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">Drive Motor Current Draw</span>
          </div>

          {/* Sensor Noise Slider */}
          <div className="bg-industrial-900/60 p-3.5 rounded-lg border border-industrial-800 sm:col-span-2">
            <div className="flex justify-between text-xs mb-1.5 font-mono">
              <span className="text-slate-300 font-semibold">Simulated Sensor Noise Level</span>
              <span className="text-slate-200 font-bold">{params.sensor_noise}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={params.sensor_noise}
              onChange={(e) => setParams({ ...params, sensor_noise: Number(e.target.value) })}
              className="w-full accent-slate-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-500 font-mono mt-1 block">Gaussian noise variance in signal sampling</span>
          </div>
        </div>
      </div>

      {/* Prediction Output if evaluated */}
      {result && (
        <div className="space-y-6">
          <StatusHeader riskResult={result.risk_result} predictedState={result.predicted_state} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RiskGauge riskResult={result.risk_result} />
            <ChuteDigitalTwin sensors={result.raw_sensors} riskResult={result.risk_result} />
          </div>
        </div>
      )}
    </div>
  );
};
