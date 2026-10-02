import React from 'react';
import { AlertTriangle, Wrench } from 'lucide-react';

interface FaultInjectionPanelProps {
  faults: {
    vibration?: 'dropout' | 'stuck' | 'spike' | 'noisy' | null;
    level?: 'dropout' | 'stuck' | 'spike' | 'noisy' | null;
    load?: 'dropout' | 'stuck' | 'spike' | 'noisy' | null;
    motor_current?: 'dropout' | 'stuck' | 'spike' | 'noisy' | null;
  };
  onFaultChange: (sensor: string, fault: string | null) => void;
}

export const FaultInjectionPanel: React.FC<FaultInjectionPanelProps> = ({
  faults,
  onFaultChange,
}) => {
  const faultOptions = [
    { id: null, label: 'None (Healthy)' },
    { id: 'dropout', label: 'Signal Dropout (0 reading)' },
    { id: 'stuck', label: 'Stuck Value (Frozen signal)' },
    { id: 'spike', label: 'Outlier Spike (Intermittent noise)' },
    { id: 'noisy', label: 'Excessive Noise (High variance)' },
  ];

  const sensors = [
    { id: 'level', name: 'HC-SR04 Ultrasonic (Level)', val: faults.level },
    { id: 'load', name: 'HX711 Load Cell (Weight)', val: faults.load },
    { id: 'vibration', name: 'MPU6050 IMU (Vibration)', val: faults.vibration },
    { id: 'motor_current', name: 'Drive Motor Current (Amps)', val: faults.motor_current },
  ];

  return (
    <div className="rounded-xl border border-industrial-800 glass-panel p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-slate-200">Sensor Fault Injection Testbed</h3>
        </div>
        <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Failure Mode Simulator
        </span>
      </div>

      <p className="text-xs text-slate-400 mb-4">
        Simulate sensor hardware faults to test the Sensor Health engine and verify how the Risk Fusion layer down-weights degraded sensors to prevent false alarms.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sensors.map((s) => (
          <div key={s.id} className="bg-industrial-900/60 p-3 rounded-lg border border-industrial-800">
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 font-mono">
              {s.name}
            </label>
            <select
              value={s.val || ''}
              onChange={(e) => onFaultChange(s.id, e.target.value ? e.target.value : null)}
              className={`w-full bg-industrial-950 border rounded-lg px-3 py-1.5 text-xs focus:outline-none transition-colors ${
                s.val ? 'border-amber-500/60 text-amber-300 bg-amber-950/20' : 'border-industrial-700 text-slate-300'
              }`}
            >
              {faultOptions.map((opt) => (
                <option key={opt.id || 'none'} value={opt.id || ''}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};
