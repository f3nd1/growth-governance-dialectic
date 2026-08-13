import { SOURCE_TYPES } from '../data/seeds'

const OPTIONS = [
  { id: 'all', label: 'All evidence' },
  ...SOURCE_TYPES.map((t) => ({ id: t.id, label: t.plural })),
]

/**
 * A view filter, not a stored setting: group conformity in focus groups and
 * organisational-record bias in documents are validity concerns the researcher
 * inspects by switching between them, not a workspace preference. Real mode
 * only — the caller decides that, since synthetic mode has one evidence type.
 */
export default function EvidenceTypeFilter({ value, onChange, children }) {
  return (
    <section className="card">
      <h2>Evidence type</h2>
      <div className="chip-row" role="group" aria-label="Evidence type filter">
        {OPTIONS.map((t) => (
          <button
            key={t.id}
            className={'chip' + (value === t.id ? ' on' : '')}
            aria-pressed={value === t.id}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="small muted" style={{ marginBottom: 0 }}>{children}</p>
    </section>
  )
}
