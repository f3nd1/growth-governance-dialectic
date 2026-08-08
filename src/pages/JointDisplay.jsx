import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useWorkspace } from '../store/dataStore'
import { HYPOTHESIS_IDS } from '../store/defaults'
import { JointHeatmapChart } from '../components/AppCharts'
import { heatmapData } from '../engine/vizData'

export default function JointDisplay() {
  const ws = useWorkspace()
  const { rows, hasData } = heatmapData(ws)

  return (
    <>
      <PageHeader
        title="Joint Display"
        desc="The Chapter 3 pattern-matching matrix (Table 2): evidence types × rival propositions. It makes explicit what synthetic data CAN validate (the interview instrument) and what it CANNOT (documents and focus groups, which await the real-data phase)."
      />

      {ws.settings.guidance && (
        <div className="notice">
          The two <strong>interview rows</strong> — internal staff, and external investors and
          agents — are populated from synthetic data, so their numbers validate the
          <em> method</em>, never the case. <strong>Documents</strong> and <strong>focus group
          discussions</strong> are deliberate placeholders for the <strong>real-data phase</strong>
          after advisor and IRB approval; focus groups are not simulated as distinct from
          one-on-one interviews in this pilot.
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
            {rows.map((row) => (
              <tr key={row.id} style={row.populated ? {} : { opacity: 0.62 }}>
                <td>
                  <strong>{row.label}</strong>
                  <div className="small" style={{ marginTop: 4 }}>
                    {row.populated ? (
                      <span className="stamp">populated · synthetic</span>
                    ) : (
                      <span className="tag muted">{row.placeholderLabel ?? 'real-data phase'}</span>
                    )}
                  </div>
                </td>
                {HYPOTHESIS_IDS.map((id) => (
                  <td key={id}>
                    <div className="small muted" style={{ fontStyle: 'italic' }}>
                      Expected: {row.expected[id]}
                    </div>
                    {row.populated && hasData && (
                      <div style={{ marginTop: 6 }}>
                        <strong>{(row.shares[id] * 100).toFixed(0)}%</strong> of coded evidence
                        {row.segmentCount === 0 && (
                          <span className="small muted"> — no personas in this group run yet</span>
                        )}
                      </div>
                    )}
                    {row.populated && !hasData && (
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
          <li><strong>Can:</strong> that the protocol elicits codeable answers; that the codebook discriminates between rival propositions; that dual coding reaches acceptable reliability; that paradox (split) patterns survive the pipeline visibly.</li>
          <li><strong>Cannot:</strong> anything about the actual institution — no real coefficients, no real convergence/divergence between evidence types, no findings. Those require the real-data phase with IRB-approved fieldwork.</li>
        </ul>
      </section>
    </>
  )
}
