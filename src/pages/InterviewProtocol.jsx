import PageHeader from '../components/PageHeader'
import { useWorkspace, update } from '../store/dataStore'
import { defaultProtocolQuestions, RESEARCH_QUESTIONS } from '../data/seeds'

let nextId = 100

export default function InterviewProtocol() {
  const ws = useWorkspace()
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
        rq: 'RQ1',
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
        desc="The instrument under validation: 7 semi-structured questions — six on the internal experience of governance, one on agent trust — each mapped to a research question and its literature source."
      />

      {ws.settings.guidance && (
        <div className="notice">
          The pilot runs synthetic personas through exactly these questions. If a question
          keeps producing answers the codebook cannot classify, that is a protocol or
          codebook problem — precisely what a pilot is meant to catch before real fieldwork.
        </div>
      )}

      <p>
        <button className="btn secondary" onClick={addQuestion}>+ Add question</button>{' '}
        <button
          className="btn secondary"
          onClick={() => {
            if (window.confirm('Restore the default 7 protocol questions? This replaces the current protocol and discards any edits you have made. This cannot be undone.')) {
              setQuestions(defaultProtocolQuestions())
            }
          }}
        >
          Restore default 7
        </button>
      </p>

      {questions.map((q, i) => (
        <section className="card" key={q.id}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
            <h2 style={{ whiteSpace: 'nowrap' }}>Q{i + 1}</h2>
            <span className="tag" style={{ color: 'var(--accent)' }}>{q.rq}</span>
            {q.id === 'q7' && <span className="tag" style={{ color: 'var(--wh2)' }}>agent trust</span>}
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
              <label htmlFor={`pq-rq-${q.id}`}>Maps to research question</label>
              <select
                id={`pq-rq-${q.id}`}
                value={q.rq}
                onChange={(e) => patchQ(q.id, { rq: e.target.value })}
              >
                {RESEARCH_QUESTIONS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
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
        </section>
      ))}
    </>
  )
}
