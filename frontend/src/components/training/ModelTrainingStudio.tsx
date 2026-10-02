import React, { useState, useEffect } from 'react';
import { Database, Play, Square, Trash2, BrainCircuit, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { DatasetSummary } from '../../lib/types';

export const ModelTrainingStudio: React.FC = () => {
  const [summary, setSummary] = useState<DatasetSummary>({
    total_samples: 0,
    sessions: 0,
    per_class_counts: {},
    current_buffer_count: 0,
    is_recording: false,
  });
  const [label, setLabel] = useState<string>('NORMAL');
  const [training, setTraining] = useState<boolean>(false);
  const [trainResult, setTrainResult] = useState<any>(null);

  const fetchSummary = async () => {
    try {
      const data = await api.getDatasetSummary();
      setSummary(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleStartRecording = async () => {
    try {
      await api.startRecording(label);
      await fetchSummary();
    } catch (e: any) {
      alert(`Failed to start recording: ${e.message}`);
    }
  };

  const handleStopRecording = async () => {
    try {
      const res = await api.stopRecording();
      await fetchSummary();
      alert(`Recording saved! Added ${res.samples_saved} samples to dataset.`);
    } catch (e: any) {
      alert(`Failed to save recording: ${e.message}`);
    }
  };

  const handleDiscardRecording = async () => {
    try {
      await api.discardRecording();
      await fetchSummary();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTrainModels = async () => {
    setTraining(true);
    setTrainResult(null);
    try {
      const res = await api.trainModels(false, 20);
      setTrainResult(res);
      await fetchSummary();
    } catch (e: any) {
      alert(`Training failed: ${e.message}`);
    } finally {
      setTraining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            Dataset Recording & Model Training Studio
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Capture real labelled sensor sessions from physical hardware and train custom Random Forest / Isolation Forest models.
          </p>
        </div>
      </div>

      {/* Dataset Summary & Recorder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dataset Summary */}
        <div className="rounded-xl border border-industrial-800 glass-panel p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Persisted Real Dataset Statistics</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-industrial-900/60 p-3 rounded-lg border border-industrial-800">
              <span className="text-[10px] text-slate-400 font-mono block">TOTAL RECORDED SAMPLES</span>
              <span className="text-2xl font-bold font-mono text-cyan-400">{summary.total_samples}</span>
            </div>
            <div className="bg-industrial-900/60 p-3 rounded-lg border border-industrial-800">
              <span className="text-[10px] text-slate-400 font-mono block">RECORDING SESSIONS</span>
              <span className="text-2xl font-bold font-mono text-purple-400">{summary.sessions}</span>
            </div>
          </div>

          <span className="text-xs font-mono text-slate-400 block mb-2">Class Distribution:</span>
          <div className="space-y-2 font-mono text-xs">
            {Object.entries(summary.per_class_counts || {}).map(([cName, count]) => (
              <div key={cName} className="flex justify-between items-center bg-industrial-950 p-2 rounded border border-industrial-800">
                <span className="text-slate-300">{cName}</span>
                <span className="text-slate-400 font-bold">{count} samples</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Session Recorder */}
        <div className="rounded-xl border border-industrial-800 glass-panel p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200">Record Live Session</h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                summary.is_recording ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' : 'bg-industrial-900 text-slate-400 border border-industrial-800'
              }`}>
                {summary.is_recording ? '● RECORDING ACTIVE' : 'IDLE'}
              </span>
            </div>

            <div className="mb-4">
              <label className="text-xs font-mono text-slate-300 block mb-1">Select Chute Operating State Label</label>
              <select
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={summary.is_recording}
                className="w-full bg-industrial-900 border border-industrial-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              >
                <option value="NORMAL">NORMAL (Clean Chute Flow)</option>
                <option value="PARTIAL BLOCKAGE">PARTIAL BLOCKAGE (Early Buildup)</option>
                <option value="DEVELOPING BLOCKAGE">DEVELOPING BLOCKAGE (Restricted Flow)</option>
                <option value="CRITICAL / BLOCKED">CRITICAL / BLOCKED (Complete Choke)</option>
              </select>
            </div>

            {summary.is_recording && (
              <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-lg mb-4 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-rose-300">Buffered Samples:</span>
                  <span className="text-rose-400 font-bold">{summary.current_buffer_count} samples</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-rose-300">Active Label:</span>
                  <span className="text-white font-bold">{summary.current_label}</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {!summary.is_recording ? (
              <button
                onClick={handleStartRecording}
                className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-industrial-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all font-mono flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                START RECORDING SESSION
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleStopRecording}
                  className="py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-industrial-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all font-mono flex items-center justify-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  STOP & SAVE
                </button>
                <button
                  onClick={handleDiscardRecording}
                  className="py-2.5 rounded-lg bg-industrial-800 hover:bg-industrial-700 text-rose-300 border border-rose-500/40 text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  DISCARD
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Retrain AI Models Card */}
      <div className="rounded-xl border border-industrial-800 glass-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Train / Retrain AI Pipeline</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Replays recorded sessions through the unified rolling window feature extractor and trains Random Forest + Isolation Forest models.
            </p>
          </div>

          <button
            onClick={handleTrainModels}
            disabled={training}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-industrial-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all font-mono flex items-center gap-2 disabled:opacity-50"
          >
            <BrainCircuit className="w-4 h-4" />
            {training ? 'TRAINING MODELS...' : 'RETRAIN ON RECORDED DATA'}
          </button>
        </div>

        {trainResult && (
          <div className="mt-4 p-4 bg-emerald-950/20 border border-emerald-500/40 rounded-lg text-xs font-mono space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              Retraining Succeeded! Saved to disk and loaded into live inference pipeline.
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <span className="text-slate-400 block text-[10px]">HOLDOUT ACCURACY:</span>
                <span className="text-emerald-400 font-bold text-base">
                  {((trainResult.rf_metrics?.accuracy || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">MACRO F1 SCORE:</span>
                <span className="text-purple-400 font-bold text-base">
                  {((trainResult.rf_metrics?.f1_macro || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">FEATURE WINDOWS:</span>
                <span className="text-cyan-400 font-bold text-base">{trainResult.n_feature_rows}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">RAW SAMPLES:</span>
                <span className="text-slate-200 font-bold text-base">{trainResult.n_raw_samples}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
