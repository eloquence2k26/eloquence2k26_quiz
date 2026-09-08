import React, { useState, useEffect } from 'react';
import { Plus, Upload, Search, Filter, Edit2, Copy, Trash2, HelpCircle, CheckCircle2 } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import QuestionModal from '../../components/admin/QuestionModal';
import CSVUploadModal from '../../components/admin/CSVUploadModal';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import { getRoundBadgeVariant } from '../../utils/formatters';

export default function QuestionsPage() {
  const toast = useToast();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState('ALL');
  const [filterRound, setFilterRound] = useState('ALL');

  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await adminService.getQuestions();
      if (res.success) {
        setQuestions(res.data || []);
      }
    } catch (err) {
      toast.error('Failed to load question bank');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedQuestion(null);
    setQuestionModalOpen(true);
  };

  const handleEdit = (q) => {
    setSelectedQuestion(q);
    setQuestionModalOpen(true);
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await adminService.duplicateQuestion(id);
      if (res.success) {
        toast.success('Question duplicated');
        fetchQuestions();
      }
    } catch (err) {
      toast.error('Failed to duplicate question');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this question from question bank?')) return;
    try {
      const res = await adminService.deleteQuestion(id);
      if (res.success) {
        toast.success('Question removed');
        fetchQuestions();
      }
    } catch (err) {
      toast.error('Failed to delete question');
    }
  };

  const handleSaveQuestion = async (formData) => {
    try {
      if (selectedQuestion) {
        const res = await adminService.updateQuestion(selectedQuestion.id, formData);
        if (res.success) {
          toast.success('Question updated successfully');
          setQuestionModalOpen(false);
          fetchQuestions();
        }
      } else {
        const res = await adminService.createQuestion(formData);
        if (res.success) {
          toast.success('Question added to bank');
          setQuestionModalOpen(false);
          fetchQuestions();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving question');
    }
  };

  const handleBulkUpload = async (parsedList) => {
    try {
      const res = await adminService.bulkUploadQuestions(parsedList);
      if (res.success) {
        toast.success(res.message);
        setCsvModalOpen(false);
        fetchQuestions();
      }
    } catch (err) {
      toast.error('Bulk upload failed');
    }
  };

  if (loading) return <Loading text="Loading question bank..." />;

  // Extract unique events across questions
  const events = Array.from(
    new Set(
      questions
        .flatMap((q) =>
          Array.isArray(q.events) && q.events.length > 0
            ? q.events
            : [q.event_name || 'Eloquence 2026']
        )
        .filter(Boolean)
    )
  );
  if (events.length === 0) events.push('Eloquence 2026');

  // Extract unique rounds across questions
  const distinctRounds = Array.from(
    new Set(
      questions
        .flatMap((q) =>
          Array.isArray(q.round_numbers) && q.round_numbers.length > 0
            ? q.round_numbers
            : [q.round_number || 1]
        )
        .map(Number)
        .filter(Boolean)
    )
  ).sort((a, b) => a - b);
  if (distinctRounds.length === 0) distinctRounds.push(1, 2);

  // Filter questions by Event, Round, and Search term
  let filtered = questions;
  if (filterEvent !== 'ALL') {
    filtered = filtered.filter((q) => {
      const evts = q.events || (q.event_name ? [q.event_name] : ['Eloquence 2026']);
      return evts.includes(filterEvent) || q.event_name === filterEvent;
    });
  }
  if (filterRound !== 'ALL') {
    const targetRound = parseInt(filterRound);
    filtered = filtered.filter((q) => {
      const rNums = q.round_numbers || (q.round_number ? [q.round_number] : [1]);
      return rNums.includes(targetRound) || q.round_number === targetRound;
    });
  }
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (q) =>
        q.question_text.toLowerCase().includes(term) ||
        (q.category && q.category.toLowerCase().includes(term)) ||
        (q.event_name && q.event_name.toLowerCase().includes(term))
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            MCQ Question Bank
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {questions.length} technical questions organized across symposium events and rounds
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCsvModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 shadow-sm"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Bulk CSV Import</span>
          </button>

          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar with Event and Rounds */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search questions by text or keyword..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
          />
        </div>

        {/* Event Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-semibold text-[11px]">Event:</span>
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Events</option>
            {events.map((evt) => (
              <option key={evt} value={evt}>
                {evt}
              </option>
            ))}
          </select>
        </div>

        {/* Rounds Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-semibold text-[11px]">Round:</span>
          <select
            value={filterRound}
            onChange={(e) => setFilterRound(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Rounds</option>
            {distinctRounds.map((r) => (
              <option key={r} value={r}>
                Round {r} {r === 1 ? '(Prelims)' : r === 2 ? '(Grand Finals)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Questions Cards List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-2">
            <HelpCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No questions found for the selected Event and Round
            </h3>
            <p className="text-xs text-slate-400">
              Try choosing "All Events" or "All Rounds", or add a new question to this selection.
            </p>
          </div>
        ) : (
          filtered.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black text-brand-600 dark:text-brand-400 font-mono">
                      #{idx + 1}
                    </span>

                    {/* Event Badge */}
                    <Badge variant="primary" size="sm">
                      {q.event_name || 'Eloquence 2026'}
                    </Badge>

                    {/* Round Badges */}
                    {(q.round_numbers && q.round_numbers.length > 0
                      ? q.round_numbers
                      : [q.round_number || 1]
                    ).map((r) => (
                      <Badge key={r} variant={getRoundBadgeVariant(r)} size="sm">
                        Round {r}
                      </Badge>
                    ))}

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
                      {q.difficulty}
                    </Badge>

                    <Badge variant="default" size="sm">
                      {q.category || 'General'}
                    </Badge>

                    <span className="text-xs text-slate-400 font-semibold">
                      +{q.marks} Marks (-{q.negative_marks})
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                    {q.question_text}
                  </h3>
                </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDuplicate(q.id)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100"
                  title="Duplicate Question"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleEdit(q)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100"
                  title="Edit Question"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                  title="Delete Question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Options Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${q.correct_answer === 'A' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 font-bold text-emerald-900 dark:text-emerald-200' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'}`}>
                <span className="w-5 h-5 rounded-md bg-white dark:bg-slate-700 flex items-center justify-center font-bold text-[10px]">A</span>
                <span>{q.option_a}</span>
              </div>
              <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${q.correct_answer === 'B' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 font-bold text-emerald-900 dark:text-emerald-200' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'}`}>
                <span className="w-5 h-5 rounded-md bg-white dark:bg-slate-700 flex items-center justify-center font-bold text-[10px]">B</span>
                <span>{q.option_b}</span>
              </div>
              <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${q.correct_answer === 'C' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 font-bold text-emerald-900 dark:text-emerald-200' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'}`}>
                <span className="w-5 h-5 rounded-md bg-white dark:bg-slate-700 flex items-center justify-center font-bold text-[10px]">C</span>
                <span>{q.option_c}</span>
              </div>
              <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${q.correct_answer === 'D' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 font-bold text-emerald-900 dark:text-emerald-200' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'}`}>
                <span className="w-5 h-5 rounded-md bg-white dark:bg-slate-700 flex items-center justify-center font-bold text-[10px]">D</span>
                <span>{q.option_d}</span>
              </div>
            </div>

            {q.explanation && (
              <p className="text-[11px] text-slate-500 italic bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl">
                💡 <strong>Explanation:</strong> {q.explanation}
              </p>
            )}
          </div>
        ))
      )}
      </div>

      {/* Modals */}
      <QuestionModal
        isOpen={questionModalOpen}
        onClose={() => setQuestionModalOpen(false)}
        onSave={handleSaveQuestion}
        initialData={selectedQuestion}
      />

      <CSVUploadModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onUpload={handleBulkUpload}
      />
    </div>
  );
}
