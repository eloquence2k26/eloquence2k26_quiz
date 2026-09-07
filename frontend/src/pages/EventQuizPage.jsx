import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  Clock, 
  Award, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Search,
  Layers,
  RefreshCw
} from 'lucide-react';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { API_BASE_URL } from '../config/apiConfig';
const API_QUIZZES_URL = `${API_BASE_URL}/api/quizzes`;

export const EventQuizPage = () => {
  const { role } = useAuth();

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modals state
  const [isCreateQuizOpen, setIsCreateQuizOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [deletingQuiz, setDeletingQuiz] = useState(null);

  // Form states for Event Quiz
  const [quizTitle, setQuizTitle] = useState('');
  const [quizCategory, setQuizCategory] = useState('General Technology');
  const [quizDuration, setQuizDuration] = useState('30');
  const [quizTotalMarks, setQuizTotalMarks] = useState('100');
  const [quizStatus, setQuizStatus] = useState('Active');

  const showNotification = (msg, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  // Fetch quizzes from API
  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_QUIZZES_URL);
      if (res.ok) {
        const data = await res.json();
        if (data.quizzes) {
          setQuizzes(data.quizzes);
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

  // Create Event Quiz
  const handleCreateQuizSubmit = async (e) => {
    e.preventDefault();
    if (!quizTitle) {
      showNotification('Quiz title / Event name is required.', true);
      return;
    }

    try {
      const res = await fetch(API_QUIZZES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quizTitle,
          category: quizCategory,
          duration: quizDuration,
          total_marks: quizTotalMarks,
          status: quizStatus
        })
      });

      if (res.ok) {
        const data = await res.json();
        showNotification(`Event Quiz "${data.quiz.title}" created successfully!`);
        setIsCreateQuizOpen(false);
        resetQuizForm();
        fetchQuizzes();
      }
    } catch (err) {
      showNotification(`Failed to create event quiz: ${err.message}`, true);
    }
  };

  // Edit Event Quiz
  const handleEditQuizSubmit = async (e) => {
    e.preventDefault();
    if (!editingQuiz || !quizTitle) return;

    try {
      const res = await fetch(`${API_QUIZZES_URL}/${editingQuiz.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quizTitle,
          category: quizCategory,
          duration: quizDuration,
          total_marks: quizTotalMarks,
          status: quizStatus
        })
      });

      if (res.ok) {
        showNotification(`Updated Event Quiz details for "${quizTitle}".`);
        setEditingQuiz(null);
        resetQuizForm();
        fetchQuizzes();
      }
    } catch (err) {
      showNotification(`Failed to update quiz: ${err.message}`, true);
    }
  };

  // Delete Event Quiz
  const handleDeleteQuizConfirm = async () => {
    if (!deletingQuiz) return;
    try {
      const res = await fetch(`${API_QUIZZES_URL}/${deletingQuiz.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showNotification(`Event Quiz "${deletingQuiz.title}" deleted successfully.`);
        setDeletingQuiz(null);
        fetchQuizzes();
      }
    } catch (err) {
      showNotification(`Failed to delete event quiz: ${err.message}`, true);
    }
  };

  const openEditModal = (q) => {
    setEditingQuiz(q);
    setQuizTitle(q.title || '');
    setQuizCategory(q.category || 'General Technology');
    setQuizDuration(String(q.duration || 30));
    setQuizTotalMarks(String(q.total_marks || 100));
    setQuizStatus(q.status || 'Active');
  };

  const resetQuizForm = () => {
    setQuizTitle('');
    setQuizCategory('General Technology');
    setQuizDuration('30');
    setQuizTotalMarks('100');
    setQuizStatus('Active');
  };

  const filteredQuizzes = quizzes.filter((q) => {
    const term = searchTerm.toLowerCase();
    return (
      (q.title && q.title.toLowerCase().includes(term)) ||
      (q.category && q.category.toLowerCase().includes(term)) ||
      (q.status && q.status.toLowerCase().includes(term))
    );
  });

  const activeCount = quizzes.filter((q) => q.status === 'Active' || !q.status).length;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* Top Banner Header */}
      <section className="basic-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Event Quiz Management
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Event Quiz Directory
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Create, edit, and delete Event Quiz rounds for Eloquence 2K26.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchQuizzes()}
              title="Refresh Event Quizzes"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl transition-all border border-slate-200 dark:border-zinc-800 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <span className="px-3.5 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold rounded-xl text-xs shadow-sm">
              Active: <strong className="text-blue-600 dark:text-blue-400">{activeCount}</strong> / {quizzes.length} Events
            </span>

            {role === 'admin' && (
              <Button
                variant="primary"
                icon={PlusCircle}
                onClick={() => {
                  resetQuizForm();
                  setIsCreateQuizOpen(true);
                }}
              >
                Create Event Quiz
              </Button>
            )}
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

        {/* Search Bar */}
        <div className="pt-2">
          <Input
            id="quiz-search"
            type="text"
            placeholder="Search event quizzes by quiz name, category, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={Search}
          />
        </div>
      </section>

      {/* Quizzes Table */}
      <section className="basic-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/90 dark:bg-zinc-900/90 border-b border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Event Quiz Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Total Marks</th>
                <th className="px-6 py-4">Status</th>
                {role === 'admin' && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 dark:text-zinc-400 font-medium">
                    Loading Event Quizzes...
                  </td>
                </tr>
              ) : filteredQuizzes.length > 0 ? (
                filteredQuizzes.map((quiz) => (
                  <tr key={quiz.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{quiz.title}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-semibold text-slate-700 dark:text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>{quiz.category || 'General'}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{quiz.duration || 30} Mins</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        <span>{quiz.total_marks || 100} pts</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        quiz.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                          : quiz.status === 'Scheduled'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800'
                          : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-zinc-900 dark:text-zinc-400'
                      }`}>
                        {quiz.status || 'Active'}
                      </span>
                    </td>

                    {role === 'admin' && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(quiz)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Edit Event Quiz"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingQuiz(quiz)}
                            className="p-1.5 text-slate-600 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Delete Event Quiz"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 dark:text-zinc-400 font-medium">
                    No event quizzes matching "{searchTerm}" found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Create Event Quiz Modal */}
      {isCreateQuizOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-2xl">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Create Event Quiz</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Add a new competition round</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateQuizOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuizSubmit} className="space-y-4">
              <Input
                id="create-quiz-title"
                label="Event Quiz Name / Title"
                type="text"
                placeholder="e.g. Eloquence 2K26 - Technical Quiz Round 1"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                icon={Sparkles}
                required
              />

              <Input
                id="create-quiz-category"
                label="Category / Theme"
                type="text"
                placeholder="e.g. Artificial Intelligence & Web Dev"
                value={quizCategory}
                onChange={(e) => setQuizCategory(e.target.value)}
                icon={Layers}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="create-quiz-duration"
                  label="Duration (Mins)"
                  type="number"
                  placeholder="30"
                  value={quizDuration}
                  onChange={(e) => setQuizDuration(e.target.value)}
                  icon={Clock}
                  required
                />

                <Input
                  id="create-quiz-marks"
                  label="Total Marks"
                  type="number"
                  placeholder="100"
                  value={quizTotalMarks}
                  onChange={(e) => setQuizTotalMarks(e.target.value)}
                  icon={Award}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">Status</label>
                <select
                  value={quizStatus}
                  onChange={(e) => setQuizStatus(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Active (Live Round)</option>
                  <option value="Scheduled">Scheduled (Upcoming)</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setIsCreateQuizOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  icon={PlusCircle}
                >
                  Create Quiz
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Quiz Modal */}
      {editingQuiz && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-2xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Event Quiz</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Update event quiz parameters</p>
                </div>
              </div>
              <button
                onClick={() => setEditingQuiz(null)}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditQuizSubmit} className="space-y-4">
              <Input
                id="edit-quiz-title"
                label="Event Quiz Name / Title"
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                icon={Sparkles}
                required
              />

              <Input
                id="edit-quiz-category"
                label="Category"
                type="text"
                value={quizCategory}
                onChange={(e) => setQuizCategory(e.target.value)}
                icon={Layers}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="edit-quiz-duration"
                  label="Duration (Mins)"
                  type="number"
                  value={quizDuration}
                  onChange={(e) => setQuizDuration(e.target.value)}
                  icon={Clock}
                  required
                />

                <Input
                  id="edit-quiz-marks"
                  label="Total Marks"
                  type="number"
                  value={quizTotalMarks}
                  onChange={(e) => setQuizTotalMarks(e.target.value)}
                  icon={Award}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">Status</label>
                <select
                  value={quizStatus}
                  onChange={(e) => setQuizStatus(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Active (Live Round)</option>
                  <option value="Scheduled">Scheduled (Upcoming)</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setEditingQuiz(null)}
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

      {/* Delete Event Quiz Confirmation Modal */}
      {deletingQuiz && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-3 bg-red-100 dark:bg-red-950/60 rounded-2xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Event Quiz</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white">{deletingQuiz.title}</strong> from the database?
            </p>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setDeletingQuiz(null)}
              >
                Cancel
              </Button>
              <button
                onClick={handleDeleteQuizConfirm}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Delete Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
