import React, { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Send, Sparkles } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { formatDateTime } from '../../utils/formatters';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import Loading from '../../components/common/Loading';

export default function AnnouncementsPage() {
  const toast = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_type: 'ALL'
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await adminService.getAnnouncements();
      if (res.success) setAnnouncements(res.data || []);
    } catch (err) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await adminService.createAnnouncement(formData);
      if (res.success) {
        toast.success('Announcement published');
        setCreateModalOpen(false);
        setFormData({ title: '', message: '', target_type: 'ALL' });
        fetchAnnouncements();
      }
    } catch (err) {
      toast.error('Failed to publish announcement');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this broadcast announcement?')) return;
    try {
      const res = await adminService.deleteAnnouncement(id);
      if (res.success) {
        toast.success('Announcement removed');
        fetchAnnouncements();
      }
    } catch (err) {
      toast.error('Error deleting announcement');
    }
  };

  if (loading) return <Loading text="Loading symposium announcements..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Symposium Announcements
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Broadcast notifications, exam instructions, and schedules to participants
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Announcement</span>
        </button>
      </div>

      {/* Announcements Feed */}
      <div className="space-y-4">
        {announcements.map((ann) => (
          <div
            key={ann.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 mt-0.5">
                <Bell className="w-5 h-5" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{ann.title}</h3>
                  <Badge variant={ann.target_type === 'ALL' ? 'default' : 'purple'} size="sm">
                    {ann.target_type}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
                  {ann.message}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  Broadcasted: {formatDateTime(ann.created_at)}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleDelete(ann.id)}
              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
              title="Delete Announcement"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Broadcast New Announcement"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Round 1 Results Published"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Message Content *
            </label>
            <textarea
              required
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Type announcement details here..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Target Audience
            </label>
            <select
              value={formData.target_type}
              onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
            >
              <option value="ALL">All Participants & Staff</option>
              <option value="ROUND_1">Round 1 Participants Only</option>
              <option value="ROUND_2">Round 2 Qualifiers Only</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20"
            >
              Broadcast Announcement
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
