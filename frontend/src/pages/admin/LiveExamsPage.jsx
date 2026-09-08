import React, { useState, useEffect } from 'react';
import { Activity, Clock, ShieldAlert, AlertTriangle, UserX, PlusCircle, RefreshCw, Sparkles } from 'lucide-react';
import { quizService } from '../../services/quizService';
import { examService } from '../../services/examService';
import { useToast } from '../../context/ToastContext';
import { formatSecondsToTime } from '../../utils/formatters';
import StatsCard from '../../components/common/StatsCard';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';

export default function LiveExamsPage() {
  const toast = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Terminate Action Modal
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [targetAttemptId, setTargetAttemptId] = useState(null);
  const [termReason, setTermReason] = useState('Proctoring Disqualification by Symposium Admin');

  // Extend Time Modal
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [extraMinutes, setExtraMinutes] = useState(5);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  useEffect(() => {
    if (selectedQuizId) {
      fetchLiveMonitor();
      const interval = setInterval(fetchLiveMonitor, 5000); // 5 sec auto refresh
      return () => clearInterval(interval);
    }
  }, [selectedQuizId]);

  const fetchQuizzes = async () => {
    try {
      const res = await quizService.getAllQuizzes();
      if (res.success && res.data?.length > 0) {
        setQuizzes(res.data);
        const live = res.data.find((q) => q.status === 'Live') || res.data[0];
        setSelectedQuizId(live.id);
      }
    } catch (err) {
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveMonitor = async () => {
    if (!selectedQuizId) return;
    try {
      const res = await examService.getLiveMonitoring(selectedQuizId);
      if (res.success) {
        setLiveData(res.data);
      }
    } catch (err) {
      console.warn('Live monitor polling notice:', err.message);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchLiveMonitor();
    setRefreshing(false);
    toast.success('Live monitor updated');
  };

  const handleTerminateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await examService.adminTerminateAttempt(targetAttemptId, termReason);
      if (res.success) {
        toast.success('Attempt terminated and disqualified');
        setTerminateModalOpen(false);
        fetchLiveMonitor();
      }
    } catch (err) {
      toast.error('Failed to terminate attempt');
    }
  };

  const handleExtendSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await examService.adminExtendTime(targetAttemptId, extraMinutes);
      if (res.success) {
        toast.success(`Extended time by ${extraMinutes} minutes`);
        setExtendModalOpen(false);
        fetchLiveMonitor();
      }
    } catch (err) {
      toast.error('Failed to extend exam time');
    }
  };

  if (loading) return <Loading text="Initializing live proctor monitoring..." />;

  const participants = liveData?.live_participants || [];

  return (
    <div className="space-y-6">
      {/* Top Header with Quiz Selector & Manual Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Real-Time Examination Telemetry</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Live Exam Monitoring Console
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedQuizId}
            onChange={(e) => setSelectedQuizId(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
          >
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                Round {q.round_number}: {q.title} ({q.status})
              </option>
            ))}
          </select>

          <button
            onClick={handleManualRefresh}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Live KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard
          title="Total Attempts"
          value={liveData?.total_participants || 0}
          icon={Activity}
          color="blue"
          subtitle="Started sessions"
        />
        <StatsCard
          title="Active Right Now"
          value={liveData?.active_count || 0}
          icon={Clock}
          color="emerald"
          subtitle="In-Progress testers"
        />
        <StatsCard
          title="Completed"
          value={liveData?.completed_count || 0}
          icon={Activity}
          color="indigo"
          subtitle="Submitted attempts"
        />
        <StatsCard
          title="Terminated / Disqualified"
          value={liveData?.terminated_count || 0}
          icon={ShieldAlert}
          color="rose"
          subtitle="Security exit logs"
        />
      </div>

      {/* Live Participants Monitoring Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-4 p-6">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Active Participants Proctor Grid ({participants.length})
        </h3>

        {participants.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">
            No participants currently attempting this examination.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4">Exam Status</th>
                  <th className="py-3 px-4">Questions Answered</th>
                  <th className="py-3 px-4">Remaining Timer</th>
                  <th className="py-3 px-4">Security Warnings</th>
                  <th className="py-3 px-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {participants.map((p) => {
                  const isActive = p.status === 'IN_PROGRESS';
                  return (
                    <tr key={p.attempt_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900 dark:text-white">{p.participant_name}</p>
                        <p className="text-[10px] text-slate-400">{p.college}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            isActive
                              ? 'live'
                              : p.status === 'COMPLETED'
                              ? 'success'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-brand-600 dark:text-brand-400">
                          {p.answered_count}
                        </span>{' '}
                        / {p.total_questions}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {isActive ? formatSecondsToTime(p.remaining_seconds) : '--:--:--'}
                      </td>
                      <td className="py-3.5 px-4">
                        {p.violation_count > 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            {p.violation_count} Violations
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-semibold text-[11px]">0 Incidents</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isActive ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setTargetAttemptId(p.attempt_id);
                                setExtendModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                              title="Extend Exam Time"
                            >
                              + Time
                            </button>
                            <button
                              onClick={() => {
                                setTargetAttemptId(p.attempt_id);
                                setTerminateModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200"
                              title="Disqualify & Terminate Attempt"
                            >
                              Terminate
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Session Closed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Terminate Modal */}
      <Modal
        isOpen={terminateModalOpen}
        onClose={() => setTerminateModalOpen(false)}
        title="Disqualify & Terminate Attempt"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleTerminateSubmit} className="space-y-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-800 dark:text-rose-200 font-medium">
            This will immediately stop the participant's timer, lock answers, grade the test, and submit it under status <strong>DISQUALIFIED</strong>.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Termination Reason *
            </label>
            <input
              type="text"
              required
              value={termReason}
              onChange={(e) => setTermReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setTerminateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700"
            >
              Force Disqualify
            </button>
          </div>
        </form>
      </Modal>

      {/* Extend Time Modal */}
      <Modal
        isOpen={extendModalOpen}
        onClose={() => setExtendModalOpen(false)}
        title="Extend Examination Time"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleExtendSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Extra Minutes to Add
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={extraMinutes}
              onChange={(e) => setExtraMinutes(parseInt(e.target.value) || 5)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setExtendModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700"
            >
              Apply Extra Time
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
