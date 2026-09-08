import React from 'react';

export function BarChart({ data = {}, title, color = 'bg-brand-500' }) {
  const entries = Object.entries(data);
  const maxValue = Math.max(...entries.map(([_, v]) => Number(v) || 0), 1);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      {title && <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">{title}</h4>}
      <div className="space-y-3">
        {entries.map(([key, val]) => {
          const count = Number(val) || 0;
          const percentage = Math.round((count / maxValue) * 100);

          return (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>{key}</span>
                <span>{count}</span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${color}`}
                  style={{ width: `${Math.max(percentage, 4)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DonutBreakdown({ data = {}, title }) {
  const entries = Object.entries(data);
  const total = entries.reduce((acc, [_, v]) => acc + (Number(v) || 0), 0);

  const colors = [
    'bg-emerald-500 text-emerald-600 dark:text-emerald-400',
    'bg-rose-500 text-rose-600 dark:text-rose-400',
    'bg-amber-500 text-amber-600 dark:text-amber-400',
    'bg-blue-500 text-blue-600 dark:text-blue-400'
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      {title && <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">{title}</h4>}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2 flex-1">
          {entries.map(([key, val], idx) => {
            const count = Number(val) || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const col = colors[idx % colors.length];

            return (
              <div key={key} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.split(' ')[0]}`} />
                  <span className="font-medium text-slate-700 dark:text-slate-300">{key}</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {count} <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
