import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ModeGate from '../components/ModeGate'
import { useWorkspace, updateActive } from '../store/dataStore'

/**
 * Transcript entry for real fieldwork. Nothing is generated here: no simulator,
 * no LLM call, no network. The unit of entry is one answer to one protocol
 * question, which is exactly the unit the coding pipeline already consumes
 * (a segment = one answer), so a typed transcript needs no splitting heuristic.
 */
export default function TranscriptEntry() {
  const ws = useWorkspace()
  const [participantId, setParticipantId] = useState('')
  const [answers, setAnswers] = useState({})
  const [saved, setSaved] = useState('')

  if (ws.mode !== 'real') {
    return (
      <>
        <PageHeader title="Transcript Entry" desc="Hand-entered transcripts from real, consented interviews." />
        <ModeGate want="real" />
      </>
    )
  }

  const questions = [...ws.protocol.questions].sort((a, b) => a.order - b.order)
  const participants = ws.real.participants
  const participant = participants.find((p) => p.id === participantId)
  const existing = ws.real.interviews.find((iv) => iv.personaId === participantId)

  function choose(id) {
    setParticipantId(id)
    setSaved('')
    const prior = ws.real.interviews.find((iv) => iv.personaId === id)
    setAnswers(
      prior ? Object.fromEntries(prior.answers.map((a) => [a.questionId, a.text])) : {},
    )
  }

  const filled = questions.filter((q) => (answers[q.id] ?? '').trim().length > 0)

  function save() {
    if (!participant || filled.length === 0) return
    const id = existing?.id ?? `real-iv-${participant.id}-${ws.real.interviews.length}`
    const record = {
      id,
      personaId: participant.id,
      // The pipeline keys transcripts by personaId/personaName; for real data the
      // display name IS the pseudonymous code, so no real name can ever appear.
      personaName: participant.participantCode,
      real: true,
      mode: 'entered',
      seed: null,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // No `lean`, no `secondaryLean`, no `contradictory`: a real answer arrives
      // with no researcher-assigned hypothesis. Coding must read the text.
      answers: filled.map((q) => ({
        questionId: q.id,
        questionText: q.text,
        text: answers[q.id].trim(),
      })),
    }
    updateActive('interviews', (list) =>
      existing ? list.map((iv) => (iv.id === id ? record : iv)) : [...list, record],
    )
    // A re-save changes the text, so any segments coded from the old text are stale.
    updateActive('coding', (c) => ({
      ...c,
      segments: c.segments.filter((s) => s.interviewId !== id),
    }))
    setSaved(
      `Saved ${filled.length} answer${filled.length === 1 ? '' : 's'} for ${participant.participantCode}.` +
        (existing ? ' Previously coded segments for this transcript were cleared — re-code it.' : ''),
    )
  }

  return (
    <>
      <PageHeader
        title="Transcript Entry"
        desc="Type or paste what the participant actually said, answer by answer. Nothing on this page generates, completes or rewrites text, and no request leaves the browser."
      />

      <div className="notice" role="note">
        <strong>Entry only — no generation.</strong> The simulator and any live model are
        unavailable in real mode. Answers are stored verbatim and carry no pre-assigned
        hypothesis: which proposition an answer supports is decided at{' '}
        <Link to="/analysis/coding">coding</Link>, from the text.
      </div>

      {participants.length === 0 ? (
        <div className="card muted">
          No participant records yet — add them on the{' '}
          <Link to="/participants/records">Participant Records</Link> page first.
        </div>
      ) : (
        <>
          <section className="card">
            <h2>1 · Choose participant</h2>
            <div className="chip-row" role="group" aria-label="Participant selection">
              {participants.map((p) => {
                const has = ws.real.interviews.some((iv) => iv.personaId === p.id)
                return (
                  <button
                    key={p.id}
                    className={'chip' + (participantId === p.id ? ' on' : '')}
                    aria-pressed={participantId === p.id}
                    onClick={() => choose(p.id)}
                  >
                    {p.participantCode}{has ? ' ✓' : ''}
                  </button>
                )
              })}
            </div>
            <p className="small muted" style={{ marginBottom: 0 }}>
              ✓ marks a participant whose transcript is already entered — selecting them loads
              it for editing.
            </p>
          </section>

          {participant && (
            <section className="card">
              <h2>
                2 · Answers for {participant.participantCode}
                {existing && <span className="stamp" style={{ marginLeft: 8 }}>editing saved transcript</span>}
              </h2>
              <p className="small muted">
                Leave a question blank if it was not asked or not answered — blank questions
                are simply not stored, and an unanswered question is a legitimate result.
              </p>
              {questions.map((q, i) => (
                <div key={q.id} className="field">
                  <label htmlFor={`te-${q.id}`}>
                    Q{i + 1}. {q.text}
                  </label>
                  <textarea
                    id={`te-${q.id}`}
                    rows={4}
                    value={answers[q.id] ?? ''}
                    placeholder="Paste or type the participant's answer verbatim…"
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  />
                </div>
              ))}
              <p style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn" onClick={save} disabled={filled.length === 0}>
                  {existing ? 'Update transcript' : 'Save transcript'} ({filled.length}/{questions.length} answered)
                </button>
                <span className="muted small">
                  Stored locally in this browser only.
                </span>
              </p>
              {saved && <p role="status" className="small" style={{ color: '#2f9e44' }}>{saved}</p>}
            </section>
          )}
        </>
      )}
    </>
  )
}
