import React, { useState, useEffect } from 'react';
import {
  Award,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  Globe,
  Users,
  Eye,
  Calendar,
  Activity,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  CheckSquare,
  Square,
  ShieldCheck,
  Check,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { quizService } from '../../services/quizService';
import { adminService } from '../../services/adminService';
import { examService } from '../../services/examService';
import { getSocket } from '../../services/socket';
import { useToast } from '../../context/ToastContext';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Loading from '../../components/common/Loading';

export default function ResultsPage() {
  const toast = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active view tab: 'SCHEDULED' | 'STARTED' | 'FINISHED'
  const [activeTab, setActiveTab] = useState('FINISHED');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCollege, setFilterCollege] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Selective Selection State
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [publishingAction, setPublishingAction] = useState(false);

  // Attempt Breakdown Modal
  const [selectedAttemptDetail, setSelectedAttemptDetail] = useState(null);
  const [loadingAttemptDetail, setLoadingAttemptDetail] = useState(false);

  useEffect(() => {
    fetchQuizzes();

    const socket = getSocket();
    const handleResultsUpdate = (data) => {
      console.log('[WebSocket Admin] Real-time results/status update:', data);
      if (selectedQuizId) {
        loadEventOverview(selectedQuizId);
      }
    };

    socket.on('RESULTS_UPDATED', handleResultsUpdate);
    socket.on('LEADERBOARD_UPDATED', handleResultsUpdate);
    socket.on('EXAM_SUBMITTED', handleResultsUpdate);
    socket.on('EXAM_TERMINATED', handleResultsUpdate);
    socket.on('ROUND_STATUS_UPDATED', handleResultsUpdate);

    return () => {
      socket.off('RESULTS_UPDATED', handleResultsUpdate);
      socket.off('LEADERBOARD_UPDATED', handleResultsUpdate);
      socket.off('EXAM_SUBMITTED', handleResultsUpdate);
      socket.off('EXAM_TERMINATED', handleResultsUpdate);
      socket.off('ROUND_STATUS_UPDATED', handleResultsUpdate);
    };
  }, [selectedQuizId]);

  useEffect(() => {
    if (selectedQuizId) {
      loadEventOverview(selectedQuizId);
    }
  }, [selectedQuizId]);

  const fetchQuizzes = async () => {
    try {
      const res = await quizService.getAllQuizzes();
      if (res.success && res.data?.length > 0) {
        setQuizzes(res.data);
        setSelectedQuizId(res.data[0].id);
      }
    } catch (err) {
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const loadEventOverview = async (quizId) => {
    if (!quizId) return;
    setRefreshing(true);
    try {
      const res = await adminService.getEventOverview(quizId);
      if (res.success) {
        setOverviewData(res.data);
        // Default tab based on quiz lifecycle stage
        if (res.data.lifecycle_stage) {
          setActiveTab(res.data.lifecycle_stage);
        }
      }
    } catch (err) {
      toast.error('Failed to load event data and results');
    } finally {
      setRefreshing(false);
    }
  };

  // -------------------------------------------------------------
  // Option 1: Publish All Results to Portal (Global Release)
  // -------------------------------------------------------------
  const handlePublishAllToggle = async () => {
    const isCurrentlyPublished = Boolean(overviewData?.quiz?.is_results_published);
    const newStatus = !isCurrentlyPublished;

    const actionText = newStatus
      ? 'Are you sure you want to PUBLISH all results to the student portal? All participants will be able to view their scores and ranks in their login.'
      : 'Unpublish all results from participant portals?';

    if (!window.confirm(actionText)) return;

    setPublishingAction(true);
    try {
      const res = await adminService.publishAllResults(selectedQuizId, newStatus);
      if (res.success) {
        toast.success(res.message);
        loadEventOverview(selectedQuizId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update publication status');
    } finally {
      setPublishingAction(false);
    }
  };

  // -------------------------------------------------------------
  // Option 2: Select & Send Results to Particular Logins
  // -------------------------------------------------------------
  const handleSendSelective = async (sendState = true) => {
    if (selectedParticipantIds.length === 0) {
      toast.error('Please select at least one participant using the checkboxes');
      return;
    }

    setPublishingAction(true);
    try {
      const res = await adminService.sendSelectiveResults(
        selectedQuizId,
        selectedParticipantIds,
        sendState
      );
      if (res.success) {
        toast.success(res.message);
        setSelectedParticipantIds([]);
        loadEventOverview(selectedQuizId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send results to selected logins');
    } finally {
      setPublishingAction(false);
    }
  };

  const handleToggleSingleParticipant = async (participantId, currentSent) => {
    try {
      const res = await adminService.sendSelectiveResults(
        selectedQuizId,
        [participantId],
        !currentSent
      );
      if (res.success) {
        toast.success(!currentSent ? 'Result sent to candidate login!' : 'Result revoked from login');
        loadEventOverview(selectedQuizId);
      }
    } catch (err) {
      toast.error('Failed to update participant result status');
    }
  };

  // Checkbox helpers
  const toggleSelectParticipant = (pId) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(pId) ? prev.filter((id) => id !== pId) : [...prev, pId]
    );
  };

  const selectAllFinished = () => {
    const allIds = (overviewData?.finished_data || []).map((f) => f.id);
    setSelectedParticipantIds(allIds);
  };

  const selectTopN = (n) => {
    const topIds = (overviewData?.finished_data || []).slice(0, n).map((f) => f.id);
    setSelectedParticipantIds(topIds);
    toast.info(`Selected Top ${topIds.length} candidates`);
  };

  const selectQualifiers = () => {
    const qualIds = (overviewData?.finished_data || [])
      .filter((f) => f.round_1_selected || f.is_passed)
      .map((f) => f.id);
    setSelectedParticipantIds(qualIds);
    toast.info(`Selected ${qualIds.length} qualifying candidates`);
  };

  // Attempt details modal
  const openAttemptDetails = async (attemptId) => {
    if (!attemptId) return;
    setLoadingAttemptDetail(true);
    try {
      const res = await examService.getAttemptResult(attemptId);
      if (res.success) {
        setSelectedAttemptDetail(res.data);
      }
    } catch (err) {
      toast.error('Failed to load candidate attempt breakdown');
    } finally {
      setLoadingAttemptDetail(false);
    }
  };

  // CSV Export
  const handleExportCSV = async () => {
    try {
      const res = await adminService.exportQuizResultsCSV(selectedQuizId);
      if (res.success && res.data?.rows) {
        const rows = res.data.rows;
        if (rows.length === 0) {
          toast.info('No results to export yet');
          return;
        }

        const headers = Object.keys(rows[0]).join(',');
        const csvContent =
          'data:text/csv;charset=utf-8,' +
          [headers, ...rows.map((r) => Object.values(r).map((v) => `"${v}"`).join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `${overviewData?.quiz?.title || 'quiz'}_results.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Downloaded official results CSV');
      }
    } catch (err) {
      toast.error('Export failed');
    }
  };

  if (loading) return <Loading text="Loading official scores & leaderboards..." />;

  const quiz = overviewData?.quiz || {};
  const stats = overviewData?.stats || {};
  const isPublishedGlobally = Boolean(quiz.is_results_published);

  // Filter finished data
  const finishedList = (overviewData?.finished_data || []).filter((r) => {
    if (filterCollege && !r.college?.toLowerCase().includes(filterCollege.toLowerCase())) return false;
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'PUBLISHED' && !r.is_published_to_login) return false;
      if (filterStatus === 'UNPUBLISHED' && r.is_published_to_login) return false;
      if (filterStatus === 'QUALIFIED' && !r.round_1_selected) return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        r.full_name?.toLowerCase().includes(term) ||
        r.participant_id?.toLowerCase().includes(term) ||
        r.registration_number?.toLowerCase().includes(term) ||
        r.college?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Filter live / started data
  const startedList = (overviewData?.started_data || []).filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.full_name?.toLowerCase().includes(term) ||
      r.participant_id?.toLowerCase().includes(term) ||
      r.college?.toLowerCase().includes(term)
    );
  });

  // Filter scheduled data
  const scheduledList = (overviewData?.scheduled_data || []).filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.full_name?.toLowerCase().includes(term) ||
      r.participant_id?.toLowerCase().includes(term) ||
      r.college?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Event Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-widest mb-1">
            <Award className="w-4 h-4" />
            <span>Examination Results & Publishing Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Leaderboard & Results Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monitor live student timers, inspect submitted marks, and publish results to portal or individual student logins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quiz Selector */}
          <select
            value={selectedQuizId}
            onChange={(e) => setSelectedQuizId(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white shadow-sm focus:ring-2 focus:ring-brand-500/20"
          >
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                Round {q.round_number}: {q.title} ({q.status})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => loadEventOverview(selectedQuizId)}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Selected Event Details Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-brand-500/30 text-brand-300 px-2.5 py-0.5 rounded-md border border-brand-400/30">
                Round {quiz.round_number}
              </span>
              <span className="text-xs font-semibold text-slate-300">
                {quiz.event_name || "Eloquence '26"}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">{quiz.title}</h2>
          </div>

          {/* Global Publication Status Pill */}
          <div className="flex items-center gap-2">
            {isPublishedGlobally ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Results Published to All Portal Logins</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Results Unpublished (Draft Mode)</span>
              </div>
            )}
          </div>
        </div>

        {/* 4 Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-slate-400 text-[10px] font-bold uppercase block">Scheduled Time</span>
            <span className="font-bold text-white mt-0.5 block">
              {quiz.start_date} • {quiz.start_time?.slice(0, 5)} ({quiz.duration_minutes}m)
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-slate-400 text-[10px] font-bold uppercase block">Assigned Candidates</span>
            <span className="font-bold text-white mt-0.5 block">{stats.total_assigned || 0} Registered</span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-slate-400 text-[10px] font-bold uppercase block">Live in Progress</span>
            <span className="font-bold text-yellow-300 mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span>{stats.total_in_progress || 0} Active Timers</span>
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <span className="text-slate-400 text-[10px] font-bold uppercase block">Submitted & Graded</span>
            <span className="font-bold text-emerald-300 mt-0.5 block">
              {stats.total_completed || 0} Graded Scorecards
            </span>
          </div>
        </div>
      </div>

      {/* Lifecycle Mode Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
        <div className="flex gap-1">
          {/* TAB 1: SCHEDULED */}
          <button
            type="button"
            onClick={() => setActiveTab('SCHEDULED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'SCHEDULED'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>1. Scheduled Roster ({stats.total_assigned || 0})</span>
          </button>

          {/* TAB 2: STARTED / LIVE */}
          <button
            type="button"
            onClick={() => setActiveTab('STARTED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'STARTED'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 text-amber-500" />
            <span>2. Live Student Timers ({stats.total_in_progress || 0})</span>
          </button>

          {/* TAB 3: FINISHED & RESULTS */}
          <button
            type="button"
            onClick={() => setActiveTab('FINISHED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'FINISHED'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4 text-emerald-600" />
            <span>3. Finished Marks & Publishing ({stats.total_completed || 0})</span>
          </button>
        </div>

        {/* Global Action Buttons on Tab Header */}
        {activeTab === 'FINISHED' && (
          <div className="flex items-center gap-2 px-2">
            {/* OPTION 1: Publish All Toggle */}
            <button
              type="button"
              onClick={handlePublishAllToggle}
              disabled={publishingAction || (overviewData?.finished_data || []).length === 0}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                isPublishedGlobally
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{isPublishedGlobally ? 'Unpublish All Results' : 'Publish All Results to Portal'}</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: SCHEDULED EVENT DETAILS & ASSIGNED ROSTER         */}
      {/* ========================================================= */}
      {activeTab === 'SCHEDULED' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search assigned scholars by name, reg no, or college..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              Total {scheduledList.length} participants assigned to this round
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Participant ID</th>
                    <th className="py-3 px-4">Symposium Reg No</th>
                    <th className="py-3 px-4">Scholar Name</th>
                    <th className="py-3 px-4">College & Department</th>
                    <th className="py-3 px-4 text-right">Pre-Test Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  {scheduledList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No participants assigned to this round yet. Use "Assign Participants" or "User Registration" to enroll candidates.
                      </td>
                    </tr>
                  ) : (
                    scheduledList.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 text-slate-400">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                          {p.participant_id}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {p.registration_number}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {p.full_name}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-slate-800 dark:text-slate-200">{p.college}</p>
                          <p className="text-[10px] text-slate-400">{p.department}</p>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Badge variant="default" size="sm">
                            {p.status === 'ASSIGNED_NOT_STARTED' ? 'Registered / Awaiting Launch' : p.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: STARTED & LIVE STUDENT TIMINGS                    */}
      {/* ========================================================= */}
      {activeTab === 'STARTED' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search active examinees..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>{startedList.length} Live Candidates Active</span>
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Participant ID</th>
                    <th className="py-3 px-4">Symposium Reg No</th>
                    <th className="py-3 px-4">Scholar Name & College</th>
                    <th className="py-3 px-4">Remaining Time Countdown</th>
                    <th className="py-3 px-4">Progress</th>
                    <th className="py-3 px-4">Violations</th>
                    <th className="py-3 px-4 text-right">Live Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  {startedList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No students are currently taking the examination in real-time.
                      </td>
                    </tr>
                  ) : (
                    startedList.map((s) => (
                      <tr key={s.attempt_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                          {s.participant_id}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {s.registration_number}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900 dark:text-white">{s.full_name}</p>
                          <p className="text-[10px] text-slate-400">{s.college}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-mono font-bold border border-amber-200 dark:border-amber-900">
                            <Clock className="w-3.5 h-3.5 animate-spin text-amber-500" />
                            <span>{s.remaining_formatted}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {s.answered_count} / {s.total_questions}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">answered</span>
                        </td>
                        <td className="py-3.5 px-4">
                          {s.violation_count > 0 ? (
                            <span className="text-rose-600 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>{s.violation_count} Warnings</span>
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Clean</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Badge variant="warning" size="sm">
                            In Progress
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: FINISHED SUBMISSIONS, MARKS & 2 PUBLISH OPTIONS   */}
      {/* ========================================================= */}
      {activeTab === 'FINISHED' && (
        <div className="space-y-4">
          {/* Action Bar & 2 Publish Options */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Search and Filters */}
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search candidate by name, ID, or Reg No..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="ALL">All Publication Status</option>
                  <option value="PUBLISHED">Sent to Login</option>
                  <option value="UNPUBLISHED">Not Sent</option>
                  <option value="QUALIFIED">Round 2 Qualified</option>
                </select>
              </div>

              {/* OPTION 2: Selective Send to Particular Logins Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSendSelective(true)}
                  disabled={publishingAction || selectedParticipantIds.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 disabled:opacity-40 transition-all"
                  title="Send official scorecards directly into selected student login portals"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Result to Selected Logins ({selectedParticipantIds.length})</span>
                </button>

                {selectedParticipantIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSendSelective(false)}
                    disabled={publishingAction}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200"
                  >
                    Revoke Selected
                  </button>
                )}
              </div>
            </div>

            {/* Quick Selection Shortcuts */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-400 font-semibold text-[11px]">Quick Select:</span>
              <button
                type="button"
                onClick={selectAllFinished}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-[11px]"
              >
                Select All ({finishedList.length})
              </button>
              <button
                type="button"
                onClick={() => selectTopN(5)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-[11px]"
              >
                Top 5
              </button>
              <button
                type="button"
                onClick={() => selectTopN(10)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-[11px]"
              >
                Top 10
              </button>
              <button
                type="button"
                onClick={selectQualifiers}
                className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-[11px]"
              >
                Round 2 Qualifiers
              </button>
              {selectedParticipantIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedParticipantIds([])}
                  className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-700 text-[11px]"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>

          {/* Graded Marks Scorecard Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={
                          finishedList.length > 0 &&
                          finishedList.every((f) => selectedParticipantIds.includes(f.id))
                        }
                        onChange={(e) => (e.target.checked ? selectAllFinished() : setSelectedParticipantIds([]))}
                        className="rounded text-brand-600 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-3">Rank</th>
                    <th className="py-3 px-4">Participant ID</th>
                    <th className="py-3 px-4">Symposium Reg No</th>
                    <th className="py-3 px-4">Scholar Name & College</th>
                    <th className="py-3 px-4">Marks & Score</th>
                    <th className="py-3 px-4">C / W / U</th>
                    <th className="py-3 px-4">Time Taken</th>
                    <th className="py-3 px-4">Login Publish Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  {finishedList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        No graded student submissions recorded for this quiz yet.
                      </td>
                    </tr>
                  ) : (
                    finishedList.map((r) => {
                      const isChecked = selectedParticipantIds.includes(r.id);
                      return (
                        <tr
                          key={r.result_id}
                          className={`transition-colors ${
                            isChecked
                              ? 'bg-blue-50/70 dark:bg-brand-950/40'
                              : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="py-3.5 px-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectParticipant(r.id)}
                              className="rounded text-brand-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-3.5 px-3">
                            <span
                              className={`font-black text-xs px-2 py-0.5 rounded-md ${
                                r.rank === 1
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                                  : r.rank === 2
                                  ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                                  : r.rank === 3
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              #{r.rank}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                            {r.participant_id}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {r.registration_number}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900 dark:text-white">{r.full_name}</p>
                            <p className="text-[10px] text-slate-400">{r.college}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-slate-900 dark:text-white text-sm">
                                {r.final_score} pts
                              </span>
                              <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold">
                                ({r.percentage}%)
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              Pass Mark: {quiz.pass_percentage || 40}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[11px]">
                            <span className="text-emerald-600 font-bold">{r.correct_answers}C</span> /{' '}
                            <span className="text-rose-600 font-bold">{r.wrong_answers}W</span> /{' '}
                            <span className="text-slate-400">{r.unanswered_questions}U</span>
                          </td>
                          <td className="py-3.5 px-4 text-[11px] font-mono">
                            {r.time_taken_formatted}
                          </td>
                          <td className="py-3.5 px-4">
                            {r.is_published_to_login ? (
                              <Badge variant="success" size="sm">
                                Sent to Login ✅
                              </Badge>
                            ) : (
                              <Badge variant="default" size="sm">
                                Not Sent ⏳
                              </Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Row toggle send */}
                              <button
                                type="button"
                                onClick={() => handleToggleSingleParticipant(r.id, r.is_published_to_login)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                  r.is_published_to_login
                                    ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                                    : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400'
                                }`}
                                title={r.is_published_to_login ? 'Revoke from Login' : 'Send to Candidate Login'}
                              >
                                {r.is_published_to_login ? 'Revoke' : 'Send to Login'}
                              </button>

                              {/* View Details modal */}
                              <button
                                type="button"
                                onClick={() => openAttemptDetails(r.attempt_id)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600"
                                title="Inspect Question-by-Question Scorecard"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Candidate Breakdown Modal */}
      {selectedAttemptDetail && (
        <Modal
          isOpen={Boolean(selectedAttemptDetail)}
          onClose={() => setSelectedAttemptDetail(null)}
          title={`Scorecard Breakdown: ${selectedAttemptDetail.participant?.full_name}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            {/* Modal KPI Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase">Participant ID</span>
                <p className="font-mono font-bold text-brand-600 text-sm">
                  {selectedAttemptDetail.participant?.participant_id}
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase">Final Score</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {selectedAttemptDetail.result?.final_score} pts ({selectedAttemptDetail.result?.percentage}%)
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase">Overall Rank</span>
                <p className="font-bold text-amber-500 text-sm">
                  #{selectedAttemptDetail.result?.rank || 1}
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase">Correct / Total</span>
                <p className="font-bold text-emerald-600 text-sm">
                  {selectedAttemptDetail.result?.correct_answers} / {selectedAttemptDetail.result?.total_questions}
                </p>
              </div>
            </div>

            {/* Questions list */}
            <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
              {(selectedAttemptDetail.breakdown || []).map((q) => (
                <div
                  key={q.index}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      Q{q.index}. {q.question_text}
                    </span>
                    <Badge variant={q.is_correct ? 'success' : 'danger'} size="sm">
                      {q.is_correct ? `+${q.marks_awarded} pts` : `${q.marks_awarded} pts`}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400 pt-1">
                    <div>
                      <span>Selected Answer: </span>
                      <strong className={q.is_correct ? 'text-emerald-600' : 'text-rose-600'}>
                        Option {q.selected_option || 'None'}
                      </strong>
                    </div>
                    <div>
                      <span>Correct Answer: </span>
                      <strong className="text-emerald-600">Option {q.correct_answer}</strong>
                    </div>
                  </div>
                  {q.explanation && (
                    <p className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                      {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedAttemptDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
