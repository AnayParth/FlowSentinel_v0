import { SimulationConfig, HardwareDiagnostics, DatasetSummary, AblationItem, TelemetryData, AppModeInfo, OperatingMode } from './types';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API Error [${res.status}]: ${errorText}`);
  }
  return res.json();
}

export const api = {
  // Operating Mode
  getAppMode: () => fetchJson<AppModeInfo>('/api/mode'),
  setAppMode: (mode: OperatingMode) =>
    fetchJson<AppModeInfo>('/api/mode', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    }),
  setFallback: (enabled: boolean) =>
    fetchJson<{ status: string }>('/api/mode/fallback', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    }),

  // Telemetry
  getCurrentTelemetry: () => fetchJson<TelemetryData>('/api/telemetry/current'),

  getTelemetryHistory: (limit = 100) => fetchJson<TelemetryData[]>(`/api/telemetry/history?limit=${limit}`),
  manualPredict: (payload: any) => fetchJson<TelemetryData>('/api/telemetry/manual', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateWeights: (w_classification: number, w_anomaly: number, w_trend: number) =>
    fetchJson('/api/telemetry/weights', {
      method: 'POST',
      body: JSON.stringify({ w_classification, w_anomaly, w_trend }),
    }),
  updateCalibration: (empty_distance_cm: number, full_distance_cm: number) =>
    fetchJson('/api/telemetry/calibrate', {
      method: 'POST',
      body: JSON.stringify({ empty_distance_cm, full_distance_cm }),
    }),

  // Simulation
  startSimulation: () => fetchJson<{ status: string; running: boolean }>('/api/simulation/start', { method: 'POST' }),
  stopSimulation: () => fetchJson<{ status: string; running: boolean }>('/api/simulation/stop', { method: 'POST' }),
  resetSimulation: () => fetchJson<{ status: string; telemetry: TelemetryData }>('/api/simulation/reset', { method: 'POST' }),
  stepSimulation: () => fetchJson<{ status: string; telemetry: TelemetryData }>('/api/simulation/step', { method: 'POST' }),
  configureSimulation: (config: Partial<SimulationConfig>) =>
    fetchJson<{ status: string }>('/api/simulation/config', {
      method: 'POST',
      body: JSON.stringify(config),
    }),
  getSimulationStatus: () => fetchJson<any>('/api/simulation/status'),

  // Hardware
  getPorts: () => fetchJson<Array<{ port: string; description: string }>>('/api/hardware/ports'),
  connectSerial: (port: string, baudrate = 115200) =>
    fetchJson<{ status: string; port: string }>('/api/hardware/connect', {
      method: 'POST',
      body: JSON.stringify({ port, baudrate }),
    }),
  disconnectSerial: () => fetchJson<{ status: string }>('/api/hardware/disconnect', { method: 'POST' }),
  getHardwareDiagnostics: () => fetchJson<HardwareDiagnostics>('/api/hardware/diagnostics'),

  // Training
  getDatasetSummary: () => fetchJson<DatasetSummary>('/api/training/dataset'),
  startRecording: (label: string) =>
    fetchJson<{ status: string; session_id: string; label: string }>('/api/training/record/start', {
      method: 'POST',
      body: JSON.stringify({ label }),
    }),
  stopRecording: () => fetchJson<{ status: string; samples_saved: number }>('/api/training/record/stop', { method: 'POST' }),
  discardRecording: () => fetchJson<{ status: string }>('/api/training/record/discard', { method: 'POST' }),
  trainModels: (enable_motor_current = false, window = 20) =>
    fetchJson<any>('/api/training/train', {
      method: 'POST',
      body: JSON.stringify({ enable_motor_current, window }),
    }),

  // Analytics
  getFeatureImportance: () => fetchJson<Record<string, number>>('/api/analytics/feature-importance'),
  getEvaluationMetrics: () => fetchJson<any>('/api/analytics/evaluation'),
  runAblationStudy: () => fetchJson<AblationItem[]>('/api/analytics/ablation', { method: 'POST' }),

  // Alerts
  getAlerts: (limit = 50) => fetchJson<any[]>(`/api/alerts?limit=${limit}`),
  clearAlerts: () => fetchJson<{ status: string }>('/api/alerts/clear', { method: 'POST' }),
};
