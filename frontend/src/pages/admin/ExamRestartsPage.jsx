import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Search,
  Filter,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  Users,
  Eye,
  Trash2,
  Lock,
  Unlock,
  AlertOctagon,
  ArrowRight,
  School,
  BookOpen
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Loading from '../../components/common/Loading';

export default function ExamRestartsPage() {
  const toast = useToast();
  const [attempts, setAttempts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('TERMINATED'); // Default to showing terminated first

  // Restart Confirmation Modal State
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [attRes, evRes] = await Promise.all([
        adminService.getAllExamAttempts(),
        adminService.getEvents().catch(() => ({ success: false, data: [] }))
      ]);

      if (attRes.success) {
        setAttempts(attRes.data || []);
      }
      if (evRes.success && evRes.data) {
        setEvents(evRes.data.map((e) => (typeof e === 'string' ? e : e.title || e.name || '')));
      }

      if (isManual) toast.success('Exam attempts list refreshed');
    } catch (err) {
      console.error('Error fetching exam attempts:', err.message);
      toast.error('Failed to load examination attempts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenRestartModal = (attempt) => {
    setSelectedAttempt(attempt);
    setShowRestartModal(true);
  };

  const handleConfirmRestart = async () => {
    if (!selectedAttempt) return;

    setRestarting(true);
    try {
      const res = await adminService.restartExamAttempt(selectedAttempt.id || selectedAttempt.attempt_id);
      if (res.success) {
        toast.success(
          `Test reset successfully for ${selectedAttempt.participant_name}! Candidate can now re-take the exam.`
        );
        setShowRestartModal(false);
        setSelectedAttempt(null);
        fetchData();
      } else {
        toast.error(res.message || 'Failed to restart exam attempt');
      }
    } catch (err) {
      console.error('Error restarting exam attempt:', err);
      toast.error(err.response?.data?.message || 'Failed to restart exam attempt');
    } finally {
      setRestarting(false);
    }
  };

  if (loading) return <Loading text="Loading exam restart manager..." />;

  // Unique events list strictly sourced from Event Management (events table)
  const eventOptions = events && events.length > 0
    ? events.filter(Boolean)
    : Array.from(new Set(attempts.map((a) => a.event_name).filter(Boolean)));

  // Filter logic
  let filtered = attempts;

  if (filterEvent !== 'ALL') {
    filtered = filtered.filter(
      (a) => (a.event_name || '').toLowerCase() === filterEvent.toLowerCase()
    );
  }

  if (filterStatus !== 'ALL') {
    if (filterStatus === 'TERMINATED') {
      filtered = filtered.filter(
        (a) => a.status === 'TERMINATED' || a.status === 'DISQUALIFIED'
      );
    } else {
      filtered = filtered.filter((a) => a.status === filterStatus);
    }
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    filtered = filtered.filter(
      (a) =>
        a.participant_name.toLowerCase().includes(term) ||
        a.participant_code.toLowerCase().includes(term) ||
        a.registration_number.toLowerCase().includes(term) ||
        a.email.toLowerCase().includes(term) ||
        a.college.toLowerCase().includes(term) ||
        a.quiz_title.toLowerCase().includes(term) ||
        (a.termination_reason && a.termination_reason.toLowerCase().includes(term))
    );
  }

  // Summary Metrics
  const terminatedCount = attempts.filter(
    (a) => a.status === 'TERMINATED' || a.status === 'DISQUALIFIED'
  ).length;
  const inProgressCount = attempts.filter((a) => a.status === 'IN_PROGRESS').length;
  const completedCount = attempts.filter((a) => a.status === 'COMPLETED').length;
  const totalAttempts = attempts.length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Exam Restarts & Re-attempts</span>
                <button
                  type="button"
                  onClick={() => fetchData(true)}
                  disabled={refreshing}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                  title="Refresh attempts list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-600' : ''}`} />
                </button>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Grant re-attempts to disqualified or interrupted candidates by Event
              </p>
            </div>
          </div>
        </div>

        {/* Quick event filter count */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
            {eventOptions.length} Active Events
          </span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => setFilterStatus('TERMINATED')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'TERMINATED'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 ring-2 ring-rose-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Terminated / Disqualified
            </span>
            <div className="w-7 h-7 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {terminatedCount}
            </span>
            <span className="text-[11px] text-slate-400">Needs Restart</span>
          </div>
        </div>

        <div
          onClick={() => setFilterStatus('IN_PROGRESS')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'IN_PROGRESS'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              In-Progress
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {inProgressCount}
            </span>
            <span className="text-[11px] text-slate-400">Active Now</span>
          </div>
        </div>

        <div
          onClick={() => setFilterStatus('COMPLETED')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'COMPLETED'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Completed
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {completedCount}
            </span>
            <span className="text-[11px] text-slate-400">Submitted</span>
          </div>
        </div>

        <div
          onClick={() => setFilterStatus('ALL')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filterStatus === 'ALL'
              ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-300 dark:border-brand-800 ring-2 ring-brand-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-brand-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Total Attempts
            </span>
            <div className="w-7 h-7 rounded-xl bg-brand-100 dark:bg-brand-900/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-brand-600 dark:text-brand-400">
              {totalAttempts}
            </span>
            <span className="text-[11px] text-slate-400">All Statuses</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar with Event Selection & Status Dropdown */}
      <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by scholar name, ID, Reg No, college, reason..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        {/* Event Selection Dropdown */}
        <div className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-brand-500 hidden sm:block" />
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 min-w-[180px]"
          >
            <option value="ALL">All Events ({eventOptions.length})</option>
            {eventOptions.map((ev) => (
              <option key={ev} value={ev}>
                {ev}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="ALL">All Statuses</option>
          <option value="TERMINATED">Terminated / Disqualified</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>

        {/* Clear Filters */}
        {(searchTerm || filterEvent !== 'ALL' || filterStatus !== 'TERMINATED') && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setFilterEvent('ALL');
              setFilterStatus('TERMINATED');
            }}
            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Attempts Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Scholar Details</th>
                <th className="py-3.5 px-4">Event & Examination</th>
                <th className="py-3.5 px-4">Institution</th>
                <th className="py-3.5 px-4">Attempt Status</th>
                <th className="py-3.5 px-4">Violations & Incident Reason</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-700 dark:text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                        No attempts found for selected criteria
                      </p>
                      <p className="text-xs text-slate-400">
                        {filterStatus === 'TERMINATED'
                          ? 'No terminated candidates. All participants are clear or have been restarted.'
                          : 'Try adjusting your search terms or event filter.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((attempt) => {
                  const isTerminated =
                    attempt.status === 'TERMINATED' || attempt.status === 'DISQUALIFIED';
                  const isInProgress = attempt.status === 'IN_PROGRESS';

                  return (
                    <tr
                      key={attempt.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Scholar Info */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900 dark:text-white">
                          {attempt.participant_name}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="font-mono text-brand-600 dark:text-brand-400 font-semibold">
                            {attempt.participant_code}
                          </span>
                          <span>•</span>
                          <span className="font-mono">{attempt.registration_number || '—'}</span>
                        </div>
                      </td>

                      {/* Event & Quiz */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200/50 dark:border-brand-800/40 mb-1">
                          {attempt.event_name || 'Technical Quiz'}
                        </span>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {attempt.quiz_title} (Round {attempt.round_number})
                        </p>
                      </td>

                      {/* Institution */}
                      <td className="py-3.5 px-4">
                        <p className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[180px]">
                          {attempt.college || '—'}
                        </p>
                        <p className="text-[10px] text-slate-400">{attempt.department || 'CSE'}</p>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {isTerminated ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 animate-pulse">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>TERMINATED</span>
                          </span>
                        ) : isInProgress ? (
                          <Badge variant="warning" size="sm">
                            IN PROGRESS
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            COMPLETED
                          </Badge>
                        )}
                      </td>

                      {/* Violations & Reason */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {attempt.violation_count > 0 ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              {attempt.violation_count} Strike(s)
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">0 Strikes</span>
                          )}
                        </div>
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium truncate" title={attempt.termination_reason}>
                          {attempt.termination_reason || (isTerminated ? 'Disqualified by Proctor' : 'Standard completion')}
                        </p>
                      </td>

                      {/* Started / Submitted */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-500 font-mono">
                        {formatDateTime(attempt.updated_at || attempt.started_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenRestartModal(attempt)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 shadow-sm transition-all"
                          title="Restart exam for this candidate"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restart Test</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restart Confirmation Modal */}
      <Modal
        isOpen={showRestartModal}
        onClose={() => {
          if (!restarting) {
            setShowRestartModal(false);
            setSelectedAttempt(null);
          }
        }}
        title={
          <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
            <RotateCcw className="w-5 h-5" />
            <span>Confirm Examination Restart</span>
          </div>
        }
        maxWidth="max-w-lg"
      >
        {selectedAttempt && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs space-y-2">
              <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>You are resetting this candidate's test session:</span>
              </p>
              <div className="pl-6 text-slate-700 dark:text-slate-300 space-y-1">
                <p>
                  <strong>Candidate:</strong> {selectedAttempt.participant_name} ({selectedAttempt.participant_code})
                </p>
                <p>
                  <strong>Event:</strong> {selectedAttempt.event_name} • {selectedAttempt.quiz_title}
                </p>
                {selectedAttempt.termination_reason && (
                  <p className="text-rose-700 dark:text-rose-400">
                    <strong>Previous Incident:</strong> {selectedAttempt.termination_reason}
                  </p>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
              <p className="font-semibold text-slate-900 dark:text-white">What will happen:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>The terminated exam attempt will be cleared and reset.</li>
                <li>Violation strikes and session locks for this test will be removed.</li>
                <li>The participant will immediately see <strong>"Start Exam"</strong> on their dashboard.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowRestartModal(false)}
                disabled={restarting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestart}
                disabled={restarting}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 shadow-md shadow-rose-500/20 disabled:opacity-50 transition-all"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>{restarting ? 'Resetting...' : 'Confirm & Allow Re-take'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
