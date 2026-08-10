import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { activeData, useWorkspace, update } from '../store/dataStore'
import { defaultCodebookCodes, CODE_GROUPS } from '../data/seeds'
import { findEmergentCandidates, candidateToCode } from '../engine/emergent'

let nextId = 100

export default function Codebook() {
  const ws = useWorkspace()
  const codes = ws.codebook.codes
  const [openCandidate, setOpenCandidate] = useState(null)

  // Derived, never stored: recomputed from the current segments and codebook.
  const { candidates, counts } = findEmergentCandidates(activeData(ws).coding.segments, ws.codebook)

  function setCodes(next) {
    update('codebook', (cb) => ({ ...cb, codes: next }))
  }

  function approve(candidate) {
    setCodes([...codes, candidateToCode(candidate)])
  }

  function patchCode(id, patch) {
    setCodes(codes.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function addCode(group) {
    setCodes([
      ...codes,
      { id: `c-custom-${nextId++}-${codes.length}`, group, label: 'New code', definition: '' },
    ])
  }

  function remove(id) {
    setCodes(codes.filter((c) => c.id !== id))
  }

  return (
    <>
      <PageHeader
        title="Codebook"
        desc="A priori codes derived from the three rival propositions, plus an emergent bucket for inductive codes found during coding."
      />

      {ws.settings.guidance && (
        <div className="notice">
          <strong>Definitions matter here.</strong> Both coders classify segments against
          these definitions. Vague or overlapping definitions produce coder disagreement and
          a lower Cohen’s kappa on the Reliability page — catching that on synthetic data,
          and tightening the codebook in response, is a primary goal of this pilot.
        </div>
      )}

      <section className="card">
        <h2>Candidate emergent codes ({candidates.length})</h2>
        <p className="small muted">
          Segments no a priori code matched, grouped by shared language. A group spanning two
          or more personas is a <strong>candidate</strong> — a recurring theme nobody has named
          yet. A segment with no thematic sibling stays <strong>unclassified</strong>, which is a
          legitimate result, not a failure. Candidates are proposals only: nothing enters the
          codebook until you approve it, and approving does not retroactively change how the two
          coders coded — re-code from the{' '}
          <Link to="/analysis/coding">Coding</Link> page to apply a new code.
        </p>
        <p className="small">
          {counts.candidateSegments} segment{counts.candidateSegments === 1 ? '' : 's'} in
          candidate themes · {counts.unclassifiedSegments} genuinely unclassified
        </p>

        {activeData(ws).coding.segments.length === 0 ? (
          <p className="muted">
            Nothing coded yet — <Link to="/analysis/coding">run the coders</Link> first.
          </p>
        ) : candidates.length === 0 ? (
          <p className="muted">
            No recurring off-script themes found. Any unmatched segments had no thematic sibling.
          </p>
        ) : (
          <table className="data">
            <thead>
              <tr><th>Proposed label</th><th>Segments</th><th>Personas</th><th /></tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <Fragment key={c.id}>
                  <tr>
                    <td><strong>{c.label}</strong></td>
                    <td>{c.segments.length}</td>
                    <td className="small">{c.personaNames.map((n) => n.replace(' (synthetic)', '')).join(', ')}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="btn small secondary"
                        aria-expanded={openCandidate === c.id}
                        onClick={() => setOpenCandidate(openCandidate === c.id ? null : c.id)}
                      >
                        {openCandidate === c.id ? 'Hide' : 'Review'}
                      </button>{' '}
                      <button className="btn small" onClick={() => approve(c)}>
                        Approve as emergent code
                      </button>
                    </td>
                  </tr>
                  {openCandidate === c.id && (
                    <tr>
                      <td colSpan={4}>
                        <p className="small muted" style={{ marginTop: 0 }}>{c.definition}</p>
                        <ul className="small">
                          {c.segments.map((s) => (
                            <li key={s.id}>
                              <strong>{s.personaName.replace(' (synthetic)', '')}</strong> Q{s.questionIndex + 1}: {s.text}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {CODE_GROUPS.map((g) => {
        const groupCodes = codes.filter((c) => c.group === g.id)
        const color = ws.hypotheses[g.id]?.color ?? '#7c3aed'
        return (
          <section className="card" key={g.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <span className="swatch" style={{ background: color }} aria-hidden="true" />
                {g.label}
              </h2>
              <button className="btn small secondary" onClick={() => addCode(g.id)}>
                + Add code
              </button>
            </div>
            {groupCodes.length === 0 && (
              <p className="muted small" style={{ marginTop: 8 }}>
                {g.id === 'emergent'
                  ? 'Empty by design — inductive codes are added here when the a priori set cannot classify a segment.'
                  : 'No codes in this group.'}
              </p>
            )}
            {groupCodes.map((c) => (
              <div key={c.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 10 }}>
                <div className="grid-2">
                  <div className="field">
                    <label htmlFor={`cb-label-${c.id}`}>Code label</label>
                    <input
                      id={`cb-label-${c.id}`}
                      type="text"
                      value={c.label}
                      onChange={(e) => patchCode(c.id, { label: e.target.value })}
                    />
                  </div>
                  <div className="field" style={{ textAlign: 'right' }}>
                    <label>&nbsp;</label>
                    <button className="btn small danger" onClick={() => remove(c.id)}>
                      Delete
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor={`cb-def-${c.id}`}>
                    Definition (inclusion/exclusion criteria — feeds reliability)
                  </label>
                  <textarea
                    id={`cb-def-${c.id}`}
                    rows={2}
                    value={c.definition}
                    onChange={(e) => patchCode(c.id, { definition: e.target.value })}
                  />
                  {c.definition.trim().length < 60 && (
                    <p className="small" style={{ color: '#b03230', margin: '4px 0 0' }}>
                      Short/vague definition — expect coder disagreement on this code.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </section>
        )
      })}

      <p>
        <button
          className="btn secondary"
          onClick={() => {
            if (window.confirm('Restore the default codebook? This replaces all current codes and definitions, including any you have added or edited. This cannot be undone.')) {
              setCodes(defaultCodebookCodes())
            }
          }}
        >
          Restore default codebook
        </button>
      </p>
    </>
  )
}
