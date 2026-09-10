import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Sparkles,
  ArrowRight,
  Layers,
  X,
  RefreshCw,
  Users,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

export default function MultiFormatParticipantImportModal({
  isOpen,
  onClose,
  onSuccess,
  eventsList = [],
  initialEvent = ''
}) {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [eventName, setEventName] = useState(initialEvent || 'Technical Quiz');
  const [defaultCollege, setDefaultCollege] = useState('');
  const [defaultDept, setDefaultDept] = useState('');
  const [defaultYear, setDefaultYear] = useState('3rd Year');
  const [autoAssignQuiz, setAutoAssignQuiz] = useState(true);
  const [eventsOptions, setEventsOptions] = useState([]);

  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEventName(initialEvent || 'Technical Quiz');
      setFile(null);

      if (eventsList && eventsList.length > 0) {
        setEventsOptions(eventsList);
      } else {
        adminService
          .getEvents()
          .then((res) => {
            if (res && res.success && res.data && res.data.length > 0) {
              setEventsOptions(res.data.map((e) => e.title || e));
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, initialEvent, eventsList]);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    const validExts = ['pdf', 'xlsx', 'xls', 'csv', 'docx', 'doc', 'json', 'txt'];

    if (!validExts.includes(ext)) {
      toast.error(`Unsupported file type (.${ext}). Supported: PDF, Excel (.xlsx/.xls), CSV, Word (.docx), JSON, TXT`);
      return;
    }

    setFile(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleImportSubmit = async () => {
    if (!file) {
      toast.error('Please select a document file to import');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('event_name', eventName);
      formData.append('college', defaultCollege);
      formData.append('department', defaultDept);
      formData.append('year', defaultYear);
      formData.append('assign_quiz', autoAssignQuiz);

      const res = await adminService.importParticipantsFile(formData);
      if (res && res.success) {
        toast.success(res.message || `Successfully enrolled participants into ${eventName}!`);
        onClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error(res?.message || 'Failed to parse participant file');
      }
    } catch (err) {
      console.error('Participant file import error:', err);
      toast.error(err.response?.data?.message || 'Failed to import participant file');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Enroll Participants from Document
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              Import candidates from PDF, Excel, CSV, Word, JSON, or Text files
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Event Selection & Target Settings */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            <Layers className="w-4 h-4 text-brand-500" />
            <span>Target Event & Defaults</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Event *
              </label>
              <select
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-brand-600 dark:text-brand-400 focus:ring-2 focus:ring-brand-500/20"
              >
                {eventsOptions.map((ev, idx) => (
                  <option key={idx} value={typeof ev === 'string' ? ev : ev.title}>
                    {typeof ev === 'string' ? ev : ev.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Default Year of Study
              </label>
              <select
                value={defaultYear}
                onChange={(e) => setDefaultYear(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="Postgraduate">Postgraduate</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Fallback College Name (if omitted in file)
              </label>
              <input
                type="text"
                value={defaultCollege}
                onChange={(e) => setDefaultCollege(e.target.value)}
                placeholder="e.g. Anna University Campus"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Fallback Department (if omitted in file)
              </label>
              <input
                type="text"
                value={defaultDept}
                onChange={(e) => setDefaultDept(e.target.value)}
                placeholder="e.g. Computer Science & Engineering"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* File Upload Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
            dragOver
              ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/30'
              : file
              ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-brand-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.json,.txt"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
            className="hidden"
          />

          {file ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{file.name}</p>
                <p className="text-[11px] text-slate-400">
                  {(file.size / 1024).toFixed(1)} KB • Ready to extract & enroll
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-red-500 transition-colors ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Click to browse or drag & drop participant file
                </p>
                <p className="text-[11px] text-slate-400">
                  Supported formats: PDF, Excel (.xlsx/.xls), CSV, Word (.docx), JSON, TXT
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Badge variant="blue">PDF</Badge>
                <Badge variant="emerald">Excel (.xlsx/.csv)</Badge>
                <Badge variant="indigo">Word (.docx)</Badge>
                <Badge variant="amber">JSON</Badge>
              </div>
            </>
          )}
        </div>

        {/* Auto Enrollment & Options */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-brand-50/50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-900/30">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Auto-Assign to Scheduled Quiz & Generate Logins
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Enables immediate examination access and sets phone-based credentials
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={autoAssignQuiz}
            onChange={(e) => setAutoAssignQuiz(e.target.checked)}
            className="w-4 h-4 rounded text-brand-600 border-slate-300 focus:ring-brand-500 cursor-pointer"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImportSubmit}
            disabled={!file || importing}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 shadow-md shadow-brand-500/20 disabled:opacity-50 transition-all"
          >
            {importing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Parsing & Enrolling...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Extract & Enroll into {eventName}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
