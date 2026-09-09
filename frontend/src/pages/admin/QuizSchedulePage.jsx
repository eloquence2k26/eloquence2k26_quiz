import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Filter,
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
  ShieldCheck
} from 'lucide-react';
import { quizService } from '../../services/quizService';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { formatDate, getRoundBadgeVariant } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import ModifyScheduleModal from '../../components/admin/ModifyScheduleModal';
import QuizModal from '../../components/admin/QuizModal';

export default function QuizSchedulePage() {
  const toast = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRound, setFilterRound] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modals state
  const [modifyModalOpen, setModifyModalOpen] = useState(false);
  const [selectedQuizForSchedule, setSelectedQuizForSchedule] = useState(null);

  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [selectedQuizForFullEdit, setSelectedQuizForFullEdit] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [quizRes, questRes] = await Promise.all([
        quizService.getAllQuizzes(),
        adminService.getQuestions()
      ]);
      if (quizRes.success) setQuizzes(quizRes.data || []);
      if (questRes.success) setQuestions(questRes.data || []);
    } catch (e) {
      toast.error('Failed to load examination schedules');
      console.error('Error loading schedule:', e.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---

  // 1. Create New Schedule
  const handleCreateSchedule = () => {
    setSelectedQuizForFullEdit(null);
    setQuizModalOpen(true);
  };

  // 2. Open Dedicated Modify Schedule Modal
  const handleOpenModifySchedule = (quiz) => {
    setSelectedQuizForSchedule(quiz);
    setModifyModalOpen(false); // reset if open
    setTimeout(() => {
      setSelectedQuizForSchedule(quiz);
      setModifyModalOpen(true);
    }, 10);
  };

  // 3. Open Full Quiz Edit Modal
  const handleOpenFullEdit = async (quiz) => {
    try {
      const res = await quizService.getQuizById(quiz.id);
      if (res.success) {
        setSelectedQuizForFullEdit(res.data);
        setQuizModalOpen(true);
      } else {
        setSelectedQuizForFullEdit(quiz);
        setQuizModalOpen(true);
      }
    } catch (err) {
      // Fallback to quiz item
      setSelectedQuizForFullEdit(quiz);
      setQuizModalOpen(true);
    }
  };

  // 4. Save Quick Schedule Modification
  const handleSaveScheduleModification = async (updatedQuizData) => {
    try {
      const res = await quizService.updateQuiz(updatedQuizData.id, updatedQuizData);
      if (res.success) {
        toast.success(
          updatedQuizData.status === 'Published'
            ? 'Schedule updated & quiz officially published!'
            : 'Schedule parameters updated successfully'
        );
        setModifyModalOpen(false);
        setSelectedQuizForSchedule(null);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating schedule');
    }
  };

  // 5. Save Full Quiz Edit
  const handleSaveFullQuiz = async (formData) => {
    try {
      if (selectedQuizForFullEdit) {
        const res = await quizService.updateQuiz(selectedQuizForFullEdit.id, formData);
        if (res.success) {
          toast.success('Examination configuration updated successfully');
          setQuizModalOpen(false);
          fetchData();
        }
      } else {
        const res = await quizService.createQuiz(formData);
        if (res.success) {
          toast.success('New examination scheduled successfully');
          setQuizModalOpen(false);
          fetchData();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving examination');
    }
  };

  // 6. Direct Quick Status Change (Publish, Unpublish, Go Live, Stop)
  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await quizService.updateStatus(id, newStatus);
      if (res.success) {
        if (newStatus === 'Published') {
          toast.success('Quiz schedule published! Participants can now view and prepare for this exam.');
        } else if (newStatus === 'Draft') {
          toast.info('Quiz schedule unpublished and moved back to Draft.');
        } else if (newStatus === 'Live') {
          toast.success('Exam is now LIVE! Qualified scholars can now begin their session.');
        } else {
          toast.success(`Exam status updated to ${newStatus}`);
        }
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to change examination status');
    }
  };

  // 7. Delete Schedule
  const handleDeleteSchedule = async (id, title) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${title}"? This will also remove any attempt logs and question associations.`
      )
    ) {
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

  // Distinct rounds present in quizzes
  const distinctRounds = Array.from(
    new Set(quizzes.map((q) => Number(q.round_number)).filter(Boolean))
  ).sort((a, b) => a - b);
  if (distinctRounds.length === 0) distinctRounds.push(1, 2);

  // Filter Quizzes
  const filteredQuizzes = quizzes.filter((q) => {
    const matchesRound = filterRound === 'ALL' || q.round_number === parseInt(filterRound);
    const matchesStatus = filterStatus === 'ALL' || q.status === filterStatus;
    const matchesSearch =
      !searchTerm ||
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.description && q.description.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesRound && matchesStatus && matchesSearch;
  });

  // Calculate Summary Stats
  const totalCount = quizzes.length;
  const publishedCount = quizzes.filter((q) => q.status === 'Published').length;
  const liveCount = quizzes.filter((q) => q.status === 'Live').length;
  const scheduledCount = quizzes.filter((q) => q.status === 'Scheduled').length;
  const draftCount = quizzes.filter((q) => q.status === 'Draft').length;

  if (loading) return <Loading text="Loading symposium exam schedule & controls..." />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
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
            Configure examination windows, modify durations, edit full parameters, and publish rounds
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            title="Refresh Schedules"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleCreateSchedule}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule New Exam</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Exams</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{totalCount}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">Live Active</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">{liveCount}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider block">Published</span>
          <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">{publishedCount}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block">Scheduled</span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">{scheduledCount}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Draft / Offline</span>
          <span className="text-2xl font-black text-slate-600 dark:text-slate-400 mt-1 block">{draftCount}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search exam title or topic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        {/* Round and Status Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-semibold text-[11px]">Round:</span>
            <select
              value={filterRound}
              onChange={(e) => setFilterRound(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">All Rounds</option>
              {distinctRounds.map((r) => (
                <option key={r} value={r}>
                  Round {r} {r === 1 ? '(Prelims)' : r === 2 ? '(Grand Finals)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-semibold text-[11px]">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              <option value="ALL">All Statuses</option>
              <option value="Published">Published</option>
              <option value="Live">Live</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Draft">Draft</option>
              <option value="Completed">Completed</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Examination Schedules List */}
      {filteredQuizzes.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No examination schedules found
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm || filterRound !== 'ALL' || filterStatus !== 'ALL'
              ? 'No quizzes match your selected filter criteria. Try adjusting your search or filters.'
              : 'Get started by creating and scheduling your symposium rounds.'}
          </p>
          <button
            onClick={handleCreateSchedule}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule First Exam</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuizzes.map((q) => {
            const winStatus = getWindowStatus(q);

            return (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col gap-6"
              >
                {/* Upper Details Block */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left: Info & Badges */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getRoundBadgeVariant(q.round_number)} size="sm">
                        Round {q.round_number} {q.round_number === 1 ? '• Screening' : q.round_number === 2 ? '• Grand Finals' : ''}
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

                      {winStatus && (
                        <Badge variant={winStatus.variant} size="sm">
                          {winStatus.label}
                        </Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {q.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 max-w-2xl">
                      {q.description || 'No description provided.'}
                    </p>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <HelpCircle className="w-3.5 h-3.5 text-brand-500" />
                        {q.total_questions || 0} Questions ({q.max_marks || 0} Marks)
                      </span>
                      <span>•</span>
                      <span>Pass: <strong>{q.pass_percentage || 40}%</strong></span>
                      <span>•</span>
                      <span>
                        Negative Marking:{' '}
                        <strong className={q.negative_marking ? 'text-rose-600' : 'text-slate-400'}>
                          {q.negative_marking ? `Yes (-${q.negative_mark_value || 0.5})` : 'Disabled'}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Violations limit: <strong>{q.max_violations || 3}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Right: Schedule Window Stats Box */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0 lg:max-w-md w-full">
                    <div>
                      <span className="text-slate-400 block font-semibold text-[11px]">Start Window</span>
                      <span className="font-bold text-slate-900 dark:text-white block mt-0.5">
                        {formatDate(q.start_date)}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-mono">
                        {q.start_time || '00:00:00'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-semibold text-[11px]">End Window</span>
                      <span className="font-bold text-slate-900 dark:text-white block mt-0.5">
                        {formatDate(q.end_date)}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-mono">
                        {q.end_time || '23:59:59'}
                      </span>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-slate-400 block font-semibold text-[11px]">Exam Duration</span>
                      <span className="font-black text-brand-600 dark:text-brand-400 text-sm block mt-0.5">
                        {q.duration_minutes} Mins
                      </span>
                      <span className="text-[10px] text-slate-400 block">Timer on start</span>
                    </div>
                  </div>
                </div>

                {/* Lower Action & Publish Controls Toolbar */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  {/* Left: Direct Publish & Quick Status Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* 1. Quick Publish Button */}
                    {q.status !== 'Published' && (
                      <button
                        onClick={() => handleStatusChange(q.id, 'Published')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all"
                        title="Publish this exam to participants"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Publish</span>
                      </button>
                    )}

                    {/* 2. Quick Unpublish Button (if published) */}
                    {q.status === 'Published' && (
                      <button
                        onClick={() => handleStatusChange(q.id, 'Draft')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 transition-all"
                        title="Unpublish back to Draft"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Unpublish</span>
                      </button>
                    )}

                    {/* 3. Go Live / Stop Live Exam */}
                    {q.status !== 'Live' ? (
                      <button
                        onClick={() => handleStatusChange(q.id, 'Live')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 transition-all"
                        title="Start live exam immediately"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Go Live</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(q.id, 'Completed')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 transition-all"
                        title="Conclude live exam"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>Stop Exam</span>
                      </button>
                    )}

                    {/* 4. Quick Status Switcher Dropdown */}
                    <div className="flex items-center gap-1 pl-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Status:</span>
                      <select
                        value={q.status}
                        onChange={(e) => handleStatusChange(q.id, e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Published">Published</option>
                        <option value="Live">Live</option>
                        <option value="Completed">Completed</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                  </div>

                  {/* Right: Edit & Modify Options */}
                  <div className="flex items-center gap-2">
                    {/* Modify Schedule Window Button */}
                    <button
                      onClick={() => handleOpenModifySchedule(q)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 border border-brand-200 dark:border-brand-800 transition-all"
                      title="Modify dates, times, and duration window"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Modify Schedule</span>
                    </button>

                    {/* Full Configuration Edit */}
                    <button
                      onClick={() => handleOpenFullEdit(q)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
                      title="Edit all options (questions, marks, proctoring, etc.)"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>All Edit Options</span>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteSchedule(q.id, q.title)}
                      className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all"
                      title="Delete Schedule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modify Schedule Dedicated Modal */}
      <ModifyScheduleModal
        isOpen={modifyModalOpen}
        onClose={() => {
          setModifyModalOpen(false);
          setSelectedQuizForSchedule(null);
        }}
        onSave={handleSaveScheduleModification}
        quiz={selectedQuizForSchedule}
      />

      {/* Full Quiz Configuration Modal */}
      <QuizModal
        isOpen={quizModalOpen}
        onClose={() => {
          setQuizModalOpen(false);
          setSelectedQuizForFullEdit(null);
        }}
        onSave={handleSaveFullQuiz}
        initialData={selectedQuizForFullEdit}
        allQuestions={questions}
      />
    </div>
  );
}
