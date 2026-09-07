import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Plus, 
  Settings, 
  Clock, 
  Calendar, 
  Award, 
  Users, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Edit3, 
  Trash2, 
  Filter, 
  Sparkles, 
  PlayCircle,
  HelpCircle,
  UploadCloud,
  RefreshCw,
  BookOpen,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { API_ADMIN_URL } from '../config/apiConfig';
import { useToast } from '../context/ToastContext';
import { parseUserFile } from '../utils/fileParser';
import { useNavigate } from 'react-router-dom';

export const EventRoundsPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Main Events & Quizzes Data
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('evt_eloquence_2026');
  const [eventsList, setEventsList] = useState([
    { id: 'evt_eloquence_2026', name: 'Eloquence 2K26 Technical Symposium', description: 'Annual National Level Technical Symposium' },
    { id: 'evt_code_sprint_2026', name: 'Code Sprint & AI Hackathon 2026', description: 'Speed Coding & System Design Competition' },
    { id: 'evt_aptitude_challenge', name: 'Aptitude & Logical Reasoning Cup', description: 'College-wide General Knowledge & Aptitude Tournament' }
  ]);

  // Round Creation & Edit State
  const [isRoundModalOpen, setIsRoundModalOpen] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [roundForm, setRoundForm] = useState({
    title: '',
    category: 'Round 1: Screening Test',
    description: '',
    event_id: 'evt_eloquence_2026',
    start_date_time: new Date().toISOString().slice(0, 16),
    end_date_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    duration: 30,
    total_questions: 30,
    marks_per_question: 1,
    negative_marking: false,
    negative_marks_value: 0,
    status: 'Published',
    instructions: '1. Keep browser fullscreen.\n2. Do not switch tabs or windows.\n3. Submit before timer ends.'
  });

  // Participant Upload Modal per Round
  const [isUploadStudentsModalOpen, setIsUploadStudentsModalOpen] = useState(false);
  const [targetRoundQuiz, setTargetRoundQuiz] = useState(null);
  const [parsedStudents, setParsedStudents] = useState([]);
  const [uploadFileName, setUploadFileName] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  // View Enrolled Students Modal
  const [isViewStudentsModalOpen, setIsViewStudentsModalOpen] = useState(false);
  const [roundRegistrations, setRoundRegistrations] = useState([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  // New Event Modal
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');

  // 1. Fetch All Quizzes / Rounds from DB
  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_ADMIN_URL}/quizzes`);
      if (res.ok) {
        const data = await res.json();
        const all = data.quizzes || [];
        setQuizzes(all);

        // Dynamically extract unique events
        const uniqueEventsMap = new Map();
        eventsList.forEach((e) => uniqueEventsMap.set(e.id, e));
        all.forEach((q) => {
          if (q.event_id && !uniqueEventsMap.has(q.event_id)) {
            uniqueEventsMap.set(q.event_id, {
              id: q.event_id,
              name: q.event_id.replace(/^evt_/, '').replace(/_/g, ' ').toUpperCase(),
              description: 'Custom Symposium Event'
            });
          }
        });
        setEventsList(Array.from(uniqueEventsMap.values()));
      }
    } catch (err) {
      console.error('Fetch quizzes error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  // Filter quizzes by selected event
  const eventRounds = quizzes.filter((q) => (q.event_id || 'evt_eloquence_2026') === selectedEventId);

  // Handle Save / Edit Round
  const handleSaveRound = async (e) => {
    e.preventDefault();
    try {
      const url = editingRound ? `${API_ADMIN_URL}/quizzes/${editingRound.id}` : `${API_ADMIN_URL}/quizzes`;
      const method = editingRound ? 'PUT' : 'POST';

      const payload = {
        ...roundForm,
        event_id: selectedEventId
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingRound ? 'Round updated successfully!' : 'New Event Round created successfully!');
        setIsRoundModalOpen(false);
        setEditingRound(null);
        fetchQuizzes();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save event round');
      }
    } catch (err) {
      console.error('Save round error:', err);
      toast.error('Network error saving round');
    }
  };

  // Delete Round
  const handleDeleteRound = async (roundId) => {
    if (!window.confirm('Are you sure you want to delete this event round?')) return;
    try {
      const res = await fetch(`${API_ADMIN_URL}/quizzes/${roundId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.info('Event round deleted.');
        fetchQuizzes();
      }
    } catch (err) {
      console.error('Delete round error:', err);
    }
  };

  // Student Access Upload Handler for Round
  const handleStudentFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFileName(file.name);
    setIsParsing(true);
    try {
      const studentsExtracted = await parseUserFile(file);
      if (Array.isArray(studentsExtracted) && studentsExtracted.length > 0) {
        setParsedStudents(studentsExtracted);
        toast.success(`Parsed ${studentsExtracted.length} student(s) from ${file.name}`);
      } else {
        toast.error('No valid students found in file.');
        setParsedStudents([]);
      }
    } catch (err) {
      console.error('Parse student file error:', err);
      toast.error(err.message || 'Failed to parse student file.');
    } finally {
      setIsParsing(false);
    }
  };

  // Confirm Bulk Student Access for Specific Round
  const handleConfirmGrantAccessToRound = async () => {
    if (!targetRoundQuiz) return;
    if (!parsedStudents.length) {
      toast.error('No parsed student records to import.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_ADMIN_URL}/quizzes/${targetRoundQuiz.id}/upload-participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: parsedStudents })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Granted access to ${data.count || parsedStudents.length} student(s) for "${targetRoundQuiz.title}"!`);
        setIsUploadStudentsModalOpen(false);
        setParsedStudents([]);
        setUploadFileName('');
        fetchQuizzes();
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Failed to grant student access.');
      }
    } catch (err) {
      console.error('Import students error:', err);
      toast.error('Network error during student access grant.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Registrations for a Round
  const handleOpenViewStudents = async (quiz) => {
    setTargetRoundQuiz(quiz);
    setIsViewStudentsModalOpen(true);
    setLoadingRegistrations(true);
    try {
      const res = await fetch(`${API_ADMIN_URL}/quizzes/${quiz.id}/registrations`);
      if (res.ok) {
        const data = await res.json();
        setRoundRegistrations(data.registrations || []);
      }
    } catch (err) {
      console.error('Fetch round registrations error:', err);
    } finally {
      setLoadingRegistrations(false);
    }
  };

  // Toggle Access Direct
  const handleToggleAccess = async (participantId, currentAccess) => {
    if (!targetRoundQuiz) return;
    const newStatus = currentAccess === 'Granted' ? 'Revoked' : 'Granted';
    try {
      const res = await fetch(`${API_ADMIN_URL}/quizzes/${targetRoundQuiz.id}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, accessStatus: newStatus })
      });

      if (res.ok) {
        // Refresh modal list
        const refreshed = roundRegistrations.map((r) => 
          String(r.participant_id) === String(participantId) ? { ...r, access_status: newStatus } : r
        );
        setRoundRegistrations(refreshed);
        toast.info(`Access ${newStatus.toLowerCase()} for student.`);
      }
    } catch (err) {
      console.error('Toggle access error:', err);
    }
  };

  // Create New Event
  const handleCreateNewEvent = (e) => {
    e.preventDefault();
    if (!newEventName.trim()) return;
    const newId = `evt_${newEventName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;
    const newEvt = {
      id: newId,
      name: newEventName,
      description: newEventDesc || 'Custom Symposium Event'
    };
    setEventsList([...eventsList, newEvt]);
    setSelectedEventId(newId);
    setIsCreateEventModalOpen(false);
    setNewEventName('');
    setNewEventDesc('');
    toast.success(`Event "${newEventName}" created! You can now configure rounds for it.`);
  };

  const selectedEventObj = eventsList.find((e) => e.id === selectedEventId) || eventsList[0];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8">
      {/* Header Banner */}
      <section className="basic-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <Layers className="w-3.5 h-3.5" /> Event & Round Management Hub
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Event Rounds & Participant Access
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1">
              Select an Event, set sequential competition rounds (Round 1, Round 2, Round 3), and give participant access per round.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              icon={Plus}
              onClick={() => setIsCreateEventModalOpen(true)}
            >
              New Event
            </Button>

            <Button
              variant="primary"
              icon={Plus}
              onClick={() => {
                setEditingRound(null);
                setRoundForm({
                  title: `Round ${eventRounds.length + 1}: Technical Test`,
                  category: `Round ${eventRounds.length + 1}: Online Quiz`,
                  description: `Competition Round ${eventRounds.length + 1} for ${selectedEventObj?.name}`,
                  event_id: selectedEventId,
                  start_date_time: new Date().toISOString().slice(0, 16),
                  end_date_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
                  duration: 30,
                  total_questions: 30,
                  marks_per_question: 1,
                  negative_marking: false,
                  negative_marks_value: 0,
                  status: 'Published',
                  instructions: '1. Keep browser in fullscreen mode throughout the test.\n2. Do not switch tabs or windows.\n3. Submit before timer expires.'
                });
                setIsRoundModalOpen(true);
              }}
            >
              Add New Round
            </Button>
          </div>
        </div>

        {/* Event Selector Dropdown Bar */}
        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">Active Selected Event</span>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedEventObj?.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400">{selectedEventObj?.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 whitespace-nowrap">Switch Event:</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white w-full sm:w-72"
            >
              {eventsList.map((evt) => (
                <option key={evt.id} value={evt.id}>{evt.name}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Rounds Workflow Timeline & Grid */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Rounds for "{selectedEventObj?.name}" ({eventRounds.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Participants will only see and access the specific round for which you grant them access.
            </p>
          </div>
        </div>

        {eventRounds.length === 0 ? (
          <div className="p-16 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl space-y-4 bg-white/50 dark:bg-zinc-950/50">
            <Layers className="w-12 h-12 mx-auto text-slate-400" />
            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">No Rounds Set for This Event</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
                Create Round 1 (e.g. Online Screening Quiz) to begin setting up the competition rounds for {selectedEventObj?.name}.
              </p>
            </div>
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => {
                setEditingRound(null);
                setRoundForm({
                  title: 'Round 1: Online Screening Quiz',
                  category: 'Round 1: Screening Test',
                  description: `Preliminary Round for ${selectedEventObj?.name}`,
                  event_id: selectedEventId,
                  start_date_time: new Date().toISOString().slice(0, 16),
                  end_date_time: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
                  duration: 30,
                  total_questions: 30,
                  marks_per_question: 1,
                  negative_marking: false,
                  negative_marks_value: 0,
                  status: 'Published',
                  instructions: '1. Keep fullscreen mode.\n2. Do not switch tabs.'
                });
                setIsRoundModalOpen(true);
              }}
            >
              Create Round 1
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eventRounds.map((round, idx) => {
              const startDate = new Date(round.start_date_time);
              const endDate = new Date(round.end_date_time);

              return (
                <div
                  key={round.id}
                  className="basic-card p-6 space-y-5 flex flex-col justify-between border hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm"
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Round {idx + 1}
                      </span>

                      <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                        {round.status || 'Published'}
                      </span>
                    </div>

                    <h4 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">{round.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2">
                      {round.description || 'Competition event round'}
                    </p>

                    {/* Schedule & Metadata Card */}
                    <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-xs space-y-2">
                      <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                        <span>Scheduled Start:</span>
                        <strong className="text-slate-900 dark:text-white">
                          {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({startDate.toLocaleDateString()})
                        </strong>
                      </div>
                      <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                        <span>Duration:</span>
                        <strong className="text-slate-900 dark:text-white">{round.duration} Minutes</strong>
                      </div>
                      <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                        <span>Questions & Marks:</span>
                        <strong className="text-slate-900 dark:text-white">
                          {(round.questions || []).length} Qs ({round.marks_per_question || 1} mark/qn)
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Access Buttons */}
                  <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        icon={Upload}
                        className="flex-1 text-xs"
                        onClick={() => {
                          setTargetRoundQuiz(round);
                          setParsedStudents([]);
                          setUploadFileName('');
                          setIsUploadStudentsModalOpen(true);
                        }}
                      >
                        Upload Access File
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Users}
                        className="text-xs"
                        onClick={() => handleOpenViewStudents(round)}
                        title="View & Manage Participants"
                      >
                        Access
                      </Button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => navigate('/admin/next-round-filter')}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Filter className="w-3 h-3" /> Qualify Top N
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingRound(round);
                            setRoundForm({
                              title: round.title || '',
                              category: round.category || `Round ${idx + 1}`,
                              description: round.description || '',
                              event_id: round.event_id || selectedEventId,
                              start_date_time: round.start_date_time ? new Date(round.start_date_time).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
                              end_date_time: round.end_date_time ? new Date(round.end_date_time).toISOString().slice(0, 16) : new Date(Date.now() + 86400000).toISOString().slice(0, 16),
                              duration: round.duration || 30,
                              total_questions: round.total_questions || 30,
                              marks_per_question: round.marks_per_question || 1,
                              negative_marking: Boolean(round.negative_marking),
                              negative_marks_value: round.negative_marks_value || 0,
                              status: round.status || 'Published',
                              instructions: round.instructions || ''
                            });
                            setIsRoundModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
                          title="Edit Round"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteRound(round.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
                          title="Delete Round"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* MODAL 1: CREATE / EDIT ROUND */}
      {isRoundModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {editingRound ? 'Edit Event Round' : 'Set New Competition Round'}
                </h3>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Event: {selectedEventObj?.name}</span>
              </div>
              <button onClick={() => setIsRoundModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveRound} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Round Name *</label>
                  <Input
                    required
                    placeholder="e.g. Round 1: Online Screening Test"
                    value={roundForm.title}
                    onChange={(e) => setRoundForm({ ...roundForm, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Round Category / Level</label>
                  <Input
                    placeholder="e.g. Preliminary Screening / Finals"
                    value={roundForm.category}
                    onChange={(e) => setRoundForm({ ...roundForm, category: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Round rules, topics, or eligibility description..."
                  value={roundForm.description}
                  onChange={(e) => setRoundForm({ ...roundForm, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Scheduled Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={roundForm.start_date_time}
                    onChange={(e) => setRoundForm({ ...roundForm, start_date_time: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Scheduled End Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={roundForm.end_date_time}
                    onChange={(e) => setRoundForm({ ...roundForm, end_date_time: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Duration (Minutes) *</label>
                  <Input
                    type="number"
                    required
                    value={roundForm.duration}
                    onChange={(e) => setRoundForm({ ...roundForm, duration: parseInt(e.target.value, 10) || 30 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Marks per Question</label>
                  <Input
                    type="number"
                    value={roundForm.marks_per_question}
                    onChange={(e) => setRoundForm({ ...roundForm, marks_per_question: parseFloat(e.target.value) || 1 })}
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Status</label>
                  <select
                    value={roundForm.status}
                    onChange={(e) => setRoundForm({ ...roundForm, status: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                    <option value="Scheduled">Scheduled</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsRoundModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" className="flex-1">Save Event Round</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPLOAD STUDENT ACCESS FILE FOR ROUND */}
      {isUploadStudentsModalOpen && targetRoundQuiz && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Give Participant Access to Round
                </h3>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Target Round: {targetRoundQuiz.title}</span>
              </div>
              <button onClick={() => setIsUploadStudentsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600 dark:text-zinc-300">
                Upload student list in <strong>PDF, DOC/DOCX, CSV, TXT, or JSON</strong> format. Uploaded students will be authorized <strong>ONLY for this round ({targetRoundQuiz.title})</strong>.
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
                    {uploadFileName ? `Selected: ${uploadFileName}` : 'Click or Drag file to Upload Student List'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Supports .pdf, .docx, .doc, .csv, .txt, .json
                  </p>
                </div>
              </div>

              {isParsing && (
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center gap-2 font-semibold">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Parsing student document... Please wait.
                </div>
              )}

              {/* Preview Table */}
              {parsedStudents.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Extracted Students ({parsedStudents.length} records)
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
                          <th className="py-2.5 px-3 text-right">Round Access</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                        {parsedStudents.map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50">
                            <td className="py-2 px-3 font-bold text-slate-500">{idx + 1}</td>
                            <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{s.name}</td>
                            <td className="py-2 px-3 text-slate-600 dark:text-zinc-400">{s.phone}</td>
                            <td className="py-2 px-3 text-slate-600 dark:text-zinc-400">{s.email}</td>
                            <td className="py-2 px-3 text-right">
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
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsUploadStudentsModalOpen(false)}>Cancel</Button>
                <Button
                  type="button"
                  variant="primary"
                  className="flex-1"
                  disabled={parsedStudents.length === 0 || loading}
                  onClick={handleConfirmGrantAccessToRound}
                >
                  {loading ? 'Processing...' : `Confirm & Grant Access to ${parsedStudents.length} Student(s)`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW & MANAGE ENROLLED PARTICIPANTS FOR ROUND */}
      {isViewStudentsModalOpen && targetRoundQuiz && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Authorized Participants
                </h3>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Round: {targetRoundQuiz.title}</span>
              </div>
              <button onClick={() => setIsViewStudentsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              {loadingRegistrations ? (
                <div className="p-8 text-center text-slate-500 dark:text-zinc-400">Loading round participants...</div>
              ) : roundRegistrations.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-zinc-400 space-y-2">
                  <p>No participants have been given access to this round yet.</p>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={Upload}
                    onClick={() => {
                      setIsViewStudentsModalOpen(false);
                      setIsUploadStudentsModalOpen(true);
                    }}
                  >
                    Upload Students File
                  </Button>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 dark:border-zinc-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-zinc-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider bg-slate-50 dark:bg-zinc-900">
                        <th className="py-2.5 px-3">Participant Name</th>
                        <th className="py-2.5 px-3">Email / ID</th>
                        <th className="py-2.5 px-3">Access Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                      {roundRegistrations.map((reg) => {
                        const isGranted = reg.access_status === 'Granted';
                        return (
                          <tr key={reg.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-900/50">
                            <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{reg.participantName}</td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-zinc-400">{reg.participantEmail}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                isGranted 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300' 
                                  : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
                              }`}>
                                {reg.access_status || 'Granted'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleToggleAccess(reg.participant_id, reg.access_status)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                                  isGranted
                                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/60 dark:text-red-300'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                                }`}
                              >
                                {isGranted ? 'Revoke' : 'Grant'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-zinc-800">
                <Button type="button" variant="secondary" onClick={() => setIsViewStudentsModalOpen(false)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE NEW EVENT */}
      {isCreateEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Create New Event</h3>
              <button onClick={() => setIsCreateEventModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateNewEvent} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Event Name *</label>
                <Input
                  required
                  placeholder="e.g. National Coding Olympiad 2026"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-zinc-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Event background or details..."
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsCreateEventModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary" className="flex-1">Create Event</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
