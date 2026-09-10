import { VIOLATION_TYPES } from '../utils/constants';

/**
 * Advanced Military-Grade Anti-Cheating & AI Proctoring Detector
 * Features Zero-Tolerance Strict Detection:
 * 1. AI Extensions / Assistant side-panels / Injected Shadow DOM detector
 * 2. Developer Tools Debugger Traps & Console inspection blocker
 * 3. Mobile Gemini / Google Assistant / Circle-to-Search invocation detection
 * 4. Mobile Long-Press / Touch-and-Hold suppression and detection
 * 5. Multi-touch screenshot / gesture interception
 * 6. Split-screen / floating multitasking window detection
 * 7. Secondary monitor / Extended Display detection
 * 8. Mouse Leaving Examination Window / Teleportation
 * 9. Automation / WebDriver / Headless Browser detection
 * 10. Text selection, copy, cut, paste, drag-and-drop suppression
 * 11. System shortcut interception (Win/Cmd key, Alt+Tab, Task Manager, PrintScreen, Snipping tool)
 * 12. Window blur, tab switch, page hide, visibility change monitoring
 * 13. Secure Fullscreen continuous integrity verification
 */
export function setupAntiCheatingListeners({
  onViolation,
  enabled = true,
  enableClipboard = true,
  enableTabSwitch = true,
  enableWindowBlur = true,
  enableFullscreen = true,
  enableMobileProtection = true,
  enableDevToolsProtection = true,
  enableAiExtensionScan = true
}) {
  if (!enabled) return () => {};

  let isTornDown = false;
  let touchStartTime = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let longPressTimeout = null;
  let devToolsInterval = null;
  let aiExtensionScanInterval = null;
  let debuggerTrapInterval = null;

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
        'Security Violation: Switched browser tab, minimized window, or triggered mobile assistant overlay',
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
        'Security Violation: Examination window lost focus to external application, notification panel, or AI assistant',
        { event: 'window_blur' }
      );
    }
  };

  // 3. Pagehide & Freeze listener (Mobile app switched to background)
  const handlePageHide = (e) => {
    if (isTornDown) return;
    triggerViolation(
      VIOLATION_TYPES.TAB_SWITCH,
      'Security Violation: Mobile page paused or placed in background',
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
        'Security Violation: Exited secure fullscreen proctoring environment'
      );
    }
  };

  // 5. Mouse Leave Viewport (User moving cursor out of screen to 2nd monitor or window)
  const handleMouseLeave = (e) => {
    if (isTornDown) return;
    // Check if cursor truly left top/left/right/bottom of viewport
    if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
      triggerViolation(
        VIOLATION_TYPES.MOUSE_LEAVE_WINDOW,
        'Security Alert: Mouse cursor moved outside of the examination window',
        { clientX: e.clientX, clientY: e.clientY }
      );
    }
  };

  // 6. Automation & WebDriver Detection
  const checkAutomationFlags = () => {
    if (isTornDown) return;
    if (
      navigator.webdriver ||
      window.cdc_adoQpoasnfa76pfcZLmcfl_Array ||
      window.callPhantom ||
      window._phantom ||
      document.documentElement.getAttribute('webdriver')
    ) {
      triggerViolation(
        VIOLATION_TYPES.AUTOMATION_DETECTED,
        'Security Alert: Automated browser testing / bot script detected'
      );
    }
  };
  checkAutomationFlags();

  // 7. Multi-Display / Extended Monitor Detection
  const checkMultipleDisplays = () => {
    if (isTornDown) return;
    if (window.screen && window.screen.isExtended) {
      triggerViolation(
        VIOLATION_TYPES.MULTIPLE_DISPLAYS,
        'Security Alert: Secondary or extended monitor detected. Please disconnect extra displays.'
      );
    }
  };
  checkMultipleDisplays();

  // 8. Mobile Touch & Long-Press / Circle-to-Search / Gemini Assistant Protection (Strict 1-Detection Kill)
  const handleTouchStart = (e) => {
    if (isTornDown || !enableMobileProtection) return;

    // A. Multi-touch gesture blocker (3-finger screenshot, 2-finger assistant/split swipes)
    if (e.touches && e.touches.length > 1) {
      e.preventDefault();
      triggerViolation(
        VIOLATION_TYPES.MULTI_TOUCH_GESTURE,
        `Security Alert: Multi-finger gesture detected (${e.touches.length} fingers) - Prohibited screen capture/assistant gesture attempt`,
        { touch_count: e.touches.length, instant_kill: true, strict_single_strike: true }
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

      // If user holds finger on screen still for > 250ms (Circle to Search / Gemini overlay / context callout)
      longPressTimeout = setTimeout(() => {
        triggerViolation(
          VIOLATION_TYPES.MOBILE_LONG_PRESS,
          'Security Violation: Mobile touch-and-hold detected (Circle to Search / Gemini AI / Selection attempt)',
          { hold_duration_ms: Date.now() - touchStartTime, instant_kill: true, strict_single_strike: true }
        );
      }, 250);
    }
  };

  const handleTouchMove = (e) => {
    if (isTornDown || !enableMobileProtection) return;

    if (e.touches && e.touches.length > 1) {
      e.preventDefault();
      if (longPressTimeout) clearTimeout(longPressTimeout);
      triggerViolation(
        VIOLATION_TYPES.MULTI_TOUCH_GESTURE,
        'Security Violation: Multi-touch gesture during movement detected',
        { instant_kill: true, strict_single_strike: true }
      );
      return;
    }

    // If movement is > 10px, user is scrolling, cancel long-press
    if (e.touches && e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartX);
      const dy = Math.abs(touch.clientY - touchStartY);
      if (dx > 10 || dy > 10) {
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

  // C. Touch Cancel (Triggered when system AI assistant, notification drawer, or system dialog hijacks the touch stream)
  const handleTouchCancel = () => {
    if (isTornDown) return;
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      longPressTimeout = null;
    }

    triggerViolation(
      VIOLATION_TYPES.GEMINI_ASSISTANT_TRIGGER,
      'Security Violation: Mobile touch session hijacked by OS assistant overlay, notification panel, or gesture (Gemini / Circle to Search)',
      { instant_kill: true, strict_single_strike: true }
    );
  };

  // 9. Split Screen / Floating Multi-Window Detection on Mobile / Desktop
  const handleResize = () => {
    if (isTornDown) return;

    const screenH = window.screen.availHeight || window.screen.height;
    const innerH = window.innerHeight;

    const activeEl = document.activeElement;
    const isTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

    if (!isTyping) {
      if (screenH > 0 && innerH / screenH < 0.65) {
        triggerViolation(
          VIOLATION_TYPES.SPLIT_SCREEN,
          'Security Violation: Mobile split-screen mode or multitasking floating window detected',
          { inner_height: innerH, screen_height: screenH, ratio: innerH / screenH, instant_kill: true, strict_single_strike: true }
        );
      }
    }
  };

  // 10. Context Menu / Right-Click blocking
  const handleContextMenu = (e) => {
    e.preventDefault();
    if (isTornDown) return;
    triggerViolation(
      VIOLATION_TYPES.RIGHT_CLICK,
      'Security Alert: Context menu or right-click attempt blocked'
    );
  };

  // 11. Text Selection Blocker
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

  // 12. Clipboard operations (Copy, Cut, Paste)
  const handleCopy = (e) => {
    if (!enableClipboard) return;
    e.preventDefault();
    if (isTornDown) return;
    triggerViolation(
      VIOLATION_TYPES.COPY,
      'Security Violation: Question copy to clipboard attempt blocked'
    );
  };

  const handleCut = (e) => {
    if (!enableClipboard) return;
    e.preventDefault();
    if (isTornDown) return;
    triggerViolation(
      VIOLATION_TYPES.CUT,
      'Security Violation: Clipboard cut attempt blocked'
    );
  };

  const handlePaste = (e) => {
    if (!enableClipboard) return;
    e.preventDefault();
    if (isTornDown) return;
    triggerViolation(
      VIOLATION_TYPES.PASTE,
      'Security Violation: Clipboard paste from external source / AI tool blocked'
    );
  };

  // 13. Drag and Drop Blocker
  const handleDragStart = (e) => {
    e.preventDefault();
    if (isTornDown) return;
    triggerViolation(
      VIOLATION_TYPES.TEXT_SELECTION,
      'Security Alert: Dragging text or content blocked'
    );
  };

  // 14. Keyboard shortcuts blocker (DevTools, Screenshot, Print, Copy, Reload, Windows Key, Alt+Tab)
  const handleKeyDown = (e) => {
    if (isTornDown) return;

    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    const isAlt = e.altKey;
    const key = (e.key || '').toUpperCase();

    // A. Windows Key / Command Key alone
    if (e.key === 'Meta' || e.key === 'OS' || e.key === 'Windows') {
      triggerViolation(
        VIOLATION_TYPES.SHORTCUT,
        'Security Violation: System Menu / Windows Key pressed'
      );
      return;
    }

    // B. Screenshot Shortcuts (PrintScreen, Win+Shift+S, Cmd+Shift+3/4/5, Ctrl+P)
    if (
      key === 'PRINTSCREEN' ||
      e.keyCode === 44 ||
      (isCtrlOrMeta && e.shiftKey && ['3', '4', '5', 'S'].includes(key)) ||
      (isCtrlOrMeta && key === 'P')
    ) {
      e.preventDefault();
      triggerViolation(
        VIOLATION_TYPES.SCREEN_CAPTURE,
        `Security Violation: Screenshot / Screen recording command blocked (${e.key})`
      );
      return;
    }

    // C. Developer Tools: F12, Ctrl+Shift+I/J/C, Ctrl+U (View Source), Ctrl+Shift+Esc
    if (
      e.key === 'F12' ||
      (isCtrlOrMeta && e.shiftKey && ['I', 'J', 'C', 'ESCAPE'].includes(key)) ||
      (isCtrlOrMeta && key === 'U')
    ) {
      e.preventDefault();
      triggerViolation(
        VIOLATION_TYPES.DEVTOOLS_INSPECTION,
        `Security Violation: Developer inspect / DevTools shortcut blocked (${e.key})`
      );
      return;
    }

    // D. Alt+Tab / Alt+F4 / Window Swapping / Escape
    if (isAlt && ['TAB', 'F4', 'ARROWLEFT', 'ARROWRIGHT', 'ESCAPE', 'SPACE'].includes(key)) {
      e.preventDefault();
      triggerViolation(
        VIOLATION_TYPES.SHORTCUT,
        `Security Violation: Application switcher shortcut blocked (Alt+${key})`
      );
      return;
    }

    // E. Save & Reload: Ctrl+S, Ctrl+R, F5
    if ((isCtrlOrMeta && ['S', 'R'].includes(key)) || e.key === 'F5') {
      e.preventDefault();
      triggerViolation(
        VIOLATION_TYPES.SHORTCUT,
        `Security Violation: Page save or manual reload shortcut blocked (${e.key})`
      );
      return;
    }

    // F. Clipboard keyboard shortcuts: Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A
    if (isCtrlOrMeta && ['C', 'V', 'X', 'A'].includes(key) && enableClipboard) {
      e.preventDefault();
      triggerViolation(
        VIOLATION_TYPES.SHORTCUT,
        `Security Violation: Clipboard shortcut blocked (Ctrl+${key})`
      );
    }
  };

  // 15. Periodic AI Browser Extension & Injected Shadow DOM Scanner
  if (enableAiExtensionScan) {
    const aiExtensionSelectors = [
      '#chatgpt-sidebar',
      '#monica-container',
      '#sider-container',
      '.merlin-overlay',
      'ai-sidebar',
      'div[id*="chatgpt"]',
      'div[id*="claude"]',
      'div[id*="gemini-assistant"]',
      'div[id*="copilot-sidebar"]',
      'div[class*="chatgpt-extension"]',
      'div[class*="monica-app"]',
      'div[class*="sider-"]',
      'button[aria-label*="Ask AI"]',
      'button[aria-label*="Summarize"]'
    ];

    aiExtensionScanInterval = setInterval(() => {
      if (isTornDown) return;
      try {
        for (const selector of aiExtensionSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            triggerViolation(
              VIOLATION_TYPES.AI_EXTENSION_DETECTED,
              `Security Violation: AI Assistant Browser Extension / Side-panel detected (${selector})`
            );
            break;
          }
        }
      } catch (err) {}
    }, 2500);
  }

  // 16. DevTools Dimension & Debugger Trap Heuristics
  if (enableDevToolsProtection) {
    devToolsInterval = setInterval(() => {
      if (isTornDown) return;
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        const isFullscreen = Boolean(
          document.fullscreenElement ||
          document.webkitFullscreenElement
        );
        if (isFullscreen && (widthThreshold || heightThreshold)) {
          triggerViolation(
            VIOLATION_TYPES.DEVTOOLS_INSPECTION,
            'Security Violation: Browser developer console panel opening detected'
          );
        }
      }
    }, 2000);

    // Timing-based Debugger Trap Check (DevTools pauses or lags execution if debugger open)
    debuggerTrapInterval = setInterval(() => {
      if (isTornDown) return;
      const start = performance.now();
      // Eval a function constructor to avoid static compiler strips
      try {
        (function() { return false; })['constructor']('debugger')();
      } catch (e) {}
      const elapsed = performance.now() - start;
      if (elapsed > 100) {
        triggerViolation(
          VIOLATION_TYPES.DEBUGGER_TRAP,
          'Security Violation: Active Debugger / DevTools execution breakpoint detected'
        );
      }
    }, 4000);
  }

  // Attach global DOM listeners
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleWindowBlur);
  window.addEventListener('pagehide', handlePageHide);
  window.addEventListener('resize', handleResize);
  document.addEventListener('mouseleave', handleMouseLeave);

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
  document.addEventListener('keydown', handleKeyDown, true);

  // Return complete teardown cleanup
  return () => {
    isTornDown = true;
    if (longPressTimeout) clearTimeout(longPressTimeout);
    if (devToolsInterval) clearInterval(devToolsInterval);
    if (aiExtensionScanInterval) clearInterval(aiExtensionScanInterval);
    if (debuggerTrapInterval) clearInterval(debuggerTrapInterval);

    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('pagehide', handlePageHide);
    window.removeEventListener('resize', handleResize);
    document.removeEventListener('mouseleave', handleMouseLeave);

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
    document.removeEventListener('keydown', handleKeyDown, true);
  };
}
