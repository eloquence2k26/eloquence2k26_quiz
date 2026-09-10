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
  Trophy,
  Award,
  Tag,
  X
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { quizService } from '../../services/quizService';
import { useToast } from '../../context/ToastContext';
import { formatDate, getRoundBadgeVariant } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Loading from '../../components/common/Loading';

export default function RoundsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [rounds, setRounds] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetRound, setTargetRound] = useState(null);
  const [targetEventForNewRound, setTargetEventForNewRound] = useState(null);

  // Form states
  const [roundFormData, setRoundFormData] = useState({
    event_id: '',
    event_name: '',
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
      const [roundsRes, eventsRes, questRes] = await Promise.all([
        adminService.getRounds(),
        adminService.getEvents(),
        adminService.getQuestions()
      ]);

      let loadedRounds = [];
      let loadedEvents = [];

      if (roundsRes.success) {
        loadedRounds = roundsRes.data || [];
        setRounds(loadedRounds);
      }
      if (eventsRes.success) {
        loadedEvents = eventsRes.data || [];
      }
      if (questRes.success) {
        setAllQuestions(questRes.data || []);
      }

      // Merge distinct events from rounds in case an event was only in rounds
      const eventMap = new Map();
      loadedEvents.forEach((ev) => {
        if (ev.title) {
          eventMap.set(ev.title.toLowerCase(), ev);
        }
      });

      loadedRounds.forEach((r) => {
        const title = r.event_name;
        if (title && !eventMap.has(title.toLowerCase())) {
          eventMap.set(title.toLowerCase(), {
            id: r.event_id || `ev-${title.toLowerCase().replace(/\s+/g, '-')}`,
            title: title,
            code: r.event_code || 'ELQ26',
            description: `${title} symposium tournament event`
          });
        }
      });

      // Default fallback event if none exist
      if (eventMap.size === 0) {
        eventMap.set('technical quiz', {
          id: 'c0000000-0000-0000-0000-000000000001',
          title: 'Technical Quiz',
          code: 'ELQ26',
          description: 'Official National Symposium Technical MCQ Championship'
        });
      }

      setEvents(Array.from(eventMap.values()));
    } catch (err) {
      toast.error('Failed to load tournament rounds & events');
    } finally {
      setLoading(false);
    }
  };

  // Open Make New Round Modal for a specific event
  const handleOpenCreateModalForEvent = (event) => {
    setTargetEventForNewRound(event);

    // Calculate highest round number for THIS event
    const eventRounds = rounds.filter(
      (r) =>
        (r.event_id && event?.id && r.event_id === event.id) ||
        (r.event_name && event?.title && r.event_name.toLowerCase() === event.title.toLowerCase())
    );
    const highestNum = eventRounds.reduce(
      (max, r) => Math.max(max, Number(r.round_number) || 0),
      0
    );
    const nextNum = highestNum + 1;

    setRoundFormData({
      event_id: event?.id || '',
      event_name: event?.title || '',
      round_number: nextNum,
      round_name: `Round ${nextNum}`,
      description: `${event?.title || 'Symposium'} Examination Round ${nextNum}`,
      is_active: true
    });
    setCreateModalOpen(true);
  };

  // Open Edit Round Modal (to edit name, number, description)
  const handleOpenEditModal = (round) => {
    setTargetRound(round);
    setRoundFormData({
      event_id: round.event_id || '',
      event_name: round.event_name || '',
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
        event_id: roundFormData.event_id,
        event_name: roundFormData.event_name,
        round_number: Number(roundFormData.round_number),
        round_name: roundFormData.round_name.trim(),
        description: roundFormData.description.trim()
      });

      if (res.success) {
        toast.success(`${roundFormData.round_name} created successfully for ${roundFormData.event_name}`);
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
        round_number: Number(roundFormData.round_number),
        description: roundFormData.description.trim(),
        is_active: roundFormData.is_active
      });

      if (res.success) {
        toast.success(`Round "${roundFormData.round_name}" updated successfully`);
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
        toast.success(`Round "${targetRound.round_name || targetRound.round_number}" deleted successfully`);
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



  // Toggle Quiz Live Status
  const handleToggleQuizStatus = async (quizId, currentStatus) => {
    const nextStatus = currentStatus === 'Live' ? 'Completed' : 'Live';
    try {
      const res = await quizService.updateStatus(quizId, nextStatus);
      if (res.success) {
        toast.success(`Exam status updated to ${nextStatus}`);
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <Loading text="Loading symposium events, rounds & examinations..." />;

  // Calculate overview metrics across all events
  const totalQuizzesCount = rounds.reduce((acc, r) => acc + (r.quizzes_count || r.quizzes?.length || 0), 0);
  const totalQualifiersCount = rounds.reduce((acc, r) => acc + (r.qualifiers_count || 0), 0);
  const activeRoundsCount = rounds.filter((r) => r.is_active !== false).length;

  return (
    <div className="space-y-8">
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
            Configure examination rounds, customize stage names, and manage competitive progressions inside each symposium event
          </p>
        </div>

        {events.length > 0 && (
          <button
            onClick={() => handleOpenCreateModalForEvent(events[0])}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event Round</span>
          </button>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Competition Events
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{events.length}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Registered tournament tracks</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Total Rounds
          </span>
          <p className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">{rounds.length}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Configured tournament stages</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Total Exams
          </span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{totalQuizzesCount}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Linked across all events</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Active Stages
          </span>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{activeRoundsCount}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Enabled for competition</span>
        </div>
      </div>

      {/* EVENT CONTAINERS LIST */}
      <div className="space-y-8">
        {events.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Events Registered</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Please register an event in Event Management to configure tournament examination rounds.
            </p>
          </div>
        ) : (
          events.map((event) => {
            // Find all rounds belonging to this event
            const eventRounds = rounds.filter(
              (r) =>
                (r.event_id && event.id && r.event_id === event.id) ||
                (r.event_name && event.title && r.event_name.toLowerCase() === event.title.toLowerCase())
            );

            // Sort rounds by round_number
            eventRounds.sort((a, b) => (Number(a.round_number) || 0) - (Number(b.round_number) || 0));

            const eventExamsCount = eventRounds.reduce(
              (acc, r) => acc + (r.quizzes_count || r.quizzes?.length || 0),
              0
            );

            return (
              <div
                key={event.id || event.title}
                className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700 space-y-6"
              >
                {/* EVENT CONTAINER HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse"></span>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white capitalize">
                        {event.title}
                      </h2>
                      <Badge variant="info" size="sm">
                        {eventRounds.length} {eventRounds.length === 1 ? 'Round' : 'Rounds'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {event.description || `Official symposium competition rounds and examinations for ${event.title}`}
                    </p>
                  </div>

                  {/* Inside the event box: Option to Add Round */}
                  <button
                    onClick={() => handleOpenCreateModalForEvent(event)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm shadow-brand-500/20 transition-all self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Round</span>
                  </button>
                </div>

                {/* EVENT ROUNDS SECTION */}
                <div>
                  {eventRounds.length === 0 ? (
                    <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-800/20">
                      <Layers className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        No Rounds Configured for {event.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 mb-3">
                        Set up examination stages for this event.
                      </p>
                      <button
                        onClick={() => handleOpenCreateModalForEvent(event)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 text-white font-bold text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Round 1</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {eventRounds.map((r) => {
                        const hasQuizzes = r.quizzes && r.quizzes.length > 0;
                        return (
                          <div
                            key={r.id || `${r.event_name}-${r.round_number}`}
                            className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-all hover:border-brand-300 dark:hover:border-brand-900/60 flex flex-col justify-between"
                          >
                          {/* Round Header Bar */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                              <Badge variant={getRoundBadgeVariant(r.round_number)} size="md">
                                Round {r.round_number}
                              </Badge>
                              <div>
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                  <span>{r.round_name || `Round ${r.round_number}`}</span>
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  {r.description || `${event.title} Tournament Round ${r.round_number}`}
                                </p>
                              </div>
                            </div>

                            {/* Round Action Controls: Edit, Delete, Add Quiz */}
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <button
                                onClick={() => handleOpenEditModal(r)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-brand-600 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors text-xs font-bold"
                                title="Edit & Rename Round"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              <button
                                onClick={() => handleOpenDeleteModal(r)}
                                className="p-1.5 rounded-xl text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-200 dark:border-rose-900/50 transition-colors"
                                title={`Delete Round ${r.round_number}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => navigate('/admin/schedule')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 dark:hover:bg-brand-900/60 border border-brand-200 dark:border-brand-800/60 text-brand-700 dark:text-brand-300 text-xs font-bold transition-colors"
                                title="Schedule examination in Quiz Schedule section"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Quiz Schedule</span>
                              </button>
                            </div>
                          </div>

                          {/* Round Metrics Strip */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-3 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
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

                          {/* Quizzes / Examinations Under This Round */}
                          <div className="space-y-2 mt-3">
                            <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Examinations in {r.round_name || `Round ${r.round_number}`}
                            </h4>

                            {!hasQuizzes ? (
                              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 bg-white/50 dark:bg-slate-900/30">
                                <p>No examinations configured for this round yet.</p>
                                <button
                                  onClick={() => navigate('/admin/schedule')}
                                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                                >
                                  <Calendar className="w-3 h-3" />
                                  <span>Configure Schedule in Quiz Schedule</span>
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-3">
                                {r.quizzes.map((q) => (
                                  <div
                                    key={q.id}
                                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between hover:border-brand-200 dark:hover:border-brand-900 transition-colors shadow-2xs"
                                  >
                                    <div>
                                      <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <h5 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                                          {q.title}
                                        </h5>
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

                                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
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
                                        onClick={() => navigate('/admin/schedule')}
                                        className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                                      >
                                        <Calendar className="w-3 h-3" />
                                        <span>Manage Schedule</span>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
        title={`Add Round to ${roundFormData.event_name || 'Event'}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateRoundSubmit} className="space-y-4 text-xs">
          {/* Target Event Info Box */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Event
            </span>
            <span className="font-bold text-slate-800 dark:text-white capitalize">
              {roundFormData.event_name}
            </span>
          </div>

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
              Sequential tournament round number (e.g. 1, 2, 3...)
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
              placeholder="e.g. Round 2 or Algorithmic Shootout"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Give this stage a recognizable name (e.g. Technical Viva, Championship Exam)
            </span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={roundFormData.description}
              onChange={(e) => setRoundFormData({ ...roundFormData, description: e.target.value })}
              placeholder="Coverage topics, progression rules, and stage structure..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 disabled:opacity-50 shadow-sm"
            >
              {submitting ? 'Adding...' : 'Add Round'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT ROUND MODAL (RENAME / EDIT) */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Round — ${targetRound?.round_name || `Round ${targetRound?.round_number}`}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleEditRoundSubmit} className="space-y-4 text-xs">
          {/* Target Event Info Box */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Event
            </span>
            <span className="font-bold text-slate-800 dark:text-white capitalize">
              {roundFormData.event_name}
            </span>
          </div>

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
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Edit the display name for this tournament stage
            </span>
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
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 disabled:opacity-50 shadow-sm"
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
        title={`Delete Round — ${targetRound?.round_name || `Round ${targetRound?.round_number}`}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Delete Tournament Round?</p>
              <p className="mt-1 text-xs">
                Are you sure you want to delete <strong>{targetRound?.round_name}</strong> from{' '}
                <em>{targetRound?.event_name}</em>?
              </p>
              {targetRound && (targetRound.quizzes_count > 0 || (targetRound.quizzes && targetRound.quizzes.length > 0)) && (
                <p className="mt-2 text-xs font-semibold text-rose-800 dark:text-rose-200">
                  ⚠️ Notice: This round contains {targetRound.quizzes_count || targetRound.quizzes.length} examination(s). Deleting this round will safely reassign those examinations to Round 1 of this event.
                </p>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleDeleteRoundSubmit(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-50 shadow-sm"
            >
              {submitting ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
