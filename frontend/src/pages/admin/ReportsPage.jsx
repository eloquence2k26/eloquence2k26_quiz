import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Users, Award, ShieldAlert } from 'lucide-react';
import { quizService } from '../../services/quizService';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import Loading from '../../components/common/Loading';

export default function ReportsPage() {
  const toast = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const res = await quizService.getAllQuizzes();
        if (res.success) setQuizzes(res.data || []);
      } catch (e) {
        toast.error('Failed to load quizzes');
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, [toast]);

  const handleExportResults = async (quizId, title) => {
    try {
      const res = await adminService.exportQuizResultsCSV(quizId);
      if (res.success && res.data?.rows) {
        const rows = res.data.rows;
        if (rows.length === 0) {
          toast.info('No results to export for this quiz yet.');
          return;
        }

        const headers = Object.keys(rows[0]).join(',');
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows.map((r) => Object.values(r).join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `${title || 'results'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Report downloaded');
      }
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const handleExportParticipants = async () => {
    try {
      const res = await adminService.exportParticipantsCSV();
      if (res.success && res.data?.rows) {
        const rows = res.data.rows;
        const headers = Object.keys(rows[0]).join(',');
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows.map((r) => Object.values(r).join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'symposium_participants_master_list.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Participants report downloaded');
      }
    } catch (err) {
      toast.error('Export failed');
    }
  };

  if (loading) return <Loading text="Loading reports generator..." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          Data Export & Official Reports
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Generate and download CSV reports for symposium scorecards, participant registries, and rankings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Participants Report */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Participants Master Registry
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Complete roster of registered scholars, colleges, departments, and qualification flags.
              </p>
            </div>
          </div>

          <button
            onClick={handleExportParticipants}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Participants CSV</span>
          </button>
        </div>

        {/* Quizzes Results Export List */}
        {quizzes.map((q) => (
          <div
            key={q.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Round {q.round_number}: {q.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Download all participant scores, negative marks, completion times, and percentile ranks.
                </p>
              </div>
            </div>

            <button
              onClick={() => handleExportResults(q.id, q.title)}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Download Official Scorecard CSV</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
