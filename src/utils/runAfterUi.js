// src/utils/runAfterUi.js
// Safe utility to defer work until after the current UI interaction completes.
// Replaces InteractionManager.runAfterInteractions which was removed in RN 0.88+.
//
// Priority: requestIdleCallback → requestAnimationFrame+setTimeout → setTimeout

export default function runAfterUi(fn) {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(
      () => {
        try { fn(); } catch (e) { console.warn('[runAfterUi] Error in deferred task:', e); }
      },
      { timeout: 500 }
    );
  } else if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      setTimeout(() => {
        try { fn(); } catch (e) { console.warn('[runAfterUi] Error in deferred task:', e); }
      }, 0);
    });
  } else {
    setTimeout(() => {
      try { fn(); } catch (e) { console.warn('[runAfterUi] Error in deferred task:', e); }
    }, 0);
  }
}

