import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, AlertOctagon, LogOut, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ExamTerminatedPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const reason = sessionStorage.getItem('termination_reason') || 'Repeated fullscreen exit / tab switching / proctoring violations';

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
      <div className="max-w-md w-full mx-auto bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-900/80 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
          <AlertOctagon className="w-10 h-10 animate-pulse" />
        </div>

        <div>
          <span className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-widest">
            Automated Proctor Action
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            EXAM TERMINATED
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Your examination has been terminated because security violations exceeded the allowed threshold.
          </p>
        </div>

        {/* Reason Box */}
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-left text-xs space-y-1">
          <p className="font-bold text-rose-900 dark:text-rose-200">Violation Reason:</p>
          <p className="text-rose-700 dark:text-rose-300 font-medium">{reason}</p>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
          <p>Your attempt has been submitted automatically with partial answers saved.</p>
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            You cannot restart this examination. Contact the event administrator if you believe this was an error.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleExit}
            className="w-full py-3 rounded-2xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <span>Exit to Dashboard</span>
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
