import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { activeData, updateActive, useWorkspace } from '../store/dataStore'
import { SOURCE_TYPES } from '../data/seeds'
import {
  sourceTypeOf,
  sourceTypeLabel,
  sessionLabel,
  documentTypeLabel,
} from '../engine/sources'

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
  const all = [...data.interviews].reverse()
  // Synthetic mode has one evidence type, so a filter there would be a row of
  // tabs where every tab but one is empty. Real mode only.
  const [params, setParams] = useSearchParams()
  const filter = data.isReal ? (params.get('type') ?? 'all') : 'all'
  // An import hands over the ids it just created, so "where did they go" is
  // answered by the destination rather than by hunting a list sorted by date.
  const justImported = (params.get('new') ?? '').split(',').filter(Boolean)
  const interviews = all
    .filter((iv) => filter === 'all' || sourceTypeOf(iv) === filter)
    .filter((iv) => justImported.length === 0 || justImported.includes(iv.id))
  const [selectedId, setSelectedId] = useState(null)
  const current = interviews.find((iv) => iv.id === selectedId) ?? interviews[0]
  const type = sourceTypeOf(current)
  // Turns store their prompt's id; the number shown is its place in the live
  // focus group protocol, so a reordered protocol renumbers the transcript too.
  const fgOrder = [...ws.focusGroupProtocol.questions].sort((a, b) => a.order - b.order)
  const fgNumber = (id) => fgOrder.findIndex((q) => q.id === id) + 1
  const n = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`
  const answers = current?.answers.length ?? 0
  const meta =
    type === 'focus-group'
      ? `focus group · ${n(answers, 'turn')} · ${n(current?.participantCodes?.length ?? 0, 'attendee')}`
      : type === 'document'
        ? `${documentTypeLabel(current?.docType)} · ${n(answers, 'extract')}` +
          (current?.periodLabel ? ` · ${current.periodLabel}` : '')
        : `hand-entered · ${n(answers, 'answer')}`

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

  // Only when the corpus itself is empty. A filter that matches nothing is a
  // different situation and must keep its tabs on screen, or there is no way
  // back to the type that does have transcripts.
  if (all.length === 0) {
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

      {justImported.length > 0 && (
        <div className="notice" role="status">
          Showing the {n(interviews.length, 'source')} from the last import.{' '}
          <button
            className="btn small secondary"
            onClick={() => setParams(filter === 'all' ? {} : { type: filter })}
          >
            Show all transcripts
          </button>
        </div>
      )}

      {data.isReal && (
        <div className="chip-row" role="group" aria-label="Filter by evidence type">
          {[{ id: 'all', plural: 'All' }, ...SOURCE_TYPES].map((t) => {
            const count =
              t.id === 'all' ? all.length : all.filter((iv) => sourceTypeOf(iv) === t.id).length
            return (
              <button
                key={t.id}
                className={'chip' + (filter === t.id ? ' on' : '')}
                aria-pressed={filter === t.id}
                onClick={() => {
                  // Changing type drops the just-imported narrowing: the two
                  // together answer a question nobody asked, and leaving it on
                  // would show an empty tab for a type the import did not touch.
                  setParams(t.id === 'all' ? {} : { type: t.id })
                  setSelectedId(null)
                }}
              >
                {t.plural} · {count}
              </button>
            )
          })}
        </div>
      )}

      {interviews.length === 0 ? (
        <div className="card muted">
          No {filter === 'all' ? '' : `${sourceTypeLabel(filter).toLowerCase()} `}transcripts here —
          the corpus holds {n(all.length, 'source')} under the other tabs.
        </div>
      ) : (
        <>
      <div className="chip-row" role="group" aria-label="Choose transcript">
        {interviews.map((iv) => (
          <button
            key={iv.id}
            className={'chip' + (current?.id === iv.id ? ' on' : '')}
            aria-pressed={current?.id === iv.id}
            onClick={() => setSelectedId(iv.id)}
          >
            {sessionLabel(iv).replace(' (synthetic)', '')}
            {data.isReal ? ` · ${sourceTypeLabel(sourceTypeOf(iv))}` : ` · seed ${iv.seed} · ${iv.mode}`}
          </button>
        ))}
      </div>

      {current && (
        <section className="card">
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, flex: 1 }}>{sessionLabel(current)}</h2>
            <span className="stamp">
              {data.isReal ? 'Real participant · confidential' : 'Synthetic transcript'}
            </span>
            <button className="btn small danger" onClick={() => remove(current.id)}>Delete</button>
          </div>
          <p className="muted small">
            {data.isReal ? meta : `${current.mode} mode · seed ${current.seed}`}{' '}
            · {new Date(current.createdAt).toLocaleString()}
          </p>

          {current.answers.map((a, i) => (
            <div key={a.questionId + i} style={{ borderTop: '1px solid var(--line)', padding: '12px 0' }}>
              {/* Who said it comes FIRST in a focus group: the same session holds
                  several speakers, and an unattributed turn is not evidence. An
                  interview needs no speaker line — the whole transcript is one
                  person, named in the heading above. */}
              {type === 'focus-group' ? (
                <p style={{ fontWeight: 600, marginBottom: 6 }}>
                  <span className="tag">{a.speakerCode || '(speaker not recorded)'}</span>{' '}
                  <span className="muted" style={{ fontWeight: 400 }}>
                    {a.questionText
                      ? `prompted by FG${fgNumber(a.questionId)}. ${a.questionText}`
                      : 'not on the schedule'}
                  </span>
                </p>
              ) : (
                <p style={{ fontWeight: 600, marginBottom: 6 }}>
                  {type === 'document' ? `Extract ${i + 1}.` : `Q${i + 1}.`} {a.questionText}
                </p>
              )}
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
      )}
    </>
  )
}
