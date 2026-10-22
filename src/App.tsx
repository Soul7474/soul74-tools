import { useEffect, useState, type FormEvent } from "react";
import packageMetadata from "../package.json";
import { HashSection } from "./sections/HashSection";
import { EncodingSection } from "./sections/EncodingSection";
import { JwtSection } from "./sections/JwtSection";
import { TextRegexSection } from "./sections/TextRegexSection";
import { TimestampSection } from "./sections/TimestampSection";
import { FileInspectorSection } from "./sections/FileInspectorSection";
import { ReferenceSection } from "./sections/ReferenceSection";
import { IocAnalyzerSection } from "./sections/IocAnalyzerSection";
import { IOC_ANALYZER_EVENT } from "./lib/iocAnalyzer";
import { SysadminSection } from "./sections/SysadminSection";
import { PcapAnalyzerSection } from "./sections/PcapAnalyzerSection";
import { OverviewSection } from "./sections/OverviewSection";
import { Sidebar } from "./components/Layout";
import { CommandPalette } from "./components/CommandPalette";
import { FeedbackHost } from "./components/FeedbackHost";
import { SectionHeader } from "./components/SectionHeader";
import { NetworkAdvancedTools } from "./sections/NetworkAdvancedTools";
import { estimatePasswordStrength } from "./lib/passwordStrength";
import { appSections, type AppSectionId } from "./data/toolCatalog";
import { copyToClipboard, notifyFeedback } from "./lib/feedback";
import { emitFxEvent } from "./lib/fxEvents";
import { readFxMode, saveFxMode, type FxMode } from "./lib/fxPreferences";

type Page = AppSectionId;

type NetworkResult = {
  address: string;
  prefix: number;
  mask: string;
  wildcard: string;
  network: string;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  totalAddresses: number;
  usableHosts: number;
};

type CharacterSet = "lowercase" | "uppercase" | "numbers" | "symbols";

const characterSets: Record<CharacterSet, string> = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{}:,.?",
};

const characterOptions: { id: CharacterSet; label: string; example: string }[] =
  [
    { id: "lowercase", label: "Minúsculas", example: "a–z" },
    { id: "uppercase", label: "Mayúsculas", example: "A–Z" },
    { id: "numbers", label: "Números", example: "0–9" },
    { id: "symbols", label: "Símbolos", example: "!@#" },
  ];

function secureRandomInt(maxExclusive: number): number {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > 256) {
    throw new Error("El rango aleatorio solicitado no es válido.");
  }
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Este navegador no ofrece un generador criptográfico seguro.");
  }

  const limit = Math.floor(256 / maxExclusive) * maxExclusive;
  const bytes = new Uint8Array(1);
  do {
    globalThis.crypto.getRandomValues(bytes);
  } while (bytes[0] >= limit);
  return bytes[0] % maxExclusive;
}

function generatePassword(length: number, selectedSets: CharacterSet[]): string {
  const selectedCharacters = selectedSets.map((set) => characterSets[set]);
  const alphabet = [...new Set(selectedCharacters.join(""))];

  if (alphabet.length === 0) {
    throw new Error("Selecciona al menos un tipo de carácter.");
  }

  const password = selectedCharacters.map(
    (characters) => characters[secureRandomInt(characters.length)],
  );
  while (password.length < length) {
    password.push(alphabet[secureRandomInt(alphabet.length)]);
  }

  for (let index = password.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomInt(index + 1);
    [password[index], password[swapIndex]] = [password[swapIndex], password[index]];
  }

  return password.join("");
}

function ipv4ToNumber(address: string): number | null {
  const octets = address.split(".");
  if (
    octets.length !== 4 ||
    octets.some((octet) => !/^\d{1,3}$/.test(octet) || Number(octet) > 255)
  ) {
    return null;
  }

  return octets.reduce((value, octet) => value * 256 + Number(octet), 0);
}

function numberToIpv4(value: number): string {
  return [
    Math.floor(value / 16_777_216) % 256,
    Math.floor(value / 65_536) % 256,
    Math.floor(value / 256) % 256,
    value % 256,
  ].join(".");
}

