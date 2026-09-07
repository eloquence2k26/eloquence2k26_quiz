import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Lock, 
  Maximize2, 
  ArrowRight, 
  ArrowLeft, 
  Send, 
  ShieldAlert, 
  X,
  Award,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/Button';
import { API_PARTICIPANT_URL } from '../config/apiConfig';

export const StrictQuizInterface = () => {
  const { id: quizId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Attempt & Quiz State
  const [attemptId, setAttemptId] = useState('');
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState([]);
  const [securitySettings, setSecuritySettings] = useState({});
  const [currentQnIndex, setCurrentQnIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timerSeconds, setTimerSeconds] = useState(1800);
  const [isQuizStarted, setIsQuizStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  // Modals & Protection States
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [warningModalMsg, setWarningModalMsg] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [lockReason, setLockReason] = useState('');

  const containerRef = useRef(null);

  // 1. Initialize Attempt on Server
  const initAttempt = async () => {
    try {
      const res = await fetch(`${API_PARTICIPANT_URL}/quizzes/${quizId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || user?.email || 'user-demo-1'
        },
        body: JSON.stringify({ participantId: user?.id || user?.email || 'user-demo-1' })
      });

      if (res.ok) {
        const data = await res.json();
        setAttemptId(data.attemptId);
        setQuizTitle(data.quizTitle || 'Symposium Quiz');
        setQuestions(data.questions || []);
        setSecuritySettings(data.securitySettings || {});
        setTimerSeconds((data.durationMinutes || 30) * 60);
        setIsQuizStarted(true);

        // Enter Fullscreen mode
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to start quiz attempt.');
        navigate('/participant/quizzes');
      }
    } catch (err) {
      console.error('Start quiz attempt error:', err);
    }
  };

  useEffect(() => {
    initAttempt();
  }, [quizId]);

  // 2. Server-Authoritative Timer Countdown
  useEffect(() => {
    if (!isQuizStarted || isLocked || quizResult || timerSeconds <= 0) return;

    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitQuiz(true); // Auto-submit when timer reaches zero
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isQuizStarted, isLocked, quizResult, timerSeconds]);

  // 3. Security Event Listeners (Visibility change, Window blur, Fullscreen exit, Shortcuts)
  const reportViolation = async (type, details) => {
    if (!attemptId || !isQuizStarted || isLocked || quizResult) return;

    try {
      const res = await fetch(`${API_PARTICIPANT_URL}/quizzes/${quizId}/violation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || user?.email || 'user-demo-1'
        },
        body: JSON.stringify({
          attemptId,
          violationType: type,
          details
        })
      });

      if (res.ok) {
        const data = await res.json();
        setViolationCount(data.violationCount);

        if (data.isActionTriggered) {
          if (data.status === 'AUTO_SUBMITTED' || securitySettings.violation_action === 'auto_submit') {
            const msg = 'Maximum security violations reached. Quiz is automatically submitting now.';
            setWarningModalMsg(msg);
            toast.error(msg);
            setTimeout(() => handleSubmitQuiz(true), 2000);
          } else {
            setIsLocked(true);
            const msg = 'VIOLATION DETECTED: You left the quiz screen. Your quiz has been terminated.';
            setLockReason(msg);
            toast.error(msg);
          }
        } else {
          const msg = `WARNING: Prohibited action detected (${details}). Action recorded as violation.`;
          setWarningModalMsg(msg);
          toast.warning(msg);
        }
      }
    } catch (err) {
      console.error('Violation record error:', err);
    }
  };

  useEffect(() => {
    if (!isQuizStarted || isLocked || quizResult) return;

    // Visibility Change Handler (Tab Switch / Minimize)
    const handleVisibilityChange = () => {
      if (document.hidden && securitySettings.detect_visibility_change !== false) {
        reportViolation('visibility_hidden', 'Participant switched browser tab or minimized window');
      }
    };

    // Window Blur Handler (Focus Loss)
    const handleWindowBlur = () => {
      if (securitySettings.detect_focus_loss !== false) {
        reportViolation('window_blur', 'Browser window lost focus / external application opened');
      }
    };

    // Fullscreen Exit Handler
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && securitySettings.detect_fullscreen_exit !== false) {
        reportViolation('fullscreen_exit', 'Participant exited fullscreen mode');
      }
    };

    // Keyboard Shortcuts Interception
    const handleKeyDown = (e) => {
      // Block Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+U, Ctrl+Shift+I, F12, Alt+Left
      if (
        (e.ctrlKey && ['c', 'v', 'x', 'u'].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' ||
        (e.altKey && e.key === 'ArrowLeft')
      ) {
        e.preventDefault();
        reportViolation('keyboard_shortcut', `Blocked restricted shortcut (${e.key})`);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isQuizStarted, isLocked, quizResult, attemptId, securitySettings]);

  // 4. Answer Selection & Auto-Save
  const handleSelectOption = async (optionKey) => {
    if (isLocked || quizResult) return;

    const currentQn = questions[currentQnIndex];
    if (!currentQn) return;

    const newAnswers = { ...answers, [currentQn.id]: optionKey };
    setAnswers(newAnswers);

    try {
      await fetch(`${API_PARTICIPANT_URL}/quizzes/${quizId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId,
          questionId: currentQn.id,
          selectedAnswer: optionKey
        })
      });
    } catch (err) {
      console.error('Save answer error:', err);
    }
  };

  // 5. Final Quiz Submission
  const handleSubmitQuiz = async (isAuto = false) => {
    if (isSubmitting || quizResult) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_PARTICIPANT_URL}/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || user?.email || 'user-demo-1'
        },
        body: JSON.stringify({
          attemptId,
          isAutoSubmitted: isAuto
        })
      });

      if (res.ok) {
        const data = await res.json();
        setQuizResult(data.result);
        setIsConfirmSubmitOpen(false);

        // Exit Fullscreen mode
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    } catch (err) {
      console.error('Submit quiz error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isQuizStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-white">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-semibold text-sm">Entering Strict Quiz Environment...</p>
        </div>
      </div>
    );
  }

  // RESULT SCREEN VIEW
  if (quizResult) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
        <section className="basic-card p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-3xl flex items-center justify-center mx-auto">
            <Award className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">QUIZ SUBMITTED SUCCESSFULLY</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
              Your answers have been recorded and graded by the Eloquence server.
            </p>
          </div>

          {/* Score Grid if Admin enabled show_score */}
          {quizResult.showScore !== false && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              <div>
                <span className="text-xs text-slate-400 block font-semibold">Your Final Score</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{quizResult.score} pts</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-semibold">Total Marks</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{quizResult.totalMarks} pts</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-semibold">Violations Logged</span>
                <span className="text-2xl font-bold text-amber-500">{quizResult.violationsCount}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-semibold">Attempt Status</span>
                <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 inline-block mt-1">
                  {quizResult.status}
                </span>
              </div>
            </div>
          )}

          <div className="pt-4">
            <Button variant="primary" onClick={() => navigate('/participant/quizzes')}>
              Return to My Quizzes
            </Button>
          </div>
        </section>
      </div>
    );
  }

  // TERMINATED / LOCKED SCREEN VIEW
  if (isLocked) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 basic-card text-center space-y-6">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">⚠ QUIZ TERMINATED</h2>
        <p className="text-xs text-red-600 dark:text-red-400 font-semibold leading-relaxed">
          {lockReason || 'A prohibited activity was detected. Your current quiz attempt has been terminated.'}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400">
          You cannot restart unless the administrator grants retest permission.
        </p>
        <Button variant="primary" className="w-full" onClick={() => navigate('/participant/quizzes')}>
          Return to My Quizzes
        </Button>
      </div>
    );
  }

  const currentQn = questions[currentQnIndex] || {};
  const currentSelectedAns = answers[currentQn.id] || '';
  const optionsCount = currentQn.optionsCount || 4;

  return (
    <div 
      ref={containerRef} 
      className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8 flex flex-col justify-between select-none"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
    >
      {/* Strict Quiz Header Bar */}
      <header className="max-w-5xl mx-auto w-full bg-slate-800/90 border border-slate-700 p-4 rounded-2xl flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl text-white">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">{quizTitle}</h3>
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
              Violations: {violationCount} / {securitySettings.max_violations || 3}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Server-authoritative Countdown Timer */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold text-sm ${
            timerSeconds < 300 ? 'bg-red-950/80 text-red-400 border-red-800 animate-pulse' : 'bg-slate-900 text-blue-400 border-slate-700'
          }`}>
            <Clock className="w-4 h-4" />
            <span>{formatTime(timerSeconds)}</span>
          </div>

          <button
            onClick={() => setIsConfirmSubmitOpen(true)}
            disabled={isSubmitting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" /> Submit Quiz
          </button>
        </div>
      </header>

      {/* Main Question Execution Panel */}
      <main className="max-w-4xl mx-auto w-full my-8 bg-slate-800/60 border border-slate-700/80 p-6 sm:p-10 rounded-3xl space-y-8 shadow-2xl backdrop-blur-md">
        <div className="flex justify-between items-center text-xs font-bold text-slate-400 border-b border-slate-700 pb-4">
          <span>Question {currentQnIndex + 1} / {questions.length}</span>
          <span className="px-3 py-1 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
            +{currentQn.marks || 1} Mark(s) {currentQn.negative_marks > 0 ? `(-${currentQn.negative_marks} neg)` : ''}
          </span>
        </div>

        {/* Question Statement */}
        <div className="space-y-4">
          <h3 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
            {currentQn.prompt}
          </h3>

          {currentQn.question_image && (
            <img src={currentQn.question_image} alt="Question Diagram" className="max-h-56 rounded-2xl border border-slate-700 my-3" />
          )}
        </div>

        {/* Dynamic MCQ Options List */}
        <div className="grid grid-cols-1 gap-3 pt-2">
          {['A', 'B', 'C', 'D'].slice(0, optionsCount).map((optKey) => {
            const optionText = currentQn[`option${optKey}`];
            const isSelected = currentSelectedAns === optKey;

            return (
              <button
                key={optKey}
                onClick={() => handleSelectOption(optKey)}
                className={`p-4 rounded-2xl border text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/30'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-700/80'
                }`}
              >
                <span className="text-xs sm:text-sm">
                  <strong className="mr-2 uppercase">{optKey}.</strong> {optionText}
                </span>

                {isSelected && <CheckCircle2 className="w-5 h-5 text-white shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Question Navigation Palette */}
        <div className="pt-6 border-t border-slate-700/80 space-y-2">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Question Palette:</span>
          <div className="flex flex-wrap gap-2">
            {questions.map((qn, idx) => {
              const isAnswered = Boolean(answers[qn.id]);
              const isCurrent = idx === currentQnIndex;

              return (
                <button
                  key={qn.id}
                  onClick={() => setCurrentQnIndex(idx)}
                  className={`w-8 h-8 rounded-xl font-bold text-xs transition-all flex items-center justify-center cursor-pointer ${
                    isCurrent
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                      : isAnswered
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer Navigation Bar */}
      <footer className="max-w-4xl mx-auto w-full flex justify-between items-center">
        <button
          disabled={currentQnIndex === 0}
          onClick={() => setCurrentQnIndex((prev) => Math.max(0, prev - 1))}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Previous
        </button>

        <span className="text-xs font-semibold text-slate-400">
          Answered: {Object.keys(answers).length} / {questions.length}
        </span>

        {currentQnIndex < questions.length - 1 ? (
          <button
            onClick={() => setCurrentQnIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-md cursor-pointer"
          >
            Next Question <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setIsConfirmSubmitOpen(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md cursor-pointer"
          >
            Submit Quiz <Send className="w-4 h-4" />
          </button>
        )}
      </footer>

      {/* MODAL 1: CONFIRM FINAL SUBMISSION */}
      {isConfirmSubmitOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 text-center shadow-2xl">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto">
              <Send className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">SUBMIT QUIZ?</h3>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                You have answered <strong className="text-white">{Object.keys(answers).length}</strong> of <strong className="text-white">{questions.length}</strong> questions.
              </p>
            </div>

            <p className="text-xs text-slate-400">Are you sure you want to submit your final attempt?</p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsConfirmSubmitOpen(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 cursor-pointer"
              >
                GO BACK
              </button>
              <button
                onClick={() => handleSubmitQuiz(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer"
              >
                {isSubmitting ? 'Submitting...' : 'SUBMIT QUIZ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VIOLATION WARNING MODAL */}
      {warningModalMsg && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 text-center shadow-2xl">
            <div className="w-14 h-14 bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Security Warning</h3>
              <p className="text-xs text-amber-300 mt-2 font-medium leading-relaxed">
                "{warningModalMsg}"
              </p>
            </div>

            <p className="text-[11px] text-slate-400">
              Violations recorded: <strong className="text-amber-400">{violationCount} / {securitySettings.max_violations || 3}</strong>. Exceeding limit will terminate your attempt.
            </p>

            <button
              onClick={() => setWarningModalMsg('')}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
            >
              I Understand & Return to Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
