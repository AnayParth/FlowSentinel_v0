import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { SystemStatus, RiskLevel, HealthState } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getStatusColor(status: SystemStatus) {
  switch (status) {
    case 'NORMAL':
      return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        glow: 'glow-emerald',
        badge: 'bg-emerald-500 text-industrial-950 font-bold',
        dot: 'bg-emerald-400 shadow-[0_0_8px_#10b981]',
      };
    case 'EARLY ANOMALY':
      return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        glow: 'glow-amber',
        badge: 'bg-amber-500 text-industrial-950 font-bold',
        dot: 'bg-amber-400 shadow-[0_0_8px_#f59e0b]',
      };
    case 'DEVELOPING BLOCKAGE':
      return {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        text: 'text-orange-400',
        glow: 'shadow-[0_0_20px_-3px_rgba(249,115,22,0.4)]',
        badge: 'bg-orange-500 text-white font-bold',
        dot: 'bg-orange-400 shadow-[0_0_8px_#f97316]',
      };
    case 'CRITICAL':
    default:
      return {
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/30',
        text: 'text-rose-400',
        glow: 'glow-rose',
        badge: 'bg-rose-500 text-white font-bold',
        dot: 'bg-rose-400 shadow-[0_0_8px_#f43f5e]',
      };
  }
}

export function getHealthColor(health?: HealthState | null) {
  switch (health) {
    case 'HEALTHY':
      return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'ONLINE' };
    case 'DEGRADED':
      return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'DEGRADED' };
    case 'FAILED':
      return { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', label: 'FAULT' };
    case 'NOT_CONNECTED':
    default:
      return { text: 'text-slate-400', bg: 'bg-industrial-900', border: 'border-industrial-800', label: 'NOT CONNECTED' };
  }
}

export function formatNumber(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return val.toFixed(decimals);
}
