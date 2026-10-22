import { useMemo, useState, type ChangeEvent } from "react";
import { SectionHeader } from "../components/SectionHeader";
import {
  analyzePcapInWorker,
  filterPcapPackets,
  formatPcapHexDump,
  PCAP_FILE_SIZE_LIMIT,
  type PcapAnalysis,
  type PcapFilters,
  type PcapPacket,
} from "../lib/pcapAnalyzer";

const PAGE_SIZE = 50;

function durationLabel(milliseconds: number): string {
  if (milliseconds < 1000) return `${milliseconds.toFixed(3)} ms`;
  return `${(milliseconds / 1000).toFixed(3)} s`;
}

export function PcapAnalyzerSection() {
  const [analysis, setAnalysis] = useState<PcapAnalysis | null>(null);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [selectedPacket, setSelectedPacket] = useState<PcapPacket | null>(null);
  const [filteredPackets, setFilteredPackets] = useState<PcapPacket[]>([]);
  const [filters, setFilters] = useState<PcapFilters>({ ip: "", port: "", protocol: "" });
  const [page, setPage] = useState(0);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const currentPackets = useMemo(
    () => filteredPackets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredPackets, page],
  );
  const pageCount = Math.ceil(filteredPackets.length / PAGE_SIZE);

  async function loadCapture(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > PCAP_FILE_SIZE_LIMIT) {
      setAnalysis(null);
      setBuffer(null);
      setFilteredPackets([]);
      setSelectedPacket(null);
      setFileName("");
      setError(`El archivo supera el límite de ${Math.floor(PCAP_FILE_SIZE_LIMIT / 1024 / 1024)} MiB. Divide o reduce la captura antes de analizarla.`);
      event.target.value = "";
      return;
    }
    setBusy(true);
    setError("");
    setAnalysis(null);
    setBuffer(null);
    setFilteredPackets([]);
    setSelectedPacket(null);
    setFileName("");
    try {
      const result = await analyzePcapInWorker(await file.arrayBuffer());
      setAnalysis(result.analysis);
      setBuffer(result.buffer);
      setFilteredPackets(result.analysis.packets);
      setSelectedPacket(result.analysis.packets[0] ?? null);
      setFileName(file.name);
      setPage(0);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo procesar la captura PCAP local.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  function applyFilters() {
    if (!analysis) return;
    try {
      const result = filterPcapPackets(analysis.packets, filters);
      setFilteredPackets(result);
      setSelectedPacket(result[0] ?? null);
      setPage(0);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudieron aplicar los filtros de paquetes.");
    }
  }

  return (
    <section className="page-view tool-page lab-page pcap-page">
      <SectionHeader
        eyebrow={<><span className="eyebrow-line violet-line" /> PCAP / OFFLINE FORENSICS</>}
        title={<>PCAP <span className="violet-text">analyzer.</span></>}
        description="Inspección local de capturas clásicas Ethernet; el archivo nunca se sube ni se envía a un servicio."
        status="LOCAL WORKER"
        statusClass="violet-status"
      />
      <div className="notice notice-warning">Sin captura en directo, sin reensamblado completo de flujos TCP y sin descifrado. PCAPNG no está soportado todavía. La lectura de HTTP y SNI es básica y solo funciona si el contenido correspondiente está presente en un paquete capturado.</div>
      <section className="panel pcap-input-panel">
        <div className="panel-heading"><div><span className="panel-kicker">01 / CAPTURE INPUT</span><h2>Archivo PCAP clásico</h2></div><span className="tool-status">ETHERNET / LINKTYPE 1</span></div>
        <label className="field-label" htmlFor="pcap-file">Seleccionar captura local (máximo {Math.floor(PCAP_FILE_SIZE_LIMIT / 1024 / 1024)} MiB)</label>
        <input id="pcap-file" className="field-input file-input" type="file" accept=".pcap,.cap,application/vnd.tcpdump.pcap" onChange={(event) => void loadCapture(event)} />
        {fileName && <p className="microcopy">Captura en memoria: {fileName}</p>}
        {busy && <p className="microcopy" role="status">Parseando en Web Worker local…</p>}
        {error && <p className="error-message" role="alert">{error}</p>}
        <p className="microcopy">Se admiten PCAP clásico little/big endian, micro/nanosegundos. Si el archivo es PCAPNG se mostrará una indicación clara.</p>
      </section>

      {analysis && (
        <section className="pcap-results" aria-live="polite">
          <div className="pcap-summary-grid">
            <article className="panel pcap-stat"><span>PAQUETES</span><strong>{analysis.summary.packetCount.toLocaleString("es-ES")}</strong></article>
            <article className="panel pcap-stat"><span>DURACIÓN</span><strong>{durationLabel(analysis.summary.durationMilliseconds)}</strong></article>
            <article className="panel pcap-stat"><span>BYTE ORDER</span><strong>{analysis.summary.byteOrder}</strong><small>{analysis.summary.timestampResolution}</small></article>
            <article className="panel pcap-stat"><span>VISIBLE</span><strong>{filteredPackets.length.toLocaleString("es-ES")}</strong><small>tras filtros</small></article>
          </div>
          {analysis.summary.warnings.map((warning, index) => <p className="notice notice-warning" role="status" key={`${warning}-${index}`}>{warning}</p>)}
          <div className="pcap-overview-grid">
            <section className="panel pcap-overview-panel"><div className="panel-heading"><div><span className="panel-kicker">PROTOCOL DISTRIBUTION</span><h2>Protocolos</h2></div></div>{analysis.summary.protocolDistribution.length ? analysis.summary.protocolDistribution.map(({ protocol, count }) => <div className="pcap-stat-row" key={protocol}><span>{protocol}</span><strong>{count}</strong></div>) : <p className="microcopy">Sin paquetes.</p>}</section>
            <section className="panel pcap-overview-panel"><div className="panel-heading"><div><span className="panel-kicker">TOP TALKERS</span><h2>Direcciones</h2></div></div>{analysis.summary.topTalkers.length ? analysis.summary.topTalkers.slice(0, 8).map((talker) => <div className="pcap-stat-row" key={talker.address}><code>{talker.address}</code><span>{talker.packets} pkt · {talker.bytes.toLocaleString("es-ES")} B</span></div>) : <p className="microcopy">Sin direcciones parseadas.</p>}</section>
          </div>
          <section className="panel pcap-flow-panel"><div className="panel-heading"><div><span className="panel-kicker">5-TUPLE / DIRECTIONAL</span><h2>Flujos</h2></div></div><div className="pcap-flow-list">{analysis.summary.flows.slice(0, 20).map((flow) => <div className="pcap-flow-row" key={flow.tuple}><code>{flow.tuple}</code><span>{flow.packets} pkt · {flow.bytes.toLocaleString("es-ES")} B</span></div>)}</div></section>

          <section className="panel pcap-packets-panel">
            <div className="panel-heading"><div><span className="panel-kicker">PACKET BROWSER</span><h2>Paquetes</h2></div><span className="live-counter">{filteredPackets.length.toLocaleString("es-ES")} resultados</span></div>
            <div className="pcap-filters">
              <label className="file-control">IP<input className="field-input" value={filters.ip ?? ""} onChange={(event) => setFilters((current) => ({ ...current, ip: event.target.value }))} placeholder="IPv4 o IPv6" /></label>
              <label className="file-control">Puerto<input className="field-input" inputMode="numeric" value={filters.port ?? ""} onChange={(event) => setFilters((current) => ({ ...current, port: event.target.value }))} placeholder="443" /></label>
              <label className="file-control">Protocolo<input className="field-input" value={filters.protocol ?? ""} onChange={(event) => setFilters((current) => ({ ...current, protocol: event.target.value }))} placeholder="TCP / DNS / TLS" /></label>
              <button type="button" className="primary-button" onClick={applyFilters}>Filtrar paquetes</button>
              <button type="button" className="secondary-button" onClick={() => { setFilters({ ip: "", port: "", protocol: "" }); setFilteredPackets(analysis.packets); setSelectedPacket(analysis.packets[0] ?? null); setPage(0); }}>Limpiar filtros</button>
            </div>
            <div className="pcap-table-wrap"><table className="pcap-table"><thead><tr><th>#</th><th>Fecha</th><th>Origen</th><th>Destino</th><th>Protocolo</th><th>Longitud</th><th>Resumen</th><th>Detalle</th></tr></thead><tbody>
              {currentPackets.map((packet) => <tr key={packet.index} className={selectedPacket?.index === packet.index ? "selected" : ""}>
                <td>{packet.index}</td><td>{packet.timestamp === null ? "—" : new Date(packet.timestamp).toLocaleString()}</td>
                <td>{packet.sourceIp || packet.sourceMac || "—"}{packet.sourcePort !== null ? `:${packet.sourcePort}` : ""}</td>
                <td>{packet.destinationIp || packet.destinationMac || "—"}{packet.destinationPort !== null ? `:${packet.destinationPort}` : ""}</td>
                <td>{packet.applicationProtocol ? `${packet.protocol} · ${packet.applicationProtocol}` : packet.protocol}</td>
                <td>{packet.capturedLength}/{packet.originalLength}</td><td><code>{packet.summary}</code></td>
                <td><button type="button" className="text-button" onClick={() => setSelectedPacket(packet)}>Ver</button></td>
              </tr>)}
            </tbody></table></div>
            <div className="pcap-pagination"><span>{filteredPackets.length ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filteredPackets.length)} de ${filteredPackets.length}` : "Sin paquetes que coincidan"}</span><div><button type="button" className="secondary-button" disabled={page <= 0} onClick={() => setPage((current) => current - 1)}>Anterior</button><button type="button" className="secondary-button" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => current + 1)}>Siguiente</button></div></div>
          </section>

          {selectedPacket && buffer && <section className="panel pcap-detail-panel">
            <div className="panel-heading"><div><span className="panel-kicker">SELECTED PACKET / {selectedPacket.index}</span><h2>Detalle de paquete</h2></div></div>
            <div className="pcap-detail-grid">
              <div><span>Ethernet</span><code>{selectedPacket.sourceMac || "—"} → {selectedPacket.destinationMac || "—"}</code></div>
              <div><span>VLAN</span><code>{selectedPacket.vlanIds.length ? selectedPacket.vlanIds.join(", ") : "—"}</code></div>
              <div><span>Red / transporte</span><code>{selectedPacket.protocol}</code></div>
              <div><span>Aplicación</span><code>{selectedPacket.dnsSummary || selectedPacket.httpLine || (selectedPacket.tlsSni ? `SNI ${selectedPacket.tlsSni}` : "—")}</code></div>
            </div>
            <label className="field-label" htmlFor="pcap-hex">Volcado hexadecimal (offsets relativos al paquete)</label>
            <pre id="pcap-hex" className="pcap-hex-dump">{formatPcapHexDump(buffer, selectedPacket)}</pre>
          </section>}
        </section>
      )}
      <p className="notice notice-warning">El análisis es parcial y de solo lectura: no reensambla flujos TCP, no descifra TLS, no captura tráfico y no realiza consultas externas. Un paquete truncado puede limitar los campos y la detección de aplicación.</p>
    </section>
  );
}
