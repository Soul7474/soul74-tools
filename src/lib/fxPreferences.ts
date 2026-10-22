export type FxMode = "full" | "soft" | "off";

const storageKey = "smartin-tools-fx-mode";

export function readFxMode(): FxMode {
  if (typeof window === "undefined") return "full";
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "full" || stored === "soft" || stored === "off") return stored;
  } catch {
    return defaultFxMode();
  }
  return defaultFxMode();
}

export function saveFxMode(mode: FxMode): boolean {
  try {
    window.localStorage.setItem(storageKey, mode);
    return true;
  } catch {
    return false;
  }
}

function defaultFxMode(): FxMode {
  return window.matchMedia("(max-width: 760px)").matches ? "soft" : "full";
}
