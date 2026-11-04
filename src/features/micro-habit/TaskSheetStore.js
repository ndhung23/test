// Tiny external store so notification handling does not depend on a screen mounting first.
let pendingOpenTaskId = null;
const listeners = new Set();

export function requestOpenTask(taskId, source = 'notification') {
  pendingOpenTaskId = taskId || null;
  console.info('[TaskSheet]', { at: new Date().toISOString(), stage: 'received', taskId, source });
  listeners.forEach((listener) => listener(pendingOpenTaskId));
}

export function clearPendingTask() {
  pendingOpenTaskId = null;
  listeners.forEach((listener) => listener(null));
}

export function getPendingTaskId() { return pendingOpenTaskId; }
export function subscribeTaskSheet(listener) { listeners.add(listener); return () => listeners.delete(listener); }
