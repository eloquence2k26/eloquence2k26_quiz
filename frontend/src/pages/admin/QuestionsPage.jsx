import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Upload,
  Search,
  Filter,
  Edit2,
  Copy,
  Trash2,
  HelpCircle,
  CheckCircle2,
  BookOpen,
  Layers,
  Award,
  Sparkles,
  RotateCcw,
  Tag,
  Check,
  ChevronDown,
  ChevronUp,
  Clock
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { getSocket } from '../../services/socket';
import QuestionModal from '../../components/admin/QuestionModal';
import MultiFormatImportModal from '../../components/admin/MultiFormatImportModal';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import { getRoundBadgeVariant } from '../../utils/formatters';

export default function QuestionsPage() {
  const toast = useToast();
  const [questions, setQuestions] = useState([]);
  const [events, setEvents] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('ALL');

  // Modals state
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [targetEvent, setTargetEvent] = useState('Technical Quiz');
  const [targetRound, setTargetRound] = useState(1);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();

    // Real-time WebSocket synchronization across tabs & components
    const socket = getSocket();
    const handleSync = () => {
      fetchData(false);
    };

    socket.on('QUIZ_UPDATED', handleSync);
    socket.on('ROUND_STATUS_UPDATED', handleSync);
    socket.on('REFRESH_DASHBOARD', handleSync);

    return () => {
      socket.off('QUIZ_UPDATED', handleSync);
      socket.off('ROUND_STATUS_UPDATED', handleSync);
      socket.off('REFRESH_DASHBOARD', handleSync);
    };
  }, []);

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [roundsRes, eventsRes, questRes] = await Promise.all([
        adminService.getRounds().catch(() => ({ success: false, data: [] })),
        adminService.getEvents().catch(() => ({ success: false, data: [] })),
        adminService.getQuestions().catch(() => ({ success: false, data: [] }))
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
        setQuestions(questRes.data || []);
      }

      // Strictly use the actual events registered in Event Management plus any custom events from questions
      const eventMap = new Map();
      if (loadedEvents.length > 0) {
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
      }

      // Also ensure any event names present on questions are represented in eventMap
      const rawQuestionsList = questRes.data || [];
      rawQuestionsList.forEach((q) => {
        const qTitle = (q.event_name || '').trim();
        if (qTitle && !eventMap.has(qTitle.toLowerCase())) {
          eventMap.set(qTitle.toLowerCase(), {
            id: `ev-${qTitle.toLowerCase().replace(/\s+/g, '-')}`,
            title: qTitle,
            code: 'ELQ26',
            description: `${qTitle} tournament track`
          });
        }
      });

      if (eventMap.size === 0) {
        eventMap.set('technical quiz', {
          id: '55468583-a500-4aae-b342-c7664c52f784',
          title: 'Technical Quiz',
          code: 'ELQ26',
          description: 'Official symposium tournament track'
        });
      }

      const finalEvents = Array.from(eventMap.values());
      setEvents(finalEvents);
      // Align questions to existing event
      const primaryEventTitle = finalEvents[0]?.title || 'Technical Quiz';
      const alignedQuestions = (questRes.data || []).map((q) => {
        const qEvts = Array.isArray(q.events) && q.events.length > 0 ? q.events : (q.event_name ? [q.event_name] : []);
        const matchesAny = qEvts.some((e) => finalEvents.some((fe) => fe.title.toLowerCase() === e.toLowerCase()));
        if (!matchesAny) {
          return {
            ...q,
            event_name: primaryEventTitle,
            events: [primaryEventTitle]
          };
        }
        return q;
      });
      setQuestions(alignedQuestions);

      // Handle passed location state from RoundsPage or QuizzesPage
      if (location.state?.eventTitle) {
        setTargetEvent(location.state.eventTitle);
      } else if (finalEvents.length > 0) {
        setTargetEvent(finalEvents[0].title);
      }
      if (location.state?.roundNumber) {
        setTargetRound(Number(location.state.roundNumber));
      }
    } catch (err) {
      toast.error('Failed to load question repository');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Open Question Modal prefilled for a specific event and round
  const handleOpenAddQuestionForRound = (eventTitle, roundNum) => {
    setTargetEvent(eventTitle);
    setTargetRound(roundNum);
    setSelectedQuestion(null);
    setQuestionModalOpen(true);
  };

  // Open Multi-Format Import Modal prefilled for a specific event and round
  const handleOpenImportForRound = (eventTitle, roundNum) => {
    setTargetEvent(eventTitle);
    setTargetRound(roundNum);
    setImportModalOpen(true);
  };

  // Open Question Modal to edit an existing question
  const handleEditQuestion = (q) => {
    setSelectedQuestion(q);
    setTargetEvent(q.event_name || 'Technical Quiz');
    setTargetRound(q.round_number || 1);
    setQuestionModalOpen(true);
  };

  // Duplicate Question
  const handleDuplicate = async (id) => {
    try {
      const res = await adminService.duplicateQuestion(id);
      if (res.success) {
        toast.success('Question duplicated successfully');
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to duplicate question');
    }
  };

  // Delete Question
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this question from the round?')) return;
    try {
      const res = await adminService.deleteQuestion(id);
      if (res.success) {
        toast.success('Question removed successfully');
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to delete question');
    }
  };

  // Delete All Questions in Bank
  const handleDeleteAllQuestions = async () => {
    if (!window.confirm('⚠️ ARE YOU SURE? This will permanently delete ALL questions from the question bank!')) return;
    try {
      const res = await adminService.deleteAllQuestions();
      if (res && res.success !== false) {
        toast.success(res.message || 'All questions deleted successfully');
        fetchData();
      } else {
        toast.error(res?.message || 'Failed to delete questions');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete questions');
    }
  };

  // Delete All Questions for a Specific Round & Event
  const handleDeleteRoundQuestions = async (eventTitle, roundNum) => {
    if (!window.confirm(`Are you sure you want to delete all questions for ${eventTitle} Round ${roundNum}?`)) return;
    try {
      const res = await adminService.deleteAllQuestions({ event: eventTitle, round: roundNum });
      if (res && res.success !== false) {
        toast.success(res.message || `Deleted all questions for ${eventTitle} Round ${roundNum}`);
        fetchData();
      } else {
        toast.error(res?.message || 'Failed to clear round questions');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to clear round questions');
    }
  };

  // Save / Create Question handler
  const handleSaveQuestion = async (formData) => {
    try {
      if (selectedQuestion) {
        const res = await adminService.updateQuestion(selectedQuestion.id, formData);
        if (res.success) {
          toast.success('Question updated successfully');
          setQuestionModalOpen(false);
          fetchData();
        }
      } else {
        const res = await adminService.createQuestion({
          ...formData,
          event_name: formData.event_name || targetEvent,
          round_number: formData.round_number || targetRound
        });
        if (res.success) {
          toast.success(`Question added to ${targetEvent} Round ${targetRound}`);
          setQuestionModalOpen(false);
          fetchData();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving question');
    }
  };

  // Import questions success callback
  const handleImportSuccess = () => {
    toast.success('Questions imported successfully');
    fetchData();
  };

  // Reset search and filter toolbar
  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterDifficulty('ALL');
  };

  const isFiltered =
    filterDifficulty !== 'ALL' ||
    searchTerm.trim() !== '';

  if (loading) return <Loading text="Loading question repository, events & rounds..." />;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-widest mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Question Bank & Assessment Hub</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Question Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Author, configure, and bulk import examination questions organized by tournament tracks and rounds
          </p>
        </div>

        {questions.length > 0 && (
          <button
            onClick={handleDeleteAllQuestions}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm hover:shadow-md active:scale-95 self-start sm:self-auto"
            title="Delete all questions in the bank"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete All Questions</span>
          </button>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Competition Events
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{events.length}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Active tournament tracks</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Total Rounds
          </span>
          <p className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">{rounds.length}</p>
          <span className="text-[10px] text-slate-500 mt-1 block">Configured tournament stages</span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center gap-3 shadow-xs">
        {/* Keyword Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search questions across all rounds by keyword, choice, or explanation..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        {/* Difficulty Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-semibold text-[11px]">Difficulty:</span>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/70 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Levels</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        {/* Reset Filter Button */}
        {isFiltered && (
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Reset filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* EVENT CONTAINERS LIST */}
      <div className="space-y-8">
        {events.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Events Registered</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Please configure tournament events in Event Management before managing questions.
            </p>
          </div>
        ) : (
          events.map((event) => {
            // Find all rounds belonging to this event
            let eventRounds = rounds.filter(
              (r) =>
                (r.event_id && event.id && r.event_id === event.id) ||
                (r.event_name && event.title && r.event_name.toLowerCase() === event.title.toLowerCase())
            );

            // Ensure Round 1 is ALWAYS present in the questions repository for every event
            const hasRound1 = eventRounds.some((r) => Number(r.round_number) === 1);
            if (!hasRound1) {
              eventRounds.unshift({
                id: `rnd-${event.id || event.title}-1`,
                event_id: event.id,
                event_name: event.title,
                round_number: 1,
                round_name: 'Round 1',
                description: `${event.title} Examination Round 1`
              });
            }

            // If no Round 2 exists and event has 0 other rounds, also provide Round 2 slot
            if (eventRounds.length === 1 && Number(eventRounds[0].round_number) === 1) {
              eventRounds.push({
                id: `rnd-${event.id || event.title}-2`,
                event_id: event.id,
                event_name: event.title,
                round_number: 2,
                round_name: 'Round 2',
                description: `${event.title} Examination Round 2`
              });
            }

            // Sort rounds ascending by round_number (Round 1, Round 2, ...)
            eventRounds.sort((a, b) => (Number(a.round_number) || 0) - (Number(b.round_number) || 0));

            // Questions in this event
            const eventQuestions = questions.filter((q) => {
              const qEvts = Array.isArray(q.events) && q.events.length > 0 ? q.events : [q.event_name];
              return qEvts.some((e) => e && e.toLowerCase() === event.title.toLowerCase());
            });

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
                      <Badge variant="neutral" size="sm">
                        {eventQuestions.length} {eventQuestions.length === 1 ? 'Question' : 'Questions'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {event.description || `Official symposium competition question repository for ${event.title}`}
                    </p>
                  </div>
                </div>

                {/* 2-COLUMN GRID OF ROUNDS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {eventRounds.map((r) => {
                    // Filter questions that belong specifically to this round
                    const roundQuestions = questions.filter((q) => {
                      // Event match
                      const qEvts = Array.isArray(q.events) && q.events.length > 0 ? q.events : [q.event_name];
                      const matchEvent = qEvts.some((e) => e && e.toLowerCase() === event.title.toLowerCase());
                      if (!matchEvent) return false;

                      // Round number match
                      const qRounds = Array.isArray(q.round_numbers) && q.round_numbers.length > 0 ? q.round_numbers : [q.round_number];
                      const matchRound = qRounds.some((rn) => Number(rn) === Number(r.round_number));
                      if (!matchRound) return false;

                      // Difficulty match
                      if (filterDifficulty !== 'ALL') {
                        if (q.difficulty?.toLowerCase() !== filterDifficulty.toLowerCase()) return false;
                      }

                      // Keyword search match
                      if (searchTerm.trim()) {
                        const term = searchTerm.toLowerCase();
                        const textMatch = q.question_text?.toLowerCase().includes(term);
                        const optMatch =
                          q.option_a?.toLowerCase().includes(term) ||
                          q.option_b?.toLowerCase().includes(term) ||
                          q.option_c?.toLowerCase().includes(term) ||
                          q.option_d?.toLowerCase().includes(term);
                        const catMatch = q.category?.toLowerCase().includes(term);
                        const expMatch = q.explanation?.toLowerCase().includes(term);
                        if (!textMatch && !optMatch && !catMatch && !expMatch) return false;
                      }

                      return true;
                    });

                    // Round-specific metrics
                    const roundTotalMarks = roundQuestions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);

                    return (
                      <div
                        key={r.id || `${r.event_name}-${r.round_number}`}
                        className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-all hover:border-brand-300 dark:hover:border-brand-900/60 flex flex-col justify-between"
                      >
                        {/* Round Header Bar */}
                        <div>
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
                                  {r.description || `${event.title} Examination Round ${r.round_number}`}
                                </p>
                              </div>
                            </div>

                            {/* Round Action Controls: Import, Add Question & Clear Round */}
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              {roundQuestions.length > 0 && (
                                <button
                                  onClick={() => handleDeleteRoundQuestions(event.title, r.round_number)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors shadow-xs"
                                  title={`Delete all questions in Round ${r.round_number}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Clear Round</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenImportForRound(event.title, r.round_number)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors shadow-xs"
                                title={`Import questions directly into Round ${r.round_number}`}
                              >
                                <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Import</span>
                              </button>

                              <button
                                onClick={() => handleOpenAddQuestionForRound(event.title, r.round_number)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 dark:hover:bg-brand-900/60 border border-brand-200 dark:border-brand-800/60 text-brand-700 dark:text-brand-300 text-xs font-bold transition-colors shadow-xs"
                                title={`Add new question to Round ${r.round_number}`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Question</span>
                              </button>
                            </div>
                          </div>

                          {/* Round Metrics Strip */}
                          <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs">
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                              <span className="text-slate-600 dark:text-slate-400 truncate">
                                Questions: <strong className="text-slate-900 dark:text-white">{roundQuestions.length}</strong>
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="text-slate-600 dark:text-slate-400 truncate">
                                Total: <strong className="text-slate-900 dark:text-white">{roundTotalMarks} pts</strong>
                              </span>
                            </div>
                          </div>

                          {/* Questions In This Round Header */}
                          <div className="flex items-center justify-between mt-3 mb-2">
                            <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Questions in {r.round_name || `Round ${r.round_number}`}
                            </h4>
                            <span className="text-[10px] font-bold text-slate-400">
                              {roundQuestions.length} {roundQuestions.length === 1 ? 'Question' : 'Questions'}
                            </span>
                          </div>

                          {/* Questions In Round List / Empty State */}
                          {roundQuestions.length === 0 ? (
                            <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 bg-white/50 dark:bg-slate-900/30 space-y-2">
                              <HelpCircle className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                              <p className="font-semibold text-slate-600 dark:text-slate-400">
                                No questions added to {r.round_name || `Round ${r.round_number}`} yet.
                              </p>
                              <p className="text-[11px] text-slate-400">
                                Import questions from PDF, PPT, Word, Excel, CSV or author one manually.
                              </p>
                              <div className="flex items-center justify-center gap-2 pt-1">
                                <button
                                  onClick={() => handleOpenImportForRound(event.title, r.round_number)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800"
                                >
                                  <Upload className="w-3 h-3" />
                                  <span>Import to Round {r.round_number}</span>
                                </button>
                                <button
                                  onClick={() => handleOpenAddQuestionForRound(event.title, r.round_number)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold text-xs border border-brand-200 dark:border-brand-800"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add Question</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1 scrollbar-thin">
                              {roundQuestions.map((q, idx) => (
                                <div
                                  key={q.id || idx}
                                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 hover:border-brand-200 dark:hover:border-brand-900 transition-colors shadow-2xs"
                                >
                                  {/* Question Card Header */}
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-[11px] font-black text-brand-600 dark:text-brand-400 font-mono">
                                          #{idx + 1}
                                        </span>

                                        <Badge
                                          variant={
                                            q.difficulty === 'Hard'
                                              ? 'danger'
                                              : q.difficulty === 'Medium'
                                              ? 'warning'
                                              : 'success'
                                          }
                                          size="sm"
                                        >
                                          {q.difficulty || 'Medium'}
                                        </Badge>

                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                          +{q.marks} / -{q.negative_marks} pts
                                        </span>

                                        {((q.time_limit && Number(q.time_limit) > 0) || (q.time_limit_seconds && Number(q.time_limit_seconds) > 0)) && (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 px-2 py-0.5 rounded-md">
                                            <Clock className="w-3 h-3 text-amber-500" />
                                            <span>
                                              {(() => {
                                                const secs = Number(q.time_limit || q.time_limit_seconds || 0);
                                                const m = Math.floor(secs / 60);
                                                const s = secs % 60;
                                                if (m > 0 && s > 0) return `${m}m ${s}s`;
                                                if (m > 0) return `${m}m`;
                                                return `${s}s`;
                                              })()}
                                            </span>
                                          </span>
                                        )}
                                      </div>

                                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                                        {q.question_text}
                                      </h4>
                                    </div>

                                    {/* Action Buttons: Duplicate, Edit, Delete */}
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => handleDuplicate(q.id)}
                                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-brand-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        title="Duplicate Question"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleEditQuestion(q)}
                                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-brand-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                        title="Edit Question"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(q.id)}
                                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 text-rose-500 hover:text-white hover:bg-rose-600 transition-colors"
                                        title="Delete Question"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* 2x2 MCQ Choices Preview */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    {[
                                      { key: 'A', text: q.option_a },
                                      { key: 'B', text: q.option_b },
                                      { key: 'C', text: q.option_c },
                                      { key: 'D', text: q.option_d }
                                    ].map(({ key, text }) => {
                                      const isCorrect = q.correct_answer === key;
                                      return (
                                        <div
                                          key={key}
                                          className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 text-[11px] transition-all ${
                                            isCorrect
                                              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60 font-semibold text-emerald-900 dark:text-emerald-100 shadow-xs'
                                              : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span
                                              className={`w-4 h-4 rounded flex items-center justify-center font-bold text-[9px] shrink-0 ${
                                                isCorrect
                                                  ? 'bg-emerald-600 text-white'
                                                  : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                                              }`}
                                            >
                                              {key}
                                            </span>
                                            <span className="truncate">{text || '—'}</span>
                                          </div>
                                          {isCorrect && (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Optional Explanation */}
                                  {q.explanation && (
                                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1.5 leading-relaxed">
                                      <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">💡 Note:</span>
                                      <span>{q.explanation}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Question Modal (Prefilled for specific event and round) */}
      <QuestionModal
        isOpen={questionModalOpen}
        onClose={() => setQuestionModalOpen(false)}
        onSave={handleSaveQuestion}
        initialData={selectedQuestion}
        eventsList={events}
        roundsList={rounds}
        initialEvent={targetEvent}
        initialRound={targetRound}
      />

      {/* Multi-Format Import Modal (Prefilled for specific event and round) */}
      <MultiFormatImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={handleImportSuccess}
        eventsList={events}
        roundsList={rounds}
        initialEvent={targetEvent}
        initialRound={targetRound}
      />
    </div>
  );
}
