import React, { useState, useEffect } from 'react';
import { Calendar, Award, ShieldCheck } from 'lucide-react';
import Modal from '../common/Modal';
import { adminService } from '../../services/adminService';

export default function QuizModal({ isOpen, onClose, onSave, initialData = null, allQuestions = [] }) {
  const [roundsList, setRoundsList] = useState([
    { round_number: 1, round_name: 'Round 1' },
    { round_number: 2, round_name: 'Round 2' }
  ]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_name: 'Eloquence 2026',
    event_code: 'ELQ26',
    round_number: 1,
    duration_minutes: 30,
    start_date: new Date().toISOString().split('T')[0],
    start_time: '09:00:00',
    end_date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    end_time: '23:59:59',
    max_marks: 100,
    pass_percentage: 40,
    negative_marking: true,
    negative_mark_value: 0.5,
    max_attempts: 1,
    status: 'Live',
    desktop_only: false,
    fullscreen_required: true,
    max_violations: 3,
    shuffle_questions: true,
    shuffle_options: true,
    question_ids: []
  });

  useEffect(() => {
    if (isOpen) {
      adminService
        .getRounds()
        .then((res) => {
          if (res.success && res.data && res.data.length > 0) {
            setRoundsList((prev) => {
              const combined = [];
              res.data.forEach((r) => {
                const num = Number(r.round_number);
                if (!combined.some((c) => c.round_number === num)) {
                  combined.push({
                    round_number: num,
                    round_name: `Round ${num}`
                  });
                }
              });
              if (
                initialData?.round_number &&
                !combined.some((c) => c.round_number === Number(initialData.round_number))
              ) {
                combined.push({
                  round_number: Number(initialData.round_number),
                  round_name: `Round ${initialData.round_number}`
                });
              }
              combined.sort((a, b) => a.round_number - b.round_number);
              return combined.length > 0
                ? combined
                : [
                    { round_number: 1, round_name: 'Round 1' },
                    { round_number: 2, round_name: 'Round 2' }
                  ];
            });
          }
        })
        .catch(() => {});
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        event_name: initialData.event_name || 'Eloquence 2026',
        event_code: initialData.event_code || 'ELQ26',
        round_number: initialData.round_number || 1,
        duration_minutes: initialData.duration_minutes || 30,
        start_date: initialData.start_date || new Date().toISOString().split('T')[0],
        start_time: initialData.start_time || '09:00:00',
        end_date: initialData.end_date || new Date().toISOString().split('T')[0],
        end_time: initialData.end_time || '23:59:59',
        max_marks: initialData.max_marks || 100,
        pass_percentage: initialData.pass_percentage || 40,
        negative_marking: initialData.negative_marking !== false,
        negative_mark_value: initialData.negative_mark_value || 0.5,
        max_attempts: initialData.max_attempts || 1,
        status: initialData.status || 'Live',
        desktop_only: Boolean(initialData.desktop_only),
        fullscreen_required: initialData.fullscreen_required !== false,
        max_violations: initialData.max_violations || 3,
        shuffle_questions: initialData.shuffle_questions !== false,
        shuffle_options: initialData.shuffle_options !== false,
        question_ids: initialData.questions
          ? initialData.questions.map((q) => q.id)
          : Array.isArray(initialData.question_ids)
          ? initialData.question_ids
          : []
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        question_ids: allQuestions.map((q) => q.id)
      }));
    }
  }, [initialData, isOpen, allQuestions]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Event' : 'Create New Event'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
        {/* Basic Details */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Event Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value, event_name: e.target.value })}
              placeholder="e.g. Technical Quiz"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Instructions & topic coverage..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Round & Timing */}
        <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-brand-500" />
            <span>Round & Timing</span>
          </div>

          {/* Round Number & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Round Number *
              </label>
              <select
                value={formData.round_number}
                onChange={(e) => setFormData({ ...formData, round_number: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-brand-600 dark:text-brand-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
              >
                {roundsList.map((r) => (
                  <option key={r.round_number} value={r.round_number}>
                    {r.round_name || `Round ${r.round_number}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
              >
                <option value="Draft">Draft</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Published">Published</option>
                <option value="Live">Live (Active Now)</option>
                <option value="Completed">Completed</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Start & End Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Start Schedule
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
                <input
                  type="time"
                  required
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                End Schedule
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
                <input
                  type="time"
                  required
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Duration & Violations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Duration (Minutes)
              </label>
              <input
                type="number"
                required
                min={1}
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Max Allowed Violations
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={formData.max_violations}
                onChange={(e) => setFormData({ ...formData, max_violations: parseInt(e.target.value) || 3 })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Scoring & Marking Rules */}
        <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Scoring & Marking Rules</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Max Marks
              </label>
              <input
                type="number"
                value={formData.max_marks}
                onChange={(e) => setFormData({ ...formData, max_marks: parseFloat(e.target.value) || 100 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Pass %
              </label>
              <input
                type="number"
                value={formData.pass_percentage}
                onChange={(e) => setFormData({ ...formData, pass_percentage: parseFloat(e.target.value) || 40 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Negative Marking
              </label>
              <select
                value={formData.negative_marking ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, negative_marking: e.target.value === 'true' })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Negative Value
              </label>
              <input
                type="number"
                step="0.25"
                disabled={!formData.negative_marking}
                value={formData.negative_mark_value}
                onChange={(e) => setFormData({ ...formData, negative_mark_value: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Security & Proctoring */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Security & Proctoring</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-brand-300 dark:hover:border-brand-800 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={formData.fullscreen_required}
                onChange={(e) => setFormData({ ...formData, fullscreen_required: e.target.checked })}
                className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500"
              />
              <div>
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Fullscreen Required</span>
                <span className="block text-[11px] text-slate-500">Locks exam to secure fullscreen</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-brand-300 dark:hover:border-brand-800 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={formData.shuffle_questions}
                onChange={(e) => setFormData({ ...formData, shuffle_questions: e.target.checked })}
                className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500"
              />
              <div>
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Shuffle Questions</span>
                <span className="block text-[11px] text-slate-500">Randomizes question order for candidates</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-brand-300 dark:hover:border-brand-800 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={formData.shuffle_options}
                onChange={(e) => setFormData({ ...formData, shuffle_options: e.target.checked })}
                className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500"
              />
              <div>
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Shuffle Options</span>
                <span className="block text-[11px] text-slate-500">Randomizes MCQ choices order</span>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-brand-300 dark:hover:border-brand-800 cursor-pointer transition-all">
              <input
                type="checkbox"
                checked={formData.desktop_only}
                onChange={(e) => setFormData({ ...formData, desktop_only: e.target.checked })}
                className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500"
              />
              <div>
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Desktop Only</span>
                <span className="block text-[11px] text-slate-500">Disallow phones and mobile browsers</span>
              </div>
            </label>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 transition-all"
          >
            {initialData ? 'Update Event' : 'Create Event'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
