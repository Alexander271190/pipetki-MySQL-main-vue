/**
 * Полное определение мобильного устройства.
 * Возвращает true для: телефонов, планшетов, iPad, узких экранов с touch.
 * Возвращает false для: десктопа (даже если окно узкое), ноутбуков без touch.
 */
export function isMobileDevice(): boolean {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';

  // 1) User-Agent мобильный/планшетный
  const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|PlayBook|Silk/i.test(ua);

  // 2) iPadOS (новые iPad определяются как Mac, но с touch)
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  // 3) Есть touch + узкий экран (страховка для гибридных устройств)
  const hasTouch = (navigator.maxTouchPoints || 0) > 0 || ('ontouchstart' in window);
  const narrowScreen = window.matchMedia('(max-width: 900px)').matches;

  return uaMobile || iPadOS || (hasTouch && narrowScreen);
}
