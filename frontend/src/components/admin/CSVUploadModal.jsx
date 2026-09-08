import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';

export default function CSVUploadModal({ isOpen, onClose, onUpload }) {
  const [csvText, setCsvText] = useState('');
  const [parsedCount, setParsedCount] = useState(0);
  const [preview, setPreview] = useState([]);

  const sampleCSV = `question_text,option_a,option_b,option_c,option_d,correct_answer,marks,negative_marks,difficulty,category,explanation
"What does CPU stand for?","Central Process Unit","Central Processing Unit","Computer Personal Unit","Central Processor Utility","B",2.0,0.5,"Easy","Computer Architecture","CPU is Central Processing Unit."
"Which protocol is connection-oriented?","UDP","ICMP","TCP","IP","C",2.0,0.5,"Medium","Networking","TCP provides reliable 3-way handshake."`;

  const handleParse = (text) => {
    setCsvText(text);
    try {
      const lines = text.trim().split('\n');
      if (lines.length <= 1) {
        setPreview([]);
        setParsedCount(0);
        return;
      }

      const rows = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Basic CSV regex split taking into account quotes
        const match = line.match(/(?:[^\s",]+|"[^"]*")+/g);
        if (match && match.length >= 6) {
          const clean = (val) => val ? val.replace(/^"|"$/g, '').trim() : '';
          rows.push({
            question_text: clean(match[0]),
            option_a: clean(match[1]),
            option_b: clean(match[2]),
            option_c: clean(match[3]),
            option_d: clean(match[4]),
            correct_answer: clean(match[5]).toUpperCase(),
            marks: parseFloat(clean(match[6])) || 2.0,
            negative_marks: parseFloat(clean(match[7])) || 0.5,
            difficulty: clean(match[8]) || 'Medium',
            category: clean(match[9]) || 'General',
            explanation: clean(match[10]) || ''
          });
        }
      }

      setPreview(rows);
      setParsedCount(rows.length);
    } catch (e) {
      console.error('Error parsing CSV:', e.message);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleParse(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const handleLoadSample = () => {
    handleParse(sampleCSV);
  };

  const handleImport = () => {
    if (preview.length > 0) {
      onUpload(preview);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Upload Questions via CSV" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Upload Box */}
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100/60 dark:hover:bg-slate-800 transition-colors">
          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            id="csv-file-input"
            className="hidden"
          />
          <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center">
            <div className="p-3 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 mb-2">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Click to select a CSV file or paste below
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Supports standard CSV with UTF-8 format</p>
          </label>
        </div>

        {/* Textarea Paste */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
              Paste CSV Raw Content
            </label>
            <button
              type="button"
              onClick={handleLoadSample}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              Load Sample Template
            </button>
          </div>
          <textarea
            rows={4}
            value={csvText}
            onChange={(e) => handleParse(e.target.value)}
            placeholder="question_text,option_a,option_b,option_c,option_d,correct_answer,marks,negative_marks,difficulty,category,explanation"
            className="w-full font-mono text-[11px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
          />
        </div>

        {/* Preview Summary */}
        {parsedCount > 0 && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 font-semibold">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Parsed {parsedCount} questions successfully</span>
            </div>
          </div>
        )}

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
            type="button"
            disabled={parsedCount === 0}
            onClick={handleImport}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-brand-500/20"
          >
            Import {parsedCount} Questions
          </button>
        </div>
      </div>
    </Modal>
  );
}
