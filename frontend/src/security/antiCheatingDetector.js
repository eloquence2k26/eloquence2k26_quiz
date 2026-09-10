import { VIOLATION_TYPES } from '../utils/constants';

/**
 * Advanced Anti-Cheating & AI Proctoring Detector
 * Features Zero-Tolerance Strict Detection:
 * 1. Mobile Gemini / Google Assistant / Circle-to-Search invocation detection
 * 2. Mobile Long-Press / Touch-and-Hold suppression and detection
 * 3. Multi-touch screenshot / gesture interception
 * 4. Split-screen / floating multitasking window detection
 * 5. Text selection, copy, cut, paste, drag-and-drop suppression
 * 6. Screenshot shortcuts & Screen Recording detection
 * 7. Developer tools & Inspect element lockout
 * 8. Window blur, tab switch, page hide, visibility change monitoring
 * 9. Secure Fullscreen continuous integrity verification
 */
export function setupAntiCheatingListeners({
  onViolation,
  enabled = true,
  enableClipboard = true,
  enableTabSwitch = true,
  enableWindowBlur = true,
  enableFullscreen = true,
  enableMobileProtection = true,
  enableDevToolsProtection = true
}) {
  if (!enabled) return () => {};

  let isTornDown = false;
  let touchStartTime = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let longPressTimeout = null;
  let devToolsInterval = null;

  // Helper to safely report violation
  const triggerViolation = (type, description, metadata = {}) => {
    if (isTornDown) return;
    onViolation({
      type,
      description,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        device_pixel_ratio: window.devicePixelRatio || 1,
        screen_dimensions: `${window.screen.width}x${window.screen.height}`,
        viewport_dimensions: `${window.innerWidth}x${window.innerHeight}`,
        is_touch_device: 'ontouchstart' in window || navigator.maxTouchPoints > 0
      }
    });
  };

  // 1. Visibility change listener (Tab switch / minimized app / assistant drawer)
  const handleVisibilityChange = () => {
    if (isTornDown) return;
    if (document.hidden && enableTabSwitch) {
      triggerViolation(
        VIOLATION_TYPES.TAB_SWITCH,
        'Security Alert: Switched browser tab, minimized window, or triggered mobile assistant overlay',
        { document_hidden: document.hidden, visibility_state: document.visibilityState }
      );
    }
  };

  // 2. Window Blur listener (Lost focus to external app, notification panel, floating assistant)
  const handleWindowBlur = () => {
    if (isTornDown) return;
    if (enableWindowBlur) {
      triggerViolation(
        VIOLATION_TYPES.WINDOW_BLUR,
        'Security Alert: Examination window lost focus to external application, notification panel, or AI assistant',
        { event: 'window_blur' }
      );
    }
  };

  // 3. Pagehide & Freeze listener (Mobile app switched to background)
  const handlePageHide = (e) => {
    if (isTornDown) return;
    triggerViolation(
      VIOLATION_TYPES.TAB_SWITCH,
      'Security Alert: Mobile page paused or placed in background',
      { persisted: e.persisted }
    );
  };

  // 4. Fullscreen change listener
  const handleFullscreenChange = () => {
    if (isTornDown) return;
    const isFullscreen = Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );

    if (!isFullscreen && enableFullscreen) {
      triggerViolation(
        VIOLATION_TYPES.FULLSCREEN_EXIT,
        'Security Alert: Exited secure fullscreen proctoring environment'
      );
    }
  };

  // 5. Mobile Touch & Long-Press / Circle-to-Search / Gemini Assistant Protection
  const handleTouchStart = (e) => {
    if (isTornDown || !enableMobileProtection) return;

    // A. Multi-touch gesture blocker (3-finger screenshot, 2-finger assistant swipes)
    if (e.touches && e.touches.length > 1) {
      e.preventDefault();
      triggerViolation(
        VIOLATION_TYPES.MULTI_TOUCH_GESTURE,
        `Security Alert: Multi-finger gesture detected (${e.touches.length} fingers) - Prohibited screen capture/assistant gesture attempt`,
        { touch_count: e.touches.length }
      );
      return;
    }

    // B. Long-Press / Circle-to-Search / Gemini invocation detector
    if (e.touches && e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartTime = Date.now();
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;

      if (longPressTimeout) clearTimeout(longPressTimeout);

      // If user holds finger on screen still for > 350ms (common trigger for Circle to Search / Gemini overlay / text selection)
      longPressTimeout = setTimeout(() => {
        triggerViolation(
          VIOLATION_TYPES.MOBILE_LONG_PRESS,
          'Security Alert: Mobile touch-and-hold detected (Circle to Search / Gemini AI / Selection trigger)',
          { hold_duration_ms: Date.now() - touchStartTime }
        );
      }, 350);
    }
  };

  const handleTouchMove = (e) => {
    if (isTornDown || !enableMobileProtection) return;

    // Multi-touch during move
    if (e.touches && e.touches.length > 1) {
      e.preventDefault();
      if (longPressTimeout) clearTimeout(longPressTimeout);
      triggerViolation(
        VIOLATION_TYPES.MULTI_TOUCH_GESTURE,
        'Security Alert: Multi-touch gesture during movement detected'
      );
      return;
    }

    // If movement is > 15px, user is scrolling, cancel long-press
    if (e.touches && e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartX);
      const dy = Math.abs(touch.clientY - touchStartY);
      if (dx > 15 || dy > 15) {
        if (longPressTimeout) {
          clearTimeout(longPressTimeout);
          longPressTimeout = null;
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      longPressTimeout = null;
    }
  };

  // C. Touch Cancel (Triggered when system AI assistant or system dialog hijacks the touch stream)
  const handleTouchCancel = () => {
    if (isTornDown) return;
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      longPressTimeout = null;
    }

    triggerViolation(
      VIOLATION_TYPES.GEMINI_ASSISTANT_TRIGGER,
      'Security Alert: Mobile touch session hijacked by OS assistant overlay or system gesture (Gemini / Circle to Search)'
    );
  };

  // 6. Split Screen / Floating Multi-Window Detection on Mobile / Desktop
  const handleResize = () => {
    if (isTornDown) return;

    const screenH = window.screen.availHeight || window.screen.height;
    const screenW = window.screen.availWidth || window.screen.width;
    const innerH = window.innerHeight;
    const innerW = window.innerWidth;

    // If on mobile/tablet and height or width shrinks dramatically (split screen)
    // Note: Don't trigger if an active text input is focused (virtual keyboard)
    const activeEl = document.activeElement;
    const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

    if (!isTyping) {
      if (screenH > 0 && innerH / screenH < 0.58) {
        triggerViolation(
          VIOLATION_TYPES.SPLIT_SCREEN,
          'Security Alert: Split-screen mode or multitasking floating window detected',
          { inner_height: innerH, screen_height: screenH, ratio: innerH / screenH }
        );
      }
    }
  };

  // 7. Context Menu / Long-Press Menu blocking
  const handleContextMenu = (e) => {
    e.preventDefault();
    if (isTornDown) return;
    triggerViolation(
      VIOLATION_TYPES.RIGHT_CLICK,
      'Security Alert: Context menu or touch callout attempt blocked'
    );
  };

  // 8. Text Selection Blocker
  const handleSelectStart = (e) => {
    e.preventDefault();
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
    if (isTornDown) return;
    triggerViolation(
      VIOLATION_TYPES.TEXT_SELECTION,
      'Security Alert: Question text selection or AI scraping attempt blocked'
    );
  };

  const handleSelectionChange = () => {
    if (isTornDown) return;
    const sel = window.getSelection ? window.getSelection().toString() : '';
    if (sel && sel.trim().length > 0) {
      window.getSelection().removeAllRanges();
      triggerViolation(
        VIOLATION_TYPES.TEXT_SELECTION,
        'Security Alert: Text highlight/selection attempt cleared and blocked'
      );
    }
  };

  // 9. Clipboard operations (Copy, Cut, Paste)
  const handleCopy = (e) => {
    if (!enableClipboard) return;
    e.preventDefault();
    if (isTornDown) return;
    triggerViolation(
      VIOLATION_TYPES.COPY,
      'Security Alert: Question copy to clipboard attempt blocked'
    );
  };

  const handleCut = (e) => {
    if (!enableClipboard) return;
    e.preventDefault();
    if (isTornDown) return;
    triggerViolation(
      VIOLATION_TYPES.CUT,
      'Security Alert: Clipboard cut attempt blocked'
    );
  };

  const handlePaste = (e) => {
    if (!enableClipboard) return;
    e.preventDefault();
    if (isTornDown) return;
    triggerViolation(
      VIOLATION_TYPES.PASTE,
      'Security Alert: Clipboard paste attempt blocked'
    );
  };

  // 10. Drag and Drop Blocker
  const handleDragStart = (e) => {
    e.preventDefault();
    if (isTornDown) return;
    triggerViolation(
      VIOLATION_TYPES.TEXT_SELECTION,
      'Security Alert: Dragging text or content blocked'
    );
  };

  // 11. Keyboard shortcuts blocker (DevTools, Screenshot, Print, Copy, Reload)
  const handleKeyDown = (e) => {
    if (isTornDown) return;

    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    const isAlt = e.altKey;
    const key = (e.key || '').toUpperCase();

    // A. Screenshot Shortcuts (PrintScreen, Win+Shift+S, Cmd+Shift+3/4)
    if (
      key === 'PRINTSCREEN' ||
      e.keyCode === 44 ||
      (isCtrlOrMeta && e.shiftKey && ['3', '4', '5', 'S'].includes(key)) ||
      (isCtrlOrMeta && key === 'P') // Print
    ) {
      e.preventDefault();
      triggerViolation(
        VIOLATION_TYPES.SCREEN_CAPTURE,
        `Security Alert: Screenshot / Screen recording command blocked (${e.key})`
      );
      return;
    }

    // B. Developer Tools: F12, Ctrl+Shift+I/J/C, Ctrl+U (View Source)
    if (
      e.key === 'F12' ||
      (isCtrlOrMeta && e.shiftKey && ['I', 'J', 'C'].includes(key)) ||
      (isCtrlOrMeta && key === 'U')
    ) {
      e.preventDefault();
      triggerViolation(
        VIOLATION_TYPES.DEVTOOLS_INSPECTION,
        `Security Alert: Developer inspect shortcut blocked (${e.key})`
      );
      return;
    }

    // C. Alt+Tab / Alt+F4 / Window Swapping
    if (isAlt && ['TAB', 'F4', 'ARROWLEFT', 'ARROWRIGHT'].includes(key)) {
      e.preventDefault();
      triggerViolation(
        VIOLATION_TYPES.SHORTCUT,
        `Security Alert: Application switcher shortcut blocked (Alt+${key})`
      );
      return;
    }

    // D. Save & Reload: Ctrl+S, Ctrl+R, F5
    if ((isCtrlOrMeta && ['S', 'R'].includes(key)) || e.key === 'F5') {
      e.preventDefault();
      triggerViolation(
        VIOLATION_TYPES.SHORTCUT,
        `Security Alert: Page save or manual reload shortcut blocked (${e.key})`
      );
      return;
    }

    // E. Clipboard keyboard shortcuts: Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A
    if (isCtrlOrMeta && ['C', 'V', 'X', 'A'].includes(key) && enableClipboard) {
      e.preventDefault();
      triggerViolation(
        VIOLATION_TYPES.SHORTCUT,
        `Security Alert: Clipboard shortcut blocked (Ctrl+${key})`
      );
    }
  };

  // 12. DevTools heuristics detection via outer/inner dimension differential
  if (enableDevToolsProtection) {
    devToolsInterval = setInterval(() => {
      if (isTornDown) return;
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        // Only trigger if fullscreen isn't being manipulated
        const isFullscreen = Boolean(
          document.fullscreenElement ||
          document.webkitFullscreenElement
        );
        if (isFullscreen && (widthThreshold || heightThreshold)) {
          triggerViolation(
            VIOLATION_TYPES.DEVTOOLS_INSPECTION,
            'Security Alert: Browser developer console panel opening detected'
          );
        }
      }
    }, 2000);
  }

  // Attach global DOM listeners
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleWindowBlur);
  window.addEventListener('pagehide', handlePageHide);
  window.addEventListener('resize', handleResize);

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);

  // Touch & Mobile listeners
  document.addEventListener('touchstart', handleTouchStart, { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });
  document.addEventListener('touchcancel', handleTouchCancel, { passive: true });

  // Mouse & Keyboard & Clipboard listeners
  document.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('selectstart', handleSelectStart);
  document.addEventListener('selectionchange', handleSelectionChange);
  document.addEventListener('dragstart', handleDragStart);
  document.addEventListener('copy', handleCopy);
  document.addEventListener('cut', handleCut);
  document.addEventListener('paste', handlePaste);
  document.addEventListener('keydown', handleKeyDown);

  // Return complete teardown cleanup
  return () => {
    isTornDown = true;
    if (longPressTimeout) clearTimeout(longPressTimeout);
    if (devToolsInterval) clearInterval(devToolsInterval);

    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('pagehide', handlePageHide);
    window.removeEventListener('resize', handleResize);

    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    document.removeEventListener('MSFullscreenChange', handleFullscreenChange);

    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('touchcancel', handleTouchCancel);

    document.removeEventListener('contextmenu', handleContextMenu);
    document.removeEventListener('selectstart', handleSelectStart);
    document.removeEventListener('selectionchange', handleSelectionChange);
    document.removeEventListener('dragstart', handleDragStart);
    document.removeEventListener('copy', handleCopy);
    document.removeEventListener('cut', handleCut);
    document.removeEventListener('paste', handlePaste);
    document.removeEventListener('keydown', handleKeyDown);
  };
}
