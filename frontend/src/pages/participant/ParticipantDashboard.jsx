import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  BookOpen,
  Award,
  Bell,
  Clock,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Layers,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { quizService } from '../../services/quizService';
import { adminService } from '../../services/adminService';
import QuizCard from '../../components/participant/QuizCard';
import StatsCard from '../../components/common/StatsCard';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';

export default function ParticipantDashboard() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [roundStatus, setRoundStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [qRes, aRes, rRes] = await Promise.all([
          quizService.getAllQuizzes(),
          adminService.getAnnouncements(),
          adminService.getParticipantRoundStatus()
        ]);

        if (qRes.success) setQuizzes(qRes.data || []);
        if (aRes.success) setAnnouncements(aRes.data || []);
        if (rRes.success) setRoundStatus(rRes.data || null);
      } catch (err) {
        console.error('Error fetching participant dashboard data:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <Loading text="Loading your examination portal..." />;

  const participant = user?.participant || {};
  const activeQuiz = quizzes.find((q) => q.status === 'Live' && q.attempt_status !== 'COMPLETED');
  const completedCount = quizzes.filter((q) => q.attempt_status === 'COMPLETED').length;
  const isRound1Selected = Boolean(roundStatus?.round_1_selected);

  return (
    <div className="space-y-8">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 via-brand-600 to-indigo-700 p-6 sm:p-10 text-white shadow-xl shadow-brand-500/10">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold uppercase tracking-wider text-brand-100">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Eloquence '26 Symposium Scholar</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            Welcome, {user?.full_name || 'Participant'}!
          </h1>
          <p className="text-xs sm:text-sm text-brand-100 leading-relaxed">
            {participant.college || 'Engineering Institute'} • {participant.department || 'CSE'} ({participant.year || '3rd Year'})
          </p>
          <div className="pt-2 flex flex-wrap gap-2 text-xs">
            <span className="px-3 py-1 rounded-lg bg-black/20 font-mono font-bold">
              ID: {participant.participant_id || 'ELQ-2026'}
            </span>
            <span className="px-3 py-1 rounded-lg bg-black/20 font-medium">
              Reg: {participant.registration_number || 'REG-CS-8901'}
            </span>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none" />
      </div>

      {/* Round 1 / Round 2 Qualification Status Alert */}
      {isRound1Selected ? (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <h3 className="text-base font-black uppercase tracking-wide">
                🎉 Congratulations! You have Qualified for Round 2
              </h3>
            </div>
            <p className="text-xs text-emerald-100">
              You are among the top qualifiers. Round 2 (Grand Finals) will unlock according to the official schedule.
            </p>
          </div>
          <Link
            to="/participant/round-status"
            className="px-5 py-2.5 rounded-xl bg-white text-emerald-800 text-xs font-extrabold hover:bg-emerald-50 shadow-sm transition-all whitespace-nowrap"
          >
            View Round 2 Schedule
          </Link>
        </div>
      ) : roundStatus?.round_1_result ? (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Round 1 Score: <span className="text-brand-600 dark:text-brand-400 font-extrabold">{roundStatus.round_1_result.score} pts</span> (Rank #{roundStatus.round_1_result.rank || 1})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Round 2 qualification results are pending administrative review or published on the leaderboard.
            </p>
          </div>
          <Link
            to="/participant/results"
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold"
          >
            View Leaderboard
          </Link>
        </div>
      ) : null}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Assigned Quizzes"
          value={quizzes.length}
          icon={BookOpen}
          color="blue"
          subtitle="Round 1 & Round 2 exams"
        />
        <StatsCard
          title="Completed Exams"
          value={completedCount}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Submitted and graded"
        />
        <StatsCard
          title="Round Qualification"
          value={isRound1Selected ? 'Round 2 Selected' : 'Round 1 Active'}
          icon={Layers}
          color={isRound1Selected ? 'purple' : 'amber'}
          subtitle={isRound1Selected ? 'Selected for Round 2' : 'Round 1 Active'}
        />
      </div>

      {/* Available & Active Quizzes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Your Examinations
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Launch scheduled tests and access live exam arenas
            </p>
          </div>
          <Link
            to="/participant/quizzes"
            className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {quizzes.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-xs text-slate-400">
            No examinations currently assigned to your profile.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((q) => (
              <QuizCard key={q.id} quiz={q} participant={participant} />
            ))}
          </div>
        )}
      </div>

      {/* Live Announcements Feed */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Symposium Announcements
          </h2>
        </div>

        <div className="space-y-3">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4"
            >
              <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{ann.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{ann.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
