import { emitFxEvent } from "./fxEvents";

export type FeedbackTone = "success" | "warning" | "error";

export type FeedbackMessage = {
  id: number;
  message: string;
  tone: FeedbackTone;
};

const feedbackEvent = "smartin:feedback";
let nextFeedbackId = 1;
let lastMessage = "";
let lastMessageTime = 0;

export function notifyFeedback(message: string, tone: FeedbackTone = "success"): void {
  if (typeof window === "undefined") return;
  const normalized = message.trim().slice(0, 180);
  if (!normalized) return;
  const now = Date.now();
  if (normalized === lastMessage && now - lastMessageTime < 900) return;
  lastMessage = normalized;
  lastMessageTime = now;
  const detail: FeedbackMessage = { id: nextFeedbackId++, message: normalized, tone };
  window.dispatchEvent(new CustomEvent<FeedbackMessage>(feedbackEvent, { detail }));
  if (tone === "error") emitFxEvent("error");
}

export function subscribeToFeedback(
  listener: (message: FeedbackMessage) => void,
): () => void {
  const handleEvent = (event: Event) => {
    if (event instanceof CustomEvent && event.detail) listener(event.detail as FeedbackMessage);
  };
  window.addEventListener(feedbackEvent, handleEvent);
  return () => window.removeEventListener(feedbackEvent, handleEvent);
}

export async function copyToClipboard(value: string, label = "Contenido"): Promise<void> {
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error("El portapapeles no está disponible en este contexto.");
    }
    await navigator.clipboard.writeText(value);
    emitFxEvent("copy");
    notifyFeedback(`Se copió ${label.toLocaleLowerCase("es")} al portapapeles.`);
  } catch (error) {
    notifyFeedback("No se pudo copiar. Comprueba los permisos del navegador.", "error");
    throw error;
  }
}
