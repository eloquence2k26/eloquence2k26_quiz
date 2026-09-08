import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Award, ArrowRight, LayoutDashboard, Sparkles, Layers } from 'lucide-react';
import { examService } from '../../services/examService';
import { adminService } from '../../services/adminService';
import Loading from '../../components/common/Loading';

export default function ExamSubmittedPage() {
  const { attemptId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [roundStatus, setRoundStatus] = useState(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        if (attemptId) {
          const res = await examService.getAttemptResult(attemptId);
          if (res.success) {
            setData(res.data);
          }
        }
        // Also check round qualification status
        const statusRes = await adminService.getParticipantRoundStatus();
        if (statusRes.success) {
          setRoundStatus(statusRes.data);
        }
      } catch (err) {
        console.warn('Error fetching submission result:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [attemptId]);

  if (loading) return <Loading fullScreen text="Finalizing examination results..." />;

  const result = data?.result;
  const isSelectedForRound2 = Boolean(roundStatus?.round_1_selected);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-8">
      <div className="max-w-2xl w-full mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
            Submission Confirmed
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            Exam Completed Successfully!
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Your responses have been securely submitted and graded on the server.
          </p>
        </div>

        {/* Score Breakdown Card */}
        {result && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Final Score</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{result.final_score} pts</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Percentage</p>
              <p className="text-xl font-black text-brand-600 dark:text-brand-400">{result.percentage}%</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Correct</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{result.correct_answers}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Leaderboard Rank</p>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400">#{result.rank || 1}</p>
            </div>
          </div>
        )}

        {/* Round 2 Qualification Banner if Round 1 selected */}
        {isSelectedForRound2 && (
          <div className="p-6 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white text-left space-y-2 shadow-lg shadow-brand-500/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <h4 className="text-sm font-black uppercase tracking-wide">🎉 Congratulations! You are Selected for Round 2</h4>
            </div>
            <p className="text-xs text-brand-100">
              You have officially qualified for the Grand Finals. Check your participant dashboard when the scheduled Round 2 session begins.
            </p>
          </div>
        )}

        {/* Navigation Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Link
            to="/participant/dashboard"
            className="w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>

          <Link
            to="/participant/results"
            className="w-full sm:w-auto px-6 py-3 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>View Detailed Results</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
