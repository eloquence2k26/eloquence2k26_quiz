import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Trash2, Ban, CheckCircle, UserPlus, CheckSquare, Sparkles, BookOpen } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { quizService } from '../../services/quizService';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';

export default function ParticipantsPage() {
  const toast = useToast();
  const [participants, setParticipants] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCollege, setFilterCollege] = useState('');
  const [filterRound1, setFilterRound1] = useState('ALL');

  // Assign Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState([]);
  const [assignAll, setAssignAll] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, qRes] = await Promise.all([
        adminService.getParticipants(),
        quizService.getAllQuizzes()
      ]);
      if (pRes.success) setParticipants(pRes.data || []);
      if (qRes.success) {
        setQuizzes(qRes.data || []);
        if (qRes.data?.length > 0) setSelectedQuizId(qRes.data[0].id);
      }
    } catch (err) {
      toast.error('Failed to load participants');
    } finally {
      setLoading(false);
    }
  };

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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to completely delete this participant?')) return;
    try {
      const res = await adminService.deleteParticipant(id);
      if (res.success) {
        toast.success('Participant deleted');
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to delete participant');
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await adminService.assignParticipantsToQuiz(
        selectedQuizId,
        selectedParticipantIds,
        assignAll
      );
      if (res.success) {
        toast.success(res.message);
        setShowAssignModal(false);
        fetchData();
      }
    } catch (err) {
      toast.error('Failed to assign participants');
    }
  };

  const toggleSelectParticipant = (id) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (loading) return <Loading text="Loading participants registry..." />;

  let filtered = participants;
  if (filterRound1 !== 'ALL') {
    filtered = filtered.filter((p) => Boolean(p.round_1_selected) === (filterRound1 === 'SELECTED'));
  }
  if (filterCollege) {
    filtered = filtered.filter((p) => p.college.toLowerCase().includes(filterCollege.toLowerCase()));
  }
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter((p) =>
      p.full_name.toLowerCase().includes(term) ||
      p.participant_id.toLowerCase().includes(term) ||
      p.email.toLowerCase().includes(term) ||
      p.college.toLowerCase().includes(term)
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Participants Registry
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total {participants.length} registered scholars across colleges and universities
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/user-register"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register / Import Users</span>
          </Link>

          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-sm"
          >
            <BookOpen className="w-4 h-4 text-brand-600" />
            <span>Assign to Quiz</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, ID, email, or college..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
          />
        </div>

        <select
          value={filterRound1}
          onChange={(e) => setFilterRound1(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
        >
          <option value="ALL">All Round Status</option>
          <option value="SELECTED">Round 1 Selected</option>
          <option value="NOT_SELECTED">Not Selected</option>
        </select>
      </div>

      {/* Participants Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Participant ID</th>
                <th className="py-3 px-4">Name & Email</th>
                <th className="py-3 px-4">College & Dept</th>
                <th className="py-3 px-4">Round 1 Status</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3.5 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                    {p.participant_id}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900 dark:text-white">{p.full_name}</p>
                    <p className="text-[11px] text-slate-400">{p.email}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="text-slate-800 dark:text-slate-200">{p.college}</p>
                    <p className="text-[10px] text-slate-400">{p.department} • {p.year}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    {p.round_1_selected ? (
                      <Badge variant="success" size="sm">Qualified Round 2</Badge>
                    ) : (
                      <Badge variant="default" size="sm">Round 1 Candidate</Badge>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {p.is_disabled ? (
                      <Badge variant="danger" size="sm">Disabled</Badge>
                    ) : (
                      <Badge variant="success" size="sm">Active</Badge>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleStatus(p)}
                        className={`p-1.5 rounded-lg border text-xs font-semibold ${
                          p.is_disabled
                            ? 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                            : 'text-amber-600 hover:bg-amber-50 border-amber-200'
                        }`}
                        title={p.is_disabled ? 'Enable Account' : 'Disable Account'}
                      >
                        {p.is_disabled ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                        title="Delete Participant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Modal */}
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
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
                        isChecked ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-white'
                      }`}
                    >
                      <span>{p.full_name} ({p.participant_id})</span>
                      <span className="text-[10px] text-slate-400">{p.college}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAssignModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
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
