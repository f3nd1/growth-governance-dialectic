import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import WeightBar from '../components/WeightBar'
import { useWorkspace } from '../store/dataStore'
import { buildReportModel } from '../engine/report'
import { HYPOTHESIS_IDS } from '../store/defaults'

export default function PilotReport() {
  const ws = useWorkspace()
  const m = buildReportModel(ws)

  return (
    <>
      <PageHeader
        title="Pilot Report"
        desc="A review-ready summary of the instrument and its pilot results, assembled live from the workspace for the advisor."
      />

      <div
        className="notice"
        style={{ borderLeftColor: '#b03230', fontWeight: 700 }}
        role="alert"
      >
        {m.caveat}
      </div>

      <p>
        <Link className="btn" to="/outputs/export">Export this report →</Link>
      </p>

      <section className="card">
        <h2>1 · Study design</h2>
        <p><strong>{m.studyDesign.title}</strong></p>
        <p className="small muted">{m.studyDesign.design} · {m.studyDesign.unitOfAnalysis}</p>
        <p>{m.studyDesign.summary}</p>
        <p className="small"><em>{m.studyDesign.pilotPurpose}</em></p>
      </section>

      <section className="card">
        <h2>2 · Rival propositions</h2>
        {m.hypotheses.map((h) => (
          <p key={h.id} style={{ borderLeft: `4px solid ${h.color}`, paddingLeft: 10 }}>
            <strong>{h.label}.</strong> {h.description}
          </p>
        ))}
      </section>

      <section className="card">
        <h2>3 · Interview protocol under validation</h2>
        <ol>
          {m.protocol.map((q) => (
            <li key={q.id} style={{ marginBottom: 6 }}>
              {q.text}
              <div className="small muted">{q.rq} · {q.source}</div>
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h2>4 · Codebook ({m.codebook.length} codes)</h2>
        <table className="data">
          <thead><tr><th>Code</th><th>Group</th><th>Definition</th></tr></thead>
          <tbody>
            {m.codebook.map((c) => (
              <tr key={c.id}>
                <td>{c.label}</td>
                <td>{ws.hypotheses[c.group]?.short ?? c.group}</td>
                <td className="small">{c.definition || <em className="muted">no definition</em>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>5 · Pilot corpus (synthetic)</h2>
        <p>
          {m.counts.personas} synthetic personas · {m.counts.interviews} interviews ·{' '}
          {m.counts.segments} dual-coded segments · {m.counts.overrides} logged overrides.
        </p>
      </section>

      <section className="card">
        <h2>6 · Reliability</h2>
        {m.reliability ? (
          <>
            <p>
              N = {m.reliability.n} · observed agreement {(m.reliability.po * 100).toFixed(1)}% ·
              Cohen’s κ = <strong>{m.reliability.kappa.toFixed(3)}</strong> —{' '}
              <strong>{m.reliability.band}</strong>
            </p>
            <p className="small muted">{m.reliability.advice}</p>
          </>
        ) : (
          <p className="muted">No coded segments yet — <Link to="/analysis/coding">run the coders</Link>.</p>
        )}
        <p className="small muted">Figures illustrate the method on synthetic data; they are not validated coefficients.</p>
      </section>

      <section className="card">
        <h2>7 · Pattern-matching</h2>
        {m.patterns.hypTotal > 0 ? (
          <>
            <WeightBar weights={m.patterns.shares} height={20} />
            <table className="data" style={{ marginTop: 10 }}>
              <tbody>
                {HYPOTHESIS_IDS.map((id) => (
                  <tr key={id}>
                    <td style={{ color: ws.hypotheses[id].color, fontWeight: 600 }}>{ws.hypotheses[id].short}</td>
                    <td>{m.patterns.overall[id].toFixed(1)} weighted segments</td>
                    <td>{(m.patterns.shares[id] * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {m.patterns.splits.length > 0 && (
              <p style={{ marginTop: 10 }}>
                ⚡ <strong>{m.patterns.splits.length} split pattern{m.patterns.splits.length === 1 ? '' : 's'}</strong>{' '}
                ({m.patterns.splits.map((p) => p.personaName.replace(' (synthetic)', '')).join(', ')}) —
                coexisting support for two hypotheses, a paradox-theory finding the instrument
                successfully surfaced.
              </p>
            )}
            <p className="small muted">
              Codebook coverage gap: {m.patterns.coverageGap.toFixed(1)} segments landed in
              emergent/unclassified — review on the <Link to="/design/codebook">Codebook</Link> page.
            </p>
          </>
        ) : (
          <p className="muted">No aggregated evidence yet.</p>
        )}
      </section>
    </>
  )
}
