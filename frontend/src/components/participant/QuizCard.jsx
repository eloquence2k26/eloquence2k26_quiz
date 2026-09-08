import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, HelpCircle, ShieldCheck, ArrowRight, Award, Lock, AlertCircle } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import Badge from '../common/Badge';

export default function QuizCard({ quiz, participant }) {
  const navigate = useNavigate();

  const isRound2 = quiz.round_number === 2;
  const isEligibleForRound2 = Boolean(participant?.round_1_selected);
  const isLockedForRound2 = isRound2 && !isEligibleForRound2;

  const isCompleted = quiz.attempt_status === 'COMPLETED';
  const isTerminated = quiz.attempt_status === 'TERMINATED' || quiz.attempt_status === 'DISQUALIFIED';
  const isInProgress = quiz.attempt_status === 'IN_PROGRESS';

  const handleAction = () => {
    if (isCompleted || isTerminated) {
      if (quiz.attempt_id) {
        navigate(`/participant/results?attemptId=${quiz.attempt_id}`);
      } else {
        navigate('/participant/results');
      }
      return;
    }

    if (quiz.status === 'Live' || quiz.status === 'Published') {
      navigate(`/exam/instructions/${quiz.id}`);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* Top Header with Round and Status Badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <Badge variant={isRound2 ? 'purple' : 'primary'} size="sm">
            Round {quiz.round_number}
          </Badge>
          {quiz.status === 'Live' && !isCompleted && !isTerminated && (
            <Badge variant="live" size="sm">
              LIVE NOW
            </Badge>
          )}
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
          {quiz.status === 'Scheduled' && !isCompleted && (
            <Badge variant="warning" size="sm">
              UPCOMING
            </Badge>
          )}
        </div>

        {/* Quiz Title & Description */}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
          {quiz.title}
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
          {quiz.description || 'Official Symposium Examination'}
        </p>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mt-5 py-3 border-y border-slate-100 dark:border-slate-800/80 text-xs">
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
            <span>{formatDate(quiz.start_date)}</span>
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
        ) : quiz.status === 'Live' || quiz.status === 'Published' ? (
          <button
            onClick={handleAction}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-2"
          >
            <span>Start Exam</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            disabled
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" />
            <span>Waiting for Exam</span>
          </button>
        )}
      </div>
    </div>
  );
}
