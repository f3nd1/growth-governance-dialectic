import PageHeader from '../components/PageHeader'
import { useWorkspace, update, activeData } from '../store/dataStore'
import { HYPOTHESIS_IDS } from '../store/defaults'

export default function Hypotheses() {
  const ws = useWorkspace()
  const isReal = activeData(ws).isReal

  function setHyp(id, patch) {
    update('hypotheses', (h) => ({ ...h, [id]: { ...h[id], ...patch } }))
  }

  return (
    <>
      <PageHeader
        title="Hypotheses"
        desc={
          isReal
            ? 'Three rival propositions — not statistical H0/H1. Coding and pattern-matching key off these, using each proposition’s colour consistently app-wide.'
            : 'Three rival propositions — not statistical H0/H1. Persona weights, answer tagging, coding and pattern-matching all key off these, using each proposition’s colour consistently app-wide.'
        }
      />

      {ws.settings.guidance && (
        <div className="notice">
          They are deliberately framed as <strong>rivals that can coexist</strong>: under
          paradox theory a participant can genuinely experience governance as constraining
          AND enabling at once. The pilot tests whether the instrument can surface that
          coexistence instead of flattening it.
        </div>
      )}

      {HYPOTHESIS_IDS.map((id) => {
        const h = ws.hypotheses[id]
        return (
          <section className="card" key={id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--line)', paddingBottom: 8 }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <span className="swatch" style={{ background: h.color }} aria-hidden="true" />
                {h.short}
              </h2>
              <label className="small muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Colour
                <input
                  type="color"
                  value={h.color}
                  aria-label={`Colour for ${h.short}`}
                  onChange={(e) => setHyp(id, { color: e.target.value })}
                />
              </label>
            </div>
            <div className="field" style={{ marginTop: 10 }}>
              <label htmlFor={`hyp-label-${id}`}>Label</label>
              <input
                id={`hyp-label-${id}`}
                type="text"
                value={h.label}
                onChange={(e) => setHyp(id, { label: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor={`hyp-desc-${id}`}>Description</label>
              <textarea
                id={`hyp-desc-${id}`}
                rows={3}
                value={h.description}
                onChange={(e) => setHyp(id, { description: e.target.value })}
              />
            </div>
          </section>
        )
      })}
    </>
  )
}
