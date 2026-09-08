import { useState, useEffect, useRef, useCallback } from 'react';
import { setupAntiCheatingListeners } from '../security/antiCheatingDetector';
import { examService } from '../services/examService';

export function useAntiCheating({
  attemptId,
  enabled = true,
  maxViolations = 3,
  fullscreenRequired = true,
  onTerminated
}) {
  const [violationCount, setViolationCount] = useState(0);
  const [latestViolation, setLatestViolation] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const lastEventTimeRef = useRef(0);

  const handleViolation = useCallback(async (violation) => {
    const now = Date.now();
    // Debounce duplicate events within 800ms
    if (now - lastEventTimeRef.current < 800) return;
    lastEventTimeRef.current = now;

    setLatestViolation(violation);

    try {
      if (attemptId) {
        const res = await examService.recordSecurityEvent(attemptId, violation.type, violation.description, {
          timestamp: new Date().toISOString()
        });

        if (res.success && res.data) {
          if (res.data.terminated) {
            if (onTerminated) {
              onTerminated(res.data.reason || 'Security violations limit exceeded', res.data.result);
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
          onTerminated('Repeated proctoring security anomalies', null);
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
