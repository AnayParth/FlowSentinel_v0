import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw, Radio, CheckCircle2, AlertCircle, Terminal, Copy, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { HardwareDiagnostics, OperatingMode } from '../../lib/types';

interface HardwareGatewayProps {
  onConnectionChange?: (connected: boolean, port: string | null) => void;
  onModeChange?: (mode: OperatingMode) => void;
}

export const HardwareGateway: React.FC<HardwareGatewayProps> = ({
  onConnectionChange,
  onModeChange,
}) => {
  const [ports, setPorts] = useState<Array<{ port: string; description: string }>>([]);
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [diagnostics, setDiagnostics] = useState<HardwareDiagnostics>({
    connected: false,
    valid_samples: 0,
    malformed_samples: 0,
  });
  const [emptyDist, setEmptyDist] = useState<number>(8.0);
  const [fullDist, setFullDist] = useState<number>(0.5);
  const [calibSuccess, setCalibSuccess] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchPorts = async () => {
    try {
      const p = await api.getPorts();
      setPorts(p);
      if (p.length > 0 && !selectedPort) {
        setSelectedPort(p[0].port);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDiagnostics = async () => {
    try {
      const d = await api.getHardwareDiagnostics();
      setDiagnostics(d);
      if (onConnectionChange) {
        onConnectionChange(d.connected, d.port || selectedPort || null);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchPorts();
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    if (!selectedPort) return;
    setConnecting(true);
    try {
      await api.connectSerial(selectedPort, baudRate);
      await api.setAppMode('hardware');
      if (onConnectionChange) onConnectionChange(true, selectedPort);
      if (onModeChange) onModeChange('hardware');
      await fetchDiagnostics();
    } catch (e: any) {
      alert(`Connection failed: ${e.message}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.disconnectSerial();
      if (onConnectionChange) onConnectionChange(false, null);
      await fetchDiagnostics();
    } catch (e) {
      console.error(e);
    }
  };


  const handleSaveCalibration = async () => {
    try {
      await api.updateCalibration(emptyDist, fullDist);
      setCalibSuccess(true);
      setTimeout(() => setCalibSuccess(false), 2500);
    } catch (e: any) {
      alert(`Calibration error: ${e.message}`);
    }
  };

  const copyArduinoCode = () => {
    const code = `// FlowSentinel ESP32 Telemetry Sample
#define TRIG_PIN 25
#define ECHO_PIN 26
// Connect HC-SR04, HX711 (DOUT=32, SCK=33), MPU6050 (SDA=21, SCL=22)
// Sends: timestamp,distance_cm,load_kg,ax_g,ay_g,az_g over USB Serial @ 115200`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            ESP32 Microcontroller & Hardware Gateway
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Connect physical ESP32 over USB Serial or push wireless telemetry directly over WiFi REST / WebSockets.
          </p>
        </div>
      </div>

      {/* Serial Connection Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-industrial-800 glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">USB Serial Connection</h3>
            </div>
            <button
              onClick={fetchPorts}
              className="p-1.5 rounded-lg bg-industrial-900 border border-industrial-800 text-slate-400 hover:text-white transition-colors"
              title="Refresh COM Ports"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* COM Port selection */}
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">Serial COM Port</label>
              <select
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
                disabled={diagnostics.connected}
                className="w-full bg-industrial-900 border border-industrial-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              >
                {ports.length > 0 ? (
                  ports.map((p) => (
                    <option key={p.port} value={p.port}>
                      {p.port} — {p.description}
                    </option>
                  ))
                ) : (
                  <option value="">No COM Ports Detected (Plug in ESP32 via USB)</option>
                )}
              </select>
            </div>

            {/* Baud rate */}
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">Baud Rate</label>
              <select
                value={baudRate}
                onChange={(e) => setBaudRate(Number(e.target.value))}
                disabled={diagnostics.connected}
                className="w-full bg-industrial-900 border border-industrial-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              >
                <option value={115200}>115200 baud (Standard)</option>
                <option value={57600}>57600 baud</option>
                <option value={9600}>9600 baud</option>
              </select>
            </div>

            {/* Connect / Disconnect Buttons */}
            <div className="pt-2">
              {diagnostics.connected ? (
                <button
                  onClick={handleDisconnect}
                  className="w-full py-2.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-500/20 transition-all font-mono"
                >
                  CONNECT TO ESP32
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={connecting || !selectedPort}
                  className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-industrial-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all font-mono disabled:opacity-40"
                >
                  {/* {connecting ? 'ESTABLISHING SERIAL LINK...' : 'CONNECT TO ESP32'} */}
                  {connecting ? 'ESTABLISHING SERIAL LINK...' : 'DISCONNECT ESP32'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live Diagnostics Terminal */}
        <div className="rounded-xl border border-industrial-800 glass-panel p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-200">Gateway Status & Diagnostics</h3>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                diagnostics.connected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-industrial-900 text-slate-400 border border-industrial-800'
              }`}>
                {/* {diagnostics.connected ? 'ONLINE' : 'NOT CONNECTED'} */}
                {diagnostics.connected ? 'ONLINE' : 'CONNECTED'}
              </span>
            </div>

            <div className="bg-industrial-950 p-3.5 rounded-lg border border-industrial-800 font-mono text-xs text-slate-300 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Hardware Link:</span>
                <span className={diagnostics.connected ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  {diagnostics.connected ? `Active on ${diagnostics.port}` : 'Idle (Simulation Active)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Valid Telemetry Packets:</span>
                <span className="text-cyan-400 font-bold">{diagnostics.valid_samples}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Malformed / Dropped:</span>
                <span className={diagnostics.malformed_samples > 0 ? 'text-amber-400' : 'text-slate-400'}>
                  {diagnostics.malformed_samples}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last Packet Monotonic:</span>
                <span className="text-slate-300">
                  {diagnostics.seconds_since_last_valid !== null && diagnostics.seconds_since_last_valid !== undefined
                    ? `${diagnostics.seconds_since_last_valid}s ago`
                    : 'None received'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-industrial-900/60 rounded-lg border border-industrial-800 text-[11px] text-slate-400 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              If ESP32 hardware is not connected, the entire FlowSentinel AI platform automatically operates seamlessly in <strong>Simulation Mode</strong>.
            </span>
          </div>
        </div>
      </div>

      {/* Ultrasonic Calibration & WiFi Endpoint Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HC-SR04 Calibration */}
        <div className="rounded-xl border border-industrial-800 glass-panel p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-2">HC-SR04 Ultrasonic Calibration</h3>
          <p className="text-xs text-slate-400 mb-4">
            Calibrate surface distance to chute fill level using empty chute height and 100% reference level.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">Empty Chute (cm)</label>
              <input
                type="number"
                step="0.1"
                value={emptyDist}
                onChange={(e) => setEmptyDist(Number(e.target.value))}
                className="w-full bg-industrial-900 border border-industrial-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">100% Full Reference (cm)</label>
              <input
                type="number"
                step="0.1"
                value={fullDist}
                onChange={(e) => setFullDist(Number(e.target.value))}
                className="w-full bg-industrial-900 border border-industrial-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <button
            onClick={handleSaveCalibration}
            className="w-full py-2 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-cyan-300 border border-cyan-500/40 text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5"
          >
            {calibSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : null}
            {calibSuccess ? 'CALIBRATION SAVED' : 'SAVE CALIBRATION'}
          </button>
        </div>

        {/* Wireless WiFi Telemetry Contract */}
        <div className="rounded-xl border border-industrial-800 glass-panel p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-200">WiFi HTTP Telemetry Endpoint</h3>
            <button
              onClick={copyArduinoCode}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Wireless ESP32 microcontrollers can POST JSON telemetry directly over local WiFi or 4G IoT gateways:
          </p>
          <div className="bg-industrial-950 p-3 rounded-lg border border-industrial-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
            <code>POST /api/telemetry/esp32/push</code>
            <div className="text-slate-500 mt-1">
              {`{ "distance_cm": 4.2, "load_kg": 18.5, "ax_g": 0.02, "ay_g": -0.01, "az_g": 0.98 }`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
