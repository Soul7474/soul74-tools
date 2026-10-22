import { useEffect, useState } from "react";
import { subscribeToFeedback, type FeedbackMessage } from "../lib/feedback";

export function FeedbackHost() {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);

  useEffect(() => {
    const timers = new Map<number, number>();
    const unsubscribe = subscribeToFeedback((message) => {
      setMessages((current) => [...current.filter((item) => item.id !== message.id), message].slice(-3));
      const timer = window.setTimeout(() => {
        setMessages((current) => current.filter((item) => item.id !== message.id));
        timers.delete(message.id);
      }, 3600);
      timers.set(message.id, timer);
    });
    return () => {
      unsubscribe();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  if (!messages.length) return null;
  return (
    <div className="feedback-host" aria-label="Notificaciones">
      {messages.map((message) => (
        <div
          className={`feedback-toast feedback-${message.tone}`}
          key={message.id}
          role={message.tone === "error" ? "alert" : "status"}
          aria-live={message.tone === "error" ? "assertive" : "polite"}
        >
          <span className="feedback-icon" aria-hidden="true">{message.tone === "success" ? "✓" : message.tone === "warning" ? "!" : "×"}</span>
          <span>{message.message}</span>
          <button type="button" onClick={() => setMessages((current) => current.filter((item) => item.id !== message.id))} aria-label="Cerrar notificación">×</button>
        </div>
      ))}
    </div>
  );
}
