import React from 'react';

export default function Badge({ children, variant = 'default', size = 'md', className = '' }) {
  const variantMap = {
    default: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    primary: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    danger: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    live: 'bg-emerald-500 text-white border-emerald-600 animate-pulse'
  };

  const sizeMap = {
    sm: 'text-[10px] px-2 py-0.5 rounded-md font-semibold tracking-wide uppercase',
    md: 'text-xs px-2.5 py-1 rounded-lg font-medium',
    lg: 'text-sm px-3 py-1.5 rounded-xl font-medium'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 border leading-none ${variantMap[variant] || variantMap.default} ${
        sizeMap[size] || sizeMap.md
      } ${className}`}
    >
      {children}
    </span>
  );
}
