import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CalendarClock, 
  HelpCircle, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  RefreshCw,
  Save
} from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { API_BASE_URL } from '../config/apiConfig';

const API_QUIZZES_URL = `${API_BASE_URL}/api/quizzes`;

export const QuizSchedulePage = () => {
  const { role } = useAuth();

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Schedule form state
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // Question Modals state
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [deletingQuestion, setDeletingQuestion] = useState(null);

  // Form state for Question
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctOption, setCorrectOption] = useState('A');
  const [points, setPoints] = useState('10');

  const showNotification = (msg, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  // Fetch quizzes
  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_QUIZZES_URL);
      if (res.ok) {
        const data = await res.json();
        if (data.quizzes) {
          setQuizzes(data.quizzes);
          // Set default selected quiz if none selected
          if (data.quizzes.length > 0 && !selectedQuizId) {
            setSelectedQuizId(data.quizzes[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      showNotification('Failed to connect to backend quizzes service.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  // Update Schedule timing inputs when selected quiz changes
  const selectedQuiz = quizzes.find((q) => String(q.id) === String(selectedQuizId)) || quizzes[0];

  useEffect(() => {
    if (selectedQuiz) {
      if (selectedQuiz.start_time) {
        const dStart = new Date(selectedQuiz.start_time);
        setStartTime(dStart.toISOString().slice(0, 16));
      } else {
        setStartTime('');
      }

      if (selectedQuiz.end_time) {
        const dEnd = new Date(selectedQuiz.end_time);
        setEndTime(dEnd.toISOString().slice(0, 16));
      } else {
        setEndTime('');
      }
    }
  }, [selectedQuizId, quizzes]);

  // Compute live timing status
  const getTimingStatus = (quiz) => {
    if (!quiz) return 'Scheduled';
    if (!quiz.start_time || !quiz.end_time) return quiz.status || 'Active';
    
    const now = new Date();
    const start = new Date(quiz.start_time);
    const end = new Date(quiz.end_time);

    if (now >= start && now <= end) return 'Live';
    if (now < start) return 'Scheduled';
    return 'Closed';
  };

  // Save Schedule Timing
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!selectedQuizId) {
      showNotification('Please select an event quiz to schedule.', true);
      return;
    }
    if (!startTime || !endTime) {
      showNotification('Please provide both Start Date/Time and End Date/Time.', true);
      return;
    }

    try {
      const res = await fetch(`${API_QUIZZES_URL}/${selectedQuizId}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString()
        })
      });

      if (res.ok) {
        showNotification(`Quiz timing schedule saved for "${selectedQuiz.title}"! Users will be allowed to start within this window.`);
        fetchQuizzes();
      }
    } catch (err) {
      showNotification(`Failed to save schedule timing: ${err.message}`, true);
    }
  };

  // Add Question to Event
  const handleAddQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedQuizId) return;
    if (!questionPrompt || !optionA || !optionB || !optionC || !optionD) {
      showNotification('Please fill in question prompt and all 4 options.', true);
      return;
    }

    try {
      const res = await fetch(`${API_QUIZZES_URL}/${selectedQuizId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: questionPrompt,
          optionA,
          optionB,
          optionC,
          optionD,
          correctOption,
          points
        })
      });

      if (res.ok) {
        showNotification(`Question successfully added to "${selectedQuiz.title}"!`);
        setIsAddQuestionOpen(false);
        resetQuestionForm();
        fetchQuizzes();
      }
    } catch (err) {
      showNotification(`Failed to add question: ${err.message}`, true);
    }
  };

  // Edit Question
  const handleEditQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedQuizId || !editingQuestion) return;

    try {
      const res = await fetch(`${API_QUIZZES_URL}/${selectedQuizId}/questions/${editingQuestion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: questionPrompt,
          optionA,
          optionB,
          optionC,
          optionD,
          correctOption,
          points
        })
      });

      if (res.ok) {
        showNotification('Question details updated successfully.');
        setEditingQuestion(null);
        resetQuestionForm();
        fetchQuizzes();
      }
    } catch (err) {
      showNotification(`Failed to edit question: ${err.message}`, true);
    }
  };

  // Delete Question
  const handleDeleteQuestionConfirm = async () => {
    if (!selectedQuizId || !deletingQuestion) return;
    try {
      const res = await fetch(`${API_QUIZZES_URL}/${selectedQuizId}/questions/${deletingQuestion.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showNotification('Question removed from event quiz.');
        setDeletingQuestion(null);
        fetchQuizzes();
      }
    } catch (err) {
      showNotification(`Failed to remove question: ${err.message}`, true);
    }
  };

  const openEditQuestionModal = (qn) => {
    setEditingQuestion(qn);
    setQuestionPrompt(qn.prompt || qn.questionText || '');
    setOptionA(qn.optionA || '');
    setOptionB(qn.optionB || '');
    setOptionC(qn.optionC || '');
    setOptionD(qn.optionD || '');
    setCorrectOption(qn.correctOption || 'A');
    setPoints(String(qn.points || 10));
  };

  const resetQuestionForm = () => {
    setQuestionPrompt('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setCorrectOption('A');
    setPoints('10');
  };

  const filteredQuizzes = quizzes.filter((q) => {
    const term = searchTerm.toLowerCase();
    return (
      (q.title && q.title.toLowerCase().includes(term)) ||
      (q.category && q.category.toLowerCase().includes(term))
    );
  });

  const liveQuizzesCount = quizzes.filter((q) => getTimingStatus(q) === 'Live').length;
  const scheduledCount = quizzes.filter((q) => getTimingStatus(q) === 'Scheduled').length;
  const questionsList = selectedQuiz ? (selectedQuiz.questions || []) : [];

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* Top Banner Header */}
      <section className="basic-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <CalendarClock className="w-3.5 h-3.5" /> Quiz Schedule & Event Questions
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Quiz Scheduling & Question Hub
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Select an event quiz, set start and end start timing window for participant login, and manage all questions inside.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchQuizzes()}
              title="Refresh Quizzes"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl transition-all border border-slate-200 dark:border-zinc-800 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 font-bold rounded-xl text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Live: <strong>{liveQuizzesCount}</strong>
            </span>

            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800 font-bold rounded-xl text-xs">
              Scheduled: <strong>{scheduledCount}</strong>
            </span>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="p-1 hover:opacity-75">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="p-1 hover:opacity-75">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Event Selector & Schedule Timing Form */}
        <div className="lg:col-span-1 space-y-6">
          <section className="basic-card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-base">
                <CalendarClock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span>Configure Schedule</span>
              </div>
            </div>

            {/* Event Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
                Select Event Quiz
              </label>
              <select
                value={selectedQuizId}
                onChange={(e) => setSelectedQuizId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title} ({getTimingStatus(q)})
                  </option>
                ))}
              </select>
            </div>

            {selectedQuiz && (
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-zinc-900/80 border border-blue-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{selectedQuiz.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    getTimingStatus(selectedQuiz) === 'Live'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : getTimingStatus(selectedQuiz) === 'Scheduled'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}>
                    {getTimingStatus(selectedQuiz)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Category: {selectedQuiz.category} | Duration: {selectedQuiz.duration} Mins | Questions: {questionsList.length}
                </p>
              </div>
            )}

            {/* Schedule Form */}
            {role === 'admin' && selectedQuiz && (
              <form onSubmit={handleSaveSchedule} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
                    Quiz Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
                    Quiz End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  icon={Save}
                >
                  Save & Set Schedule
                </Button>
              </form>
            )}
          </section>
        </div>

        {/* Right Column: Questions Inside Selected Event */}
        <div className="lg:col-span-2 space-y-6">
          <section className="basic-card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Questions ({questionsList.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  {selectedQuiz ? selectedQuiz.title : 'Select an Event Quiz'}
                </p>
              </div>

              {role === 'admin' && selectedQuiz && (
                <Button
                  variant="primary"
                  icon={PlusCircle}
                  onClick={() => {
                    resetQuestionForm();
                    setIsAddQuestionOpen(true);
                  }}
                >
                  Add Question to Event
                </Button>
              )}
            </div>

            {/* Questions List */}
            {questionsList.length > 0 ? (
              <div className="space-y-4">
                {questionsList.map((qn, idx) => (
                  <div key={qn.id || idx} className="p-5 rounded-2xl bg-slate-50/80 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <div className="font-semibold text-sm text-slate-900 dark:text-white">
                        <span className="text-blue-600 dark:text-blue-400 font-bold mr-2">Q{idx + 1}.</span>
                        {qn.prompt || qn.questionText}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full text-[10px] font-bold">
                          {qn.points || 10} pts
                        </span>

                        {role === 'admin' && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditQuestionModal(qn)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                              title="Edit Question"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setDeletingQuestion(qn)}
                              className="p-1.5 text-slate-600 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                              title="Delete Question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                      {['A', 'B', 'C', 'D'].map((optKey) => {
                        const optionText = qn[`option${optKey}`];
                        const isCorrect = (qn.correctOption || 'A').toUpperCase() === optKey;
                        return (
                          <div
                            key={optKey}
                            className={`p-2.5 rounded-xl border font-medium flex items-center justify-between ${
                              isCorrect
                                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-semibold'
                                : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800'
                            }`}
                          >
                            <span><strong>{optKey}:</strong> {optionText}</span>
                            {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl space-y-3">
                <HelpCircle className="w-10 h-10 mx-auto text-slate-400" />
                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-zinc-400">No questions added to this event quiz yet.</p>
                {role === 'admin' && selectedQuiz && (
                  <Button
                    variant="primary"
                    icon={PlusCircle}
                    onClick={() => {
                      resetQuestionForm();
                      setIsAddQuestionOpen(true);
                    }}
                  >
                    Add First Question to {selectedQuiz.title}
                  </Button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Add Question Modal */}
      {isAddQuestionOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-2xl">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Add Question to Event</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Target Event: {selectedQuiz?.title}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddQuestionOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddQuestionSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Question Statement <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter the question statement..."
                  value={questionPrompt}
                  onChange={(e) => setQuestionPrompt(e.target.value)}
                  className="block w-full rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  id="opt-a"
                  label="Option A"
                  type="text"
                  placeholder="Option A text"
                  value={optionA}
                  onChange={(e) => setOptionA(e.target.value)}
                  required
                />
                <Input
                  id="opt-b"
                  label="Option B"
                  type="text"
                  placeholder="Option B text"
                  value={optionB}
                  onChange={(e) => setOptionB(e.target.value)}
                  required
                />
                <Input
                  id="opt-c"
                  label="Option C"
                  type="text"
                  placeholder="Option C text"
                  value={optionC}
                  onChange={(e) => setOptionC(e.target.value)}
                  required
                />
                <Input
                  id="opt-d"
                  label="Option D"
                  type="text"
                  placeholder="Option D text"
                  value={optionD}
                  onChange={(e) => setOptionD(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">Correct Option</label>
                  <select
                    value={correctOption}
                    onChange={(e) => setCorrectOption(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>

                <Input
                  id="qn-points"
                  label="Points / Marks"
                  type="number"
                  placeholder="10"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  icon={Award}
                  required
                />
              </div>

              <div className="pt-4 flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setIsAddQuestionOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  icon={PlusCircle}
                >
                  Save Question
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-2xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Question</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Target Event: {selectedQuiz?.title}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingQuestion(null)}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditQuestionSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Question Statement <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={questionPrompt}
                  onChange={(e) => setQuestionPrompt(e.target.value)}
                  className="block w-full rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  id="edit-opt-a"
                  label="Option A"
                  type="text"
                  value={optionA}
                  onChange={(e) => setOptionA(e.target.value)}
                  required
                />
                <Input
                  id="edit-opt-b"
                  label="Option B"
                  type="text"
                  value={optionB}
                  onChange={(e) => setOptionB(e.target.value)}
                  required
                />
                <Input
                  id="edit-opt-c"
                  label="Option C"
                  type="text"
                  value={optionC}
                  onChange={(e) => setOptionC(e.target.value)}
                  required
                />
                <Input
                  id="edit-opt-d"
                  label="Option D"
                  type="text"
                  value={optionD}
                  onChange={(e) => setOptionD(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">Correct Option</label>
                  <select
                    value={correctOption}
                    onChange={(e) => setCorrectOption(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>

                <Input
                  id="edit-qn-points"
                  label="Points / Marks"
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  icon={Award}
                  required
                />
              </div>

              <div className="pt-4 flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setEditingQuestion(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  icon={Edit3}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Question Modal */}
      {deletingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-3 bg-red-100 dark:bg-red-950/60 rounded-2xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Question</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Remove from {selectedQuiz?.title}</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
              Are you sure you want to remove this question statement from <strong className="text-slate-900 dark:text-white">{selectedQuiz?.title}</strong>?
            </p>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setDeletingQuestion(null)}
              >
                Cancel
              </Button>
              <button
                onClick={handleDeleteQuestionConfirm}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Delete Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
