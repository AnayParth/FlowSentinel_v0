import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface FeatureImportanceChartProps {
  importances: Record<string, number>;
}

export const FeatureImportanceChart: React.FC<FeatureImportanceChartProps> = ({ importances }) => {
  const sorted = Object.entries(importances || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, val]) => ({
      feature: key.replace(/_/g, ' '),
      importance: Number((val * 100).toFixed(1)),
    }));

  return (
    <div className="rounded-xl border border-industrial-800 glass-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Global Feature Importance (Random Forest)</h3>
          <p className="text-xs text-slate-400 mt-0.5">Top extracted signal features driving classification decisions.</p>
        </div>
      </div>

      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" horizontal={false} />
            <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} unit="%" />
            <YAxis
              dataKey="feature"
              type="category"
              stroke="#94a3b8"
              tick={{ fontSize: 10 }}
              width={140}
            />
            <Tooltip
              formatter={(value: any) => [`${value}%`, 'Importance Weight']}
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
            />
            <Bar dataKey="importance" fill="#06b6d4" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
