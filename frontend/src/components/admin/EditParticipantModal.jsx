import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  School,
  Building,
  GraduationCap,
  Hash,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  Ban,
  Eye,
  EyeOff,
  Sparkles,
  Trophy
} from 'lucide-react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import { adminService } from '../../services/adminService';

export default function EditParticipantModal({
  isOpen,
  onClose,
  participant,
  onSave,
  eventsList = []
}) {
  const [eventsOptions, setEventsOptions] = useState([]);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    mobile: '',
    college: '',
    department: '',
    year: '3rd Year',
    registration_number: '',
    event: 'Technical Quiz',
    round_1_selected: false,
    round_2_selected: false,
    is_disabled: false,
    password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (eventsList && eventsList.length > 0) {
      setEventsOptions(eventsList.map((e) => (typeof e === 'string' ? e : e.title || e.name || '')));
    } else if (isOpen) {
      adminService
        .getEvents()
        .then((res) => {
          if (res && res.success && res.data && res.data.length > 0) {
            setEventsOptions(res.data.map((e) => (typeof e === 'string' ? e : e.title || e.name || '')));
          }
        })
        .catch(() => {});
    }
  }, [eventsList, isOpen]);

  useEffect(() => {
    if (participant) {
      setFormData({
        full_name: participant.full_name || '',
        email: participant.email || '',
        mobile: participant.mobile || '',
        college: participant.college || '',
        department: participant.department || '',
        year: participant.year || '3rd Year',
        registration_number: participant.registration_number || '',
        event: participant.event || 'Technical Quiz',
        round_1_selected: Boolean(participant.round_1_selected),
        round_2_selected: Boolean(participant.round_2_selected),
        is_disabled: Boolean(participant.is_disabled),
        password: ''
      });
      setErrorMsg('');
      setShowPassword(false);
    }
  }, [participant, isOpen]);

  if (!participant) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setErrorMsg('Full Name is required');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMsg('Email Address is required');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const payload = { ...formData };
      // If password was not entered, omit it so we don't overwrite
      if (!payload.password || !payload.password.trim()) {
        delete payload.password;
      }
      await onSave(participant.id, payload);
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update participant');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-200/60 dark:border-brand-800/60">
            <User className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900 dark:text-white">
                Edit Participant
              </span>
              <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300">
                {participant.participant_id}
              </span>
            </div>
            <p className="text-xs font-normal text-slate-400">
              Update scholar profile, academic details, and symposium status
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-2">
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 2-Column Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-brand-600" />
              <span>Full Name *</span>
            </label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="e.g. Alex Chen"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Registration Number */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-brand-600" />
              <span>Symposium Registration No</span>
            </label>
            <input
              type="text"
              value={formData.registration_number}
              onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              placeholder="e.g. REG-2026-001"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-brand-600" />
              <span>Email Address *</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="scholar@university.edu"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-brand-600" />
              <span>Mobile / Phone Number</span>
            </label>
            <input
              type="text"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              placeholder="+91 9876543210"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          {/* College */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-brand-600" />
              <span>College / Institution</span>
            </label>
            <input
              type="text"
              value={formData.college}
              onChange={(e) => setFormData({ ...formData, college: e.target.value })}
              placeholder="College of Engineering"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-brand-600" />
              <span>Department</span>
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="Computer Science & Engineering"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Year */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-brand-600" />
              <span>Academic Year</span>
            </label>
            <select
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            >
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
              <option value="Post Graduate">Post Graduate</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Event Track */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>Event Track</span>
            </label>
            {eventsOptions.length > 0 ? (
              <select
                value={formData.event}
                onChange={(e) => setFormData({ ...formData, event: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs font-bold text-brand-600 dark:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all cursor-pointer"
              >
                {eventsOptions.map((ev, idx) => (
                  <option key={idx} value={ev}>
                    {ev}
                  </option>
                ))}
                {!eventsOptions.includes(formData.event) && formData.event && (
                  <option value={formData.event}>{formData.event}</option>
                )}
              </select>
            ) : (
              <input
                type="text"
                value={formData.event}
                onChange={(e) => setFormData({ ...formData, event: e.target.value })}
                placeholder="Technical Quiz"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            )}
          </div>
        </div>

        {/* Qualification & Progression Status Controls */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Progression & Access Control
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Round 1 Selected */}
            <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              formData.round_1_selected
                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/70 hover:border-slate-300'
            }`}>
              <input
                type="checkbox"
                checked={formData.round_1_selected}
                onChange={(e) => setFormData({ ...formData, round_1_selected: e.target.checked })}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Round 1 Qualified</span>
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Allows access to Round 2 exams
                </p>
              </div>
            </label>

            {/* Round 2 Winner */}
            <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              formData.round_2_selected
                ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/70 hover:border-slate-300'
            }`}>
              <input
                type="checkbox"
                checked={formData.round_2_selected}
                onChange={(e) => setFormData({ ...formData, round_2_selected: e.target.checked })}
                className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-600" />
                  <span>Round 2 Finalist</span>
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Selected as symposium finalist / winner
                </p>
              </div>
            </label>

            {/* Account Status (Disabled) */}
            <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
              formData.is_disabled
                ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/70 hover:border-slate-300'
            }`}>
              <input
                type="checkbox"
                checked={formData.is_disabled}
                onChange={(e) => setFormData({ ...formData, is_disabled: e.target.checked })}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                  <span>Account Disabled</span>
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Blocks participant from login & testing
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Security & Password Reset */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-brand-600" />
              <span>Reset Participant Password (Optional)</span>
            </label>
            <span className="text-[10px] text-slate-400">Leave blank to keep unchanged</span>
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter new password to reset..."
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
