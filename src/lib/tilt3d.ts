/**
 * Moteur d'effets 3D interactifs et de profondeur physique pour l'ensemble des interfaces.
 * Offre un tilt dynamique gyroscopique/souris avec reflet spéculaire 3D et réinitialisation fluide.
 */

let isInitialized = false;
let activeElement: HTMLElement | null = null;
let rafId: number | null = null;

export function init3DEffects(): () => void {
  if (isInitialized || typeof window === "undefined") {
    return () => {};
  }
  isInitialized = true;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    return () => {
      isInitialized = false;
    };
  }

  // Sélecteur des éléments bénéficiant du tilt 3D dynamique
  const TILT_SELECTOR =
    ".video-thumb-interactive, .card-3d-tilt, .liquid-glass-card, .category-card-3d";

  function findClosestTiltTarget(eventTarget: EventTarget | null): HTMLElement | null {
    if (!eventTarget) return null;
    if (eventTarget instanceof Element) {
      return eventTarget.closest<HTMLElement>(TILT_SELECTOR);
    }
    if (eventTarget instanceof Node && eventTarget.parentElement) {
      return eventTarget.parentElement.closest<HTMLElement>(TILT_SELECTOR);
    }
    return null;
  }

  function handlePointerMove(e: PointerEvent) {
    // Si c'est du touch direct (doigt sur mobile), privilégier le CSS natif pour éviter les secousses
    if (e.pointerType === "touch") return;

    const target = findClosestTiltTarget(e.target);

    if (!target) {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (activeElement) {
        resetElement(activeElement);
        activeElement = null;
      }
      return;
    }

    if (activeElement && activeElement !== target) {
      resetElement(activeElement);
    }

    activeElement = target;

    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }

    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (!activeElement) return;

      const rect = activeElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calcul des angles d'inclinaison 3D (angles doux pour un effet raffiné)
      const maxTilt = 6.5; // degrés
      const rotateX = -((y - centerY) / centerY) * maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      // Calcul des pourcentages de la lumière spéculaire
      const lightX = Math.round((x / rect.width) * 100);
      const lightY = Math.round((y / rect.height) * 100);

      activeElement.style.setProperty("--tilt-rx", `${rotateX.toFixed(2)}deg`);
      activeElement.style.setProperty("--tilt-ry", `${rotateY.toFixed(2)}deg`);
      activeElement.style.setProperty("--glare-x", `${lightX}%`);
      activeElement.style.setProperty("--glare-y", `${lightY}%`);
      activeElement.classList.add("is-tilted-3d");
    });
  }

  function handlePointerLeave(e: PointerEvent) {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    const target = findClosestTiltTarget(e.target);
    if (target) {
      resetElement(target);
    }
    if (activeElement) {
      resetElement(activeElement);
      activeElement = null;
    }
  }

  function resetElement(el: HTMLElement) {
    el.style.removeProperty("--tilt-rx");
    el.style.removeProperty("--tilt-ry");
    el.style.removeProperty("--glare-x");
    el.style.removeProperty("--glare-y");
    el.classList.remove("is-tilted-3d");
  }

  document.addEventListener("pointermove", handlePointerMove, { passive: true });
  document.addEventListener("pointerleave", handlePointerLeave, { passive: true });

  return () => {
    isInitialized = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerleave", handlePointerLeave);
  };
}
