import React from 'react';
import { SensorHealth, RawSensors } from '../../lib/types';
import { getHealthColor } from '../../lib/utils';
import { Check, AlertTriangle, XCircle } from 'lucide-react';

interface SensorHealthTableProps {
  health: SensorHealth;
  rawSensors: RawSensors;
}

export const SensorHealthTable: React.FC<SensorHealthTableProps> = ({ health, rawSensors }) => {
  const sensorRows = [
    {
      name: 'HC-SR04 Ultrasonic Sensor',
      parameter: 'Distance / Material Level',
      expectedRange: '0.5 – 350.0 cm',
      currentReading: `${rawSensors.distance_cm.toFixed(1)} cm (${rawSensors.material_level.toFixed(0)}%)`,
      status: health.level,
      checks: {
        bounds: rawSensors.distance_cm >= 0.5 && rawSensors.distance_cm <= 350,
        stuck: health.level === 'HEALTHY',
        dropout: rawSensors.distance_cm > 0,
      },
    },
    {
      name: 'HX711 Load Cell Amplifier',
      parameter: 'Material Impact Load',
      expectedRange: '0.0 – 5.0 kg',
      currentReading: `${rawSensors.load_kg.toFixed(3)} kg`,
      status: health.load,
      checks: {
        bounds: rawSensors.load_kg >= 0 && rawSensors.load_kg <= 5.0,
        stuck: health.load === 'HEALTHY',
        dropout: true,
      },
    },
    {
      name: 'MPU6050 6-DOF IMU',
      parameter: 'Tri-Axial Vibration Magnitude',
      expectedRange: '0.2 – 10.0 g',
      currentReading: `${rawSensors.vibration_g.toFixed(3)} g`,
      status: health.vibration,
      checks: {
        bounds: rawSensors.vibration_g >= 0.05 && rawSensors.vibration_g <= 16,
        stuck: health.vibration === 'HEALTHY',
        dropout: rawSensors.vibration_g > 0,
      },
    },
  ];

  return (
    <div className="rounded-xl border border-industrial-800 glass-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Sensor Signal Health & Integrity Matrix</h3>
          <p className="text-xs text-slate-400 mt-0.5">Real-time physical bounds sanity checks, stuck signal detection, and dropout flags.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-industrial-800 text-slate-400 font-mono text-[10px] uppercase">
              <th className="py-2.5 px-3">Sensor Hardware</th>
              <th className="py-2.5 px-3">Measured Parameter</th>
              <th className="py-2.5 px-3">Operating Range</th>
              <th className="py-2.5 px-3">Current Value</th>
              <th className="py-2.5 px-3">Sanity Checks</th>
              <th className="py-2.5 px-3 text-right">Health State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-industrial-800/60 font-mono">
            {sensorRows.map((s, idx) => {
              const hStyle = getHealthColor(s.status);
              return (
                <tr key={idx} className="hover:bg-industrial-900/40 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-200">{s.name}</td>
                  <td className="py-3 px-3 text-slate-400">{s.parameter}</td>
                  <td className="py-3 px-3 text-slate-500">{s.expectedRange}</td>
                  <td className="py-3 px-3 font-bold text-cyan-400">{s.currentReading}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className={`flex items-center gap-1 ${s.checks.bounds ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {s.checks.bounds ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} Range
                      </span>
                      <span className={`flex items-center gap-1 ${s.checks.stuck ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {s.checks.stuck ? <Check className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} Dynamics
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${hStyle.bg} ${hStyle.text} ${hStyle.border}`}>
                      {hStyle.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
