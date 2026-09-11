import React, { useState, useEffect, useMemo } from 'react';
import {
  Filter,
  Sparkles,
  Check,
  CheckSquare,
  Send,
  Award,
  HelpCircle,
  Search,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Users,
  CheckCircle2,
  RefreshCw,
  Layers,
  Clock,
  Zap,
  RotateCcw,
  Sliders
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { quizService } from '../../services/quizService';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';

export default function RoundSelectionPage() {
  const toast = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [rankingData, setRankingData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Smart Selection & Cutoff Filters
  const [topNInput, setTopNInput] = useState(10);
  const [cutoffScoreInput, setCutoffScoreInput] = useState('');
  const [cutoffPctInput, setCutoffPctInput] = useState('');
  const [maxTimeMinutesInput, setMaxTimeMinutesInput] = useState('');

  // Table Search and Status Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'SELECTED', 'UNSELECTED'

  const [publishing, setPublishing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);

  useEffect(() => {
    fetchQuizzesAndRanking();
  }, []);

  const fetchQuizzesAndRanking = async () => {
    setLoading(true);
    try {
      const qRes = await quizService.getAllQuizzes();
      let activeQuizId = selectedQuizId;
      if (qRes.success && qRes.data && qRes.data.length > 0) {
        setQuizzes(qRes.data);
        if (!activeQuizId) {
          const r1Quiz = qRes.data.find((q) => Number(q.round_number) === 1) || qRes.data[0];
          activeQuizId = r1Quiz.id;
          setSelectedQuizId(activeQuizId);
        }
      }

      await loadRanking(activeQuizId);
    } catch (err) {
      toast.error('Failed to load ranking and examination data');
    } finally {
      setLoading(false);
    }
  };

  const loadRanking = async (quizId) => {
    try {
      const res = await adminService.getRound1Ranking(quizId ? { quiz_id: quizId } : {});
      if (res.success) {
        setRankingData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load rankings for selected quiz');
    }
  };

  const handleQuizChange = async (newQuizId) => {
    setSelectedQuizId(newQuizId);
    setLoading(true);
    await loadRanking(newQuizId);
    setLoading(false);
  };

  const handleApplyCriteriaSelection = async () => {
    setApplying(true);
    try {
      const maxTimeSec = maxTimeMinutesInput ? Math.floor(parseFloat(maxTimeMinutesInput) * 60) : undefined;
      const criteria = {
        quiz_id: rankingData?.quiz?.id || selectedQuizId,
        top_n: topNInput ? parseInt(topNInput, 10) : undefined,
        min_score: cutoffScoreInput !== '' ? parseFloat(cutoffScoreInput) : undefined,
        min_percentage: cutoffPctInput !== '' ? parseFloat(cutoffPctInput) : undefined,
        max_time_seconds: maxTimeSec
      };

      const res = await adminService.autoSelectCriteria(criteria);
      if (res.success) {
        const selectedCount = (res.data || []).filter((s) => s.selected).length;
        toast.success(`Smart Auto-Selection applied: ${selectedCount} participant(s) selected for Round 2!`);
        await loadRanking(selectedQuizId);
      }
    } catch (err) {
      toast.error('Failed to execute auto-selection: ' + (err.response?.data?.message || err.message));
    } finally {
      setApplying(false);
    }
  };

  const handleResetFilters = () => {
    setTopNInput(10);
    setCutoffScoreInput('');
    setCutoffPctInput('');
    setMaxTimeMinutesInput('');
  };

  const handleManualToggle = async (participantId, currentSelected) => {
    try {
      const res = await adminService.toggleParticipantSelection(participantId, !currentSelected, 1);
      if (res.success) {
        toast.success(`Participant selection updated`);
        loadRanking(selectedQuizId);
      }
    } catch (err) {
      toast.error('Failed to update selection');
    }
  };

  const handlePublishConfirmed = async () => {
    setPublishing(true);
    try {
      const res = await adminService.publishRoundSelection(1, selectedQuizId);
      if (res.success) {
        toast.success('Round 1 selections officially published & qualifiers assigned to Round 2!');
        setConfirmPublishOpen(false);
        loadRanking(selectedQuizId);
      }
    } catch (err) {
      toast.error('Failed to publish selections: ' + (err.response?.data?.message || err.message));
    } finally {
      setPublishing(false);
    }
  };

  const rankings = rankingData?.rankings || [];
  const selectedCount = rankings.filter((r) => r.selected).length;
  const unselectedCount = rankings.length - selectedCount;

  const highestScore = rankings.length > 0 ? Math.max(...rankings.map((r) => r.score || 0)) : 0;
  const fastestTime = rankings.length > 0
    ? Math.min(...rankings.filter((r) => r.time_taken_seconds > 0).map((r) => r.time_taken_seconds) || [0])
    : 0;

  const filteredRankings = useMemo(() => {
    const term = searchQuery.toLowerCase().trim();
    return rankings.filter((r) => {
      if (statusFilter === 'SELECTED' && !r.selected) return false;
      if (statusFilter === 'UNSELECTED' && r.selected) return false;

      if (!term) return true;
      return (
        (r.full_name || '').toLowerCase().includes(term) ||
        (r.participant_code || '').toLowerCase().includes(term) ||
        (r.college || '').toLowerCase().includes(term) ||
        (r.department || '').toLowerCase().includes(term)
      );
    });
  }, [rankings, statusFilter, searchQuery]);

  if (loading) return <Loading text="Loading Round 1 qualifiers and ranking..." />;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900/50 text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider mb-1.5">
            <Sliders className="w-3.5 h-3.5" />
            <span>Round Progression & Qualifier Management</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Round Selection & Promotion Panel
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Filter and auto-select participants based on Marks, Percentage, and Time Taken (tiebreaker) to qualify for Round 2.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadRanking(selectedQuizId)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmPublishOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/25 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Publish Round Selections ({selectedCount} Selected)</span>
          </button>
        </div>
      </div>

      {/* Target Quiz & Smart Auto-Selection Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Target Examination Round
            </span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {rankingData?.quiz?.title || 'Round 1 Examination'} ({rankingData?.quiz?.event_name || 'Symposium Event'})
            </h3>
          </div>

          <div className="w-full md:w-80">
            <select
              value={selectedQuizId}
              onChange={(e) => handleQuizChange(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/40 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title} (Round {q.round_number || 1}) - {q.status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Multi-Criteria Auto Selection Filter Bar */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Smart Auto-Selection Criteria (Marks, Percentage, Time & Count)
              </h4>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Automatically shortlists participants strictly ranked by <strong>Score / Marks (Highest First)</strong> &rarr; <strong>Percentage</strong> &rarr; <strong>Time Taken (Fastest Submission)</strong> as the definitive tiebreaker.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {/* 1. Top N Count */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Top N Count
              </label>
              <div className="relative">
                <Users className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min={1}
                  placeholder="e.g. 10"
                  value={topNInput}
                  onChange={(e) => setTopNInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold"
                />
              </div>
            </div>

            {/* 2. Min Marks Cutoff */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Min Marks Cutoff (Pts)
              </label>
              <div className="relative">
                <Award className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.5"
                  placeholder="e.g. 15"
                  value={cutoffScoreInput}
                  onChange={(e) => setCutoffScoreInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold"
                />
              </div>
            </div>

            {/* 3. Min Percentage Cutoff */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Min Percentage Cutoff (%)
              </label>
              <div className="relative">
                <TrendingUp className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  placeholder="e.g. 60"
                  value={cutoffPctInput}
                  onChange={(e) => setCutoffPctInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold"
                />
              </div>
            </div>

            {/* 4. Max Time Limit Cutoff */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Max Time Limit (Minutes)
              </label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.5"
                  placeholder="e.g. 15 (minutes)"
                  value={maxTimeMinutesInput}
                  onChange={(e) => setMaxTimeMinutesInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={applying}
              onClick={handleApplyCriteriaSelection}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>{applying ? 'Applying Selection...' : 'Apply Filters & Auto-Select for Round 2'}</span>
            </button>
          </div>
        </div>

        {/* Quick Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Evaluated</span>
            <span className="text-lg font-black text-slate-900 dark:text-white">{rankings.length}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-center">
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase block">Round 2 Qualified</span>
            <span className="text-lg font-black text-purple-700 dark:text-purple-300">{selectedCount}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-center">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase block">Highest Score</span>
            <span className="text-lg font-black text-amber-700 dark:text-amber-300">{highestScore} pts</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-center">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block">Fastest Submission</span>
            <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
              {fastestTime > 0 ? `${Math.floor(fastestTime / 60)}m ${fastestTime % 60}s` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Rankings and Selection Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, ID, college, department..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
            >
              <option value="ALL">All Candidates ({rankings.length})</option>
              <option value="SELECTED">Selected for Round 2 ({selectedCount})</option>
              <option value="UNSELECTED">Not Selected ({unselectedCount})</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Participant Code</th>
                <th className="py-3 px-4">Name & College</th>
                <th className="py-3 px-4">Marks / Score</th>
                <th className="py-3 px-4">Percentage</th>
                <th className="py-3 px-4">Time Taken</th>
                <th className="py-3 px-4">Attempt Status</th>
                <th className="py-3 px-4 text-right">Round 2 Qualification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {filteredRankings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No candidates found for this selection view.
                  </td>
                </tr>
              ) : (
                filteredRankings.map((r) => (
                  <tr
                    key={r.participant_id}
                    className={`transition-colors ${
                      r.selected ? 'bg-purple-50/40 dark:bg-purple-950/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3.5 px-4 font-black text-sm">
                      {r.rank === 1 ? (
                        <span className="text-amber-500 font-black">🥇 #1</span>
                      ) : r.rank === 2 ? (
                        <span className="text-slate-400 font-black">🥈 #2</span>
                      ) : r.rank === 3 ? (
                        <span className="text-amber-700 font-black">🥉 #3</span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">#{r.rank}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                      {r.participant_code}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{r.full_name}</p>
                      <p className="text-[10px] text-slate-400">{r.college} • {r.department}</p>
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">
                      {r.score} pts
                    </td>
                    <td className="py-3.5 px-4 font-bold text-brand-600 dark:text-brand-400">
                      {r.percentage}%
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-600 dark:text-slate-400 flex items-center gap-1.5 pt-4">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{r.time_taken_formatted || '00:00'}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={r.attempt_status === 'COMPLETED' ? 'success' : 'danger'} size="sm">
                        {r.attempt_status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleManualToggle(r.participant_id, r.selected)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          r.selected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-500/20'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                        }`}
                      >
                        <Check className={`w-3.5 h-3.5 ${r.selected ? 'opacity-100' : 'opacity-0'}`} />
                        <span>{r.selected ? 'Selected' : 'Select'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmPublishOpen}
        onClose={() => setConfirmPublishOpen(false)}
        title="Publish Round Finalist Selection"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/60 rounded-2xl text-purple-600 dark:text-purple-400 inline-flex">
            <Sparkles className="w-8 h-8" />
          </div>

          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Confirm Publication of Qualifiers?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              You are about to officially publish <strong>{selectedCount} selected finalists</strong> for Round 2.
            </p>
          </div>

          <div className="text-left text-xs p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-2">
            <p className="text-slate-700 dark:text-slate-300">
              • <strong>Selected Scholars ({selectedCount})</strong>: Will automatically be assigned to the Round 2 Exam and receive a celebratory qualification popup on their console.
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              • <strong>Unselected Scholars ({unselectedCount})</strong>: Will receive a polite participation acknowledgment modal upon login and their participation will conclude.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => setConfirmPublishOpen(false)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 dark:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={publishing}
              onClick={handlePublishConfirmed}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-500/20"
            >
              {publishing ? 'Publishing...' : 'Yes, Publish Qualifiers'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
