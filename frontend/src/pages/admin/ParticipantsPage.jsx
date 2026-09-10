import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Trash2,
  Ban,
  CheckCircle,
  UserPlus,
  BookOpen,
  Edit2,
  Users,
  Trophy,
  CheckCircle2,
  RefreshCw,
  School,
  Phone,
  Mail,
  ShieldCheck,
  Hash,
  AlertCircle,
  Upload,
  Layers,
  FileText
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { quizService } from '../../services/quizService';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import EditParticipantModal from '../../components/admin/EditParticipantModal';
import DeleteParticipantModal from '../../components/admin/DeleteParticipantModal';
import MultiFormatParticipantImportModal from '../../components/admin/MultiFormatParticipantImportModal';
import ManualRegisterParticipantModal from '../../components/admin/ManualRegisterParticipantModal';

export default function ParticipantsPage() {
  const toast = useToast();
  const [participants, setParticipants] = useState([]);
  const [events, setEvents] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEvent, setFilterEvent] = useState('ALL');

  // Manual Register Modal State
  const [showManualRegisterModal, setShowManualRegisterModal] = useState(false);

  // Multi-format Doc Import Modal State
  const [showDocImportModal, setShowDocImportModal] = useState(false);

  // Edit Modal State
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Delete Modal State
  const [deletingParticipant, setDeletingParticipant] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Assign Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [assignAll, setAssignAll] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [pRes, qRes, eRes] = await Promise.all([
        adminService.getParticipants(),
        quizService.getAllQuizzes(),
        adminService.getEvents().catch(() => ({ success: false, data: [] }))
      ]);
      if (pRes.success) setParticipants(pRes.data || []);
      if (qRes.success) {
        setQuizzes(qRes.data || []);
        if (qRes.data?.length > 0 && !selectedQuizId) {
          setSelectedQuizId(qRes.data[0].id);
        }
      }
      if (eRes && eRes.success && eRes.data) {
        setEvents(eRes.data.map((e) => (typeof e === 'string' ? e : e.title || e.name || '')));
      }
      if (isManualRefresh) {
        toast.success('Participants registry updated');
      }
    } catch (err) {
      toast.error('Failed to load participants');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Open Edit Modal
  const handleEditClick = (p) => {
    setEditingParticipant(p);
    setShowEditModal(true);
  };

  // Save Participant Changes
  const handleSaveParticipant = async (id, updatedData) => {
    const res = await adminService.updateParticipant(id, updatedData);
    if (res.success) {
      toast.success('Participant updated successfully');
      fetchData();
    } else {
      throw new Error(res.message || 'Failed to update participant');
    }
  };

  // Open Delete Modal
  const handleDeleteClick = (p) => {
    setDeletingParticipant(p);
    setShowDeleteModal(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async (id) => {
    const res = await adminService.deleteParticipant(id);
    if (res.success) {
      toast.success('Participant deleted successfully');
      fetchData();
    } else {
      toast.error(res.message || 'Failed to delete participant');
    }
  };

  // Toggle Disabled / Active Status
  const handleToggleStatus = async (p) => {
    try {
      const newStatus = !p.is_disabled;
      const res = await adminService.toggleDisableParticipant(p.id, newStatus);
      if (res.success) {
        toast.success(`Participant account ${newStatus ? 'disabled' : 'enabled'}`);
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Handle Quiz Assignment
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedQuizId) {
      toast.error('Please select an examination');
      return;
    }
    if (!assignAll && selectedParticipantIds.length === 0) {
      toast.error('Please choose at least one participant or choose Assign All');
      return;
    }

    try {
      const res = await adminService.assignParticipantsToQuiz(
        selectedQuizId,
        selectedParticipantIds,
        assignAll
      );
      if (res.success) {
        toast.success(res.message || 'Participants assigned successfully');
        setShowAssignModal(false);
        setSelectedParticipantIds([]);
        setAssignAll(false);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign participants');
    }
  };

  const toggleSelectParticipant = (id) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (loading) return <Loading text="Loading participants registry..." />;

  // Filter logic
  let filtered = participants;

  if (filterEvent && filterEvent !== 'ALL') {
    filtered = filtered.filter(
      (p) => (p.event || 'Technical Quiz').toLowerCase() === filterEvent.toLowerCase()
    );
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    filtered = filtered.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(term) ||
        p.participant_id?.toLowerCase().includes(term) ||
        p.registration_number?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term) ||
        p.mobile?.toLowerCase().includes(term) ||
        p.college?.toLowerCase().includes(term) ||
        p.department?.toLowerCase().includes(term) ||
        p.event?.toLowerCase().includes(term)
    );
  }

  // Summary Metrics
  const totalCount = participants.length;
  const round1QualifiedCount = participants.filter((p) => p.round_1_selected).length;
  const round2WinnerCount = participants.filter((p) => p.round_2_selected).length;
  const disabledCount = participants.filter((p) => p.is_disabled).length;
  const activeCount = totalCount - disabledCount;

  // Build unique event options combining event state & participant event fields
  const eventOptionsSet = new Set(events.filter(Boolean));
  participants.forEach((p) => {
    if (p.event) eventOptionsSet.add(p.event);
  });
  const eventOptions = Array.from(eventOptionsSet);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Participants Registry
            </h1>
            <button
              type="button"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              title="Refresh Registry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-600' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage scholar registrations, event rosters, qualification, and quiz access
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowManualRegisterModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 shadow-md shadow-brand-500/20 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Manual Register</span>
          </button>

          <button
            onClick={() => setShowDocImportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 transition-all"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload List (PDF/Excel/Word)</span>
          </button>

          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm transition-all"
          >
            <BookOpen className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>Assign Quiz</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Scholars
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {totalCount}
            </span>
            <span className="text-[11px] text-slate-400">Registered</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Round 1 Qualified
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {round1QualifiedCount}
            </span>
            <span className="text-[11px] text-slate-400">for Round 2</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Round 2 Finalists
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Trophy className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {round2WinnerCount}
            </span>
            <span className="text-[11px] text-slate-400">Achieved</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Accounts
            </span>
            <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {activeCount}
            </span>
            <span className="text-[11px] text-slate-400">
              {disabledCount > 0 ? `(${disabledCount} disabled)` : 'all active'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar: Replaced 3 old dropdowns with Event Selector and Multi-Format Upload Trigger */}
      <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search scholars by name, ID, Reg No, email, college, event..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
        </div>

        {/* Event Selection Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer min-w-[190px]"
            >
              <option value="ALL">All Events ({eventOptions.length > 0 ? eventOptions.length : 'All'})</option>
              {eventOptions.map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Manual Register Button */}
        <button
          type="button"
          onClick={() => setShowManualRegisterModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-300 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/40 text-xs font-bold text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-all"
          title="Manually register an individual participant"
        >
          <UserPlus className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
          <span>+ Add Participant</span>
        </button>

        {/* Quick Upload from Document Button */}
        <button
          type="button"
          onClick={() => setShowDocImportModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all"
          title="Import participants from PDF, Excel, Word, or CSV"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Upload File</span>
        </button>

        {/* Clear Filters Button */}
        {(searchTerm || filterEvent !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setFilterEvent('ALL');
            }}
            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Participants Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Participant ID / Reg No</th>
                <th className="py-3 px-4">Scholar Profile</th>
                <th className="py-3 px-4">Institution & Dept</th>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">Progression</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-center">Quizzes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium text-slate-700 dark:text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-bold text-sm text-slate-600 dark:text-slate-300">
                        No participants found
                      </p>
                      <p className="text-xs text-slate-400">
                        {participants.length === 0
                          ? 'No participants are registered yet. Click "Upload List" above to import candidate rosters.'
                          : 'Try changing your search keywords or event selection filter.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Participant ID & Reg No */}
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-brand-600 dark:text-brand-400">
                        {p.participant_id}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {p.registration_number || '—'}
                      </div>
                    </td>

                    {/* Name & Contact */}
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {p.full_name}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{p.email}</span>
                        {p.mobile && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{p.mobile}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* College & Department */}
                    <td className="py-3 px-4">
                      <p className="text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[200px]">
                        {p.college || '—'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {p.department || 'General'} • {p.year || '3rd Year'}
                      </p>
                    </td>

                    {/* Event Tag */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200/50 dark:border-brand-800/40">
                        {p.event || 'Technical Quiz'}
                      </span>
                    </td>

                    {/* Progression Badges */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        {p.round_2_selected ? (
                          <Badge variant="warning" size="sm">
                            🏆 Round 2 Finalist
                          </Badge>
                        ) : p.round_1_selected ? (
                          <Badge variant="success" size="sm">
                            ✓ Qualified Round 2
                          </Badge>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400">
                            Round 1 Candidate
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Account Status */}
                    <td className="py-3 px-4">
                      {p.is_disabled ? (
                        <Badge variant="danger" size="sm">
                          Disabled
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          Active
                        </Badge>
                      )}
                    </td>

                    {/* Quizzes Assigned Count */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {p.assigned_quizzes_count ?? '—'}
                      </span>
                    </td>

                    {/* Actions: Edit, Status, Delete */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleEditClick(p)}
                          className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all"
                          title="Edit Participant"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Status Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            p.is_disabled
                              ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60'
                              : 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40 border-amber-200 dark:border-amber-900/60'
                          }`}
                          title={p.is_disabled ? 'Enable Account' : 'Disable Account'}
                        >
                          {p.is_disabled ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : (
                            <Ban className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(p)}
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                          title="Delete Participant"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Register Participant Modal */}
      <ManualRegisterParticipantModal
        isOpen={showManualRegisterModal}
        onClose={() => setShowManualRegisterModal(false)}
        onSuccess={() => fetchData(true)}
        eventsList={eventOptions}
        initialEvent={filterEvent !== 'ALL' ? filterEvent : (eventOptions[0] || 'Technical Quiz')}
        totalParticipants={participants.length}
      />

      {/* Multi-Format Document Import Modal */}
      <MultiFormatParticipantImportModal
        isOpen={showDocImportModal}
        onClose={() => setShowDocImportModal(false)}
        onSuccess={() => fetchData(true)}
        eventsList={eventOptions}
        initialEvent={filterEvent !== 'ALL' ? filterEvent : (eventOptions[0] || 'Technical Quiz')}
      />

      {/* Edit Participant Modal */}
      <EditParticipantModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingParticipant(null);
        }}
        participant={editingParticipant}
        onSave={handleSaveParticipant}
      />

      {/* Delete Participant Modal */}
      <DeleteParticipantModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingParticipant(null);
        }}
        participant={deletingParticipant}
        onConfirm={handleConfirmDelete}
      />

      {/* Assign to Quiz Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Participants to Quiz"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Select Examination *
            </label>
            <select
              value={selectedQuizId}
              onChange={(e) => setSelectedQuizId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
            >
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  Round {q.round_number}: {q.title} ({q.status})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                Select Participants ({selectedParticipantIds.length} chosen)
              </label>
              <label className="flex items-center gap-1.5 text-xs font-bold text-brand-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assignAll}
                  onChange={(e) => setAssignAll(e.target.checked)}
                  className="rounded text-brand-600"
                />
                <span>Assign All {participants.length}</span>
              </label>
            </div>

            {!assignAll && (
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-slate-50 dark:bg-slate-800/40">
                {participants.map((p) => {
                  const isChecked = selectedParticipantIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleSelectParticipant(p.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs ${
                        isChecked
                          ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-900 dark:text-brand-300 font-bold'
                          : 'hover:bg-white dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>
                        {p.full_name} ({p.participant_id})
                      </span>
                      <span className="text-[10px] text-slate-400">{p.college}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAssignModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20"
            >
              Confirm Assignment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
