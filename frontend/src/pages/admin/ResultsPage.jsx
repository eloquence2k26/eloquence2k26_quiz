import React, { useState, useEffect } from 'react';
import { Award, Download, Search, Filter, CheckCircle2, ShieldAlert } from 'lucide-react';
import { quizService } from '../../services/quizService';
import { examService } from '../../services/examService';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';

export default function ResultsPage() {
  const toast = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCollege, setFilterCollege] = useState('');

  useEffect(() => {
    fetchQuizzes();
  }, []);

  useEffect(() => {
    if (selectedQuizId) {
      fetchResults();
    }
  }, [selectedQuizId]);

  const fetchQuizzes = async () => {
    try {
      const res = await quizService.getAllQuizzes();
      if (res.success && res.data?.length > 0) {
        setQuizzes(res.data);
        setSelectedQuizId(res.data[0].id);
      }
    } catch (err) {
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const fetchResults = async () => {
    if (!selectedQuizId) return;
    try {
      const res = await examService.getQuizResults(selectedQuizId);
      if (res.success) {
        setResultsData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load leaderboard results');
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await adminService.exportQuizResultsCSV(selectedQuizId);
      if (res.success && res.data?.rows) {
        const rows = res.data.rows;
        if (rows.length === 0) {
          toast.info('No results to export yet');
          return;
        }

        const headers = Object.keys(rows[0]).join(',');
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows.map((r) => Object.values(r).join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `${res.data.quiz_title || 'quiz'}_results.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV downloaded successfully');
      }
    } catch (err) {
      toast.error('Export failed');
    }
  };

  if (loading) return <Loading text="Loading official scores & leaderboards..." />;

  const results = resultsData?.results || [];

  let filtered = results;
  if (filterCollege) {
    filtered = filtered.filter((r) => r.college && r.college.toLowerCase().includes(filterCollege.toLowerCase()));
  }
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter((r) =>
      r.participant_name.toLowerCase().includes(term) ||
      r.participant_id_str.toLowerCase().includes(term) ||
      r.college.toLowerCase().includes(term)
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Leaderboard & Results Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Official ranking tables, positive/negative marks breakdown, and qualification records
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedQuizId}
            onChange={(e) => setSelectedQuizId(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
          >
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                Round {q.round_number}: {q.title}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by participant name, ID, or college..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
          />
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Participant ID</th>
                <th className="py-3 px-4">Name & College</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Correct / Wrong</th>
                <th className="py-3 px-4">Time Taken</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Round Selection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No graded examination results for this quiz yet.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-black text-sm text-amber-500">
                      #{r.rank || 1}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                      {r.participant_id_str}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{r.participant_name}</p>
                      <p className="text-[10px] text-slate-400">{r.college}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-black text-slate-900 dark:text-white text-sm">{r.final_score} pts</span>
                      <span className="text-[10px] text-brand-600 font-bold ml-1.5">({r.percentage}%)</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-emerald-600 font-bold">{r.correct_answers}C</span> /{' '}
                      <span className="text-rose-600 font-bold">{r.wrong_answers}W</span> /{' '}
                      <span className="text-slate-400">{r.unanswered_questions}U</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {Math.floor(r.time_taken_seconds / 60)}m {r.time_taken_seconds % 60}s
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={r.status === 'COMPLETED' ? 'success' : 'danger'} size="sm">
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {r.round_1_selected ? (
                        <Badge variant="purple" size="sm">Selected</Badge>
                      ) : (
                        <Badge variant="default" size="sm">Not Selected</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
