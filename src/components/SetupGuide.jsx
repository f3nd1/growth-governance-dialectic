// Guided-setup checklist card. Two states:
//  - expanded: welcome + choose-a-path + derived checklist + optional services
//  - minimised: a small pill ("Setup guide · N/6 · Resume")
// Progress is DERIVED from data; the only persisted field is
// settings.setupGuide.dismissed (minimise vs expand).

import { Link } from 'react-router-dom'
import { useWorkspace, update, activeData } from '../store/dataStore'
import { loadDemoData } from '../engine/demo'
import {
  SETUP_WELCOME,
  SETUP_REFERENCES,
  SETUP_STEPS,
  SETUP_OPTIONAL,
  completedCount,
  stepFor,
} from '../data/setupSteps'

function setDismissed(value) {
  update('settings', (s) => ({
    ...s,
    setupGuide: { ...(s.setupGuide ?? {}), dismissed: value },
  }))
}

export default function SetupGuide() {
  const ws = useWorkspace()
  const dismissed = ws.settings.setupGuide?.dismissed ?? false
  const done = completedCount(ws)
  const total = SETUP_STEPS.length
  const allDone = done === total
  const notStarted = activeData(ws).interviews.length === 0
  const optionalDone = SETUP_OPTIONAL.isDone(ws)

  if (dismissed) {
    return (
      <section className="card" aria-label="Guided setup (minimised)" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span className="chip" aria-hidden="true" style={{ pointerEvents: 'none' }}>
          Setup guide · {done}/{total}
        </span>
        <span className="small muted" style={{ flex: 1 }}>
          {allDone ? 'Pipeline complete.' : 'Guided setup is minimised.'}
        </span>
        <button className="btn small secondary" onClick={() => setDismissed(false)}>
          Resume setup guide
        </button>
      </section>
    )
  }

  return (
    <section className="card" aria-labelledby="setup-guide-title">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h2 id="setup-guide-title" style={{ margin: 0, flex: 1 }}>
          {SETUP_WELCOME.title} <span className="muted small">· {done}/{total}</span>
        </h2>
        <button className="btn small secondary" onClick={() => setDismissed(true)}>
          Minimise
        </button>
      </div>
      <p className="small muted" style={{ marginTop: 8 }}>{SETUP_WELCOME.body}</p>

      {notStarted && ws.mode !== 'real' && (
        <div className="notice" style={{ margin: '10px 0' }}>
          <strong>Choose a path.</strong>
          <p className="small" style={{ margin: '6px 0 8px' }}>
            Load a deterministic demo run to explore the whole pipeline immediately, or start
            from the seeded instrument and build it up yourself. Either way it is all synthetic.
          </p>
          <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: 0 }}>
            <button className="btn" onClick={loadDemoData}>
              Load demo data (13 personas → coded → κ)
            </button>
            <Link className="btn secondary" to="/design/study">Start from empty →</Link>
          </p>
        </div>
      )}

      <div style={{ margin: '10px 0' }}>
        <p className="small muted" style={{ margin: '0 0 4px' }}>
          Worth reviewing first (reference, not a checklist):
        </p>
        <div className="chip-row" style={{ marginBottom: 0 }}>
          {SETUP_REFERENCES.map((r) => (
            <Link key={r.path} className="chip" to={r.path}>{r.label}</Link>
          ))}
        </div>
      </div>

      <ol style={{ margin: '10px 0', paddingLeft: 0, listStyle: 'none' }}>
        {SETUP_STEPS.map((raw) => {
          const s = stepFor(raw, ws)
          const isDone = s.done(ws)
          return (
            <li key={s.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '6px 0', borderTop: '1px solid var(--line)' }}>
              <span aria-hidden="true" style={{ color: isDone ? '#2f9e44' : 'var(--muted)', fontWeight: 700, width: 16 }}>
                {isDone ? '✓' : '○'}
              </span>
              <span style={{ flex: 1 }}>
                <Link to={s.path}>{s.label}</Link>
                <span className="sr-only">{isDone ? ' (done)' : ' (not done)'}</span>
                <div className="muted small">{s.hint}</div>
              </span>
            </li>
          )
        })}
      </ol>

      <div className="notice" style={{ margin: '10px 0' }}>
        <strong>{SETUP_OPTIONAL.title}</strong> {optionalDone && <span className="small" style={{ color: '#2f9e44' }}>· connected</span>}
        <p className="small" style={{ margin: '6px 0 0' }}>
          {SETUP_OPTIONAL.body} <Link to={SETUP_OPTIONAL.path}>Open Settings →</Link>
        </p>
      </div>

      {allDone && (
        <p style={{ margin: '4px 0 0' }}>
          <Link className="btn" to="/outputs/report">Finish → open the Pilot Report</Link>{' '}
          <Link className="btn secondary" to="/outputs/export">Export Centre</Link>
        </p>
      )}
    </section>
  )
}
