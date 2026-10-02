export type SystemStatus = 'NORMAL' | 'EARLY ANOMALY' | 'DEVELOPING BLOCKAGE' | 'CRITICAL';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY HIGH';
export type HealthState = 'HEALTHY' | 'DEGRADED' | 'FAILED' | 'NOT_CONNECTED';
export type OperatingMode = 'simulation' | 'hardware' | 'manual';

export interface RawSensors {
  vibration_g: number;
  distance_cm: number;
  material_level: number;
  load_kg: number;
  ax_g: number;
  ay_g: number;
  az_g: number;
  motor_current_a?: number | null;
}

export interface SensorHealth {
  vibration: HealthState;
  level: HealthState;
  load: HealthState;
  motor_current?: HealthState | null;
}

export interface RiskResult {
  risk: number;
  risk_level: RiskLevel;
  status: SystemStatus;
  confidence: number;
  class_contrib: number;
  anomaly_contrib: number;
  trend_contrib: number;
  contributions: {
    [key: string]: number;
  };
  explanation: {
    [key: string]: string;
  };
}

export interface AlertItem {
  id: string;
  timestamp: number;
  time_str: string;
  severity: 'critical' | 'warning' | 'info' | 'error' | 'success';
  title: string;
  message: string;
  category: string;
  acknowledged?: boolean;
}

export interface TelemetryData {
  t: number;
  timestamp: number;
  mode: OperatingMode;
  app_mode?: OperatingMode;
  hardware_connected?: boolean;
  hardware_port?: string | null;
  simulation_running?: boolean;
  raw_sensors: RawSensors;
  features: Record<string, number>;
  class_probabilities: {
    'NORMAL': number;
    'PARTIAL BLOCKAGE': number;
    'DEVELOPING BLOCKAGE': number;
    'CRITICAL / BLOCKED': number;
  };
  predicted_state: string;
  predicted_state_id: number;
  anomaly_score: number;
  risk_result: RiskResult;
  sensor_health: SensorHealth;
  active_alerts?: AlertItem[];
}

export interface AppModeInfo {
  mode: OperatingMode;
  hardware_connected: boolean;
  simulation_running: boolean;
  port?: string | null;
  fallback_to_simulation?: boolean;
}


export interface SimulationConfig {
  mode: 'progressive' | 'sudden' | 'random' | 'normal' | 'custom';
  material: 'generic' | 'iron_ore' | 'coal' | 'pellets' | 'limestone';
  enable_motor_current: boolean;
  ramp_seconds: number;
  noise_level: number;
  tick_delay: number;
  manual_severity?: number | null;
  fault_vibration?: 'dropout' | 'stuck' | 'spike' | 'noisy' | null;
  fault_level?: 'dropout' | 'stuck' | 'spike' | 'noisy' | null;
  fault_load?: 'dropout' | 'stuck' | 'spike' | 'noisy' | null;
  fault_motor_current?: 'dropout' | 'stuck' | 'spike' | 'noisy' | null;
}

export interface HardwareDiagnostics {
  connected: boolean;
  port?: string | null;
  baudrate?: number | null;
  valid_samples: number;
  malformed_samples: number;
  seconds_since_last_valid?: number | null;
  last_error?: string | null;
}

export interface DatasetSummary {
  total_samples: number;
  sessions: number;
  per_class_counts: Record<string, number>;
  current_buffer_count: number;
  is_recording: boolean;
  current_label?: string | null;
}

export interface AblationItem {
  configuration: string;
  sensor_count: number;
  rf_accuracy: number;
  rf_f1_macro: number;
  if_separation: number;
}
