import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ModeGate from '../components/ModeGate'
import WeightBar from '../components/WeightBar'
import { useWorkspace, update } from '../store/dataStore'
import { HYPOTHESIS_IDS } from '../store/defaults'
import { STAKEHOLDER_GROUPS, heldIsValid } from '../data/seeds'

function blankPersona() {
  return {
    id: `p-${Date.now().toString(36)}`,
    name: '',
    role: '',
    group: 'teacher',
    tenureYears: 3,
    weights: { wh1: 0.34, wh2: 0.33, wh3: 0.33 },
    held: [],
    blindSpot: false,
    voice: '',
    synthetic: true,
  }
}

export default function PersonaBuilder() {
  const ws = useWorkspace()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = params.get('id')
  const [draft, setDraft] = useState(blankPersona)

  useEffect(() => {
    if (editId) {
      const existing = ws.personas.find((p) => p.id === editId)
      if (existing) setDraft({ ...existing, weights: { ...existing.weights }, held: [...existing.held] })
    } else {
      setDraft(blankPersona())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId])

  const sum = HYPOTHESIS_IDS.reduce((s, id) => s + draft.weights[id], 0)
  const sumOk = Math.abs(sum - 1) < 0.005
  const paradox = draft.held.length >= 2
  const heldOk = heldIsValid(draft.held)
  const valid = draft.name.trim() && draft.role.trim() && sumOk && heldOk

  if (ws.mode === 'real') {
    return (
      <>
        <PageHeader title="Persona Builder" desc="Authors synthetic participants for instrument validation." />
        <ModeGate want="synthetic" />
      </>
    )
  }

  function setWeight(id, value) {
    setDraft((d) => ({ ...d, weights: { ...d.weights, [id]: value } }))
  }

  function normalise() {
    const total = sum || 1
    setDraft((d) => ({
      ...d,
      weights: Object.fromEntries(
        HYPOTHESIS_IDS.map((id) => [id, Math.round((d.weights[id] / total) * 100) / 100]),
      ),
    }))
  }

  // WH1 and WH2 may be held together (the paradox case). WH3 asserts there is no
  // association at all, so selecting it clears the directional pair and vice versa.
  function toggleHeld(id) {
    setDraft((d) => {
      if (d.held.includes(id)) return { ...d, held: d.held.filter((h) => h !== id) }
      const held =
        id === 'wh3' ? ['wh3'] : [...d.held.filter((h) => h !== 'wh3'), id]
      return { ...d, held }
    })
  }

  function save() {
    if (!heldIsValid(draft.held)) return
    const persona = { ...draft, synthetic: true }
    update('personas', (ps) => {
      const idx = ps.findIndex((p) => p.id === persona.id)
      if (idx >= 0) return ps.map((p) => (p.id === persona.id ? persona : p))
      return [...ps, persona]
    })
    navigate('/participants/library')
  }

  return (
    <>
      <PageHeader
        title={editId ? 'Edit Persona' : 'Persona Builder'}
        desc="Define a synthetic participant. Personas condition interview generation only — they are never presented as real people anywhere in the app or its exports."
      />

      {ws.settings.guidance && (
        <div className="notice">
          The <strong>weight profile</strong> sets how strongly the persona’s answers lean to
          each rival proposition (must sum to 1). <strong>Held hypotheses</strong> mark what
          the persona genuinely believes — holding two at once creates a paradox persona ⚡,
          which the instrument must surface, not average away. A <strong>blind-spot probe</strong>
          answers off-script to test whether the codebook’s emergent bucket catches the unexpected.
        </div>
      )}

      <section className="card">
        <div className="grid-2">
          <div className="field">
            <label htmlFor="pb-name">Name (clearly synthetic)</label>
            <input
              id="pb-name"
              type="text"
              placeholder="e.g. Dana Reyes (synthetic)"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="pb-role">Role</label>
            <input
              id="pb-role"
              type="text"
              placeholder="e.g. Programme Coordinator"
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
            />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="pb-group">Stakeholder group</label>
            <select
              id="pb-group"
              value={draft.group}
              onChange={(e) => setDraft({ ...draft, group: e.target.value })}
            >
              {STAKEHOLDER_GROUPS.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pb-tenure">Tenure (years)</label>
            <input
              id="pb-tenure"
              type="number"
              min="0"
              max="40"
              value={draft.tenureYears}
              onChange={(e) => setDraft({ ...draft, tenureYears: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="pb-voice">Voice / stance notes (conditions generation)</label>
          <textarea
            id="pb-voice"
            rows={2}
            value={draft.voice}
            onChange={(e) => setDraft({ ...draft, voice: e.target.value })}
          />
        </div>
      </section>

      <section className="card">
        <h2>Weight profile across hypotheses</h2>
        {HYPOTHESIS_IDS.map((id) => {
          const h = ws.hypotheses[id]
          return (
            <div className="field" key={id}>
              <label htmlFor={`pb-w-${id}`} style={{ color: h.color }}>
                {h.label} — {(draft.weights[id] * 100).toFixed(0)}%
              </label>
              <input
                id={`pb-w-${id}`}
                type="range"
                min="0"
                max="100"
                value={Math.round(draft.weights[id] * 100)}
                onChange={(e) => setWeight(id, Number(e.target.value) / 100)}
                style={{ width: '100%', accentColor: h.color }}
              />
            </div>
          )
        })}
        <p className={sumOk ? 'small muted' : 'small'} style={sumOk ? {} : { color: '#b03230' }}>
          Sum: {(sum * 100).toFixed(0)}% {sumOk ? '✓' : '— must equal 100%'}{' '}
          {!sumOk && (
            <button className="btn small secondary" onClick={normalise}>Normalise to 100%</button>
          )}
        </p>
        <WeightBar
          kind="authored"
          caption
          weights={sumOk ? draft.weights : { wh1: sum ? draft.weights.wh1 / sum : 0.34, wh2: sum ? draft.weights.wh2 / sum : 0.33, wh3: sum ? draft.weights.wh3 / sum : 0.33 }}
        />
      </section>

      <section className="card">
        <h2>Held hypotheses &amp; probes</h2>
        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend className="small muted">
            Which propositions does this persona genuinely hold? (two = paradox ⚡)
          </legend>
          {HYPOTHESIS_IDS.map((id) => (
            <label key={id} style={{ display: 'block', margin: '6px 0' }}>
              <input
                type="checkbox"
                checked={draft.held.includes(id)}
                onChange={() => toggleHeld(id)}
              />{' '}
              <span style={{ color: ws.hypotheses[id].color, fontWeight: 600 }}>
                {ws.hypotheses[id].short}
              </span>{' '}
              — {ws.hypotheses[id].description}
            </label>
          ))}
          <p className="small muted" style={{ margin: '6px 0 0' }}>
            WH1 and WH2 can be held together — paradox personas hold both. WH3 means no
            association exists, so it cannot combine with either.
          </p>
        </fieldset>
        {!heldOk && (
          <p className="small" role="alert" style={{ color: '#b03230', fontWeight: 600 }}>
            Invalid combination: WH3 asserts no association, so it cannot be held alongside
            WH1 or WH2. Clear one before saving.
          </p>
        )}
        {paradox && (
          <p className="small" style={{ fontWeight: 600 }}>
            ⚡ Paradox persona: holds {draft.held.map((h) => ws.hypotheses[h].short).join(' and ')}{' '}
            at once. The simulator will include at least one genuinely contradictory answer.
          </p>
        )}
        <label style={{ display: 'block', marginTop: 10 }}>
          <input
            type="checkbox"
            checked={draft.blindSpot}
            onChange={(e) => setDraft({ ...draft, blindSpot: e.target.checked })}
          />{' '}
          <strong>Blind-spot probe</strong> — deliberately off-script; tests whether the
          codebook can capture the unexpected.
        </label>
      </section>

      <p>
        <button className="btn" onClick={save} disabled={!valid}>
          {editId ? 'Save changes' : 'Add to library'}
        </button>{' '}
        {!valid && (
          <span className="small muted">Needs a name, a role, and weights summing to 100%.</span>
        )}
      </p>
    </>
  )
}
