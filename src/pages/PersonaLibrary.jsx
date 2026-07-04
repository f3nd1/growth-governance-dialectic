import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import WeightBar from '../components/WeightBar'
import { useWorkspace, update } from '../store/dataStore'
import { STAKEHOLDER_GROUPS, defaultPersonas } from '../data/seeds'

export default function PersonaLibrary() {
  const ws = useWorkspace()
  const navigate = useNavigate()

  function remove(id) {
    if (!window.confirm('Delete this synthetic persona? Its past interviews are kept.')) return
    update('personas', (ps) => ps.filter((p) => p.id !== id))
  }

  return (
    <>
      <PageHeader
        title="Persona Library"
        desc="Every synthetic participant available to the pipeline. Personas condition generation only — they never appear as real people."
      />

      <p>
        <Link className="btn" to="/participants/builder">+ New persona</Link>{' '}
        <button
          className="btn secondary"
          onClick={() => update('personas', () => defaultPersonas())}
        >
          Reset to default 8
        </button>
      </p>

      <div className="grid-2">
        {ws.personas.map((p) => {
          const group = STAKEHOLDER_GROUPS.find((g) => g.id === p.group)
          const paradox = p.held.length >= 2
          const runs = ws.interviews.filter((iv) => iv.personaId === p.id).length
          return (
            <section className="card" key={p.id} aria-label={`Persona ${p.name}`}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, flex: 1 }}>
                  {paradox && <span title="Paradox persona — holds two hypotheses at once" aria-label="paradox persona">⚡ </span>}
                  {p.name}
                </h2>
                <span className="stamp">Synthetic</span>
              </div>
              <p className="muted small" style={{ margin: '4px 0 10px' }}>
                {p.role} · {group?.label ?? p.group} · {p.tenureYears} yr
                {p.blindSpot && (
                  <>
                    {' '}· <strong style={{ color: '#7c3aed' }}>blind-spot probe</strong>
                  </>
                )}
              </p>
              <WeightBar weights={p.weights} />
              <p className="small muted" style={{ margin: '8px 0' }}>
                Holds: {p.held.length ? p.held.map((h) => ws.hypotheses[h].short).join(' + ') : '—'}
                {' · '}
                {runs} interview run{runs === 1 ? '' : 's'}
              </p>
              {p.voice && <p className="small" style={{ fontStyle: 'italic' }}>{p.voice}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn small secondary"
                  onClick={() => navigate(`/participants/builder?id=${p.id}`)}
                >
                  Edit
                </button>
                <button className="btn small danger" onClick={() => remove(p.id)}>
                  Delete
                </button>
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}
