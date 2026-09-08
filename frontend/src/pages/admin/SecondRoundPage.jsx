import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Calendar, Clock, HelpCircle, Users, Play, Edit2, Sparkles, CheckCircle2 } from 'lucide-react';
import { quizService } from '../../services/quizService';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/formatters';
import QuizModal from '../../components/admin/QuizModal';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';

export default function SecondRoundPage() {
  const toast = useToast();
  const [round2Quiz, setRound2Quiz] = useState(null);
  const [qualifiers, setQualifiers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quizModalOpen, setQuizModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [qRes, pRes, questRes] = await Promise.all([
        quizService.getAllQuizzes(),
        adminService.getParticipants({ round_1_selected: 'true' }),
        adminService.getQuestions()
      ]);

      if (qRes.success && qRes.data) {
        const r2 = qRes.data.find((q) => q.round_number === 2);
        setRound2Quiz(r2 || null);
      }
      if (pRes.success) setQualifiers(pRes.data || []);
      if (questRes.success) setQuestions(questRes.data || []);
    } catch (err) {
      toast.error('Failed to load Round 2 setup');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!round2Quiz) return;
    try {
      const res = await quizService.updateStatus(round2Quiz.id, newStatus);
      if (res.success) {
        toast.success(`Round 2 status changed to ${newStatus}`);
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to change status');
    }
  };

  const handleSaveQuiz = async (formData) => {
    try {
      if (round2Quiz) {
        const res = await quizService.updateQuiz(round2Quiz.id, formData);
        if (res.success) {
          toast.success('Round 2 Quiz updated');
          setQuizModalOpen(false);
          fetchData();
        }
      } else {
        const res = await quizService.createQuiz({ ...formData, round_number: 2 });
        if (res.success) {
          toast.success('Round 2 Quiz created');
          setQuizModalOpen(false);
          fetchData();
        }
      }
    } catch (err) {
      toast.error('Error saving Round 2 Quiz');
    }
  };

  if (loading) return <Loading text="Loading Round 2 parameters & finalist roster..." />;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-widest mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Grand Finals & Championship Round</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Round 2 Examination Engine
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dedicated environment reserved exclusively for verified Round 1 qualifiers
          </p>
        </div>

        {round2Quiz && (
          <div className="flex items-center gap-2">
            {round2Quiz.status !== 'Live' ? (
              <button
                onClick={() => handleStatusChange('Live')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20"
              >
                <Play className="w-4 h-4" />
                <span>Go Live with Round 2</span>
              </button>
            ) : (
              <button
                onClick={() => handleStatusChange('Completed')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700"
              >
                Stop Round 2 Exam
              </button>
            )}

            <button
              onClick={() => setQuizModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 shadow-sm"
            >
              <Edit2 className="w-4 h-4" />
              <span>Configure Round 2</span>
            </button>
          </div>
        )}
      </div>

      {/* Round 2 Quiz Overview Card */}
      {round2Quiz ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <Badge variant="purple" size="sm">Round 2 Grand Finals</Badge>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-2">
                {round2Quiz.title}
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">{round2Quiz.description}</p>
            </div>

            <Badge
              variant={round2Quiz.status === 'Live' ? 'live' : round2Quiz.status === 'Published' ? 'success' : 'warning'}
              size="md"
            >
              {round2Quiz.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 block font-semibold">Start Window</span>
              <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                {formatDate(round2Quiz.start_date)} • {round2Quiz.start_time}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 block font-semibold">Duration</span>
              <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                {round2Quiz.duration_minutes} Minutes
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 block font-semibold">Total MCQs</span>
              <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                {round2Quiz.total_questions} Questions
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 block font-semibold">Negative Marking</span>
              <span className="font-bold text-rose-600 dark:text-rose-400 mt-0.5 block">
                {round2Quiz.negative_marking ? `-${round2Quiz.negative_mark_value} Mark` : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
          <p className="text-xs text-slate-400">Round 2 Quiz is not created yet.</p>
          <button
            onClick={() => {
              setRound2Quiz(null);
              setQuizModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700"
          >
            Create Round 2 Quiz Now
          </button>
        </div>
      )}

      {/* Eligible Qualifiers Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Qualified Finalists Roster ({qualifiers.length} Scholars)
          </h3>
          <Link
            to="/admin/round-selection"
            className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
          >
            Manage Qualifiers Selection
          </Link>
        </div>

        {qualifiers.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No participants selected for Round 2 yet. Please use Round Selection to qualify top candidates.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Participant ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">College & Dept</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-right">Round 2 Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {qualifiers.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                      {p.participant_id}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {p.full_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-slate-800 dark:text-slate-200">{p.college}</p>
                      <p className="text-[10px] text-slate-400">{p.department}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {p.email}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Badge variant="success" size="sm">Authorized Access</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quiz Modal */}
      <QuizModal
        isOpen={quizModalOpen}
        onClose={() => setQuizModalOpen(false)}
        onSave={handleSaveQuiz}
        initialData={round2Quiz}
        allQuestions={questions}
      />
    </div>
  );
}
