import PageHeader from '../components/PageHeader'
import { useWorkspace, update, activeData } from '../store/dataStore'
import { defaultProtocolQuestions, RESEARCH_QUESTIONS, rqList } from '../data/seeds'

let nextId = 100

export default function InterviewProtocol() {
  const ws = useWorkspace()
  const isReal = activeData(ws).isReal
  const questions = [...ws.protocol.questions].sort((a, b) => a.order - b.order)

  function setQuestions(next) {
    update('protocol', (p) => ({ ...p, questions: next }))
  }

  function patchQ(id, patch) {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  function move(id, dir) {
    const idx = questions.findIndex((q) => q.id === id)
    const swap = questions[idx + dir]
    if (!swap) return
    const next = [...questions]
    next[idx] = { ...swap, order: questions[idx].order }
    next[idx + dir] = { ...questions[idx], order: swap.order }
    setQuestions(next)
  }

  function addQuestion() {
    setQuestions([
      ...questions,
      {
        id: `q-custom-${nextId++}-${questions.length}`,
        order: (questions[questions.length - 1]?.order ?? 0) + 1,
        text: '',
        rq: ['RQ1'],
        source: '',
      },
    ])
  }

  function remove(id) {
    setQuestions(questions.filter((q) => q.id !== id))
  }

  return (
    <>
      <PageHeader
        title="Interview Protocol"
        desc="The instrument under validation: 9 semi-structured questions — six on the internal experience of governance, one phase-reflection question, one on agent trust, one on investor confidence — each mapped to a research question and its literature source."
      />

      {ws.settings.guidance && (
        <div className="notice">
          {isReal
            ? 'Entered transcripts are keyed to exactly these questions. If a question'
            : 'The pilot runs synthetic personas through exactly these questions. If a question'}{' '}
          keeps producing answers the codebook cannot classify, that is a protocol or
          codebook problem — precisely what a pilot is meant to catch before real fieldwork.
        </div>
      )}

      <section className="card">
        <h2>Opening script (read verbatim, before questions)</h2>
        <p className="small muted">
          Consent and recording permission. Part of the instrument — validated alongside the questions.
        </p>
        <div className="field">
          <label htmlFor="pq-opening" className="sr-only">Opening script</label>
          <textarea
            id="pq-opening"
            rows={7}
            value={ws.protocol.openingScript ?? ''}
            onChange={(e) => update('protocol', (p) => ({ ...p, openingScript: e.target.value }))}
          />
        </div>
      </section>

      <p>
        <button className="btn secondary" onClick={addQuestion}>+ Add question</button>{' '}
        <button
          className="btn secondary"
          onClick={() => {
            if (window.confirm('Restore the default 9 protocol questions? This replaces the current protocol and discards any edits you have made. This cannot be undone.')) {
              setQuestions(defaultProtocolQuestions())
            }
          }}
        >
          Restore default 9
        </button>
      </p>

      {questions.map((q, i) => (
        <section className="card" key={q.id}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
            <h2 style={{ whiteSpace: 'nowrap' }}>Q{i + 1}</h2>
            {rqList(q.rq).map((r) => (
              <span key={r} className="tag" style={{ color: 'var(--accent)' }}>{r}</span>
            ))}
            {q.id === 'q7-phase' && <span className="tag" style={{ color: 'var(--accent)' }}>phase reflection</span>}
            {q.id === 'q7' && <span className="tag" style={{ color: 'var(--wh2)' }}>agent trust</span>}
            {q.id === 'q8' && <span className="tag" style={{ color: 'var(--wh2)' }}>investor confidence</span>}
            <span style={{ flex: 1 }} />
            <button className="btn small secondary" onClick={() => move(q.id, -1)} disabled={i === 0} aria-label={`Move Q${i + 1} up`}>↑</button>
            <button className="btn small secondary" onClick={() => move(q.id, 1)} disabled={i === questions.length - 1} aria-label={`Move Q${i + 1} down`}>↓</button>
            <button className="btn small danger" onClick={() => remove(q.id)} aria-label={`Delete Q${i + 1}`}>Delete</button>
          </div>
          <div className="field">
            <label htmlFor={`pq-text-${q.id}`}>Question text</label>
            <textarea
              id={`pq-text-${q.id}`}
              rows={2}
              value={q.text}
              onChange={(e) => patchQ(q.id, { text: e.target.value })}
            />
          </div>
          <div className="grid-2">
            <div className="field">
              <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                <legend
                  style={{
                    padding: 0,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--muted)',
                    marginBottom: 3,
                  }}
                >
                  Maps to research question{rqList(q.rq).length > 1 ? 's' : ''} (one or more)
                </legend>
                {RESEARCH_QUESTIONS.map((r) => {
                  const selected = rqList(q.rq).includes(r.id)
                  const isLast = selected && rqList(q.rq).length === 1
                  return (
                    <label key={r.id} className="small" style={{ display: 'block', margin: '4px 0' }}>
                      <input
                        type="checkbox"
                        checked={selected}
                        // A question must map to at least one RQ.
                        disabled={isLast}
                        onChange={() =>
                          patchQ(q.id, {
                            rq: selected
                              ? rqList(q.rq).filter((x) => x !== r.id)
                              : [...rqList(q.rq), r.id].sort(),
                          })
                        }
                      />{' '}
                      {r.label}
                    </label>
                  )
                })}
                {rqList(q.rq).length === 1 && (
                  <p className="small muted" style={{ margin: '2px 0 0' }}>
                    At least one mapping is required — add another before removing this one.
                  </p>
                )}
              </fieldset>
            </div>
            <div className="field">
              <label htmlFor={`pq-src-${q.id}`}>Literature source</label>
              <input
                id={`pq-src-${q.id}`}
                type="text"
                value={q.source}
                onChange={(e) => patchQ(q.id, { source: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor={`pq-probes-${q.id}`}>Probes (one per line — used only if the answer needs opening up)</label>
            <textarea
              id={`pq-probes-${q.id}`}
              rows={3}
              value={(q.probes ?? []).join('\n')}
              onChange={(e) =>
                patchQ(q.id, { probes: e.target.value.split('\n').filter((l) => l.trim()) })
              }
            />
          </div>
        </section>
      ))}

      <section className="card">
        <h2>Closing script (read verbatim, after questions)</h2>
        <p className="small muted">
          Catch-all prompt plus quote-checking consent.
        </p>
        <div className="field">
          <label htmlFor="pq-closing" className="sr-only">Closing script</label>
          <textarea
            id="pq-closing"
            rows={5}
            value={ws.protocol.closingScript ?? ''}
            onChange={(e) => update('protocol', (p) => ({ ...p, closingScript: e.target.value }))}
          />
        </div>
      </section>
    </>
  )
}
