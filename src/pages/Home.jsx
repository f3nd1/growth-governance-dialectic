import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useWorkspace } from '../store/dataStore'

export default function Home() {
  const ws = useWorkspace()

  const steps = [
    {
      label: 'Design instrument',
      done: ws.protocol.questions.length > 0 && ws.codebook.codes.length > 0,
      detail: `${ws.protocol.questions.length} protocol questions · ${ws.codebook.codes.length} codes`,
      to: '/design/protocol',
    },
    {
      label: 'Build synthetic personas',
      done: ws.personas.length > 0,
      detail: `${ws.personas.length} personas`,
      to: '/participants/library',
    },
    {
      label: 'Run interviews',
      done: ws.interviews.length > 0,
      detail: `${ws.interviews.length} synthetic interviews`,
      to: '/fieldwork/run',
    },
    {
      label: 'Dual-code + reliability',
      done: ws.coding.segments.length > 0,
      detail: `${ws.coding.segments.length} coded segments`,
      to: '/analysis/coding',
    },
    {
      label: 'Pattern-match + report',
      done: ws.coding.segments.length > 0 && ws.interviews.length > 0,
      detail: 'joint display & pilot report',
      to: '/analysis/patterns',
    },
  ]

  const nextStep = steps.find((s) => !s.done)

  return (
    <>
      <PageHeader
        title="Pilot pipeline overview"
        desc="A doctoral research instrument: validates the data-collection and analysis method for the growth-vs-governance dialectic study on clearly-labelled synthetic participants — before any real fieldwork."
      />

      <div className="notice">
        <strong>What this is:</strong> a dry run of the full mixed-methods pipeline
        (protocol → personas → interviews → dual coding → reliability → pattern-matching)
        on synthetic participants. <strong>What it is not:</strong> a source of findings.
        Nothing here says anything about the real institution.
      </div>

      <div className="grid-2">
        <section className="card" aria-labelledby="pipeline-status">
          <h2 id="pipeline-status">Pipeline status</h2>
          <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
            {steps.map((s) => (
              <li key={s.label} style={{ marginBottom: 8 }}>
                <Link to={s.to}>{s.label}</Link>{' '}
                {s.done ? <span style={{ color: '#2f9e44' }}>✓</span> : <span className="muted">·</span>}
                <div className="muted small">{s.detail}</div>
              </li>
            ))}
          </ol>
        </section>

        <section className="card" aria-labelledby="resume-panel">
          <h2 id="resume-panel">Resume</h2>
          {nextStep ? (
            <>
              <p>
                Next up: <strong>{nextStep.label}</strong>
              </p>
              <Link className="btn" to={nextStep.to}>
                Continue → {nextStep.label}
              </Link>
            </>
          ) : (
            <>
              <p>All pipeline stages have data. Review the outputs.</p>
              <Link className="btn" to="/outputs/report">
                Open Pilot Report
              </Link>
            </>
          )}
          <p className="muted small" style={{ marginTop: 12 }}>
            Workspace last updated {new Date(ws.meta.updatedAt).toLocaleString()} ·
            saved locally{ws.settings.supabase.url ? ' + Supabase sync' : ''}.
          </p>
        </section>
      </div>

      <section className="card">
        <h2>Working hypotheses (rival propositions)</h2>
        <p className="muted small">
          Framed as rival working propositions, not statistical H0/H1 — the pilot tests
          whether the instrument can discriminate between them (including when two hold at once).
        </p>
        {Object.values(ws.hypotheses).map((h) => (
          <p key={h.id} style={{ borderLeft: `4px solid ${h.color}`, paddingLeft: 10 }}>
            <strong>{h.label}.</strong> {h.description}
          </p>
        ))}
      </section>
    </>
  )
}
