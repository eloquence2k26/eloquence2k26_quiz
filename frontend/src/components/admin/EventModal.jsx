import React, { useState, useEffect } from 'react';
import { Calendar, BookOpen, Sparkles, CheckCircle2, Layers, HelpCircle, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';

export default function EventModal({ isOpen, onClose, onSave, initialData = null }) {
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    description: '',
    is_active: true
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || initialData.event_name || '',
        code: initialData.code || initialData.event_code || '',
        description: initialData.description || '',
        is_active: initialData.is_active !== undefined ? initialData.is_active : true
      });
    } else {
      setFormData({
        title: '',
        code: '',
        description: '',
        is_active: true
      });
    }
    setError('');
  }, [initialData, isOpen]);

  const handleTitleChange = (val) => {
    const updates = { title: val };
    // Auto-generate code if user hasn't typed a custom one or editing an existing one with no code
    if (!initialData && (!formData.code || formData.code.startsWith('EVT-'))) {
      const clean = val.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
      updates.code = clean ? `EVT-${clean}` : '';
    }
    setFormData((prev) => ({ ...prev, ...updates }));
    if (error) setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Event Title is required');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      code: formData.code.trim() || `EVT-${formData.title.trim().slice(0, 4).toUpperCase()}`,
      description: formData.description.trim(),
      is_active: Boolean(formData.is_active)
    };

    onSave(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Event' : 'Create New Event'}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Basic Event Details */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Event Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Web Craft, Code Clash, Technical Quiz"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Event Code / Identifier
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. WC26, CC26, ELQ26"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-brand-600 dark:text-brand-400 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors uppercase"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Used for candidate exam routing, badges, and identification.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Event Description & Guidelines
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Overview of the symposium event, topics covered, eligibility, rules..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors resize-none"
            />
          </div>

          {/* Active Status Switch */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Active Status</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Enable or disable this event across candidate and admin portals
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>
        </div>

        {/* Section Responsibility Notice */}
        <div className="p-3.5 bg-brand-50/50 dark:bg-brand-950/20 rounded-xl border border-brand-200 dark:border-brand-900/50 space-y-2">
          <p className="text-xs font-bold text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dedicated Section Architecture</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
            <div className="flex items-start gap-1.5 bg-white dark:bg-slate-900 p-2 rounded-lg border border-brand-100 dark:border-brand-900/30">
              <Layers className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">Rounds</span>
                <span>Configured in Rounds page</span>
              </div>
            </div>
            <div className="flex items-start gap-1.5 bg-white dark:bg-slate-900 p-2 rounded-lg border border-brand-100 dark:border-brand-900/30">
              <Calendar className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">Schedule</span>
                <span>Dates & times in Quiz Schedule</span>
              </div>
            </div>
            <div className="flex items-start gap-1.5 bg-white dark:bg-slate-900 p-2 rounded-lg border border-brand-100 dark:border-brand-900/30">
              <HelpCircle className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900 dark:text-white block">Questions</span>
                <span>Imported in Questions page</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{initialData ? 'Update Event' : 'Create Event'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
