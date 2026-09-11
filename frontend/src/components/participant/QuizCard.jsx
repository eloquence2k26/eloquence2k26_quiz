import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
  Award,
  Lock,
  AlertCircle,
  Timer,
  CheckCircle2,
  XCircle,
  Sparkles,
  Zap
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import Badge from '../common/Badge';

export default function QuizCard({ quiz, participant }) {
  const navigate = useNavigate();

  const isRound2 = Number(quiz.round_number) === 2;
  const isEligibleForRound2 = Boolean(participant?.round_1_selected);
  const isLockedForRound2 = isRound2 && !isEligibleForRound2;

  const isCompleted = quiz.attempt_status === 'COMPLETED';
  const isTerminated = quiz.attempt_status === 'TERMINATED' || quiz.attempt_status === 'DISQUALIFIED';
  const isInProgress = quiz.attempt_status === 'IN_PROGRESS';

  // Entry window and schedule metrics
  const entryStatus = quiz.entry_window_status;

  // Live countdown state
  const [secondsUntilStart, setSecondsUntilStart] = useState(
    entryStatus?.secondsUntilStart || 0
  );
  const [secondsUntilEnd, setSecondsUntilEnd] = useState(
    entryStatus?.secondsUntilEnd || 0
  );

  useEffect(() => {
    if (!quiz.start_date || !quiz.start_time) return;

    const startDateTime = new Date(`${quiz.start_date}T${quiz.start_time}`).getTime();
    const endDateTime = quiz.end_date && quiz.end_time ? new Date(`${quiz.end_date}T${quiz.end_time}`).getTime() : null;

    const calculateTimes = () => {
      const now = Date.now();
      const diffStart = Math.max(0, Math.floor((startDateTime - now) / 1000));
      setSecondsUntilStart(diffStart);

      if (endDateTime) {
        const diffEnd = Math.max(0, Math.floor((endDateTime - now) / 1000));
        setSecondsUntilEnd(diffEnd);
      }
    };

    calculateTimes();
    const timer = setInterval(calculateTimes, 1000);
    return () => clearInterval(timer);
  }, [quiz.start_date, quiz.start_time, quiz.end_date, quiz.end_time]);

  // Format seconds into readable string (e.g. 02h : 15m : 42s or 14m : 30s)
  const formatCountdown = (totalSeconds) => {
    if (totalSeconds <= 0) return '00s';
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}h : ${String(minutes).padStart(2, '0')}m : ${String(seconds).padStart(2, '0')}s`;
    }
    return `${String(minutes).padStart(2, '0')}m : ${String(seconds).padStart(2, '0')}s`;
  };

  const isBeforeStart = secondsUntilStart > 0;
  const isAfterEnd = Boolean(entryStatus?.isAfterEnd) || (quiz.end_date && quiz.end_time && secondsUntilEnd === 0 && !isBeforeStart);
  const isLive = !isBeforeStart && !isAfterEnd && (quiz.status === 'Live' || entryStatus?.isEntryOpen);
  const isEntryClosed = Boolean(entryStatus?.isEntryClosed) && !isInProgress && !isCompleted && !isTerminated && !isBeforeStart;

  const handleAction = () => {
    if (isCompleted || isTerminated) {
      if (quiz.attempt_id) {
        navigate(`/participant/results?attemptId=${quiz.attempt_id}`);
      } else {
        navigate('/participant/results');
      }
      return;
    }

    if (isEntryClosed) {
      return;
    }

    if (isLive || quiz.status === 'Live' || quiz.status === 'Published') {
      navigate(`/exam/instructions/${quiz.id}`);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden">
      <div>
        {/* Top Header with Round and Dynamic Status Badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <Badge variant={isRound2 ? 'purple' : 'primary'} size="sm">
            Round {quiz.round_number || 1}
          </Badge>

          <div className="flex items-center gap-1.5 flex-wrap">
            {isCompleted && (
              <Badge variant="success" size="sm">
                COMPLETED
              </Badge>
            )}
            {isTerminated && (
              <Badge variant="danger" size="sm">
                TERMINATED
              </Badge>
            )}
            {!isCompleted && !isTerminated && isAfterEnd && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>EXAM FINISHED</span>
              </span>
            )}
            {!isCompleted && !isTerminated && !isAfterEnd && isLive && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow-md shadow-emerald-500/20 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>LIVE NOW</span>
              </span>
            )}
            {!isCompleted && !isTerminated && isBeforeStart && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>SCHEDULED</span>
              </span>
            )}
            {isEntryClosed && !isCompleted && !isTerminated && (
              <Badge variant="danger" size="sm">
                Entry Closed
              </Badge>
            )}
          </div>
        </div>

        {/* Quiz Title & Description */}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
          {quiz.title}
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
          {quiz.description || `${quiz.event_name || 'Symposium'} Examination`}
        </p>

        {/* Dynamic Countdown / Time Remaining Banner */}
        {isBeforeStart && !isCompleted && (
          <div className="mt-4 p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold">
              <Timer className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin-slow" />
              <span>Starts In:</span>
            </div>
            <span className="font-mono font-black text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
              {formatCountdown(secondsUntilStart)}
            </span>
          </div>
        )}

        {isLive && !isCompleted && !isTerminated && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
              <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Active Window Open</span>
            </div>
            {secondsUntilEnd > 0 && (
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                Closes in {formatCountdown(secondsUntilEnd)}
              </span>
            )}
          </div>
        )}

        {isAfterEnd && !isCompleted && !isTerminated && (
          <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Schedule window concluded on {formatDate(quiz.end_date || quiz.start_date)}</span>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mt-4 py-3 border-y border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Clock className="w-4 h-4 text-brand-500 flex-shrink-0" />
            <span>{quiz.duration_minutes} Minutes</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <HelpCircle className="w-4 h-4 text-brand-500 flex-shrink-0" />
            <span>{quiz.total_questions || 0} Questions</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Calendar className="w-4 h-4 text-brand-500 flex-shrink-0" />
            <span>{formatDate(quiz.start_date)} ({quiz.start_time || '09:00'})</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>{quiz.negative_marking ? `-${quiz.negative_mark_value} Neg.` : 'No Neg. Marks'}</span>
          </div>
        </div>

        {/* Result summary banner if finished */}
        {quiz.result_summary && (
          <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Your Score:</span>
            <span className="font-extrabold text-slate-900 dark:text-white">
              {quiz.result_summary.score} pts ({quiz.result_summary.percentage}%) • Rank #{quiz.result_summary.rank || 1}
            </span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="mt-6 pt-2">
        {isLockedForRound2 ? (
          <button
            disabled
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>Not Selected for Round 2</span>
          </button>
        ) : isCompleted || isTerminated ? (
          <button
            onClick={handleAction}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>View Result</span>
          </button>
        ) : isInProgress ? (
          <button
            onClick={handleAction}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 animate-pulse"
          >
            <span>Resume Active Exam</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : isAfterEnd ? (
          <button
            disabled
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" />
            <span>Examination Concluded</span>
          </button>
        ) : isBeforeStart ? (
          <button
            disabled
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Timer className="w-4 h-4 text-amber-500 animate-spin-slow" />
            <span>Waiting for Exam (Starts in {formatCountdown(secondsUntilStart)})</span>
          </button>
        ) : isEntryClosed ? (
          <div className="space-y-1 text-center">
            <button
              disabled
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4 text-rose-500" />
              <span>Entry Closed (Window Ended)</span>
            </button>
            <p className="text-[10px] text-slate-400">
              Entry period passed. Contact coordinator for late access.
            </p>
          </div>
        ) : isLive || quiz.status === 'Live' || quiz.status === 'Published' ? (
          <button
            onClick={handleAction}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" />
            <span>Start Exam Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            disabled
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" />
            <span>Scheduled Exam</span>
          </button>
        )}
      </div>
    </div>
  );
}
