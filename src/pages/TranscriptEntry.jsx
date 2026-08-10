import { Fragment, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ModeGate from '../components/ModeGate'
import { useWorkspace, updateActive, updateRealBatch } from '../store/dataStore'
import { STAKEHOLDER_GROUPS } from '../data/seeds'
import {
  buildImportPlan,
  applyImportPlan,
  templateCSV,
  EXAMPLE_CODE,
} from '../engine/transcriptImport'

const STATUS = {
  ready: { label: 'ready', tone: '#2f9e44' },
  unknown: { label: 'no such participant', tone: '#b03230' },
  duplicate: { label: 'duplicate code in file', tone: '#b03230' },
  'existing-transcript': { label: 'already has a transcript', tone: '#b03230' },
  example: { label: 'template example', tone: 'var(--muted)' },
}

const preview = (t) => (t.length > 80 ? `${t.slice(0, 80)}…` : t)

function download(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

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
  // Import state lives only here until the user confirms; nothing reaches the
  // store before that, so Cancel is simply dropping this object.
  const [plan, setPlan] = useState(null)
  const [importError, setImportError] = useState('')
  const [openRow, setOpenRow] = useState(null)
  const [importDone, setImportDone] = useState('')
  const fileRef = useRef(null)

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

  // ------------------------------------------------------------- bulk import
  function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file after a fix
    if (!file) return
    setImportError('')
    setImportDone('')
    setPlan(null)
    setOpenRow(null)
    const reader = new FileReader()
    reader.onerror = () => setImportError('Could not read the file.')
    reader.onload = () => {
      const result = buildImportPlan({
        text: String(reader.result),
        questions,
        participants,
        interviews: ws.real.interviews,
      })
      if (result.error) {
        setImportError(result.error)
        return
      }
      setPlan({ ...result, filename: file.name })
    }
    reader.readAsText(file)
  }

  function patchRow(i, patch) {
    setPlan((p) => ({ ...p, rows: p.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) }))
  }

  const chosen = plan ? plan.rows.filter((r) => r.action !== 'skip') : []
  const needsGroup = chosen.some((r) => r.action === 'create' && !r.newGroup)
  const canImport = Boolean(plan?.ok) && chosen.length > 0 && !needsGroup

  function confirmImport() {
    if (!canImport) return
    let count = 0
    // One commit: participants, transcripts and the segment purge land together
    // or not at all, so a failure cannot leave a half-imported workspace.
    updateRealBatch((real) => {
      const { next, imported } = applyImportPlan(real, plan.rows)
      count = imported.length
      return next
    })
    setImportDone(
      `Imported ${count} transcript${count === 1 ? '' : 's'} from ${plan.filename}. ` +
        'Nothing is coded yet — run the coders on the Coding page.',
    )
    setPlan(null)
    setOpenRow(null)
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


      <section className="card">
        <h2>Bulk import from a file</h2>
        <p className="small muted">
          For a full round of fieldwork, entering every answer by hand is impractical. Import
          accepts a <strong>CSV</strong> (or tab-separated <code>.tsv</code>/<code>.txt</code>)
          with a header row, in either layout:
        </p>
        <ul className="small muted" style={{ margin: '0 0 10px 1.1rem' }}>
          <li>
            <strong>Wide</strong> — one row per participant:{' '}
            <code>participantCode,q1,…,q{questions.length}</code>
          </li>
          <li>
            <strong>Long</strong> — one row per answer:{' '}
            <code>participantCode,questionNumber,answer</code>
          </li>
        </ul>
        <p className="small muted">
          Empty cells mean “not asked / not answered” and are stored as nothing. Answers
          containing commas, quotes or line breaks must be wrapped in double quotes, with
          internal quotes doubled — the template shows this. The file is read in this browser
          and its contents are never sent anywhere.
        </p>
        <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn secondary"
            onClick={() => download('transcript_import_template.csv', templateCSV(questions), 'text/csv')}
          >
            Download CSV template
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/plain"
            onChange={onFile}
            style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
            aria-hidden="true"
            tabIndex={-1}
          />
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Choose file to import…
          </button>
        </p>
        <p className="small muted" style={{ marginBottom: 0 }}>
          The template carries the current protocol’s question text in a reference row (ignored
          on import) and one example row coded <code>{EXAMPLE_CODE}</code>, which import always
          skips.
        </p>

        {importError && (
          <p className="small" role="alert" style={{ color: '#b03230' }}>{importError}</p>
        )}
        {importDone && (
          <p className="small" role="status" style={{ color: '#2f9e44' }}>{importDone}</p>
        )}

        {plan && (
          <div className="notice" style={{ marginTop: 12 }}>
            <p style={{ margin: '0 0 6px' }}>
              <strong>{plan.filename}</strong> — {plan.format} format,{' '}
              {plan.delimiter === '\t' ? 'tab' : 'comma'} separated. Nothing has been written
              yet.
            </p>
            {plan.notes.map((n) => (
              <p key={n} className="small muted" style={{ margin: '0 0 4px' }}>{n}</p>
            ))}

            {plan.blocking.length > 0 && (
              <div role="alert" style={{ margin: '8px 0' }}>
                <p className="small" style={{ color: '#b03230', margin: '0 0 4px', fontWeight: 700 }}>
                  This file cannot be imported — no part of it will be applied:
                </p>
                <ul className="small" style={{ margin: '0 0 0 1.1rem', color: '#b03230' }}>
                  {plan.blocking.map((b) => <li key={b}>{b}</li>)}
                </ul>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Row(s)</th>
                    <th>Answers</th>
                    <th>Status</th>
                    <th>Action</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {plan.rows.map((r, i) => (
                    <Fragment key={`${r.code}-${i}`}>
                      <tr>
                        <td>
                          <strong>{r.code}</strong>
                          {r.nameWarning && (
                            <div className="small" style={{ color: '#b03230' }}>
                              looks like a personal name — use a pseudonymous code
                            </div>
                          )}
                        </td>
                        <td className="small">{r.rowNumbers.join(', ')}</td>
                        <td>{r.answers.length}</td>
                        <td className="small" style={{ color: STATUS[r.status].tone }}>
                          {STATUS[r.status].label}
                        </td>
                        <td>
                          {r.status === 'ready' && <span className="small muted">import</span>}
                          {r.status === 'example' && <span className="small muted">always skipped</span>}
                          {r.status === 'duplicate' && (
                            <span className="small muted">skipped — split or de-duplicate the file</span>
                          )}
                          {r.status === 'unknown' && (
                            <>
                              <select
                                aria-label={`Action for ${r.code}`}
                                value={r.action}
                                onChange={(e) => patchRow(i, { action: e.target.value })}
                              >
                                <option value="skip">Skip this row</option>
                                <option value="create">Create participant record</option>
                              </select>
                              {r.action === 'create' && (
                                <select
                                  aria-label={`Stakeholder group for ${r.code}`}
                                  value={r.newGroup}
                                  onChange={(e) => patchRow(i, { newGroup: e.target.value })}
                                  style={{ marginTop: 4 }}
                                >
                                  <option value="">— choose stakeholder group —</option>
                                  {STAKEHOLDER_GROUPS.map((g) => (
                                    <option key={g.id} value={g.id}>{g.label}</option>
                                  ))}
                                </select>
                              )}
                            </>
                          )}
                          {r.status === 'existing-transcript' && (
                            <select
                              aria-label={`Action for ${r.code}`}
                              value={r.action}
                              onChange={(e) => patchRow(i, { action: e.target.value })}
                            >
                              <option value="skip">Skip — keep the entered transcript</option>
                              <option value="overwrite">Overwrite (drops its coded segments)</option>
                            </select>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn small secondary"
                            aria-expanded={openRow === i}
                            onClick={() => setOpenRow(openRow === i ? null : i)}
                          >
                            {openRow === i ? 'Hide' : 'Preview'}
                          </button>
                        </td>
                      </tr>
                      {openRow === i && (
                        <tr>
                          <td colSpan={6}>
                            {r.answers.length === 0 ? (
                              <p className="small muted" style={{ margin: 0 }}>No answers in this row.</p>
                            ) : (
                              <ul className="small" style={{ margin: 0, paddingLeft: '1.1rem' }}>
                                {r.answers.map((a) => (
                                  <li key={a.questionId}>
                                    <strong>Q{a.questionIndex + 1}</strong>: {preview(a.text)}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {needsGroup && (
              <p className="small" style={{ color: '#b03230' }}>
                Choose a stakeholder group for every participant you are creating — the joint
                display splits internal staff from external investors and agents on it, so it
                cannot be guessed.
              </p>
            )}

            <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0 0' }}>
              <button className="btn" onClick={confirmImport} disabled={!canImport}>
                Import {chosen.length} transcript{chosen.length === 1 ? '' : 's'}
              </button>
              <button className="btn secondary" onClick={() => { setPlan(null); setOpenRow(null) }}>
                Cancel
              </button>
            </p>
            <p className="small muted" style={{ margin: '6px 0 0' }}>
              Cancel discards the whole preview — nothing has been written to storage at any
              point before you confirm.
            </p>
          </div>
        )}
      </section>

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
