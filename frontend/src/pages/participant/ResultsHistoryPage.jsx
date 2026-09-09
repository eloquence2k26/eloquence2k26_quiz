import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Award, CheckCircle2, XCircle, Clock, BookOpen, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { quizService } from '../../services/quizService';
import { examService } from '../../services/examService';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';

export default function ResultsHistoryPage() {
  const [searchParams] = useSearchParams();
  const requestedAttemptId = searchParams.get('attemptId');

  const [quizzes, setQuizzes] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await quizService.getAllQuizzes();
        if (res.success && res.data) {
          const completed = res.data.filter((q) => q.attempt_status === 'COMPLETED' || q.attempt_status === 'TERMINATED' || q.attempt_id);
          setQuizzes(completed);

          const targetAttempt = requestedAttemptId || (completed.length > 0 ? completed[0].attempt_id : null);
          if (targetAttempt) {
            loadAttemptDetails(targetAttempt);
          }
        }
      } catch (err) {
        console.error('Error fetching results history:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [requestedAttemptId]);

  const [unreleasedMsg, setUnreleasedMsg] = useState('');

  const loadAttemptDetails = async (attemptId) => {
    if (!attemptId) return;
    setDetailsLoading(true);
    setUnreleasedMsg('');
    try {
      const res = await examService.getAttemptResult(attemptId);
      if (res.success) {
        setSelectedResult(res.data);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setUnreleasedMsg(msg || 'Results for this examination have not been published yet.');
      setSelectedResult(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  if (loading) return <Loading text="Loading scorecards..." />;

  const result = selectedResult?.result;
  const breakdown = selectedResult?.breakdown || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          Examination Results & Leaderboard
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Official performance scores, rank cards, and verified server-side grading
        </p>
      </div>

      {quizzes.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-xs text-slate-400">
          No completed examinations available in your history. Complete an exam to view results.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Attempt selector tabs */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Completed Exams ({quizzes.length})
            </h3>
            <div className="space-y-2">
              {quizzes.map((q) => {
                const isSelected = selectedResult?.result?.attempt_id === q.attempt_id;
                return (
                  <div
                    key={q.id}
                    onClick={() => loadAttemptDetails(q.attempt_id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-950/70 border-brand-500 dark:border-brand-600 ring-2 ring-brand-500/20 shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Round {q.round_number}
                      </span>
                      <Badge variant={q.attempt_status === 'COMPLETED' ? 'success' : 'danger'} size="sm">
                        {q.attempt_status}
                      </Badge>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-2 truncate">
                      {q.title}
                    </h4>
                    {q.result_summary && (
                      <p className="text-[11px] text-brand-600 dark:text-brand-400 font-extrabold mt-1">
                        Score: {q.result_summary.score} pts • #{q.result_summary.rank || 1} Rank
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Scorecard details */}
          <div className="lg:col-span-8 space-y-6">
            {detailsLoading ? (
              <Loading text="Loading scorecard..." />
            ) : unreleasedMsg ? (
              <div className="p-8 sm:p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Results Awaiting Symposium Desk Publication
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {unreleasedMsg}
                </p>
              </div>
            ) : result ? (
              <div className="space-y-6">
                {/* Scorecard Hero Banner */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-900">
                        Official Scorecard
                      </span>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-2">
                        {selectedResult?.quiz?.title}
                      </h2>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-xs font-semibold text-slate-400 block">Overall Rank</span>
                      <span className="text-2xl font-black text-amber-500">#{result.rank || 1}</span>
                    </div>
                  </div>

                  {/* 4 KPI Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Final Score</span>
                      <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{result.final_score} pts</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Percentage</span>
                      <p className="text-xl font-black text-brand-600 dark:text-brand-400 mt-0.5">{result.percentage}%</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Correct / Total</span>
                      <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {result.correct_answers} / {result.total_questions}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Time Taken</span>
                      <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                        {Math.floor(result.time_taken_seconds / 60)}m {result.time_taken_seconds % 60}s
                      </p>
                    </div>
                  </div>
                </div>

                {/* Question-by-Question Breakdown (if enabled) */}
                {breakdown.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Question Performance Review ({breakdown.length} Questions)
                    </h3>

                    <div className="space-y-3">
                      {breakdown.map((item) => (
                        <div
                          key={item.index}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              Q{item.index}. {item.question_text}
                            </span>
                            <Badge variant={item.is_correct ? 'success' : 'danger'} size="sm">
                              {item.is_correct ? 'CORRECT' : 'INCORRECT'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 text-slate-600 dark:text-slate-400">
                            <div>
                              <span>Your Answer: </span>
                              <strong className={item.is_correct ? 'text-emerald-600' : 'text-rose-600'}>
                                Option {item.selected_option || 'None (Left Blank)'}
                              </strong>
                            </div>
                            <div>
                              <span>Correct Answer: </span>
                              <strong className="text-emerald-600 dark:text-emerald-400">
                                Option {item.correct_answer}
                              </strong>
                            </div>
                          </div>

                          {item.explanation && (
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-600 dark:text-slate-300">
                              <strong>Explanation:</strong> {item.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
