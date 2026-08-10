import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import WeightBar from '../components/WeightBar'
import { activeData, useWorkspace } from '../store/dataStore'
import { aggregateEvidence, DEFAULT_SPLIT_THRESHOLD } from '../engine/patterns'
import { HYPOTHESIS_IDS } from '../store/defaults'
import { HypothesisDistributionChart } from '../components/AppCharts'

export default function PatternMatching() {
  const ws = useWorkspace()
  const data = activeData(ws)
  const splitThreshold = ws.settings.patternMatching?.splitThreshold ?? DEFAULT_SPLIT_THRESHOLD
  const { personas, overall, topCodes } = aggregateEvidence(
    data.coding.segments,
    ws.codebook,
    splitThreshold,
  )
  const splits = personas.filter((p) => p.split)

  const hypTotal = overall.wh1 + overall.wh2 + overall.wh3
  const overallShares = {
    wh1: hypTotal ? overall.wh1 / hypTotal : 0,
    wh2: hypTotal ? overall.wh2 / hypTotal : 0,
    wh3: hypTotal ? overall.wh3 / hypTotal : 0,
  }

  if (data.coding.segments.length === 0) {
    return (
      <>
        <PageHeader title="Pattern-Matching" desc="Aggregates coded evidence into the three rival propositions as distributed weight." />
        <div className="card muted">
          Nothing to aggregate yet — <Link to="/analysis/coding">code some interviews</Link> first.
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Pattern-Matching"
        desc="Coded evidence aggregated across all synthetic interviews as DISTRIBUTED weight per hypothesis — never winner-take-all, so a paradox participant legitimately appears in two columns."
      />

      {ws.settings.guidance && (
        <div className="notice">
          <strong>Split patterns are findings, not noise.</strong> Under paradox theory
          (Smith &amp; Lewis 2011), governance can genuinely constrain and enable at the same
          time — a participant supporting WH1 <em>and</em> WH2 is evidence of a working
          dialectic, and the instrument surfacing that coexistence instead of averaging it
          away is the whole point of this pilot.
        </div>
      )}

      <section className="card">
        <h2>Distribution chart (synthetic)</h2>
        <HypothesisDistributionChart />
      </section>

      <section className="card">
        <h2>Overall evidence distribution (synthetic)</h2>
        <WeightBar weights={overallShares} height={22} kind="coded" caption />
        <table className="data" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Hypothesis</th>
              <th>Weighted segments</th>
              <th>Share</th>
              <th>Most frequent codes</th>
            </tr>
          </thead>
          <tbody>
            {HYPOTHESIS_IDS.map((id) => (
              <tr key={id}>
                <td style={{ color: ws.hypotheses[id].color, fontWeight: 600 }}>
                  {ws.hypotheses[id].label}
                </td>
                <td>{overall[id].toFixed(1)}</td>
                <td>{(overallShares[id] * 100).toFixed(0)}%</td>
                <td className="small">
                  {topCodes.filter((c) => c.group === id).slice(0, 3).map((c) => `${c.label} (${c.count})`).join(', ') || '—'}
                </td>
              </tr>
            ))}
            <tr>
              <td className="muted">Emergent / unclassified (codebook coverage signal)</td>
              <td className="muted">{(overall.emergent + overall.unclassified).toFixed(1)}</td>
              <td className="muted">—</td>
              <td className="small muted">
                Off-script content the a priori codebook couldn’t place — feed it into the
                emergent bucket on the <Link to="/design/codebook">Codebook</Link> page.
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Split-pattern cut-point</h2>
        <p className="small">
          A proposition counts as supported at an evidence share of{' '}
          <strong>{splitThreshold}</strong> or above; two or more supported propositions are
          reported as a split pattern. <Link to="/settings">Change it in Settings</Link>.
        </p>
        <p className="small muted">
          This cut-point is a <strong>researcher decision, not a standard</strong>.{' '}
          {ws.settings.patternMatching?.note}
        </p>
      </section>

      {splits.length > 0 && (
        <section className="card">
          <h2>⚡ Split patterns detected</h2>
          {splits.map((p) => (
            <p key={p.personaId}>
              <strong>{p.personaName}</strong> supports{' '}
              {p.splitPair.map((h) => (
                <span key={h} style={{ color: ws.hypotheses[h].color, fontWeight: 600 }}>
                  {ws.hypotheses[h].short}{' '}
                </span>
              ))}
              simultaneously ({p.splitPair.map((h) => `${(p.shares[h] * 100).toFixed(0)}%`).join(' / ')}).
              Under paradox theory this coexistence is a <strong>finding</strong> — the
              dialectic operating within one stakeholder — not measurement noise to be
              averaged away.
            </p>
          ))}
        </section>
      )}

      <section className="card" style={{ overflowX: 'auto' }}>
        <h2>Per-participant distribution (synthetic)</h2>
        <table className="data">
          <thead>
            <tr>
              <th>Synthetic participant</th>
              <th style={{ minWidth: 160 }}>Coded evidence</th>
              {HYPOTHESIS_IDS.map((id) => (
                <th key={id} style={{ color: ws.hypotheses[id].color }}>{ws.hypotheses[id].short}</th>
              ))}
              <th>Coverage gap</th>
              <th>Pattern</th>
            </tr>
          </thead>
          <tbody>
            {personas.map((p) => (
              <tr key={p.personaId}>
                <td>
                  {p.personaName.replace(' (synthetic)', '')} <span className="stamp">syn</span>
                </td>
                <td><WeightBar weights={p.shares} height={12} kind="coded" /></td>
                {HYPOTHESIS_IDS.map((id) => (
                  <td key={id}>{(p.shares[id] * 100).toFixed(0)}%</td>
                ))}
                <td>{p.coverageGap > 0 ? `${p.coverageGap.toFixed(0)} seg` : '—'}</td>
                <td>
                  {p.split ? (
                    <strong style={{ color: '#7c3aed' }}>
                      ⚡ split ({p.splitPair.map((h) => ws.hypotheses[h].short).join(' + ')})
                    </strong>
                  ) : (
                    <span className="muted small">dominant single</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted" style={{ marginTop: 8 }}>
          Shares are over hypothesis-relevant segments only; contradictory ⚡ answers are
          split 50/50 between the two hypotheses they genuinely support. “Coverage gap”
          counts segments the codebook couldn’t place under any hypothesis.
        </p>
      </section>
    </>
  )
}
