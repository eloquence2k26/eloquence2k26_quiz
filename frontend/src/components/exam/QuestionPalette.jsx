import React from 'react';

export default function QuestionPalette({
  questions = [],
  currentIndex,
  onSelectQuestion
}) {
  const answeredCount = questions.filter((q) => q.selected_option).length;
  const reviewCount = questions.filter((q) => q.is_marked_for_review).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
        Question Navigator
      </h3>

      {/* Stats Legend */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-medium border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-emerald-500 text-white flex items-center justify-center text-[8px] font-bold" />
          <span className="text-slate-600 dark:text-slate-400">Answered ({answeredCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-slate-200 dark:bg-slate-700" />
          <span className="text-slate-600 dark:text-slate-400">Not Answered ({unansweredCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md bg-amber-500" />
          <span className="text-slate-600 dark:text-slate-400">Review ({reviewCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-md border-2 border-brand-500 bg-brand-50 dark:bg-brand-950" />
          <span className="text-slate-600 dark:text-slate-400">Current</span>
        </div>
      </div>

      {/* Grid of Question Buttons */}
      <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentIndex;
          const isAnswered = Boolean(q.selected_option);
          const isReview = Boolean(q.is_marked_for_review);

          let colorClass = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200';

          if (isAnswered) {
            colorClass = 'bg-emerald-500 text-white border-emerald-600 font-bold shadow-sm';
          }
          if (isReview) {
            colorClass = isAnswered
              ? 'bg-gradient-to-tr from-emerald-500 to-amber-500 text-white border-amber-600 font-bold ring-2 ring-amber-400'
              : 'bg-amber-500 text-white border-amber-600 font-bold shadow-sm';
          }
          if (isCurrent) {
            colorClass += ' ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-900';
          }

          return (
            <button
              key={q.id}
              onClick={() => onSelectQuestion(idx)}
              type="button"
              className={`h-9 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all ${colorClass}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
