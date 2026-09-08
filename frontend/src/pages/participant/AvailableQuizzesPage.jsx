import React, { useState, useEffect } from 'react';
import { Search, Filter, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { quizService } from '../../services/quizService';
import QuizCard from '../../components/participant/QuizCard';
import Loading from '../../components/common/Loading';

export default function AvailableQuizzesPage() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRound, setFilterRound] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await quizService.getAllQuizzes();
        if (res.success) setQuizzes(res.data || []);
      } catch (err) {
        console.error('Error loading quizzes:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  if (loading) return <Loading text="Loading available examinations..." />;

  let filtered = quizzes;
  if (filterRound !== 'ALL') {
    filtered = filtered.filter((q) => q.round_number === parseInt(filterRound));
  }
  if (searchTerm) {
    filtered = filtered.filter((q) =>
      q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.description && q.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Available Examinations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select an exam to begin your session or view completed results
          </p>
        </div>

        {/* Filter and Search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search quiz title..."
              className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={filterRound}
            onChange={(e) => setFilterRound(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <option value="ALL">All Rounds</option>
            <option value="1">Round 1 (Prelims)</option>
            <option value="2">Round 2 (Grand Finals)</option>
          </select>
        </div>
      </div>

      {/* Quizzes Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-xs text-slate-400">
          No examinations match your current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((q) => (
            <QuizCard key={q.id} quiz={q} participant={user?.participant} />
          ))}
        </div>
      )}
    </div>
  );
}
