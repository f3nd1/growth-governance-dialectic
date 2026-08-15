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
  // Which session has its delete panel open, and what has been typed into it.
  const [confirmingId, setConfirmingId] = useState(null)
  const [typed, setTyped] = useState('')
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

  // Synthetic transcripts are reproducible from persona + seed, so deleting one
  // costs a re-run. This path is unchanged.
  function remove(id) {
    if (!window.confirm('Delete this synthetic transcript and its coded segments?')) return
    updateActive('interviews', (ivs) => ivs.filter((iv) => iv.id !== id))
    updateActive('coding', (c) => ({
      ...c,
      segments: c.segments.filter((s) => s.interviewId !== id),
    }))
  }

  // Real evidence is not reproducible: what is deleted here was said once, by a
  // person, and the app holds the only copy. So the real path is separate from
  // the synthetic one above — deliberately not one function with a mode flag,
  // because the flag is the thing that would eventually be got wrong — and it
  // asks for the session's own name to be typed rather than a click.
  const doomed = data.isReal && confirmingId ? all.find((iv) => iv.id === confirmingId) : null
  const doomedSegments = doomed
    ? data.coding.segments.filter((s) => s.interviewId === doomed.id)
    : []
  const doomedOverrides = doomed
    ? data.coding.overridesLog.filter((o) =>
        doomedSegments.some((s) => s.id === o.segmentId),
      ).length
    : 0

  function removeReal() {
    if (!doomed || typed !== sessionLabel(doomed)) return
    const segIds = new Set(doomedSegments.map((s) => s.id))
    updateActive('interviews', (ivs) => ivs.filter((iv) => iv.id !== doomed.id))
    updateActive('coding', (c) => ({
      ...c,
      segments: c.segments.filter((s) => s.interviewId !== doomed.id),
      // The log is an audit trail of decisions about segments. Once its
      // segments are gone the entries point at nothing, and a stale entry in a
      // methods appendix is worse than no entry.
      overridesLog: c.overridesLog.filter((o) => !segIds.has(o.segmentId)),
    }))
    setConfirmingId(null)
    setTyped('')
    setSelectedId(null)
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
            {data.isReal ? (
              <button
                className="btn small danger"
                onClick={() => {
                  setConfirmingId(confirmingId === current.id ? null : current.id)
                  setTyped('')
                }}
              >
                Delete…
              </button>
            ) : (
              <button className="btn small danger" onClick={() => remove(current.id)}>Delete</button>
            )}
          </div>
          <p className="muted small">
            {data.isReal ? meta : `${current.mode} mode · seed ${current.seed}`}{' '}
            · {new Date(current.createdAt).toLocaleString()}
          </p>

          {doomed?.id === current.id && (
            <div className="notice" role="alertdialog" style={{ borderLeftColor: '#b03230' }}>
              <p style={{ margin: '0 0 6px', fontWeight: 700 }}>
                Permanently delete {sessionLabel(doomed)}?
              </p>
              <ul className="small" style={{ margin: '0 0 8px', paddingLeft: 18 }}>
                <li>
                  the {sourceTypeLabel(sourceTypeOf(doomed)).toLowerCase()} itself, and its{' '}
                  {n(doomed.answers.length, type === 'focus-group' ? 'turn' : 'answer')} of verbatim
                  text
                </li>
                <li>{n(doomedSegments.length, 'coded segment')} derived from it</li>
                <li>
                  {n(doomedOverrides, 'entry')} in the override log recorded against those segments
                </li>
              </ul>
              <p className="small" style={{ margin: '0 0 8px' }}>
                Nothing else is touched: no other session, no participant record, no codebook or
                protocol change. The app holds the only copy of this text and there is no undo.
              </p>
              <div className="field" style={{ maxWidth: 380 }}>
                <label htmlFor="del-confirm">
                  Type <strong>{sessionLabel(doomed)}</strong> to confirm
                </label>
                <input
                  id="del-confirm"
                  type="text"
                  autoComplete="off"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                />
              </div>
              <p style={{ display: 'flex', gap: 8, margin: 0 }}>
                <button
                  className="btn small danger"
                  disabled={typed !== sessionLabel(doomed)}
                  onClick={removeReal}
                >
                  Delete permanently
                </button>
                <button
                  className="btn small secondary"
                  onClick={() => { setConfirmingId(null); setTyped('') }}
                >
                  Cancel
                </button>
              </p>
            </div>
          )}

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
