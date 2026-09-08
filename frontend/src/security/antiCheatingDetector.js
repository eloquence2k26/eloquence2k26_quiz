import { VIOLATION_TYPES } from '../utils/constants';

/**
 * Initializes proctoring event listeners on window and document.
 * Returns a teardown function.
 */
export function setupAntiCheatingListeners({
  onViolation,
  enabled = true,
  enableClipboard = true,
  enableTabSwitch = true,
  enableWindowBlur = true,
  enableFullscreen = true
}) {
  if (!enabled) return () => {};

  let isTornDown = false;

  // 1. Visibility change listener (Tab switch)
  const handleVisibilityChange = () => {
    if (isTornDown) return;
    if (document.hidden && enableTabSwitch) {
      onViolation({
        type: VIOLATION_TYPES.TAB_SWITCH,
        description: 'Participant switched browser tab or minimized window'
      });
    }
  };

  // 2. Window Blur listener
  const handleWindowBlur = () => {
    if (isTornDown) return;
    if (enableWindowBlur && !document.hidden) {
      onViolation({
        type: VIOLATION_TYPES.WINDOW_BLUR,
        description: 'Exam window lost focus to another application'
      });
    }
  };

  // 3. Fullscreen change listener
  const handleFullscreenChange = () => {
    if (isTornDown) return;
    const isFullscreen = Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );

    if (!isFullscreen && enableFullscreen) {
      onViolation({
        type: VIOLATION_TYPES.FULLSCREEN_EXIT,
        description: 'Participant exited secure fullscreen mode'
      });
    }
  };

  // 4. Context Menu / Right Click blocking
  const handleContextMenu = (e) => {
    e.preventDefault();
    if (isTornDown) return;
    onViolation({
      type: VIOLATION_TYPES.RIGHT_CLICK,
      description: 'Right click context menu attempt prevented'
    });
  };

  // 5. Copy, Cut, Paste prevention
  const handleCopy = (e) => {
    if (!enableClipboard) return;
    e.preventDefault();
    if (isTornDown) return;
    onViolation({
      type: VIOLATION_TYPES.COPY,
      description: 'Clipboard copy attempt prevented'
    });
  };

  const handleCut = (e) => {
    if (!enableClipboard) return;
    e.preventDefault();
    if (isTornDown) return;
    onViolation({
      type: VIOLATION_TYPES.CUT,
      description: 'Clipboard cut attempt prevented'
    });
  };

  const handlePaste = (e) => {
    if (!enableClipboard) return;
    e.preventDefault();
    if (isTornDown) return;
    onViolation({
      type: VIOLATION_TYPES.PASTE,
      description: 'Clipboard paste attempt prevented'
    });
  };

  // 6. Keyboard shortcuts blocker (F12, Ctrl+Shift+I/J/C, Ctrl+C, Ctrl+V, Ctrl+P, Ctrl+S, Ctrl+U)
  const handleKeyDown = (e) => {
    if (isTornDown) return;

    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    const key = e.key.toUpperCase();

    // DevTools: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    if (
      e.key === 'F12' ||
      (isCtrlOrMeta && e.shiftKey && ['I', 'J', 'C'].includes(key)) ||
      (isCtrlOrMeta && key === 'U') // View source
    ) {
      e.preventDefault();
      onViolation({
        type: VIOLATION_TYPES.SHORTCUT,
        description: `Blocked developer tool inspection shortcut (${e.key})`
      });
      return;
    }

    // Print & Save: Ctrl+P, Ctrl+S
    if (isCtrlOrMeta && ['P', 'S'].includes(key)) {
      e.preventDefault();
      onViolation({
        type: VIOLATION_TYPES.SHORTCUT,
        description: `Blocked print/save shortcut (${e.key})`
      });
      return;
    }

    // Copy / Paste / Cut keyboard combinations
    if (isCtrlOrMeta && ['C', 'V', 'X'].includes(key) && enableClipboard) {
      e.preventDefault();
      onViolation({
        type: VIOLATION_TYPES.SHORTCUT,
        description: `Blocked clipboard keyboard shortcut (Ctrl+${key})`
      });
    }
  };

  // Attach event listeners
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleWindowBlur);
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);

  document.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('copy', handleCopy);
  document.addEventListener('cut', handleCut);
  document.addEventListener('paste', handlePaste);
  document.addEventListener('keydown', handleKeyDown);

  // Return cleanup teardown
  return () => {
    isTornDown = true;
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleWindowBlur);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    document.removeEventListener('MSFullscreenChange', handleFullscreenChange);

    document.removeEventListener('contextmenu', handleContextMenu);
    document.removeEventListener('copy', handleCopy);
    document.removeEventListener('cut', handleCut);
    document.removeEventListener('paste', handlePaste);
    document.removeEventListener('keydown', handleKeyDown);
  };
}
