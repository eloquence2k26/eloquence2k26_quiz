import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2,
  Sparkles,
  ArrowRight,
  Layers,
  X,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { getRoundBadgeVariant } from '../../utils/formatters';

export default function MultiFormatImportModal({
  isOpen,
  onClose,
  onSuccess,
  eventsList = [],
  roundsList: propRoundsList = [],
  initialEvent = '',
  initialRound = 1
}) {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'paste'
  const [file, setFile] = useState(null);
  const [eventName, setEventName] = useState('Eloquence 2026');
  const [roundNumber, setRoundNumber] = useState(1);
  const [customEventInput, setCustomEventInput] = useState(false);
  const [eventsOptions, setEventsOptions] = useState([]);
  const [roundsOptions, setRoundsOptions] = useState([
    { round_number: 1, round_name: 'Round 1' },
    { round_number: 2, round_name: 'Round 2' }
  ]);

  const [pasteText, setPasteText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Initialize events
      if (eventsList && eventsList.length > 0) {
        setEventsOptions(eventsList);
      } else {
        adminService
          .getEvents()
          .then((res) => {
            if (res.success && res.data && res.data.length > 0) {
              setEventsOptions(res.data.map((e) => e.title || e));
            }
          })
          .catch(() => {});
      }

      // Initialize rounds
      if (propRoundsList && propRoundsList.length > 0) {
        setRoundsOptions(propRoundsList);
      } else {
        adminService
          .getRounds()
          .then((res) => {
            if (res.success && res.data && res.data.length > 0) {
              setRoundsOptions(res.data);
            }
          })
          .catch(() => {});
      }

      const defaultEvt = initialEvent || (eventsList[0] ? (typeof eventsList[0] === 'string' ? eventsList[0] : eventsList[0].title) : 'Eloquence 2026');
      setEventName(defaultEvt);
      setRoundNumber(initialRound ? Number(initialRound) : 1);
      setCustomEventInput(false);
    } else {
      // Reset state on modal close
      setFile(null);
      setPreviewQuestions([]);
      setPasteText('');
      setParsing(false);
      setImporting(false);
    }
  }, [isOpen, initialEvent, initialRound, eventsList, propRoundsList]);

  const handleFileChange = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    await processFileForPreview(selectedFile, eventName, roundNumber);
  };

  const processFileForPreview = async (targetFile, currentEvent, currentRound) => {
    setParsing(true);
    setPreviewQuestions([]);
    try {
      const formData = new FormData();
      formData.append('file', targetFile);
      formData.append('event_name', currentEvent);
      formData.append('round_number', currentRound);
      formData.append('preview_only', 'true');

      const res = await adminService.importQuestionsFile(formData);
      if (res.success && res.data?.questions) {
        setPreviewQuestions(res.data.questions);
        toast.success(`Extracted ${res.data.questions.length} questions from ${targetFile.name}`);
      } else {
        toast.error(res.message || 'No questions could be extracted.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to parse document. Please check file format.');
    } finally {
      setParsing(false);
    }
  };

  const handleProcessPasteText = async () => {
    if (!pasteText.trim()) return;
    setParsing(true);
    try {
      // Create a virtual text file from pasteText
      const blob = new Blob([pasteText], { type: 'text/plain' });
      const virtualFile = new File([blob], 'pasted_questions.txt', { type: 'text/plain' });
      await processFileForPreview(virtualFile, eventName, roundNumber);
    } catch (err) {
      toast.error('Failed to parse pasted text.');
      setParsing(false);
    }
  };

  const handleDeletePreviewItem = (index) => {
    setPreviewQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnswerChange = (index, newAnswer) => {
    setPreviewQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, correct_answer: newAnswer } : q))
    );
  };

  const handleConfirmImport = async () => {
    if (previewQuestions.length === 0) {
      toast.error('No questions available to import.');
      return;
    }

    setImporting(true);
    try {
      // Send finalized preview list to bulk import endpoint with selected event and round
      const preparedList = previewQuestions.map((q) => ({
        ...q,
        event_name: eventName,
        round_number: Number(roundNumber)
      }));

      const res = await adminService.bulkUploadQuestions(preparedList);
      if (res.success) {
        toast.success(`Successfully imported ${preparedList.length} questions to ${eventName} (Round ${roundNumber})!`);
        if (onSuccess) onSuccess({ event_name: eventName, round_number: Number(roundNumber) });
        onClose();
      } else {
        toast.error(res.message || 'Failed to import questions');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving questions');
    } finally {
      setImporting(false);
    }
  };

  const getFileIcon = (filename) => {
    if (!filename) return <Upload className="w-8 h-8 text-brand-500" />;
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') return <FileText className="w-8 h-8 text-rose-500" />;
    if (ext === 'pptx' || ext === 'ppt') return <Presentation className="w-8 h-8 text-amber-500" />;
    if (ext === 'docx' || ext === 'doc') return <FileText className="w-8 h-8 text-blue-500" />;
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
    return <FileCode className="w-8 h-8 text-purple-500" />;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Universal Question Importer"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4 max-h-[82vh] overflow-y-auto pr-1 text-xs">
        {/* Supported Document Types Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">
              Multi-Format Document Ingestion Engine
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Upload any exam document — smart heuristic parsing automatically extracts MCQs and options
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
              PDF (.pdf)
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
              PPT (.pptx, .ppt)
            </span>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              Word (.docx, .doc)
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
              Excel (.xlsx, .csv)
            </span>
            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900">
              JSON / TXT
            </span>
          </div>
        </div>

        {/* Target Event and Round Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                Target Event *
              </label>
              <button
                type="button"
                onClick={() => setCustomEventInput(!customEventInput)}
                className="text-[10px] font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                {customEventInput ? 'Choose from events' : '+ Custom event name'}
              </button>
            </div>
            {customEventInput ? (
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Enter event title e.g. Technical Quiz"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              />
            ) : (
              <select
                value={eventName}
                onChange={(e) => {
                  if (e.target.value === '__CUSTOM__') {
                    setCustomEventInput(true);
                  } else {
                    setEventName(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                {eventsOptions.map((evt) => {
                  const val = typeof evt === 'string' ? evt : evt.title;
                  return (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  );
                })}
                <option value="__CUSTOM__">+ Enter New Custom Event Name...</option>
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Target Tournament Round *
            </label>
            <select
              value={roundNumber}
              onChange={(e) => {
                const newRound = parseInt(e.target.value);
                setRoundNumber(newRound);
                if (file) {
                  processFileForPreview(file, eventName, newRound);
                }
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-brand-600 dark:text-brand-400"
            >
              {roundsOptions.map((r) => (
                <option key={r.round_number} value={r.round_number}>
                  Round {r.round_number} {r.round_name ? `— ${r.round_name}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Toggle: File Upload vs Raw Text Paste */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`pb-2 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'file'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Upload File (PDF, PPT, Word, Excel, CSV)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`pb-2 text-xs font-bold transition-colors border-b-2 ${
              activeTab === 'paste'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Paste Raw Text / CSV / MCQs
          </button>
        </div>

        {/* FILE UPLOAD ZONE */}
        {activeTab === 'file' && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileChange(e.dataTransfer.files[0]);
              }
            }}
            className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all ${
              dragOver
                ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.csv,.txt,.json,.md"
              onChange={(e) => handleFileChange(e.target.files[0])}
              className="hidden"
              id="universal-file-input"
            />
            <label htmlFor="universal-file-input" className="cursor-pointer flex flex-col items-center">
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm mb-3">
                {getFileIcon(file?.name)}
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {file ? file.name : 'Click to select or drag & drop document here'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {file
                  ? `${(file.size / 1024).toFixed(1)} KB • Ready for extraction`
                  : 'Supports PDF, PowerPoint (PPT/PPTX), Word (DOCX), Excel (XLSX/CSV), Text & JSON'}
              </p>
              <span className="mt-3 px-3 py-1 rounded-xl bg-brand-600 text-white font-bold text-[11px] shadow-sm">
                Browse Document
              </span>
            </label>
          </div>
        )}

        {/* PASTE TEXT ZONE */}
        {activeTab === 'paste' && (
          <div className="space-y-2">
            <textarea
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste formatted questions here, e.g.:&#10;1. Which data structure operates on LIFO?&#10;A) Queue&#10;B) Stack&#10;C) Tree&#10;D) Graph&#10;Answer: B&#10;Explanation: Stacks use Last-In-First-Out."
              className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
            />
            <button
              type="button"
              onClick={handleProcessPasteText}
              disabled={!pasteText.trim() || parsing}
              className="px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {parsing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Extract Questions from Text</span>
            </button>
          </div>
        )}

        {/* PARSING LOADING INDICATOR */}
        {parsing && (
          <div className="p-4 rounded-2xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900 flex items-center justify-center gap-2.5 text-brand-600 dark:text-brand-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-xs font-bold">Analyzing document & extracting MCQs...</span>
          </div>
        )}

        {/* PREVIEW TABLE */}
        {previewQuestions.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800 animate-in fade-in">
            <div className="p-2.5 rounded-xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  Batch Destination:
                </span>
                <span className="font-mono font-bold text-brand-700 dark:text-brand-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-brand-200 dark:border-brand-800 text-[11px]">
                  {eventName}
                </span>
                <Badge variant={getRoundBadgeVariant(roundNumber)} size="sm">
                  Round {roundNumber}
                </Badge>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {previewQuestions.length} questions will be tagged to this Event & Round
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
              {previewQuestions.map((q, idx) => (
                <div key={idx} className="p-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 dark:text-white text-xs">
                        <span className="text-brand-600 mr-1.5">{idx + 1}.</span>
                        {q.question_text}
                      </p>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-600 dark:text-slate-400">
                        <span className={q.correct_answer === 'A' ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''}>
                          A) {q.option_a}
                        </span>
                        <span className={q.correct_answer === 'B' ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''}>
                          B) {q.option_b}
                        </span>
                        <span className={q.correct_answer === 'C' ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''}>
                          C) {q.option_c}
                        </span>
                        <span className={q.correct_answer === 'D' ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''}>
                          D) {q.option_d}
                        </span>
                      </div>

                      {q.explanation && (
                        <p className="mt-1.5 text-[10px] text-slate-400 italic">
                          Explanation: {q.explanation}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-400">Ans:</span>
                        <select
                          value={q.correct_answer}
                          onChange={(e) => handleAnswerChange(idx, e.target.value)}
                          className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeletePreviewItem(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Remove question from import"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL FOOTER ACTIONS */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={previewQuestions.length === 0 || importing}
            className="px-5 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-700 disabled:opacity-50 shadow-md shadow-brand-500/20 flex items-center gap-2"
          >
            {importing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Importing to Question Bank...</span>
              </>
            ) : (
              <>
                <span>Import {previewQuestions.length} Questions to {eventName} (Round {roundNumber})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
