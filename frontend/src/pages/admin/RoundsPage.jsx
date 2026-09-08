import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  HelpCircle,
  Users,
  Play,
  Square,
  Sparkles,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  X
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { quizService } from '../../services/quizService';
import { useToast } from '../../context/ToastContext';
import { formatDate, getRoundBadgeVariant } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Loading from '../../components/common/Loading';
import QuizModal from '../../components/admin/QuizModal';

export default function RoundsPage() {
  const toast = useToast();
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetRound, setTargetRound] = useState(null);

  // Quiz Modal integration
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [prefilledRoundNumber, setPrefilledRoundNumber] = useState(1);
  const [allQuestions, setAllQuestions] = useState([]);

  // Form states
  const [roundFormData, setRoundFormData] = useState({
    round_number: 1,
    round_name: '',
    description: '',
    is_active: true
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [roundsRes, questRes] = await Promise.all([
        adminService.getRounds(),
        adminService.getQuestions()
      ]);

      if (roundsRes.success) {
        setRounds(roundsRes.data || []);
      }
      if (questRes.success) {
        setAllQuestions(questRes.data || []);
      }
    } catch (err) {
      toast.error('Failed to load tournament rounds');
    } finally {
      setLoading(false);
    }
  };

  // Open Make New Round Modal
  const handleOpenCreateModal = () => {
    const highestNum = rounds.reduce((max, r) => Math.max(max, Number(r.round_number) || 0), 0);
    const nextNum = highestNum + 1;
    setRoundFormData({
      round_number: nextNum,
      round_name: `Round ${nextNum}`,
      description: `Symposium Examination Round ${nextNum}`,
      is_active: true
    });
    setCreateModalOpen(true);
  };

  // Open Edit Round Modal
  const handleOpenEditModal = (round) => {
    setTargetRound(round);
    setRoundFormData({
      round_number: round.round_number,
      round_name: round.round_name || `Round ${round.round_number}`,
      description: round.description || '',
      is_active: round.is_active !== false
    });
    setEditModalOpen(true);
  };

  // Open Delete Confirmation Modal
  const handleOpenDeleteModal = (round) => {
    setTargetRound(round);
    setDeleteModalOpen(true);
  };

  // Submit Make Round
  const handleCreateRoundSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await adminService.createRound({
        round_number: Number(roundFormData.round_number),
        round_name: roundFormData.round_name.trim(),
        description: roundFormData.description.trim()
      });

      if (res.success) {
        toast.success(`Round ${roundFormData.round_number} created successfully`);
        setCreateModalOpen(false);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create round');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit Round
  const handleEditRoundSubmit = async (e) => {
    e.preventDefault();
    if (!targetRound) return;
    setSubmitting(true);
    try {
      const res = await adminService.updateRound(targetRound.id || targetRound.round_number, {
        round_name: roundFormData.round_name.trim(),
        description: roundFormData.description.trim(),
        is_active: roundFormData.is_active
      });

      if (res.success) {
        toast.success(`Round ${targetRound.round_number} updated successfully`);
        setEditModalOpen(false);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update round');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Delete Round
  const handleDeleteRoundSubmit = async (force = true) => {
    if (!targetRound) return;
    setSubmitting(true);
    try {
      const res = await adminService.deleteRound(targetRound.id || targetRound.round_number, force);
      if (res.success) {
        toast.success(`Round ${targetRound.round_number} deleted successfully`);
        setDeleteModalOpen(false);
        setTargetRound(null);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete round');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Quiz Creation for a specific round
  const handleAddQuizForRound = (roundNumber) => {
    setPrefilledRoundNumber(roundNumber);
    setEditingQuiz({ round_number: roundNumber });
    setQuizModalOpen(true);
  };

  // Open Quiz Edit
  const handleEditQuiz = async (quizId) => {
    try {
      const res = await quizService.getQuizById(quizId);
      if (res.success) {
        setEditingQuiz(res.data);
        setQuizModalOpen(true);
      }
    } catch (err) {
      toast.error('Failed to load quiz details');
    }
  };

  // Save Quiz
  const handleSaveQuiz = async (formData) => {
    try {
      if (editingQuiz && editingQuiz.id) {
        const res = await quizService.updateQuiz(editingQuiz.id, formData);
        if (res.success) {
          toast.success('Quiz updated successfully');
          setQuizModalOpen(false);
          fetchData();
        }
      } else {
        const res = await quizService.createQuiz({
          ...formData,
          round_number: formData.round_number || prefilledRoundNumber
        });
        if (res.success) {
          toast.success('Quiz created successfully');
          setQuizModalOpen(false);
          fetchData();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save quiz');
    }
  };

  // Toggle Quiz Live Status
  const handleToggleQuizStatus = async (quizId, currentStatus) => {
    const nextStatus = currentStatus === 'Live' ? 'Completed' : 'Live';
    try {
      const res = await quizService.updateStatus(quizId, nextStatus);
      if (res.success) {
        toast.success(`Quiz status updated to ${nextStatus}`);
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <Loading text="Loading tournament rounds & examinations..." />;

  // Calculate overview metrics
  const totalQuizzesCount = rounds.reduce((acc, r) => acc + (r.quizzes_count || r.quizzes?.length || 0), 0);
  const totalQualifiersCount = rounds.reduce((acc, r) => acc + (r.qualifiers_count || 0), 0);
  const activeRoundsCount = rounds.filter((r) => r.is_active !== false).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-widest mb-1">
            <Layers className="w-4 h-4" />
            <span>Tournament Rounds & Progression Hub</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Rounds Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create, configure, schedule, and delete tournament examination stages from Round 1 through Round N
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Make New Round</span>
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Total Rounds
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{rounds.length}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Configured tournament stages</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Total Exams
          </span>
          <p className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">{totalQuizzesCount}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Linked across all rounds</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Active Stages
          </span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{activeRoundsCount}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Enabled for competition</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Eligible Qualifiers
          </span>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{totalQualifiersCount}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Participant qualifiers</span>
        </div>
      </div>

      {/* Rounds List */}
      <div className="space-y-6">
        {rounds.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
            <Layers className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Rounds Configured</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Get started by creating your first tournament examination round.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Make Round 1</span>
            </button>
          </div>
        ) : (
          rounds.map((r) => {
            const hasQuizzes = r.quizzes && r.quizzes.length > 0;
            return (
              <div
                key={r.id || r.round_number}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all"
              >
                {/* Round Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <Badge variant={getRoundBadgeVariant(r.round_number)} size="md">
                      Round {r.round_number}
                    </Badge>
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{r.round_name || `Round ${r.round_number}`}</span>
                        {r.round_number === 1 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Screening
                          </span>
                        )}
                        {r.round_number === 2 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                            Grand Finals
                          </span>
                        )}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {r.description || `Symposium Examination Round ${r.round_number}`}
                      </p>
                    </div>
                  </div>

                  {/* Round Level Controls */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleOpenEditModal(r)}
                      className="p-2 rounded-xl text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                      title="Edit Round Info"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleOpenDeleteModal(r)}
                      className="p-2 rounded-xl text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-200 dark:border-rose-900/50 transition-colors"
                      title={`Delete Round ${r.round_number}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleAddQuizForRound(r.round_number)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-950/50 hover:bg-brand-100 dark:hover:bg-brand-900/60 border border-brand-200 dark:border-brand-800/60 text-brand-700 dark:text-brand-300 text-xs font-bold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Quiz</span>
                    </button>
                  </div>
                </div>

                {/* Round Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4 p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-brand-500" />
                    <span className="text-slate-600 dark:text-slate-400">
                      Quizzes: <strong className="text-slate-900 dark:text-white">{r.quizzes_count || (r.quizzes ? r.quizzes.length : 0)}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-500" />
                    <span className="text-slate-600 dark:text-slate-400">
                      Eligible: <strong className="text-slate-900 dark:text-white">{r.qualifiers_count || 0} participants</strong>
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-600 dark:text-slate-400">
                      Status: <strong className="text-emerald-600 dark:text-emerald-400">Active Stage</strong>
                    </span>
                  </div>
                </div>

                {/* Quizzes Under This Round */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Examinations in Round {r.round_number}
                    </h3>
                  </div>

                  {!hasQuizzes ? (
                    <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                      <p>No examinations configured for Round {r.round_number} yet.</p>
                      <button
                        onClick={() => handleAddQuizForRound(r.round_number)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Create Examination for Round {r.round_number}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {r.quizzes.map((q) => (
                        <div
                          key={q.id}
                          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col justify-between hover:border-brand-200 dark:hover:border-brand-900 transition-colors"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                                {q.title}
                              </h4>
                              <Badge
                                variant={
                                  q.status === 'Live'
                                    ? 'live'
                                    : q.status === 'Published'
                                    ? 'success'
                                    : q.status === 'Scheduled'
                                    ? 'warning'
                                    : 'default'
                                }
                                size="sm"
                              >
                                {q.status}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-brand-500" />
                                {q.duration_minutes} Mins
                              </span>
                              <span className="flex items-center gap-1">
                                <HelpCircle className="w-3 h-3 text-brand-500" />
                                {q.total_questions} Questions
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                            <button
                              onClick={() => handleToggleQuizStatus(q.id, q.status)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                                q.status === 'Live'
                                  ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                              }`}
                            >
                              {q.status === 'Live' ? (
                                <>
                                  <Square className="w-3 h-3" />
                                  <span>Stop Live</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3" />
                                  <span>Go Live</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleEditQuiz(q.id)}
                              className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline"
                            >
                              Configure Quiz
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MAKE NEW ROUND MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Make New Tournament Round"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateRoundSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Round Number *
            </label>
            <input
              type="number"
              min={1}
              required
              value={roundFormData.round_number}
              onChange={(e) =>
                setRoundFormData({
                  ...roundFormData,
                  round_number: parseInt(e.target.value) || 1
                })
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Any sequential number (e.g. 3, 4, 5...)
            </span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Round Title / Name *
            </label>
            <input
              type="text"
              required
              value={roundFormData.round_name}
              onChange={(e) => setRoundFormData({ ...roundFormData, round_name: e.target.value })}
              placeholder="e.g. Round 3: Algorithmic Shootout & Viva"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={roundFormData.description}
              onChange={(e) => setRoundFormData({ ...roundFormData, description: e.target.value })}
              placeholder="Topic coverage, eligibility rules, and examination structure..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Round'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT ROUND MODAL */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Round ${targetRound?.round_number || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleEditRoundSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Round Title *
            </label>
            <input
              type="text"
              required
              value={roundFormData.round_name}
              onChange={(e) => setRoundFormData({ ...roundFormData, round_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={roundFormData.description}
              onChange={(e) => setRoundFormData({ ...roundFormData, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={`Delete Round ${targetRound?.round_number || ''}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Delete Tournament Round?</p>
              <p className="mt-1 text-xs">
                Are you sure you want to delete <strong>Round {targetRound?.round_number}</strong> (
                <em>{targetRound?.round_name}</em>)?
              </p>
              {targetRound && (targetRound.quizzes_count > 0 || (targetRound.quizzes && targetRound.quizzes.length > 0)) && (
                <p className="mt-2 text-xs font-semibold text-rose-800 dark:text-rose-200">
                  ⚠️ Notice: This round contains {targetRound.quizzes_count || targetRound.quizzes.length} examination(s). Deleting this round will safely reassign those examinations to Round 1.
                </p>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleDeleteRoundSubmit(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-50 shadow-sm"
            >
              {submitting ? 'Deleting...' : 'Confirm Delete Round'}
            </button>
          </div>
        </div>
      </Modal>

      {/* QUIZ CONFIGURATION MODAL */}
      <QuizModal
        isOpen={quizModalOpen}
        onClose={() => {
          setQuizModalOpen(false);
          setEditingQuiz(null);
        }}
        onSave={handleSaveQuiz}
        initialData={editingQuiz}
        allQuestions={allQuestions}
      />
    </div>
  );
}
