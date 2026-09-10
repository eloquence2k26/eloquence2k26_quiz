import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  Layers,
  Calendar,
  HelpCircle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ArrowRight,
  Sparkles,
  Award,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import EventModal from '../../components/admin/EventModal';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import { formatDate } from '../../utils/formatters';

export default function QuizzesPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await adminService.getEvents();
      if (res.success && res.data) {
        setEvents(res.data);
      }
    } catch (err) {
      toast.error('Failed to load events list');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedEvent(null);
    setModalOpen(true);
  };

  const handleEdit = (event) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  const handleSave = async (formData) => {
    try {
      if (selectedEvent) {
        const res = await adminService.updateEvent(selectedEvent.id, formData);
        if (res.success) {
          toast.success('Event updated successfully');
          setModalOpen(false);
          fetchData();
        }
      } else {
        const res = await adminService.createEvent(formData);
        if (res.success) {
          toast.success('Event created successfully');
          setModalOpen(false);
          fetchData();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving event');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete event "${title}"? This will remove all associated rounds, schedule, and quiz records.`)) {
      return;
    }
    try {
      const res = await adminService.deleteEvent(id);
      if (res.success) {
        toast.success(`Event "${title}" deleted successfully`);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting event');
    }
  };

  const handleToggleStatus = async (event) => {
    try {
      const newStatus = !event.is_active;
      const res = await adminService.updateEvent(event.id, { is_active: newStatus });
      if (res.success) {
        toast.success(`Event marked as ${newStatus ? 'Active' : 'Inactive'}`);
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to update event status');
    }
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchesSearch =
        ev.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ev.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ev.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === 'ALL'
          ? true
          : filterStatus === 'ACTIVE'
          ? ev.is_active === true
          : ev.is_active === false;

      return matchesSearch && matchesStatus;
    });
  }, [events, searchTerm, filterStatus]);

  // High-level overview stats
  const stats = useMemo(() => {
    const totalEvents = events.length;
    const activeEvents = events.filter((e) => e.is_active).length;
    const totalRounds = events.reduce((acc, e) => acc + (e.rounds_count || 2), 0);
    const totalQuestions = events.reduce((acc, e) => acc + (e.questions_count || 0), 0);
    return { totalEvents, activeEvents, totalRounds, totalQuestions };
  }, [events]);

  if (loading) return <Loading text="Loading symposium events..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Event Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
              {events.length} {events.length === 1 ? 'Event' : 'Events'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Create, configure, and maintain symposium competition tracks and events
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Refresh events"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-200 dark:border-brand-800">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Events</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">{stats.totalEvents}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Events</p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{stats.activeEvents}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Rounds</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">{stats.totalRounds}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Questions Bank</p>
            <p className="text-lg font-black text-slate-900 dark:text-white">{stats.totalQuestions}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search events by title, code, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filterStatus === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              All ({events.length})
            </button>
            <button
              onClick={() => setFilterStatus('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filterStatus === 'ACTIVE'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              Active ({stats.activeEvents})
            </button>
            <button
              onClick={() => setFilterStatus('INACTIVE')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filterStatus === 'INACTIVE'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              Inactive ({events.length - stats.activeEvents})
            </button>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto border border-brand-200 dark:border-brand-800">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {searchTerm ? 'No Matching Events Found' : 'No Events Created Yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {searchTerm
                ? 'Try adjusting your search criteria or filter to see events.'
                : 'Get started by creating your symposium competition events.'}
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* Header tags */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400 border border-slate-200 dark:border-slate-700">
                      {ev.code || 'EVT'}
                    </span>
                    <Badge variant={ev.is_active ? 'success' : 'default'} size="sm">
                      {ev.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(ev)}
                    className="text-[11px] font-medium text-slate-400 hover:text-brand-600 transition-colors"
                  >
                    {ev.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>

                {/* Event Name & Description */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {ev.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {ev.description || 'No description provided for this event.'}
                  </p>
                </div>

                {/* Dedicated Connected Sections Quick Jump */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Associated Sub-Sections
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Rounds Link */}
                    <button
                      onClick={() => navigate('/admin/rounds')}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-brand-50 dark:hover:bg-brand-950/40 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-800 transition-all text-left flex flex-col justify-between"
                      title="Configure Rounds in Rounds section"
                    >
                      <div className="flex items-center justify-between">
                        <Layers className="w-3.5 h-3.5 text-brand-500" />
                        <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-brand-500" />
                      </div>
                      <div className="mt-1">
                        <span className="text-[10px] text-slate-400 block leading-tight">Rounds</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {ev.rounds_count || 2} Rounds
                        </span>
                      </div>
                    </button>

                    {/* Schedule Link */}
                    <button
                      onClick={() => navigate('/admin/schedule')}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-brand-50 dark:hover:bg-brand-950/40 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-800 transition-all text-left flex flex-col justify-between"
                      title="Configure Schedule in Quiz Schedule section"
                    >
                      <div className="flex items-center justify-between">
                        <Calendar className="w-3.5 h-3.5 text-brand-500" />
                        <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-brand-500" />
                      </div>
                      <div className="mt-1">
                        <span className="text-[10px] text-slate-400 block leading-tight">Schedule</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {ev.schedule_status || 'Draft'}
                        </span>
                      </div>
                    </button>

                    {/* Questions Link */}
                    <button
                      onClick={() => navigate('/admin/questions')}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-brand-50 dark:hover:bg-brand-950/40 border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-800 transition-all text-left flex flex-col justify-between"
                      title="Manage Questions in Questions section"
                    >
                      <div className="flex items-center justify-between">
                        <HelpCircle className="w-3.5 h-3.5 text-brand-500" />
                        <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-brand-500" />
                      </div>
                      <div className="mt-1">
                        <span className="text-[10px] text-slate-400 block leading-tight">Questions</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {ev.questions_count || 0} MCQs
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Event Actions Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Created {ev.created_at ? formatDate(ev.created_at) : 'Symposium \'26'}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleEdit(ev)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit Event Details"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(ev.id, ev.title)}
                    className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                    title="Delete Event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pure Event Creation & Edit Modal */}
      <EventModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={selectedEvent}
      />
    </div>
  );
}
