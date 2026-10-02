import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { TelemetryData } from '../../lib/types';
import { Activity, LineChart as ChartIcon, Maximize2 } from 'lucide-react';

interface LiveTelemetryChartsProps {
  history: TelemetryData[];
}

export const LiveTelemetryCharts: React.FC<LiveTelemetryChartsProps> = ({ history }) => {
  const [timeWindow, setTimeWindow] = useState<number>(50); // last N samples
  const [activeTab, setActiveTab] = useState<'all' | 'risk' | 'sensors'>('all');

  const chartData = history.slice(-timeWindow).map((item, idx) => ({
    time: (item.t !== undefined ? item.t.toFixed(1) : idx.toString()),
    risk: item.risk_result?.risk || 0,
    anomaly: (item.anomaly_score * 100) || 0,
    level: item.raw_sensors?.material_level || 0,
    load: item.raw_sensors?.load_kg || 0,
    vibration: item.raw_sensors?.vibration_g || 0,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-industrial-900 border border-industrial-700 p-2.5 rounded-lg shadow-xl text-xs font-mono">
          <p className="text-slate-400 mb-1">Time: {label}s</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 py-0.5">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-bold text-white">
                {entry.value !== undefined ? entry.value.toFixed(1) : '—'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-xl border border-industrial-800 glass-panel p-5">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <ChartIcon className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-200">Real-Time Telemetry & Risk Stream</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* View Filter */}
          <div className="flex bg-industrial-900 p-0.5 rounded-lg border border-industrial-800 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                activeTab === 'all' ? 'bg-industrial-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Multi-View
            </button>
            <button
              onClick={() => setActiveTab('risk')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                activeTab === 'risk' ? 'bg-industrial-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Risk & Anomaly
            </button>
            <button
              onClick={() => setActiveTab('sensors')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                activeTab === 'sensors' ? 'bg-industrial-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sensors
            </button>
          </div>

          {/* Time Range Window */}
          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(Number(e.target.value))}
            className="bg-industrial-900 border border-industrial-800 text-xs text-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-cyan-500"
          >
            <option value={30}>Last 30 Ticks</option>
            <option value={50}>Last 50 Ticks</option>
            <option value={100}>Last 100 Ticks</option>
          </select>
        </div>
      </div>

      {/* Main Charts */}
      {activeTab === 'all' || activeTab === 'risk' ? (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-mono font-semibold">BLOCKAGE RISK & ANOMALY INDEX (%)</span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Critical Level (75%)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Early Warning (50%)</span>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 4" />
                <ReferenceLine y={75} stroke="#f43f5e" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="risk"
                  name="Blockage Risk"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="anomaly"
                  name="Isolation Forest Anomaly"
                  stroke="#a855f7"
                  strokeWidth={1.8}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {activeTab === 'all' || activeTab === 'sensors' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Level Chart */}
          <div className="bg-industrial-900/60 p-3 rounded-lg border border-industrial-800">
            <span className="text-[11px] font-mono text-cyan-400 font-semibold block mb-2">
              MATERIAL LEVEL (0–100%)
            </span>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 9 }} />
                  <YAxis domain={[0, 100]} stroke="#475569" tick={{ fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="level" name="Level %" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Load Chart */}
          <div className="bg-industrial-900/60 p-3 rounded-lg border border-industrial-800">
            <span className="text-[11px] font-mono text-amber-400 font-semibold block mb-2">
              CALIBRATED LOAD (kg)
            </span>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 9 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="load" name="Load (kg)" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Vibration Chart */}
          <div className="bg-industrial-900/60 p-3 rounded-lg border border-industrial-800">
            <span className="text-[11px] font-mono text-emerald-400 font-semibold block mb-2">
              VIBRATION MAGNITUDE (g)
            </span>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 9 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="vibration" name="Vibration (g)" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
