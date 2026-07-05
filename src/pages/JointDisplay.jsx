import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useWorkspace } from '../store/dataStore'
import { aggregateEvidence } from '../engine/patterns'
import { HYPOTHESIS_IDS } from '../store/defaults'
import { JointHeatmapChart } from '../components/AppCharts'
import { JOINT_DISPLAY_ROWS as ROWS } from '../data/jointDisplayMatrix'

export default function JointDisplay() {
  const ws = useWorkspace()
  const { overall, topCodes } = aggregateEvidence(ws.coding.segments, ws.codebook)
  const hypTotal = overall.wh1 + overall.wh2 + overall.wh3
  const hasData = ws.coding.segments.length > 0

  return (
    <>
      <PageHeader
        title="Joint Display"
        desc="The Chapter 3 pattern-matching matrix: evidence types × working hypotheses. It makes explicit what synthetic data CAN validate (the qualitative instrument) and what it CANNOT (financial, audit and documentary strands)."
      />

      {ws.settings.guidance && (
        <div className="notice">
          Only the <strong>interview row</strong> is populated by this pilot — from synthetic
          data, so its numbers validate the <em>method</em>, never the case. Greyed rows are
          deliberate placeholders for the <strong>real-data phase</strong> after advisor and
          IRB approval.
        </div>
      )}

      <section className="card">
        <h2>Heatmap view (synthetic)</h2>
        <JointHeatmapChart />
      </section>

      <section className="card" style={{ overflowX: 'auto' }}>
        <table className="data">
          <thead>
            <tr>
              <th style={{ minWidth: 130 }}>Evidence type</th>
              {HYPOTHESIS_IDS.map((id) => (
                <th key={id} style={{ color: ws.hypotheses[id].color, minWidth: 200 }}>
                  {ws.hypotheses[id].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.id} style={row.placeholder ? { opacity: 0.62 } : {}}>
                <td>
                  <strong>{row.label}</strong>
                  <div className="small" style={{ marginTop: 4 }}>
                    {row.placeholder ? (
                      <span className="tag muted">{row.placeholderLabel ?? 'real-data phase'}</span>
                    ) : (
                      <span className="stamp">populated · synthetic</span>
                    )}
                  </div>
                </td>
                {HYPOTHESIS_IDS.map((id) => (
                  <td key={id}>
                    <div className="small muted" style={{ fontStyle: 'italic' }}>
                      Expected: {row.expected[id]}
                    </div>
                    {!row.placeholder && hasData && (
                      <div style={{ marginTop: 6 }}>
                        <strong>{overall[id].toFixed(1)}</strong> weighted segments
                        {' '}({hypTotal ? ((overall[id] / hypTotal) * 100).toFixed(0) : 0}%)
                        <div className="small">
                          {topCodes.filter((c) => c.group === id).slice(0, 2).map((c) => c.label).join(', ') || '—'}
                        </div>
                      </div>
                    )}
                    {!row.placeholder && !hasData && (
                      <div className="small" style={{ marginTop: 6 }}>
                        <Link to="/analysis/coding">Code interviews</Link> to populate.
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>What this pilot can and cannot claim</h2>
        <ul className="small">
          <li><strong>Can:</strong> that the protocol elicits codeable answers; that the codebook discriminates between rival hypotheses; that dual coding reaches acceptable reliability; that paradox (split) patterns survive the pipeline visibly.</li>
          <li><strong>Cannot:</strong> anything about the actual institution — no real coefficients, no real convergence/divergence between strands, no findings. Those require the real-data phase with IRB-approved fieldwork.</li>
        </ul>
      </section>
    </>
  )
}
