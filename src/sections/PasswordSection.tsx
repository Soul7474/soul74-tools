import { useMemo, useState } from "react";
import { analyzePassword, characterSets, generatePassphrase, generatePassword, type CharacterSet } from "../lib/password";

export function PasswordSection() {
  const [length, setLength] = useState(20);
  const [selected, setSelected] = useState<CharacterSet[]>(["lowercase", "uppercase", "numbers", "symbols"]);
  const [password, setPasswordValue] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [analysis, setAnalysis] = useState(() => analyzePassword(""));

  const availableSets = useMemo(() => Object.keys(characterSets) as CharacterSet[], []);

  function toggleSet(set: CharacterSet) {
    setSelected((current) => current.includes(set) ? current.filter((entry) => entry !== set) : [...current, set]);
  }

  function generateNewPassword() {
    try {
      const next = generatePassword(length, selected);
      setPasswordValue(next);
      setAnalysis(analyzePassword(next));
    } catch (error) {
      setAnalysis({ score: 0, label: "Error", reasons: [error instanceof Error ? error.message : "Generación fallida"] });
    }
  }

  return (
    <section className="page-view">
      <div className="section-header">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> PASSWORD LAB</div>
          <h1>Secure generation.</h1>
        </div>
      </div>
      <div className="grid-two">
        <div className="panel">
          <div className="panel-heading"><div><div className="panel-kicker">01 / GENERATOR</div><h2>Passwords</h2></div></div>
          <label className="field-label">Length: {length}</label>
          <input type="range" min={8} max={128} value={length} onChange={(event) => setLength(Number(event.target.value))} className="field-range" />
          <div className="character-list">
            {availableSets.map((set) => (
              <label key={set} className={`choice-pill ${selected.includes(set) ? "active" : ""}`}>
                <input type="checkbox" checked={selected.includes(set)} onChange={() => toggleSet(set)} />
                {set}
              </label>
            ))}
          </div>
          <button type="button" className="primary-button" onClick={generateNewPassword}>Generate</button>
          {password && <div className="code-box">{password}</div>}
        </div>

        <div className="panel">
          <div className="panel-heading"><div><div className="panel-kicker">02 / ANALYSIS</div><h2>Password score</h2></div></div>
          <div className="score-card">
            <strong>{analysis.score}</strong>
            <span>{analysis.label}</span>
          </div>
          <ul className="bullet-list">
            {analysis.reasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading"><div><div className="panel-kicker">03 / PASSPHRASE</div><h2>Word-based phrase</h2></div></div>
        <button type="button" className="secondary-button" onClick={() => setPassphrase(generatePassphrase(5))}>Generate passphrase</button>
        {passphrase && <div className="code-box">{passphrase}</div>}
      </div>
    </section>
  );
}
