import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Award, Clock, Calendar, HelpCircle, Lock, ArrowRight, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { getSocket } from '../../services/socket';
import { formatDate } from '../../utils/formatters';
import Loading from '../../components/common/Loading';

export default function RoundStatusPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await adminService.getParticipantRoundStatus();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error fetching round status:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    const socket = getSocket();
    const handleUpdate = (payload) => {
      console.log('[WebSocket RoundStatus] Real-time update:', payload);
      fetchStatus();
    };

    socket.on('ROUND_STATUS_UPDATED', handleUpdate);
    socket.on('RESULTS_UPDATED', handleUpdate);
    socket.on('LEADERBOARD_UPDATED', handleUpdate);
    socket.on('REFRESH_DASHBOARD', handleUpdate);

    return () => {
      socket.off('ROUND_STATUS_UPDATED', handleUpdate);
      socket.off('RESULTS_UPDATED', handleUpdate);
      socket.off('LEADERBOARD_UPDATED', handleUpdate);
      socket.off('REFRESH_DASHBOARD', handleUpdate);
    };
  }, []);

  if (loading) return <Loading text="Checking qualification records..." />;

  const isSelected = Boolean(data?.round_1_selected);
  const r1Result = data?.round_1_result;
  const r2Quiz = data?.round_2_quiz;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          Symposium Round Qualification
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Official progression tracking from Round 1 to Round 2
        </p>
      </div>

      {isSelected ? (
        /* QUALIFIED VIEW */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl space-y-6">
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 p-8 sm:p-10 text-white text-center space-y-3">
            <div className="inline-flex p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
              <Sparkles className="w-8 h-8 text-amber-300" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
              🎉 Congratulations!
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-xl mx-auto">
              You have demonstrated exceptional technical mastery in Round 1 and have been officially selected for <strong>Round 2</strong>.
            </p>
          </div>

          <div className="p-6 sm:p-10 space-y-6">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Round 2 Examination Schedule
            </h3>

            {r2Quiz ? (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">{r2Quiz.title}</h4>
                    <p className="text-xs text-slate-500">Department of Computer Science & Engineering</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 self-start sm:self-center">
                    {r2Quiz.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">Date</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(r2Quiz.start_date)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Window Time</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{r2Quiz.start_time} - {r2Quiz.end_time}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Duration</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{r2Quiz.duration_minutes} Minutes</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Questions</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{r2Quiz.total_questions || 30} MCQs</span>
                  </div>
                </div>

                <div className="pt-2">
                  {r2Quiz.status === 'Live' ? (
                    <Link
                      to={`/exam/instructions/${r2Quiz.id}`}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/25 transition-all uppercase tracking-wider"
                    >
                      <span>Start Round 2 Exam</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 cursor-not-allowed"
                    >
                      Round 2 Opens at Scheduled Time
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Round 2 schedule details will appear here shortly.</p>
            )}
          </div>
        </div>
      ) : (
        /* NOT SELECTED / IN REVIEW VIEW */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center mx-auto">
            <XCircle className="w-10 h-10 text-slate-400" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Thank You for Participating
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              We appreciate your active participation in Eloquence '26. You have not been selected for the next round based on the Round 1 cutoff ranks.
            </p>
          </div>

          {r1Result && (
            <div className="max-w-md mx-auto grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">Your Round 1 Score</span>
                <span className="text-lg font-black text-slate-900 dark:text-white">{r1Result.score} pts</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Final Rank</span>
                <span className="text-lg font-black text-brand-600 dark:text-brand-400">#{r1Result.rank || 'N/A'}</span>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-400">
            You cannot access Round 2 examinations. Certificates will be processed by the organizing committee.
          </p>

          <div className="pt-2">
            <Link
              to="/participant/results"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
            >
              <span>View Leaderboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
