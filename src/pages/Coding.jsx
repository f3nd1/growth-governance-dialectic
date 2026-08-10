import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { activeData, updateActive, useWorkspace } from '../store/dataStore'
import { codeInterview, UNCLASSIFIED } from '../engine/coding'

function CodeName({ codeId, codebook, hypotheses }) {
  if (codeId === UNCLASSIFIED) {
    return <span className="tag" style={{ color: '#7c3aed' }}>unclassified</span>
  }
  const code = codebook.codes.find((c) => c.id === codeId)
  if (!code) return <span className="tag muted">deleted code</span>
  const color = hypotheses[code.group]?.color ?? '#7c3aed'
  return <span className="tag" style={{ color }}>{code.label}</span>
}

export default function Coding() {
  const ws = useWorkspace()
  const data = activeData(ws)
  const [filter, setFilter] = useState('all')

  const segments = data.coding.segments
  const codedInterviewIds = new Set(segments.map((s) => s.interviewId))
  const uncoded = data.interviews.filter((iv) => !codedInterviewIds.has(iv.id))
  const disagreements = segments.filter((s) => s.coderA !== s.coderB)

  function codeAll(recode) {
    const targets = recode ? data.interviews : uncoded
    const fresh = targets.flatMap((iv) => codeInterview(iv, ws.codebook))
    updateActive('coding', (c) => ({
      ...c,
      segments: recode
        ? fresh
        : [...c.segments, ...fresh],
      overridesLog: recode ? [] : c.overridesLog,
    }))
  }

  function overrideSegment(segId, codeId) {
    updateActive('coding', (c) => {
      const seg = c.segments.find((s) => s.id === segId)
      const value = codeId === '' ? null : codeId
      return {
        ...c,
        segments: c.segments.map((s) => (s.id === segId ? { ...s, override: value } : s)),
        overridesLog: [
          {
            when: new Date().toISOString(),
            segmentId: segId,
            persona: seg?.personaName,
            from: seg?.override ?? seg?.coderA,
            to: value ?? '(cleared — back to Coder A)',
          },
          ...c.overridesLog,
        ],
      }
    })
  }

  const shown = filter === 'disagreements' ? disagreements : segments

  return (
    <>
      <PageHeader
        title="Coding"
        desc="Two independent coders classify every synthetic transcript segment against the codebook. Coder A is the primary keyword classifier; Coder B is a second heuristic pass whose reliability depends on how sharp your code definitions are."
      />

      {ws.settings.guidance && (
        <div className="notice">
          Disagreements are the signal, not the noise: they cluster on vague definitions,
          contradictory (paradox) answers and off-script content. Overrides are allowed but
          logged — in real fieldwork that log is your audit trail.
        </div>
      )}

      <section className="card">
        <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn" onClick={() => codeAll(false)} disabled={uncoded.length === 0}>
            Code {uncoded.length} uncoded interview{uncoded.length === 1 ? '' : 's'}
          </button>
          <button className="btn secondary" onClick={() => codeAll(true)} disabled={data.interviews.length === 0}>
            Re-code everything
          </button>
          <span className="muted small">
            {segments.length} segments · {disagreements.length} disagreements ·{' '}
            {segments.filter((s) => s.override).length} manual overrides
          </span>
        </p>
        {data.interviews.length === 0 && (
          <p className="muted">
            No interviews to code —{' '}
            {data.isReal ? (
              <Link to="/fieldwork/entry">enter a transcript</Link>
            ) : (
              <Link to="/fieldwork/run">run some</Link>
            )}{' '}
            first.
          </p>
        )}
      </section>

      {segments.length > 0 && (
        <>
          <div className="chip-row" role="group" aria-label="Filter segments">
            <button className={'chip' + (filter === 'all' ? ' on' : '')} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
              All ({segments.length})
            </button>
            <button className={'chip' + (filter === 'disagreements' ? ' on' : '')} aria-pressed={filter === 'disagreements'} onClick={() => setFilter('disagreements')}>
              Disagreements only ({disagreements.length})
            </button>
          </div>

          <section className="card" style={{ overflowX: 'auto' }}>
            <table className="data">
              <thead>
                <tr>
                  <th style={{ minWidth: 260 }}>Segment (synthetic)</th>
                  <th>Coder A</th>
                  <th>Coder B</th>
                  <th>Override (logged)</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((s) => {
                  const disagree = s.coderA !== s.coderB
                  return (
                    <tr key={s.id} style={disagree ? { background: '#fff4f2' } : {}}>
                      <td>
                        <strong>{s.personaName.replace(' (synthetic)', '')}</strong>{' '}
                        <span className="muted">Q{s.questionIndex + 1}</span>
                        {s.contradictory && ' ⚡'}
                        <div className="small muted" style={{ maxWidth: 420 }}>{s.text}</div>
                      </td>
                      <td><CodeName codeId={s.coderA} codebook={ws.codebook} hypotheses={ws.hypotheses} /></td>
                      <td>
                        <CodeName codeId={s.coderB} codebook={ws.codebook} hypotheses={ws.hypotheses} />
                        {disagree && <div className="small" style={{ color: '#b03230' }}>disagree</div>}
                      </td>
                      <td>
                        <select
                          aria-label={`Override code for ${s.personaName} Q${s.questionIndex + 1}`}
                          value={s.override ?? ''}
                          onChange={(e) => overrideSegment(s.id, e.target.value)}
                        >
                          <option value="">— keep Coder A —</option>
                          {ws.codebook.codes.map((c) => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                          <option value={UNCLASSIFIED}>unclassified</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        </>
      )}

      {data.coding.overridesLog.length > 0 && (
        <section className="card">
          <h2>Override log</h2>
          <table className="data">
            <thead>
              <tr><th>When</th><th>Persona</th><th>From</th><th>To</th></tr>
            </thead>
            <tbody>
              {data.coding.overridesLog.slice(0, 20).map((o, i) => (
                <tr key={i}>
                  <td>{new Date(o.when).toLocaleTimeString()}</td>
                  <td>{o.persona}</td>
                  <td className="small">{o.from}</td>
                  <td className="small">{o.to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  )
}
