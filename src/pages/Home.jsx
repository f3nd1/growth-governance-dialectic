import PageHeader from '../components/PageHeader'
import SetupGuide from '../components/SetupGuide'
import { useWorkspace } from '../store/dataStore'

export default function Home() {
  const ws = useWorkspace()

  return (
    <>
      <PageHeader
        title="Pilot pipeline overview"
        desc="A doctoral research instrument: validates the data-collection and analysis method for the growth-vs-governance dialectic study on clearly-labelled synthetic participants — before any real fieldwork."
      />

      <SetupGuide />

      <div className="notice">
        <strong>What this is:</strong> a dry run of the full mixed-methods pipeline
        (protocol → personas → interviews → dual coding → reliability → pattern-matching)
        on synthetic participants. <strong>What it is not:</strong> a source of findings.
        Nothing here says anything about the real institution.
      </div>

      <section className="card">
        <h2>Rival propositions (rival propositions)</h2>
        <p className="muted small">
          Framed as rival propositions, not statistical H0/H1 — the pilot tests
          whether the instrument can discriminate between them (including when two hold at once).
        </p>
        {Object.values(ws.hypotheses).map((h) => (
          <p key={h.id} style={{ borderLeft: `4px solid ${h.color}`, paddingLeft: 10 }}>
            <strong>{h.label}.</strong> {h.description}
          </p>
        ))}
      </section>

      <p className="muted small">
        Workspace last updated {new Date(ws.meta.updatedAt).toLocaleString()} · saved locally
        {ws.settings.supabase.url ? ' + Supabase sync' : ''}.
      </p>
    </>
  )
}
