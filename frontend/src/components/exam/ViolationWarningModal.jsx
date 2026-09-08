import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import Modal from '../common/Modal';

export default function ViolationWarningModal({
  isOpen,
  onClose,
  warningNumber = 1,
  maxViolations = 3,
  violationType,
  description
}) {
  const isFinalWarning = warningNumber === maxViolations - 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showClose={false} maxWidth="max-w-md">
      <div className="text-center p-2 space-y-4">
        <div className="inline-flex p-3 rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400">
          <AlertTriangle className="w-8 h-8 animate-bounce" />
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Security Violation Warning
          </h3>
          <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            {isFinalWarning ? 'FINAL WARNING BEFORE TERMINATION' : `Warning ${warningNumber} of ${maxViolations}`}
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl text-left border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            Detected Event: <span className="font-mono text-brand-600 dark:text-brand-400">{violationType || 'ANOMALY'}</span>
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            {description || 'You performed an action that breaks proctoring rules (such as exiting fullscreen, switching tabs, or using prohibited shortcut keys).'}
          </p>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          If you reach <strong className="text-slate-900 dark:text-white">{maxViolations} warnings</strong>, your examination attempt will be instantly locked and auto-submitted with a <strong className="text-rose-600 dark:text-rose-400">TERMINATED</strong> status.
        </p>

        <button
          onClick={onClose}
          type="button"
          className="w-full py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 shadow-md shadow-amber-500/20 transition-all uppercase tracking-wider"
        >
          I Understand • Return to Exam
        </button>
      </div>
    </Modal>
  );
}
