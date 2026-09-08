import React from 'react';
import { ShieldAlert, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { formatSecondsToTime } from '../../utils/formatters';

export default function ExamHeader({
  quizTitle,
  roundNumber,
  remainingSeconds,
  violationCount,
  maxViolations = 3,
  onSubmitClick
}) {
  const isUrgent = remainingSeconds <= 300; // less than 5 mins

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-sm">
      {/* Quiz Details */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-900">
            Round {roundNumber}
          </span>
          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate max-w-md">
            {quizTitle}
          </h1>
        </div>
        <p className="text-xs text-slate-400 font-medium">Department of CSE • Official Examination Arena</p>
      </div>

      {/* Proctoring Status & Timer & Submit Button */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Security Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 hidden sm:block">
            Proctor Active
          </div>
          {violationCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              {violationCount}/{maxViolations} Warnings
            </span>
          )}
        </div>

        {/* Server Countdown Timer */}
        <div
          className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border font-mono text-sm sm:text-base font-bold transition-colors ${
            isUrgent
              ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-300 animate-pulse'
              : 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/80 dark:border-blue-800 dark:text-blue-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{formatSecondsToTime(remainingSeconds)}</span>
        </div>

        {/* Finish & Submit Button */}
        <button
          type="button"
          onClick={onSubmitClick}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-md shadow-emerald-500/20 transition-all"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Submit Exam</span>
        </button>
      </div>
    </header>
  );
}
