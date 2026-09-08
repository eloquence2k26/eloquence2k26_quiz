import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Search, 
  Loader, 
  RefreshCcw, 
  AlertTriangle, 
  X, 
  Settings2, 
  History, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2, 
  Clock, 
  PlayCircle, 
  Layers, 
  BookOpen, 
  RotateCcw,
  UserCheck,
  Award,
  Calendar
} from 'lucide-react';
import { API_ADMIN_URL } from '../config/apiConfig';

export default function AdminResultsPage() {
  const [results, setResults] = useState([]);
  const [eventsList, setEventsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter & Sort state
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('score_desc');

  // Modal state
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_ADMIN_URL}/results`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to fetch results');

      const qList = data.quizzes || [];

      // Group results by participant and quiz
      const grouped = {};

      (data.results || []).forEach(r => {
        const pId = String(r.participantId || r.participant_id || '');
        const qId = String(r.quizId || r.quiz_id || '');
        const key = `${pId}_${qId}`;

        if (!grouped[key]) {
          grouped[key] = {
            id: key,
            participantId: pId,
            participantName: r.participantName || pId,
            participantEmail: r.participantEmail || '',
            quizId: qId,
            quizTitle: r.quizTitle || qId,
            category: r.category || 'General',
            bestScore: 0,
            totalMarks: r.totalMarks || 30,
            totalAttempts: 0,
            completedAttempts: 0,
            ongoingAttempts: 0,
            terminatedAttempts: 0,
            pendingAttempts: 0,
            history: [],
            latestStatus: r.status,
            rawStatus: r.rawStatus,
            lastActivity: r.submittedAt || r.startedAt || null
          };
        }

        // Only add to history if it represents an actual attempt
        if (r.attemptId) {
          grouped[key].history.push(r);
          grouped[key].totalAttempts += 1;

          if (r.status === 'Ongoing') {
            grouped[key].ongoingAttempts += 1;
          } else if (r.status === 'Completed') {
            grouped[key].completedAttempts += 1;
            if (typeof r.score === 'number' && r.score > grouped[key].bestScore) {
              grouped[key].bestScore = r.score;
            }
          } else if (r.status === 'Terminated') {
            grouped[key].terminatedAttempts += 1;
          }
        } else {
          // Synthetic pending record (participant registered but not started)
          grouped[key].pendingAttempts += 1;
        }
      });

      // Determine canonical status and sort history for each group
      const finalResults = Object.values(grouped).map(g => {
        if (g.history.length > 0) {
          // Sort history newest first
          g.history.sort((a, b) => new Date(b.startedAt || b.started_at || 0) - new Date(a.startedAt || a.started_at || 0));
          const latestAttempt = g.history[0];

          // If any attempt is actively Ongoing right now, participant status is Ongoing
          if (g.ongoingAttempts > 0) {
            g.latestStatus = 'Ongoing';
          } else if (g.completedAttempts > 0) {
            g.latestStatus = 'Completed';
          } else if (latestAttempt.status === 'Terminated') {
            g.latestStatus = 'Terminated';
          } else {
            g.latestStatus = latestAttempt.status;
          }
          g.lastActivity = latestAttempt.submittedAt || latestAttempt.startedAt;
        } else {
          g.latestStatus = 'Pending';
        }
        return g;
      });

      // Build events list from returned quizzes and results
      const eventMap = new Map();
      qList.forEach(q => {
        if (q.id) {
          eventMap.set(String(q.id), {
            id: String(q.id),
            title: q.title || String(q.id),
            category: q.category || 'General'
          });
        }
      });

      finalResults.forEach(r => {
        if (r.quizId && !eventMap.has(String(r.quizId))) {
          eventMap.set(String(r.quizId), {
            id: String(r.quizId),
            title: r.quizTitle || String(r.quizId),
            category: r.category || 'General'
          });
        }
      });

      setEventsList(Array.from(eventMap.values()));
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

  // Compute stats based on the selected event (or all events)
  const eventFilteredForStats = useMemo(() => {
    if (selectedEvent === 'ALL') return results;
    return results.filter(r => String(r.quizId) === String(selectedEvent));
  }, [results, selectedEvent]);

  const stats = useMemo(() => {
    const total = eventFilteredForStats.length;
    const completed = eventFilteredForStats.filter(r => r.latestStatus === 'Completed').length;
    const ongoing = eventFilteredForStats.filter(r => r.latestStatus === 'Ongoing').length;
    const pending = eventFilteredForStats.filter(r => r.latestStatus === 'Pending').length;
    const terminated = eventFilteredForStats.filter(r => r.latestStatus === 'Terminated').length;
    return { total, completed, ongoing, pending, terminated };
  }, [eventFilteredForStats]);

  // Filtered and sorted results
  const processedResults = useMemo(() => {
    // 1. Filter by event
    let filtered = results;
    if (selectedEvent !== 'ALL') {
      filtered = filtered.filter(r => String(r.quizId) === String(selectedEvent));
    }

    // 2. Filter by status
    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter(r => r.latestStatus === selectedStatus);
    }

    // 3. Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r => 
        r.participantName?.toLowerCase().includes(q) ||
        r.participantId?.toLowerCase().includes(q) ||
        r.participantEmail?.toLowerCase().includes(q) ||
        r.quizTitle?.toLowerCase().includes(q)
      );
    }

    // 4. Sort
    return [...filtered].sort((a, b) => {
      if (sortBy === 'score_desc') {
        // Completed submissions sorted high to low, then ongoing, then pending
        if (a.latestStatus === 'Completed' && b.latestStatus !== 'Completed') return -1;
        if (b.latestStatus === 'Completed' && a.latestStatus !== 'Completed') return 1;
        if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
        return (a.participantName || '').localeCompare(b.participantName || '');
      }
      if (sortBy === 'score_asc') {
        // Pending first (0 score), then ongoing, then completed lowest to highest
        if (a.latestStatus === 'Pending' && b.latestStatus !== 'Pending') return -1;
        if (b.latestStatus === 'Pending' && a.latestStatus !== 'Pending') return 1;
        if (a.bestScore !== b.bestScore) return a.bestScore - b.bestScore;
        return (a.participantName || '').localeCompare(b.participantName || '');
      }
      if (sortBy === 'name_asc') {
        return (a.participantName || '').localeCompare(b.participantName || '');
      }
      if (sortBy === 'name_desc') {
        return (b.participantName || '').localeCompare(a.participantName || '');
      }
      if (sortBy === 'status_priority') {
        const priority = { Ongoing: 1, Completed: 2, Pending: 3, Terminated: 4 };
        const diff = (priority[a.latestStatus] || 99) - (priority[b.latestStatus] || 99);
        if (diff !== 0) return diff;
        return b.bestScore - a.bestScore;
      }
      if (sortBy === 'attempts_desc') {
        if (b.totalAttempts !== a.totalAttempts) return b.totalAttempts - a.totalAttempts;
        return b.bestScore - a.bestScore;
      }
      return 0;
    });
  }, [results, selectedEvent, selectedStatus, search, sortBy]);

  // Check if any filter is applied
  const isFiltered = selectedEvent !== 'ALL' || selectedStatus !== 'ALL' || search.trim().length > 0 || sortBy !== 'score_desc';

  const resetFilters = () => {
    setSelectedEvent('ALL');
    setSelectedStatus('ALL');
    setSearch('');
    setSortBy('score_desc');
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
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
              Filter by specific event, sort participants by score, and track Pending, Ongoing, and Completed test statuses.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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

        {/* Quick Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-zinc-800/80">
          {/* Total Participants */}
          <button
            onClick={() => setSelectedStatus('ALL')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              selectedStatus === 'ALL'
                ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 shadow-sm'
                : 'bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Total Participants</span>
              <Layers className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {stats.total}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
              {selectedEvent === 'ALL' ? 'Across all events' : 'In selected event'}
            </div>
          </button>

          {/* Completed */}
          <button
            onClick={() => setSelectedStatus('Completed')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              selectedStatus === 'Completed'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 shadow-sm'
                : 'bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.completed}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
              Submitted attempts
            </div>
          </button>

          {/* Ongoing */}
          <button
            onClick={() => setSelectedStatus('Ongoing')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              selectedStatus === 'Ongoing'
                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-sm'
                : 'bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Ongoing</span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
              </span>
            </div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {stats.ongoing}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
              Attempting right now
            </div>
          </button>

          {/* Pending */}
          <button
            onClick={() => setSelectedStatus('Pending')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              selectedStatus === 'Pending'
                ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 shadow-sm'
                : 'bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Pending</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {stats.pending}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
              Haven't started test
            </div>
          </button>
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

      {/* Filter and Control Section */}
      <section className="basic-card p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* Search Input */}
          <div className="relative md:col-span-4">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search by participant name, ID, or quiz..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Event Filter Dropdown */}
          <div className="relative md:col-span-3">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-zinc-500">
              <BookOpen className="w-4 h-4" />
            </div>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white pl-10 pr-8 py-2.5 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all cursor-pointer appearance-none font-medium"
            >
              <option value="ALL">All Events ({eventsList.length})</option>
              {eventsList.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              ▼
            </div>
          </div>

          {/* Status Filter Dropdown */}
          <div className="relative md:col-span-2.5">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-zinc-500">
              <Filter className="w-4 h-4" />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white pl-10 pr-8 py-2.5 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all cursor-pointer appearance-none font-medium"
            >
              <option value="ALL">All Statuses ({stats.total})</option>
              <option value="Completed">Completed ({stats.completed})</option>
              <option value="Ongoing">Ongoing ({stats.ongoing})</option>
              <option value="Pending">Pending ({stats.pending})</option>
              {stats.terminated > 0 && (
                <option value="Terminated">Terminated ({stats.terminated})</option>
              )}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              ▼
            </div>
          </div>

          {/* Sort By Dropdown */}
          <div className="relative md:col-span-2.5">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-zinc-500">
              <ArrowUpDown className="w-4 h-4" />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white pl-10 pr-8 py-2.5 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all cursor-pointer appearance-none font-medium"
            >
              <option value="score_desc">Score: High to Low</option>
              <option value="score_asc">Score: Low to High</option>
              <option value="name_asc">Participant Name (A-Z)</option>
              <option value="name_desc">Participant Name (Z-A)</option>
              <option value="status_priority">Status (Ongoing → Completed → Pending)</option>
              <option value="attempts_desc">Most Attempts First</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              ▼
            </div>
          </div>
        </div>

        {/* Quick Filter Status Pills + Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setSelectedStatus('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                selectedStatus === 'ALL'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800'
              }`}
            >
              All ({stats.total})
            </button>

            <button
              onClick={() => setSelectedStatus('Completed')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                selectedStatus === 'Completed'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed ({stats.completed})
            </button>

            <button
              onClick={() => setSelectedStatus('Ongoing')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                selectedStatus === 'Ongoing'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60'
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Ongoing ({stats.ongoing})
            </button>

            <button
              onClick={() => setSelectedStatus('Pending')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                selectedStatus === 'Pending'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Pending ({stats.pending})
            </button>

            {stats.terminated > 0 && (
              <button
                onClick={() => setSelectedStatus('Terminated')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  selectedStatus === 'Terminated'
                    ? 'bg-red-600 text-white border-red-600 shadow-sm'
                    : 'bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Terminated ({stats.terminated})
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isFiltered && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Filters
              </button>
            )}

            <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              Showing <strong className="text-slate-900 dark:text-white font-bold">{processedResults.length}</strong> result{processedResults.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      </section>

      {/* Results Table Card */}
      <section className="basic-card p-6 sm:p-8 space-y-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-50/90 dark:bg-zinc-900/90 border-b border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4">Rank / #</th>
                  <th className="px-6 py-4">Participant</th>
                  <th className="px-6 py-4">Event / Quiz</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Attempts</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-slate-500 dark:text-zinc-400 font-medium">
                      <Loader className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                      Loading participant results and events...
                    </td>
                  </tr>
                ) : processedResults.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-slate-500 dark:text-zinc-400 font-medium">
                      <div className="max-w-md mx-auto space-y-2">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto opacity-75" />
                        <div className="text-slate-900 dark:text-white font-bold text-sm">No matching participants found</div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400">
                          Try adjusting your event selector, status filter, or search keywords.
                        </p>
                        {isFiltered && (
                          <button
                            onClick={resetFilters}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Reset all filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  processedResults.map((result, idx) => {
                    const isCompleted = result.latestStatus === 'Completed';
                    const isOngoing = result.latestStatus === 'Ongoing';
                    const isPending = result.latestStatus === 'Pending';
                    const isTerminated = result.latestStatus === 'Terminated';

                    return (
                      <tr key={result.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors">
                        {/* Rank */}
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                            isCompleted && idx === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-sm' :
                            isCompleted && idx === 1 ? 'bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 shadow-sm' :
                            isCompleted && idx === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300 border border-orange-300 dark:border-orange-800 shadow-sm' :
                            'text-slate-500 dark:text-zinc-400 font-semibold'
                          }`}>
                            {isCompleted && idx === 0 ? '🥇 1' :
                             isCompleted && idx === 1 ? '🥈 2' :
                             isCompleted && idx === 2 ? '🥉 3' :
                             `#${idx + 1}`}
                          </span>
                        </td>

                        {/* Participant info */}
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {result.participantName}
                          </div>
                          <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 mt-0.5">
                            {result.participantEmail || result.participantId}
                          </div>
                        </td>

                        {/* Event / Quiz */}
                        <td className="px-6 py-4 text-slate-700 dark:text-zinc-300">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {result.quizTitle}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 font-medium">
                              {result.category}
                            </span>
                            {result.quizId && (
                              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                                ID: {result.quizId.substring(0, 14)}...
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Score Column */}
                        <td className="px-6 py-4">
                          {isCompleted ? (
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base">
                                {result.bestScore}
                              </span>
                              <span className="text-slate-400 dark:text-zinc-500 text-xs">
                                / {result.totalMarks}
                              </span>
                              {result.totalMarks > 0 && (
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800 ml-1">
                                  {Math.round((result.bestScore / result.totalMarks) * 100)}%
                                </span>
                              )}
                            </div>
                          ) : isOngoing ? (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold">
                              <Loader className="w-3 h-3 animate-spin text-indigo-600 dark:text-indigo-400" />
                              <span>In Progress...</span>
                            </div>
                          ) : isPending ? (
                            <span className="text-slate-400 dark:text-zinc-500 text-xs font-medium italic">
                              — Not Started
                            </span>
                          ) : (
                            <span className="text-red-500 text-xs font-semibold">
                              {result.bestScore || 0} / {result.totalMarks}
                            </span>
                          )}
                        </td>

                        {/* Attempts Count */}
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isPending ? (
                              <span className="text-slate-400 dark:text-zinc-500 text-xs">
                                0 attempts
                              </span>
                            ) : (
                              <span className="bg-slate-100 dark:bg-zinc-900 px-2.5 py-1 rounded-lg text-slate-700 dark:text-zinc-300 text-xs font-bold border border-slate-200 dark:border-zinc-800">
                                {result.totalAttempts} Attempt{result.totalAttempts === 1 ? '' : 's'}
                              </span>
                            )}

                            {result.terminatedAttempts > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded border border-red-200 dark:border-red-900/60">
                                <AlertTriangle className="w-3 h-3" /> {result.terminatedAttempts} Terminated
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="px-6 py-4 text-center">
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 shadow-sm">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              Completed
                            </span>
                          )}

                          {isOngoing && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800 shadow-sm">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                              </span>
                              Ongoing
                            </span>
                          )}

                          {isPending && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 shadow-sm">
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              Pending
                            </span>
                          )}

                          {isTerminated && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800 shadow-sm">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                              Terminated
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => setSelectedUser(result)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                          >
                            <Settings2 className="w-3.5 h-3.5" /> Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
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
                  <History className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Participant Event Details
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
                  Participant: <span className="text-slate-900 dark:text-white font-bold">{selectedUser.participantName}</span> ({selectedUser.participantEmail || selectedUser.participantId})
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 font-medium">
                  Event: {selectedUser.quizTitle}
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
              {/* If participant is pending with 0 attempts */}
              {selectedUser.history.length === 0 ? (
                <div className="p-6 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 text-center space-y-3">
                  <Clock className="w-10 h-10 text-amber-500 mx-auto" />
                  <div className="text-amber-900 dark:text-amber-200 font-bold text-base">
                    Test Status: Pending (Not Started)
                  </div>
                  <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-400 max-w-md mx-auto">
                    This participant is registered for <strong>{selectedUser.quizTitle}</strong> but has not initiated an attempt yet.
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800">
                    <UserCheck className="w-3.5 h-3.5 text-blue-500" /> Registered Participant
                  </div>
                </div>
              ) : (
                selectedUser.history.map((attempt, i) => (
                  <div 
                    key={attempt.id || i} 
                    className={`border p-5 rounded-2xl transition-all shadow-sm ${
                      attempt.status === 'Terminated' || attempt.status === 'TERMINATED'
                        ? 'border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20' 
                        : attempt.status === 'Ongoing'
                        ? 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20'
                        : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-slate-900 dark:text-white font-bold flex items-center gap-2">
                          Attempt {attempt.attemptNumber || attempt.attempt_number || (selectedUser.history.length - i)}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold ${
                            attempt.status === 'Terminated' || attempt.status === 'TERMINATED'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border border-red-300 dark:border-red-800' : 
                            attempt.status === 'Ongoing'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800' :
                            ['Completed', 'SUBMITTED', 'AUTO_SUBMITTED'].includes(attempt.status) 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' : 
                            'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700'
                          }`}>
                            {attempt.status}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                          Started: {attempt.startedAt || attempt.started_at ? new Date(attempt.startedAt || attempt.started_at).toLocaleString() : 'N/A'}
                        </p>
                        {(attempt.submittedAt || attempt.submitted_at) && (
                          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                            Submitted: {new Date(attempt.submittedAt || attempt.submitted_at).toLocaleString()}
                          </p>
                        )}
                      </div>

                      {['Completed', 'SUBMITTED', 'AUTO_SUBMITTED'].includes(attempt.status) && (
                        <div className="text-right">
                          <span className="block text-xs text-slate-500 dark:text-zinc-400 font-medium">Final Score</span>
                          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                            {attempt.score || 0} <span className="text-sm text-slate-400 dark:text-zinc-500 font-normal">/ {attempt.totalMarks || attempt.total_marks || selectedUser.totalMarks}</span>
                          </span>
                        </div>
                      )}

                      {attempt.status === 'Ongoing' && (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            Active Session
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Violations Box */}
                    {(attempt.violationsCount > 0 || (attempt.violations && attempt.violations.length > 0)) ? (
                      <div className="mt-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl p-4">
                        <h5 className="text-red-700 dark:text-red-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4 text-red-500" /> Cheat Detections Logged ({attempt.violationsCount || attempt.violations?.length})
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
                        No security violations recorded for this attempt.
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div className="p-4 bg-white dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 text-right">
              <button 
                onClick={() => setSelectedUser(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-800 dark:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-zinc-800"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
