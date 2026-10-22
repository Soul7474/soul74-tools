import { useEffect, useState, type PointerEvent, type ReactNode } from "react";

export function GlitchTitle({ children, className = "", id }: { children: string; className?: string; id?: string }) {
  return (
    <h1 id={id} className={`glitch-title ${className}`} data-text={children}>
      {children}
    </h1>
  );
}

export function TypeReveal({ text }: { text: string }) {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisibleText(text);
      return;
    }
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisibleText(text.slice(0, index));
      if (index >= text.length) window.clearInterval(timer);
    }, 12);
    return () => window.clearInterval(timer);
  }, [text]);

  return <span className="type-reveal" aria-label={text} aria-live="off">{visibleText}</span>;
}

export function TiltPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  function updateTilt(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    event.currentTarget.style.setProperty("--card-tilt-x", `${((0.5 - y) * 12).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--card-tilt-y", `${((x - 0.5) * 12).toFixed(2)}deg`);
    event.currentTarget.style.setProperty("--card-light-x", `${(x * 100).toFixed(2)}%`);
    event.currentTarget.style.setProperty("--card-light-y", `${(y * 100).toFixed(2)}%`);
  }

  function resetTilt(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--card-tilt-x", "0deg");
    event.currentTarget.style.setProperty("--card-tilt-y", "0deg");
  }

  return (
    <div
      className={`tilt-panel ${className}`}
      onPointerMove={updateTilt}
      onPointerLeave={resetTilt}
    >
      {children}
    </div>
  );
}
