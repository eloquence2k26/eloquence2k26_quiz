import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  RotateCcw, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  RefreshCw,
  Search,
  UserCheck
} from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { API_ADMIN_URL } from '../config/apiConfig';

export const RestartTestPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [retestRequests, setRetestRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Direct Restart State
  const [restartParticipantId, setRestartParticipantId] = useState('');

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_ADMIN_URL}/quizzes`);
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data.quizzes || []);
        if (data.quizzes?.length > 0 && !selectedQuiz) {
          setSelectedQuiz(data.quizzes[0]);
        }
      }
    } catch (err) {
      console.error('Fetch quizzes error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRetestRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_ADMIN_URL}/retests`);
      if (res.ok) {
        const data = await res.json();
        setRetestRequests(data.retests || []);
      }
    } catch (err) {
      console.error('Fetch retests error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
    fetchRetestRequests();
  }, []);

  // Direct Restart Test Action by Admin
  const handleDirectRestartTest = async () => {
    if (!restartParticipantId || !selectedQuiz) return;
    try {
      const res = await fetch(`${API_ADMIN_URL}/attempts/${restartParticipantId}/grant-retest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: selectedQuiz.id,
          adminMessage: 'Retest permission manually granted by administrator to restart test.'
        })
      });

      if (res.ok) {
        fetchRetestRequests();
        const msg = `Successfully granted retest permission for participant (${restartParticipantId})!`;
        setStatusMsg(msg);
        toast.success(msg);
        setRestartParticipantId('');
        setTimeout(() => setStatusMsg(''), 4000);
      }
    } catch (err) {
      console.error('Direct restart test error:', err);
      toast.error('Failed to grant retest permission.');
    }
  };

  // Retest Approval (Grant / Deny)
  const handleRetestAction = async (requestId, quizId, action) => {
    try {
      const endpoint = action === 'grant' ? 'approve' : 'reject';
      const res = await fetch(`${API_ADMIN_URL}/retests/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          quizId,
          adminMessage: action === 'grant' ? 'Retest permission granted by administrator.' : 'Retest request denied.'
        })
      });

      if (res.ok) {
        fetchRetestRequests();
        const msg = `Retest request ${action === 'grant' ? 'approved' : 'rejected'}.`;
        setStatusMsg(msg);
        if (action === 'grant') toast.success(msg); else toast.info(msg);
        setTimeout(() => setStatusMsg(''), 3000);
      }
    } catch (err) {
      console.error('Retest action error:', err);
      toast.error('Failed to update retest request.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8">
      {/* Header Banner */}
      <section className="basic-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <RotateCcw className="w-3.5 h-3.5" /> Restart Test Management Portal
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              RESTART TEST FOR PARTICIPANTS
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1">
              Directly restart quiz attempts for participants or manage submitted retest requests after technical lockouts.
            </p>
          </div>

          <button
            onClick={() => { fetchQuizzes(); fetchRetestRequests(); }}
            className="p-2.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4 text-slate-700 dark:text-zinc-300" />
          </button>
        </div>

        {statusMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}
      </section>

      {/* Main Restart Test Section */}
      <section className="basic-card p-6 space-y-6">
        {/* Instant Restart Test Action Card */}
        <div className="p-4 sm:p-6 rounded-2xl bg-blue-50/60 dark:bg-zinc-900/90 border border-blue-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Instant Restart Test for Participant</h4>
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-400">
            Enter a participant's Email, User ID, or Phone and choose the target quiz event to immediately grant permission to retake the test.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block mb-1">Target Quiz Event *</label>
              <select
                value={selectedQuiz?.id || ''}
                onChange={(e) => {
                  const q = quizzes.find((x) => String(x.id) === String(e.target.value));
                  if (q) setSelectedQuiz(q);
                }}
                className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
              >
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block mb-1">Participant ID / Email / Phone *</label>
              <Input
                placeholder="e.g. student@eloquence.com or user-demo-1"
                value={restartParticipantId}
                onChange={(e) => setRestartParticipantId(e.target.value)}
              />
            </div>

            <div>
              <Button
                variant="primary"
                className="w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!restartParticipantId || !selectedQuiz}
                onClick={handleDirectRestartTest}
              >
                <RotateCcw className="w-4 h-4" /> RESTART TEST NOW
              </Button>
            </div>
          </div>
        </div>

        {/* Retest Requests Table */}
        <div className="space-y-4 pt-2">
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Participant Retest Requests & Audit Log ({retestRequests.length})
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Review student requests to retake a quiz after technical interruptions or locks.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-3 px-4">Participant Name</th>
                  <th className="py-3 px-4">Quiz Title</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Violations</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-zinc-400">Loading retest requests...</td>
                  </tr>
                ) : retestRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-zinc-400">No retest requests pending or logged.</td>
                  </tr>
                ) : (
                  retestRequests.map((ret) => (
                    <tr key={ret.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {ret.userName}
                        <span className="block text-[10px] font-normal text-slate-500 dark:text-zinc-400">{ret.userEmail}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-zinc-300">{ret.quizTitle}</td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-400 max-w-xs truncate">{ret.reason}</td>
                      <td className="py-3.5 px-4 font-bold text-amber-500">{ret.violationsCount || 0}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                          ret.status === 'granted' || ret.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                            : ret.status === 'denied' || ret.status === 'rejected'
                            ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {ret.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {ret.status === 'pending' || ret.status === 'denied' ? (
                          <button
                            onClick={() => handleRetestAction(ret.id, ret.quiz_id, 'grant')}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer"
                          >
                            Grant Retest
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRetestAction(ret.id, ret.quiz_id, 'deny')}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all cursor-pointer"
                          >
                            Deny Retest
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
