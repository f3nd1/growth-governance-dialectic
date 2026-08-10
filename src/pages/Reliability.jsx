import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { activeData, useWorkspace, update } from '../store/dataStore'
import {
  agreementStats,
  kappaBand,
  codeInterview,
  UNCLASSIFIED,
  DEFAULT_KAPPA_THRESHOLDS,
} from '../engine/coding'
import { runInterviews } from '../engine'
import { ReliabilityChart } from '../components/AppCharts'

function codeLabel(codeId, codebook) {
  if (codeId === UNCLASSIFIED) return 'unclassified'
  return codebook.codes.find((c) => c.id === codeId)?.label ?? codeId
}

export default function Reliability() {
  const ws = useWorkspace()
  const data = activeData(ws)
  const reliabilityCfg = ws.settings.reliability ?? {}
  const thresholds = reliabilityCfg.thresholds ?? DEFAULT_KAPPA_THRESHOLDS
  const stats = agreementStats(data.coding.segments)
  const band = stats ? kappaBand(stats.kappa, thresholds) : null
  const [personaId, setPersonaId] = useState(data.participants[0]?.id ?? '')
  const [running, setRunning] = useState(false)

  function setThreshold(key, value) {
    update('settings', (s) => ({
      ...s,
      reliability: {
        ...(s.reliability ?? {}),
        thresholds: { ...(s.reliability?.thresholds ?? DEFAULT_KAPPA_THRESHOLDS), [key]: value },
      },
    }))
  }

  function setCitation(value) {
    update('settings', (s) => ({
      ...s,
      reliability: { ...(s.reliability ?? {}), citation: value },
    }))
  }

  const thresholdsValid =
    thresholds.substantial > 0 &&
    thresholds.substantial < thresholds.strong &&
    thresholds.strong < 1

  // Per-code disagreement breakdown — points at the definitions to tighten.
  const byCode = {}
  for (const s of data.coding.segments) {
    const key = s.coderA
    byCode[key] = byCode[key] ?? { total: 0, disagree: 0 }
    byCode[key].total++
    if (s.coderA !== s.coderB) byCode[key].disagree++
  }
  const worst = Object.entries(byCode)
    .filter(([, v]) => v.total >= 2)
    .sort((a, b) => b[1].disagree / b[1].total - a[1].disagree / a[1].total)
    .slice(0, 5)

  // Stability: two most recent OFFLINE interviews of the chosen persona with
  // different seeds, re-coded on the fly (deterministic), compared per question.
  const personaRuns = data.interviews
    .filter((iv) => iv.personaId === personaId && iv.mode === 'offline')
    .slice(-6)
  const seedsSeen = new Set()
  const distinct = []
  for (const iv of [...personaRuns].reverse()) {
    if (!seedsSeen.has(iv.seed)) {
      seedsSeen.add(iv.seed)
      distinct.push(iv)
    }
    if (distinct.length === 2) break
  }
  const [runB, runA] = distinct // runA = older, runB = newer
  let stability = null
  if (runA && runB) {
    const segsA = codeInterview(runA, ws.codebook)
    const segsB = codeInterview(runB, ws.codebook)
    const n = Math.min(segsA.length, segsB.length)
    const groupOf = (codeId) =>
      ws.codebook.codes.find((c) => c.id === codeId)?.group ?? 'unclassified'
    const rows = []
    let sameCode = 0
    let sameGroup = 0
    const dist = { a: {}, b: {} }
    for (let i = 0; i < n; i++) {
      const ga = groupOf(segsA[i].coderA)
      const gb = groupOf(segsB[i].coderA)
      const codeMatch = segsA[i].coderA === segsB[i].coderA
      const groupMatch = ga === gb
      if (codeMatch) sameCode++
      if (groupMatch) sameGroup++
      dist.a[ga] = (dist.a[ga] ?? 0) + 1
      dist.b[gb] = (dist.b[gb] ?? 0) + 1
      rows.push({ i, a: segsA[i].coderA, b: segsB[i].coderA, codeMatch, groupMatch })
    }
    stability = {
      runA,
      runB,
      rows,
      n,
      codePct: n ? sameCode / n : 0,
      groupPct: n ? sameGroup / n : 0,
      dist,
    }
  }

  async function runStabilityPair() {
    setRunning(true)
    try {
      const base = Math.floor(Math.random() * 900) + 100
      await runInterviews([personaId], base)
      await runInterviews([personaId], base + 1)
    } finally {
      setRunning(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Reliability"
        desc="Agreement between the two coding passes over every dual-coded segment. Manual overrides are excluded — this is about the two independent passes."
      />

      {data.isReal && (
        <div className="notice" role="note">
          <strong>This κ is not inter-rater reliability.</strong> On real transcripts both
          passes are automated: Coder A takes the best-matching code, Coder B takes the
          runner-up whenever the top two match the text equally well. The figure therefore
          measures how sharply the <Link to="/design/codebook">codebook</Link> discriminates
          on this material — a low value means overlapping definitions. Reported inter-rater
          reliability requires a second human coder and cannot be produced by this tool.
        </div>
      )}

      {ws.settings.guidance && (
        <div className="notice">
          Catching a weak kappa <em>here</em>, on synthetic data, is exactly why you pilot
          before real fieldwork: a vague codebook found now costs an afternoon of definition
          tightening; found after 20 real interviews it costs the dataset. Re-running with a
          new seed moves these numbers — that sensitivity is informative, not a bug.
        </div>
      )}

      <section className="card">
        <h2>Interpretation bands (κ cut-points)</h2>
        <p className="small muted">
          The Strong / Substantial / Moderate labels — and the shaded zones in the chart
          below — use these cut-points. Adjust them to the convention you report against.
        </p>
        <div className="grid-2" style={{ maxWidth: 460 }}>
          <div className="field">
            <label htmlFor="rel-substantial">“Substantial” at κ ≥</label>
            <input
              id="rel-substantial"
              type="number" min="0" max="1" step="0.01"
              value={thresholds.substantial}
              onChange={(e) => setThreshold('substantial', Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="rel-strong">“Strong” at κ ≥</label>
            <input
              id="rel-strong"
              type="number" min="0" max="1" step="0.01"
              value={thresholds.strong}
              onChange={(e) => setThreshold('strong', Number(e.target.value))}
            />
          </div>
        </div>
        {!thresholdsValid && (
          <p className="small" style={{ color: '#b03230' }}>
            Cut-points must satisfy 0 &lt; substantial &lt; strong &lt; 1.
          </p>
        )}
        <div className="field">
          <label htmlFor="rel-citation">Reporting-convention note (citable)</label>
          <textarea
            id="rel-citation"
            rows={3}
            value={reliabilityCfg.citation ?? ''}
            onChange={(e) => setCitation(e.target.value)}
          />
        </div>
        <p>
          <button
            className="btn small secondary"
            onClick={() => {
              setThreshold('substantial', DEFAULT_KAPPA_THRESHOLDS.substantial)
              setThreshold('strong', DEFAULT_KAPPA_THRESHOLDS.strong)
            }}
          >
            Restore Landis &amp; Koch defaults (0.60 / 0.80)
          </button>
        </p>
      </section>

      {!stats ? (
        <div className="card muted">
          No coded segments yet — <Link to="/analysis/coding">run the coders</Link> first.
        </div>
      ) : (
        <>
          <div className="grid-2">
            <section className="card">
              <h2>Headline figures (pilot)</h2>
              <table className="data">
                <tbody>
                  <tr><td>Coded segments (N)</td><td><strong>{stats.n}</strong></td></tr>
                  <tr><td>Observed agreement (p₀)</td><td><strong>{(stats.po * 100).toFixed(1)}%</strong></td></tr>
                  <tr><td>Expected agreement (pₑ)</td><td>{(stats.pe * 100).toFixed(1)}%</td></tr>
                  <tr><td>Cohen’s kappa (κ)</td><td><strong>{stats.kappa.toFixed(3)}</strong></td></tr>
                </tbody>
              </table>
              <p style={{ marginTop: 10 }}>
                Band: <strong>{band.label}</strong>{' '}
                <span className="muted small">
                  (substantial ≥ {thresholds.substantial}, strong ≥ {thresholds.strong})
                </span>
              </p>
              <p className="small muted">{band.advice}</p>
              {reliabilityCfg.citation && (
                <p className="small muted" style={{ fontStyle: 'italic' }}>{reliabilityCfg.citation}</p>
              )}
              <p className="small muted">
                Illustrative of the method on synthetic data — not a validated coefficient.
              </p>
            </section>

            <section className="card">
              <h2>Where disagreement clusters</h2>
              {worst.length === 0 ? (
                <p className="muted">Not enough segments per code yet.</p>
              ) : (
                <table className="data">
                  <thead>
                    <tr><th>Coder A code</th><th>Segments</th><th>Disagreement</th></tr>
                  </thead>
                  <tbody>
                    {worst.map(([codeId, v]) => (
                      <tr key={codeId}>
                        <td>{codeLabel(codeId, ws.codebook)}</td>
                        <td>{v.total}</td>
                        <td>{((v.disagree / v.total) * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="small muted" style={{ marginTop: 8 }}>
                High rows usually mean a vague definition (see the <Link to="/design/codebook">Codebook</Link>)
                or genuinely ambiguous content — paradox answers ⚡ and off-script probes land here by design.
              </p>
            </section>
          </div>

          <section className="card">
            <h2>κ across seeds (synthetic)</h2>
            <ReliabilityChart />
          </section>
        </>
      )}

      {!data.isReal && (
      <section className="card">
        <h2>Stability test — same persona, two seeds</h2>
        <p className="small muted">
          Runs the identical synthetic persona through the protocol twice with different
          seeds and compares Coder A’s codes question by question. Unstable coding across
          runs means the instrument, not the participant, is wobbling.
        </p>
        <div className="field" style={{ maxWidth: 320 }}>
          <label htmlFor="stab-persona">Persona</label>
          <select id="stab-persona" value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
            {data.participants.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        {!stability ? (
          <p>
            <button className="btn" onClick={runStabilityPair} disabled={running || !personaId}>
              {running ? 'Running…' : 'Run this persona twice (two seeds)'}
            </button>
            <span className="small muted"> Needs two offline runs with different seeds.</span>
          </p>
        ) : (
          <>
            <p>
              Comparing seed <strong>{stability.runA.seed}</strong> vs seed{' '}
              <strong>{stability.runB.seed}</strong>: exact code stable on{' '}
              <strong>{(stability.codePct * 100).toFixed(0)}%</strong> of questions,
              hypothesis group stable on <strong>{(stability.groupPct * 100).toFixed(0)}%</strong>.
            </p>
            <p className="small muted">
              Two seeds produce genuinely different answers, so question-level codes are
              expected to move. What must hold is the aggregate: the persona’s hypothesis
              distribution should track its weight profile in both runs. Aggregate drift =
              instrument instability; question-level churn with a stable aggregate = normal
              content variance.
            </p>
            <table className="data">
              <thead>
                <tr>
                  <th>Aggregate</th>
                  {['wh1', 'wh2', 'wh3', 'emergent', 'unclassified'].map((g) => (
                    <th key={g}>{ws.hypotheses[g]?.short ?? g}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['a', 'b'].map((run) => (
                  <tr key={run}>
                    <td>Run {run === 'a' ? `1 (seed ${stability.runA.seed})` : `2 (seed ${stability.runB.seed})`}</td>
                    {['wh1', 'wh2', 'wh3', 'emergent', 'unclassified'].map((g) => (
                      <td key={g}>{stability.dist[run][g] ?? 0}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="data" style={{ marginTop: 14 }}>
              <thead>
                <tr><th>Q</th><th>Run 1 (seed {stability.runA.seed})</th><th>Run 2 (seed {stability.runB.seed})</th><th>Same code</th><th>Same group</th></tr>
              </thead>
              <tbody>
                {stability.rows.map((r) => (
                  <tr key={r.i}>
                    <td>Q{r.i + 1}</td>
                    <td>{codeLabel(r.a, ws.codebook)}</td>
                    <td>{codeLabel(r.b, ws.codebook)}</td>
                    <td>{r.codeMatch ? '✓' : <span style={{ color: '#b03230' }}>✗</span>}</td>
                    <td>{r.groupMatch ? '✓' : <span style={{ color: '#b03230' }}>✗</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 10 }}>
              <button className="btn secondary" onClick={runStabilityPair} disabled={running}>
                {running ? 'Running…' : 'Run a fresh pair'}
              </button>
            </p>
          </>
        )}
      </section>
      )}
    </>
  )
}
