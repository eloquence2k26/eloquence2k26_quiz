import React, { useState, useEffect, useRef } from 'react';
import {
  UserPlus,
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Printer,
  Download,
  Search,
  Sparkles,
  KeyRound,
  Phone,
  Mail,
  School,
  Building,
  GraduationCap,
  Hash,
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowRight,
  ClipboardPaste,
  BookOpen,
  FileType,
  Layers,
  ArrowUpRight,
  Edit2,
  Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import EditParticipantModal from '../../components/admin/EditParticipantModal';
import DeleteParticipantModal from '../../components/admin/DeleteParticipantModal';

// Configure PDF.js worker
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export default function UserRegistrationPage() {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('SINGLE'); // 'SINGLE' | 'BULK' | 'DIRECTORY'
  const [participants, setParticipants] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  // Auto-increment Reg Number base calculation
  const getNextRegNo = (count = participants.length, prefix = 'REG-2026-') => {
    return `${prefix}${String(count + 1).padStart(3, '0')}`;
  };

  // Single Registration Form State
  const [singleForm, setSingleForm] = useState({
    full_name: '',
    mobile: '',
    email: '',
    college: 'Engineering College',
    department: 'Computer Science & Engineering',
    year: '3rd Year',
    registration_number: 'REG-2026-001',
    use_auto_password: true,
    custom_password: '',
    assign_round1: true
  });
  const [submittingSingle, setSubmittingSingle] = useState(false);
  const [createdParticipant, setCreatedParticipant] = useState(null);
  const [showCustomPass, setShowCustomPass] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');

  // Bulk Import State
  const [bulkFile, setBulkFile] = useState(null);
  const [fileTypeDetected, setFileTypeDetected] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [rawText, setRawText] = useState('');
  const [pasteMode, setPasteMode] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [importingBulk, setImportingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [showBulkResultModal, setShowBulkResultModal] = useState(false);
  const [regPrefix, setRegPrefix] = useState('REG-2026-');

  // Directory Search State
  const [searchDirectory, setSearchDirectory] = useState('');

  // Edit & Delete Modal States
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingParticipant, setDeletingParticipant] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleEditClick = (p) => {
    setEditingParticipant(p);
    setShowEditModal(true);
  };

  const handleSaveParticipant = async (id, updatedData) => {
    const res = await adminService.updateParticipant(id, updatedData);
    if (res.success) {
      toast.success('Participant updated successfully');
      fetchParticipants();
    } else {
      throw new Error(res.message || 'Failed to update participant');
    }
  };

  const handleDeleteClick = (p) => {
    setDeletingParticipant(p);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async (id) => {
    const res = await adminService.deleteParticipant(id);
    if (res.success) {
      toast.success('Participant deleted successfully');
      fetchParticipants();
    } else {
      toast.error(res.message || 'Failed to delete participant');
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  const fetchParticipants = async () => {
    setLoadingList(true);
    try {
      const res = await adminService.getParticipants();
      if (res.success) {
        const list = res.data || [];
        setParticipants(list);
        // Pre-fill next registration number
        setSingleForm((prev) => ({
          ...prev,
          registration_number: getNextRegNo(list.length)
        }));
      }
    } catch (err) {
      console.error('Failed to load participants directory', err);
    } finally {
      setLoadingList(false);
    }
  };

  // Helper to extract first 4 digits of phone
  const getFirst4Digits = (phoneStr) => {
    if (!phoneStr) return '••••';
    let digits = phoneStr.toString().replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    return digits.length >= 4 ? digits.slice(0, 4) : digits || '1234';
  };

  // -------------------------------------------------------------
  // Single Registration Handlers
  // -------------------------------------------------------------
  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setSubmittingSingle(true);
    setCreatedParticipant(null);

    try {
      const phoneDigits = singleForm.mobile.replace(/\D/g, '');
      if (phoneDigits.length < 4) {
        toast.error('Please enter a valid phone number (at least 4 digits for auto password generation)');
        setSubmittingSingle(false);
        return;
      }

      const payload = {
        full_name: singleForm.full_name.trim(),
        mobile: singleForm.mobile.trim(),
        email: singleForm.email.trim(),
        college: singleForm.college.trim(),
        department: singleForm.department.trim(),
        year: singleForm.year.trim(),
        registration_number: singleForm.registration_number.trim() || getNextRegNo(participants.length),
        password: singleForm.use_auto_password ? '' : singleForm.custom_password.trim(),
        assign_round1: singleForm.assign_round1
      };

      const res = await adminService.createParticipant(payload);
      if (res.success && res.data) {
        toast.success(`Participant ${res.data.full_name} registered successfully!`);
        setCreatedParticipant(res.data);
        
        // Immediately prepend newly created participant into table state
        setParticipants((prev) => [res.data, ...prev.filter((p) => p.id !== res.data.id)]);
        const updatedCount = participants.length + 1;
        fetchParticipants();

        // Reset inputs and auto-increment next registration number
        setSingleForm((prev) => ({
          ...prev,
          full_name: '',
          mobile: '',
          email: '',
          registration_number: getNextRegNo(updatedCount),
          custom_password: ''
        }));
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      toast.error(msg);
    } finally {
      setSubmittingSingle(false);
    }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedKey(''), 2000);
  };

  // -------------------------------------------------------------
  // Universal Multi-Format Importer (PDF, Excel, CSV, TSV, JSON, TXT, Paste)
  // -------------------------------------------------------------
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);
    await processUniversalFile(file);
  };

  const processUniversalFile = async (file) => {
    setIsParsingFile(true);
    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith('.pdf')) {
        setFileTypeDetected('PDF Document');
        await parsePDFFile(file);
      } else if (fileName.endsWith('.json')) {
        setFileTypeDetected('JSON Data');
        const text = await file.text();
        const json = JSON.parse(text);
        const list = Array.isArray(json) ? json : [json];
        normalizeAndSetRows(list);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        setFileTypeDetected('Excel Spreadsheet');
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
        normalizeAndSetRows(json);
      } else {
        // CSV, TSV, TXT, DOC
        setFileTypeDetected('Delimited Text / CSV');
        const text = await file.text();
        parseRawTextContent(text);
      }
    } catch (err) {
      console.error('File parsing error:', err);
      toast.error(`Failed to parse ${file.name}: ${err.message || 'Invalid format'}`);
    } finally {
      setIsParsingFile(false);
    }
  };

  // PDF Text & Table Extractor
  const parsePDFFile = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let extractedLines = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Group items by vertical position (Y coordinate) to reconstruct lines accurately
        const linesMap = {};
        textContent.items.forEach((item) => {
          if (!item.str || !item.str.trim()) return;
          const y = Math.round(item.transform[5]);
          if (!linesMap[y]) linesMap[y] = [];
          linesMap[y].push({ x: item.transform[4], text: item.str });
        });

        // Sort Y descending (top of page to bottom)
        const sortedY = Object.keys(linesMap).map(Number).sort((a, b) => b - a);
        sortedY.forEach((y) => {
          const lineItems = linesMap[y].sort((a, b) => a.x - b.x);
          const fullLine = lineItems.map((it) => it.text).join('\t').trim();
          if (fullLine) extractedLines.push(fullLine);
        });
      }

      if (extractedLines.length === 0) {
        toast.error('No readable text found in PDF. If it is a scanned image, please copy text or use Excel/CSV.');
        return;
      }

      parseRawTextContent(extractedLines.join('\n'));
    } catch (err) {
      toast.error(`PDF Reading Error: ${err.message}`);
    }
  };

  const parseRawTextContent = (text) => {
    if (!text || !text.trim()) {
      toast.error('No text data provided.');
      return;
    }

    try {
      // Check if JSON formatted text
      if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
        const json = JSON.parse(text);
        normalizeAndSetRows(Array.isArray(json) ? json : [json]);
        return;
      }

      const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        toast.error('Empty file or text content');
        return;
      }

      // Check delimiter (Tab, Comma, Pipe, Semicolon)
      const firstLine = lines[0];
      let delimiter = '\t';
      if (firstLine.includes('\t')) delimiter = '\t';
      else if (firstLine.includes(',')) delimiter = ',';
      else if (firstLine.includes('|')) delimiter = '|';
      else if (firstLine.includes(';')) delimiter = ';';
      else delimiter = /\s{2,}/; // multi-space separation

      let headerLine = firstLine.split(delimiter).map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));
      let startIndex = 1;

      // Check if first line is a header or direct data
      const isHeader = headerLine.some((h) =>
        ['name', 'phone', 'mobile', 'email', 'college', 'dept', 'reg', 'student', 'id', 'year'].some((kw) => h.includes(kw))
      );

      if (!isHeader) {
        headerLine = ['name', 'mobile', 'email', 'college', 'department', 'year', 'reg_no'];
        startIndex = 0;
      }

      const rows = [];
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split by delimiter
        const cols = typeof delimiter === 'string' ? line.split(delimiter).map((c) => c.trim()) : line.split(delimiter).map((c) => c.trim());
        
        // If line contains phone number pattern, parse intelligently
        const rowObj = {};
        if (isHeader) {
          headerLine.forEach((h, idx) => {
            rowObj[h] = cols[idx] || '';
          });
        } else {
          // Heuristic parser: find 10-digit phone, email, etc.
          const phoneMatch = line.match(/(?:\+91[\s-]?)?[6-9]\d{9}/);
          const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

          rowObj['name'] = cols[0] || '';
          rowObj['mobile'] = phoneMatch ? phoneMatch[0] : (cols[1] || '');
          rowObj['email'] = emailMatch ? emailMatch[0] : (cols[2] || '');
          rowObj['college'] = cols[3] || 'Engineering College';
          rowObj['department'] = cols[4] || 'Computer Science & Engineering';
        }
        rows.push(rowObj);
      }

      normalizeAndSetRows(rows);
    } catch (err) {
      toast.error('Failed to parse text content.');
    }
  };

  const normalizeAndSetRows = (rawRows) => {
    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      toast.error('No participant records detected');
      setParsedRows([]);
      return;
    }

    const startCount = participants.length;

    const normalized = rawRows.map((r, idx) => {
      const keys = Object.keys(r);
      const findVal = (patterns) => {
        const matchedKey = keys.find((k) =>
          patterns.some((p) => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(p))
        );
        return matchedKey ? String(r[matchedKey]).trim() : '';
      };

      const fullName = findVal(['fullname', 'name', 'participantname', 'studentname', 'candidate', 'scholar']);
      const mobile = findVal(['mobile', 'phone', 'phonenumber', 'contact', 'cell', 'mobileno', 'phno']);
      const email = findVal(['email', 'mail', 'emailaddress']);
      const college = findVal(['college', 'institution', 'university', 'collegename', 'institute']) || 'Engineering College';
      const department = findVal(['department', 'dept', 'branch', 'course', 'stream']) || 'Computer Science & Engineering';
      const year = findVal(['year', 'academicyear', 'class']) || '3rd Year';
      const fileRegNo = findVal(['registrationnumber', 'regno', 'rollno', 'register', 'idnumber', 'reg']);

      // Auto-incrementing sequential registration number for every participant!
      const autoSeqRegNo = fileRegNo || `${regPrefix}${String(startCount + idx + 1).padStart(3, '0')}`;

      const phoneDigits = mobile.replace(/\D/g, '');
      const autoPassword = getFirst4Digits(mobile);
      const autoEmail = email || (phoneDigits ? `elq_${phoneDigits}@eloquence.com` : `elq_user_${startCount + idx + 1}@eloquence.com`);

      const isValid = Boolean(fullName && mobile && phoneDigits.length >= 4);

      return {
        id: idx + 1,
        full_name: fullName,
        mobile,
        email: autoEmail,
        college,
        department,
        year,
        registration_number: autoSeqRegNo,
        auto_password: autoPassword,
        is_valid: isValid,
        validation_error: !fullName
          ? 'Missing Name'
          : (!mobile ? 'Missing Phone' : (phoneDigits.length < 4 ? 'Phone needs ≥4 digits' : ''))
      };
    });

    setParsedRows(normalized);
    const validCount = normalized.filter((r) => r.is_valid).length;
    toast.success(`Detected ${normalized.length} records (${validCount} valid with auto-incremented Reg Nos)`);
  };

  const handleBulkImportSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.is_valid);
    if (validRows.length === 0) {
      toast.error('No valid rows to import. Please check your data.');
      return;
    }

    setImportingBulk(true);
    try {
      const payload = validRows.map((r) => ({
        full_name: r.full_name,
        mobile: r.mobile,
        email: r.email,
        college: r.college,
        department: r.department,
        year: r.year,
        registration_number: r.registration_number,
        password: r.auto_password
      }));

      const res = await adminService.bulkImportParticipants(payload);
      if (res.success) {
        setBulkResult(res.data);
        setShowBulkResultModal(true);

        // Prepend newly imported items into state immediately
        if (res.data.imported && res.data.imported.length > 0) {
          setParticipants((prev) => [...res.data.imported, ...prev]);
        }

        toast.success(res.message || `Successfully registered ${res.data.importedCount} participants!`);
        fetchParticipants();

        // Switch to credentials lookup tab so all imported scholars are immediately visible
        setActiveTab('DIRECTORY');

        // Clear preview
        setParsedRows([]);
        setBulkFile(null);
        setRawText('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Bulk import failed';
      toast.error(msg);
    } finally {
      setImportingBulk(false);
    }
  };

  const downloadSampleTemplate = (format = 'xlsx') => {
    const sampleData = [
      {
        'Full Name': 'Aarav Sharma',
        'Phone Number': '9876543210',
        'Email Address': 'aarav.sharma@example.edu',
        'College / Institution': 'PSG College of Technology',
        'Department': 'Computer Science & Engineering',
        'Year': '3rd Year',
        'Registration No': 'REG-2026-001'
      },
      {
        'Full Name': 'Diya Venkatesh',
        'Phone Number': '9123456780',
        'Email Address': 'diya.v@example.edu',
        'College / Institution': 'MIT Campus, Anna University',
        'Department': 'Information Technology',
        'Year': '4th Year',
        'Registration No': 'REG-2026-002'
      },
      {
        'Full Name': 'Karthik Raja',
        'Phone Number': '9988776655',
        'Email Address': '',
        'College / Institution': 'SSN College of Engineering',
        'Department': 'Artificial Intelligence & Data Science',
        'Year': '2nd Year',
        'Registration No': 'REG-2026-003'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Participants');

    if (format === 'xlsx') {
      XLSX.writeFile(workbook, 'Eloquence26_Participant_Import_Template.xlsx');
    } else {
      XLSX.writeFile(workbook, 'Eloquence26_Participant_Import_Template.csv', { bookType: 'csv' });
    }
    toast.success(`Downloaded sample ${format.toUpperCase()} template`);
  };

  const downloadCredentialsExport = (importedList) => {
    if (!importedList || importedList.length === 0) return;

    const exportData = importedList.map((p) => ({
      'Participant ID': p.participant_id,
      'Symposium Reg No': p.registration_number || '',
      'Full Name': p.full_name,
      'Phone Number': p.mobile,
      'Login Identifier': p.email || p.participant_id,
      'Initial Password (First 4 Digits)': p.default_password || getFirst4Digits(p.mobile),
      'College': p.college || '',
      'Department': p.department || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Credentials');
    XLSX.writeFile(workbook, `Eloquence26_Participant_Credentials_${Date.now()}.xlsx`);
    toast.success('Downloaded credentials spreadsheet!');
  };

  // Filtered participants for Directory tab
  const filteredDirectory = participants.filter((p) => {
    if (!searchDirectory) return true;
    const q = searchDirectory.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.participant_id?.toLowerCase().includes(q) ||
      p.registration_number?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.mobile?.toLowerCase().includes(q) ||
      p.college?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-widest mb-1">
            <UserPlus className="w-4 h-4" />
            <span>Participant Access & Desk Management</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            User Registration & Multi-Format Import
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Supports PDF, Excel (.xlsx/.xls), CSV, JSON, TXT, and Paste with auto 4-digit phone passwords & auto-incrementing symposium registration numbers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadSampleTemplate('xlsx')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-500 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel Template</span>
          </button>
          <button
            onClick={() => downloadSampleTemplate('csv')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-brand-500 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>CSV Template</span>
          </button>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-w-lg">
        <button
          type="button"
          onClick={() => setActiveTab('SINGLE')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'SINGLE'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Single Registration</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('BULK')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'BULK'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Any Format Import</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('DIRECTORY')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'DIRECTORY'
              ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Credentials Lookup ({participants.length})</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: SINGLE PARTICIPANT REGISTRATION                    */}
      {/* ========================================================= */}
      {activeTab === 'SINGLE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Registration Form Card */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-500" />
              <span>Register Individual Participant</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Enter scholar details. The first 4 digits of the phone number will automatically be used as the login password and symposium registration number auto-increments.
            </p>

            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Participant Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={singleForm.full_name}
                    onChange={(e) => setSingleForm({ ...singleForm, full_name: e.target.value })}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                {/* Mobile / Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Phone / Mobile Number *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={singleForm.mobile}
                      onChange={(e) => setSingleForm({ ...singleForm, mobile: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Email & Registration Number with Auto-Increment Indicator */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                      Email Address
                    </label>
                    <span className="text-[10px] text-slate-400">(Auto-generated if blank)</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="email"
                      value={singleForm.email}
                      onChange={(e) => setSingleForm({ ...singleForm, email: e.target.value })}
                      placeholder={
                        singleForm.mobile.replace(/\D/g, '')
                          ? `elq_${singleForm.mobile.replace(/\D/g, '')}@eloquence.com`
                          : 'e.g. student@college.edu'
                      }
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                      Symposium / College Reg No
                    </label>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <Sparkles className="w-3 h-3" />
                      <span>Auto-Incrementing</span>
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Hash className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      required
                      value={singleForm.registration_number}
                      onChange={(e) => setSingleForm({ ...singleForm, registration_number: e.target.value })}
                      placeholder="e.g. REG-2026-001"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 text-xs font-bold text-emerald-900 dark:text-emerald-200 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* College, Department, Year */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    College / Institution
                  </label>
                  <input
                    type="text"
                    value={singleForm.college}
                    onChange={(e) => setSingleForm({ ...singleForm, college: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Department / Branch
                  </label>
                  <input
                    type="text"
                    value={singleForm.department}
                    onChange={(e) => setSingleForm({ ...singleForm, department: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Academic Year
                  </label>
                  <select
                    value={singleForm.year}
                    onChange={(e) => setSingleForm({ ...singleForm, year: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Postgraduate">Postgraduate</option>
                  </select>
                </div>
              </div>

              {/* Auto Password Feature Section */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-brand-950/40 border border-blue-200/80 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Password Auto-Select Settings
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={singleForm.use_auto_password}
                      onChange={(e) => setSingleForm({ ...singleForm, use_auto_password: e.target.checked })}
                      className="rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
                      Use First 4 Digits of Phone
                    </span>
                  </label>
                </div>

                {singleForm.use_auto_password ? (
                  <div className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 p-3 rounded-xl border border-blue-100 dark:border-slate-800">
                    <div className="text-slate-600 dark:text-slate-400">
                      Participant Password will be set to:
                    </div>
                    <div className="flex items-center gap-1.5 font-mono font-black text-sm text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-2.5 py-1 rounded-lg border border-brand-200 dark:border-brand-900">
                      <span>{getFirst4Digits(singleForm.mobile)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                      Custom Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCustomPass ? 'text' : 'password'}
                        required={!singleForm.use_auto_password}
                        value={singleForm.custom_password}
                        onChange={(e) => setSingleForm({ ...singleForm, custom_password: e.target.value })}
                        placeholder="Enter custom participant password..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCustomPass(!showCustomPass)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showCustomPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submittingSingle}
                className="w-full py-3 px-4 rounded-2xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50"
              >
                {submittingSingle ? (
                  <span>Registering Participant...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create & Register Participant</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Live Credential Slip / Success Result */}
          <div className="space-y-4">
            {createdParticipant ? (
              <div className="bg-gradient-to-br from-brand-600 to-indigo-700 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full">
                    Symposium Registration Slip
                  </span>
                  <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                </div>

                <div>
                  <p className="text-[11px] text-brand-100 font-semibold uppercase tracking-wider">Participant ID</p>
                  <p className="text-2xl font-black font-mono tracking-tight">{createdParticipant.participant_id}</p>
                  <p className="text-xs font-mono text-emerald-200 font-bold mt-0.5">
                    Reg No: {createdParticipant.registration_number}
                  </p>
                </div>

                <div className="space-y-1.5 border-t border-white/20 pt-3 text-xs">
                  <div>
                    <span className="text-brand-200 text-[10px] uppercase font-bold block">Scholar Name</span>
                    <span className="font-bold text-sm">{createdParticipant.full_name}</span>
                  </div>
                  <div>
                    <span className="text-brand-200 text-[10px] uppercase font-bold block">Phone Number</span>
                    <span className="font-semibold">{createdParticipant.mobile}</span>
                  </div>
                  <div>
                    <span className="text-brand-200 text-[10px] uppercase font-bold block">Login ID / Email</span>
                    <span className="font-mono text-xs">{createdParticipant.email}</span>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-xl mt-2 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-black text-brand-200 block">Initial Password</span>
                      <span className="font-mono font-black text-base text-yellow-300">
                        {createdParticipant.generated_password || getFirst4Digits(createdParticipant.mobile)}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        handleCopy(
                          `Participant ID: ${createdParticipant.participant_id}\nReg No: ${createdParticipant.registration_number}\nEmail: ${createdParticipant.email}\nPassword: ${createdParticipant.generated_password}`,
                          'slip'
                        )
                      }
                      className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all"
                      title="Copy Login Credentials"
                    >
                      {copiedKey === 'slip' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('DIRECTORY');
                      fetchParticipants();
                    }}
                    className="flex-1 py-2 rounded-xl bg-white text-brand-700 hover:bg-brand-50 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-brand-600" />
                    <span>View in Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="py-2 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatedParticipant(null)}
                    className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Auto-Increment Registration Protocol
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  During technical symposium registration desk operations:
                </p>
                <ul className="text-xs space-y-2 text-slate-600 dark:text-slate-300 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <span>Symposium Reg No automatically increments sequentially for every new student.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <span>Participant's password is auto-computed as their <strong>first 4 digits of phone</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <span>Accepts any document: <strong>PDF files, Excel (.xlsx/.xls), CSV, JSON, TXT, or direct copy-paste</strong>.</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ANY FORMAT BULK IMPORT (PDF, Excel, CSV, JSON)      */}
      {/* ========================================================= */}
      {activeTab === 'BULK' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileType className="w-4 h-4 text-emerald-600" />
                  <span>Universal File & Document Importer (Any Format)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Import participant lists from <strong className="text-slate-700 dark:text-slate-200">PDF documents, Excel (.xlsx, .xls), CSV, TSV, JSON, TXT, or Spreadsheet copy-paste</strong>.
                </p>
              </div>

              <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPasteMode(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    !pasteMode
                      ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  File Upload (PDF/Excel/CSV)
                </button>
                <button
                  type="button"
                  onClick={() => setPasteMode(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    pasteMode
                      ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Paste Data
                </button>
              </div>
            </div>

            {/* Prefix & Increment settings */}
            <div className="flex flex-wrap items-center gap-4 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Symposium Reg No Auto-Increment Prefix:
              </span>
              <input
                type="text"
                value={regPrefix}
                onChange={(e) => setRegPrefix(e.target.value)}
                placeholder="REG-2026-"
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs font-bold max-w-[150px]"
              />
              <span className="text-slate-400 text-[11px]">
                (Each imported candidate automatically receives an increasing number: {regPrefix}001, {regPrefix}002, ...)
              </span>
            </div>

            {!pasteMode ? (
              /* Universal File Drag & Drop Zone */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/30 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.xlsx,.xls,.csv,.tsv,.json,.txt,.doc,.docx"
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isParsingFile ? (
                    <span className="text-brand-600 animate-pulse">Parsing document contents...</span>
                  ) : bulkFile ? (
                    `${bulkFile.name} (${fileTypeDetected})`
                  ) : (
                    'Click to upload or drag & drop any participant file'
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Accepts <strong className="text-brand-600 dark:text-brand-400">PDF (.pdf), Excel (.xlsx, .xls), CSV, TSV, JSON, or Text files</strong>
                </p>
                <div className="mt-3 flex items-center justify-center gap-3 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700">.PDF</span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700">.XLSX / .XLS</span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700">.CSV</span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700">.JSON</span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700">.TXT</span>
                </div>
              </div>
            ) : (
              /* Paste Raw Text / TSV / CSV / Table */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Paste Tab-Separated, CSV, or Raw Candidate Text
                  </label>
                  <button
                    type="button"
                    onClick={() => parseRawTextContent(rawText)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm"
                  >
                    Parse Pasted Text
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Full Name\tPhone Number\tEmail\tCollege\nArun Kumar\t9876543210\tarun@college.edu\tPSG Tech\nSneha Roy\t9123456780\tsneha@mit.edu\tMIT Anna Univ`}
                  className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            )}

            {/* Parsed Rows Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Data Import Preview ({parsedRows.filter((r) => r.is_valid).length} / {parsedRows.length} Valid Records)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Auto-incremented Reg Nos and 4-digit phone passwords computed automatically.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setParsedRows([])}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkImportSubmit}
                      disabled={importingBulk || parsedRows.filter((r) => r.is_valid).length === 0}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 disabled:opacity-50"
                    >
                      {importingBulk ? (
                        <span>Importing...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Import All {parsedRows.filter((r) => r.is_valid).length} Participants</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 max-h-96">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold uppercase text-[10px] tracking-wider sticky top-0">
                      <tr>
                        <th className="py-3 px-3">#</th>
                        <th className="py-3 px-3">Auto Reg No</th>
                        <th className="py-3 px-4">Full Name</th>
                        <th className="py-3 px-4">Phone Number</th>
                        <th className="py-3 px-4">Auto Password (1st 4 Digits)</th>
                        <th className="py-3 px-4">Email / Login ID</th>
                        <th className="py-3 px-4">College & Dept</th>
                        <th className="py-3 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                      {parsedRows.map((r, idx) => (
                        <tr
                          key={r.id}
                          className={r.is_valid ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40' : 'bg-rose-50/50 dark:bg-rose-950/20'}
                        >
                          <td className="py-3 px-3 text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {r.registration_number}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {r.full_name || <span className="text-rose-500 italic">Empty Name</span>}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {r.mobile || <span className="text-rose-500 italic">Empty Phone</span>}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-xs bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-md border border-brand-200 dark:border-brand-800">
                              {r.auto_password}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                            {r.email}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            <p>{r.college}</p>
                            <p className="text-[10px] text-slate-400">{r.department}</p>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {r.is_valid ? (
                              <Badge variant="success" size="sm">Valid</Badge>
                            ) : (
                              <Badge variant="danger" size="sm">{r.validation_error || 'Invalid'}</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: CREDENTIALS DIRECTORY & QUICK DESK LOOKUP          */}
      {/* ========================================================= */}
      {activeTab === 'DIRECTORY' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchDirectory}
                onChange={(e) => setSearchDirectory(e.target.value)}
                placeholder="Search scholar by name, participant ID, reg no, phone, or college..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadCredentialsExport(participants)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export All Credentials (Excel)</span>
              </button>
              <button
                onClick={fetchParticipants}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100"
                title="Refresh Directory"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Participant ID</th>
                    <th className="py-3 px-4">Symposium Reg No</th>
                    <th className="py-3 px-4">Name & Contact</th>
                    <th className="py-3 px-4">Login Identifier</th>
                    <th className="py-3 px-4">Auto Password (1st 4 Digits)</th>
                    <th className="py-3 px-4">College</th>
                    <th className="py-3 px-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  {filteredDirectory.map((p) => {
                    const pass = getFirst4Digits(p.mobile);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                          {p.participant_id}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {p.registration_number || '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900 dark:text-white">{p.full_name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{p.mobile || 'No mobile'}</p>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {p.email}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="font-mono font-bold text-brand-600 dark:text-brand-400 text-xs">
                              {pass}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-slate-800 dark:text-slate-200">{p.college}</p>
                          <p className="text-[10px] text-slate-400">{p.department}</p>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  `Participant ID: ${p.participant_id}\nReg No: ${p.registration_number}\nEmail: ${p.email}\nPassword: ${pass}`,
                                  p.id
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-brand-500 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-600"
                              title="Copy Credentials"
                            >
                              {copiedKey === p.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>Copy</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEditClick(p)}
                              className="p-1 rounded-lg border border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all"
                              title="Edit Participant"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteClick(p)}
                              className="p-1 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                              title="Delete Participant"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Success Modal */}
      {bulkResult && (
        <Modal
          isOpen={showBulkResultModal}
          onClose={() => setShowBulkResultModal(false)}
          title="Bulk Registration Complete"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">
                  Successfully imported {bulkResult.importedCount} participants!
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  All accounts assigned sequential Symposium Reg Nos and auto-passwords (first 4 digits of phone).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => downloadCredentialsExport(bulkResult.imported)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20"
              >
                <Download className="w-4 h-4" />
                <span>Download Credentials Spreadsheet (Excel)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowBulkResultModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Participant Modal */}
      <EditParticipantModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingParticipant(null);
        }}
        participant={editingParticipant}
        onSave={handleSaveParticipant}
      />

      {/* Delete Participant Modal */}
      <DeleteParticipantModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingParticipant(null);
        }}
        participant={deletingParticipant}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
