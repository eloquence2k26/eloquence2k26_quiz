import React, { useState, useEffect } from 'react';
import { Trophy, Search, Loader, RefreshCcw, AlertTriangle, X, Settings2, History } from 'lucide-react';
import { API_ADMIN_URL } from '../config/apiConfig';

export default function AdminResultsPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_ADMIN_URL}/results`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to fetch results');
      
      // Group results by participant to avoid showing the same name multiple times
      const grouped = {};
      
      (data.results || []).forEach(r => {
        // Group by user and quiz
        const key = `${r.participant_id || r.participantId}_${r.quiz_id || r.quizId}`;
        
        if (!grouped[key]) {
          grouped[key] = {
            id: key,
            participantId: r.participant_id || r.participantId,
            participantName: r.participantName || r.participant_id,
            quizId: r.quiz_id || r.quizId,
            quizTitle: r.quizTitle || r.quiz_id,
            bestScore: 0,
            totalMarks: r.totalMarks || 0,
            totalAttempts: 0,
            completedAttempts: 0,
            terminatedAttempts: 0,
            history: [],
            latestStatus: r.status
          };
        }
        
        grouped[key].history.push(r);
        grouped[key].totalAttempts += 1;
        
        if (r.status === 'TERMINATED') {
          grouped[key].terminatedAttempts += 1;
        }
        
        if (['Completed', 'SUBMITTED', 'AUTO_SUBMITTED'].includes(r.status)) {
          grouped[key].completedAttempts += 1;
          grouped[key].latestStatus = 'Completed';
          if ((r.score || 0) > grouped[key].bestScore) {
            grouped[key].bestScore = r.score;
          }
        }
      });
      
      // Sort history by started_at descending for each user
      Object.values(grouped).forEach(g => {
        g.history.sort((a, b) => new Date(b.startedAt || b.started_at) - new Date(a.startedAt || a.started_at));
      });

      const finalResults = Object.values(grouped);
      // Sort by best score descending
      finalResults.sort((a, b) => b.bestScore - a.bestScore);
      
      setResults(finalResults);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const filteredResults = results.filter(r => 
    r.participantId?.toLowerCase().includes(search.toLowerCase()) ||
    r.participantName?.toLowerCase().includes(search.toLowerCase()) ||
    r.quizId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <section className="basic-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <Trophy className="w-3.5 h-3.5 text-amber-500" /> Participant Leaderboard & Results
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Participant Results & Overview
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
              View highest scores, performance overview, and manage attempt history per user.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3.5 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 font-semibold rounded-xl text-xs shadow-sm">
              Participants: <strong className="text-blue-600 dark:text-blue-400">{results.length}</strong>
            </span>

            <button 
              onClick={fetchResults}
              title="Refresh Results"
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-xl transition-all border border-slate-200 dark:border-zinc-800 text-xs font-semibold cursor-pointer shadow-sm"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 p-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Results Table Card */}
      <section className="basic-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search by ID, Name or Quiz..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
            />
          </div>
          <div className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-medium">
            Showing <strong className="text-slate-900 dark:text-white font-bold">{filteredResults.length}</strong> unique participant{filteredResults.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-50/90 dark:bg-zinc-900/90 border-b border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4">Participant</th>
                  <th className="px-6 py-4">Quiz Title</th>
                  <th className="px-6 py-4">Best Score</th>
                  <th className="px-6 py-4">Total Attempts</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-slate-500 dark:text-zinc-400 font-medium">
                      <Loader className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                      Loading participant results...
                    </td>
                  </tr>
                ) : filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-slate-500 dark:text-zinc-400 font-medium">
                      No results found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((result, idx) => (
                    <tr key={result.id} className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                          idx === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800' :
                          idx === 1 ? 'bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700' :
                          idx === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border border-orange-300 dark:border-orange-800' :
                          'text-slate-600 dark:text-zinc-400 font-semibold'
                        }`}>
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{result.participantName}</div>
                        <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 mt-0.5">{result.participantId}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 dark:text-zinc-300">
                        <div className="font-medium">{result.quizTitle}</div>
                        {result.quizId && result.quizId !== result.quizTitle && (
                          <div className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">{result.quizId}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {result.completedAttempts > 0 ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base">{result.bestScore}</span>
                            <span className="text-slate-400 dark:text-zinc-500 text-xs">/ {result.totalMarks}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-zinc-500 text-xs font-medium italic">No Submissions</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-slate-100 dark:bg-zinc-900 px-2.5 py-1 rounded-lg text-slate-700 dark:text-zinc-300 text-xs font-bold border border-slate-200 dark:border-zinc-800">
                            {result.totalAttempts} Attempt{result.totalAttempts === 1 ? '' : 's'}
                          </span>
                          {result.terminatedAttempts > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded border border-red-200 dark:border-red-900/60">
                              <AlertTriangle className="w-3 h-3" /> {result.terminatedAttempts} Terminated
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          result.latestStatus === 'TERMINATED'
                            ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800'
                            : result.completedAttempts > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800'
                        }`}>
                          {result.completedAttempts > 0 ? 'Completed' : result.latestStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedUser(result)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                        >
                          <Settings2 className="w-3.5 h-3.5" /> Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* USER HISTORY & MANAGE MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 dark:bg-zinc-900/90 border-b border-slate-200 dark:border-zinc-800 p-5 sm:p-6 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Attempt History
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
                  Participant: <span className="text-slate-900 dark:text-white font-bold">{selectedUser.participantName}</span> ({selectedUser.participantId})
                </p>
              </div>
              <button 
                onClick={() => setSelectedUser(null)} 
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/40 dark:bg-black/30">
              {selectedUser.history.map((attempt, i) => (
                <div 
                  key={attempt.id || i} 
                  className={`border p-5 rounded-2xl transition-all shadow-sm ${
                    attempt.status === 'TERMINATED' 
                      ? 'border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20' 
                      : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
                        Attempt {attempt.attemptNumber || attempt.attempt_number || (selectedUser.history.length - i)}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold ${
                          attempt.status === 'TERMINATED' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border border-red-300 dark:border-red-800' : 
                          ['Completed', 'SUBMITTED', 'AUTO_SUBMITTED'].includes(attempt.status) ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' : 
                          'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700'
                        }`}>
                          {attempt.status}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                        {new Date(attempt.startedAt || attempt.started_at).toLocaleString()}
                      </p>
                    </div>
                    {['Completed', 'SUBMITTED', 'AUTO_SUBMITTED'].includes(attempt.status) && (
                      <div className="text-right">
                        <span className="block text-xs text-slate-500 dark:text-zinc-400">Score</span>
                        <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                          {attempt.score || 0} <span className="text-sm text-slate-400 dark:text-zinc-500">/ {attempt.totalMarks || attempt.total_marks || 0}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Violations Box */}
                  {(attempt.violationsCount > 0 || (attempt.violations && attempt.violations.length > 0)) ? (
                    <div className="mt-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl p-4">
                      <h5 className="text-red-700 dark:text-red-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-red-500" /> Cheat Detections Logged ({attempt.violationsCount})
                      </h5>
                      <ul className="space-y-2.5">
                        {(attempt.violations || []).map((v, vIdx) => (
                          <li key={vIdx} className="flex items-start gap-2.5 text-xs sm:text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></span>
                            <div>
                              <strong className="text-slate-800 dark:text-zinc-200 block capitalize">{v.violation_type?.replace(/_/g, ' ')}</strong>
                              <span className="text-slate-600 dark:text-zinc-400 text-xs">{v.description}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="mt-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-3 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      No cheating violations recorded for this attempt.
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="p-4 bg-white dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 text-right">
              <button 
                onClick={() => setSelectedUser(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-800 dark:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-zinc-800"
              >
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
