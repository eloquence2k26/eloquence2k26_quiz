import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Edit2,
  Trash2,
  Play,
  Square,
  Send,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Layers,
  HelpCircle,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Lock,
  Unlock,
  BookOpen,
  Award,
  Users
} from 'lucide-react';
import { quizService } from '../../services/quizService';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { formatDate, getRoundBadgeVariant } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import ModifyScheduleModal from '../../components/admin/ModifyScheduleModal';

export default function QuizSchedulePage() {
  const toast = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [events, setEvents] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterRound, setFilterRound] = useState('ALL');

  // Modals state
  const [modifyModalOpen, setModifyModalOpen] = useState(false);
  const [selectedQuizForSchedule, setSelectedQuizForSchedule] = useState(null);

  useEffect(() => {
    fetchData();

    // Live background polling every 15s to keep schedule & auto-publishing in sync
    const interval = setInterval(() => {
      quizService
        .getAllQuizzes()
        .then((res) => {
          if (res.success && res.data) setQuizzes(res.data);
        })
        .catch(() => {});
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [quizRes, eventsRes, roundsRes] = await Promise.all([
        quizService.getAllQuizzes(),
        adminService.getEvents().catch(() => ({ success: false, data: [] })),
        adminService.getRounds().catch(() => ({ success: false, data: [] }))
      ]);

      let loadedQuizzes = [];
      let loadedEvents = [];

      if (quizRes.success) {
        loadedQuizzes = quizRes.data || [];
        setQuizzes(loadedQuizzes);
      }
      if (eventsRes.success) {
        loadedEvents = eventsRes.data || [];
      }
      if (roundsRes.success) {
        setRounds(roundsRes.data || []);
      }

      // Merge distinct events from events, quizzes, and rounds
      const eventMap = new Map();
      loadedEvents.forEach((ev) => {
        const title = typeof ev === 'string' ? ev : ev.title;
        if (title) {
          eventMap.set(title.toLowerCase(), {
            id: ev.id || `ev-${title.toLowerCase().replace(/\s+/g, '-')}`,
            title: title,
            code: ev.code || 'ELQ26',
            description: ev.description || `${title} tournament track`
          });
        }
      });

      loadedQuizzes.forEach((q) => {
        const title = q.event_name || q.title;
        if (title && !eventMap.has(title.toLowerCase())) {
          eventMap.set(title.toLowerCase(), {
            id: q.event_id || `ev-${title.toLowerCase().replace(/\s+/g, '-')}`,
            title: title,
            code: q.event_code || 'ELQ26',
            description: q.description || `${title} examination track`
          });
        }
      });

      if (eventMap.size === 0) {
        eventMap.set('technical quiz', {
          id: 'c0000000-0000-0000-0000-000000000001',
          title: 'Technical Quiz',
          code: 'ELQ26',
          description: 'Official National Symposium Technical MCQ Championship'
        });
      }

      setEvents(Array.from(eventMap.values()));
    } catch (e) {
      toast.error('Failed to load examination schedules');
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---

  // Create New Schedule (dedicated to timing and schedule parameters)
  const handleCreateSchedule = (event = null) => {
    const targetEvent = event || events[0];
    setSelectedQuizForSchedule({
      id: null,
      event_id: targetEvent?.id,
      event_name: targetEvent?.title || 'Technical Quiz',
      event_code: targetEvent?.code || 'ELQ26',
      title: `${targetEvent?.title || 'Symposium'} - Examination`,
      round_number: 1,
      duration_minutes: 30,
      start_date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      end_time: '23:59',
      status: 'Scheduled',
      entry_window_minutes: 5,
      allow_late_entry: false
    });
    setModifyModalOpen(true);
  };

  // Open Modify Schedule Modal
  const handleOpenModifySchedule = (quiz) => {
    setSelectedQuizForSchedule(quiz);
    setModifyModalOpen(true);
  };

  // Save Schedule Modification (Create or Update)
  const handleSaveScheduleModification = async (updatedQuizData) => {
    try {
      let res;
      if (updatedQuizData.id) {
        res = await quizService.updateQuiz(updatedQuizData.id, updatedQuizData);
      } else {
        res = await quizService.createQuiz(updatedQuizData);
      }
      if (res.success) {
        toast.success(updatedQuizData.id ? 'Schedule parameters updated successfully' : 'Schedule created successfully');
        setModifyModalOpen(false);
        setSelectedQuizForSchedule(null);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving schedule');
    }
  };

  // Direct Status Change (Publish, Unpublish, Go Live, Stop)
  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await quizService.updateStatus(id, newStatus);
      if (res.success) {
        if (newStatus === 'Published') {
          toast.success('Quiz schedule published! Participants can now view and prepare.');
        } else if (newStatus === 'Draft') {
          toast.info('Quiz schedule unpublished and moved back to Draft.');
        } else if (newStatus === 'Live') {
          toast.success('Exam is now LIVE! Qualified scholars can now begin.');
        } else if (newStatus === 'Completed') {
          toast.info('Exam concluded and closed.');
        } else {
          toast.success(`Exam status updated to ${newStatus}`);
        }
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to change examination status');
    }
  };

  // Toggle Late Entry Permission (Admin Override after 5 mins)
  const handleToggleLateEntry = async (id, allowLate) => {
    try {
      const res = await quizService.toggleLateEntry(id, allowLate);
      if (res.success) {
        toast.success(res.message || (allowLate ? 'Late entry unlocked' : 'Late entry locked'));
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update late entry settings');
    }
  };

  // Delete Schedule
  const handleDeleteSchedule = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will remove all schedule parameters and attempts.`)) {
      return;
    }

    try {
      const res = await quizService.deleteQuiz(id);
      if (res.success) {
        toast.success('Examination schedule deleted');
        fetchData();
      }
    } catch (err) {
      toast.error('Error deleting quiz schedule');
    }
  };

  // Helper for Window Status Badge
  const getWindowStatus = (quiz) => {
    if (!quiz.start_date || !quiz.end_date) return null;
    const now = new Date().getTime();
    const startTime = quiz.start_time || '00:00:00';
    const endTime = quiz.end_time || '23:59:59';
    const start = new Date(`${quiz.start_date}T${startTime}`).getTime();
    const end = new Date(`${quiz.end_date}T${endTime}`).getTime();

    if (now < start) {
      return { label: 'Upcoming Window', variant: 'warning' };
    } else if (now >= start && now <= end) {
      return { label: 'Active Window', variant: 'success' };
    } else {
      return { label: 'Window Concluded', variant: 'default' };
    }
  };

  // Filter Quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      const matchesStatus = filterStatus === 'ALL' || q.status === filterStatus;
      const matchesRound = filterRound === 'ALL' || Number(q.round_number) === Number(filterRound);
      const matchesSearch =
        !searchTerm.trim() ||
        q.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.event_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.description?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStatus && matchesRound && matchesSearch;
    });
  }, [quizzes, filterStatus, filterRound, searchTerm]);

  // Summary Metrics
  const totalCount = quizzes.length;
  const liveCount = quizzes.filter((q) => q.status === 'Live').length;
  const scheduledCount = quizzes.filter((q) => q.status === 'Scheduled').length;
  const publishedCount = quizzes.filter((q) => q.status === 'Published').length;
  const completedCount = quizzes.filter((q) => q.status === 'Completed' || q.status === 'Closed').length;

  const isFiltered = filterStatus !== 'ALL' || filterRound !== 'ALL' || searchTerm.trim() !== '';

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
    setFilterRound('ALL');
  };

  if (loading) return <Loading text="Loading symposium examination schedules & timeline..." />;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-widest mb-1">
            <Calendar className="w-4 h-4" />
            <span>Symposium Timeline & Windows</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Quiz Schedule & Publication Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure examination windows, automate scheduled publications, and manage 5-minute entry controls
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={fetchData}
            title="Refresh Schedules"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleCreateSchedule()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule New Exam</span>
          </button>
        </div>
      </div>

      {/* 4-Column KPI Overview Cards (Matching Rounds & Questions Hub) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Examinations
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalCount}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Configured tournament stages</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">
            Live Active
          </span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{liveCount}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Currently taking submissions</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-purple-500 uppercase tracking-wider block">
            Scheduled / Auto-Pub
          </span>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{scheduledCount}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Auto-publishes at start time</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider block">
            Published / Ready
          </span>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{publishedCount}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Visible for participants</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center gap-3 shadow-xs">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search exam title, event track, or parameters..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-semibold text-[11px]">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Live">Live Active</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-semibold text-[11px]">Round:</span>
          <select
            value={filterRound}
            onChange={(e) => setFilterRound(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Rounds</option>
            <option value="1">Round 1</option>
            <option value="2">Round 2</option>
            <option value="3">Round 3</option>
          </select>
        </div>

        {isFiltered && (
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* EVENT CONTAINERS LIST (Matching Rounds and Questions Architecture) */}
      <div className="space-y-8">
        {events.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Events Configured</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Please register an event in Event Management before scheduling examinations.
            </p>
          </div>
        ) : (
          events.map((event) => {
            // Find all quizzes belonging to this event
            const eventQuizzes = filteredQuizzes.filter((q) => {
              const matchName = q.event_name && q.event_name.toLowerCase() === event.title.toLowerCase();
              const matchTitle = q.title && q.title.toLowerCase().includes(event.title.toLowerCase());
              const matchId = q.event_id && event.id && q.event_id === event.id;
              return matchName || matchTitle || matchId;
            });

            // Sort quizzes by round_number
            eventQuizzes.sort((a, b) => (Number(a.round_number) || 0) - (Number(b.round_number) || 0));

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
                        {eventQuizzes.length} {eventQuizzes.length === 1 ? 'Exam' : 'Exams'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {event.description || `Official symposium competition schedule and timelines for ${event.title}`}
                    </p>
                  </div>

                  <button
                    onClick={() => handleCreateSchedule(event)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm shadow-brand-500/20 transition-all self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Schedule Exam</span>
                  </button>
                </div>

                {/* 2-COLUMN GRID OF SCHEDULED ROUNDS */}
                {eventQuizzes.length === 0 ? (
                  <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-800/20 space-y-2">
                    <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      No Scheduled Examinations for {event.title}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Configure exam start dates, duration, and auto-publishing parameters.
                    </p>
                    <div className="pt-2">
                      <button
                        onClick={() => handleCreateSchedule(event)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 text-white font-bold text-xs shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Schedule Round 1</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {eventQuizzes.map((q) => {
                      const winStatus = getWindowStatus(q);
                      const entryStatus = q.entry_window_status;

                      return (
                        <div
                          key={q.id}
                          className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-all hover:border-brand-300 dark:hover:border-brand-900/60 flex flex-col justify-between space-y-4"
                        >
                          {/* Round Header Bar */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <Badge variant={getRoundBadgeVariant(q.round_number)} size="md">
                                  Round {q.round_number || 1}
                                </Badge>
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

                              {winStatus && (
                                <Badge variant={winStatus.variant} size="sm">
                                  {winStatus.label}
                                </Badge>
                              )}
                            </div>

                            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                              {q.title}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                              {q.description || 'Official tournament examination'}
                            </p>
                          </div>

                          {/* Timeline & Schedule Strip */}
                          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
                            <div>
                              <span className="text-slate-400 block font-semibold text-[10px] uppercase">
                                Start
                              </span>
                              <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                                {formatDate(q.start_date)}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono block">
                                {q.start_time ? q.start_time.slice(0, 5) : '09:00'}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-400 block font-semibold text-[10px] uppercase">
                                End
                              </span>
                              <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                                {formatDate(q.end_date)}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono block">
                                {q.end_time ? q.end_time.slice(0, 5) : '23:59'}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-400 block font-semibold text-[10px] uppercase">
                                Duration
                              </span>
                              <span className="font-bold text-brand-600 dark:text-brand-400 block">
                                {q.duration_minutes} Mins
                              </span>
                              <span className="text-[10px] text-slate-400 block">Per attempt</span>
                            </div>
                          </div>

                          {/* 5-Minute Entry Window Protocol Strip */}
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-2">
                            {/* Auto-Publish Notice */}
                            {q.status === 'Scheduled' && (
                              <div className="flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 font-semibold bg-purple-50 dark:bg-purple-950/40 p-2 rounded-lg">
                                <span className="flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                  <span>Auto-publishes at {q.start_time ? q.start_time.slice(0, 5) : 'start time'}</span>
                                </span>
                                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">5m Entry Window</span>
                              </div>
                            )}

                            {/* Entry Window Status Display */}
                            {(q.status === 'Live' || q.status === 'Published') && (
                              <div className="space-y-1.5">
                                {entryStatus?.isEntryOpen && (
                                  <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 p-2 rounded-lg font-medium">
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                      <span>5-Minute Entry Window Active</span>
                                    </span>
                                    {entryStatus.remainingEntrySeconds > 0 && (
                                      <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                                        {Math.ceil(entryStatus.remainingEntrySeconds / 60)}m left
                                      </span>
                                    )}
                                  </div>
                                )}

                                {entryStatus?.isEntryClosed && (
                                  <div className="flex items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 p-2 rounded-lg">
                                    <span className="flex items-center gap-1.5 font-medium">
                                      <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                      <span>Entry Closed (5m passed)</span>
                                    </span>
                                    <button
                                      onClick={() => handleToggleLateEntry(q.id, true)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 transition-colors shadow-2xs"
                                    >
                                      <Unlock className="w-3 h-3" />
                                      <span>Allow Late Entry</span>
                                    </button>
                                  </div>
                                )}

                                {entryStatus?.isLateAllowed && (
                                  <div className="flex items-center justify-between gap-2 text-xs text-purple-800 dark:text-purple-200 bg-purple-50 dark:bg-purple-950/50 p-2 rounded-lg">
                                    <span className="flex items-center gap-1.5 font-medium">
                                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                                      <span>Late Entry Allowed by Admin</span>
                                    </span>
                                    <button
                                      onClick={() => handleToggleLateEntry(q.id, false)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold text-[11px] hover:bg-purple-100 transition-colors"
                                    >
                                      <Lock className="w-3 h-3" />
                                      <span>Lock Entry</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Metadata parameters chips */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <div className="flex flex-wrap items-center gap-2">
                                <span><strong>{q.total_questions || 0}</strong> Questions</span>
                                <span>•</span>
                                <span><strong>{q.max_marks || 0}</strong> Marks</span>
                                <span>•</span>
                                <span>Pass: <strong>{q.pass_percentage || 40}%</strong></span>
                                <span>•</span>
                                <span className={q.negative_marking ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                                  {q.negative_marking ? `Neg: -${q.negative_mark_value || 0.5}` : 'No Neg.'}
                                </span>
                              </div>

                              {/* Assigned Participants Link */}
                              <Link
                                to={`/admin/participants?event=${encodeURIComponent(q.event_name || q.title)}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/60 border border-brand-200/60 dark:border-brand-800/40 transition-all shadow-2xs"
                                title="View assigned participants for this quiz"
                              >
                                <Users className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                                <span>{q.assigned_participants_count || 0} Assigned Scholars</span>
                              </Link>
                            </div>
                          </div>

                          {/* Decongested Clean Actions Toolbar */}
                          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                            {/* Primary Contextual Action */}
                            <div>
                              {q.status === 'Live' ? (
                                <button
                                  onClick={() => handleStatusChange(q.id, 'Completed')}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 transition-all shadow-2xs"
                                >
                                  <Square className="w-3.5 h-3.5" />
                                  <span>Stop Live Exam</span>
                                </button>
                              ) : q.status === 'Published' ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleStatusChange(q.id, 'Live')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition-all shadow-2xs"
                                  >
                                    <Play className="w-3.5 h-3.5" />
                                    <span>Go Live</span>
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(q.id, 'Draft')}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="Unpublish back to Draft"
                                  >
                                    <EyeOff className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : q.status === 'Completed' || q.status === 'Closed' ? (
                                <span className="text-[11px] font-bold text-slate-400 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                                  Concluded
                                </span>
                              ) : q.status === 'Scheduled' ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleStatusChange(q.id, 'Live')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition-all shadow-2xs"
                                    title="Start exam immediately and grant access to participants"
                                  >
                                    <Play className="w-3.5 h-3.5" />
                                    <span>Start Now (Go Live)</span>
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(q.id, 'Published')}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 transition-all"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Publish</span>
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(q.id, 'Published')}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Publish Schedule</span>
                                </button>
                              )}

                            </div>

                            {/* Secondary Tooling: Modify Schedule, Configure, Delete */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenModifySchedule(q)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-brand-600 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
                                title="Modify schedule dates, times, and duration"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>Modify Schedule</span>
                              </button>

                              <button
                                onClick={() => handleDeleteSchedule(q.id, q.title)}
                                className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-500 hover:text-white hover:bg-rose-600 transition-colors"
                                title="Delete schedule"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modify Schedule Window Modal */}
      <ModifyScheduleModal
        isOpen={modifyModalOpen}
        onClose={() => {
          setModifyModalOpen(false);
          setSelectedQuizForSchedule(null);
        }}
        onSave={handleSaveScheduleModification}
        quiz={selectedQuizForSchedule}
      />
    </div>
  );
}
