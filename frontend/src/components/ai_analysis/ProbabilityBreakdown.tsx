import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

interface ProbabilityBreakdownProps {
  probabilities: {
    'NORMAL': number;
    'PARTIAL BLOCKAGE': number;
    'DEVELOPING BLOCKAGE': number;
    'CRITICAL / BLOCKED': number;
  };
}

export const ProbabilityBreakdown: React.FC<ProbabilityBreakdownProps> = ({ probabilities }) => {
  const data = [
    { state: 'NORMAL', proba: Math.round((probabilities['NORMAL'] || 0) * 100), color: '#10b981' },
    { state: 'PARTIAL BLOCKAGE', proba: Math.round((probabilities['PARTIAL BLOCKAGE'] || 0) * 100), color: '#f59e0b' },
    { state: 'DEVELOPING BLOCKAGE', proba: Math.round((probabilities['DEVELOPING BLOCKAGE'] || 0) * 100), color: '#f97316' },
    { state: 'CRITICAL / BLOCKED', proba: Math.round((probabilities['CRITICAL / BLOCKED'] || 0) * 100), color: '#f43f5e' },
  ];

  return (
    <div className="rounded-xl border border-industrial-800 glass-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Random Forest State Probabilities</h3>
          <p className="text-xs text-slate-400 mt-0.5">Multi-class probability distribution across all 4 operating states.</p>
        </div>
      </div>

      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} unit="%" />
            <YAxis
              dataKey="state"
              type="category"
              stroke="#94a3b8"
              tick={{ fontSize: 10, width: 120 }}
              width={140}
            />
            <Tooltip
              formatter={(value: any) => [`${value}%`, 'Probability']}
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
            />
            <Bar dataKey="proba" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-industrial-800 text-center">
        {data.map((d) => (
          <div key={d.state} className="bg-industrial-900/60 p-2 rounded border border-industrial-800">
            <span className="text-[10px] text-slate-400 font-mono block truncate">{d.state}</span>
            <span className="text-sm font-bold font-mono" style={{ color: d.color }}>{d.proba}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
