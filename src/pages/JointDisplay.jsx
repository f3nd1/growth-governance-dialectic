import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useWorkspace, activeData, update } from '../store/dataStore'
import { HYPOTHESIS_IDS } from '../store/defaults'
import { JointHeatmapChart } from '../components/AppCharts'
import { heatmapData } from '../engine/vizData'
import { rowsForMode, isJointRowEnabled, rowCoverage } from '../data/jointDisplayMatrix'
import EvidenceTypeFilter from '../components/EvidenceTypeFilter'
import { evidenceCoverage, listTypes, sentenceCase } from '../engine/sources'

export default function JointDisplay() {
  const ws = useWorkspace()
  const data = activeData(ws)
  const isReal = data.isReal
  // What the corpus actually holds, so the claims below describe this corpus
  // rather than the one it had when the sentence was written.
  const coverage = evidenceCoverage(data.interviews, data.coding.segments)
  // Stated on both pages and in the exports, from one source.
  const coverageOf = rowCoverage(data.participants)
  const [typeFilter, setTypeFilter] = useState('all')
  const { rows, hasData, unmapped } = heatmapData(ws, typeFilter)
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
            ? 'The Chapter 3 pattern-matching matrix (Table 2): stakeholder groups × rival propositions. A segment lands in a row by who said it, not by which evidence type it came from — so a row aggregates whatever a group said, in an interview or in a focus group alike. Use the evidence-type filter to read one type on its own.'
            : 'The Chapter 3 pattern-matching matrix (Table 2): evidence types × rival propositions. It makes explicit what synthetic data CAN validate (the interview instrument) and what it CANNOT (documents and focus groups, which await the real-data phase).'
        }
      />

      {ws.settings.guidance && (
        <div className="notice">
          {isReal ? (
            <>
              Each row is a <strong>stakeholder group</strong>, and a segment lands in a row
              because of who said it — membership comes from the participant record's group
              field. Convergence is read <em>across groups</em>: a proposition supported by
              the board, by staff and by agents alike is stronger evidence than one that
              appears in a single group.
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


      {isReal && (
        <div className="notice" role="note">
          <strong>The expected-evidence wording below is a derived draft.</strong> It
          specialises the previous internal/external interview rows to each group; it is not
          transcribed from your Chapter 3 Table 2, which this app has never held. Treat it as a
          starting point and replace it with the chapter's own wording. It is not editable
          in-app — the row definitions live in <code>src/data/jointDisplayMatrix.js</code>.
        </div>
      )}

      {isReal && unmapped.length > 0 && (
        <div className="notice" role="alert" style={{ borderLeftColor: '#b03230' }}>
          <p style={{ margin: '0 0 6px', fontWeight: 700 }}>
            This matrix covers {coverageOf.mapped} of {coverageOf.total} participants.{' '}
            {unmapped.length} do{unmapped.length === 1 ? 'es' : ''} not map to any of the five
            groups, and {unmapped.length === 1 ? 'is' : 'are'} excluded from every row.
          </p>
          <p className="small" style={{ margin: '0 0 6px' }}>
            <Link to="/analysis/patterns">Pattern-Matching</Link> aggregates all{' '}
            {coverageOf.total}, so its totals and this matrix's are over different denominators.
          </p>
          <p className="small" style={{ margin: '0 0 6px' }}>
            Their coded segments appear in the analysis elsewhere but not in this matrix. The
            app names them rather than assigning them: a participant recorded as
            “multi-role” genuinely belongs to more than one row, and picking one would invent a
            membership you never stated.
          </p>
          <ul className="small" style={{ margin: 0 }}>
            {unmapped.map((p) => (
              <li key={p.id}>
                <strong>{p.participantCode}</strong> — group “{p.group || '(not set)'}”. Change
                it on <Link to="/participants/records">Participant Records</Link> if one row
                fits.
              </li>
            ))}
          </ul>
        </div>
      )}

      {isReal && (
        <EvidenceTypeFilter value={typeFilter} onChange={setTypeFilter}>
          Filtering to one type shows what that evidence alone supports — the check on
          group conformity in the focus groups and on organisational-record bias in the
          documents.
        </EvidenceTypeFilter>
      )}

      <section className="card">
        <h2>{isReal ? 'Rows shown' : 'Evidence types shown'}</h2>
        <p className="small muted">
          Which rows this matrix reports, for{' '}
          <strong>{isReal ? 'real' : 'synthetic'} mode</strong>.
          The two modes keep separate settings, so hiding a row here leaves the other mode as it
          was. Nothing is deleted — a hidden row keeps its expected-evidence text and returns
          intact when you switch it back on. Hidden rows are also left out of the heatmap on{' '}
          <Link to="/analysis/visualisations">Visualisations</Link> and out of every export.
        </p>
        <div className="chip-row" role="group" aria-label="Evidence-type rows">
          {rowsForMode(modeKey).map((r) => {
            const on = isJointRowEnabled(ws.settings, modeKey, r.id)
            return (
              <button
                key={r.id}
                className={'chip' + (on ? ' on' : '')}
                aria-pressed={on}
                onClick={() => toggleRow(r.id, !on)}
              >
                {on ? '✓ ' : ''}{r.label}
                {r.populatedBy === null && <span className="muted"> · never populated</span>}
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
              <th style={{ minWidth: 130 }}>{isReal ? 'Stakeholder group / source' : 'Evidence type'}</th>
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
                      <span className="stamp">
                        {!isReal
                          ? 'populated · synthetic'
                          : row.document
                            ? `${row.participantCount} source${row.participantCount === 1 ? '' : 's'}`
                            : `${row.participantCount} participant${row.participantCount === 1 ? '' : 's'}`}
                      </span>
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
                            {!isReal
                              ? ' — no personas in this group run yet'
                              : row.document
                                ? ' — no document extracts coded yet'
                                : ' — no participants in this group coded yet'}
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
              text, not agreement between two human coders.{' '}
              {coverage.populated.length === 0
                ? 'It also cannot claim anything across evidence types: nothing is coded yet, so no row is populated.'
                : coverage.populated.length === 1
                  ? `It also cannot claim convergence or divergence across evidence types: every coded
                     segment comes from ${listTypes(coverage.populated)}, so this matrix shows one
                     evidence type read across stakeholder groups, not agreement between types.`
                  : `Convergence across evidence types can be read only for the types actually held —
                     ${listTypes(coverage.populated)} — and not for any type still uncollected.`}
              {coverage.uncollected.length > 0 &&
                ` ${sentenceCase(listTypes(coverage.uncollected))}
                  ${coverage.uncollected.length === 1 ? 'has' : 'have'} not been collected.`}
            </li>
            <li>
              <strong>Still required:</strong> a second human coder for reportable reliability
              {coverage.uncollected.length > 0
                ? `, and ${listTypes(coverage.uncollected)} before any triangulated claim.`
                : '.'}
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
