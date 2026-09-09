import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';

export default function QuestionModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  eventsList = [],
  roundsList = [],
  initialEvent = '',
  initialRound = 1
}) {
  const [formData, setFormData] = useState({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A',
    marks: 1.0,
    negative_marks: 0.0,
    difficulty: 'Medium',
    category: 'General',
    event_name: 'Eloquence 2026',
    round_number: 1,
    explanation: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        question_text: initialData.question_text || '',
        option_a: initialData.option_a || '',
        option_b: initialData.option_b || '',
        option_c: initialData.option_c || '',
        option_d: initialData.option_d || '',
        correct_answer: initialData.correct_answer || 'A',
        marks: initialData.marks || 1.0,
        negative_marks: initialData.negative_marks || 0.0,
        difficulty: initialData.difficulty || 'Medium',
        category: initialData.category || 'General',
        event_name: initialData.event_name || 'Eloquence 2026',
        round_number: initialData.round_number || 1,
        explanation: initialData.explanation || ''
      });
    } else {
      const defaultEvt = initialEvent || (eventsList[0] ? (typeof eventsList[0] === 'string' ? eventsList[0] : eventsList[0].title) : 'Eloquence 2026');
      const defaultRnd = initialRound ? Number(initialRound) : 1;
      setFormData({
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: 'A',
        marks: 2.0,
        negative_marks: 0.5,
        difficulty: 'Medium',
        category: 'Algorithms',
        event_name: defaultEvt,
        round_number: defaultRnd,
        explanation: ''
      });
    }
  }, [initialData, isOpen, initialEvent, initialRound, eventsList]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit MCQ Question' : 'Create New MCQ Question'}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Question Text */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
            Question Text *
          </label>
          <textarea
            required
            rows={3}
            value={formData.question_text}
            onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
            placeholder="Type the complete question prompt here..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
          />
        </div>

        {/* 4 Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Option A *
            </label>
            <input
              type="text"
              required
              value={formData.option_a}
              onChange={(e) => setFormData({ ...formData, option_a: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Option B *
            </label>
            <input
              type="text"
              required
              value={formData.option_b}
              onChange={(e) => setFormData({ ...formData, option_b: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Option C *
            </label>
            <input
              type="text"
              required
              value={formData.option_c}
              onChange={(e) => setFormData({ ...formData, option_c: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Option D *
            </label>
            <input
              type="text"
              required
              value={formData.option_d}
              onChange={(e) => setFormData({ ...formData, option_d: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Configuration row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Correct Answer *
            </label>
            <select
              value={formData.correct_answer}
              onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-brand-600 dark:text-brand-400"
            >
              <option value="A">Option A</option>
              <option value="B">Option B</option>
              <option value="C">Option C</option>
              <option value="D">Option D</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Difficulty
            </label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Marks
            </label>
            <input
              type="number"
              step="0.5"
              value={formData.marks}
              onChange={(e) => setFormData({ ...formData, marks: parseFloat(e.target.value) || 1 })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Neg. Marks
            </label>
            <input
              type="number"
              step="0.25"
              value={formData.negative_marks}
              onChange={(e) => setFormData({ ...formData, negative_marks: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>
        </div>

        {/* Event & Round Assignment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Event Name
            </label>
            {eventsList && eventsList.length > 0 ? (
              <select
                value={formData.event_name}
                onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                {eventsList.map((evt) => {
                  const val = typeof evt === 'string' ? evt : evt.title;
                  return (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                type="text"
                value={formData.event_name}
                onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                placeholder="e.g. Eloquence 2026"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Assigned Round
            </label>
            <select
              value={formData.round_number}
              onChange={(e) => setFormData({ ...formData, round_number: parseInt(e.target.value) || 1 })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-brand-600 dark:text-brand-400"
            >
              {roundsList && roundsList.length > 0 ? (
                roundsList.map((r) => {
                  const num = typeof r === 'object' ? r.round_number : r;
                  const name = typeof r === 'object' && r.round_name && r.round_name !== `Round ${num}` ? ` — ${r.round_name}` : '';
                  return (
                    <option key={num} value={num}>
                      Round {num}{name}
                    </option>
                  );
                })
              ) : (
                <>
                  <option value={1}>Round 1</option>
                  <option value={2}>Round 2</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Category & Explanation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g. Data Structures, Web Systems"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Explanation (Optional)
            </label>
            <input
              type="text"
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              placeholder="Rationale for answer..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>
        </div>

        {/* Footer buttons */}
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
            {initialData ? 'Update Question' : 'Save Question'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
