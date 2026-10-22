import { useMemo, useState } from "react";
import { calculateNetworkSummary, subnetByCount, vlsmSubnets } from "../lib/network";

export function NetworkSection() {
  const [cidrInput, setCidrInput] = useState("192.168.1.130/24");
  const [subnetCount, setSubnetCount] = useState(4);
  const [vlsmInput, setVlsmInput] = useState("50,25,10");

  const summary = useMemo(() => calculateNetworkSummary(cidrInput), [cidrInput]);
  const subnetResults = useMemo(() => subnetByCount(cidrInput, subnetCount), [cidrInput, subnetCount]);
  const vlsmResults = useMemo(() => vlsmSubnets(cidrInput, vlsmInput.split(",").map((value) => Number(value.trim())).filter((value) => !Number.isNaN(value))), [cidrInput, vlsmInput]);

  return (
    <section className="page-view">
      <div className="section-header">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> NETWORK LAB</div>
          <h1>IPv4, CIDR and subnetting.</h1>
        </div>
      </div>

      <div className="grid-two">
        <div className="panel">
          <div className="panel-heading"><div><div className="panel-kicker">01 / CIDR</div><h2>IPv4 / CIDR</h2></div></div>
          <label className="field-label">CIDR</label>
          <input value={cidrInput} onChange={(event) => setCidrInput(event.target.value)} className="field-input" />
          <div className="stack-info">
            {summary ? (
              <>
                <div><strong>Network:</strong> {summary.network}/{summary.prefix}</div>
                <div><strong>Mask:</strong> {summary.mask}</div>
                <div><strong>Broadcast:</strong> {summary.broadcast}</div>
                <div><strong>First host:</strong> {summary.firstHost}</div>
                <div><strong>Last host:</strong> {summary.lastHost}</div>
                <div><strong>Hosts:</strong> {summary.usableHosts}</div>
              </>
            ) : <div>Introduce una red válida.</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading"><div><div className="panel-kicker">02 / SUMMARY</div><h2>Red calculada</h2></div></div>
          {summary ? (
            <div className="summary-grid">
              <div className="result-box"><span>Mask</span><strong>{summary.mask}</strong></div>
              <div className="result-box"><span>Wildcard</span><strong>{summary.wildcard}</strong></div>
              <div className="result-box"><span>Prefix</span><strong>/{summary.prefix}</strong></div>
              <div className="result-box"><span>Total</span><strong>{summary.totalAddresses}</strong></div>
              <div className="result-box"><span>Usable</span><strong>{summary.usableHosts}</strong></div>
              <div className="result-box"><span>Serial</span><strong>{summary.binary}</strong></div>
              <div className="result-box full"><span>Hex</span><strong>{summary.hex}</strong></div>
            </div>
          ) : <div className="empty-state">Sin resultados.</div>}
        </div>
      </div>

      <div className="grid-two">
        <div className="panel">
          <div className="panel-heading"><div><div className="panel-kicker">03 / SUBNETTING</div><h2>Por número de subredes</h2></div></div>
          <input type="number" min={1} max={64} value={subnetCount} onChange={(event) => setSubnetCount(Number(event.target.value) || 1)} className="field-input" />
          <div className="rows-list">
            {subnetResults.map((subnet, index) => (
              <div key={`${subnet.network}-${index}`} className="row-item">
                <strong>{subnet.network}/{subnet.prefix}</strong>
                <span>{subnet.mask}</span>
                <span>Hosts {subnet.usableHosts}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-heading"><div><div className="panel-kicker">04 / VLSM</div><h2>Por necesidades</h2></div></div>
          <input value={vlsmInput} onChange={(event) => setVlsmInput(event.target.value)} className="field-input" />
          <div className="rows-list">
            {vlsmResults.map((subnet, index) => (
              <div key={`${subnet.network}-${index}`} className="row-item">
                <strong>{subnet.network}/{subnet.prefix}</strong>
                <span>{subnet.mask}</span>
                <span>Waste {subnet.waste}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
