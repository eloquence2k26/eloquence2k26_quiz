import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle2, Send, Layers, Plus } from 'lucide-react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import { adminService } from '../../services/adminService';

export default function ModifyScheduleModal({ isOpen, onClose, onSave, quiz }) {
  const [roundsList, setRoundsList] = useState([
    { round_number: 1, round_name: 'Round 1' },
    { round_number: 2, round_name: 'Round 2' }
  ]);

  const [formData, setFormData] = useState({
    round_number: 1,
    start_date: '',
    start_time: '09:00',
    end_date: '',
    end_time: '23:59',
    duration_minutes: 30,
    status: 'Scheduled'
  });
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (isOpen) {
      adminService
        .getRounds()
        .then((res) => {
          if (res.success && res.data && res.data.length > 0) {
            setRoundsList((prev) => {
              const combined = [...prev];
              res.data.forEach((r) => {
                const num = Number(r.round_number);
                if (!combined.some((c) => c.round_number === num)) {
                  combined.push({
                    round_number: num,
                    round_name: r.round_name || `Round ${num}`
                  });
                }
              });
              if (quiz?.round_number && !combined.some((c) => c.round_number === Number(quiz.round_number))) {
                combined.push({
                  round_number: Number(quiz.round_number),
                  round_name: `Round ${quiz.round_number}`
                });
              }
              combined.sort((a, b) => a.round_number - b.round_number);
              return combined;
            });
          }
        })
        .catch(() => {});
    }
  }, [isOpen, quiz]);

  useEffect(() => {
    if (quiz) {
      // Normalize time strings to HH:MM if they have seconds
      const formatTime = (t) => {
        if (!t) return '09:00';
        return t.slice(0, 5);
      };

      setFormData({
        round_number: quiz.round_number || 1,
        start_date: quiz.start_date || new Date().toISOString().split('T')[0],
        start_time: formatTime(quiz.start_time),
        end_date: quiz.end_date || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        end_time: formatTime(quiz.end_time || '23:59:59'),
        duration_minutes: quiz.duration_minutes || 30,
        status: quiz.status || 'Scheduled'
      });
      setValidationError('');
    }
  }, [quiz, isOpen]);

  const handleAddNextRound = async () => {
    const highestRound = Math.max(...roundsList.map((r) => r.round_number), 0);
    const nextNum = highestRound + 1;
    const newRoundItem = {
      round_number: nextNum,
      round_name: `Round ${nextNum}`
    };

    setRoundsList((prev) => [...prev, newRoundItem].sort((a, b) => a.round_number - b.round_number));
    setFormData((prev) => ({
      ...prev,
      round_number: nextNum
    }));

    try {
      await adminService.createRound({
        round_number: nextNum,
        round_name: `Round ${nextNum}`
      });
    } catch (e) {}
  };

  if (!quiz) return null;

  // Preset helpers
  const applyWindowPreset = (days) => {
    const startDate = formData.start_date ? new Date(formData.start_date) : new Date();
    const endDate = new Date(startDate.getTime() + days * 86400000);
    setFormData((prev) => ({
      ...prev,
      end_date: endDate.toISOString().split('T')[0]
    }));
    setValidationError('');
  };

  const applyDurationPreset = (mins) => {
    setFormData((prev) => ({
      ...prev,
      duration_minutes: mins
    }));
  };

  const validate = () => {
    if (!formData.start_date || !formData.end_date) {
      setValidationError('Start date and end date are required.');
      return false;
    }
    const startObj = new Date(`${formData.start_date}T${formData.start_time || '00:00'}:00`);
    const endObj = new Date(`${formData.end_date}T${formData.end_time || '23:59'}:00`);
    if (endObj <= startObj) {
      setValidationError('End date and time must be strictly after the start date and time.');
      return false;
    }
    if (formData.duration_minutes < 1) {
      setValidationError('Exam duration must be at least 1 minute.');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSubmit = (e, overrideStatus = null) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    // Ensure seconds are included for backend compatibility (HH:MM:SS)
    const normalizeTime = (t) => (t && t.length === 5 ? `${t}:00` : t || '00:00:00');

    const payload = {
      ...quiz,
      round_number: Number(formData.round_number),
      start_date: formData.start_date,
      start_time: normalizeTime(formData.start_time),
      end_date: formData.end_date,
      end_time: normalizeTime(formData.end_time),
      duration_minutes: Number(formData.duration_minutes),
      status: overrideStatus || formData.status
    };

    onSave(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Modify Examination Schedule & Publishing"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={(e) => handleSubmit(e)} className="space-y-5">
        {/* Quiz Info Banner */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={formData.round_number === 2 ? 'purple' : 'primary'} size="sm">
                Round {formData.round_number}
              </Badge>
              <Badge
                variant={
                  formData.status === 'Live'
                    ? 'live'
                    : formData.status === 'Published'
                    ? 'success'
                    : formData.status === 'Scheduled'
                    ? 'warning'
                    : 'default'
                }
                size="sm"
              >
                {formData.status}
              </Badge>
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
              {quiz.title}
            </h4>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <span>Duration: <strong className="text-brand-600 dark:text-brand-400">{formData.duration_minutes} Mins</strong></span>
          </div>
        </div>

        {/* Validation Error Notice */}
        {validationError && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Round & Status Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Round Assignment
              </label>
              <button
                type="button"
                onClick={handleAddNextRound}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                title={`Add Round ${Math.max(...roundsList.map((r) => r.round_number), 0) + 1}`}
              >
                <Plus className="w-3 h-3" />
                <span>+ Round {Math.max(...roundsList.map((r) => r.round_number), 0) + 1}</span>
              </button>
            </div>
            <select
              value={formData.round_number}
              onChange={(e) => setFormData({ ...formData, round_number: parseInt(e.target.value) })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-brand-600 dark:text-brand-400"
            >
              {roundsList.map((r) => (
                <option key={r.round_number} value={r.round_number}>
                  {r.round_name || `Round ${r.round_number}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Publication Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100"
            >
              <option value="Draft">Draft (Hidden from participants)</option>
              <option value="Scheduled">Scheduled (Upcoming on calendar)</option>
              <option value="Published">Published (Active & Visible to participants)</option>
              <option value="Live">Live (Exam is actively running now)</option>
              <option value="Completed">Completed (Exam concluded)</option>
              <option value="Closed">Closed (Archived)</option>
            </select>
          </div>
        </div>

        {/* Start Window */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-brand-500" />
            <span>Schedule Start Window</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Start Time *
              </label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* End Window */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-brand-500" />
              <span>Schedule End Window</span>
            </div>
            {/* Window Presets */}
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="text-slate-400 font-medium">Quick add:</span>
              <button
                type="button"
                onClick={() => applyWindowPreset(1)}
                className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-500 font-semibold text-slate-700 dark:text-slate-300"
              >
                +24h
              </button>
              <button
                type="button"
                onClick={() => applyWindowPreset(3)}
                className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-500 font-semibold text-slate-700 dark:text-slate-300"
              >
                +3 Days
              </button>
              <button
                type="button"
                onClick={() => applyWindowPreset(7)}
                className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-500 font-semibold text-slate-700 dark:text-slate-300"
              >
                +7 Days
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                End Time *
              </label>
              <input
                type="time"
                required
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Duration & Duration Presets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Examination Allotted Duration (Minutes) *
            </label>
            <div className="flex items-center gap-1.5 text-[10px]">
              {[15, 20, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => applyDurationPreset(mins)}
                  className={`px-2 py-0.5 rounded-md border font-semibold ${
                    formData.duration_minutes === mins
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-brand-500'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>
          <input
            type="number"
            min={1}
            max={300}
            required
            value={formData.duration_minutes}
            onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 1 })}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
          />
          <p className="text-[11px] text-slate-400">
            Participants can attempt this exam at any time within the start and end window, with a maximum allocated timer of {formData.duration_minutes} minutes.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {formData.status !== 'Published' && (
              <button
                type="button"
                onClick={() => handleSubmit(null, 'Published')}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Save & Publish Now</span>
              </button>
            )}

            <button
              type="submit"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save Schedule</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
