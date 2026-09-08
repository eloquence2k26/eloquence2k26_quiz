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

  // 5-Minute Joining Window Lockout Modal
  const [showLateLockModal, setShowLateLockModal] = useState(false);
  const [lateLockError, setLateLockError] = useState('');
  const [lateRequestSent, setLateRequestSent] = useState(false);
  const [lateSubmitting, setLateSubmitting] = useState(false);

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
        setQuizTitle(data.quiz?.title || data.quizTitle || 'Symposium Quiz');
        setQuestions(data.quiz?.questions || data.questions || []);
        setSecuritySettings(data.securitySettings || data.quiz || {});
        setTimerSeconds((data.duration || data.durationMinutes || 30) * 60);
        setIsQuizStarted(true);

        // Enter Fullscreen mode
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        const err = await res.json();
        if (err.code === 'LATE_LOCKED' || (err.error && (err.error.toLowerCase().includes('joining window') || err.error.toLowerCase().includes('5 minutes')))) {
          setLateLockError(err.error || 'The 5-minute joining window for this quiz has expired. Only an administrator can permit late entry.');
          setShowLateLockModal(true);
        } else {
          alert(err.error || 'Failed to start quiz attempt.');
          navigate('/participant/quizzes');
        }
      }
    } catch (err) {
      console.error('Start quiz attempt error:', err);
    }
  };

  const handleRequestLateJoinFromStrict = async () => {
    setLateSubmitting(true);
    try {
      const res = await fetch(`${API_PARTICIPANT_URL}/quizzes/${quizId}/request-late-join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || user?.email || 'user-demo-1'
        },
        body: JSON.stringify({
          participantId: user?.id || user?.email || 'user-demo-1',
          reason: 'Attempted to enter quiz screen after 5-minute joining window. Requesting administrator permission to join.'
        })
      });
      if (res.ok) {
        setLateRequestSent(true);
      }
    } catch (e) {
      console.error('Late join request error:', e);
    } finally {
      setLateSubmitting(false);
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
        setViolationCount(data.violationsCount || data.violationCount || 1);

        // STRICT CHEAT DETECTION: Any violation = instant termination
        setIsLocked(true);
        const msg = 'VIOLATION DETECTED: A prohibited action was detected. Your quiz has been terminated immediately.';
        setLockReason(msg);
        toast.error(msg);
        
        // Auto-submit to ensure attempt is finalized on the backend
        handleSubmitQuiz(true);
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
        (e.ctrlKey && ['c', 'v', 'x', 'u', 'p', 's'].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' ||
        (e.altKey && e.key === 'ArrowLeft') ||
        e.key === 'Meta' // Windows/Command key
      ) {
        e.preventDefault();
        reportViolation('keyboard_shortcut', `Blocked restricted shortcut (${e.key})`);
      }
    };

    // Mouse Leave (Cursor went out of window, likely looking at another screen/monitor)
    const handleMouseLeave = (e) => {
      if (e.clientY <= 0 || e.clientX <= 0 || (e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) {
        reportViolation('mouse_leave', 'Mouse cursor left the browser window bounds');
      }
    };

    // Right Click / Context Menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      reportViolation('context_menu', 'Right-click context menu attempted');
    };

    // Text Selection
    const handleSelectStart = (e) => {
      e.preventDefault();
      reportViolation('text_selection', 'Attempted to select text');
    };

    // Copy / Cut / Paste
    const handleClipboard = (e) => {
      e.preventDefault();
      reportViolation('clipboard_action', `Attempted to ${e.type} content`);
    };

    // Printing
    const handleBeforePrint = () => {
      reportViolation('print_attempt', 'Attempted to print or save page as PDF');
    };

    // Window Resizing (often used for split-screen)
    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // Only trigger if fullscreen is strictly required
        if (securitySettings.fullscreen_required !== false && !document.fullscreenElement) {
          reportViolation('window_resize', 'Browser window was resized');
        }
      }, 500);
    };

    // Mobile: Long Press / Long Touch (Used to trigger Gemini/Copy)
    let touchTimer;
    let touchStarted = false;
    
    const handleTouchStart = (e) => {
      touchStarted = true;
      if (e.touches.length > 1) {
        reportViolation('multi_touch', 'Multiple touch points detected');
      }
      
      // Setup the long press timer
      touchTimer = setTimeout(() => {
        if (touchStarted) {
          // Final violation triggers instant termination via reportViolation
          reportViolation('long_press', 'Long press / AI Screen scan detected');
        }
      }, 700); // 700ms threshold for long press
    };

    const handleTouchEnd = () => {
      touchStarted = false;
      clearTimeout(touchTimer);
    };

    // Aggressive Focus Poller for Mobile OS Overlays (Gemini/Google Assistant)
    // Mobile OS overlays often don't trigger reliable blur events but they do steal document focus
    const focusPoller = setInterval(() => {
      if (securitySettings.detect_focus_loss !== false && !document.hasFocus()) {
        reportViolation('focus_lost_overlay', 'System overlay / AI Assistant detected over quiz');
      }
    }, 500); // Check every 500ms

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('copy', handleClipboard);
    document.addEventListener('cut', handleClipboard);
    document.addEventListener('paste', handleClipboard);
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('resize', handleResize);
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('copy', handleClipboard);
      document.removeEventListener('cut', handleClipboard);
      document.removeEventListener('paste', handleClipboard);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
      clearTimeout(resizeTimer);
      clearTimeout(touchTimer);
      clearInterval(focusPoller);
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

  // TERMINATED / LOCKED SCREEN VIEW
  if (isLocked) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 basic-card text-center space-y-6">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">⚠ QUIZ TERMINATED</h2>
        <div className="bg-slate-100 dark:bg-zinc-800/50 p-3 rounded-lg border border-slate-200 dark:border-zinc-700">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Participant: {user?.name || user?.email || 'Unknown User'}</p>
        </div>
        <p className="text-xs text-red-600 dark:text-red-400 font-semibold leading-relaxed">
          {lockReason || 'A prohibited activity was detected. Your current quiz attempt has been terminated.'}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400">
          You cannot restart unless the administrator grants retest permission. Please contact your admin.
        </p>
        <Button variant="primary" className="w-full" onClick={() => navigate('/participant/quizzes')}>
          Return to My Quizzes
        </Button>
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
                <span className="text-2xl font-bold text-amber-500">{quizResult.violationsCount || violationCount}</span>
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

  const currentQn = questions[currentQnIndex] || {};
  const currentSelectedAns = answers[currentQn.id] || '';
  const optionsCount = currentQn.optionsCount || 4;

  return (
    <div 
      ref={containerRef} 
      className="min-h-screen bg-[#0a0f1a] text-slate-100 p-4 sm:p-6 lg:p-8 flex flex-col justify-between selection:bg-transparent selection:text-transparent select-none relative overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-96 bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-900/5 blur-[120px] pointer-events-none" />

      {/* Strict Quiz Header Bar */}
      <header className="max-w-5xl mx-auto w-full bg-[#131b2c]/90 border border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-2xl relative z-10 gap-4 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 flex items-center justify-center relative">
            <ShieldAlert className="w-6 h-6" />
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500 animate-ping" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-white tracking-wide">{quizTitle}</h3>
            <span className="text-[10px] sm:text-xs text-red-400 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
              Strict Proctoring Active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-5 w-full sm:w-auto justify-between sm:justify-end">
          {/* Violations Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Violations: {violationCount} / {securitySettings.max_violations || 3}</span>
          </div>

          {/* Server-authoritative Countdown Timer */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold text-sm sm:text-base tracking-wider ${
            timerSeconds < 300 ? 'bg-red-950/80 text-red-400 border-red-800 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-[#0a0f1a] text-blue-400 border-blue-900/50'
          }`}>
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{formatTime(timerSeconds)}</span>
          </div>

          <button
            onClick={() => setIsConfirmSubmitOpen(true)}
            disabled={isSubmitting}
            className="hidden sm:flex px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" /> Finish
          </button>
        </div>
      </header>

      {/* Main Question Execution Panel */}
      <main className="max-w-4xl mx-auto w-full my-6 sm:my-10 bg-[#131b2c]/80 border border-slate-800/80 p-6 sm:p-10 rounded-[2rem] space-y-8 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="flex justify-between items-center text-xs font-bold text-slate-400 border-b border-slate-800 pb-5">
          <span className="tracking-widest uppercase text-blue-400/80">Question {currentQnIndex + 1} of {questions.length}</span>
          <span className="px-3 py-1 rounded-full bg-[#0a0f1a] text-emerald-400 border border-emerald-900/50">
            +{currentQn.marks || 1} Mark(s) {currentQn.negative_marks > 0 ? <span className="text-red-400 ml-1">(-${currentQn.negative_marks} neg)</span> : ''}
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
        <div className="grid grid-cols-1 gap-4 pt-4">
          {['A', 'B', 'C', 'D'].slice(0, optionsCount).map((optKey) => {
            const optionText = currentQn[`option${optKey}`];
            const isSelected = currentSelectedAns === optKey;

            return (
              <div
                key={optKey}
                onClick={() => handleSelectOption(optKey)}
                className={`group relative p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                    : 'bg-slate-900/60 hover:bg-slate-800 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                {/* Selection Indicator Background */}
                <div 
                  className={`absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent transition-opacity duration-300 ${
                    isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                  }`}
                />
                
                <div className="relative flex items-center gap-4">
                  {/* Option Letter Bubble */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    isSelected 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40' 
                      : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                  }`}>
                    {optKey}
                  </div>
                  
                  {/* Option Text */}
                  <div className={`flex-1 text-sm sm:text-base font-medium leading-relaxed transition-colors ${
                    isSelected ? 'text-white' : 'text-slate-300 group-hover:text-slate-100'
                  }`}>
                    {optionText}
                  </div>

                  {/* Check Icon */}
                  <div className={`flex-shrink-0 transition-all duration-300 ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                    <CheckCircle2 className="w-6 h-6 text-blue-500" />
                  </div>
                </div>
              </div>
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
      <footer className="max-w-4xl mx-auto w-full flex justify-between items-center mt-6 relative z-10">
        <button
          disabled={currentQnIndex === 0}
          onClick={() => setCurrentQnIndex((prev) => Math.max(0, prev - 1))}
          className="px-5 py-3 bg-[#131b2c]/80 hover:bg-[#1a243a] disabled:opacity-40 text-slate-300 text-sm font-bold rounded-xl border border-slate-700/50 flex items-center gap-2 cursor-pointer transition-all backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" /> Previous
        </button>

        <span className="text-xs sm:text-sm font-bold text-slate-500 tracking-widest uppercase">
          Answered: <span className="text-blue-400">{Object.keys(answers).length}</span> / {questions.length}
        </span>

        {currentQnIndex < questions.length - 1 ? (
          <button
            onClick={() => setCurrentQnIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all cursor-pointer"
          >
            Next Question <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => setIsConfirmSubmitOpen(true)}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-extrabold rounded-xl flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all cursor-pointer"
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

      {/* MODAL 3: LATE JOINING WINDOW LOCKED MODAL */}
      {showLateLockModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl w-full max-w-md p-6 sm:p-8 space-y-6 text-center shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 bg-amber-500/15 text-amber-500 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/15">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs uppercase tracking-wider">
                Joining Window Closed
              </span>
              <h3 className="text-xl font-extrabold text-white">
                5-Minute Entry Time Expired
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {lateLockError || 'Once the event starts, participants have only 5 minutes to join. Since this time has passed, only an administrator can permit you to enter.'}
              </p>
            </div>

            {lateRequestSent ? (
              <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Your late entry request has been sent to the admin. Please notify the organizer.</span>
              </div>
            ) : (
              <button
                onClick={handleRequestLateJoinFromStrict}
                disabled={lateSubmitting}
                className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {lateSubmitting ? 'Sending Request...' : 'Request Admin to Allow Join'}
              </button>
            )}

            <button
              onClick={() => navigate('/participant/quizzes')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              Back to Authorized Quizzes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
