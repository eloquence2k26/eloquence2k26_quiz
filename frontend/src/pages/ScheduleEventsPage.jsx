import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CalendarClock, 
  Plus, 
  Play, 
  Edit3, 
  Trash2, 
  Users, 
  Clock, 
  Calendar, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Sparkles, 
  Radio, 
  Check, 
  Eye, 
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Zap,
  Phone,
  Mail,
  Flame,
  Lock,
  Unlock
} from 'lucide-react';
import { API_SCHEDULE_URL } from '../config/apiConfig';

export const ScheduleEventsPage = () => {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';

  // Data states
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PUBLISHED' | 'SCHEDULED' | 'CLOSED'

  // Selected event for live attendee monitoring
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [activeUsersLoading, setActiveUsersLoading] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState('');

  // 5-Minute Joining Window & Late Join Permissions
  const [joinWindow, setJoinWindow] = useState(null);
  const [lateJoinAllowedAll, setLateJoinAllowedAll] = useState(false);
  const [lateActionLoading, setLateActionLoading] = useState(false);

  // Notifications
  const [notification, setNotification] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    title: '',
    category: 'General Technology',
    description: '',
    start_date_time: '',
    duration: 30,
    total_questions: 30,
    status: 'Scheduled'
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    title: '',
    category: '',
    start_date_time: '',
    duration: 30,
    end_date_time: ''
  });

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // 1. Fetch Scheduled Events
  const fetchEvents = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch(API_SCHEDULE_URL);
      if (res.ok) {
        const data = await res.json();
        const fetchedEvents = data.events || [];
        setEvents(fetchedEvents);

        // Auto-select published event or first event if none selected
        setSelectedEventId((prev) => {
          if (prev && fetchedEvents.some((e) => String(e.id) === String(prev))) {
            return prev;
          }
          const published = fetchedEvents.find((e) => e.computedStatus === 'Published' || e.status === 'Published');
          if (published) return published.id;
          return fetchedEvents[0]?.id || null;
        });
      }
    } catch (err) {
      console.error('Fetch schedule events error:', err);
      if (!quiet) showToast('Failed to load schedule events.', 'error');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Periodic background refresh for events (every 10s)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchEvents(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // 2. Fetch Live Attendees for Selected Event
  const fetchActiveUsers = useCallback(async (eventId, quiet = false) => {
    if (!eventId) return;
    if (!quiet) setActiveUsersLoading(true);
    try {
      const res = await fetch(`${API_SCHEDULE_URL}/${eventId}/active-users`);
      if (res.ok) {
        const data = await res.json();
        setActiveUsers(data.users || []);
        setJoinWindow(data.joinWindow || null);
        setLateJoinAllowedAll(Boolean(data.lateJoinAllowedAll));
      }
    } catch (err) {
      console.error('Fetch active users error:', err);
    } finally {
      if (!quiet) setActiveUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchActiveUsers(selectedEventId);
    } else {
      setActiveUsers([]);
    }
  }, [selectedEventId, fetchActiveUsers]);

  // Polling active attendees every 4 seconds for real-time live presence
  useEffect(() => {
    if (!selectedEventId) return;
    const interval = setInterval(() => {
      fetchActiveUsers(selectedEventId, true);
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedEventId, fetchActiveUsers]);

  // Live ticking clock updated every second for real-time countdowns and automatic starting
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper to format ISO to HTML datetime-local input string
  const formatForInput = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
      return localISOTime;
    } catch {
      return '';
    }
  };

  // Compute live event status dynamically with real-time clock
  const getLiveEventStatus = (event) => {
    if (!event) return 'Scheduled';
    if (event.status === 'Closed') return 'Closed';

    const start = event.start_date_time || event.start_time ? new Date(event.start_date_time || event.start_time).getTime() : 0;
    const end = event.end_date_time || event.end_time ? new Date(event.end_date_time || event.end_time).getTime() : 0;

    if (end && currentTime > end) return 'Closed';
    // Automatically published / started when current time reaches scheduled start time!
    if (start && currentTime >= start) return 'Published';
    if (event.computedStatus === 'Published' || event.status === 'Published') return 'Published';
    return 'Scheduled';
  };

  // Format live countdown to automatic start
  const formatCountdown = (startIso) => {
    if (!startIso) return null;
    const startMs = new Date(startIso).getTime();
    const diff = startMs - currentTime;
    if (diff <= 0) return null;

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Helper to format human-readable date & time
  const formatHumanDateTime = (isoStr) => {
    if (!isoStr) return 'Not scheduled';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  // Helper to calculate end time preview string
  const calculateEndTime = (startStr, durationMinutes) => {
    if (!startStr) return '';
    try {
      const start = new Date(startStr);
      const end = new Date(start.getTime() + (parseInt(durationMinutes, 10) || 30) * 60000);
      return end.toLocaleString([], {
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  // Helper to compute 5-minute joining window info for any event
  const getJoinWindowInfo = (event) => {
    if (!event) return null;
    const startMs = event.start_date_time || event.start_time ? new Date(event.start_date_time || event.start_time).getTime() : 0;
    if (!startMs) return null;
    const isStarted = currentTime >= startMs;
    const joinWindowEndMs = startMs + 5 * 60 * 1000;
    const isClosed = isStarted && currentTime > joinWindowEndMs;
    const remainingMs = Math.max(0, joinWindowEndMs - currentTime);
    const remainingSec = Math.floor(remainingMs / 1000);
    const remMin = Math.floor(remainingSec / 60);
    const remSec = remainingSec % 60;
    return {
      isStarted,
      isClosed,
      remainingSec,
      remainingFormatted: `${remMin}m ${String(remSec).padStart(2, '0')}s`,
      joinWindowEndMs,
      joinWindowEndDate: new Date(joinWindowEndMs)
    };
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const now = new Date();
    // Default to nearest 5 minutes
    now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5, 0, 0);
    const localIso = formatForInput(now.toISOString());

    setCreateForm({
      title: '',
      category: 'General Technology',
      description: '',
      start_date_time: localIso,
      duration: 30,
      total_questions: 30,
      status: 'Scheduled'
    });
    setIsCreateModalOpen(true);
  };

  // Submit Create Scheduled Event
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      showToast('Event title is required', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(API_SCHEDULE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createForm.title.trim(),
          category: createForm.category,
          description: createForm.description,
          start_date_time: createForm.start_date_time ? new Date(createForm.start_date_time).toISOString() : new Date().toISOString(),
          duration: parseInt(createForm.duration, 10) || 30,
          total_questions: parseInt(createForm.total_questions, 10) || 30,
          status: createForm.status
        })
      });

      if (res.ok) {
        showToast('New event scheduled successfully!');
        setIsCreateModalOpen(false);
        fetchEvents();
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to create event', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Schedule Modal
  const handleOpenEditModal = (event) => {
    setEditingEvent(event);
    setEditForm({
      title: event.title || '',
      category: event.category || '',
      start_date_time: formatForInput(event.start_date_time || event.start_time),
      duration: event.duration || 30,
      end_date_time: formatForInput(event.end_date_time || event.end_time)
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit Schedule
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingEvent) return;

    setActionLoading(true);
    try {
      const res = await fetch(`${API_SCHEDULE_URL}/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          category: editForm.category,
          start_date_time: editForm.start_date_time ? new Date(editForm.start_date_time).toISOString() : undefined,
          duration: parseInt(editForm.duration, 10) || 30
        })
      });

      if (res.ok) {
        showToast(`Schedule timing updated for "${editForm.title || editingEvent.title}"!`);
        setIsEditModalOpen(false);
        setEditingEvent(null);
        fetchEvents();
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to update schedule timing', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Manual Start / Publish Event Button Click
  const handleManualStartEvent = async (event) => {
    if (!event) return;
    
    // If already published, just notify or select
    if (event.computedStatus === 'Published' || event.status === 'Published') {
      setSelectedEventId(event.id);
      showToast(`Event "${event.title}" is already published and live!`);
      return;
    }

    const confirmStart = window.confirm(
      `Are you sure you want to START and PUBLISH "${event.title}" now? Participants will be permitted to access the test immediately.`
    );
    if (!confirmStart) return;

    setActionLoading(true);
    try {
      const res = await fetch(`${API_SCHEDULE_URL}/${event.id}/start`, {
        method: 'POST'
      });

      if (res.ok) {
        showToast(`🚀 Event "${event.title}" has been PUBLISHED and STARTED!`);
        setSelectedEventId(event.id);
        fetchEvents();
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Failed to start event', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Event
  const handleDeleteEvent = async (event) => {
    const confirmDelete = window.confirm(`Delete scheduled event "${event.title}"? This cannot be undone.`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API_SCHEDULE_URL}/${event.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        showToast('Event removed from schedule.');
        fetchEvents();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to delete event', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Network error', 'error');
    }
  };

  // Admin: Permit late join for participant or ALL
  const handleAllowLateJoin = async (participantId, adminMessage = '') => {
    if (!selectedEventId) return;
    setLateActionLoading(true);
    try {
      const res = await fetch(`${API_SCHEDULE_URL}/${selectedEventId}/allow-late-join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, adminMessage })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'Late entry permission granted.');
        fetchActiveUsers(selectedEventId, true);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to grant late join permission', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setLateActionLoading(false);
    }
  };

  // Admin: Revoke late join permission
  const handleRevokeLateJoin = async (participantId) => {
    if (!selectedEventId) return;
    setLateActionLoading(true);
    try {
      const res = await fetch(`${API_SCHEDULE_URL}/${selectedEventId}/revoke-late-join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message || 'Late entry permission revoked.');
        fetchActiveUsers(selectedEventId, true);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to revoke late join permission', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Network error', 'error');
    } finally {
      setLateActionLoading(false);
    }
  };

  // Filtered Events with real-time live auto-start calculation
  const filteredEvents = events.filter((ev) => {
    const matchesSearch = 
      (ev.title && ev.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (ev.category && ev.category.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    const liveStatus = getLiveEventStatus(ev);
    if (statusFilter === 'PUBLISHED') {
      return liveStatus === 'Published';
    }
    if (statusFilter === 'SCHEDULED') {
      return liveStatus === 'Scheduled';
    }
    if (statusFilter === 'CLOSED') {
      return liveStatus === 'Closed';
    }
    return true;
  });

  // Filtered Attendees
  const filteredAttendees = activeUsers.filter((u) => {
    const term = attendeeSearch.toLowerCase();
    return (
      (u.username && u.username.toLowerCase().includes(term)) ||
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.phone && u.phone.includes(term))
    );
  });

  // Summary counts updated dynamically
  const publishedCount = events.filter((e) => getLiveEventStatus(e) === 'Published').length;
  const scheduledCount = events.filter((e) => getLiveEventStatus(e) === 'Scheduled').length;
  const currentSelectedEvent = events.find((e) => String(e.id) === String(selectedEventId));

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
      {/* Toast Notification Alert */}
      {notification && (
        <div 
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl backdrop-blur-md border text-sm font-semibold transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
            notification.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 dark:bg-red-950/80 shadow-red-500/10'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-950/80 shadow-emerald-500/10'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
          )}
          <span>{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            className="p-1 hover:opacity-75 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-zinc-800 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 dark:from-[#0c0d12] dark:via-[#09090b] dark:to-blue-950/20 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
              <CalendarClock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Event Scheduling Console</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Schedule & Live Event Monitor
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
              Schedule symposium events, modify start timing and test duration, launch live events with manual one-click start, and monitor active logged-in participants and usernames in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => {
                fetchEvents();
                if (selectedEventId) fetchActiveUsers(selectedEventId);
              }}
              title="Refresh Schedule"
              className="p-3 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-center"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            {isAdmin && (
              <button
                onClick={handleOpenCreateModal}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/25 dark:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Schedule New Event</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-200 dark:border-zinc-800/80">
          {/* Total Events */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 backdrop-blur-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Scheduled</span>
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{events.length}</p>
            <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-medium">Total registered quizzes</span>
          </div>

          {/* Published / Live */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-emerald-200/80 dark:border-emerald-900/50 backdrop-blur-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Published / Live</span>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{publishedCount}</p>
            <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-medium">Started & open for users</span>
          </div>

          {/* Upcoming Queued */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 backdrop-blur-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Awaiting Start</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{scheduledCount}</p>
            <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-medium">Ready to be started</span>
          </div>

          {/* Live Logged-in Attendees */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-800/80 backdrop-blur-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Live Logged In</span>
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{activeUsers.length}</p>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded-full">
                Live Now
              </span>
            </div>
            <span className="text-[10px] text-slate-600 dark:text-zinc-400 font-medium truncate block">
              {currentSelectedEvent ? `For: ${currentSelectedEvent.title}` : 'Selected schedule'}
            </span>
          </div>
        </div>
      </section>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Scheduled Events List (7 Cols on desktop) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#09090b] p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search events by title or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl">
              {['ALL', 'PUBLISHED', 'SCHEDULED'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === filter
                      ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {filter === 'ALL' ? 'All' : filter === 'PUBLISHED' ? 'Published' : 'Scheduled'}
                </button>
              ))}
            </div>
          </div>

          {/* Events List */}
          {loading ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">Loading scheduled events...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <CalendarClock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">No scheduled events found</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'Create a new scheduled event to configure dates, timing, and launch participants.'}
                </p>
              </div>
              {isAdmin && (
                <button
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Schedule Event Now
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => {
                const liveStatus = getLiveEventStatus(event);
                const isPublished = liveStatus === 'Published';
                const isSelected = String(event.id) === String(selectedEventId);
                const countdown = formatCountdown(event.start_date_time || event.start_time);
                const jwInfo = getJoinWindowInfo(event);

                return (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEventId(event.id)}
                    className={`group relative rounded-3xl p-5 sm:p-6 transition-all duration-200 cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-50/30 dark:bg-blue-950/20 border-blue-500/80 shadow-md shadow-blue-500/10 dark:shadow-[0_0_20px_rgba(37,99,235,0.15)] ring-1 ring-blue-500/50'
                        : 'bg-white dark:bg-[#09090b] border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 shadow-sm hover:shadow'
                    }`}
                  >
                    {/* Header Row: Title & Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                            {event.category || 'General'}
                          </span>

                          {/* Dynamic Status Badge with Auto-Start detection & 5-min Window */}
                          {isPublished ? (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 text-xs font-extrabold shadow-sm shadow-emerald-500/20">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                PUBLISHED (LIVE)
                              </span>
                              {jwInfo && !jwInfo.isClosed ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-mono font-bold animate-pulse">
                                  <Clock className="w-3 h-3 text-emerald-600" />
                                  Join Window: {jwInfo.remainingFormatted} left
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 text-[10px] font-bold">
                                  <Lock className="w-2.5 h-2.5 text-amber-500" />
                                  Join Window Closed (&gt;5m)
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800 text-xs font-extrabold">
                                <Clock className="w-3 h-3" />
                                SCHEDULED
                              </span>

                              {countdown && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 text-[10px] font-bold font-mono shadow-sm">
                                  <Zap className="w-3 h-3 text-amber-500 animate-pulse" />
                                  Auto-starts in {countdown}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {event.title}
                        </h3>
                      </div>

                      {/* Right Header: Active Attendees Pill */}
                      <div className="flex items-center gap-2">
                        <span 
                          title="Click to view live logged-in participants"
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800/90 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 text-xs font-bold flex items-center gap-1.5"
                        >
                          <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>{isSelected ? activeUsers.length : (event.activeAttendeesCount || 0)} Logged In</span>
                        </span>
                      </div>
                    </div>

                    {/* Event Timing & Duration Meta Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800/80 text-xs text-slate-600 dark:text-zinc-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-zinc-200">
                            {formatHumanDateTime(event.start_date_time || event.start_time)}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                            {isPublished ? 'Live Since' : 'Auto-starts at mentioned time'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-zinc-200">
                            {event.duration || 30} Minutes Duration
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                            Window ends: {calculateEndTime(event.start_date_time || event.start_time, event.duration || 30)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Controls Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                        <span>Questions: <strong>{(event.questions || []).length || event.total_questions || 30}</strong></span>
                        <span>•</span>
                        <span className="capitalize">Mode: <strong>Strict Proctored</strong></span>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {/* Manual Start / Published Button */}
                          {isPublished ? (
                            <button
                              onClick={() => handleManualStartEvent(event)}
                              className="px-4 py-2 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-emerald-500/10"
                            >
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                              <span>Published (Live)</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleManualStartEvent(event)}
                              disabled={actionLoading}
                              title="Start immediately or let it start automatically at mentioned time"
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/25 dark:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Start Event Now</span>
                            </button>
                          )}

                          {/* Edit Schedule Button */}
                          <button
                            onClick={() => handleOpenEditModal(event)}
                            title="Edit Date, Time, and Duration"
                            className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span className="hidden sm:inline">Edit Schedule</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteEvent(event)}
                            title="Delete Event"
                            className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-600 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Live Attendees & Usernames Monitor (5 Cols on desktop) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="sticky top-20 rounded-3xl p-6 bg-white dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6">
            
            {/* Header: Live Logged-in Attendees */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-zinc-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold uppercase tracking-wider mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>Live Attendee Radar</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>Logged-in Users</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  {currentSelectedEvent ? (
                    <span>For: <strong className="text-slate-900 dark:text-white">{currentSelectedEvent.title}</strong></span>
                  ) : (
                    'Select an event to view active participants'
                  )}
                </p>
              </div>

              {/* Live Count Pill */}
              <div className="text-right">
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {activeUsers.length}
                </span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Online</p>
              </div>
            </div>

            {/* 5-Minute Joining Window Status Banner */}
            {currentSelectedEvent && (() => {
              const currentSelectedEventJoinWindow = getJoinWindowInfo(currentSelectedEvent);
              if (!currentSelectedEventJoinWindow?.isStarted) {
                return (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                      <div>
                        <p className="font-bold text-slate-800 dark:text-zinc-200">5-Minute Joining Window</p>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400">Activates automatically once event starts</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-[10px] font-bold">
                      Standby
                    </span>
                  </div>
                );
              }

              if (!currentSelectedEventJoinWindow.isClosed) {
                return (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span className="font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider text-[11px]">
                          5-Minute Joining Window Active
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-mono font-black animate-pulse">
                        {currentSelectedEventJoinWindow.remainingFormatted} left
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-snug">
                      Participants can enter freely right now. Once this 5-minute countdown finishes, all unentered participants will be locked out and will require admin permission to enter.
                    </p>
                  </div>
                );
              }

              return (
                <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 text-xs space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="font-extrabold text-amber-900 dark:text-amber-300 uppercase tracking-wider text-[11px]">
                        5-Minute Joining Window Closed
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 text-[10px] font-bold border border-red-200 dark:border-red-800">
                      Late Lock Active
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                    The initial 5-minute entry window expired. Unstarted participants are locked out from taking this quiz unless permitted below.
                  </p>
                  {isAdmin && (
                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-amber-500/20">
                      <span className="text-[10px] text-amber-800 dark:text-amber-400 font-semibold">
                        {lateJoinAllowedAll ? 'Late entry open for all' : 'Global override:'}
                      </span>
                      {lateJoinAllowedAll ? (
                        <button
                          onClick={() => handleRevokeLateJoin('ALL')}
                          disabled={lateActionLoading}
                          className="px-3 py-1 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Lock className="w-3 h-3" />
                          Lock Entry for Late Comers
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAllowLateJoin('ALL', 'Admin unlocked late entry for all participants')}
                          disabled={lateActionLoading}
                          className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-[11px] font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Unlock className="w-3 h-3" />
                          Allow ALL Late Participants
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Attendee Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter attendees by username or name..."
                value={attendeeSearch}
                onChange={(e) => setAttendeeSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Active Users List */}
            {activeUsersLoading && activeUsers.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-semibold">Scanning connected participants...</p>
              </div>
            ) : filteredAttendees.length === 0 ? (
              <div className="py-10 text-center rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-dashed border-slate-200 dark:border-zinc-800 p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">No participants currently logged in</p>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                    When participants sign in or access this published test, their usernames and online status will appear here live.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredAttendees.map((attendee) => {
                  const currentSelectedEventJoinWindow = getJoinWindowInfo(currentSelectedEvent);
                  const isLockedOut = attendee.isLateLocked || (currentSelectedEventJoinWindow?.isClosed && !attendee.hasStarted && !attendee.lateAllowed && !lateJoinAllowedAll);
                  const isPermitted = attendee.lateAllowed || lateJoinAllowedAll;

                  return (
                    <div
                      key={attendee.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 hover:border-blue-400 dark:hover:border-blue-700 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar with dynamic gradient */}
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                          {(attendee.name || attendee.username || 'U').charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {attendee.name}
                            </p>
                            <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-semibold truncate">
                              @{attendee.username}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                            {attendee.phone && (
                              <span className="flex items-center gap-0.5">
                                <Phone className="w-2.5 h-2.5" />
                                {attendee.phone}
                              </span>
                            )}
                            {attendee.email && (
                              <span className="flex items-center gap-0.5 truncate">
                                <Mail className="w-2.5 h-2.5" />
                                {attendee.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge & Late Join Controls */}
                      <div className="shrink-0 text-right flex flex-col items-end gap-1">
                        {attendee.isAttempting ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 text-[10px] font-bold">
                            <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                            Testing
                          </span>
                        ) : isPermitted ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 text-[10px] font-bold">
                              <Unlock className="w-2.5 h-2.5 text-emerald-600" />
                              Late Allowed
                            </span>
                            {isAdmin && !lateJoinAllowedAll && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRevokeLateJoin(attendee.id);
                                }}
                                disabled={lateActionLoading}
                                title="Revoke late join permission"
                                className="p-1 text-slate-400 hover:text-red-500 text-[10px] cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : isLockedOut ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800 text-[10px] font-bold">
                              <Lock className="w-2.5 h-2.5 text-red-500" />
                              Late Locked (&gt;5m)
                            </span>
                            {isAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAllowLateJoin(attendee.id, 'Admin approved late join');
                                }}
                                disabled={lateActionLoading}
                                className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                              >
                                <Unlock className="w-2.5 h-2.5" />
                                Allow Join
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            Logged In
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Live Indicator footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Auto-syncing presence every 4s</span>
              </span>
              <button
                onClick={() => selectedEventId && fetchActiveUsers(selectedEventId)}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
              >
                Sync Now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL: SCHEDULE NEW EVENT ================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Schedule New Event</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Configure quiz date, time, and participant duration</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Event Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
                  Event / Quiz Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eloquence 2K26 Round 2: Coding & Algorithms"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
                  Category / Domain
                </label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="General Technology">General Technology</option>
                  <option value="Round 1: Screening Test">Round 1: Screening Test</option>
                  <option value="Round 2: Technical & Coding">Round 2: Technical & Coding</option>
                  <option value="Final Grand Quiz">Final Grand Quiz</option>
                  <option value="Aptitude & Verbal">Aptitude & Verbal</option>
                </select>
              </div>

              {/* Start Date & Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
                  Scheduled Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={createForm.start_date_time}
                  onChange={(e) => setCreateForm({ ...createForm, start_date_time: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Duration in Minutes with Quick Pills */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
                  Duration (Minutes) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="180"
                    required
                    value={createForm.duration}
                    onChange={(e) => setCreateForm({ ...createForm, duration: e.target.value })}
                    className="w-28 px-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                  <div className="flex items-center gap-1.5">
                    {[15, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, duration: mins })}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          parseInt(createForm.duration, 10) === mins
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-200'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
                {createForm.start_date_time && (
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                    Scheduled end time: {calculateEndTime(createForm.start_date_time, createForm.duration)}
                  </p>
                )}
              </div>

              {/* Initial Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
                  Initial Status
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300 cursor-pointer">
                    <input
                      type="radio"
                      name="initialStatus"
                      value="Scheduled"
                      checked={createForm.status === 'Scheduled'}
                      onChange={() => setCreateForm({ ...createForm, status: 'Scheduled' })}
                      className="accent-blue-600"
                    />
                    <span>Scheduled (Ready to launch)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300 cursor-pointer">
                    <input
                      type="radio"
                      name="initialStatus"
                      value="Draft"
                      checked={createForm.status === 'Draft'}
                      onChange={() => setCreateForm({ ...createForm, status: 'Draft' })}
                      className="accent-blue-600"
                    />
                    <span>Draft</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Scheduling...' : 'Save & Schedule Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT SCHEDULE TIMING ================= */}
      {isEditModalOpen && editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#09090b] border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Event Schedule</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 truncate max-w-xs">
                    Adjust timing and duration for "{editingEvent.title}"
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Event Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
                  Event Title
                </label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Start Date & Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
                  Scheduled Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={editForm.start_date_time}
                  onChange={(e) => setEditForm({ ...editForm, start_date_time: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Duration in Minutes with Quick Pills */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider block">
                  Duration (Minutes)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    max="180"
                    required
                    value={editForm.duration}
                    onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                    className="w-28 px-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                  <div className="flex items-center gap-1.5">
                    {[15, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, duration: mins })}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          parseInt(editForm.duration, 10) === mins
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-200'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
                {editForm.start_date_time && (
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                    Calculated end time: {calculateEndTime(editForm.start_date_time, editForm.duration)}
                  </p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Updating...' : 'Save Schedule Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
