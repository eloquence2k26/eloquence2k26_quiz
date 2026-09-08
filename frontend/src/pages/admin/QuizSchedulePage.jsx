import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Layers, Play, CheckCircle2 } from 'lucide-react';
import { quizService } from '../../services/quizService';
import { formatDate } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';

export default function QuizSchedulePage() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const res = await quizService.getAllQuizzes();
      if (res.success) setQuizzes(res.data || []);
    } catch (e) {
      console.error('Error loading schedule:', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading text="Loading symposium exam schedule..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          Symposium Examination Schedule
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Timeline and window schedules for Round 1 Screening and Round 2 Grand Finals
        </p>
      </div>

      <div className="space-y-4">
        {quizzes.map((q) => (
          <div
            key={q.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={q.round_number === 2 ? 'purple' : 'primary'} size="sm">
                  Round {q.round_number}
                </Badge>
                <Badge
                  variant={q.status === 'Live' ? 'live' : q.status === 'Published' ? 'success' : 'warning'}
                  size="sm"
                >
                  {q.status}
                </Badge>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{q.title}</h3>
              <p className="text-xs text-slate-500 max-w-xl">{q.description}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-slate-400 block font-semibold">Start Window</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formatDate(q.start_date)} ({q.start_time})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">End Window</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formatDate(q.end_date)} ({q.end_time})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Allotted Duration</span>
                <span className="font-bold text-brand-600 dark:text-brand-400">{q.duration_minutes} Mins</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
