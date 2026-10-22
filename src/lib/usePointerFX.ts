import { useEffect } from "react";

export function usePointerFX(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let listening = false;
    const root = document.documentElement;
    const updatePointer = (event: PointerEvent) => {
      pointerX = (event.clientX / window.innerWidth) * 100;
      pointerY = (event.clientY / window.innerHeight) * 100;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        root.style.setProperty("--mx", `${pointerX.toFixed(2)}%`);
        root.style.setProperty("--my", `${pointerY.toFixed(2)}%`);
        frame = 0;
      });
    };
    const updateListener = () => {
      const shouldListen = finePointer.matches && !reducedMotion.matches;
      if (shouldListen === listening) return;
      listening = shouldListen;
      if (listening) {
        window.addEventListener("pointermove", updatePointer, { passive: true });
      } else {
        window.removeEventListener("pointermove", updatePointer);
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    updateListener();
    finePointer.addEventListener("change", updateListener);
    reducedMotion.addEventListener("change", updateListener);
    return () => {
      window.removeEventListener("pointermove", updatePointer);
      finePointer.removeEventListener("change", updateListener);
      reducedMotion.removeEventListener("change", updateListener);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [enabled]);
}
