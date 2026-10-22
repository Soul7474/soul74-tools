export type FxEventType = "copy" | "error" | "section" | "palette";

const eventName = "soul74:fx-event";

export function emitFxEvent(type: FxEventType): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<FxEventType>(eventName, { detail: type }));
}

export function subscribeToFxEvents(listener: (type: FxEventType) => void): () => void {
  const handleEvent = (event: Event) => {
    if (event instanceof CustomEvent && event.detail) listener(event.detail as FxEventType);
  };
  window.addEventListener(eventName, handleEvent);
  return () => window.removeEventListener(eventName, handleEvent);
}
