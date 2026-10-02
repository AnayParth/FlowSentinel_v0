import React from 'react';
import { Layers } from 'lucide-react';
import { TelemetryData } from '../../lib/types';
import { FusionNetworkGraph } from './FusionNetworkGraph';
import { SensorHealthTable } from './SensorHealthTable';
import { AblationStudio } from './AblationStudio';

interface SensorFusionViewProps {
  latestTelemetry?: TelemetryData | null;
}

export const SensorFusionView: React.FC<SensorFusionViewProps> = ({ latestTelemetry }) => {
  const sensorHealth = latestTelemetry?.sensor_health || {
    vibration: 'HEALTHY',
    level: 'HEALTHY',
    load: 'HEALTHY',
    motor_current: 'HEALTHY',
  };

  const rawSensors = latestTelemetry?.raw_sensors || {
    vibration_g: 1.0,
    distance_cm: 7.2,
    material_level: 12.0,
    load_kg: 25.0,
    ax_g: 0.0,
    ay_g: 0.0,
    az_g: 1.0,
    motor_current_a: 8.0,
  };

  const riskResult = latestTelemetry?.risk_result || {
    risk: 12.0,
    risk_level: 'LOW',
    status: 'NORMAL',
    confidence: 100.0,
    class_contrib: 0.1,
    anomaly_contrib: 0.05,
    trend_contrib: 0.02,
    contributions: {},
    explanation: {},
  };

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Sensor Fusion & Health Studio
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Multi-sensor synthesis integrating ultrasonic distance, load cell force, and tri-axial vibration dynamics.
          </p>
        </div>
      </div>

      {/* Network Graph */}
      <FusionNetworkGraph sensorHealth={sensorHealth} riskResult={riskResult} />

      {/* Health Diagnostic Table */}
      <SensorHealthTable health={sensorHealth} rawSensors={rawSensors} />

      {/* Ablation Benchmark */}
      <AblationStudio />
    </div>
  );
};
