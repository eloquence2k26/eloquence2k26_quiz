import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, Monitor, Eye, Copy, ArrowLeft, ArrowRight, CheckSquare, Sparkles } from 'lucide-react';
import { quizService } from '../../services/quizService';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useToast } from '../../context/ToastContext';
import Loading from '../../components/common/Loading';

export default function ExamInstructionsPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { enterFullscreen } = useFullscreen();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await quizService.getQuizById(quizId);
        if (res.success && res.data) {
          setQuiz(res.data);
        }
      } catch (err) {
        toast.error('Failed to load quiz details');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId, toast]);

  const handleEnterExam = async () => {
    if (!agreed) {
      toast.warning('Please confirm that you agree to the examination rules');
      return;
    }

    setStarting(true);
    // Request Fullscreen
    if (quiz?.fullscreen_required !== false) {
      await enterFullscreen();
    }

    navigate(`/exam/arena/${quizId}`);
  };

  if (loading) return <Loading fullScreen text="Loading exam parameters..." />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-8">
      <div className="max-w-3xl w-full mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-indigo-600 px-6 sm:px-10 py-6 text-white">
          <div className="flex items-center gap-2 text-brand-200 text-xs font-bold uppercase tracking-widest mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Eloquence '26 • Round {quiz?.round_number || 1} Examination</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black">{quiz?.title}</h1>
          <p className="text-xs text-brand-100 mt-1">
            Duration: {quiz?.duration_minutes} Minutes • Total Questions: {quiz?.total_questions} • Pass Mark: {quiz?.pass_percentage}%
          </p>
        </div>

        {/* Instructions Body */}
        <div className="p-6 sm:p-10 space-y-6">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
              <strong>MANDATORY PROCTORING PROTOCOL:</strong> This online examination is monitored by real-time automated security heuristics. Exiting fullscreen mode, switching browser tabs, opening dev tools, or attempting clipboard operations will log violations and will terminate your test.
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Rules & Guidelines
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <Monitor className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
                <span>Fullscreen mode is strictly required throughout the exam.</span>
              </li>
              <li className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <Eye className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
                <span>Do not switch tabs, minimize windows, or lose window focus.</span>
              </li>
              <li className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <Copy className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
                <span>Copying text, right-clicking, and pasting answers are blocked.</span>
              </li>
              <li className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <ShieldCheck className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
                <span>{quiz?.max_violations || 3} security warnings will cause instant termination.</span>
              </li>
            </ul>
          </div>

          {/* Agreement Checkbox */}
          <label className="flex items-start gap-3 p-4 rounded-2xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-brand-300 text-brand-600 focus:ring-brand-500"
            />
            <div className="text-xs text-slate-800 dark:text-slate-200">
              <strong className="block font-bold">I agree to the examination rules.</strong>
              <span>
                I understand that my activity is monitored and that any attempt to violate proctoring rules will result in automatic test termination.
              </span>
            </div>
          </label>

          {/* Entry Window Status Alerts */}
          {quiz?.entry_window_status?.isEntryClosed ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed font-medium">
                <strong>ENTRY PERIOD CLOSED:</strong> The 5-minute initial admission period for this examination has ended. You cannot enter this test arena unless a symposium administrator explicitly unlocks late entry for you.
              </div>
            </div>
          ) : quiz?.entry_window_status?.isEntryOpen ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span><strong>5-Minute Entry Window Active:</strong> Please enter the arena before the period concludes.</span>
              </div>
              {quiz.entry_window_status.remainingEntrySeconds > 0 && (
                <span className="font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-lg">
                  {Math.ceil(quiz.entry_window_status.remainingEntrySeconds / 60)}m left
                </span>
              )}
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            <Link
              to="/participant/dashboard"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>

            <button
              onClick={handleEnterExam}
              disabled={!agreed || starting || quiz?.entry_window_status?.isEntryClosed}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/25 transition-all uppercase tracking-wider"
            >
              <span>
                {quiz?.entry_window_status?.isEntryClosed
                  ? 'Entry Closed'
                  : starting
                  ? 'Entering Secure Arena...'
                  : 'Enter Secure Exam'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
