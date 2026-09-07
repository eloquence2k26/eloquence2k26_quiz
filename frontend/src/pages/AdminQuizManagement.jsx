import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Edit3, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  AlertTriangle,
  UserCheck,
  UserX,
  Users,
  Search,
  RefreshCw,
  Eye,
  Calendar,
  Layers,
  Award,
  HelpCircle,
  Image as ImageIcon,
  Check,
  Lock,
  ChevronRight,
  Filter,
  Star,
  UserMinus,
  Sparkles,
  RotateCcw,
  Upload,
  UploadCloud,
  FileText
} from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { API_ADMIN_URL } from '../config/apiConfig';
import { useToast } from '../context/ToastContext';
import { parseQuestionFile, parseUserFile } from '../utils/fileParser';

export const AdminQuizManagement = ({ initialTab = 'quizzes' }) => {
  const { user, registeredUsers, fetchUsers } = useAuth();
  const { toast } = useToast();

  // Active Tab: 'quizzes' | 'questions' | 'registrations' | 'submissions' | 'results' | 'violations' | 'retests'
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Main Data States
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [results, setResults] = useState([]);
  const [violations, setViolations] = useState([]);
  const [retestRequests, setRetestRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Restart Test Direct Action State
  const [restartParticipantId, setRestartParticipantId] = useState('');

  // Next Round Filter State
  const [topCount, setTopCount] = useState(5);
  const [nextRoundQuizId, setNextRoundQuizId] = useState('');

  // Modals States
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);

  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Import Question Modal States
  const [isImportQuestionsModalOpen, setIsImportQuestionsModalOpen] = useState(false);
  const [parsedQuestionsPreview, setParsedQuestionsPreview] = useState([]);
  const [isParsingQuestions, setIsParsingQuestions] = useState(false);
  const [importFileName, setImportFileName] = useState('');

  // Import Student Access Modal States
  const [isImportStudentsModalOpen, setIsImportStudentsModalOpen] = useState(false);
  const [parsedStudentsPreview, setParsedStudentsPreview] = useState([]);
  const [isParsingStudents, setIsParsingStudents] = useState(false);
  const [importStudentFileName, setImportStudentFileName] = useState('');

  // Select from Registered Users Modal States
  const [isSelectUsersModalOpen, setIsSelectUsersModalOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isGrantingSelected, setIsGrantingSelected] = useState(false);

  // Form States - Quiz Event
  const [quizForm, setQuizForm] = useState({
    title: '',
    description: '',
    event_id: 'evt_eloquence_2026',
    category: 'General Technology',
    start_date_time: new Date().toISOString().slice(0, 16),
    end_date_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    duration: 30,
    max_participants: 100,
    total_questions: 30,
    marks_per_question: 1,
    negative_marking: false,
    negative_marks_value: 0,
    status: 'Published',
    instructions: `1. Maintain fullscreen mode throughout the test.\n2. Do not switch tabs or open external applications.\n3. Submit before timer reaches zero.`,
    max_attempts: 1,
    strict_mode: true,
    fullscreen_required: true,
    detect_visibility_change: true,
    detect_tab_switch: true,
    detect_focus_loss: true,
    detect_fullscreen_exit: true,
    max_violations: 3,
    violation_action: 'lock',
    show_score: true,
    show_correct_answers: false,
    show_ranking: false,
    allow_retest: true
  });

  // Form States - Question
  const [questionForm, setQuestionForm] = useState({
    prompt: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    optionsCount: 4,
    correct_answer: 'A',
    marks: 1,
    negative_marks: 0,
    question_image: '',
    explanation: '',
    question_order: 1
  });

  // 1. Fetch All Quizzes
  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_ADMIN_URL}/quizzes`);
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data.quizzes || []);
        if (data.quizzes?.length > 0 && !selectedQuiz) {
          setSelectedQuiz(data.quizzes[0]);
        }
      }
    } catch (err) {
      console.error('Fetch quizzes error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Questions for Selected Quiz
  const fetchQuestions = async (quizId) => {
    if (!quizId) return;
    try {
      const res = await fetch(`${API_ADMIN_URL}/quizzes/${quizId}/questions`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error('Fetch questions error:', err);
    }
  };

  // 3. Fetch Registrations for Selected Quiz
  const fetchRegistrations = async (quizId) => {
    if (!quizId) return;
    try {
      const res = await fetch(`${API_ADMIN_URL}/quizzes/${quizId}/registrations`);
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data.registrations || []);
      }
    } catch (err) {
      console.error('Fetch registrations error:', err);
    }
  };

  // 4. Fetch Submissions for Selected Quiz Event
  const fetchSubmissions = async (quizId) => {
    if (!quizId) return;
    try {
      const res = await fetch(`${API_ADMIN_URL}/quizzes/${quizId}/submissions`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error('Fetch submissions error:', err);
    }
  };

  // 5. Fetch Results & Audit Logs
  const fetchResultsAndViolations = async () => {
    try {
      const [rRes, vRes, retRes] = await Promise.all([
        fetch(`${API_ADMIN_URL}/results`),
        fetch(`${API_ADMIN_URL}/violations`),
        fetch(`${API_ADMIN_URL}/retests`)
      ]);
      if (rRes.ok) {
        const rData = await rRes.json();
        setResults(rData.results || []);
      }
      if (vRes.ok) {
        const vData = await vRes.json();
        setViolations(vData.violations || []);
      }
      if (retRes.ok) {
        const retData = await retRes.json();
        setRetestRequests(retData.retests || []);
      }
    } catch (err) {
      console.error('Fetch results/violations error:', err);
    }
  };

  useEffect(() => {
    fetchQuizzes();
    fetchResultsAndViolations();
  }, []);

  useEffect(() => {
    if (selectedQuiz) {
      fetchQuestions(selectedQuiz.id);
      fetchRegistrations(selectedQuiz.id);
      fetchSubmissions(selectedQuiz.id);
    }
  }, [selectedQuiz]);

  // Execute Filter & Qualify Top N Performers for Next Round
  const handleQualifyTopN = async () => {
    if (!selectedQuiz) return;
    try {
      const res = await fetch(`${API_ADMIN_URL}/quizzes/${selectedQuiz.id}/qualify-next-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topCount: parseInt(topCount, 10) || 5,
          nextRoundQuizId: nextRoundQuizId || null
        })
      });

      if (res.ok) {
        const data = await res.json();
        setStatusMsg(`Successfully qualified top ${data.qualifiedCount} participants! ${data.eliminatedCount} non-selected participants have been eliminated.`);
        fetchSubmissions(selectedQuiz.id);
        fetchQuizzes();
        setTimeout(() => setStatusMsg(''), 4000);
      }
    } catch (err) {
      console.error('Qualify top N error:', err);
    }
  };

  // Manual Toggle Qualification for Individual Student
  const handleToggleQualification = async (participantId, currentStatus) => {
    if (!selectedQuiz) return;
    const newStatus = currentStatus === 'QUALIFIED' ? 'ELIMINATED' : 'QUALIFIED';
    try {
      const res = await fetch(`${API_ADMIN_URL}/quizzes/${selectedQuiz.id}/toggle-qualification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId,
          newQualificationStatus: newStatus,
          nextRoundQuizId: nextRoundQuizId || null
        })
      });

      if (res.ok) {
        fetchSubmissions(selectedQuiz.id);
      }
    } catch (err) {
      console.error('Toggle qualification error:', err);
    }
  };

  // Quiz Event Submit (Create or Update)
  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingQuiz ? `${API_ADMIN_URL}/quizzes/${editingQuiz.id}` : `${API_ADMIN_URL}/quizzes`;
      const method = editingQuiz ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizForm)
      });

      if (res.ok) {
        const msg = editingQuiz ? 'Quiz updated successfully!' : 'New Quiz Event created successfully!';
        setStatusMsg(msg);
        toast.success(msg);
        setIsQuizModalOpen(false);
        setEditingQuiz(null);
        fetchQuizzes();
        setTimeout(() => setStatusMsg(''), 3000);
      }
    } catch (err) {
      console.error('Save quiz error:', err);
      toast.error('Failed to save quiz event.');
    }
  };

  const handleEditQuizClick = (quiz) => {
    setEditingQuiz(quiz);
    setQuizForm({
      title: quiz.title || '',
      description: quiz.description || '',
      event_id: quiz.event_id || 'evt_eloquence_2026',
      category: quiz.category || 'General Technology',
      start_date_time: quiz.start_date_time ? new Date(quiz.start_date_time).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      end_date_time: quiz.end_date_time ? new Date(quiz.end_date_time).toISOString().slice(0, 16) : new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      duration: quiz.duration || 30,
      max_participants: quiz.max_participants || 100,
      total_questions: quiz.total_questions || 30,
      marks_per_question: quiz.marks_per_question || 1,
      negative_marking: Boolean(quiz.negative_marking),
      negative_marks_value: quiz.negative_marks_value || 0,
      status: quiz.status || 'Published',
      instructions: quiz.instructions || '',
      max_attempts: quiz.max_attempts || 1,
      strict_mode: quiz.strict_mode ?? true,
      fullscreen_required: quiz.fullscreen_required ?? true,
      detect_visibility_change: quiz.detect_visibility_change ?? true,
      detect_tab_switch: quiz.detect_tab_switch ?? true,
      detect_focus_loss: quiz.detect_focus_loss ?? true,
      detect_fullscreen_exit: quiz.detect_fullscreen_exit ?? true,
      max_violations: quiz.max_violations || 3,
      violation_action: quiz.violation_action || 'lock',
      show_score: quiz.show_score ?? true,
      show_correct_answers: quiz.show_correct_answers ?? false,
      show_ranking: quiz.show_ranking ?? false,
      allow_retest: quiz.allow_retest ?? true
    });
    setIsQuizModalOpen(true);
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz event?')) return;
    try {
      const res = await fetch(`${API_ADMIN_URL}/quizzes/${quizId}`, { method: 'DELETE' });
      if (res.ok) {
        setStatusMsg('Quiz deleted.');
        toast.info('Quiz event deleted.');
        fetchQuizzes();
        setTimeout(() => setStatusMsg(''), 3000);
      }
    } catch (err) {
      console.error('Delete quiz error:', err);
      toast.error('Failed to delete quiz.');
    }
  };

  // Question Submit (Create or Update inside Selected Quiz)
  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedQuiz) {
      toast.warning('Please select a Quiz Event first before creating questions.');
      return;
    }

    try {
      const url = editingQuestion 
        ? `${API_ADMIN_URL}/quizzes/${selectedQuiz.id}/questions/${editingQuestion.id}`
        : `${API_ADMIN_URL}/quizzes/${selectedQuiz.id}/questions`;
      const method = editingQuestion ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionForm)
      });

      if (res.ok) {
        const msg = editingQuestion ? 'Question updated successfully!' : 'Question added to quiz successfully!';
        setStatusMsg(msg);
        toast.success(msg);
        setIsQuestionModalOpen(false);
        setEditingQuestion(null);
        fetchQuestions(selectedQuiz.id);
        fetchQuizzes();
        setTimeout(() => setStatusMsg(''), 3000);
      }
    } catch (err) {
      console.error('Save question error:', err);
      toast.error('Failed to save question.');
    }
  };

  const handleEditQuestionClick = (qn) => {
    setEditingQuestion(qn);
    setQuestionForm({
      prompt: qn.prompt || '',
      optionA: qn.optionA || qn.option_a || '',
      optionB: qn.optionB || qn.option_b || '',
      optionC: qn.optionC || qn.option_c || '',
      optionD: qn.optionD || qn.option_d || '',
      optionsCount: qn.options_count || (qn.optionD ? 4 : (qn.optionC ? 3 : 2)),
      correct_answer: (qn.correct_answer || qn.correct_option || 'A').toUpperCase(),
      marks: qn.marks || 1,
      negative_marks: qn.negative_marks || 0,
      question_image: qn.question_image || qn.image_url || '',
      explanation: qn.explanation || '',
      question_order: qn.question_order || 1
    });
    setIsQuestionModalOpen(true);
  };

  const handleDeleteQuestion = async (qId) => {
    if (!selectedQuiz) return;
    if (!window.confirm('Delete this question?')) return;
    try {
      const res = await fetch(`${API_ADMIN_URL}/quizzes/${selectedQuiz.id}/questions/${qId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchQuestions(selectedQuiz.id);
        fetchQuizzes();
      }
    } catch (err) {
      console.error('Delete question error:', err);
    }
  };

  // Handle question file upload & parsing
  const handleQuestionFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setIsParsingQuestions(true);
    try {
      const questionsExtracted = await parseQuestionFile(file);
      if (Array.isArray(questionsExtracted) && questionsExtracted.length > 0) {
        setParsedQuestionsPreview(questionsExtracted);
        toast.success(`Parsed ${questionsExtracted.length} question(s) from ${file.name}`);
      } else {
        toast.error('No valid questions found in file. Ensure file contains questions with options.');
        setParsedQuestionsPreview([]);
      }
    } catch (err) {
      console.error('Parse question file error:', err);
      toast.error(err.message || 'Failed to parse questions file.');
    } finally {
      setIsParsingQuestions(false);
    }
  };

  // Confirm and Save Bulk Questions to DB
  const handleConfirmImportQuestions = async () => {
    if (!selectedQuiz) {
      toast.error('Please select a Quiz Event first.');
      return;
    }
    if (!parsedQuestionsPreview.length) {
      toast.error('No parsed questions to import.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_ADMIN_URL}/quizzes/${selectedQuiz.id}/questions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: parsedQuestionsPreview })
      });

      if (res.ok) {
        const data = await res.json();
        const msg = `Successfully imported ${data.count || parsedQuestionsPreview.length} questions into "${selectedQuiz.title}"!`;
        setStatusMsg(msg);
        toast.success(msg);
        setIsImportQuestionsModalOpen(false);
        setParsedQuestionsPreview([]);
        setImportFileName('');
        fetchQuestions(selectedQuiz.id);
        fetchQuizzes();
        setTimeout(() => setStatusMsg(''), 4000);
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Failed to import questions');
      }
    } catch (err) {
      console.error('Import questions bulk error:', err);
      toast.error('Network error during bulk import.');
    } finally {
      setLoading(false);
    }
  };

  // Handle student file upload & parsing
  const handleStudentFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStudentFileName(file.name);
    setIsParsingStudents(true);
    try {
      const studentsExtracted = await parseUserFile(file);
      if (Array.isArray(studentsExtracted) && studentsExtracted.length > 0) {
        setParsedStudentsPreview(studentsExtracted);
        toast.success(`Parsed ${studentsExtracted.length} student(s) from ${file.name}`);
      } else {
        toast.error('No valid student records found in file. Ensure file contains student names, emails, or phone numbers.');
        setParsedStudentsPreview([]);
      }
    } catch (err) {
      console.error('Parse student file error:', err);
      toast.error(err.message || 'Failed to parse student file.');
    } finally {
      setIsParsingStudents(false);
    }
  };

  // Confirm and Save Bulk Student Access to DB
  const handleConfirmImportStudents = async () => {
    if (!selectedQuiz) {
      toast.error('Please select a Quiz Event first.');
      return;
    }
    if (!parsedStudentsPreview.length) {
      toast.error('No parsed student records to import.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_ADMIN_URL}/quizzes/${selectedQuiz.id}/upload-participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: parsedStudentsPreview })
      });

      if (res.ok) {
        const data = await res.json();
        const msg = `Successfully granted access to ${data.count || parsedStudentsPreview.length} student(s) for "${selectedQuiz.title}"!`;
        setStatusMsg(msg);
        toast.success(msg);
        setIsImportStudentsModalOpen(false);
        setParsedStudentsPreview([]);
        setImportStudentFileName('');
        fetchRegistrations(selectedQuiz.id);
        setTimeout(() => setStatusMsg(''), 4000);
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Failed to grant student access.');
      }
    } catch (err) {
      console.error('Import students bulk error:', err);
      toast.error('Network error during bulk student upload.');
    } finally {
      setLoading(false);
    }
  };

  // Grant Access to Selected Registered Users
  const handleGrantSelectedUsers = async () => {
    if (!selectedQuiz || selectedUserIds.length === 0) return;
    setIsGrantingSelected(true);
    let successCount = 0;
    try {
      for (const userId of selectedUserIds) {
        const user = (registeredUsers || []).find((u) => u.id === userId);
        if (!user) continue;
        const res = await fetch(`${API_ADMIN_URL}/quizzes/${selectedQuiz.id}/access`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantId: user.id, accessStatus: 'Granted' })
        });
        if (res.ok) successCount++;
      }
      toast.success(`Granted access to ${successCount} student(s) for "${selectedQuiz.title}"!`);
      setIsSelectUsersModalOpen(false);
      setSelectedUserIds([]);
      setUserSearchTerm('');
      fetchRegistrations(selectedQuiz.id);
    } catch (err) {
      console.error('Grant selected users error:', err);
      toast.error('Network error granting user access.');
    } finally {
      setIsGrantingSelected(false);
    }
  };

  // Participant Access Toggle (Grant / Revoke)
  const handleToggleAccess = async (participantId, currentAccess) => {
    if (!selectedQuiz) return;
    const newStatus = currentAccess === 'Granted' ? 'Revoked' : 'Granted';
    try {
      const res = await fetch(`${API_ADMIN_URL}/quizzes/${selectedQuiz.id}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, accessStatus: newStatus })
      });

      if (res.ok) {
        fetchRegistrations(selectedQuiz.id);
      }
    } catch (err) {
      console.error('Toggle access error:', err);
    }
  };

  // Retest Approval (Grant / Deny)
  const handleRetestAction = async (requestId, quizId, action) => {
    try {
      const endpoint = action === 'grant' ? 'approve' : 'reject';
      const res = await fetch(`${API_ADMIN_URL}/retests/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          quizId,
          adminMessage: action === 'grant' ? 'Retest permission granted by administrator.' : 'Retest request denied.'
        })
      });

      if (res.ok) {
        fetchResultsAndViolations();
        setStatusMsg(`Retest request ${action === 'grant' ? 'approved' : 'rejected'}.`);
        setTimeout(() => setStatusMsg(''), 3000);
      }
    } catch (err) {
      console.error('Retest action error:', err);
    }
  };

  // Direct Restart Test Action by Admin
  const handleDirectRestartTest = async (participantId, quizId) => {
    const targetQuizId = quizId || selectedQuiz?.id;
    if (!participantId || !targetQuizId) return;
    try {
      const res = await fetch(`${API_ADMIN_URL}/attempts/${participantId}/grant-retest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: targetQuizId,
          adminMessage: 'Retest permission manually granted by administrator.'
        })
      });

      if (res.ok) {
        fetchResultsAndViolations();
        setStatusMsg(`Successfully restarted test attempt for participant (${participantId})! They can now log in and retake the quiz.`);
        setRestartParticipantId('');
        setTimeout(() => setStatusMsg(''), 4000);
      }
    } catch (err) {
      console.error('Direct restart test error:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8">
      {/* Header Banner */}
      <section className="basic-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <Settings className="w-3.5 h-3.5" /> Symposium Quiz Management Hub
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Quiz Events & Administration
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1">
              Create events, manage MCQ questions, give access, filter top performers for Next Round, and handle anti-cheating logs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => {
                setEditingQuiz(null);
                setQuizForm({
                  title: '',
                  description: '',
                  event_id: 'evt_eloquence_2026',
                  category: 'General Technology',
                  start_date_time: new Date().toISOString().slice(0, 16),
                  end_date_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
                  duration: 30,
                  max_participants: 100,
                  total_questions: 30,
                  marks_per_question: 1,
                  negative_marking: false,
                  negative_marks_value: 0,
                  status: 'Published',
                  instructions: `1. Maintain fullscreen mode throughout the test.\n2. Do not switch tabs or open external applications.\n3. Submit before timer reaches zero.`,
                  max_attempts: 1,
                  strict_mode: true,
                  fullscreen_required: true,
                  detect_visibility_change: true,
                  detect_tab_switch: true,
                  detect_focus_loss: true,
                  detect_fullscreen_exit: true,
                  max_violations: 3,
                  violation_action: 'lock',
                  show_score: true,
                  show_correct_answers: false,
                  show_ranking: false,
                  allow_retest: true
                });
                setIsQuizModalOpen(true);
              }}
            >
              Create Quiz Event
            </Button>
          </div>
        </div>

        {statusMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto pb-1 gap-2 pt-4 border-t border-slate-200 dark:border-zinc-800 scrollbar-none">
          {[
            { id: 'quizzes', label: 'Quiz Events', icon: BookOpen, count: quizzes.length },
            { id: 'questions', label: 'Question Management', icon: Layers, count: questions.length },
            { id: 'registrations', label: 'Participant Access', icon: Users, count: registrations.length },
            { id: 'results', label: 'All Results Overview', icon: Award, count: results.length },
            { id: 'violations', label: 'Security Violations Log', icon: ShieldAlert, count: violations.length }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* QUIZ SELECTOR BANNER FOR QUESTION, SUBMISSION, & REGISTRATION TABS */}
      {(activeTab === 'questions' || activeTab === 'registrations' || activeTab === 'submissions') && (
        <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">Active Target Quiz Event</span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedQuiz ? selectedQuiz.title : 'No Quiz Selected'}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-600 dark:text-zinc-400 whitespace-nowrap">Select Event:</label>
            <select
              value={selectedQuiz ? selectedQuiz.id : ''}
              onChange={(e) => {
                const q = quizzes.find((item) => String(item.id) === String(e.target.value));
                if (q) setSelectedQuiz(q);
              }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white w-full sm:w-64"
            >
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>{q.title}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* TAB 1: QUIZ EVENTS */}
      {activeTab === 'quizzes' && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => {
              const startDate = new Date(quiz.start_date_time);
              const endDate = new Date(quiz.end_date_time);
              const isSelected = selectedQuiz && selectedQuiz.id === quiz.id;

              return (
                <div
                  key={quiz.id}
                  className={`basic-card p-6 space-y-5 transition-all flex flex-col justify-between cursor-pointer border ${
                    isSelected ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-zinc-800'
                  }`}
                  onClick={() => setSelectedQuiz(quiz)}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {quiz.category || 'Event Quiz'}
                      </span>

                      <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                        quiz.status === 'Published' || quiz.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                      }`}>
                        {quiz.status || 'Published'}
                      </span>
                    </div>

                    <h4 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">{quiz.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2">{quiz.description || 'Eloquence 2K26 Symposium Quiz Event'}</p>

                    <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                        <span>Start Schedule:</span>
                        <strong className="text-slate-900 dark:text-white">{startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({startDate.toLocaleDateString()})</strong>
                      </div>
                      <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                        <span>Duration:</span>
                        <strong className="text-slate-900 dark:text-white">{quiz.duration} Minutes</strong>
                      </div>
                      <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                        <span>Questions & Marks:</span>
                        <strong className="text-slate-900 dark:text-white">{(quiz.questions || []).length} Qs ({quiz.marks_per_question || 1} mark/qn)</strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedQuiz(quiz);
                        setActiveTab('submissions');
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-xl transition-colors flex items-center gap-1"
                    >
                      <Filter className="w-3.5 h-3.5" /> Submissions & Qualify
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditQuizClick(quiz);
                        }}
                        className="p-2 text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                        title="Edit Quiz Event"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteQuiz(quiz.id);
                        }}
                        className="p-2 text-slate-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                        title="Delete Quiz Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 2: SUBMISSIONS & NEXT ROUND QUALIFIER FILTER */}
      {activeTab === 'submissions' && (
        <section className="space-y-6">
          {!selectedQuiz ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl space-y-3">
              <Filter className="w-10 h-10 mx-auto text-slate-400" />
              <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">Please select a Quiz Event above to view submissions and filter top performers for Next Round.</p>
            </div>
          ) : (
            <div className="basic-card p-6 space-y-6">
              {/* Filter Top Performers Controls Bar */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60 border border-blue-200 dark:border-blue-800 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Next Round Qualifier & Elimination Filter for "{selectedQuiz.title}"
                  </h4>
                </div>

                <p className="text-xs text-slate-600 dark:text-zinc-300">
                  Select the number of top students to qualify for Next Round based on highest marks & percentage. Non-selected students will be automatically marked as <strong>ELIMINATED</strong>, disabled, and logged out.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 whitespace-nowrap">Select Top Count:</label>
                    <input
                      type="number"
                      min="1"
                      value={topCount}
                      onChange={(e) => setTopCount(e.target.value)}
                      className="w-24 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl p-2 text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 whitespace-nowrap">Target Next Round Quiz:</label>
                    <select
                      value={nextRoundQuizId}
                      onChange={(e) => setNextRoundQuizId(e.target.value)}
                      className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl p-2 text-xs font-bold text-slate-900 dark:text-white w-full"
                    >
                      <option value="">-- Select Next Round Quiz Event --</option>
                      {quizzes.filter((q) => q.id !== selectedQuiz.id).map((q) => (
                        <option key={q.id} value={q.id}>{q.title}</option>
                      ))}
                    </select>
                  </div>

                  <Button
                    variant="primary"
                    icon={Filter}
                    onClick={handleQualifyTopN}
                    className="shadow-lg shadow-blue-500/20 whitespace-nowrap"
                  >
                    Qualify Top {topCount} for Next Round
                  </Button>
                </div>
              </div>

              {/* Submissions & Rankings Table */}
              <div className="space-y-3">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  Attending & Submitted Participants ({submissions.length})
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                        <th className="py-3 px-4">Rank</th>
                        <th className="py-3 px-4">Participant Name</th>
                        <th className="py-3 px-4">Email / Phone</th>
                        <th className="py-3 px-4">Submission Status</th>
                        <th className="py-3 px-4">Score & Total</th>
                        <th className="py-3 px-4">Percentage</th>
                        <th className="py-3 px-4">Correct / Total Qs</th>
                        <th className="py-3 px-4">Qualification Status</th>
                        <th className="py-3 px-4 text-right">Manual Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                      {submissions.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-500 dark:text-zinc-400">
                            No student submissions found for this quiz event yet.
                          </td>
                        </tr>
                      ) : (
                        // Sort by score DESC
                        [...submissions].sort((a, b) => b.score - a.score).map((sub, rankIdx) => {
                          const isQualified = sub.qualificationStatus === 'QUALIFIED';
                          const isEliminated = sub.qualificationStatus === 'ELIMINATED';

                          return (
                            <tr key={sub.attemptId} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">#{rankIdx + 1}</td>
                              <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{sub.participantName}</td>
                              <td className="py-3.5 px-4 text-slate-500 dark:text-zinc-400">{sub.participantEmail}</td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                  sub.status === 'SUBMITTED' || sub.status === 'submitted'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                }`}>
                                  {sub.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">{sub.score} / {sub.totalMarks}</td>
                              <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{sub.percentage}%</td>
                              <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-zinc-300">{sub.correctCount} / {sub.totalQuestions} Qs</td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 w-fit border ${
                                  isQualified
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                                    : isEliminated
                                    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
                                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400'
                                }`}>
                                  {isQualified && <Star className="w-3 h-3 text-emerald-500 fill-emerald-500" />}
                                  {isEliminated && <XCircle className="w-3 h-3 text-red-500" />}
                                  <span>{sub.qualificationStatus}</span>
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => handleToggleQualification(sub.participantId, sub.qualificationStatus)}
                                  className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                                    isQualified
                                      ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/60 dark:hover:bg-red-900 dark:text-red-300'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 dark:text-emerald-300'
                                  }`}
                                >
                                  {isQualified ? 'Eliminate Student' : 'Qualify Student'}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: QUESTION MANAGEMENT (INSIDE SELECTED QUIZ ONLY) */}
      {activeTab === 'questions' && (
        <section className="space-y-6">
          {!selectedQuiz ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl space-y-3">
              <HelpCircle className="w-10 h-10 mx-auto text-slate-400" />
              <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">Please select a Quiz Event above to view and create questions inside it.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Questions for "{selectedQuiz.title}" ({questions.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Create questions strictly inside this selected quiz event or import from files (PDF/DOC/CSV/JSON).
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    icon={Upload}
                    onClick={() => {
                      setParsedQuestionsPreview([]);
                      setImportFileName('');
                      setIsImportQuestionsModalOpen(true);
                    }}
                  >
                    Import Questions (File)
                  </Button>

                  <Button
                    variant="primary"
                    icon={Plus}
                    onClick={() => {
                      setEditingQuestion(null);
                      setQuestionForm({
                        prompt: '',
                        optionA: '',
                        optionB: '',
                        optionC: '',
                        optionD: '',
                        optionsCount: 4,
                        correct_answer: 'A',
                        marks: selectedQuiz.marks_per_question || 1,
                        negative_marks: selectedQuiz.negative_marking ? (selectedQuiz.negative_marks_value || 0) : 0,
                        question_image: '',
                        explanation: '',
                        question_order: questions.length + 1
                      });
                      setIsQuestionModalOpen(true);
                    }}
                  >
                    Create Question
                  </Button>
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl space-y-3">
                  <HelpCircle className="w-10 h-10 mx-auto text-slate-400" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">No questions created inside this quiz event yet.</p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <Button variant="secondary" icon={Upload} onClick={() => setIsImportQuestionsModalOpen(true)}>Import File (PDF/DOC/CSV/JSON)</Button>
                    <Button variant="primary" icon={Plus} onClick={() => setIsQuestionModalOpen(true)}>Add First Question</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((qn, idx) => (
                    <div key={qn.id} className="basic-card p-6 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            Question {idx + 1} • {qn.marks || 1} Mark(s) {qn.negative_marks > 0 ? `(-${qn.negative_marks} neg)` : ''}
                          </span>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white leading-relaxed">{qn.prompt}</h4>
                          {qn.question_image && (
                            <img src={qn.question_image} alt="Question Diagram" className="max-h-48 rounded-xl border border-slate-200 dark:border-zinc-800 my-2" />
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditQuestionClick(qn)}
                            className="p-2 text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(qn.id)}
                            className="p-2 text-slate-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Options Display */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {['A', 'B', 'C', 'D'].slice(0, qn.options_count || (qn.optionD ? 4 : (qn.optionC ? 3 : 2))).map((optKey) => {
                          const optionVal = qn[`option${optKey}`] || qn[`option_${optKey.toLowerCase()}`];
                          const isCorrect = (qn.correct_answer || qn.correct_option || 'A').toUpperCase() === optKey;

                          return (
                            <div
                              key={optKey}
                              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                                isCorrect
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-200'
                                  : 'bg-slate-50/80 dark:bg-zinc-900/80 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300'
                              }`}
                            >
                              <span>
                                <strong className="mr-1.5 uppercase">{optKey}.</strong> {optionVal}
                              </span>

                              {isCorrect && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>

                      {qn.explanation && (
                        <p className="text-xs text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 italic">
                          <strong>Explanation:</strong> {qn.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* TAB 4: PARTICIPANT REGISTRATION & ACCESS CONTROL */}
      {activeTab === 'registrations' && (
        <section className="space-y-6">
          {!selectedQuiz ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl space-y-3">
              <Users className="w-10 h-10 mx-auto text-slate-400" />
              <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">Please select a Quiz Event above to view registered participants and grant/revoke access.</p>
            </div>
          ) : (
            <div className="basic-card p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Registrations & Access for "{selectedQuiz.title}"
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    Grant or Revoke access per student. Add from registered users or upload a file.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="secondary"
                    icon={Users}
                    onClick={() => {
                      fetchUsers();
                      setUserSearchTerm('');
                      setSelectedUserIds([]);
                      setIsSelectUsersModalOpen(true);
                    }}
                  >
                    Add from Registered Users
                  </Button>
                  <Button
                    variant="primary"
                    icon={Upload}
                    onClick={() => {
                      setParsedStudentsPreview([]);
                      setImportStudentFileName('');
                      setIsImportStudentsModalOpen(true);
                    }}
                  >
                    Upload File (PDF/CSV/JSON)
                  </Button>
                </div>
              </div>

              {/* Registrations Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-3 px-4">Participant Name</th>
                      <th className="py-3 px-4">Email / ID</th>
                      <th className="py-3 px-4">Registered Quiz</th>
                      <th className="py-3 px-4">Registration Status</th>
                      <th className="py-3 px-4">Quiz Access</th>
                      <th className="py-3 px-4 text-right">Access Control Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                    {registrations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-zinc-400 space-y-3">
                          <p>No registered participants found for this quiz event yet.</p>
                          <Button
                            variant="secondary"
                            icon={Upload}
                            onClick={() => {
                              setParsedStudentsPreview([]);
                              setImportStudentFileName('');
                              setIsImportStudentsModalOpen(true);
                            }}
                          >
                            Upload Student Access File
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      registrations.map((reg) => {
                        const isGranted = reg.access_status === 'Granted';

                        return (
                          <tr key={reg.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{reg.participantName}</td>
                            <td className="py-3.5 px-4 text-slate-500 dark:text-zinc-400">{reg.participantEmail}</td>
                            <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-zinc-300">{selectedQuiz.title}</td>
                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
                                {reg.registration_status || 'Approved'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                                isGranted 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300' 
                                  : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
                              }`}>
                                {reg.access_status || 'Granted'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleToggleAccess(reg.participant_id, reg.access_status)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  isGranted
                                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/60 dark:hover:bg-red-900 dark:text-red-300'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 dark:text-emerald-300'
                                }`}
                              >
                                {isGranted ? 'Revoke Access' : 'Grant Access'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 5: ALL RESULTS OVERVIEW */}
      {activeTab === 'results' && (
        <section className="basic-card p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Participant Quiz Attempt Results</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Real-time attempt scores, percentage, status, and security violation counts.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4">Quiz Event</th>
                  <th className="py-3 px-4">Attempt #</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Percentage</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Violations</th>
                  <th className="py-3 px-4 text-right">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-zinc-400">No quiz attempts recorded yet.</td>
                  </tr>
                ) : (
                  results.map((res) => (
                    <tr key={res.attemptId} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {res.participantName}
                        <span className="block text-[10px] font-normal text-slate-500 dark:text-zinc-400">{res.participantEmail}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-zinc-300">{res.quizTitle}</td>
                      <td className="py-3.5 px-4">Attempt #{res.attemptNumber || 1}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">{res.score} / {res.totalMarks}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{res.percentage}%</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          res.status === 'SUBMITTED' || res.status === 'submitted'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
                        }`}>
                          {res.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-amber-500">{res.violationsCount || 0}</td>
                      <td className="py-3.5 px-4 text-right text-slate-500 dark:text-zinc-400">
                        {res.submittedAt ? new Date(res.submittedAt).toLocaleTimeString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 6: SECURITY VIOLATIONS AUDIT LOG */}
      {activeTab === 'violations' && (
        <section className="basic-card p-6 space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Anti-Cheating Security Audit Log</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Recorded browser-level security events (tab switches, window blur, fullscreen exits).</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4">Quiz Event</th>
                  <th className="py-3 px-4">Violation Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                {violations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-zinc-400">No security violations logged yet. Clean audit record!</td>
                  </tr>
                ) : (
                  violations.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{v.participantName}</td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-zinc-300">{v.quizTitle}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">{v.violation_type}</td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-400">{v.description || v.details}</td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-zinc-400">{new Date(v.timestamp).toLocaleTimeString()}</td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                          {v.severity || 'WARNING'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 7: RESTART TEST & RETEST REQUESTS */}
      {activeTab === 'retests' && (
        <section className="basic-card p-6 space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCcw className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Restart Test & Retest Permissions
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Directly restart test attempts for participants or manage submitted retest requests after technical lockouts.
            </p>
          </div>

          {/* Instant Restart Test Action Card */}
          <div className="p-4 sm:p-6 rounded-2xl bg-blue-50/60 dark:bg-zinc-900/90 border border-blue-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Instant Restart Test for Participant</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Enter a participant's Email or User ID and choose the target quiz event to immediately grant permission to retake the test.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block mb-1">Target Quiz Event</label>
                <select
                  value={selectedQuiz?.id || ''}
                  onChange={(e) => {
                    const q = quizzes.find((x) => String(x.id) === String(e.target.value));
                    if (q) setSelectedQuiz(q);
                  }}
                  className="w-full bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  {quizzes.map((q) => (
                    <option key={q.id} value={q.id}>{q.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block mb-1">Participant ID / Email / Phone</label>
                <Input
                  placeholder="e.g. student@eloquence.com or user-demo-1"
                  value={restartParticipantId}
                  onChange={(e) => setRestartParticipantId(e.target.value)}
                />
              </div>

              <div>
                <Button
                  variant="primary"
                  className="w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!restartParticipantId || !selectedQuiz}
                  onClick={() => handleDirectRestartTest(restartParticipantId, selectedQuiz?.id)}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> RESTART TEST
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Participant Retest Requests & Audit Log</h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-3 px-4">Participant Name</th>
                  <th className="py-3 px-4">Quiz Title</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Violations</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                {retestRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-zinc-400">No retest requests pending or logged.</td>
                  </tr>
                ) : (
                  retestRequests.map((ret) => (
                    <tr key={ret.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {ret.userName}
                        <span className="block text-[10px] font-normal text-slate-500 dark:text-zinc-400">{ret.userEmail}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-zinc-300">{ret.quizTitle}</td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-400 max-w-xs truncate">{ret.reason}</td>
                      <td className="py-3.5 px-4 font-bold text-amber-500">{ret.violationsCount || 0}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                          ret.status === 'granted' || ret.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                            : ret.status === 'denied' || ret.status === 'rejected'
                            ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {ret.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {ret.status === 'pending' || ret.status === 'denied' ? (
                          <button
                            onClick={() => handleRetestAction(ret.id, ret.quiz_id, 'grant')}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer"
                          >
                            Grant Retest
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRetestAction(ret.id, ret.quiz_id, 'deny')}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all cursor-pointer"
                          >
                            Deny Retest
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* MODAL 1: CREATE / EDIT QUIZ EVENT */}
      {isQuizModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingQuiz ? 'Edit Quiz Event' : 'Create Quiz Event'}
              </h3>
              <button onClick={() => setIsQuizModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleQuizSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Quiz Event Name *</label>
                  <Input
                    required
                    placeholder="e.g. Technical Symposium Quiz 2026"
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Category</label>
                  <Input
                    placeholder="e.g. General Technology & AI"
                    value={quizForm.category}
                    onChange={(e) => setQuizForm({ ...quizForm, category: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Quiz description and topics covered..."
                  value={quizForm.description}
                  onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Timing Schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={quizForm.start_date_time}
                    onChange={(e) => setQuizForm({ ...quizForm, start_date_time: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={quizForm.end_date_time}
                    onChange={(e) => setQuizForm({ ...quizForm, end_date_time: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Duration (Mins) *</label>
                  <Input
                    type="number"
                    required
                    value={quizForm.duration}
                    onChange={(e) => setQuizForm({ ...quizForm, duration: parseInt(e.target.value, 10) || 30 })}
                  />
                </div>
              </div>

              {/* Marks & Negative Marks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Marks per Question</label>
                  <Input
                    type="number"
                    value={quizForm.marks_per_question}
                    onChange={(e) => setQuizForm({ ...quizForm, marks_per_question: parseFloat(e.target.value) || 1 })}
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="neg_chk"
                    checked={quizForm.negative_marking}
                    onChange={(e) => setQuizForm({ ...quizForm, negative_marking: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <label htmlFor="neg_chk" className="font-bold text-slate-700 dark:text-zinc-300">Enable Negative Marking</label>
                </div>

                {quizForm.negative_marking && (
                  <div>
                    <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Negative Marks Value</label>
                    <Input
                      type="number"
                      value={quizForm.negative_marks_value}
                      onChange={(e) => setQuizForm({ ...quizForm, negative_marks_value: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Instructions for Participants</label>
                <textarea
                  rows={3}
                  value={quizForm.instructions}
                  onChange={(e) => setQuizForm({ ...quizForm, instructions: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Result Visibility Settings */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-2">
                <span className="font-bold text-slate-900 dark:text-white block mb-2">Participant Result Visibility Settings</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={quizForm.show_score}
                      onChange={(e) => setQuizForm({ ...quizForm, show_score: e.target.checked })}
                    /> Show Score
                  </label>
                  <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={quizForm.show_correct_answers}
                      onChange={(e) => setQuizForm({ ...quizForm, show_correct_answers: e.target.checked })}
                    /> Show Correct Answers
                  </label>
                  <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      checked={quizForm.allow_retest}
                      onChange={(e) => setQuizForm({ ...quizForm, allow_retest: e.target.checked })}
                    /> Support Retest Permission
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsQuizModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" className="flex-1">Save Quiz Event</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE / EDIT QUESTION (INSIDE SELECTED QUIZ) */}
      {isQuestionModalOpen && selectedQuiz && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingQuestion ? 'Edit Question' : 'Create Question'}
                </h3>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Inside Quiz: {selectedQuiz.title}</span>
              </div>
              <button onClick={() => setIsQuestionModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleQuestionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Question Prompt *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter the question prompt statement..."
                  value={questionForm.prompt}
                  onChange={(e) => setQuestionForm({ ...questionForm, prompt: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Number of MCQ Options Selector */}
              <div className="flex items-center gap-4">
                <label className="font-bold text-slate-700 dark:text-zinc-300">Number of MCQ Options:</label>
                {[2, 3, 4].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionForm({ ...questionForm, optionsCount: cnt })}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      questionForm.optionsCount === cnt
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-800'
                    }`}
                  >
                    {cnt} Options
                  </button>
                ))}
              </div>

              {/* Options Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Option A *</label>
                  <Input
                    required
                    value={questionForm.optionA}
                    onChange={(e) => setQuestionForm({ ...questionForm, optionA: e.target.value })}
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Option B *</label>
                  <Input
                    required
                    value={questionForm.optionB}
                    onChange={(e) => setQuestionForm({ ...questionForm, optionB: e.target.value })}
                  />
                </div>

                {questionForm.optionsCount >= 3 && (
                  <div>
                    <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Option C *</label>
                    <Input
                      required={questionForm.optionsCount >= 3}
                      value={questionForm.optionC}
                      onChange={(e) => setQuestionForm({ ...questionForm, optionC: e.target.value })}
                    />
                  </div>
                )}

                {questionForm.optionsCount >= 4 && (
                  <div>
                    <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Option D *</label>
                    <Input
                      required={questionForm.optionsCount >= 4}
                      value={questionForm.optionD}
                      onChange={(e) => setQuestionForm({ ...questionForm, optionD: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Correct Answer & Marks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Correct Option *</label>
                  <select
                    value={questionForm.correct_answer}
                    onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {['A', 'B', 'C', 'D'].slice(0, questionForm.optionsCount).map((opt) => (
                      <option key={opt} value={opt}>Option {opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Marks for Question</label>
                  <Input
                    type="number"
                    value={questionForm.marks}
                    onChange={(e) => setQuestionForm({ ...questionForm, marks: parseFloat(e.target.value) || 1 })}
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Question Image URL (Optional)</label>
                  <Input
                    placeholder="https://..."
                    value={questionForm.question_image}
                    onChange={(e) => setQuestionForm({ ...questionForm, question_image: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Question Explanation (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Explanation shown after quiz evaluation if configured..."
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsQuestionModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" className="flex-1">Save Question</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: IMPORT QUESTIONS FILE */}
      {isImportQuestionsModalOpen && selectedQuiz && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Import Questions into Quiz
                </h3>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Target Event: {selectedQuiz.title}</span>
              </div>
              <button onClick={() => setIsImportQuestionsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600 dark:text-zinc-300">
                Upload your question file in <strong>PDF, DOC/DOCX, CSV, TXT, or JSON</strong> format. Our parser will automatically extract question prompts, options (A, B, C, D), correct options, and marks.
              </p>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 dark:border-zinc-800 rounded-2xl p-6 text-center hover:border-blue-500 transition-colors bg-slate-50/50 dark:bg-zinc-900/50 relative">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.csv,.txt,.json"
                  onChange={handleQuestionFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="space-y-2 pointer-events-none">
                  <UploadCloud className="w-10 h-10 mx-auto text-blue-600 dark:text-blue-400" />
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {importFileName ? `Selected: ${importFileName}` : 'Click or Drag file to Upload Questions'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Supports .pdf, .docx, .doc, .csv, .txt, .json
                  </p>
                </div>
              </div>

              {isParsingQuestions && (
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center gap-2 font-semibold">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Parsing file questions... Please wait.
                </div>
              )}

              {/* Questions Preview List */}
              {parsedQuestionsPreview.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Parsed Questions Preview ({parsedQuestionsPreview.length} items found)
                    </h4>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Ready to Import</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                    {parsedQuestionsPreview.map((q, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-2 text-xs">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">Q{idx + 1}. {q.prompt}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 shrink-0">
                            Correct: {q.correct_answer}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-zinc-400">
                          <div>A: {q.optionA}</div>
                          <div>B: {q.optionB}</div>
                          {q.optionC && <div>C: {q.optionC}</div>}
                          {q.optionD && <div>D: {q.optionD}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsImportQuestionsModalOpen(false)}>Cancel</Button>
                <Button
                  type="button"
                  variant="primary"
                  className="flex-1"
                  disabled={parsedQuestionsPreview.length === 0 || loading}
                  onClick={handleConfirmImportQuestions}
                >
                  {loading ? 'Importing...' : `Confirm & Import ${parsedQuestionsPreview.length} Question(s)`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: UPLOAD STUDENT ACCESS FILE */}
      {isImportStudentsModalOpen && selectedQuiz && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Upload Student Access File
                </h3>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Target Event: {selectedQuiz.title}</span>
              </div>
              <button onClick={() => setIsImportStudentsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600 dark:text-zinc-300">
                Upload a student list in <strong>PDF, DOC/DOCX, CSV, TXT, or JSON</strong> format. Uploaded students will be automatically registered and granted access to attempt <strong>"{selectedQuiz.title}"</strong> without requiring manual registration.
              </p>

              {/* Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-300 dark:border-zinc-800 rounded-2xl p-6 text-center hover:border-blue-500 transition-colors bg-slate-50/50 dark:bg-zinc-900/50 relative">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.csv,.txt,.json"
                  onChange={handleStudentFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="space-y-2 pointer-events-none">
                  <UploadCloud className="w-10 h-10 mx-auto text-blue-600 dark:text-blue-400" />
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {importStudentFileName ? `Selected: ${importStudentFileName}` : 'Click or Drag file to Upload Student List'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Supports .pdf, .docx, .doc, .csv, .txt, .json
                  </p>
                </div>
              </div>

              {isParsingStudents && (
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center gap-2 font-semibold">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Parsing student file... Please wait.
                </div>
              )}

              {/* Students Preview List */}
              {parsedStudentsPreview.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Extracted Students ({parsedStudentsPreview.length} records found)
                    </h4>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Ready to Grant Access</span>
                  </div>

                  <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-200 dark:border-zinc-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider bg-slate-50 dark:bg-zinc-900">
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Phone</th>
                          <th className="py-2.5 px-3">Email</th>
                          <th className="py-2.5 px-3 text-right">Access Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                        {parsedStudentsPreview.map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50">
                            <td className="py-2.5 px-3 font-bold text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{s.name}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-400">{s.phone}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-400">{s.email}</td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                Granted
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsImportStudentsModalOpen(false)}>Cancel</Button>
                <Button
                  type="button"
                  variant="primary"
                  className="flex-1"
                  disabled={parsedStudentsPreview.length === 0 || loading}
                  onClick={handleConfirmImportStudents}
                >
                  {loading ? 'Processing...' : `Confirm & Grant Access to ${parsedStudentsPreview.length} Student(s)`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* SELECT FROM REGISTERED USERS MODAL */}
      {isSelectUsersModalOpen && selectedQuiz && (() => {
        const alreadyGranted = new Set(registrations.map((r) => String(r.participant_id)));
        const filteredRegUsers = (registeredUsers || []).filter((u) => {
          if (u.role === 'admin') return false;
          const term = userSearchTerm.toLowerCase();
          return (
            !term ||
            (u.name && u.name.toLowerCase().includes(term)) ||
            (u.email && u.email.toLowerCase().includes(term)) ||
            (u.phone && u.phone.includes(term))
          );
        });
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl p-6 sm:p-8 space-y-6 shadow-2xl my-8 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4 shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Add Registered Users to Quiz Access
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Select student(s) from the database to grant access to <strong>"{selectedQuiz.title}"</strong>
                  </p>
                </div>
                <button
                  onClick={() => { setIsSelectUsersModalOpen(false); setSelectedUserIds([]); setUserSearchTerm(''); }}
                  className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Search + Select All Row */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email or phone..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => {
                    const notYetGranted = filteredRegUsers.filter((u) => !alreadyGranted.has(String(u.id)));
                    if (selectedUserIds.length === notYetGranted.length) {
                      setSelectedUserIds([]);
                    } else {
                      setSelectedUserIds(notYetGranted.map((u) => u.id));
                    }
                  }}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 whitespace-nowrap cursor-pointer"
                >
                  {selectedUserIds.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Users List */}
              <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 dark:border-zinc-800 min-h-0">
                {filteredRegUsers.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 dark:text-zinc-400 text-sm">
                    No registered students found.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider bg-slate-50 dark:bg-zinc-900 sticky top-0">
                        <th className="py-2.5 px-3 w-10">✓</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3">Email</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                      {filteredRegUsers.map((u) => {
                        const alreadyHas = alreadyGranted.has(String(u.id));
                        const isChecked = selectedUserIds.includes(u.id);
                        return (
                          <tr
                            key={u.id}
                            onClick={() => {
                              if (alreadyHas) return;
                              setSelectedUserIds((prev) =>
                                prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                              );
                            }}
                            className={`transition-colors ${alreadyHas ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/20'} ${isChecked ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}
                          >
                            <td className="py-2.5 px-3">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isChecked ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-zinc-600'}`}>
                                {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{u.name}</td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-zinc-400">{u.phone || '—'}</td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-zinc-500 text-[11px]">{u.email || '—'}</td>
                            <td className="py-2.5 px-3 text-right">
                              {alreadyHas ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                  Already Granted
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                                  {u.status || 'Active'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-zinc-800 shrink-0">
                <span className="text-xs text-slate-500 dark:text-zinc-400 font-semibold">
                  {selectedUserIds.length > 0 ? `${selectedUserIds.length} student(s) selected` : 'No students selected yet'}
                </span>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="secondary" onClick={() => { setIsSelectUsersModalOpen(false); setSelectedUserIds([]); setUserSearchTerm(''); }}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    icon={UserCheck}
                    disabled={selectedUserIds.length === 0 || isGrantingSelected}
                    onClick={handleGrantSelectedUsers}
                  >
                    {isGrantingSelected ? 'Granting...' : `Grant Access to ${selectedUserIds.length} Student(s)`}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
