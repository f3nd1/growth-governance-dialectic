import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useWorkspace } from '../store/dataStore'
import { aggregateEvidence } from '../engine/patterns'
import { HYPOTHESIS_IDS } from '../store/defaults'
import { JointHeatmapChart } from '../components/AppCharts'

// Expected-evidence text for each evidence type × hypothesis — the Chapter 3
// pattern-matching matrix. Only qualitative rows can be populated by this
// synthetic pilot; the rest await the real-data phase.
const ROWS = [
  {
    id: 'reports',
    label: 'Company reports',
    placeholder: true,
    expected: {
      wh1: 'Strategy documents defer or shelve growth initiatives citing compliance workload or regulatory risk.',
      wh2: 'Reports credit accreditation/registration milestones as preconditions for expansion moves.',
      wh3: 'Growth narrative develops with no reference to governance either way.',
    },
  },
  {
    id: 'financial',
    label: 'Financial data',
    placeholder: true,
    expected: {
      wh1: 'Compliance cost line grows faster than revenue; margin compression follows governance events.',
      wh2: 'Revenue/enrolment inflections follow governance milestones (e.g. certification renewals).',
      wh3: 'No systematic relationship between governance-related spend/events and business indicators.',
    },
  },
  {
    id: 'interviews',
    label: 'Interviews (qualitative)',
    placeholder: false,
    expected: {
      wh1: 'Stakeholders recount resource diversion, bureaucracy and delayed/blocked decisions.',
      wh2: 'Stakeholders recount stability, trust signalling and governance-enabled wins.',
      wh3: 'Stakeholders perceive governance as a separate function; outcomes attributed externally.',
    },
  },
  {
    id: 'focus',
    label: 'Focus groups (qualitative)',
    placeholder: true,
    placeholderLabel: 'not simulated in this pilot',
    expected: {
      wh1: 'Group consensus frames governance as brake; shared war stories of missed opportunities.',
      wh2: 'Group consensus frames governance as licence to operate and grow.',
      wh3: 'Governance barely arises without prompting; discussion centres on external drivers.',
    },
  },
  {
    id: 'audit',
    label: 'Audit / risk data',
    placeholder: true,
    expected: {
      wh1: 'Findings and remediation absorb management attention in periods of stalled growth.',
      wh2: 'Clean audits precede successful partnership/enrolment cycles.',
      wh3: 'Audit outcomes uncorrelated with business trajectory.',
    },
  },
]

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
