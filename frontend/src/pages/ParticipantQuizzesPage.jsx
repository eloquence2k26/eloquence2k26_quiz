import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  PlayCircle, 
  Lock, 
  AlertCircle, 
  Calendar, 
  Sparkles, 
  Award, 
  ShieldAlert, 
  MessageSquare,
  ArrowRight,
  RefreshCw,
  Info,
  Shield,
  AlertTriangle,
  UserPlus,
  Trophy,
  XCircle
} from 'lucide-react';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { API_PARTICIPANT_URL } from '../config/apiConfig';
import { useToast } from '../context/ToastContext';

export const ParticipantQuizzesPage = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Qualification status state
  const [qualificationInfo, setQualificationInfo] = useState(null);
  const [showQualifiedModal, setShowQualifiedModal] = useState(false);
  const [showEliminatedModal, setShowEliminatedModal] = useState(false);

  // Pre-Quiz Rules Modal state
  const [selectedRulesQuiz, setSelectedRulesQuiz] = useState(null);

  // Retest Request Modal state
  const [retestModalQuiz, setRetestModalQuiz] = useState(null);
  const [retestReason, setRetestReason] = useState('');
  const [notification, setNotification] = useState('');

  const fetchQualificationStatus = async () => {
    try {
      const res = await fetch(`${API_PARTICIPANT_URL}/qualification-status`, {
        headers: { 'x-user-id': user?.id || user?.email || 'user-demo-1' }
      });
      if (res.ok) {
        const data = await res.json();
        setQualificationInfo(data);
        if (data.isEliminated) {
          setShowEliminatedModal(true);
        } else if (data.isQualified) {
          setShowQualifiedModal(true);
        }
      }
    } catch (err) {
      console.error('Fetch qualification status error:', err);
    }
  };

  const fetchParticipantQuizzes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_PARTICIPANT_URL}/quizzes`, {
        headers: { 'x-user-id': user?.id || user?.email || 'user-demo-1' }
      });
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data.quizzes || []);
      }
    } catch (err) {
      console.error('Fetch participant quizzes error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time clock tick for schedule synchronization
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchParticipantQuizzes();
    fetchQualificationStatus();
  }, [user]);

  const handleEliminatedOk = async () => {
    setShowEliminatedModal(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const handleConfirmStartQuiz = () => {
    if (!selectedRulesQuiz) return;
    const quizId = selectedRulesQuiz.id;
    setSelectedRulesQuiz(null);
    navigate(`/quiz-take/${quizId}`);
  };

  const handleRequestRetestSubmit = async (e) => {
    e.preventDefault();
    if (!retestModalQuiz) return;

    try {
      const res = await fetch(`${API_PARTICIPANT_URL}/quizzes/${retestModalQuiz.id}/request-retest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || user?.email || 'user-demo-1'
        },
        body: JSON.stringify({
          participantId: user?.id || user?.email || 'user-demo-1',
          reason: retestReason || 'Requesting retest due to technical issue / security lockout.'
        })
      });

      if (res.ok) {
        setNotification('Retest request submitted to Administrator for review.');
        setRetestModalQuiz(null);
        setRetestReason('');
        fetchParticipantQuizzes();
        setTimeout(() => setNotification(''), 3000);
      }
    } catch (err) {
      console.error('Retest request error:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8">
      {/* Student Welcome Banner */}
      <section className="basic-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <Award className="w-3.5 h-3.5" /> Participant Dashboard
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              MY AUTHORIZED QUIZZES
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1">
              Your assigned symposium event quizzes authorized by the administrator.
            </p>
          </div>

          <button
            onClick={fetchParticipantQuizzes}
            className="p-2.5 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Refresh Quizzes"
          >
            <RefreshCw className="w-4 h-4 text-slate-700 dark:text-zinc-300" />
          </button>
        </div>

        {notification && (
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-xs sm:text-sm text-blue-900 dark:text-blue-200 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{notification}</span>
          </div>
        )}
      </section>

      {/* Quizzes List */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Assigned Event Quizzes ({quizzes.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-zinc-400 text-sm font-semibold">
            Loading your assigned symposium quizzes...
          </div>
        ) : quizzes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quizzes.map((quiz) => {
              const startDate = new Date(quiz.start_date_time);
              const endDate = new Date(quiz.end_date_time);

              const isUpcoming = now < startDate;
              const isClosed = now > endDate;
              const isLive = !isUpcoming && !isClosed;

              return (
                <div key={quiz.id} className="basic-card p-6 space-y-5 transition-all flex flex-col justify-between hover:border-blue-400 dark:hover:border-blue-600">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {quiz.category || 'Event Competition'}
                      </span>

                      <span className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1 font-semibold">
                        <Clock className="w-3.5 h-3.5" /> {quiz.duration} Mins
                      </span>
                    </div>

                    <h4 className="text-xl font-bold text-slate-900 dark:text-white">{quiz.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-zinc-400">{quiz.description || 'Eloquence 2K26 Quiz Event'}</p>

                    <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                        <span>Scheduled Start:</span>
                        <strong className="text-slate-900 dark:text-white">{startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({startDate.toLocaleDateString()})</strong>
                      </div>
                      <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                        <span>Scheduled End:</span>
                        <strong className="text-slate-900 dark:text-white">{endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({endDate.toLocaleDateString()})</strong>
                      </div>
                      <div className="flex justify-between text-slate-500 dark:text-zinc-400">
                        <span>Questions & Marks:</span>
                        <strong className="text-slate-900 dark:text-white">{quiz.total_questions || quiz.questions_count} Questions ({quiz.marks_per_question || 1} mark/qn)</strong>
                      </div>
                    </div>

                    {/* Approved Retest Alert Banner */}
                    {quiz.approvedRetest && (
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 space-y-2">
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>RETEST AVAILABLE</span>
                        </div>
                        <p className="text-xs italic bg-white/60 dark:bg-black/40 p-2.5 rounded-xl border border-emerald-500/20">
                          "The administrator has granted you permission to retake this quiz."
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                    {/* Status Badges & Start Button */}
                    {isUpcoming ? (
                      <div className="w-full flex flex-col space-y-3">
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                          <strong className="block font-bold">Quiz Not Started Yet</strong>
                          <p className="text-[11px]">This quiz is scheduled to start at: <strong>{startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>. The start button will activate automatically.</p>
                        </div>
                        <Button size="sm" variant="secondary" disabled className="w-full">
                          STARTS AT {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Button>
                      </div>
                    ) : isClosed ? (
                      <div className="w-full flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">Quiz Window Closed</span>
                        <Button size="sm" variant="secondary" disabled>Expired</Button>
                      </div>
                    ) : quiz.accessStatus === 'access_revoked' ? (
                      <div className="w-full flex items-center justify-between">
                        <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                          <Lock className="w-4 h-4" /> Access Revoked
                        </span>
                        <Button size="sm" variant="secondary" disabled>Access Denied</Button>
                      </div>
                    ) : quiz.accessStatus === 'terminated' || quiz.accessStatus === 'locked' ? (
                      <div className="w-full flex items-center justify-between">
                        <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                          <Lock className="w-4 h-4" /> Quiz Terminated
                        </span>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={ShieldAlert}
                          onClick={() => setRetestModalQuiz(quiz)}
                        >
                          Request Retest
                        </Button>
                      </div>
                    ) : quiz.accessStatus === 'completed' && !quiz.approvedRetest ? (
                      <div className="w-full flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Quiz Completed
                        </span>
                        <Button size="sm" variant="secondary" disabled>Attempt Used</Button>
                      </div>
                    ) : (
                      <div className="w-full flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live Now
                        </span>
                        <Button
                          size="sm"
                          variant="primary"
                          icon={PlayCircle}
                          onClick={() => setSelectedRulesQuiz(quiz)}
                        >
                          {quiz.approvedRetest ? 'START RETEST' : 'START QUIZ'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl space-y-3">
            <BookOpen className="w-10 h-10 mx-auto text-slate-400" />
            <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">
              No event quizzes assigned to your account yet.
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-500">
              When an administrator grants you access to a quiz, it will appear here automatically.
            </p>
          </div>
        )}
      </section>

      {/* MODAL 1: PRE-QUIZ RULES MODAL (BEFORE STARTING QUIZ) */}
      {selectedRulesQuiz && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 border border-amber-500/40 rounded-3xl w-full max-w-2xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center gap-3 text-amber-600 border-b border-slate-200 dark:border-zinc-800 pb-4">
              <AlertTriangle className="w-7 h-7 shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">⚠ QUIZ RULES & REGULATIONS</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Read and agree to all strict proctoring rules for <strong>{selectedRulesQuiz.title}</strong></p>
              </div>
            </div>

            {/* 15 Rules List */}
            <div className="space-y-2.5 text-xs text-slate-700 dark:text-zinc-300 max-h-80 overflow-y-auto pr-2">
              <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                1. Once the quiz starts, do not leave the quiz screen.
              </p>
              <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                2. Do not switch applications.
              </p>
              <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                3. Do not open another browser tab or window.
              </p>
              <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                4. Do not minimize the browser during the test.
              </p>
              <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                5. Do not use screen-sharing or screen-search features.
              </p>
              <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                6. Do not use Gemini/Circle to Search or similar AI/search tools.
              </p>
              <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                7. Do not use copy/paste.
              </p>
              <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                8. Do not use browser developer tools.
              </p>
              <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                9. Do not use external websites or applications.
              </p>
              <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                10. Do not use phone camera/search/scan features.
              </p>
              <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                11. If you leave the quiz or a prohibited action is detected, the quiz will be terminated according to the violation policy.
              </p>
              <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                12. Once terminated, the participant cannot restart unless the administrator grants retest permission.
              </p>
              <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                13. Keep your device connected to the internet.
              </p>
              <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                14. The timer cannot be paused.
              </p>
              <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 font-bold text-amber-600 dark:text-amber-400">
                15. Submit the quiz before the timer reaches zero.
              </p>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-semibold italic text-center">
              By clicking "I Understand & Start Quiz", you agree to these rules.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setSelectedRulesQuiz(null)}>
                Cancel
              </Button>
              <Button type="button" variant="primary" className="flex-1" onClick={handleConfirmStartQuiz}>
                I UNDERSTAND & START QUIZ
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RETEST REQUEST MODAL */}
      {retestModalQuiz && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Request Retest Approval</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-300">
              Submit a retest request to the Event Administrator for <strong className="text-slate-900 dark:text-white">{retestModalQuiz.title}</strong>.
            </p>

            <form onSubmit={handleRequestRetestSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">Reason for Retest *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why you need another attempt (e.g. accidental tab switch / network glitch)..."
                  value={retestReason}
                  onChange={(e) => setRetestReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setRetestModalQuiz(null)}>Cancel</Button>
                <Button type="submit" variant="primary" className="flex-1">Submit Request</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: QUALIFIED CELEBRATION MODAL */}
      {showQualifiedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-emerald-500/40 rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
                <Trophy className="w-8 h-8" />
              </div>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                ⭐ STATUS: QUALIFIED FOR NEXT ROUND
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                🎉 CONGRATULATIONS!
              </h3>
              <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200">
                You have been selected for the Next Round based on your top performance!
              </p>
            </div>

            {qualificationInfo?.nextRoundQuiz && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-1 text-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Next Round Quiz</span>
                <h4 className="text-base font-bold text-emerald-600 dark:text-emerald-400">{qualificationInfo.nextRoundQuiz.title}</h4>
              </div>
            )}

            <div className="pt-2">
              <Button
                variant="primary"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm"
                onClick={() => setShowQualifiedModal(false)}
              >
                PROCEED TO QUIZZES
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ELIMINATED AUTO-LOGOUT MODAL */}
      {showEliminatedModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-red-500/40 rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 border border-red-500/40 flex items-center justify-center mx-auto shadow-lg shadow-red-500/20">
                <XCircle className="w-8 h-8" />
              </div>
              <span className="inline-block px-3 py-1 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-bold text-xs uppercase tracking-wider">
                ❌ STATUS: ELIMINATED
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                SORRY, YOU HAVE NOT BEEN SELECTED FOR THE NEXT ROUND
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Thank you for participating in Eloquence 2K26. Your account has been removed from further quiz rounds. Clicking OK will sign you out.
              </p>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm"
                onClick={handleEliminatedOk}
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
