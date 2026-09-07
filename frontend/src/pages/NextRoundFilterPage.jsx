import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  Filter, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  Star, 
  UserMinus, 
  Sparkles, 
  RefreshCw,
  Search,
  Award
} from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { API_ADMIN_URL } from '../config/apiConfig';

export const NextRoundFilterPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Next Round Filter State
  const [topCount, setTopCount] = useState(5);
  const [nextRoundQuizId, setNextRoundQuizId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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

  const fetchSubmissions = async (quizId) => {
    if (!quizId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_ADMIN_URL}/quizzes/${quizId}/submissions`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error('Fetch submissions error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  useEffect(() => {
    if (selectedQuiz) {
      fetchSubmissions(selectedQuiz.id);
    }
  }, [selectedQuiz]);

  // Execute Top N Qualification Filter
  const handleQualifyNextRound = async () => {
    if (!selectedQuiz) return;
    try {
      const res = await fetch(`${API_ADMIN_URL}/quizzes/${selectedQuiz.id}/qualify-next-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topCount: Number(topCount) || 5,
          nextRoundQuizId: nextRoundQuizId || null
        })
      });

      if (res.ok) {
        const data = await res.json();
        const msg = `Filter applied! ${data.qualifiedCount} participants qualified for Next Round, ${data.eliminatedCount} eliminated.`;
        setStatusMsg(msg);
        toast.success(msg);
        fetchSubmissions(selectedQuiz.id);
        setTimeout(() => setStatusMsg(''), 4000);
      }
    } catch (err) {
      console.error('Qualify next round error:', err);
      toast.error('Failed to apply qualification filter.');
    }
  };

  // Toggle individual student qualification status
  const handleToggleQualification = async (participantId, currentStatus) => {
    if (!selectedQuiz) return;
    const newStatus = currentStatus === 'QUALIFIED' ? 'ELIMINATED' : 'QUALIFIED';
    try {
      const res = await fetch(`${API_ADMIN_URL}/quizzes/${selectedQuiz.id}/toggle-qualification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          newQualificationStatus: newStatus,
          nextRoundQuizId: nextRoundQuizId || null
        })
      });

      if (res.ok) {
        const msg = `Participant qualification updated to ${newStatus}.`;
        setStatusMsg(msg);
        toast.info(msg);
        fetchSubmissions(selectedQuiz.id);
        setTimeout(() => setStatusMsg(''), 3000);
      }
    } catch (err) {
      console.error('Toggle qualification error:', err);
      toast.error('Failed to toggle qualification status.');
    }
  };

  const filteredSubmissions = submissions.filter((s) =>
    (s.participantName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.participantEmail || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.participantId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8">
      {/* Header Banner */}
      <section className="basic-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <Filter className="w-3.5 h-3.5" /> Next Round Filter Portal
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              SUBMISSIONS & NEXT ROUND FILTER
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1">
              Select attending/submitted participants with high marks & percentage, qualify them for the next round, and disable non-selected accounts.
            </p>
          </div>

          <button
            onClick={() => selectedQuiz && fetchSubmissions(selectedQuiz.id)}
            className="p-2.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Refresh Submissions"
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

        {/* Target Quiz Selector */}
        <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">Active Target Quiz Event</span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedQuiz ? selectedQuiz.title : 'No Quiz Selected'}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedQuiz?.id || ''}
              onChange={(e) => {
                const q = quizzes.find((x) => String(x.id) === String(e.target.value));
                if (q) setSelectedQuiz(q);
              }}
              className="w-full sm:w-72 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
            >
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title} ({q.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Main Next Round Filter Section */}
      <section className="basic-card p-6 space-y-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Top Performers Next Round Qualification Filter
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Rank students by score & percentage, select top N participants for the next round, auto-register them for the next quiz, and disable non-selected accounts.
          </p>
        </div>

        {/* Filter Configuration Card */}
        <div className="p-4 sm:p-6 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">Automated Next Round Filter Configuration</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">Select Top N Students *</label>
              <Input
                type="number"
                min="1"
                max="500"
                placeholder="e.g. 5 or 10"
                value={topCount}
                onChange={(e) => setTopCount(e.target.value)}
              />
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 block mt-1">Number of highest scoring participants to select</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">Assign to Next Round Quiz (Optional)</label>
              <select
                value={nextRoundQuizId}
                onChange={(e) => setNextRoundQuizId(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="">-- Auto Create / None --</option>
                {quizzes.filter(q => String(q.id) !== String(selectedQuiz?.id)).map((q) => (
                  <option key={q.id} value={q.id}>{q.title}</option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 block mt-1">Quiz event that qualified students will be registered for</span>
            </div>

            <div>
              <Button
                variant="primary"
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2"
                onClick={handleQualifyNextRound}
                disabled={!selectedQuiz || submissions.length === 0}
              >
                <Filter className="w-4 h-4" /> FILTER & QUALIFY TOP {topCount}
              </Button>
            </div>
          </div>
        </div>

        {/* Submissions & Results Table */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Attending & Submitted Participants ({submissions.length})
            </h4>

            <div className="w-full sm:w-64">
              <Input
                placeholder="Search participant name/email..."
                icon={Search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4">Score / Total</th>
                  <th className="py-3 px-4">Percentage</th>
                  <th className="py-3 px-4">Correct Answers</th>
                  <th className="py-3 px-4">Submission Status</th>
                  <th className="py-3 px-4">Next Round Status</th>
                  <th className="py-3 px-4 text-right">Qualification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-zinc-400">Loading quiz submissions...</td>
                  </tr>
                ) : filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-zinc-400">No student submissions found for this quiz.</td>
                  </tr>
                ) : (
                  filteredSubmissions.map((sub) => (
                    <tr key={sub.attemptId || sub.participantId} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {sub.participantName}
                        <span className="block text-[10px] font-normal text-slate-500 dark:text-zinc-400">{sub.participantEmail}</span>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                        {sub.score} / {sub.totalMarks}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-zinc-200">
                        {sub.percentage}%
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-zinc-300">
                        {sub.correctCount} / {sub.totalQuestions}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                          sub.status === 'SUBMITTED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border flex items-center gap-1 w-fit ${
                          sub.qualificationStatus === 'QUALIFIED'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                            : sub.qualificationStatus === 'ELIMINATED'
                            ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}>
                          {sub.qualificationStatus === 'QUALIFIED' && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                          {sub.qualificationStatus === 'ELIMINATED' && <UserMinus className="w-3 h-3 text-red-500" />}
                          {sub.qualificationStatus || 'PENDING'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleQualification(sub.participantId, sub.qualificationStatus)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            sub.qualificationStatus === 'QUALIFIED'
                              ? 'bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950 dark:hover:bg-red-900 dark:text-red-300'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                          }`}
                        >
                          {sub.qualificationStatus === 'QUALIFIED' ? 'Mark Eliminated' : 'Qualify Next Round'}
                        </button>
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
