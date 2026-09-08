import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading({ text = 'Loading...', fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600 dark:text-brand-400" />
        <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">{text}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-3">
      <Loader2 className="w-8 h-8 animate-spin text-brand-600 dark:text-brand-400" />
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}
