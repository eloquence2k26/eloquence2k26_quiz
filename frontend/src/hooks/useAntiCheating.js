import { useState, useEffect, useRef, useCallback } from 'react';
import { setupAntiCheatingListeners } from '../security/antiCheatingDetector';
import { examService } from '../services/examService';

export function useAntiCheating({
  attemptId,
  enabled = true,
  maxViolations = 1,
  fullscreenRequired = true,
  onTerminated
}) {
  const [violationCount, setViolationCount] = useState(0);
  const [latestViolation, setLatestViolation] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const lastEventTimeRef = useRef(0);
  const isTerminatedRef = useRef(false);

  const handleViolation = useCallback(async (violation) => {
    if (isTerminatedRef.current) return;

    const now = Date.now();
    // Debounce duplicate events within 500ms
    if (now - lastEventTimeRef.current < 500) return;
    lastEventTimeRef.current = now;

    setLatestViolation(violation);

    // If zero-tolerance single-violation rule is active or instant kill triggered
    if (maxViolations <= 1 || violation.metadata?.instant_kill || violation.metadata?.strict_single_strike) {
      isTerminatedRef.current = true;
      try {
        if (attemptId) {
          const res = await examService.recordSecurityEvent(attemptId, violation.type, violation.description, {
            ...(violation.metadata || {}),
            timestamp: new Date().toISOString(),
            strict_single_strike: true,
            instant_kill: true
          });
          if (onTerminated) {
            onTerminated(res?.data?.reason || violation.description, res?.data?.result);
          }
        } else if (onTerminated) {
          onTerminated(violation.description, null);
        }
      } catch (err) {
        if (onTerminated) {
          onTerminated(violation.description, null);
        }
      }
      return;
    }

    try {
      if (attemptId) {
        const res = await examService.recordSecurityEvent(attemptId, violation.type, violation.description, {
          ...(violation.metadata || {}),
          timestamp: new Date().toISOString()
        });

        if (res.success && res.data) {
          if (res.data.terminated) {
            isTerminatedRef.current = true;
            if (onTerminated) {
              onTerminated(res.data.reason || violation.description, res.data.result);
            }
          } else {
            const count = res.data.warning_number || violationCount + 1;
            setViolationCount(count);
            setShowWarningModal(true);
          }
        }
      }
    } catch (err) {
      console.error('Error logging proctoring violation:', err.message);
      setViolationCount((prev) => {
        const next = prev + 1;
        if (next >= maxViolations && onTerminated) {
          isTerminatedRef.current = true;
          onTerminated(violation.description || 'Proctoring security limit exceeded', null);
        } else {
          setShowWarningModal(true);
        }
        return next;
      });
    }
  }, [attemptId, maxViolations, onTerminated, violationCount]);

  useEffect(() => {
    if (!enabled || !attemptId) return;

    const cleanup = setupAntiCheatingListeners({
      onViolation: handleViolation,
      enabled,
      enableFullscreen: fullscreenRequired
    });

    return () => cleanup();
  }, [enabled, attemptId, fullscreenRequired, handleViolation]);

  const closeWarningModal = () => {
    setShowWarningModal(false);
  };

  return {
    violationCount,
    latestViolation,
    showWarningModal,
    closeWarningModal,
    maxViolations
  };
}
