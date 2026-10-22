import { useEffect, useRef } from "react";
import type { AppSectionId } from "../data/toolCatalog";
import type { FxMode } from "../lib/fxPreferences";

type RainColor = { red: number; green: number; blue: number };

const sectionColors: Record<AppSectionId, RainColor> = {
  overview: { red: 67, green: 232, blue: 255 },
  network: { red: 67, green: 232, blue: 255 },
  password: { red: 167, green: 139, blue: 250 },
  hash: { red: 140, green: 255, blue: 176 },
  encoding: { red: 255, green: 79, blue: 216 },
  jwt: { red: 167, green: 139, blue: 250 },
  text: { red: 67, green: 232, blue: 255 },
  ioc: { red: 167, green: 139, blue: 250 },
  sysadmin: { red: 140, green: 255, blue: 176 },
  pcap: { red: 67, green: 232, blue: 255 },
  timestamp: { red: 255, green: 189, blue: 105 },
  file: { red: 140, green: 255, blue: 176 },
  reference: { red: 167, green: 139, blue: 250 },
  about: { red: 67, green: 232, blue: 255 },
};

const glyphs = Array.from("0123456789ABCDEFｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ<>[]{}=+-*/");
const terms = ["SHA256", "JWT", "CIDR", "UTF-8", "HEX", "LOCAL"];

export function CodeRain({ activeSection, mode, paletteOpen }: { activeSection: AppSectionId; mode: FxMode; paletteOpen: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paletteOpenRef = useRef(paletteOpen);
  paletteOpenRef.current = paletteOpen;

  useEffect(() => {
    const canvasReference = canvasRef.current;
    if (canvasReference === null || mode === "off") return;
    const canvas: HTMLCanvasElement = canvasReference;
    const drawingContext = canvas.getContext("2d");
    if (drawingContext === null) return;
    const context: CanvasRenderingContext2D = drawingContext;

    const color = sectionColors[activeSection];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const frameInterval = 1000 / 30;
    let columns: Array<{ y: number; speed: number; nextTerm: number }> = [];
    let width = 0;
    let height = 0;
    let cellSize = 18;
    let fontSize = 12;
    let pixelRatio = 1;
    let lastFrame = 0;
    let animationFrame = 0;
    let resizeTimer = 0;
    let isHidden = document.hidden;

    function resizeCanvas() {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      width = viewportWidth;
      height = viewportHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      cellSize = viewportWidth < 640 ? 29 : mode === "soft" ? 27 : 18;
      fontSize = Math.max(10, Math.min(14, cellSize * 0.68));
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.font = `${fontSize}px ${getComputedStyle(document.documentElement).getPropertyValue("--mono") || "monospace"}`;
      columns = Array.from({ length: Math.ceil(width / cellSize) }, () => ({
        y: Math.random() * height,
        speed: (0.35 + Math.random() * 0.7) * (mode === "soft" ? 0.65 : 1) * (paletteOpenRef.current ? 0.5 : 1),
        nextTerm: 180 + Math.floor(Math.random() * 900),
      }));
      drawStaticFrame();
    }

    function drawStaticFrame() {
      context.clearRect(0, 0, width, height);
      context.font = `${fontSize}px ${getComputedStyle(document.documentElement).getPropertyValue("--mono") || "monospace"}`;
      context.textBaseline = "top";
      columns.forEach((column, index) => {
        if (Math.random() > 0.18) return;
        const x = index * cellSize;
        context.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.24)`;
        context.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], x, column.y);
      });
    }

    function drawFrame(timestamp: number) {
      if (isHidden || reducedMotion.matches || mode === "off") return;
      if (timestamp - lastFrame >= frameInterval) {
        const frameScale = lastFrame ? Math.min((timestamp - lastFrame) / frameInterval, 2) : 1;
        lastFrame = timestamp;
        context.fillStyle = "rgba(8, 10, 18, 0.16)";
        context.fillRect(0, 0, width, height);
        context.textBaseline = "top";
        columns.forEach((column, index) => {
          const x = index * cellSize;
          const y = column.y;
          context.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.76)`;
          context.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], x, y);
          if (column.nextTerm <= 0 && x + 70 < width) {
            context.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.48)`;
            context.fillText(terms[Math.floor(Math.random() * terms.length)], x, y + cellSize);
            column.nextTerm = 800 + Math.floor(Math.random() * 2400);
          }
          column.nextTerm -= 1;
          column.y += column.speed * cellSize * 0.1 * frameScale;
          if (column.y > height + cellSize) {
            column.y = -Math.random() * height * 0.2;
            column.speed = (0.35 + Math.random() * 0.7) * (mode === "soft" ? 0.65 : 1) * (paletteOpenRef.current ? 0.5 : 1);
          }
        });
      }
      animationFrame = window.requestAnimationFrame(drawFrame);
    }

    function startAnimation() {
      if (!isHidden && !reducedMotion.matches && mode !== "off" && !animationFrame) {
        animationFrame = window.requestAnimationFrame(drawFrame);
      }
    }

    function handleVisibilityChange() {
      isHidden = document.hidden;
      if (isHidden) {
        if (animationFrame) window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      } else {
        lastFrame = 0;
        if (reducedMotion.matches) drawStaticFrame();
        else startAnimation();
      }
    }

    function handleMotionPreferenceChange() {
      if (reducedMotion.matches) {
        if (animationFrame) window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
        drawStaticFrame();
      } else {
        lastFrame = 0;
        startAnimation();
      }
    }

    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resizeCanvas();
        if (!reducedMotion.matches) startAnimation();
      }, 120);
    };

    resizeCanvas();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("resize", handleResize, { passive: true });
    reducedMotion.addEventListener("change", handleMotionPreferenceChange);
    if (!reducedMotion.matches) startAnimation();

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(resizeTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("resize", handleResize);
      reducedMotion.removeEventListener("change", handleMotionPreferenceChange);
      context.clearRect(0, 0, width, height);
    };
  }, [activeSection, mode]);

  return <canvas className="fx-code-rain" ref={canvasRef} aria-hidden="true" />;
}
