import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  BookOpen,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Award,
  Filter,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Sparkles,
  HelpCircle,
  Calendar,
  Layers,
  FolderKanban,
  ChevronDown
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import StatsCard from '../../components/common/StatsCard';
import { BarChart, DonutBreakdown } from '../../components/common/Chart';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Event Manager Modules
  const eventModules = [
    {
      title: 'Event Management',
      icon: BookOpen,
      path: '/admin/quizzes',
      desc: 'Symposium events, quiz guidelines & scoring parameters',
      color: 'from-blue-600 to-indigo-600',
      badge: 'Events'
    },
    {
      title: 'Questions',
      icon: HelpCircle,
      path: '/admin/questions',
      desc: 'MCQ question banks, categorization & PDF/Excel imports',
      color: 'from-indigo-600 to-violet-600',
      badge: 'Questions'
    },
    {
      title: 'Quiz Schedule',
      icon: Calendar,
      path: '/admin/schedule',
      desc: 'Automatic publishing timeline & 5-min entry window',
      color: 'from-emerald-600 to-teal-600',
      badge: 'Schedule'
    },
    {
      title: 'Rounds',
      icon: Layers,
      path: '/admin/rounds',
      desc: 'Round 1 screening & Round 2 finals configuration',
      color: 'from-amber-600 to-orange-600',
      badge: 'Rounds'
    },
    {
      title: 'Round Selection',
      icon: Filter,
      path: '/admin/round-selection',
      desc: 'Score cutoffs, merit qualifying & promotion to Round 2',
      color: 'from-purple-600 to-pink-600',
      badge: 'Selection'
    },
    {
      title: 'Results',
      icon: Award,
      path: '/admin/results',
      desc: 'Leaderboards, score distribution & grade exports',
      color: 'from-rose-600 to-red-600',
      badge: 'Results'
    }
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await adminService.getDashboardStats();
        if (res.success) {
          setStats(res.data);
        }
      } catch (err) {
        console.error('Error loading dashboard stats:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <Loading text="Loading admin telemetry & stats..." />;

  const kpis = stats?.kpis || {};
  const charts = stats?.charts || {};

  return (
    <div className="space-y-8">
      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-widest mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Eloquence '26 Symposium Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Executive Examination Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time participant proctoring, round progression, and examination analytics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/live-exams"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20"
          >
            <Activity className="w-4 h-4" />
            <span>Open Live Proctor Monitor</span>
          </Link>
        </div>
      </div>

      {/* 8 Metric Dashboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Participants"
          value={kpis.totalParticipants || 0}
          icon={Users}
          color="blue"
          subtitle={`${kpis.registeredParticipants || 0} active accounts`}
        />
        <StatsCard
          title="Active Exams"
          value={kpis.activeExams || 0}
          icon={Activity}
          color="emerald"
          subtitle="Live test sessions"
        />
        <StatsCard
          title="Completed Exams"
          value={kpis.completedExams || 0}
          icon={CheckCircle2}
          color="indigo"
          subtitle="Graded attempts"
        />
        <StatsCard
          title="Terminated Exams"
          value={kpis.terminatedExams || 0}
          icon={ShieldAlert}
          color="rose"
          subtitle="Security threshold exits"
        />
        <StatsCard
          title="Selected Qualifiers"
          value={kpis.selectedParticipants || 0}
          icon={Filter}
          color="purple"
          subtitle="Round 2 Finalists"
        />
        <StatsCard
          title="Average Score"
          value={`${kpis.averageScore || 0} pts`}
          icon={TrendingUp}
          color="amber"
          subtitle="Across all attempts"
        />
        <StatsCard
          title="Highest Score"
          value={`${kpis.highestScore || 0} pts`}
          icon={Award}
          color="emerald"
          subtitle="Top performer score"
        />
        <StatsCard
          title="Security Incidents"
          value={stats?.recentViolationsCount || 0}
          icon={AlertTriangle}
          color="rose"
          subtitle="Logged proctor violations"
        />
      </div>

      {/* Event Manager Section & Dropdown Hub */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Event Manager
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                  6 Modules
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Unified management for events, questions, schedules, rounds, qualification, and results
              </p>
            </div>
          </div>

          {/* Quick Jump Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 hidden md:inline">Jump to:</span>
            <div className="relative min-w-[200px]">
              <select
                onChange={(e) => {
                  if (e.target.value) navigate(e.target.value);
                }}
                defaultValue=""
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="" disabled>
                  Select Event Module...
                </option>
                <option value="/admin/quizzes">Event Management</option>
                <option value="/admin/questions">Questions Repository</option>
                <option value="/admin/schedule">Quiz Schedule</option>
                <option value="/admin/rounds">Rounds Management</option>
                <option value="/admin/round-selection">Round Selection</option>
                <option value="/admin/results">Results & Rankings</option>
              </select>
            </div>
          </div>
        </div>

        {/* 6 Event Manager Module Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {eventModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.path}
                to={module.path}
                className="group p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-brand-300 dark:hover:border-brand-800/80 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${module.color} flex items-center justify-center text-white shadow-sm`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                      {module.badge}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {module.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-2">
                    {module.desc}
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-xs font-bold text-brand-600 dark:text-brand-400">
                  <span>Open Module</span>
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution Chart */}
        <BarChart
          title="Participant Score Distribution (%)"
          data={charts.scoreDistribution || {}}
          color="bg-brand-500"
        />

        {/* Completed vs Terminated Breakdown */}
        <DonutBreakdown
          title="Attempt Completion Status"
          data={charts.attemptBreakdown || {}}
        />
      </div>

      {/* Round-wise Performance Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Round-Wise Examination Performance
          </h3>
          <Link
            to="/admin/round-selection"
            className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            <span>Manage Round 1 Selection</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 rounded-l-xl">Round</th>
                <th className="py-3 px-4">Attempts</th>
                <th className="py-3 px-4">Average Score</th>
                <th className="py-3 px-4">Passing Rate</th>
                <th className="py-3 px-4 rounded-r-xl text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {charts.roundWiseData && charts.roundWiseData.map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{r.round}</td>
                  <td className="py-3.5 px-4">{r.attempts} Participants</td>
                  <td className="py-3.5 px-4 font-bold text-brand-600 dark:text-brand-400">{r.avgScore} pts</td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{r.passRate}%</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      to={idx === 0 ? '/admin/round-selection' : '/admin/rounds'}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-semibold"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
