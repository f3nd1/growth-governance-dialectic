import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { activeData, updateActive, useWorkspace } from '../store/dataStore'

function LeanTag({ lean, secondaryLean, hypotheses }) {
  if (lean === 'offscript') {
    return <span className="tag" style={{ color: '#7c3aed' }}>off-script</span>
  }
  const h = hypotheses[lean]
  return (
    <>
      <span className="tag" style={{ color: h?.color }}>{h?.short ?? lean}</span>
      {secondaryLean && hypotheses[secondaryLean] && (
        <>
          {' '}
          <span className="tag" style={{ color: hypotheses[secondaryLean].color }}>
            + {hypotheses[secondaryLean].short}
          </span>
        </>
      )}
    </>
  )
}

export default function Transcripts() {
  const ws = useWorkspace()
  const data = activeData(ws)
  const interviews = [...data.interviews].reverse()
  const [selectedId, setSelectedId] = useState(null)
  const current = interviews.find((iv) => iv.id === selectedId) ?? interviews[0]

  function remove(id) {
    const what = data.isReal
      ? 'Delete this real participant transcript and its coded segments? The verbatim text is not recoverable.'
      : 'Delete this synthetic transcript and its coded segments?'
    if (!window.confirm(what)) return
    updateActive('interviews', (ivs) => ivs.filter((iv) => iv.id !== id))
    updateActive('coding', (c) => ({
      ...c,
      segments: c.segments.filter((s) => s.interviewId !== id),
    }))
  }

  if (interviews.length === 0) {
    return (
      <>
        <PageHeader title="Transcripts" desc="Per-interview Q/A view." />
        <div className="card muted">
          No transcripts yet —{' '}
          {data.isReal ? (
            <Link to="/fieldwork/entry">enter one</Link>
          ) : (
            <Link to="/fieldwork/run">run interviews</Link>
          )}{' '}
          first.
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Transcripts"
        desc={
          data.isReal
            ? 'Per-interview Q/A view of hand-entered, confidential transcripts. Real answers carry no pre-assigned hypothesis — the coders read the text.'
            : 'Per-interview Q/A view; each answer is pre-tagged with the hypothesis it leans to. Every transcript is synthetic.'
        }
      />

      <div className="chip-row" role="group" aria-label="Choose transcript">
        {interviews.map((iv) => (
          <button
            key={iv.id}
            className={'chip' + (current?.id === iv.id ? ' on' : '')}
            aria-pressed={current?.id === iv.id}
            onClick={() => setSelectedId(iv.id)}
          >
            {iv.personaName.replace(' (synthetic)', '')}
            {data.isReal ? ' · entered' : ` · seed ${iv.seed} · ${iv.mode}`}
          </button>
        ))}
      </div>

      {current && (
        <section className="card">
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, flex: 1 }}>{current.personaName}</h2>
            <span className="stamp">
              {data.isReal ? 'Real participant · confidential' : 'Synthetic transcript'}
            </span>
            <button className="btn small danger" onClick={() => remove(current.id)}>Delete</button>
          </div>
          <p className="muted small">
            {data.isReal
              ? `hand-entered · ${current.answers.length} answers`
              : `${current.mode} mode · seed ${current.seed}`}{' '}
            · {new Date(current.createdAt).toLocaleString()}
          </p>

          {current.answers.map((a, i) => (
            <div key={a.questionId + i} style={{ borderTop: '1px solid var(--line)', padding: '12px 0' }}>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>
                Q{i + 1}. {a.questionText}
              </p>
              <p style={{ marginBottom: 6 }}>{a.text}</p>
              {!data.isReal && (
                <p className="small" style={{ margin: 0 }}>
                  Pre-tag: <LeanTag lean={a.lean} secondaryLean={a.secondaryLean} hypotheses={ws.hypotheses} />
                  {a.contradictory && (
                    <strong> · ⚡ contradictory answer — paradox surfaced by design</strong>
                  )}
                </p>
              )}
            </div>
          ))}
        </section>
      )}
    </>
  )
}
