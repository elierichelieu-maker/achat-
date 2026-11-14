/**
 * Utilitaires de défilement vertical ultra-fluide (animation requestAnimationFrame
 * avec interruption immédiate si l'utilisateur reprend la main au doigt ou à la molette).
 */

let activeScrollAnimationId: number | null = null;

function cancelActiveScroll() {
  if (activeScrollAnimationId !== null) {
    window.cancelAnimationFrame(activeScrollAnimationId);
    activeScrollAnimationId = null;
  }
}

/**
 * Fait défiler la fenêtre de manière fluide jusqu'à la position verticale `targetY`.
 */
export function smoothScrollToY(targetY: number, durationMs = 520): void {
  if (typeof window === 'undefined') return;

  const clampedTarget = Math.max(
    0,
    Math.min(targetY, document.documentElement.scrollHeight - window.innerHeight)
  );

  // Respecte la préférence système de réduction des animations
  const prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion || durationMs <= 0) {
    cancelActiveScroll();
    window.scrollTo(0, clampedTarget);
    return;
  }

  cancelActiveScroll();

  const startY = window.scrollY || window.pageYOffset || 0;
  const distance = clampedTarget - startY;
  if (Math.abs(distance) < 2) {
    window.scrollTo(0, clampedTarget);
    return;
  }

  let startTime: number | null = null;

  // Permet à l'utilisateur d'interrompre le défilement automatique dès qu'il touche ou scrolle
  const interruptEvents: (keyof WindowEventMap)[] = ['wheel', 'touchstart', 'keydown'];
  const onUserInterrupt = () => {
    cleanupListeners();
    cancelActiveScroll();
  };
  const cleanupListeners = () => {
    interruptEvents.forEach((evt) =>
      window.removeEventListener(evt, onUserInterrupt, { passive: true } as EventListenerOptions)
    );
  };
  interruptEvents.forEach((evt) =>
    window.addEventListener(evt, onUserInterrupt, { passive: true, once: true })
  );

  // Courbe quintic ease-out pour un freinage doux et naturel
  const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

  const step = (timestamp: number) => {
    if (startTime === null) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    const eased = easeOutQuint(progress);

    window.scrollTo({ top: startY + distance * eased, behavior: 'auto' });

    if (progress < 1) {
      activeScrollAnimationId = window.requestAnimationFrame(step);
    } else {
      activeScrollAnimationId = null;
      cleanupListeners();
    }
  };

  activeScrollAnimationId = window.requestAnimationFrame(step);
}

/**
 * Fait défiler de manière fluide jusqu'à un élément DOM identifié par son `id`.
 */
export function smoothScrollToElement(elementId: string, topOffset = 16, durationMs = 520): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.getElementById(elementId);
  if (!el) return false;

  const rect = el.getBoundingClientRect();
  const currentScrollY = window.scrollY || window.pageYOffset || 0;
  const targetY = Math.max(0, rect.top + currentScrollY - topOffset);

  smoothScrollToY(targetY, durationMs);
  return true;
}
