import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, BookOpen, Clock, HelpCircle } from 'lucide-react';
import { quizService } from '../../services/quizService';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import QuizModal from '../../components/admin/QuizModal';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import { formatDate, getRoundBadgeVariant } from '../../utils/formatters';

export default function QuizzesPage() {
  const toast = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [qRes, questRes] = await Promise.all([
        quizService.getAllQuizzes(),
        adminService.getQuestions()
      ]);
      if (qRes.success) setQuizzes(qRes.data || []);
      if (questRes.success) setQuestions(questRes.data || []);
    } catch (err) {
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedQuiz(null);
    setModalOpen(true);
  };

  const handleEdit = async (quiz) => {
    try {
      const res = await quizService.getQuizById(quiz.id);
      if (res.success) {
        setSelectedQuiz(res.data);
        setModalOpen(true);
      }
    } catch (err) {
      toast.error('Failed to load quiz details');
    }
  };

  const handleSave = async (formData) => {
    try {
      if (selectedQuiz) {
        const res = await quizService.updateQuiz(selectedQuiz.id, formData);
        if (res.success) {
          toast.success('Event updated successfully');
          setModalOpen(false);
          fetchData();
        }
      } else {
        const res = await quizService.createQuiz(formData);
        if (res.success) {
          toast.success('Event created successfully');
          setModalOpen(false);
          fetchData();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving event');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event? All related attempt logs will be removed.')) return;
    try {
      const res = await quizService.deleteQuiz(id);
      if (res.success) {
        toast.success('Event deleted successfully');
        fetchData();
      }
    } catch (err) {
      toast.error('Error deleting event');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await quizService.updateStatus(id, newStatus);
      if (res.success) {
        toast.success(`Status updated to ${newStatus}`);
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <Loading text="Loading events..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Event & Examination Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create, configure, schedule, and publish symposium events and competitive rounds
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create Event</span>
        </button>
      </div>

      {/* Events List / Empty State */}
      {quizzes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto border border-brand-200 dark:border-brand-800">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Events Configured Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Get started by creating your symposium competition events and setting up examination rounds.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {quizzes.map((q) => (
            <div
              key={q.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    {q.event_code && (
                      <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {q.event_code}
                      </span>
                    )}
                    <Badge variant={getRoundBadgeVariant(q.round_number)} size="sm">
                      Round {q.round_number}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
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
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white">{q.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{q.description}</p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 py-3 border-y border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-brand-500" />
                    <span>{q.duration_minutes} Mins</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-brand-500" />
                    <span>{q.total_questions} Questions</span>
                  </div>
                  <div>
                    <span>Max Marks: <strong>{q.max_marks}</strong></span>
                  </div>
                </div>
              </div>

              {/* Admin Controls Footer */}
              <div className="mt-6 pt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {q.status === 'Draft' ? (
                    <button
                      onClick={() => handleStatusChange(q.id, 'Published')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                    >
                      Publish
                    </button>
                  ) : q.status === 'Published' ? (
                    <button
                      onClick={() => handleStatusChange(q.id, 'Draft')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
                    >
                      Unpublish
                    </button>
                  ) : null}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleEdit(q)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Edit Event"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                    title="Delete Event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quiz Modal */}
      <QuizModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={selectedQuiz}
        allQuestions={questions}
      />
    </div>
  );
}
