import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';

export default function QuizModal({ isOpen, onClose, onSave, initialData = null, allQuestions = [] }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_name: 'Eloquence 2026',
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
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        event_name: initialData.event_name || 'Eloquence 2026',
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
        question_ids: initialData.questions ? initialData.questions.map((q) => q.id) : []
      });
    } else {
      // Default: select all questions currently in bank
      setFormData((prev) => ({
        ...prev,
        question_ids: allQuestions.map((q) => q.id)
      }));
    }
  }, [initialData, isOpen, allQuestions]);

  const toggleQuestionSelect = (qId) => {
    setFormData((prev) => {
      const exists = prev.question_ids.includes(qId);
      return {
        ...prev,
        question_ids: exists
          ? prev.question_ids.filter((id) => id !== qId)
          : [...prev.question_ids, qId]
      };
    });
  };

  const handleSelectAll = () => {
    if (formData.question_ids.length === allQuestions.length) {
      setFormData({ ...formData, question_ids: [] });
    } else {
      setFormData({ ...formData, question_ids: allQuestions.map((q) => q.id) });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Examination' : 'Create New Examination'}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {/* Title & Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
            Quiz Title *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Symposium Technical Quiz – Round 1"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
            Description
          </label>
          <textarea
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Instructions & topic coverage..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
          />
        </div>

        {/* Schedule Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Round Number
            </label>
            <select
              value={formData.round_number}
              onChange={(e) => setFormData({ ...formData, round_number: parseInt(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-brand-600"
            >
              <option value={1}>Round 1 (Prelims)</option>
              <option value={2}>Round 2 (Grand Finals)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
            >
              <option value="Draft">Draft</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Published">Published</option>
              <option value="Live">Live (Active Now)</option>
              <option value="Completed">Completed</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Duration (Mins)
            </label>
            <input
              type="number"
              required
              min={1}
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Max Violations
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={formData.max_violations}
              onChange={(e) => setFormData({ ...formData, max_violations: parseInt(e.target.value) || 3 })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
            <input
              type="date"
              required
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
            <input
              type="time"
              required
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">End Date</label>
            <input
              type="date"
              required
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">End Time</label>
            <input
              type="time"
              required
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>
        </div>

        {/* Negative marking & Pass percentage */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Max Marks</label>
            <input
              type="number"
              value={formData.max_marks}
              onChange={(e) => setFormData({ ...formData, max_marks: parseFloat(e.target.value) || 100 })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pass Percentage</label>
            <input
              type="number"
              value={formData.pass_percentage}
              onChange={(e) => setFormData({ ...formData, pass_percentage: parseFloat(e.target.value) || 40 })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Negative Marking</label>
            <select
              value={formData.negative_marking ? 'true' : 'false'}
              onChange={(e) => setFormData({ ...formData, negative_marking: e.target.value === 'true' })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-medium"
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Negative Value</label>
            <input
              type="number"
              step="0.25"
              value={formData.negative_mark_value}
              onChange={(e) => setFormData({ ...formData, negative_mark_value: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs"
            />
          </div>
        </div>

        {/* Proctoring Toggles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.fullscreen_required}
              onChange={(e) => setFormData({ ...formData, fullscreen_required: e.target.checked })}
              className="rounded text-brand-600"
            />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Fullscreen Required</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.shuffle_questions}
              onChange={(e) => setFormData({ ...formData, shuffle_questions: e.target.checked })}
              className="rounded text-brand-600"
            />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Shuffle Questions</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.shuffle_options}
              onChange={(e) => setFormData({ ...formData, shuffle_options: e.target.checked })}
              className="rounded text-brand-600"
            />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Shuffle Options</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.desktop_only}
              onChange={(e) => setFormData({ ...formData, desktop_only: e.target.checked })}
              className="rounded text-brand-600"
            />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Desktop Only</span>
          </label>
        </div>

        {/* Question Selector Bank */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
              Select Questions ({formData.question_ids.length} / {allQuestions.length} selected)
            </span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
            >
              {formData.question_ids.length === allQuestions.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-slate-50 dark:bg-slate-800/40">
            {allQuestions.map((q) => {
              const isSelected = formData.question_ids.includes(q.id);
              return (
                <div
                  key={q.id}
                  onClick={() => toggleQuestionSelect(q.id)}
                  className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-100'
                      : 'hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="mt-0.5 rounded text-brand-600 pointer-events-none"
                  />
                  <div className="flex-1 truncate">
                    <p className="font-medium truncate">{q.question_text}</p>
                    <span className="text-[10px] text-slate-400">{q.category} • {q.difficulty} • {q.marks} Marks</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20"
          >
            {initialData ? 'Update Quiz' : 'Save Quiz'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
