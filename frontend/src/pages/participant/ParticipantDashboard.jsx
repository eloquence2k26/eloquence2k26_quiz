import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  UserCheck,
  XCircle,
  LogOut,
  Calendar,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { quizService } from '../../services/quizService';
import { adminService } from '../../services/adminService';
import QuizCard from '../../components/participant/QuizCard';
import StatsCard from '../../components/common/StatsCard';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { getSocket, joinUserRoom } from '../../services/socket';

export default function ParticipantDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [quizzes, setQuizzes] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [roundStatus, setRoundStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showQualifiedModal, setShowQualifiedModal] = useState(false);
  const [showEliminatedModal, setShowEliminatedModal] = useState(false);

  const fetchData = async (showLoadingState = false) => {
    if (showLoadingState) setLoading(true);
    try {
      const [qRes, aRes, rRes] = await Promise.all([
        quizService.getAllQuizzes(),
        adminService.getAnnouncements(),
        adminService.getParticipantRoundStatus()
      ]);

      const qList = qRes.success ? (qRes.data || []) : [];
      if (qRes.success) setQuizzes(qList);
      if (aRes.success) setAnnouncements(aRes.data || []);
      if (rRes.success) {
        const rData = rRes.data || null;
        setRoundStatus(rData);

        // Check for qualification or elimination triggers
        if (rData) {
          const hasCompletedR1 = Boolean(rData.round_1_attempted && rData.round_1_result);
          const isPublished = Boolean(rData.round_1_published);
          const isSelected = Boolean(rData.round_1_selected);

          // Check if candidate has a Round 1 exam awaiting attempt or retest
          const hasPendingR1 = qList.some(
            (q) => Number(q.round_number) === 1 && q.attempt_status !== 'COMPLETED'
          );

          // ONLY trigger celebration if Round 1 is actually completed, published, and not awaiting a retest
          if (isSelected && isPublished && hasCompletedR1 && !hasPendingR1) {
            const celebrationSeen = sessionStorage.getItem('elq26_r2_celebration_seen');
            if (!celebrationSeen) {
              setShowQualifiedModal(true);
            }
          } else {
            setShowQualifiedModal(false);
          }

          if (hasCompletedR1 && isPublished && !isSelected && !hasPendingR1) {
            // Not selected / Eliminated after publication
            setShowEliminatedModal(true);
          } else {
            setShowEliminatedModal(false);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching participant dashboard data:', err.message);
    } finally {
      if (showLoadingState) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);

    // WebSocket real-time event listener
    const socket = getSocket();
    if (user?.id) {
      joinUserRoom(user.id);
    }

    const handleRealtimeRefresh = (data) => {
      fetchData(false);
    };

    const handleExamRestarted = (data) => {
      fetchData(false);
      toast.success('Your examination access has been reset by administrators! You can now start the test.');
    };

    const handleQuizUpdated = (data) => {
      fetchData(false);
      if (data?.status === 'Live') {
        toast.info('An examination has just gone LIVE!');
      }
    };

    socket.on('REFRESH_DASHBOARD', handleRealtimeRefresh);
    socket.on('EXAM_RESTARTED', handleExamRestarted);
    socket.on('QUIZ_UPDATED', handleQuizUpdated);
    socket.on('ROUND_STATUS_UPDATED', handleRealtimeRefresh);
    socket.on('ANNOUNCEMENT_CREATED', handleRealtimeRefresh);

    // Polling fallback every 8 seconds
    const interval = setInterval(() => {
      fetchData(false);
    }, 8000);

    return () => {
      socket.off('REFRESH_DASHBOARD', handleRealtimeRefresh);
      socket.off('EXAM_RESTARTED', handleExamRestarted);
      socket.off('QUIZ_UPDATED', handleQuizUpdated);
      socket.off('ROUND_STATUS_UPDATED', handleRealtimeRefresh);
      socket.off('ANNOUNCEMENT_CREATED', handleRealtimeRefresh);
      clearInterval(interval);
    };
  }, [user?.id]);

  const handleDismissQualified = () => {
    sessionStorage.setItem('elq26_r2_celebration_seen', 'true');
    setShowQualifiedModal(false);
    navigate('/participant/round-status');
  };

  const handleEliminationLogout = async () => {
    try {
      await adminService.acknowledgeElimination();
    } catch (e) {
      console.warn('Elimination acknowledgment caught:', e.message);
    }
    setShowEliminatedModal(false);
    logout();
    toast.info('Your participation session in Eloquence \'26 has ended. Best wishes!');
    navigate('/login');
  };

  if (loading) return <Loading text="Loading your examination portal..." />;

  const participant = user?.participant || {};
  const activeQuiz = quizzes.find(
    (q) => q.status === 'Live' && !['COMPLETED', 'TERMINATED', 'DISQUALIFIED'].includes(q.attempt_status)
  );
  const completedCount = quizzes.filter(
    (q) => ['COMPLETED', 'TERMINATED', 'DISQUALIFIED'].includes(q.attempt_status)
  ).length;
  const hasPendingR1 = quizzes.some(
    (q) => Number(q.round_number) === 1 && !['COMPLETED', 'TERMINATED', 'DISQUALIFIED'].includes(q.attempt_status)
  );
  const isRound1Selected = Boolean(
    roundStatus?.round_1_selected &&
    roundStatus?.round_1_published &&
    roundStatus?.round_1_attempted &&
    !hasPendingR1
  );

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
            {participant.event && (
              <span className="px-3 py-1 rounded-lg bg-amber-400/20 text-amber-200 font-bold">
                Event: {participant.event}
              </span>
            )}
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none" />
      </div>

      {/* Round 1 / Round 2 Qualification Status Alert */}
      {isRound1Selected ? (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300 animate-bounce" />
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
              Round 2 qualification results are published on the official leaderboard.
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
          subtitle="Enrolled examinations"
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
          value={isRound1Selected ? 'Round 2 Qualified' : 'Round 1 Active'}
          icon={Layers}
          color={isRound1Selected ? 'purple' : 'amber'}
          subtitle={isRound1Selected ? 'Selected for Round 2' : 'Round 1 In-Progress'}
        />
      </div>

      {/* Available & Assigned Quizzes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Your Assigned Examinations
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Only tests assigned to your scholar profile appear here.
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
          <div className="p-10 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-2">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No Examinations Assigned Yet
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              You are not currently enrolled in any scheduled or live quiz. Please contact your symposium coordinator if you believe this is an error.
            </p>
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

      {/* QUALIFIED FOR ROUND 2 POPUP MODAL */}
      <Modal
        isOpen={showQualifiedModal}
        onClose={handleDismissQualified}
        title="Round 2 Qualification Notification"
        maxWidth="max-w-lg"
      >
        <div className="text-center space-y-4 py-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
            <Sparkles className="w-8 h-8 animate-spin-slow" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              🎉 Congratulations, {user?.full_name}!
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              You have officially qualified for <strong>Round 2 (Grand Finals)</strong> of Eloquence '26.
            </p>
          </div>

          {roundStatus?.round_1_result && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs">
              <div className="p-2">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Score</span>
                <span className="text-base font-black text-emerald-700 dark:text-emerald-300">
                  {roundStatus.round_1_result.score} pts
                </span>
              </div>
              <div className="p-2">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Percentage</span>
                <span className="text-base font-black text-brand-600 dark:text-brand-400">
                  {roundStatus.round_1_result.percentage}%
                </span>
              </div>
              <div className="p-2">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Official Rank</span>
                <span className="text-base font-black text-amber-600 dark:text-amber-400">
                  #{roundStatus.round_1_result.rank || 1}
                </span>
              </div>
              <div className="p-2">
                <span className="text-slate-400 block font-semibold text-[10px] uppercase">Time Taken</span>
                <span className="text-base font-black text-slate-800 dark:text-slate-200">
                  {roundStatus.round_1_result.time_taken_formatted || '00:00'}
                </span>
              </div>
            </div>
          )}

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 text-left text-xs space-y-1 text-slate-600 dark:text-slate-400">
            <p className="font-bold text-slate-800 dark:text-slate-200">Round 2 Guidelines:</p>
            <p>• Your Round 2 examination will be accessible during the scheduled window.</p>
            <p>• Ensure compliance with symposium full-screen proctor rules.</p>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleDismissQualified}
              className="flex-1 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 text-center"
            >
              OK • View Round 2 Schedule
            </button>
          </div>
        </div>
      </Modal>

      {/* NOT SELECTED / ELIMINATION MODAL WITH AUTO-LOGOUT */}
      <Modal
        isOpen={showEliminatedModal}
        onClose={handleEliminationLogout}
        title="Symposium Participation Status"
        maxWidth="max-w-md"
      >
        <div className="text-center space-y-4 py-2">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <Award className="w-8 h-8 text-slate-400" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Thank You for Participating!
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              We sincerely appreciate your enthusiastic participation in <strong>Eloquence '26</strong>.
              Based on the official Round 1 evaluation (Marks, Percentage, and Time Taken), you have not been shortlisted for Round 2.
            </p>
          </div>

          {roundStatus?.round_1_result && (
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Final Score</span>
                <strong className="text-slate-900 dark:text-white">{roundStatus.round_1_result.score} pts</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Percentage</span>
                <strong className="text-brand-600">{roundStatus.round_1_result.percentage}%</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Final Rank</span>
                <strong className="text-amber-600">#{roundStatus.round_1_result.rank || 'N/A'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Time Taken</span>
                <strong className="text-slate-700 dark:text-slate-300">{roundStatus.round_1_result.time_taken_formatted || '00:00'}</strong>
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-400 italic">
            Best wishes for your future academic and technical endeavors! Click OK to end your session.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleEliminationLogout}
              className="w-full py-3 rounded-2xl text-xs font-bold text-white bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 shadow-md transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>OK (Log Out & Close Session)</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
