import React, { useState, useEffect } from 'react';
import { Bell, AlertOctagon, AlertTriangle, Info, CheckCircle2, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';
import { AlertItem } from '../../lib/types';

export const AlertCenter: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const fetchAlerts = async () => {
    try {
      const data = await api.getAlerts(50);
      setAlerts(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleClear = async () => {
    try {
      await api.clearAlerts();
      setAlerts([]);
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = alerts.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'critical') return a.severity === 'critical' || a.severity === 'error';
    if (filter === 'warning') return a.severity === 'warning';
    if (filter === 'info') return a.severity === 'info' || a.severity === 'success';
    return true;
  });

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-cyan-400 shrink-0" />;
    }
  };

  const getAlertBorder = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return 'border-rose-500/30 bg-rose-950/20';
      case 'warning':
        return 'border-amber-500/30 bg-amber-950/20';
      case 'success':
        return 'border-emerald-500/30 bg-emerald-950/20';
      case 'info':
      default:
        return 'border-cyan-500/30 bg-cyan-950/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            Alerts & Operational Event Log
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated notifications triggered by blockage escalation thresholds and sensor health degradation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Severity Filters */}
          <div className="flex bg-industrial-900 p-0.5 rounded-lg border border-industrial-800 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                filter === 'all' ? 'bg-industrial-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Events ({alerts.length})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                filter === 'critical' ? 'bg-rose-900/60 text-rose-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Critical
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                filter === 'warning' ? 'bg-amber-900/60 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Warnings
            </button>
          </div>

          <button
            onClick={handleClear}
            className="p-2 rounded-lg bg-industrial-850 hover:bg-industrial-800 text-slate-400 hover:text-rose-400 border border-industrial-700 transition-colors"
            title="Clear Event Log"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alert Feed List */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border ${getAlertBorder(alert.severity)} glass-panel flex items-start gap-3.5 transition-all`}
            >
              <div className="mt-0.5">{getAlertIcon(alert.severity)}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-100">{alert.title}</h4>
                  <span className="text-[10px] font-mono text-slate-400 bg-industrial-900 px-2 py-0.5 rounded border border-industrial-800">
                    {alert.time_str || 'Recently'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{alert.message}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-industrial-900 text-slate-400 border border-industrial-800">
                    {alert.category}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-industrial-800 glass-panel p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-60" />
            <h4 className="text-sm font-bold text-slate-200">No Active Warning Events</h4>
            <p className="text-xs text-slate-400 mt-1">
              All monitored chute sensors and blockage risk levels are currently within safe operating tolerances.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
