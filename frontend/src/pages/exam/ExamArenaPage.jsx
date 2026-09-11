import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CheckCircle,
  RotateCcw,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { examService } from '../../services/examService';
import { useAntiCheating } from '../../hooks/useAntiCheating';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useToast } from '../../context/ToastContext';
import ExamHeader from '../../components/exam/ExamHeader';
import QuestionPalette from '../../components/exam/QuestionPalette';
import ViolationWarningModal from '../../components/exam/ViolationWarningModal';
import Modal from '../../components/common/Modal';
import Loading from '../../components/common/Loading';

export default function ExamArenaPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { enterFullscreen } = useFullscreen();

  const [loading, setLoading] = useState(true);
  const [attemptData, setAttemptData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const attemptId = attemptData?.attempt_id;
  const quiz = attemptData?.quiz;

  // Centralized Termination Handler
  const handleTerminated = useCallback((reason, finalResult) => {
    sessionStorage.setItem('termination_reason', reason || 'Repeated security violations');
    if (finalResult) {
      sessionStorage.setItem('termination_result', JSON.stringify(finalResult));
    }
    navigate(`/exam/terminated/${quizId}`);
  }, [quizId, navigate]);

  // Hook up automated anti-cheating monitoring with strict zero-tolerance default
  const {
    violationCount,
    latestViolation,
    showWarningModal,
    closeWarningModal,
    maxViolations
  } = useAntiCheating({
    attemptId,
    enabled: Boolean(attemptId),
    maxViolations: quiz?.max_violations !== undefined ? quiz.max_violations : 1,
    fullscreenRequired: quiz?.fullscreen_required !== false,
    onTerminated: handleTerminated
  });

  // 1. Initialize Exam
  useEffect(() => {
    const initExam = async () => {
      try {
        sessionStorage.removeItem('termination_reason');
        sessionStorage.removeItem('termination_result');
        const res = await examService.startExam(quizId);
        if (res.success && res.data) {
          setAttemptData(res.data);
          setQuestions(res.data.questions || []);
          setRemainingSeconds(res.data.remaining_seconds || (res.data.quiz.duration_minutes * 60));
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to initialize exam arena';
        toast.error(msg);
        if (err.response?.data?.errors?.result) {
          navigate(`/participant/results`);
        } else {
          navigate('/participant/dashboard');
        }
      } finally {
        setLoading(false);
      }
    };

    initExam();
  }, [quizId, toast, navigate]);

  // 2. Server countdown timer interval
  useEffect(() => {
    if (loading || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit('Exam time expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, remainingSeconds]);

  // 3. Auto Submit on Timer Expiry
  const handleAutoSubmit = async (reason = 'Time Expired') => {
    if (submitting || !attemptId) return;
    setSubmitting(true);
    try {
      const res = await examService.submitExam(attemptId);
      toast.info(`Time up! Your examination attempt was automatically submitted.`);
      navigate(`/exam/submitted/${attemptId}`);
    } catch (err) {
      navigate('/participant/dashboard');
    }
  };

  // 4. Save individual question answer
  const handleSelectOption = async (optionKey) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    // Update state immediately for instant feedback
    const updated = [...questions];
    updated[currentIndex] = {
      ...currentQ,
      selected_option: optionKey
    };
    setQuestions(updated);

    try {
      if (attemptId) {
        await examService.saveAnswer(attemptId, currentQ.id, optionKey, currentQ.is_marked_for_review);
      }
    } catch (err) {
      console.warn('Autosave sync buffered locally');
    }
  };

  // 5. Toggle Mark for Review
  const handleToggleReview = async () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const nextState = !currentQ.is_marked_for_review;
    const updated = [...questions];
    updated[currentIndex] = {
      ...currentQ,
      is_marked_for_review: nextState
    };
    setQuestions(updated);

    try {
      if (attemptId) {
        await examService.saveAnswer(attemptId, currentQ.id, currentQ.selected_option, nextState);
      }
    } catch (err) {
      console.warn('Review status save sync error');
    }
  };

  // 6. Clear Selected Option
  const handleClearResponse = async () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const updated = [...questions];
    updated[currentIndex] = {
      ...currentQ,
      selected_option: null
    };
    setQuestions(updated);

    try {
      if (attemptId) {
        await examService.saveAnswer(attemptId, currentQ.id, null, currentQ.is_marked_for_review);
      }
    } catch (err) {
      console.warn('Clear response save sync error');
    }
  };

  // 7. Navigation handlers
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // 8. Manual Submit
  const handleFinalSubmit = async () => {
    if (submitting || !attemptId) return;
    setSubmitting(true);

    try {
      const res = await examService.submitExam(attemptId);
      toast.success('Examination submitted successfully!');
      navigate(`/exam/submitted/${attemptId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error submitting exam');
      setSubmitting(false);
      setShowSubmitConfirm(false);
    }
  };

  if (loading) return <Loading fullScreen text="Entering Secure Examination Arena..." />;

  const currentQ = questions[currentIndex] || {};
  const answeredCount = questions.filter((q) => q.selected_option).length;
  const unansweredCount = questions.length - answeredCount;
  const reviewCount = questions.filter((q) => q.is_marked_for_review).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none cursor-default [-webkit-touch-callout:none] [-webkit-user-select:none] [user-select:none]">
      {/* Top Header */}
      <ExamHeader
        quizTitle={quiz?.title || 'Symposium Examination'}
        roundNumber={quiz?.round_number || 1}
        remainingSeconds={remainingSeconds}
        violationCount={violationCount}
        maxViolations={quiz?.max_violations !== undefined ? quiz.max_violations : 1}
        onSubmitClick={() => setShowSubmitConfirm(true)}
      />

      {/* Main Arena Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center Question Card (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between min-h-[500px]">
            <div>
              {/* Question Header Meta */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-3 py-1 rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-900">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {currentQ.category || 'General'} • {currentQ.difficulty || 'Medium'}
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>+{currentQ.marks || 1}</span>
                  {quiz?.negative_marking && currentQ.negative_marks > 0 && (
                    <span className="text-rose-600 dark:text-rose-400 ml-1.5">
                      (-{currentQ.negative_marks})
                    </span>
                  )}
                </div>
              </div>

              {/* Question Prompt */}
              <div className="py-6">
                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                  {currentQ.question_text}
                </p>
              </div>

              {/* Four MCQ Options */}
              <div className="space-y-3 pt-2">
                {currentQ.options && currentQ.options.map((opt) => {
                  const isSelected = currentQ.selected_option === opt.key;

                  return (
                    <div
                      key={opt.key}
                      onClick={() => handleSelectOption(opt.key)}
                      className={`flex items-center gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'bg-brand-50/80 dark:bg-brand-950/70 border-brand-500 dark:border-brand-600 text-brand-950 dark:text-brand-100 ring-2 ring-brand-500/20 shadow-sm'
                          : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black border transition-colors ${
                          isSelected
                            ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {opt.key}
                      </div>
                      <span className="text-sm font-medium flex-1 leading-snug">{opt.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Question Controls */}
            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleReview}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    currentQ.is_marked_for_review
                      ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  <span>{currentQ.is_marked_for_review ? 'Marked' : 'Mark for Review'}</span>
                </button>

                {currentQ.selected_option && (
                  <button
                    type="button"
                    onClick={handleClearResponse}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Response</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentIndex === questions.length - 1}
                  className="flex items-center gap-1 px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>Save & Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Palette & Live Summary (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <QuestionPalette
            questions={questions}
            currentIndex={currentIndex}
            onSelectQuestion={(idx) => setCurrentIndex(idx)}
          />

          {/* Quick Summary Pill */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Attempt Summary
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Questions:</span>
                <span className="font-bold text-slate-900 dark:text-white">{questions.length}</span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Attempted:</span>
                <span className="font-bold">{answeredCount}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Unanswered:</span>
                <span className="font-bold">{unansweredCount}</span>
              </div>
              <div className="flex justify-between text-amber-600 dark:text-amber-400">
                <span>Marked for Review:</span>
                <span className="font-bold">{reviewCount}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSubmitConfirm(true)}
              className="w-full mt-2 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 uppercase tracking-wider"
            >
              Finish & Submit Test
            </button>
          </div>
        </div>
      </div>

      {/* Security Violation Modal */}
      <ViolationWarningModal
        isOpen={showWarningModal}
        onClose={closeWarningModal}
        warningNumber={violationCount}
        maxViolations={quiz?.max_violations !== undefined ? quiz.max_violations : 1}
        violationType={latestViolation?.type}
        description={latestViolation?.description}
      />

      {/* Manual Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        title="Confirm Examination Submission"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl text-emerald-600 dark:text-emerald-400 inline-flex">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Are you sure you want to submit your exam?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              You have answered <strong className="text-slate-900 dark:text-white">{answeredCount}</strong> out of <strong className="text-slate-900 dark:text-white">{questions.length}</strong> questions.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div className="text-emerald-600 dark:text-emerald-400 font-bold">
              {answeredCount} Answered
            </div>
            <div className="text-slate-500 font-bold">
              {unansweredCount} Left Blank
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowSubmitConfirm(false)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
            >
              Continue Test
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleFinalSubmit}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20"
            >
              {submitting ? 'Submitting...' : 'Yes, Submit Now'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
