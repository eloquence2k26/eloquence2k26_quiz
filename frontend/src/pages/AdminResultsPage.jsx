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
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            Participant Results & Overview
          </h1>
          <p className="text-slate-400 mt-2">View highest scores and manage full attempt history per user.</p>
        </div>
        <button 
          onClick={fetchResults}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700 cursor-pointer"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="relative w-72">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by ID, Name or Quiz..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 text-white pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          <div className="text-sm text-slate-400">
            Showing <strong className="text-white">{filteredResults.length}</strong> unique participants
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-700/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700/50 text-slate-300">
                <th className="p-4 font-semibold text-sm">Rank</th>
                <th className="p-4 font-semibold text-sm">Participant</th>
                <th className="p-4 font-semibold text-sm">Quiz ID</th>
                <th className="p-4 font-semibold text-sm">Best Score</th>
                <th className="p-4 font-semibold text-sm">Total Attempts</th>
                <th className="p-4 font-semibold text-sm text-center">Status</th>
                <th className="p-4 font-semibold text-sm text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading results...
                  </td>
                </tr>
              ) : filteredResults.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400">
                    No results found matching your search.
                  </td>
                </tr>
              ) : (
                filteredResults.map((result, idx) => (
                  <tr key={result.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-4 text-sm font-bold text-white">
                      #{idx + 1}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-white text-sm">{result.participantName}</div>
                      <div className="text-blue-400 text-xs mt-0.5">{result.participantId}</div>
                    </td>
                    <td className="p-4 text-slate-300 text-sm">{result.quizTitle}</td>
                    <td className="p-4">
                      {result.completedAttempts > 0 ? (
                        <>
                          <span className="text-emerald-400 font-bold text-lg">{result.bestScore}</span>
                          <span className="text-slate-500 text-xs ml-1">/ {result.totalMarks}</span>
                        </>
                      ) : (
                        <span className="text-slate-500 text-xs font-bold bg-slate-900 px-2 py-1 rounded">No Submissions</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-900 px-2.5 py-1 rounded-md text-slate-300 text-xs font-bold border border-slate-700">
                          {result.totalAttempts} Attempt(s)
                        </span>
                        {result.terminatedAttempts > 0 && (
                          <span className="text-xs text-red-400 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {result.terminatedAttempts} Terminated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        result.latestStatus === 'TERMINATED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                        result.completedAttempts > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {result.completedAttempts > 0 ? 'Completed' : result.latestStatus}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedUser(result)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        <Settings2 className="w-4 h-4" /> Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* USER HISTORY & MANAGE MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-800/50 border-b border-slate-700 p-5 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-400" /> Attempt History
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Participant: <span className="text-white font-bold">{selectedUser.participantName}</span> ({selectedUser.participantId})
                </p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-[#0a0f1a]">
              {selectedUser.history.map((attempt, i) => (
                <div key={attempt.id || i} className={`border p-5 rounded-xl ${attempt.status === 'TERMINATED' ? 'border-red-900/50 bg-red-500/5' : 'border-slate-800 bg-slate-900/50'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-white font-bold flex items-center gap-2">
                        Attempt {attempt.attemptNumber || attempt.attempt_number || (selectedUser.history.length - i)}
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${
                          attempt.status === 'TERMINATED' ? 'bg-red-500 text-white' : 
                          ['Completed', 'SUBMITTED', 'AUTO_SUBMITTED'].includes(attempt.status) ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {attempt.status}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">{new Date(attempt.startedAt || attempt.started_at).toLocaleString()}</p>
                    </div>
                    {['Completed', 'SUBMITTED', 'AUTO_SUBMITTED'].includes(attempt.status) && (
                      <div className="text-right">
                        <span className="block text-xs text-slate-400">Score</span>
                        <span className="text-xl font-bold text-emerald-400">{attempt.score || 0} <span className="text-sm text-slate-500">/ {attempt.totalMarks || attempt.total_marks || 0}</span></span>
                      </div>
                    )}
                  </div>

                  {/* Violations Box */}
                  {(attempt.violationsCount > 0 || (attempt.violations && attempt.violations.length > 0)) ? (
                    <div className="mt-4 bg-[#1a0f14] border border-red-900/30 rounded-lg p-4">
                      <h5 className="text-red-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4" /> Cheat Detections Logged ({attempt.violationsCount})
                      </h5>
                      <ul className="space-y-3">
                        {(attempt.violations || []).map((v, vIdx) => (
                          <li key={vIdx} className="flex items-start gap-3 text-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></span>
                            <div>
                              <strong className="text-slate-200 block capitalize">{v.violation_type?.replace(/_/g, ' ')}</strong>
                              <span className="text-amber-400/80 text-xs">{v.description}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="mt-4 bg-emerald-900/10 border border-emerald-900/30 rounded-lg p-3 text-xs text-emerald-500/70 font-medium">
                      No cheating violations recorded for this attempt.
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="p-4 bg-slate-900 border-t border-slate-800 text-right">
              <button 
                onClick={() => setSelectedUser(null)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg transition-colors cursor-pointer"
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
