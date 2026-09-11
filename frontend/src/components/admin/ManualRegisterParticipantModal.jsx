import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Mail,
  Phone,
  School,
  Building,
  GraduationCap,
  Hash,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  Copy,
  Check,
  Layers,
  Sparkles,
  BookOpen,
  ArrowRight,
  Search,
  UserCheck
} from 'lucide-react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

export default function ManualRegisterParticipantModal({
  isOpen,
  onClose,
  onSuccess,
  eventsList = [],
  initialEvent = '',
  totalParticipants = 0,
  existingParticipants = []
}) {
  const toast = useToast();

  const [eventsOptions, setEventsOptions] = useState([]);
  const [candidatesList, setCandidatesList] = useState(existingParticipants || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchingCandidates, setMatchingCandidates] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autoFilledName, setAutoFilledName] = useState('');

  const [formData, setFormData] = useState({
    full_name: '',
    mobile: '',
    email: '',
    event: initialEvent || 'Technical Quiz',
    college: '',
    department: 'Computer Science & Engineering',
    year: '3rd Year',
    registration_number: '',
    use_auto_password: true,
    custom_password: '',
    assign_quiz: true
  });

  const [showCustomPass, setShowCustomPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState(null);
  const [copiedKey, setCopiedKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      const nextReg = `REG-2026-${String(totalParticipants + 1).padStart(3, '0')}`;
      setFormData({
        full_name: '',
        mobile: '',
        email: '',
        event: initialEvent || (eventsList[0] ? (typeof eventsList[0] === 'string' ? eventsList[0] : eventsList[0].title) : 'Technical Quiz'),
        college: '',
        department: 'Computer Science & Engineering',
        year: '3rd Year',
        registration_number: nextReg,
        use_auto_password: true,
        custom_password: '',
        assign_quiz: true
      });
      setCreatedResult(null);
      setCopiedKey('');
      setSearchQuery('');
      setMatchingCandidates([]);
      setShowSuggestions(false);
      setAutoFilledName('');

      if (eventsList && eventsList.length > 0) {
        setEventsOptions(eventsList.map((e) => (typeof e === 'string' ? e : e.title || e.name || '')));
      } else {
        adminService
          .getEvents()
          .then((res) => {
            if (res && res.success && res.data && res.data.length > 0) {
              setEventsOptions(res.data.map((e) => (typeof e === 'string' ? e : e.title || e.name || '')));
            }
          })
          .catch(() => {});
      }

      if (!existingParticipants || existingParticipants.length === 0) {
        adminService
          .getParticipants()
          .then((res) => {
            if (res && res.success && res.data) {
              setCandidatesList(res.data);
            }
          })
          .catch(() => {});
      } else {
        setCandidatesList(existingParticipants);
      }
    }
  }, [isOpen, initialEvent, eventsList, totalParticipants, existingParticipants]);

  // Handle candidate search query input
  const handleSearchChange = (query) => {
    setSearchQuery(query);
    if (!query.trim() || query.length < 2) {
      setMatchingCandidates([]);
      setShowSuggestions(false);
      return;
    }

    const q = query.toLowerCase().trim();
    const matches = (candidatesList || []).filter(
      (c) =>
        (c.registration_number && c.registration_number.toLowerCase().includes(q)) ||
        (c.full_name && c.full_name.toLowerCase().includes(q)) ||
        (c.participant_id && c.participant_id.toLowerCase().includes(q)) ||
        (c.mobile && c.mobile.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
    setMatchingCandidates(matches.slice(0, 5));
    setShowSuggestions(matches.length > 0);
  };

  // Auto-fill form from selected participant
  const handleSelectCandidate = (candidate) => {
    setFormData((prev) => ({
      ...prev,
      full_name: candidate.full_name || '',
      registration_number: candidate.registration_number || candidate.participant_id || prev.registration_number,
      mobile: candidate.mobile || '',
      email: candidate.email || '',
      college: candidate.college || prev.college,
      department: candidate.department || prev.department,
      year: candidate.year || prev.year,
      event: candidate.event || prev.event
    }));
    setAutoFilledName(candidate.full_name || candidate.registration_number);
    setShowSuggestions(false);
    setSearchQuery('');
    toast.success(`Auto-fetched details for ${candidate.full_name || candidate.registration_number}`);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      toast.error('Please enter candidate full name');
      return;
    }

    if (!formData.mobile.trim()) {
      toast.error('Please enter valid mobile / phone number');
      return;
    }

    if (!formData.use_auto_password && !formData.custom_password.trim()) {
      toast.error('Please specify custom password or enable auto-generate');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: formData.full_name.trim(),
        mobile: formData.mobile.trim(),
        email: formData.email.trim() || undefined,
        event: formData.event,
        college: formData.college.trim() || 'Engineering College',
        department: formData.department.trim() || 'Computer Science & Engineering',
        year: formData.year,
        registration_number: formData.registration_number.trim(),
        password: formData.use_auto_password ? undefined : formData.custom_password.trim(),
        auto_password: formData.use_auto_password,
        assign_round1: formData.assign_quiz,
        assign_quiz: formData.assign_quiz
      };

      const res = await adminService.createParticipant(payload);
      if (res && res.success) {
        toast.success(res.message || 'Participant registered successfully');
        setCreatedResult(res.data);
        if (onSuccess) onSuccess();
      } else {
        toast.error(res?.message || 'Failed to register participant');
      }
    } catch (err) {
      console.error('Manual registration error:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to register participant');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForAnother = () => {
    const nextReg = `REG-2026-${String(totalParticipants + 2).padStart(3, '0')}`;
    setFormData((prev) => ({
      ...prev,
      full_name: '',
      mobile: '',
      email: '',
      registration_number: nextReg,
      custom_password: ''
    }));
    setCreatedResult(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Manual Participant Registration
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Directly enroll a candidate, assign their event, and generate login credentials
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      {createdResult ? (
        /* Success State View with Credentials Card */
        <div className="space-y-5 py-2">
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-emerald-900 dark:text-emerald-200">
                Participant Registered Successfully!
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                Account is active and ready to access the examination portal.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Login Credentials
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    `Participant ID: ${createdResult.participant_id}\nEmail / Username: ${createdResult.email}\nPassword: ${createdResult.generated_password || 'First 4 digits of phone'}\nEvent: ${createdResult.event || 'Technical Quiz'}`,
                    'all'
                  )
                }
                className="flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors"
              >
                {copiedKey === 'all' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedKey === 'all' ? 'Copied' : 'Copy All'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400">Full Name</span>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                  {createdResult.full_name}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400">Enrolled Event</span>
                <p className="text-xs font-bold text-brand-600 dark:text-brand-400 mt-0.5">
                  {createdResult.event || 'Technical Quiz'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400">Participant ID</span>
                <p className="font-mono text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                  {createdResult.participant_id}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400">Registration No</span>
                <p className="font-mono text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                  {createdResult.registration_number || '—'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400">Login Email</span>
                <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                  {createdResult.email}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400">Password</span>
                <p className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {createdResult.generated_password || '••••••••'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForAnother}
              className="px-4 py-2 rounded-xl text-xs font-bold text-brand-600 bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 dark:hover:bg-brand-900/40 border border-brand-200 dark:border-brand-800 transition-all"
            >
              + Register Another Participant
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 transition-all"
            >
              Done & Close
            </button>
          </div>
        </div>
      ) : (
        /* Form View */
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Auto-Lookup / Fetch Candidate Bar */}
          <div className="relative p-3 rounded-2xl bg-gradient-to-r from-brand-50/80 to-indigo-50/80 dark:from-brand-950/40 dark:to-indigo-950/40 border border-brand-200 dark:border-brand-800/60">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-brand-900 dark:text-brand-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                <span>Search & Auto-Fetch Existing Candidate</span>
              </label>
              {autoFilledName && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Check className="w-3 h-3" /> Auto-filled ({autoFilledName})
                </span>
              )}
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Enter Reg No, Name, Participant ID, or Mobile to auto-fill..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-brand-200 dark:border-brand-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && matchingCandidates.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                <div className="p-2 bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Matching Candidates ({matchingCandidates.length})</span>
                  <span>Click to auto-fill</span>
                </div>
                {matchingCandidates.map((cand) => (
                  <div
                    key={cand.id || cand.participant_id}
                    onClick={() => handleSelectCandidate(cand)}
                    className="p-2.5 hover:bg-brand-50 dark:hover:bg-brand-950/60 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-brand-600" />
                        <span>{cand.full_name}</span>
                        {cand.registration_number && (
                          <span className="font-mono text-[10px] text-slate-400">({cand.registration_number})</span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-500">{cand.college} • {cand.department}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/80 px-2 py-0.5 rounded-lg border border-brand-200 dark:border-brand-800">
                        {cand.event || 'Technical Quiz'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Event Selection & Registration Number */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-brand-500" />
                  <span>Target Event *</span>
                </label>
                <select
                  name="event"
                  value={formData.event}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-brand-600 dark:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
                >
                  {eventsOptions.map((ev, idx) => (
                    <option key={idx} value={ev}>
                      {ev}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>Registration No</span>
                </label>
                <input
                  type="text"
                  name="registration_number"
                  value={formData.registration_number}
                  onChange={(e) => {
                    handleChange(e);
                    handleSearchChange(e.target.value);
                  }}
                  placeholder="e.g. REG-2026-001"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={(e) => {
                  handleChange(e);
                  handleSearchChange(e.target.value);
                }}
                placeholder="Candidate Full Name"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Mobile Number *</span>
              </label>
              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 font-mono"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Email Address (Optional)</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Auto-generated if left blank (e.g. elq_987654@eloquence.com)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </div>

          {/* Academic Profile */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <School className="w-3.5 h-3.5 text-slate-400" />
                <span>College</span>
              </label>
              <input
                type="text"
                name="college"
                value={formData.college}
                onChange={handleChange}
                placeholder="College Name"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Department</span>
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="Department"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                <span>Year</span>
              </label>
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="Postgraduate">Postgraduate</option>
              </select>
            </div>
          </div>

          {/* Password Security Option */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-brand-500" />
                <span>Login Password Configuration</span>
              </label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    name="use_auto_password"
                    checked={formData.use_auto_password}
                    onChange={handleChange}
                    className="rounded text-brand-600 focus:ring-brand-500"
                  />
                  <span>Auto-generate (First 4 digits of phone)</span>
                </label>
              </div>
            </div>

            {!formData.use_auto_password && (
              <div className="relative">
                <input
                  type={showCustomPass ? 'text' : 'password'}
                  name="custom_password"
                  value={formData.custom_password}
                  onChange={handleChange}
                  placeholder="Set custom candidate password"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCustomPass(!showCustomPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showCustomPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 disabled:opacity-50 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{submitting ? 'Registering...' : 'Register Participant'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
