import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useWorkspace, activeData, update } from '../store/dataStore'
import { HYPOTHESIS_IDS } from '../store/defaults'
import { JointHeatmapChart } from '../components/AppCharts'
import { heatmapData } from '../engine/vizData'
import { JOINT_DISPLAY_ROWS, isJointRowEnabled } from '../data/jointDisplayMatrix'

export default function JointDisplay() {
  const ws = useWorkspace()
  const isReal = activeData(ws).isReal
  const { rows, hasData } = heatmapData(ws)
  const modeKey = isReal ? 'real' : 'synthetic'

  // Writes an EXCLUSION, and only for the active mode — the other mode's row
  // set is untouched by anything done here.
  function toggleRow(id, on) {
    update('settings', (st) => ({
      ...st,
      jointDisplay: {
        ...(st.jointDisplay ?? {}),
        rows: {
          ...(st.jointDisplay?.rows ?? {}),
          [modeKey]: { ...(st.jointDisplay?.rows?.[modeKey] ?? {}), [id]: on },
        },
      },
    }))
  }

  return (
    <>
      <PageHeader
        title="Joint Display"
        desc={
          isReal
            ? 'The Chapter 3 pattern-matching matrix (Table 2): evidence types × rival propositions. It makes explicit which evidence types the analysis currently rests on (interviews) and which have not been collected (documents and focus groups).'
            : 'The Chapter 3 pattern-matching matrix (Table 2): evidence types × rival propositions. It makes explicit what synthetic data CAN validate (the interview instrument) and what it CANNOT (documents and focus groups, which await the real-data phase).'
        }
      />

      {ws.settings.guidance && (
        <div className="notice">
          {isReal ? (
            <>
              The two <strong>interview rows</strong> — internal staff, and external investors
              and agents — are populated from entered transcripts.{' '}
              <strong>Documents</strong> and <strong>focus group discussions</strong> have not
              been collected, so any convergence across evidence types remains untested.
            </>
          ) : (
            <>
              The two <strong>interview rows</strong> — internal staff, and external investors and
              agents — are populated from synthetic data, so their numbers validate the
              <em> method</em>, never the case. <strong>Documents</strong> and <strong>focus group
              discussions</strong> are deliberate placeholders for the <strong>real-data phase</strong>
              after advisor and IRB approval; focus groups are not simulated as distinct from
              one-on-one interviews in this pilot.
            </>
          )}
        </div>
      )}


      <section className="card">
        <h2>Evidence types shown</h2>
        <p className="small muted">
          Which rows this matrix reports, for <strong>{isReal ? 'real' : 'synthetic'} mode</strong>.
          The two modes keep separate settings, so hiding a row here leaves the other mode as it
          was. Nothing is deleted — a hidden row keeps its expected-evidence text and returns
          intact when you switch it back on. Hidden rows are also left out of the heatmap on{' '}
          <Link to="/analysis/visualisations">Visualisations</Link> and out of every export.
        </p>
        <div className="chip-row" role="group" aria-label="Evidence-type rows">
          {JOINT_DISPLAY_ROWS.map((r) => {
            const on = isJointRowEnabled(ws.settings, modeKey, r.id)
            return (
              <button
                key={r.id}
                className={'chip' + (on ? ' on' : '')}
                aria-pressed={on}
                onClick={() => toggleRow(r.id, !on)}
              >
                {on ? '✓ ' : ''}{r.label}
                {r.populatedBy == null && <span className="muted"> · never populated</span>}
              </button>
            )
          })}
        </div>
      </section>

      {rows.length === 0 ? (
        <div className="card muted">
          <p style={{ marginTop: 0 }}>
            <strong>Every evidence type is hidden</strong>, so there is no matrix to show. The
            joint display is a comparison across evidence types — with none selected it has
            nothing to compare.
          </p>
          <p style={{ marginBottom: 0 }}>
            Turn at least one row back on above. Nothing was lost: each row kept its
            expected-evidence text.
          </p>
        </div>
      ) : (
        <>
      <section className="card">
        <h2>Heatmap view{isReal ? '' : ' (synthetic)'}</h2>
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
                      <span className="stamp">{isReal ? 'populated · interviews' : 'populated · synthetic'}</span>
                    ) : (
                      <span className="tag muted">
                        {isReal ? 'not yet collected' : row.placeholderLabel ?? 'real-data phase'}
                      </span>
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
                          <span className="small muted">
                            {isReal
                              ? ' — no participants in this group coded yet'
                              : ' — no personas in this group run yet'}
                          </span>
                        )}
                      </div>
                    )}
                    {row.populated && !hasData && (
                      <div className="small" style={{ marginTop: 6 }}>
                        <Link to="/analysis/coding">Code {isReal ? 'transcripts' : 'interviews'}</Link> to populate.
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

        </>
      )}

      <section className="card">
        <h2>What this {isReal ? 'analysis' : 'pilot'} can and cannot claim</h2>
        {isReal ? (
          // The synthetic list asserts the codebook discriminates and that dual
          // coding reaches acceptable reliability. Neither claim is available
          // here: both coding passes are automated, which the Reliability page
          // says plainly, so repeating them would contradict it on the next page.
          <ul className="small">
            <li>
              <strong>Can:</strong> report what consented participants said, coded against a
              stated codebook, with the evidence distributed across the three rival propositions
              and coexistence (split) patterns visible rather than averaged away.
            </li>
            <li>
              <strong>Cannot:</strong> claim inter-rater reliability — both coding passes are
              automated, so the κ figure describes how sharply the codebook discriminates on this
              text, not agreement between two human coders. It also cannot claim convergence or
              divergence across evidence types: documents and focus groups have not been
              collected, so only the interview rows are populated.
            </li>
            <li>
              <strong>Still required:</strong> a second human coder for reportable reliability,
              and the remaining evidence types before any triangulated claim.
            </li>
          </ul>
        ) : (
          <ul className="small">
            <li><strong>Can:</strong> that the protocol elicits codeable answers; that the codebook discriminates between rival propositions; that dual coding reaches acceptable reliability; that paradox (split) patterns survive the pipeline visibly.</li>
            <li><strong>Cannot:</strong> anything about the actual institution — no real coefficients, no real convergence/divergence between evidence types, no findings. Those require the real-data phase with IRB-approved fieldwork.</li>
          </ul>
        )}
      </section>
    </>
  )
}
