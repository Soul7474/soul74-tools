import { useEffect, useState } from "react";
import type { AppSectionId } from "../data/toolCatalog";
import type { FxMode } from "../lib/fxPreferences";
import { subscribeToFxEvents, type FxEventType } from "../lib/fxEvents";
import { usePointerFX } from "../lib/usePointerFX";
import { CodeRain } from "./CodeRain";

export function BackgroundFX({
  activeSection,
  mode,
  paletteOpen,
}: {
  activeSection: AppSectionId;
  mode: FxMode;
  paletteOpen: boolean;
}) {
  const [fxEvent, setFxEvent] = useState<FxEventType | "idle">("idle");
  usePointerFX(mode !== "off");

  useEffect(() => {
    let timeout = 0;
    const unsubscribe = subscribeToFxEvents((event) => {
      setFxEvent(event);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setFxEvent("idle"), event === "section" ? 340 : 620);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <div
      className="fx-background"
      data-section={activeSection}
      data-dashboard={activeSection === "overview" ? "true" : "false"}
      data-fx-event={fxEvent}
      data-palette-open={paletteOpen ? "true" : "false"}
      aria-hidden="true"
    >
      <div className="fx-base" />
      <div className="fx-grid" />
      <div className="fx-floor" />
      <CodeRain activeSection={activeSection} mode={mode} paletteOpen={paletteOpen} />
      <div className="fx-scanlines" />
      <div className="fx-vignette" />
      <div className="fx-light" />
    </div>
  );
}
