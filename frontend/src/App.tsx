import React, { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { TelemetryData, OperatingMode } from './lib/types';
import { api } from './lib/api';

// Layout Components
import { Navbar } from './components/layout/Navbar';
import { ModeBanner } from './components/layout/ModeBanner';

// Dashboard Components
import { StatusHeader } from './components/dashboard/StatusHeader';
import { RiskGauge } from './components/dashboard/RiskGauge';
import { ChuteDigitalTwin } from './components/dashboard/ChuteDigitalTwin';
import { SensorCard } from './components/dashboard/SensorCard';
import { LiveTelemetryCharts } from './components/dashboard/LiveTelemetryCharts';

// Feature Views
import { SimulationStudio } from './components/simulation/SimulationStudio';
import { AIAnalysisView } from './components/ai_analysis/AIAnalysisView';
import { SensorFusionView } from './components/sensor_fusion/SensorFusionView';
import { HardwareGateway } from './components/hardware/HardwareGateway';
import { ModelTrainingStudio } from './components/training/ModelTrainingStudio';
import { AlertCenter } from './components/alerts/AlertCenter';
import { LandingPage } from './components/landing/LandingPage';

// Icons
import { Radio, Scale, Activity, Zap } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mode, setMode] = useState<OperatingMode>('simulation');
  const [hardwareConnected, setHardwareConnected] = useState<boolean>(false);
  const [hardwarePort, setHardwarePort] = useState<string | null>(null);
  const [simulationRunning, setSimulationRunning] = useState<boolean>(true);
  const [fallbackTelemetry, setFallbackTelemetry] = useState<TelemetryData | null>(null);

  // Connect to live WebSocket stream
  const { isConnected, latestData, history } = useWebSocket();

  // Initial fetch & periodic synchronization of authoritative state
  const syncSystemState = async () => {
    try {
      const [appModeInfo, diag] = await Promise.all([
        api.getAppMode(),
        api.getHardwareDiagnostics(),
      ]);
      setMode(appModeInfo.mode);
      setHardwareConnected(diag.connected);
      setHardwarePort(diag.port || appModeInfo.port || null);
      setSimulationRunning(appModeInfo.simulation_running);
    } catch (e) {
      console.error('System state sync error:', e);
    }
  };

  useEffect(() => {
    async function init() {
      try {
        const [tel, appModeInfo, diag] = await Promise.all([
          api.getCurrentTelemetry(),
          api.getAppMode(),
          api.getHardwareDiagnostics(),
        ]);
        setFallbackTelemetry(tel);
        setMode(appModeInfo.mode);
        setHardwareConnected(diag.connected);
        setHardwarePort(diag.port || appModeInfo.port || null);
        setSimulationRunning(appModeInfo.simulation_running);
      } catch (e) {
        console.error('Initial data fetch error:', e);
      }
    }
    init();

    // Periodic state heartbeat sync every 2 seconds
    const interval = setInterval(syncSystemState, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update hardware state when telemetry contains hardware metadata
  useEffect(() => {
    if (latestData) {
      if (latestData.hardware_connected !== undefined) {
        setHardwareConnected(latestData.hardware_connected);
      }
      if (latestData.hardware_port !== undefined) {
        setHardwarePort(latestData.hardware_port);
      }
      if (latestData.app_mode && latestData.app_mode !== mode) {
        setMode(latestData.app_mode);
      }
    }
  }, [latestData, mode]);

  const telemetry: TelemetryData = latestData || fallbackTelemetry || {
    t: 0,
    timestamp: Date.now() / 1000,
    mode: mode,
    raw_sensors: {
      vibration_g: 1.02,
      distance_cm: 7.2,
      material_level: 12.5,
      load_kg: 24.8,
      ax_g: 0.02,
      ay_g: -0.01,
      az_g: 1.01,
      motor_current_a: 8.1,
    },
    features: {},
    class_probabilities: {
      'NORMAL': 0.88,
      'PARTIAL BLOCKAGE': 0.08,
      'DEVELOPING BLOCKAGE': 0.03,
      'CRITICAL / BLOCKED': 0.01,
    },
    predicted_state: 'NORMAL',
    predicted_state_id: 0,
    anomaly_score: 0.085,
    risk_result: {
      risk: 11.2,
      risk_level: 'LOW',
      status: 'NORMAL',
      confidence: 100,
      class_contrib: 0.06,
      anomaly_contrib: 0.08,
      trend_contrib: 0.02,
      contributions: {
        'Random Forest Classification': 6.0,
        'Isolation Forest Anomaly': 8.0,
        'Temporal Slope Trend': 2.0,
      },
      explanation: {
        'Material Accumulation Rate': 'LOW',
        'Behavioral Anomaly Index': 'LOW',
        'Blockage State Progression': 'LOW',
      },
    },
    sensor_health: {
      vibration: 'HEALTHY',
      level: 'HEALTHY',
      load: 'HEALTHY',
      motor_current: 'HEALTHY',
    },
    active_alerts: [],
  };

  const handleSwitchMode = async (newMode: OperatingMode) => {
    setMode(newMode);
    try {
      await api.setAppMode(newMode);
    } catch (e) {
      console.error('Failed to set app mode:', e);
    }
    if (newMode === 'hardware') {
      setActiveTab('hardware');
    } else {
      setActiveTab('simulation');
    }
  };

  const handleHardwareConnectionChange = (connected: boolean, port: string | null) => {
    setHardwareConnected(connected);
    if (port) setHardwarePort(port);
  };


  return (
    <div className="min-h-screen flex flex-col bg-industrial-950 text-slate-100 font-sans">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        alertCount={telemetry.active_alerts?.length || 0}
      />

      {/* Operating Mode Status Banner */}
      <ModeBanner
        mode={mode}
        hardwareConnected={hardwareConnected}
        hardwarePort={hardwarePort}
        onSwitchMode={handleSwitchMode}
        simulationRunning={simulationRunning}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* View Routing */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* 1. Status Header Bar */}
            <StatusHeader
              riskResult={telemetry.risk_result}
              predictedState={telemetry.predicted_state}
            />

            {/* 2. Primary Gauges & Digital Twin */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-4 flex flex-col">
                <RiskGauge riskResult={telemetry.risk_result} />
              </div>
              <div className="lg:col-span-8 flex flex-col">
                <ChuteDigitalTwin
                  sensors={telemetry.raw_sensors}
                  riskResult={telemetry.risk_result}
                />
              </div>
            </div>

            {/* 3. Sensor Telemetry Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SensorCard
                title="Material Level / Height"
                hardwareChip="HC-SR04 Ultrasonic"
                value={telemetry.raw_sensors.material_level}
                unit="%"
                secondaryLabel="Surface Distance"
                secondaryValue={`${telemetry.raw_sensors.distance_cm.toFixed(1)} cm`}
                health={telemetry.sensor_health.level}
                trend={telemetry.raw_sensors.material_level > 40 ? 'rising' : 'stable'}
                icon={Radio}
                accentColor="cyan"
              />

              <SensorCard
                title="Chute Impact Load"
                hardwareChip="HX711 Load Cell"
                value={telemetry.raw_sensors.load_kg}
                unit="kg"
                secondaryLabel="Operating Range"
                secondaryValue="0.0 – 5.0 kg"
                health={telemetry.sensor_health.load}
                trend={telemetry.raw_sensors.load_kg > 0.8 ? 'rising' : 'stable'}
                icon={Scale}
                accentColor="amber"
              />

              <SensorCard
                title="Vibration Magnitude"
                hardwareChip="MPU6050 6-DOF IMU"
                value={telemetry.raw_sensors.vibration_g}
                unit="g"
                secondaryLabel="Ax / Ay / Az"
                secondaryValue={`${telemetry.raw_sensors.ax_g.toFixed(2)} / ${telemetry.raw_sensors.ay_g.toFixed(2)} / ${telemetry.raw_sensors.az_g.toFixed(2)}`}
                health={telemetry.sensor_health.vibration}
                trend="stable"
                icon={Activity}
                accentColor="emerald"
              />

              <SensorCard
                title="Drive Motor Inverter"
                hardwareChip={telemetry.raw_sensors.motor_current_a != null ? "Inverter CT Sensor" : "NOT CONNECTED"}
                value={telemetry.raw_sensors.motor_current_a != null ? telemetry.raw_sensors.motor_current_a : "—"}
                unit={telemetry.raw_sensors.motor_current_a != null ? "A" : ""}
                secondaryLabel="Status"
                secondaryValue={telemetry.raw_sensors.motor_current_a != null ? "Active" : "NOT CONNECTED"}
                health={telemetry.raw_sensors.motor_current_a != null ? (telemetry.sensor_health.motor_current || 'HEALTHY') : 'NOT_CONNECTED'}
                trend="stable"
                icon={Zap}
                accentColor="purple"
              />
            </div>

            {/* 4. Live Multi-Series Telemetry Charts */}
            <LiveTelemetryCharts history={history} />
          </div>
        )}

        {activeTab === 'ai-analysis' && (
          <AIAnalysisView latestTelemetry={telemetry} />
        )}

        {activeTab === 'sensor-fusion' && (
          <SensorFusionView latestTelemetry={telemetry} />
        )}

        {activeTab === 'simulation' && (
          <SimulationStudio
            simulationRunning={simulationRunning}
            onSimulationToggle={(r) => setSimulationRunning(r)}
            latestTelemetry={telemetry}
          />
        )}

        {activeTab === 'hardware' && (
          <HardwareGateway
            onConnectionChange={handleHardwareConnectionChange}
            onModeChange={(m) => setMode(m)}
          />
        )}


        {activeTab === 'training' && (
          <ModelTrainingStudio />
        )}

        {activeTab === 'alerts' && (
          <AlertCenter />
        )}

        {activeTab === 'landing' && (
          <LandingPage
            onEnterDashboard={() => setActiveTab('dashboard')}
            onEnterSimulation={() => setActiveTab('simulation')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-industrial-800/80 bg-industrial-950 py-4 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>FlowSentinel — Smart India Hackathon Industrial Blockage Intelligence</span>
          <span>FastAPI Backend · React / TypeScript · Multi-Sensor AI</span>
        </div>
      </footer>
    </div>
  );
};
