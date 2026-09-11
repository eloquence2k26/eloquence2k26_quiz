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
  Layers
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
  const [topNInput, setTopNInput] = useState(10);
  const [cutoffScoreInput, setCutoffScoreInput] = useState('');
  const [cutoffPctInput, setCutoffPctInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'SELECTED', 'UNSELECTED'

  const [publishing, setPublishing] = useState(false);
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

  const handleAutoSelect = async () => {
    if (topNInput <= 0) {
      toast.warning('Please enter a valid Top N number');
      return;
    }
    try {
      const res = await adminService.autoSelectTopN(topNInput, rankingData?.quiz?.id || selectedQuizId);
      if (res.success) {
        toast.success(`Top ${topNInput} participants selected for Round 2`);
        loadRanking(selectedQuizId);
      }
    } catch (err) {
      toast.error('Failed to execute auto selection');
    }
  };

  const handleApplyCutoff = async () => {
    if (!cutoffScoreInput && !cutoffPctInput) {
      toast.warning('Please enter a cutoff score or cutoff percentage');
      return;
    }

    const minScore = parseFloat(cutoffScoreInput) || 0;
    const minPct = parseFloat(cutoffPctInput) || 0;

    const rankings = rankingData?.rankings || [];
    let updatedCount = 0;

    for (const r of rankings) {
      const qualifies = (cutoffScoreInput ? r.score >= minScore : true) && (cutoffPctInput ? r.percentage >= minPct : true);
      if (r.selected !== qualifies) {
        await adminService.toggleParticipantSelection(r.participant_id, qualifies, 1);
        updatedCount++;
      }
    }

    toast.success(`Cut-off filter applied! ${updatedCount} selection(s) updated.`);
    loadRanking(selectedQuizId);
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
            <Filter className="w-3.5 h-3.5" />
            <span>Round Progression & Qualifier Management</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Round Selection & Promotion Panel
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Filter participants by Quiz, Round score, percentage cutoffs, or algorithmic Top N to qualify for Round 2.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadRanking(selectedQuizId)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setConfirmPublishOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/25 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Publish Round Selections ({selectedCount} Selected)</span>
          </button>
        </div>
      </div>

      {/* Target Quiz & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
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

        {/* Curation Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Algorithm 1: Top N Qualifier */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Auto Select Top N Qualifiers
              </h4>
            </div>
            <p className="text-[11px] text-slate-500">
              Selects the top ranked scorers based on score and submission speed.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={rankings.length || 100}
                value={topNInput}
                onChange={(e) => setTopNInput(parseInt(e.target.value) || 1)}
                className="w-20 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-center"
              />
              <span className="text-xs text-slate-400 font-semibold">Scholars</span>
              <button
                type="button"
                onClick={handleAutoSelect}
                className="ml-auto px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-500/20"
              >
                Apply Top {topNInput}
              </button>
            </div>
          </div>

          {/* Algorithm 2: Cutoff Mark & Percentage Filter */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Cutoff Score / Percentage Filter
              </h4>
            </div>
            <p className="text-[11px] text-slate-500">
              Auto-select all candidates who scored above a benchmark.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min Pts"
                value={cutoffScoreInput}
                onChange={(e) => setCutoffScoreInput(e.target.value)}
                className="w-24 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-center"
              />
              <input
                type="number"
                placeholder="Min %"
                value={cutoffPctInput}
                onChange={(e) => setCutoffPctInput(e.target.value)}
                className="w-24 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-center"
              />
              <button
                type="button"
                onClick={handleApplyCutoff}
                className="ml-auto px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20"
              >
                Apply Cutoff
              </button>
            </div>
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
              <option value="UNSELECTED">Not Selected ({rankings.length - selectedCount})</option>
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
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Percentage</th>
                <th className="py-3 px-4">Attempt Status</th>
                <th className="py-3 px-4 text-right">Qualified for Round 2</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {filteredRankings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
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
                    <td className="py-3.5 px-4 font-black text-sm text-amber-500">
                      #{r.rank}
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
                    <td className="py-3.5 px-4 font-bold text-brand-600">
                      {r.percentage}%
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
              • <strong>Selected Scholars</strong>: Will immediately receive congratulations banner and automatic enrollment to Round 2 exam.
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              • <strong>Eliminated Scholars</strong>: Will receive participation acknowledgment on their dashboard and will be restricted from Round 2.
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
