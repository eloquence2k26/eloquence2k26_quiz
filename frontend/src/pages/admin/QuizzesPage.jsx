import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Play, Square, Eye, EyeOff, BookOpen, Clock, HelpCircle } from 'lucide-react';
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
          toast.success('Quiz updated successfully');
          setModalOpen(false);
          fetchData();
        }
      } else {
        const res = await quizService.createQuiz(formData);
        if (res.success) {
          toast.success('Quiz created successfully');
          setModalOpen(false);
          fetchData();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving quiz');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this quiz? All related attempt logs will be removed.')) return;
    try {
      const res = await quizService.deleteQuiz(id);
      if (res.success) {
        toast.success('Quiz deleted successfully');
        fetchData();
      }
    } catch (err) {
      toast.error('Error deleting quiz');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await quizService.updateStatus(id, newStatus);
      if (res.success) {
        toast.success(`Quiz status updated to ${newStatus}`);
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <Loading text="Loading quizzes..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Quiz & Examination Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create, configure, schedule, and publish symposium MCQ examinations
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Quiz</span>
        </button>
      </div>

      {/* Quizzes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quizzes.map((q) => (
          <div
            key={q.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <Badge variant={getRoundBadgeVariant(q.round_number)} size="sm">
                  Round {q.round_number}
                </Badge>
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
                {q.status !== 'Live' ? (
                  <button
                    onClick={() => handleStatusChange(q.id, 'Live')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                    title="Start Live Exam"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Go Live</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusChange(q.id, 'Completed')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200"
                    title="Stop Live Exam"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Stop Exam</span>
                  </button>
                )}

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
                  title="Edit Quiz"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                  title="Delete Quiz"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

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
