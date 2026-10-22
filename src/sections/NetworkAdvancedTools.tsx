import { useMemo, useState } from "react";
import { Panel } from "../components/Layout";
import { copyToClipboard } from "../lib/feedback";
import {
  analyzeIpv6,
  convertIpv4,
  isIpv4InCidr,
  subnetByCount,
  vlsmSubnets,
} from "../lib/network";

function SubnetTable({ rows }: { rows: ReturnType<typeof subnetByCount> }) {
  if (!rows.length) return <p className="microcopy">No hay resultados. Comprueba la red, capacidad y parámetros.</p>;
  return (
    <div className="network-table-wrap">
      <table className="network-table">
        <thead><tr><th>Red</th><th>Máscara</th><th>Hosts usables</th><th>Broadcast</th><th>Desperdicio</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.network}/${row.prefix}`}>
              <td><code>{row.network}/{row.prefix}</code></td>
              <td><code>{row.mask}</code></td>
              <td>{row.usableHosts.toLocaleString("es-ES")}</td>
              <td><code>{row.broadcast}</code></td>
              <td>{row.waste}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NetworkAdvancedTools() {
  const [baseNetwork, setBaseNetwork] = useState("192.168.1.0/24");
  const [subnetCount, setSubnetCount] = useState("4");
  const [hostRequirements, setHostRequirements] = useState("50, 25, 10");
  const [ipToCheck, setIpToCheck] = useState("192.168.1.42");
  const [cidrToCheck, setCidrToCheck] = useState("192.168.1.0/24");
  const [ipv4Input, setIpv4Input] = useState("192.168.1.1");
  const [ipv6Input, setIpv6Input] = useState("2001:db8::1/32");
  const [copyMessage, setCopyMessage] = useState("");

  const count = Number(subnetCount);
  const countResults = useMemo(
    () => subnetByCount(baseNetwork, count),
    [baseNetwork, count],
  );
  const requirements = hostRequirements.split(",").map((value) => value.trim());
  const parsedRequirements = requirements.map((value) => Number(value));
  const requirementsValid = requirements.every((value) => /^\d+$/.test(value)) &&
    parsedRequirements.length > 0 &&
    parsedRequirements.length <= 128 &&
    parsedRequirements.every((value) => Number.isSafeInteger(value) && value > 0);
  const vlsmResults = useMemo(
    () => requirementsValid ? vlsmSubnets(baseNetwork, parsedRequirements) : [],
    [baseNetwork, requirementsValid, hostRequirements],
  );
  const membership = useMemo(
    () => isIpv4InCidr(ipToCheck, cidrToCheck),
    [ipToCheck, cidrToCheck],
  );
  const ipv4 = useMemo(() => convertIpv4(ipv4Input), [ipv4Input]);
  const ipv6 = useMemo(() => analyzeIpv6(ipv6Input), [ipv6Input]);

  async function copy(value: string) {
    try {
      await copyToClipboard(value, "resultado de red");
      setCopyMessage("Resultado copiado.");
    } catch {
      setCopyMessage("No se pudo copiar. Comprueba los permisos del navegador.");
    }
  }

  return (
    <section className="network-advanced" aria-label="Herramientas avanzadas de red">
      <Panel title="Subdivisión por cantidad" subtitle="03 / SUBNETTING">
        <label className="field-label" htmlFor="network-subnet-base">Red base IPv4 / CIDR</label>
        <input id="network-subnet-base" className="field-input" value={baseNetwork} onChange={(event) => setBaseNetwork(event.target.value)} />
        <label className="field-label" htmlFor="network-subnet-count">Número de subredes (1–256)</label>
        <input id="network-subnet-count" className="field-input" type="number" min="1" max="256" step="1" value={subnetCount} onChange={(event) => setSubnetCount(event.target.value)} />
        <SubnetTable rows={countResults} />
        {countResults.length > 0 && <p className="microcopy">Cada subred usa el mismo prefijo; el espacio de red restante que no cubren las subredes solicitadas queda sin asignar.</p>}
      </Panel>

      <Panel title="VLSM por hosts requeridos" subtitle="04 / VLSM">
        <label className="field-label" htmlFor="network-vlsm-hosts">Hosts utilizables por subred, separados por coma</label>
        <input id="network-vlsm-hosts" className="field-input" value={hostRequirements} onChange={(event) => setHostRequirements(event.target.value)} placeholder="50, 25, 10" />
        {!requirementsValid && <p className="error-message" role="alert">Introduce entre 1 y 128 cantidades enteras de hosts, todas mayores que cero.</p>}
        {requirementsValid && vlsmResults.length === 0 && <p className="error-message" role="status">Las subredes solicitadas no caben en la red base o la entrada no es válida.</p>}
        <SubnetTable rows={vlsmResults} />
        {vlsmResults.length > 0 && <p className="microcopy">Asignación VLSM ordenada de mayor a menor necesidad. No se asignan subredes fuera de la red base.</p>}
      </Panel>

      <Panel title="Comprobar pertenencia IPv4" subtitle="05 / MEMBERSHIP">
        <div className="network-inline-fields">
          <label className="file-control">Dirección IP<input className="field-input" value={ipToCheck} onChange={(event) => setIpToCheck(event.target.value)} /></label>
          <label className="file-control">Red / CIDR<input className="field-input" value={cidrToCheck} onChange={(event) => setCidrToCheck(event.target.value)} /></label>
        </div>
        <p className={`network-membership ${isValidIpv4Input(ipToCheck) && isValidCidrInput(cidrToCheck) ? membership ? "is-member" : "is-not-member" : ""}`} role="status">
          {isValidIpv4Input(ipToCheck) && isValidCidrInput(cidrToCheck)
            ? membership ? "La IP pertenece a la red indicada." : "La IP no pertenece a la red indicada."
            : "Introduce una IPv4 y una red/CIDR válidas."}
        </p>
      </Panel>

      <Panel title="Conversión IPv4" subtitle="06 / ADDRESS FORMAT">
        <label className="field-label" htmlFor="network-ipv4-convert">Dirección IPv4</label>
        <input id="network-ipv4-convert" className="field-input" value={ipv4Input} onChange={(event) => setIpv4Input(event.target.value)} />
        {ipv4 ? (
          <div className="network-conversion-results">
            <ConversionResult label="Decimal punteado" value={ipv4.decimal} onCopy={() => void copy(ipv4.decimal)} />
            <ConversionResult label="Hexadecimal" value={ipv4.hexadecimal} onCopy={() => void copy(ipv4.hexadecimal)} />
            <ConversionResult label="Binario por octeto" value={ipv4.binary} onCopy={() => void copy(ipv4.binary)} />
            <ConversionResult label="Entero sin signo de 32 bits" value={ipv4.integer.toString()} onCopy={() => void copy(ipv4.integer.toString())} />
          </div>
        ) : <p className="error-message" role="alert">Dirección IPv4 no válida.</p>}
      </Panel>

      <Panel title="IPv6 expandir / comprimir" subtitle="07 / IPV6">
        <label className="field-label" htmlFor="network-ipv6">Dirección IPv6 opcionalmente con prefijo</label>
        <input id="network-ipv6" className="field-input" value={ipv6Input} onChange={(event) => setIpv6Input(event.target.value)} placeholder="2001:db8::1/32" />
        {ipv6 ? (
          <div className="network-conversion-results">
            <ConversionResult label="Forma expandida" value={ipv6.expanded} onCopy={() => void copy(ipv6.expanded)} />
            <ConversionResult label="Forma comprimida" value={ipv6.compressed} onCopy={() => void copy(ipv6.compressed)} />
            <ConversionResult label="Red / prefijo" value={`${ipv6.network}/${ipv6.prefix}`} onCopy={() => void copy(`${ipv6.network}/${ipv6.prefix}`)} />
            <div className="result-item"><span>Tipo de dirección</span><strong>{ipv6.type}</strong></div>
          </div>
        ) : <p className="error-message" role="alert">IPv6 o prefijo no válido.</p>}
        <p className="notice">La clasificación es local por rango de dirección. 2001:db8::/32 se etiqueta como documentación; “global” no garantiza que una IP sea enrutable o accesible.</p>
      </Panel>
      {copyMessage && <p className="status-message" role="status">{copyMessage}</p>}
    </section>
  );
}

function isValidIpv4Input(value: string): boolean {
  return convertIpv4(value) !== null;
}

function isValidCidrInput(value: string): boolean {
  return subnetByCount(value, 1).length > 0;
}

function ConversionResult({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="result-item">
      <span>{label}</span>
      <strong>{value}</strong>
      <button type="button" className="text-button" onClick={onCopy} aria-label={`Copiar ${label}`}>COPIAR</button>
    </div>
  );
}
