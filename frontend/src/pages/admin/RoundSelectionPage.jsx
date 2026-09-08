import React, { useState, useEffect } from 'react';
import { Filter, Sparkles, Check, CheckSquare, Send, Award, HelpCircle } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';

export default function RoundSelectionPage() {
  const toast = useToast();
  const [rankingData, setRankingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topNInput, setTopNInput] = useState(10);
  const [publishing, setPublishing] = useState(false);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    setLoading(true);
    try {
      const res = await adminService.getRound1Ranking();
      if (res.success) {
        setRankingData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load Round 1 rankings');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSelect = async () => {
    if (topNInput <= 0) {
      toast.warning('Please enter a valid Top N number');
      return;
    }
    try {
      const res = await adminService.autoSelectTopN(topNInput, rankingData?.quiz?.id);
      if (res.success) {
        toast.success(`Top ${topNInput} participants selected for Round 2`);
        fetchRanking();
      }
    } catch (err) {
      toast.error('Failed to execute auto selection');
    }
  };

  const handleManualToggle = async (participantId, currentSelected) => {
    try {
      const res = await adminService.toggleParticipantSelection(participantId, !currentSelected, 1);
      if (res.success) {
        toast.success(`Participant selection updated`);
        fetchRanking();
      }
    } catch (err) {
      toast.error('Failed to update selection');
    }
  };

  const handlePublishConfirmed = async () => {
    setPublishing(true);
    try {
      const res = await adminService.publishRoundSelection(1);
      if (res.success) {
        toast.success('Round 1 selections officially published to participants!');
        setConfirmPublishOpen(false);
        fetchRanking();
      }
    } catch (err) {
      toast.error('Failed to publish selections');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <Loading text="Loading Round 1 qualifiers and ranking..." />;

  const rankings = rankingData?.rankings || [];
  const selectedCount = rankings.filter((r) => r.selected).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Round 1 Qualifiers & Selection Panel
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select qualifiers for Round 2 (Grand Finals) using algorithmic Top N or manual curation
          </p>
        </div>

        <button
          onClick={() => setConfirmPublishOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/25 transition-all"
        >
          <Send className="w-4 h-4" />
          <span>Publish Round 1 Selection ({selectedCount} Selected)</span>
        </button>
      </div>

      {/* Auto Select Top N Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Auto Select Top Qualifiers
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automatically select top scorers based on final score and completion speed
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-500 px-2">Top</span>
            <input
              type="number"
              min={1}
              max={rankings.length || 100}
              value={topNInput}
              onChange={(e) => setTopNInput(parseInt(e.target.value) || 1)}
              className="w-16 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-center"
            />
            <span className="text-xs font-bold text-slate-500 px-1">Scholars</span>
          </div>

          <button
            onClick={handleAutoSelect}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20"
          >
            Apply Auto Selection
          </button>
        </div>
      </div>

      {/* Rankings and Qualification Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Participant Code</th>
                <th className="py-3 px-4">Name & College</th>
                <th className="py-3 px-4">Round 1 Score</th>
                <th className="py-3 px-4">Percentage</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Selected for Round 2</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {rankings.map((r) => (
                <tr
                  key={r.participant_id}
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 ${
                    r.selected ? 'bg-purple-50/30 dark:bg-purple-950/20' : ''
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
                    <p className="text-[10px] text-slate-400">{r.college}</p>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmPublishOpen}
        onClose={() => setConfirmPublishOpen(false)}
        title="Publish Round 1 Finalist Selection"
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
              You are about to publish <strong>{selectedCount} selected finalists</strong> for Round 2.
            </p>
          </div>

          <div className="text-left text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-1.5">
            <p className="text-slate-700 dark:text-slate-300">
              • Selected candidates will immediately see Congratulations and Round 2 exam schedule.
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              • Not-selected candidates will be restricted from Round 2.
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
