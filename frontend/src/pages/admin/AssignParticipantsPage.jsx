import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  Upload,
  FileText,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Search,
  Filter,
  Trash2,
  Sparkles,
  ArrowRight,
  BookOpen,
  Layers,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  ShieldCheck,
  HelpCircle,
  FileCode,
  FileUp,
  X,
  ChevronDown
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { quizService } from '../../services/quizService';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/formatters';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';

export default function AssignParticipantsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [participants, setParticipants] = useState([]);
  
  // UI Tabs: 'manual' or 'import'
  const [activeTab, setActiveTab] = useState('manual');

  // Manual Selection State
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [assignFilter, setAssignFilter] = useState('ALL'); // 'ALL', 'ASSIGNED', 'UNASSIGNED'
  const [selectedParticipantIds, setSelectedParticipantIds] = useState(new Set());
  const [assigning, setAssigning] = useState(false);

  // File Upload State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadMeta, setUploadMeta] = useState({
    college: 'Engineering College',
    department: 'Computer Science & Engineering',
    year: '3rd Year'
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // Raw Text Paste State
  const [pasteText, setPasteText] = useState('');
  const [isPasting, setIsPasting] = useState(false);

  // Assigned List State
  const [assignedSearch, setAssignedSearch] = useState('');
  const [selectedAssignedIds, setSelectedAssignedIds] = useState(new Set());
  const [unassigning, setUnassigning] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [qRes, pRes] = await Promise.all([
        quizService.getAllQuizzes(),
        adminService.getParticipants()
      ]);

      if (qRes.success && qRes.data) {
        setQuizzes(qRes.data);
        if (qRes.data.length > 0 && !selectedQuizId) {
          setSelectedQuizId(qRes.data[0].id);
        }
      }

      if (pRes.success && pRes.data) {
        setParticipants(pRes.data);
      }
    } catch (err) {
      toast.error('Failed to load examination data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      const [qRes, pRes] = await Promise.all([
        quizService.getAllQuizzes(),
        adminService.getParticipants()
      ]);
      if (qRes.success && qRes.data) setQuizzes(qRes.data);
      if (pRes.success && pRes.data) setParticipants(pRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const selectedQuiz = useMemo(() => {
    return quizzes.find((q) => q.id === selectedQuizId) || quizzes[0] || null;
  }, [quizzes, selectedQuizId]);

  // List of participants currently assigned to the selected quiz
  const assignedParticipants = useMemo(() => {
    if (!selectedQuiz) return [];
    return participants.filter((p) => {
      return Array.isArray(p.assigned_quiz_ids) && p.assigned_quiz_ids.includes(selectedQuiz.id);
    });
  }, [participants, selectedQuiz]);

  // Filtered participants for manual selection
  const filteredParticipants = useMemo(() => {
    if (!selectedQuiz) return [];
    const term = searchQuery.toLowerCase().trim();

    return participants.filter((p) => {
      const isAssigned = Array.isArray(p.assigned_quiz_ids) && p.assigned_quiz_ids.includes(selectedQuiz.id);

      if (assignFilter === 'ASSIGNED' && !isAssigned) return false;
      if (assignFilter === 'UNASSIGNED' && isAssigned) return false;
      if (deptFilter !== 'ALL' && p.department !== deptFilter) return false;

      if (!term) return true;

      const nameMatch = (p.full_name || '').toLowerCase().includes(term);
      const idMatch = (p.participant_id || '').toLowerCase().includes(term);
      const regMatch = (p.registration_number || '').toLowerCase().includes(term);
      const emailMatch = (p.email || '').toLowerCase().includes(term);
      const phoneMatch = (p.mobile || '').toLowerCase().includes(term);
      const colMatch = (p.college || '').toLowerCase().includes(term);

      return nameMatch || idMatch || regMatch || emailMatch || phoneMatch || colMatch;
    });
  }, [participants, selectedQuiz, searchQuery, deptFilter, assignFilter]);

  // Unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set(participants.map((p) => p.department).filter(Boolean));
    return Array.from(set);
  }, [participants]);

  // Handle "Select All" toggle for manual assignment table
  const allFilteredSelected = useMemo(() => {
    if (filteredParticipants.length === 0) return false;
    return filteredParticipants.every((p) => selectedParticipantIds.has(p.id));
  }, [filteredParticipants, selectedParticipantIds]);

  const handleToggleSelectAll = () => {
    const next = new Set(selectedParticipantIds);
    if (allFilteredSelected) {
      filteredParticipants.forEach((p) => next.delete(p.id));
    } else {
      filteredParticipants.forEach((p) => next.add(p.id));
    }
    setSelectedParticipantIds(next);
  };

  const handleToggleParticipant = (id) => {
    const next = new Set(selectedParticipantIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedParticipantIds(next);
  };

  // Perform Manual Assignment
  const handleAssignSelected = async () => {
    if (!selectedQuiz) {
      toast.warning('Please choose a quiz first');
      return;
    }
    if (selectedParticipantIds.size === 0) {
      toast.warning('Please select at least one scholar to assign');
      return;
    }

    setAssigning(true);
    try {
      const res = await adminService.assignParticipantsToQuiz(
        selectedQuiz.id,
        Array.from(selectedParticipantIds),
        false
      );

      if (res.success) {
        toast.success(`Successfully assigned ${selectedParticipantIds.size} scholar(s) to "${selectedQuiz.title}"`);
        setSelectedParticipantIds(new Set());
        await refreshData();
      }
    } catch (err) {
      toast.error('Assignment failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setAssigning(false);
    }
  };

  // Perform "Assign ALL Filtered"
  const handleAssignAllFiltered = async () => {
    if (!selectedQuiz) return;
    if (filteredParticipants.length === 0) {
      toast.warning('No scholars available in current filter');
      return;
    }

    const ids = filteredParticipants.map((p) => p.id);
    setAssigning(true);
    try {
      const res = await adminService.assignParticipantsToQuiz(
        selectedQuiz.id,
        ids,
        false
      );

      if (res.success) {
        toast.success(`Successfully assigned all ${ids.length} filtered scholars to "${selectedQuiz.title}"`);
        setSelectedParticipantIds(new Set());
        await refreshData();
      }
    } catch (err) {
      toast.error('Assignment failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setAssigning(false);
    }
  };

  // Perform Unassign
  const handleUnassignSingle = async (participantId) => {
    if (!selectedQuiz) return;
    setUnassigning(true);
    try {
      const res = await adminService.unassignParticipantsFromQuiz(selectedQuiz.id, [participantId]);
      if (res.success) {
        toast.success(`Scholar unassigned from "${selectedQuiz.title}"`);
        await refreshData();
      }
    } catch (err) {
      toast.error('Unassign failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setUnassigning(false);
    }
  };

  const handleUnassignSelectedBatch = async () => {
    if (!selectedQuiz || selectedAssignedIds.size === 0) return;
    setUnassigning(true);
    try {
      const res = await adminService.unassignParticipantsFromQuiz(
        selectedQuiz.id,
        Array.from(selectedAssignedIds)
      );
      if (res.success) {
        toast.success(`Successfully removed ${selectedAssignedIds.size} assignment(s)`);
        setSelectedAssignedIds(new Set());
        await refreshData();
      }
    } catch (err) {
      toast.error('Batch unassign failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setUnassigning(false);
    }
  };

  // Perform Multi-format Document Upload & Assign
  const handleFileUploadAndAssign = async (e) => {
    e.preventDefault();
    if (!selectedQuiz) {
      toast.warning('Please select a target quiz');
      return;
    }
    if (!uploadFile) {
      toast.warning('Please choose a document to import (PDF, Excel, Word, CSV, JSON, TXT)');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('quiz_id', selectedQuiz.id);
      formData.append('event_name', selectedQuiz.event_name || selectedQuiz.title);
      formData.append('college', uploadMeta.college);
      formData.append('department', uploadMeta.department);
      formData.append('year', uploadMeta.year);
      formData.append('assign_quiz', 'true');

      const res = await adminService.importParticipantsFile(formData);
      if (res.success) {
        toast.success(res.message || `Successfully imported and assigned scholars to "${selectedQuiz.title}"!`);
        setUploadResult(res.data);
        setUploadFile(null);
        await refreshData();
      }
    } catch (err) {
      toast.error('Document import failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsUploading(false);
    }
  };

  // Perform Raw Text Parse & Assign
  const handlePasteAndAssign = async () => {
    if (!selectedQuiz) {
      toast.warning('Please select a target quiz');
      return;
    }
    if (!pasteText.trim()) {
      toast.warning('Please paste scholar rows or data');
      return;
    }

    setIsPasting(true);
    try {
      const blob = new Blob([pasteText], { type: 'text/plain' });
      const file = new File([blob], 'pasted_participants.txt', { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('quiz_id', selectedQuiz.id);
      formData.append('event_name', selectedQuiz.event_name || selectedQuiz.title);
      formData.append('college', uploadMeta.college);
      formData.append('department', uploadMeta.department);
      formData.append('year', uploadMeta.year);
      formData.append('assign_quiz', 'true');

      const res = await adminService.importParticipantsFile(formData);
      if (res.success) {
        toast.success(res.message || `Successfully processed and assigned scholars to "${selectedQuiz.title}"!`);
        setUploadResult(res.data);
        setPasteText('');
        await refreshData();
      }
    } catch (err) {
      toast.error('Processing failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsPasting(false);
    }
  };

  if (loading) return <Loading text="Loading quiz assignments and scholars..." />;

  const filteredAssignedParticipants = assignedParticipants.filter((p) => {
    if (!assignedSearch.trim()) return true;
    const term = assignedSearch.toLowerCase();
    return (
      (p.full_name || '').toLowerCase().includes(term) ||
      (p.participant_id || '').toLowerCase().includes(term) ||
      (p.registration_number || '').toLowerCase().includes(term) ||
      (p.college || '').toLowerCase().includes(term) ||
      (p.department || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900/50 text-[11px] font-bold text-brand-700 dark:text-brand-300 uppercase tracking-wider mb-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Competition Enrollment Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Assign Participants to Examination & Rounds
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Import any document format (PDF, Excel, Word, CSV, JSON) or manually select scholars to assign quizzes.
          </p>
        </div>

        <button
          onClick={refreshData}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Target Quiz Selector Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Step 1: Choose Target Examination / Round
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Select Quiz to Manage Candidate Attendance
            </h3>
          </div>

          {/* Quiz Selector Dropdown */}
          <div className="w-full md:w-80">
            <select
              value={selectedQuizId}
              onChange={(e) => {
                setSelectedQuizId(e.target.value);
                setSelectedParticipantIds(new Set());
                setSelectedAssignedIds(new Set());
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-brand-300 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-950/40 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title} (Round {q.round_number || 1}) - [{q.status}]
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Quiz Feature Card */}
        {selectedQuiz && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-brand-50/30 to-indigo-50/30 dark:from-slate-800/60 dark:via-brand-950/20 dark:to-indigo-950/20 border border-slate-200 dark:border-slate-700/80 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Event & Round</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="font-extrabold text-slate-900 dark:text-white truncate">
                  {selectedQuiz.event_name || selectedQuiz.title}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  R{selectedQuiz.round_number || 1}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Exam Status</span>
              <div className="mt-0.5">
                <Badge
                  variant={selectedQuiz.status === 'Live' ? 'success' : selectedQuiz.status === 'Draft' ? 'warning' : 'primary'}
                  size="sm"
                >
                  {selectedQuiz.status}
                </Badge>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Schedule Window</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {formatDate(selectedQuiz.start_date)} ({selectedQuiz.start_time || '09:00'})
              </p>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Duration & Marks</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {selectedQuiz.duration_minutes} Mins • {selectedQuiz.max_marks || 100} Pts
              </p>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Questions</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {selectedQuiz.total_questions || 0} Questions
              </p>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Assigned Scholars</span>
              <p className="font-black text-brand-600 dark:text-brand-400 mt-0.5 text-sm">
                {assignedParticipants.length} Enrolled
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Switcher: Manual vs Multi-format Import */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'manual'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Manual Selection ({filteredParticipants.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'import'
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Multi-Format Direct Import (PDF, Excel, Word, CSV, JSON)</span>
        </button>
      </div>

      {/* TAB 1: MANUAL SELECTION & ASSIGN */}
      {activeTab === 'manual' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search scholars by name, registration #, ID, email, phone, or college..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Department Filter */}
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={assignFilter}
                onChange={(e) => setAssignFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                <option value="ALL">All Status</option>
                <option value="UNASSIGNED">Not in this Quiz</option>
                <option value="ASSIGNED">Already in this Quiz</option>
              </select>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {allFilteredSelected ? (
                  <CheckSquare className="w-4 h-4 text-brand-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>Select All ({filteredParticipants.length})</span>
              </button>

              <span className="text-xs text-slate-500 font-medium">
                {selectedParticipantIds.size} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={assigning || selectedParticipantIds.size === 0}
                onClick={handleAssignSelected}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 shadow-md shadow-brand-500/20 transition-all"
              >
                <UserCheck className="w-4 h-4" />
                <span>
                  {assigning ? 'Assigning...' : `Assign Selected (${selectedParticipantIds.size}) to Quiz`}
                </span>
              </button>

              <button
                type="button"
                disabled={assigning || filteredParticipants.length === 0}
                onClick={handleAssignAllFiltered}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-all disabled:opacity-50"
              >
                <span>Assign All Filtered ({filteredParticipants.length})</span>
              </button>
            </div>
          </div>

          {/* Scholars Candidate Selection Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-slate-600"
                    />
                  </th>
                  <th className="py-3 px-4">Scholar Info</th>
                  <th className="py-3 px-4">College & Department</th>
                  <th className="py-3 px-4">Current Assignments</th>
                  <th className="py-3 px-4">Status for This Quiz</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No scholars found matching the filters.
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map((p) => {
                    const isSelected = selectedParticipantIds.has(p.id);
                    const isAlreadyAssigned =
                      selectedQuiz &&
                      Array.isArray(p.assigned_quiz_ids) &&
                      p.assigned_quiz_ids.includes(selectedQuiz.id);

                    return (
                      <tr
                        key={p.id}
                        onClick={() => handleToggleParticipant(p.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-brand-50/60 dark:bg-brand-950/30'
                            : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleParticipant(p.id)}
                            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-slate-600"
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-bold flex items-center justify-center text-xs flex-shrink-0">
                              {p.full_name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white leading-tight">
                                {p.full_name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[10px] text-brand-600 dark:text-brand-400 font-bold">
                                  {p.participant_id}
                                </span>
                                <span className="text-[10px] text-slate-400">• Reg: {p.registration_number}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{p.college}</p>
                          <p className="text-[10px] text-slate-400">{p.department} ({p.year})</p>
                        </td>
                        <td className="py-3.5 px-4">
                          {p.assigned_quiz_titles && p.assigned_quiz_titles.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {p.assigned_quiz_titles.map((t, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">None</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {isAlreadyAssigned ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Enrolled</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              <span>Available</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MULTI-FORMAT DIRECT IMPORT & ASSIGN */}
      {activeTab === 'import' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* File Upload Zone */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <FileUp className="w-4 h-4 text-brand-600" />
                  <span>Upload Document to Directly Assign</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Supports PDF (.pdf), Excel (.xlsx, .xls), CSV (.csv), Word (.docx), JSON (.json), and TXT files.
                </p>
              </div>

              <form onSubmit={handleFileUploadAndAssign} className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-brand-500 rounded-2xl p-6 text-center bg-slate-50/50 dark:bg-slate-800/30 transition-colors">
                  <input
                    type="file"
                    id="doc-assign-file"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.json,.txt"
                    className="hidden"
                  />
                  <label htmlFor="doc-assign-file" className="cursor-pointer space-y-2 block">
                    <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>
                    {uploadFile ? (
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{uploadFile.name}</p>
                        <p className="text-[10px] text-slate-400">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          Click to browse or drop file here
                        </p>
                        <p className="text-[10px] text-slate-400">PDF, Excel, Word, CSV, JSON, TXT</p>
                      </div>
                    )}
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Default College</label>
                    <input
                      type="text"
                      value={uploadMeta.college}
                      onChange={(e) => setUploadMeta({ ...uploadMeta, college: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Default Dept</label>
                    <input
                      type="text"
                      value={uploadMeta.department}
                      onChange={(e) => setUploadMeta({ ...uploadMeta, department: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Default Year</label>
                    <input
                      type="text"
                      value={uploadMeta.year}
                      onChange={(e) => setUploadMeta({ ...uploadMeta, year: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUploading || !uploadFile || !selectedQuiz}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    {isUploading
                      ? 'Parsing Document & Assigning...'
                      : `Import & Directly Assign to "${selectedQuiz?.title || 'Selected Quiz'}"`}
                  </span>
                </button>
              </form>
            </div>

            {/* Raw Text Paste Zone */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Or Paste Scholar Roster / Text</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Paste candidate names, phone numbers, emails, or tabular rows directly.
                </p>
              </div>

              <div className="space-y-3">
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`John Doe, 9876543210, john@example.com, CSE, 3rd Year\nJane Smith, 9876543211, jane@example.com, CSE, 3rd Year`}
                  rows={8}
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />

                <button
                  type="button"
                  disabled={isPasting || !pasteText.trim() || !selectedQuiz}
                  onClick={handlePasteAndAssign}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isPasting
                      ? 'Processing Text & Assigning...'
                      : `Process Text & Assign to "${selectedQuiz?.title || 'Selected Quiz'}"`}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Import Result Summary */}
          {uploadResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Import Success: {uploadResult.importedCount} scholars processed and assigned!</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Credentials auto-generated based on mobile number and synced with live database.
              </p>
            </div>
          )}
        </div>
      )}

      {/* CURRENTLY ENROLLED SCHOLARS SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-brand-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Enrolled Scholars in "{selectedQuiz?.title || 'Selected Quiz'}"
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {assignedParticipants.length} scholars currently assigned to this examination.
            </p>
          </div>

          {/* Search inside assigned list */}
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={assignedSearch}
                onChange={(e) => setAssignedSearch(e.target.value)}
                placeholder="Search enrolled scholars..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            {selectedAssignedIds.size > 0 && (
              <button
                type="button"
                disabled={unassigning}
                onClick={handleUnassignSelectedBatch}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Unassign Selected ({selectedAssignedIds.size})</span>
              </button>
            )}
          </div>
        </div>

        {/* Enrolled Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 w-10 text-center">#</th>
                <th className="py-3 px-4">Scholar Name & ID</th>
                <th className="py-3 px-4">College & Dept</th>
                <th className="py-3 px-4">Phone / Email</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {filteredAssignedParticipants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No scholars currently assigned to this quiz. Use the Manual Selection or Multi-Format Import above to assign scholars.
                  </td>
                </tr>
              ) : (
                filteredAssignedParticipants.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 dark:text-white">{p.full_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[10px] text-brand-600 dark:text-brand-400 font-bold">
                          {p.participant_id}
                        </span>
                        <span className="text-[10px] text-slate-400">• {p.registration_number}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{p.college}</p>
                      <p className="text-[10px] text-slate-400">{p.department} ({p.year})</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-mono text-slate-700 dark:text-slate-300">{p.mobile || 'N/A'}</p>
                      <p className="text-[10px] text-slate-400">{p.email}</p>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        disabled={unassigning}
                        onClick={() => handleUnassignSingle(p.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/50 transition-all inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Unassign</span>
                      </button>
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
