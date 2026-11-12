import { onUnmounted } from 'vue';

export interface UseIdleLockOptions {
  idleMs?: number;
  checkIntervalMs?: number;
}

export function useIdleLock(
  onTimeout: () => void | Promise<void>,
  options: UseIdleLockOptions = {}
) {
  const IDLE_TIMEOUT_MS = options.idleMs ?? 30 * 60 * 1000;
  const CHECK_INTERVAL_MS = options.checkIntervalMs ?? 60 * 1000;

  let _idleStart = 0;
  let _idleCheckTimer: number | null = null;
  let _activityListenersAttached = false;
  let _isRunning = false;

  function _onUserActivity() {
    _idleStart = Date.now();
  }

  function start() {
    if (_isRunning) return;
    _isRunning = true;
    _idleStart = Date.now();

    _idleCheckTimer = window.setInterval(() => {
      if (!_isRunning || !_idleStart) return;
      if (Date.now() - _idleStart >= IDLE_TIMEOUT_MS) {
        stop();   
        void Promise.resolve(onTimeout()).catch(err => {
          console.error('[useIdleLock] onTimeout error:', err);
        });
      }
    }, CHECK_INTERVAL_MS);

    if (!_activityListenersAttached) {
      const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'input'];
      events.forEach(ev => document.addEventListener(ev, _onUserActivity, { passive: true }));
      _activityListenersAttached = true;
    }
  }

  function stop() {
    _isRunning = false;
    if (_idleCheckTimer) {
      clearInterval(_idleCheckTimer);
      _idleCheckTimer = null;
    }
    if (_activityListenersAttached) {
      const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'input'];
      events.forEach(ev => document.removeEventListener(ev, _onUserActivity));
      _activityListenersAttached = false;
    }
    _idleStart = 0;
  }

  function touch() { _idleStart = Date.now(); }

  onUnmounted(() => stop());

  return { start, stop, touch };
}
