import React from 'react';
import { 
  ShieldAlert, 
  Layers, 
  Activity, 
  BrainCircuit, 
  Sliders, 
  Radio, 
  ArrowRight, 
  CheckCircle2, 
  Cpu,
  Clock,
  Gauge
} from 'lucide-react';

interface LandingPageProps {
  onEnterDashboard: () => void;
  onEnterSimulation: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterDashboard,
  onEnterSimulation,
}) => {
  return (
    <div className="space-y-16 py-6">
      {/* Hero Section */}
      <div className="relative rounded-2xl border border-industrial-800 glass-panel p-8 sm:p-12 overflow-hidden bg-radial-vignette">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-semibold mb-6">
            <ShieldAlert className="w-3.5 h-3.5" />
            Smart India Hackathon (SIH) Solution
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Predict. Prevent. Protect.
            <span className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent mt-1">
              Industrial Chute Blockage Intelligence
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 mt-5 leading-relaxed">
            FlowSentinel is a multi-sensor predictive monitoring and early warning system designed to eliminate unscheduled industrial downtime by detecting, predicting, and explaining chute blockages before catastrophic line choke occurs.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-8">
            <button
              onClick={onEnterDashboard}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-industrial-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all font-mono"
            >
              <span>ENTER LIVE MONITORING</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onEnterSimulation}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-industrial-850 hover:bg-industrial-800 text-slate-200 border border-industrial-700 font-semibold text-sm transition-all"
            >
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Launch Simulation Suite</span>
            </button>
          </div>
        </div>

        {/* Background Decorative Element */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      </div>

      {/* Industrial Problem vs FlowSentinel Solution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* The Problem */}
        <div className="rounded-xl border border-rose-500/20 bg-rose-950/10 p-6 glass-panel">
          <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider block mb-2">
            The Industrial Problem
          </span>
          <h3 className="text-xl font-bold text-slate-100 mb-3">
            Traditional Chute Monitoring Fails Too Late
          </h3>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-rose-400 font-bold">•</span>
              <span><strong>Reactionary Alarms:</strong> Single-sensor tilt switches or optical detectors only alarm when the chute is already 100% jammed.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-400 font-bold">•</span>
              <span><strong>Crippling Downtime Costs:</strong> Clearing a choked bulk material chute can take 4–12 hours, stalling upstream crusher lines.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-400 font-bold">•</span>
              <span><strong>Frequent False Alarms:</strong> Dust deposition on optical sensors causes false emergency trips.</span>
            </li>
          </ul>
        </div>

        {/* The Solution */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-6 glass-panel">
          <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider block mb-2">
            The FlowSentinel Solution
          </span>
          <h3 className="text-xl font-bold text-slate-100 mb-3">
            Multi-Sensor Fusion & Machine Learning
          </h3>
          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Multi-Sensor Synthesis:</strong> Combines ultrasonic distance (HC-SR04), load cell weight (HX711), and vibration (MPU6050).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Early Warning Lead Time:</strong> Predicts developing blockages 15–45 minutes prior to line choke.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Sensor Fault Immunity:</strong> Degraded or disconnected sensors are automatically down-weighted without false trips.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* System Architecture Visualization */}
      <div className="rounded-xl border border-industrial-800 glass-panel p-6 sm:p-8">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-bold">
            End-To-End Architecture
          </span>
          <h3 className="text-2xl font-black text-white mt-1">
            How Data Flows Through FlowSentinel
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-industrial-900/60 border border-industrial-800 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-mono font-bold mb-3 border border-cyan-500/30">
                1
              </div>
              <h4 className="text-sm font-bold text-slate-200">Physical Sensors</h4>
              <p className="text-xs text-slate-400 mt-1">
                HC-SR04 (Distance), HX711 (Load), and MPU6050 (Vibration) sampled at 5–20 Hz by ESP32.
              </p>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 mt-4 block">→ USB / WiFi REST</span>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-industrial-900/60 border border-industrial-800 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-mono font-bold mb-3 border border-cyan-500/30">
                2
              </div>
              <h4 className="text-sm font-bold text-slate-200">Feature Extraction</h4>
              <p className="text-xs text-slate-400 mt-1">
                20 temporal and statistical features computed over rolling window buffer (RMS, slope, kurtosis).
              </p>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 mt-4 block">→ RollingBuffer(20)</span>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-industrial-900/60 border border-industrial-800 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-mono font-bold mb-3 border border-cyan-500/30">
                3
              </div>
              <h4 className="text-sm font-bold text-slate-200">Dual AI Models</h4>
              <p className="text-xs text-slate-400 mt-1">
                Random Forest (4-state classification) + Isolation Forest (unsupervised normal baseline anomaly).
              </p>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 mt-4 block">→ Multi-Model Inference</span>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-industrial-900/60 border border-industrial-800 flex flex-col justify-between">
            <div>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-mono font-bold mb-3 border border-cyan-500/30">
                4
              </div>
              <h4 className="text-sm font-bold text-slate-200">Risk Fusion Layer</h4>
              <p className="text-xs text-slate-400 mt-1">
                Weighted fusion engine synthesizes classification, anomaly score, trend slope, and sensor health into 0–100% risk.
              </p>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 mt-4 block">→ WebSocket Dashboard</span>
          </div>
        </div>
      </div>
    </div>
  );
};
