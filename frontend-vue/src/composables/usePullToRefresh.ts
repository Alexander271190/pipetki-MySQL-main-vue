import { onMounted, onUnmounted } from 'vue';
import { usePipettesStore } from '@/stores/pipettes';
import { useToastStore } from '@/stores/toast';

export function usePullToRefresh() {
  const pip = usePipettesStore();
  const toast = useToastStore();

  const THRESHOLD = 80;
  const MAX_PULL = 150;
  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  let startY = 0;
  let currentPull = 0;
  let isPulling = false;
  let isRefreshing = false;

  function getScrollTop(): number {
    if (isMobile()) return window.scrollY || document.documentElement.scrollTop || 0;
    const el = document.querySelector('.table-wrapper');
    return el ? el.scrollTop : 0;
  }

  function onTouchStart(e: TouchEvent) {
    if (isRefreshing) return;
    if (!isMobile() && !(e.target as HTMLElement).closest('.table-wrapper')) return;
    if (getScrollTop() <= 0) {
      startY = e.touches[0].clientY;
      isPulling = true;
      currentPull = 0;
    }
  }

  function onTouchMove(e: TouchEvent) {
    if (!isPulling || isRefreshing) return;
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY <= 0) { isPulling = false; currentPull = 0; return; }
    if (deltaY > 15) e.preventDefault();
    currentPull = Math.min(deltaY, MAX_PULL);
  }

  async function finishPull() {
    if (!isPulling) return;
    isPulling = false;
    if (currentPull >= THRESHOLD && !isRefreshing) {
      isRefreshing = true;
      try {
        await pip.loadPaged();
        toast.success('Данные обновлены');
      } finally {
        isRefreshing = false;
        currentPull = 0;
      }
    } else currentPull = 0;
  }

  onMounted(() => {
    if (!('ontouchstart' in window)) return;
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', finishPull, { passive: true });
    document.addEventListener('touchcancel', finishPull, { passive: true });
  });

  onUnmounted(() => {
    document.removeEventListener('touchstart', onTouchStart);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', finishPull);
    document.removeEventListener('touchcancel', finishPull);
  });
}
