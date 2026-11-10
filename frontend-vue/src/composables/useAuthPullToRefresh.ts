import { onMounted, onUnmounted } from 'vue';

export function useAuthPullToRefresh() {
  if (!('ontouchstart' in window)) return;

  const THRESHOLD = 80;
  let startY = 0;
  let currentPull = 0;
  let isPulling = false;
  let isRefreshing = false;

  const getAuthContainer = () => document.getElementById('auth-container');

  function onTouchStart(e: TouchEvent) {
    if (isRefreshing) return;
    const el = getAuthContainer();
    if (!el || el.classList.contains('hidden')) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    if (scrollTop > 0) return;
    startY = e.touches[0].clientY;
    isPulling = true;
    currentPull = 0;
  }

  function onTouchMove(e: TouchEvent) {
    if (!isPulling || isRefreshing) return;
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY <= 0) { isPulling = false; currentPull = 0; return; }
    if (deltaY > 10) e.preventDefault();
    currentPull = Math.min(deltaY, THRESHOLD * 2);
  }

  function finishPull() {
    if (!isPulling) return;
    isPulling = false;
    if (currentPull >= THRESHOLD && !isRefreshing) {
      isRefreshing = true;
      location.reload();
    }
    currentPull = 0;
  }

  onMounted(() => {
    const el = getAuthContainer();
    if (!el) return;
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', finishPull, { passive: true });
    el.addEventListener('touchcancel', finishPull, { passive: true });
  });

  onUnmounted(() => {
    const el = getAuthContainer();
    if (!el) return;
    el.removeEventListener('touchstart', onTouchStart);
    el.removeEventListener('touchmove', onTouchMove);
    el.removeEventListener('touchend', finishPull);
    el.removeEventListener('touchcancel', finishPull);
  });
}
