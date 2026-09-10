import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, AlertOctagon, LogOut, ArrowRight, Lock, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ExamTerminatedPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const reason = sessionStorage.getItem('termination_reason') || 'Security violation detected by automated proctor';

  const handleExit = () => {
    sessionStorage.removeItem('termination_reason');
    sessionStorage.removeItem('termination_result');
    navigate('/participant/dashboard');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-8">
      <div className="max-w-lg w-full mx-auto bg-white dark:bg-slate-900 border-2 border-rose-400 dark:border-rose-900 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-xl shadow-rose-500/20 ring-8 ring-rose-500/10">
          <ShieldAlert className="w-12 h-12 animate-pulse" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[11px] font-black uppercase tracking-widest mb-2 border border-rose-200 dark:border-rose-800">
            <Lock className="w-3.5 h-3.5" />
            <span>Automated AI Proctor Security Action</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            EXAM TERMINATED
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Your examination was instantly locked and auto-submitted due to a detected proctoring violation under the zero-tolerance security protocol.
          </p>
        </div>

        {/* Reason Box */}
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900 text-left text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-rose-900 dark:text-rose-200 font-bold">
            <EyeOff className="w-4 h-4 text-rose-600" />
            <span>Detected Violation:</span>
          </div>
          <p className="text-rose-800 dark:text-rose-300 font-medium pl-6 leading-relaxed">
            {reason}
          </p>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-2 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p>Answers saved up to the moment of violation were securely recorded.</p>
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            Re-attempts are locked. All violation telemetry has been transmitted to symposium administrators.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleExit}
            className="w-full py-3.5 rounded-2xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-brand-600 dark:hover:bg-brand-700 transition-all uppercase tracking-wider flex items-center justify-center gap-2 shadow-md"
          >
            <span>Return to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 rounded-2xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </div>
    </div>
  );
}
