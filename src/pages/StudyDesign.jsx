import PageHeader from '../components/PageHeader'
import { useWorkspace, update, activeData } from '../store/dataStore'

const FIELDS = [
  { key: 'title', label: 'Working title', rows: 2 },
  { key: 'design', label: 'Design', rows: 2 },
  { key: 'summary', label: 'Design summary', rows: 6 },
  { key: 'unitOfAnalysis', label: 'Unit of analysis', rows: 2 },
  { key: 'pilotPurpose', label: 'Purpose of this pilot', rows: 4 },
]

export default function StudyDesign() {
  const ws = useWorkspace()
  const isReal = activeData(ws).isReal

  function setField(key, value) {
    update('studyDesign', (sd) => ({ ...sd, [key]: value }))
  }

  return (
    <>
      <PageHeader
        title="Study Design"
        desc="Editable summary of the fully qualitative single-case design. Every other page in the app points back to this as its reference."
      />

      {ws.settings.guidance && (
        <div className="notice">
          This is the design the pilot exercises: qualitative evidence — interviews (internal
          staff, external investors and agents), focus groups, and governance/financial
          records as documentary evidence — all thematically coded against one codebook and
          merged in a pattern-matching joint display against WH1/WH2/WH3. The pilot runs the
          interview strand on {isReal ? 'real consented participants' : 'synthetic participants to validate the instrument itself'}.
        </div>
      )}

      <section className="card">
        {FIELDS.map((f) => (
          <div className="field" key={f.key}>
            <label htmlFor={`sd-${f.key}`}>{f.label}</label>
            <textarea
              id={`sd-${f.key}`}
              rows={f.rows}
              value={ws.studyDesign[f.key]}
              onChange={(e) => setField(f.key, e.target.value)}
            />
          </div>
        ))}
      </section>

      <section className="card">
        <h2>How the rest of the app uses this</h2>
        <ul className="small">
          <li><strong>Interview Protocol</strong> operationalises the qualitative strand (RQ2/RQ3).</li>
          <li><strong>Codebook</strong> holds the a priori codes derived from the three rival propositions.</li>
          {isReal ? (
            <li><strong>Participant records</strong> are pseudonymous; the embedded stakeholder groups are recorded per participant.</li>
          ) : (
            <li><strong>Personas</strong> are synthetic stand-ins for the embedded stakeholder groups.</li>
          )}
          <li><strong>Joint Display</strong> reproduces the Chapter 3 pattern-matching matrix; only its qualitative rows can be populated by this pilot.</li>
        </ul>
      </section>
    </>
  )
}