function calculateNetwork(input: string): NetworkResult | null {
  const match = /^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/.exec(input.trim());
  if (!match) return null;

  const address = ipv4ToNumber(match[1]);
  const prefix = Number(match[2]);
  if (address === null || prefix < 0 || prefix > 32) return null;

  const totalAddresses = 2 ** (32 - prefix);
  const mask = prefix === 0 ? 0 : (0xffff_ffff << (32 - prefix)) >>> 0;
  const network = Math.floor(address / totalAddresses) * totalAddresses;
  const broadcast = network + totalAddresses - 1;
  const usableHosts = prefix < 31 ? totalAddresses - 2 : totalAddresses;
  const firstHost = prefix < 31 ? network + 1 : network;
  const lastHost = prefix < 31 ? broadcast - 1 : broadcast;
  const wildcard = 0xffff_ffff - mask;

  return {
    address: numberToIpv4(address),
    prefix,
    mask: numberToIpv4(mask),
    wildcard: numberToIpv4(wildcard),
    network: numberToIpv4(network),
    broadcast: numberToIpv4(broadcast),
    firstHost: numberToIpv4(firstHost),
    lastHost: numberToIpv4(lastHost),
    totalAddresses,
    usableHosts,
  };
}

function Icon({ name }: { name: "grid" | "network" | "key" | "info" | "arrow" }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  if (name === "network") {
    return (
      <svg {...common}>
        <rect x="9" y="3" width="6" height="6" rx="1" />
        <rect x="3" y="15" width="6" height="6" rx="1" />
        <rect x="15" y="15" width="6" height="6" rx="1" />
        <path d="M12 9v3m-6 3v-3h12v3" />
      </svg>
    );
  }
  if (name === "key") {
    return (
      <svg {...common}>
        <circle cx="8" cy="15" r="4" />
        <path d="m11 12 9-9m-3 3 3 3m-6 0 3 3" />
      </svg>
    );
  }
  if (name === "info") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5m0-8h.01" />
      </svg>
    );
  }
  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h14m-6-6 6 6-6 6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function App() {
  const [page, setPage] = useState<Page>("overview");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [fxMode, setFxMode] = useState<FxMode>(readFxMode);
  const [networkInput, setNetworkInput] = useState("192.168.1.10/24");
  const [networkResult, setNetworkResult] = useState<NetworkResult | null>(() =>
    calculateNetwork("192.168.1.10/24"),
  );
  const [networkError, setNetworkError] = useState("");
  const [passwordLength, setPasswordLength] = useState(20);
  const [selectedSets, setSelectedSets] = useState<CharacterSet[]>([
    "lowercase",
    "uppercase",
    "numbers",
    "symbols",
  ]);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [copied, setCopied] = useState("");
  const [clipboardError, setClipboardError] = useState("");
  const [iocPrefill, setIocPrefill] = useState("");
  const passwordEstimate = password ? estimatePasswordStrength(password) : null;

  const activeNav = appSections.find((section) => section.id === page) ?? appSections[0];

  function navigateTo(id: AppSectionId) {
    if (id !== page) emitFxEvent("section");
    setPage(id);
    window.scrollTo(0, 0);
  }

  function openPalette() {
    emitFxEvent("palette");
    setPaletteOpen(true);
  }

  useEffect(() => {
    function handleGlobalShortcut(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k" || event.altKey || event.shiftKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) return;
      event.preventDefault();
      setPaletteOpen((open) => {
        if (!open) emitFxEvent("palette");
        return !open;
      });
    }
    window.addEventListener("keydown", handleGlobalShortcut);
    return () => window.removeEventListener("keydown", handleGlobalShortcut);
  }, []);

  useEffect(() => {
    const handleIocNavigation = (event: Event) => {
      if (!(event instanceof CustomEvent) || typeof event.detail !== "string") return;
      setIocPrefill(event.detail);
      emitFxEvent("section");
      setPage("ioc");
      window.scrollTo(0, 0);
    };
    window.addEventListener(IOC_ANALYZER_EVENT, handleIocNavigation);
    return () => window.removeEventListener(IOC_ANALYZER_EVENT, handleIocNavigation);
  }, []);

  function submitNetwork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = calculateNetwork(networkInput);
    if (!result) {
      setNetworkResult(null);
      setNetworkError("Introduce una IPv4/CIDR válida, por ejemplo 192.168.1.10/24.");
      notifyFeedback("Introduce una IPv4/CIDR válida.", "warning");
      return;
    }
    setNetworkResult(result);
    setNetworkError("");
    notifyFeedback("Datos de red calculados localmente.");
  }

  function toggleSet(set: CharacterSet) {
    setSelectedSets((current) =>
      current.includes(set) ? current.filter((item) => item !== set) : [...current, set],
    );
    setPasswordError("");
  }

  function createPassword() {
    try {
      setPassword(generatePassword(passwordLength, selectedSets));
      setPasswordError("");
      setCopied("");
      notifyFeedback("Contraseña generada localmente.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo generar la contraseña.";
      setPasswordError(message);
      notifyFeedback(message, "error");
    }
  }

  async function copyText(value: string, kind: string) {
    try {
      await copyToClipboard(value, kind === "network" ? "Red" : "Contraseña");
      setCopied(kind);
      setClipboardError("");
      window.setTimeout(() => setCopied(""), 1800);
    } catch {
      setClipboardError("No se pudo acceder al portapapeles. Comprueba los permisos del navegador.");
    }
  }

  function updateFxMode(mode: FxMode) {
    setFxMode(mode);
    if (!saveFxMode(mode)) {
      notifyFeedback("El modo FX solo se mantendrá mientras esta página permanezca abierta.", "warning");
    }
  }

  return (
    <div className="app-shell" data-fx={fxMode} data-page={page} data-palette-open={paletteOpen ? "true" : "false"}>
      <Sidebar
        active={page}
        onSelect={navigateTo}
        onTogglePalette={openPalette}
        fxMode={fxMode}
        onFxModeChange={updateFxMode}
        paletteOpen={paletteOpen}
        version={packageMetadata.version}
      />

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><button type="button" onClick={() => navigateTo("overview")}>S0ul74 <span>// TOOLS</span></button><span className="crumb-slash">/</span><strong>{activeNav.label}</strong></div>
          <div className="topbar-right">
            <span className="local-badge"><span /> PROCESAMIENTO LOCAL</span>
            <button type="button" className="topbar-search-trigger" onClick={openPalette} aria-label="Buscar herramientas, Ctrl+K">
              <span aria-hidden="true">⌕</span><span>Buscar herramienta…</span><kbd>CTRL K</kbd>
            </button>
          </div>
        </header>

        <div className="mobile-brand">
          <span className="brand-name">S0ul74<span>// TOOLS</span></span>
          <span className="mobile-version">v{packageMetadata.version}</span>
        </div>

        <div className="content-area">
          {page === "overview" && <OverviewSection onSelect={navigateTo} onOpenPalette={openPalette} version={packageMetadata.version} />}

          {page === "network" && (
            <section className="page-view tool-page">
              <SectionHeader eyebrow={<><span className="eyebrow-line" /> NETWORK / TOOL_01</>} title={<>Network <span>lab.</span></>} description="Calculadora de subredes IPv4 y notación CIDR." status="READY" />
              <div className="network-layout">
                <div className="panel input-panel">
                  <div className="panel-heading"><div><span className="panel-kicker">01 / INPUT</span><h2>Define la red</h2></div><span className="panel-icon cyan-icon"><Icon name="network" /></span></div>
                  <form onSubmit={submitNetwork}>
                    <label htmlFor="network-input">Dirección IPv4 / CIDR</label>
                    <div className="input-with-suffix"><input id="network-input" value={networkInput} onChange={(event) => setNetworkInput(event.target.value)} placeholder="192.168.1.10/24" autoComplete="off" spellCheck={false} /><span>IPv4</span></div>
                    <div className="input-hint">Escribe una dirección y su prefijo, por ejemplo <code>10.0.0.1/8</code>.</div>
                    {networkError && <p className="error-message" role="alert">{networkError}</p>}
                    <button className="primary-button full-button" type="submit">Calcular subred <Icon name="arrow" /></button>
                  </form>
                  <div className="cidr-reference"><span className="reference-mark">i</span><span>Se admiten prefijos de <strong>/0 a /32</strong>. Las redes /31 y /32 siguen las reglas de direccionamiento modernas.</span></div>
                </div>
                <div className="panel results-panel">
                  <div className="panel-heading"><div><span className="panel-kicker">02 / OUTPUT</span><h2>Resultado</h2></div>{networkResult && <button className="text-button" onClick={() => void copyText(networkResult.network, "network")}>{copied === "network" ? "COPIADO" : "COPIAR RED"}</button>}</div>
                  {clipboardError && <p className="error-message" role="alert">{clipboardError}</p>}
                  {networkResult ? (
                    <>
                      <div className="network-summary"><div className="summary-label">DIRECCIÓN DE RED</div><div className="network-address">{networkResult.network}<span>/{networkResult.prefix}</span></div><div className="summary-badges"><span>{networkResult.usableHosts.toLocaleString("es-ES")} hosts utilizables</span><span>{networkResult.totalAddresses.toLocaleString("es-ES")} direcciones</span></div></div>
                      <div className="result-grid">
                        <ResultItem label="IP introducida" value={networkResult.address} />
                        <ResultItem label="Máscara de subred" value={networkResult.mask} />
                        <ResultItem label="Wildcard" value={networkResult.wildcard} />
                        <ResultItem label="Broadcast" value={networkResult.broadcast} />
                        <ResultItem label="Primer host" value={networkResult.firstHost} />
                        <ResultItem label="Último host" value={networkResult.lastHost} />
                      </div>
                    </>
                  ) : <div className="empty-state"><span>⌁</span><p>Introduce una dirección para ver los detalles de la subred.</p></div>}
                </div>
              </div>
              <NetworkAdvancedTools />
            </section>
          )}

          {page === "password" && (
            <section className="page-view tool-page">
              <SectionHeader eyebrow={<><span className="eyebrow-line violet-line" /> SECURITY / TOOL_02</>} title={<>Password <span className="violet-text">lab.</span></>} description="Generador seguro. La contraseña no sale de este dispositivo." status="CRYPTO READY" statusClass="violet-status" />
              <div className="password-layout">
                <div className="panel password-controls">
                  <div className="panel-heading"><div><span className="panel-kicker">01 / CONFIGURACIÓN</span><h2>Personaliza tu clave</h2></div><span className="panel-icon violet-icon"><Icon name="key" /></span></div>
                  <div className="length-heading"><label htmlFor="password-length">Longitud</label><span className="length-value">{passwordLength}<small> caracteres</small></span></div>
                  <input id="password-length" className="range-input" type="range" min="8" max="64" value={passwordLength} onChange={(event) => setPasswordLength(Number(event.target.value))} style={{ background: `linear-gradient(90deg, var(--violet) ${((passwordLength - 8) / 56) * 100}%, #2a2e3b ${((passwordLength - 8) / 56) * 100}%)` }} />
                  <div className="range-labels"><span>8</span><span>64</span></div>
                  <div className="option-heading"><span>TIPOS DE CARÁCTER</span><span>SELECCIONA AL MENOS UNO</span></div>
                  <div className="character-options">
                    {characterOptions.map((option) => (
                      <label className={`character-option ${selectedSets.includes(option.id) ? "selected" : ""}`} key={option.id}>
                        <input type="checkbox" checked={selectedSets.includes(option.id)} onChange={() => toggleSet(option.id)} />
                        <span className="custom-checkbox">{selectedSets.includes(option.id) && "✓"}</span>
                        <span className="option-label">{option.label}</span><span className="option-example">{option.example}</span>
                      </label>
                    ))}
                  </div>
                  <button className="primary-button violet-button full-button" onClick={createPassword}><span className="sparkle">✳</span> Generar contraseña <Icon name="arrow" /></button>
                  {passwordError && <p className="error-message" role="alert">{passwordError}</p>}
                  <div className="cidr-reference"><span className="reference-mark violet-mark">✓</span><span>Usa <strong>Web Crypto API</strong> y rechazo de bytes para evitar sesgo. Todo ocurre localmente.</span></div>
                </div>
                <div className="panel password-output">
                  <div className="panel-heading"><div><span className="panel-kicker">02 / TU CONTRASEÑA</span><h2>Generada localmente</h2></div><span className="output-lock">⌑</span></div>
                  {clipboardError && <p className="error-message" role="alert">{clipboardError}</p>}
                  <div className={`password-display ${password ? "has-password" : ""}`} aria-live="polite">{password || <span>Tu contraseña aparecerá aquí</span>}</div>
                  {password && <div className="strength-line"><span className="strength-bars"><i /><i /><i /><i /></span><span>GENERADA CON CSPRNG</span><span>{password.length} CARACTERES</span></div>}
                  {passwordEstimate && <div className="password-estimate" role="status"><strong>Fortaleza estimada: {passwordEstimate.strength}</strong><span>~{passwordEstimate.entropyBits.toFixed(1)} bits · alfabeto inferido: {passwordEstimate.characterPoolSize} caracteres</span><small>Estimación local orientativa; no detecta filtraciones, patrones lingüísticos ni reutilización.</small></div>}
                  <div className="password-actions">
                    <button className="primary-button violet-button full-button" onClick={createPassword}><span className="sparkle">✳</span> Generar otra <Icon name="arrow" /></button>
                    <button className="secondary-button full-button" onClick={() => void copyText(password, "password")} disabled={!password}>{copied === "password" ? "Copiada al portapapeles" : "Copiar contraseña"} <span>▣</span></button>
                  </div>
                  <div className="secure-tip"><span>◇</span><p><strong>Consejo de seguridad</strong><br />Usa una contraseña única por servicio y guárdala en un gestor de contraseñas.</p></div>
                </div>
              </div>
            </section>
          )}

          {page === "hash" && <HashSection />}
          {page === "encoding" && <EncodingSection />}
          {page === "jwt" && <JwtSection />}
          {page === "text" && <TextRegexSection />}
          {page === "ioc" && <IocAnalyzerSection initialText={iocPrefill} />}
          {page === "sysadmin" && <SysadminSection />}
          {page === "pcap" && <PcapAnalyzerSection />}
          {page === "timestamp" && <TimestampSection />}
          {page === "file" && <FileInspectorSection />}
          {page === "reference" && <ReferenceSection onNavigate={(id) => setPage(id)} />}

          {page === "about" && (
            <section className="page-view tool-page about-page">
              <div className="eyebrow"><span className="eyebrow-line" /> ABOUT / S0UL74-TOOLS</div>
              <h1>Simple, útil y <span>privado.</span></h1>
              <p className="page-description">S0ul74-Tools es un espacio de utilidades para tareas cotidianas de redes y seguridad.</p>
              <div className="about-grid">
                <div className="panel about-card"><span className="tool-icon cyan-icon"><Icon name="network" /></span><h2>Network lab</h2><p>Calcula datos de redes IPv4 en formato CIDR, desde la máscara hasta el rango de hosts.</p><button className="text-button" onClick={() => navigateTo("network")}>ABRIR HERRAMIENTA <Icon name="arrow" /></button></div>
                <div className="panel about-card"><span className="tool-icon violet-icon"><Icon name="key" /></span><h2>Password lab</h2><p>Genera contraseñas mediante Web Crypto API y procesamiento local en tu navegador.</p><button className="text-button violet-link" onClick={() => navigateTo("password")}>ABRIR HERRAMIENTA <Icon name="arrow" /></button></div>
              </div>
              <div className="privacy-note"><span className="privacy-symbol">◇</span><span><strong>Sin servicios externos.</strong> Esta versión no envía tus datos a ningún servidor ni modifica la configuración de red.</span><span className="privacy-line" /></div>
            </section>
          )}
        </div>
        <footer className="app-footer"><span>© 2026 S0ul74-Tools</span><span>HECHO PARA TRABAJAR EN LOCAL <i>●</i></span></footer>
      </main>
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} onNavigate={(id) => { navigateTo(id); setPaletteOpen(false); }} />}
      <FeedbackHost />
    </div>
  );
}

function ResultItem({ label, value }: { label: string; value: string }) {
  return <div className="result-item"><span>{label}</span><strong>{value}</strong></div>;
}

export default App;
