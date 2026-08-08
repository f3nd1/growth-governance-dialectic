import PageHeader from '../components/PageHeader'
import { useWorkspace, update } from '../store/dataStore'
import { defaultCodebookCodes, CODE_GROUPS } from '../data/seeds'

let nextId = 100

export default function Codebook() {
  const ws = useWorkspace()
  const codes = ws.codebook.codes

  function setCodes(next) {
    update('codebook', (cb) => ({ ...cb, codes: next }))
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

      {CODE_GROUPS.map((g) => {
        const groupCodes = codes.filter((c) => c.group === g.id)
        const color = ws.hypotheses[g.id]?.color ?? '#7c3aed'
        return (
          <section className="card" key={g.id} style={{ borderLeft: `5px solid ${color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>{g.label}</h2>
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
