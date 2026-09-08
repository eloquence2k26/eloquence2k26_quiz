import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Sparkles
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import StatsCard from '../../components/common/StatsCard';
import { BarChart, DonutBreakdown } from '../../components/common/Chart';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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
                      to={idx === 0 ? '/admin/round-selection' : '/admin/second-round'}
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
