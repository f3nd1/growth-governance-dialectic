import { Fragment, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ModeGate from '../components/ModeGate'
import { useWorkspace, updateActive, updateRealBatch } from '../store/dataStore'
import { STAKEHOLDER_GROUPS, SOURCE_TYPES, FOCUS_GROUPS, DOCUMENT_TYPES, rqList } from '../data/seeds'
import {
  sourceTypeOf,
  sessionLabel,
  focusGroupLabel,
  sourceTypeLabel,
  attendeeEligibility,
  focusGroupAllocations,
  otherAllocations,
} from '../engine/sources'
import {
  buildImportPlan,
  applyImportPlan,
  templateCSV,
  sourcesTemplateCSV,
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
  // Which evidence type is being entered. Interviews stay the default so the
  // existing flow is unchanged for anyone not using the new types.
  const [sourceType, setSourceType] = useState('interview')
  // Focus-group draft: one of the four fixed groups, its roster, and the turns.
  const [fg, setFg] = useState({ focusGroupId: '', participantCodes: [], turns: [] })
  // Document draft: metadata plus extracts.
  const [doc, setDoc] = useState({ title: '', docType: 'policy', periodLabel: '', extracts: [''] })
  const [sourceSaved, setSourceSaved] = useState('')

  if (ws.mode !== 'real') {
    return (
      <>
        <PageHeader title="Transcript Entry" desc="Hand-entered transcripts from real, consented interviews." />
        <ModeGate want="real" />
      </>
    )
  }

  const questions = [...ws.protocol.questions].sort((a, b) => a.order - b.order)
  // The focus group runs its OWN approved instrument. Turn entry references
  // these, never the nine interview questions.
  const fgQuestions = [...ws.focusGroupProtocol.questions].sort((a, b) => a.order - b.order)
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

  // --------------------------------------------------- focus groups + documents
  const byCode = new Map(participants.map((p) => [p.participantCode, p]))
  const fgTurns = fg.turns.filter((t) => t.text.trim() && t.speakerCode)
  // A turn with text but no speaker is NOT saved: attributing it to the group as
  // a whole would put words in an unidentified participant's mouth, and the
  // stakeholder row it lands in would be a guess.
  const fgOrphanTurns = fg.turns.filter((t) => t.text.trim() && !t.speakerCode).length
  const canSaveFg = Boolean(fg.focusGroupId) && fgTurns.length > 0 && fgOrphanTurns === 0
  const allocated = focusGroupAllocations(ws.real.interviews)

  // Steps 2 and 3 belong to the group chosen in step 1: an attendee list and a
  // set of turns are only meaningful for one session. Carrying them across a
  // switch silently reattributed one group's roster to another, so the switch
  // clears them — and asks first when there is typed text to lose.
  function chooseFocusGroup(id) {
    if (id === fg.focusGroupId) return
    const typed = fg.turns.filter((t) => t.text.trim()).length
    if (
      typed > 0 &&
      !window.confirm(
        `Switch to ${focusGroupLabel(id)}?\n\n` +
          `${typed} turn${typed === 1 ? '' : 's'} and the attendee list belong to ` +
          `${focusGroupLabel(fg.focusGroupId)} and will be discarded. Nothing has been saved yet.`,
      )
    ) {
      return
    }
    setFg({ focusGroupId: id, participantCodes: [], turns: [] })
  }

  function saveFocusGroup() {
    if (!canSaveFg) return
    const id = `real-fg-${fg.focusGroupId}-${ws.real.interviews.length}`
    const record = {
      id,
      sourceType: 'focus-group',
      focusGroupId: fg.focusGroupId,
      participantCodes: [...fg.participantCodes],
      // No single interviewee: the session belongs to the group, and each TURN
      // carries its own speaker. personaName is the group label so lists read
      // sensibly; attribution never uses it.
      personaId: null,
      personaName: focusGroupLabel(fg.focusGroupId),
      real: true,
      mode: 'entered',
      seed: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      answers: fgTurns.map((t) => ({
        // Optional: a group discussion moves, and a turn that answers nothing
        // on the schedule is still data. Blank rather than forced.
        questionId: t.questionId || null,
        questionText: fgQuestions.find((q) => q.id === t.questionId)?.text ?? '',
        text: t.text.trim(),
        speakerCode: t.speakerCode,
        speakerParticipantId: byCode.get(t.speakerCode)?.id ?? null,
      })),
    }
    updateActive('interviews', (list) => [...list, record])
    setFg({ focusGroupId: '', participantCodes: [], turns: [] })
    setSourceSaved(`Saved ${fgTurns.length} turns for ${focusGroupLabel(record.focusGroupId)}.`)
  }

  const docExtracts = doc.extracts.filter((x) => x.trim())
  const canSaveDoc = Boolean(doc.title.trim()) && docExtracts.length > 0

  function saveDocument() {
    if (!canSaveDoc) return
    const id = `real-doc-${Date.now().toString(36)}-${ws.real.interviews.length}`
    const record = {
      id,
      sourceType: 'document',
      title: doc.title.trim(),
      docType: doc.docType,
      periodLabel: doc.periodLabel.trim(),
      // A document has no participant. Its own id is used so segments stay
      // joinable, and it deliberately matches no participant record — which is
      // what puts it in the Documentary evidence row rather than a person's.
      personaId: id,
      personaName: doc.title.trim(),
      real: true,
      mode: 'entered',
      seed: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      answers: docExtracts.map((x) => ({ questionId: null, questionText: '', text: x.trim() })),
    }
    updateActive('interviews', (list) => [...list, record])
    setDoc({ title: '', docType: 'policy', periodLabel: '', extracts: [''] })
    setSourceSaved(`Saved ${docExtracts.length} extract(s) from ${record.title}.`)
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
        fgQuestions,
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
    let landed = []
    // One commit: participants, transcripts and the segment purge land together
    // or not at all, so a failure cannot leave a half-imported workspace.
    updateRealBatch((real) => {
      const { next, imported } = applyImportPlan(real, plan.rows)
      landed = imported
      return next
    })
    // The ids go with it: "imported 12 sources" and a list sorted by date is
    // not an answer to where they went, and a researcher checking an import
    // should not have to work that out by elimination.
    setImportDone({ filename: plan.filename, sources: landed })
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
          <li>
            <strong>Extended long</strong> — adds focus groups and documents:{' '}
            <code>participantCode,questionNumber,answer,sourceType,source</code>
          </li>
        </ul>
        <p className="small muted">
          In every layout <strong>column 1 is who said it</strong>. A focus-group row puts the{' '}
          <strong>speaker</strong> there and the group in <code>source</code>; a turn with no
          speaker code is <strong>rejected at preview</strong> rather than attributed to the
          group. A document row leaves column 1 <strong>empty</strong> — a document has no
          speaker — and carries its title in <code>source</code>.
        </p>
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
          <button
            className="btn secondary"
            onClick={() =>
              download('evidence_import_template.csv', sourcesTemplateCSV(questions, fgQuestions), 'text/csv')
            }
          >
            Download template (all evidence types)
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
          <div className="notice" role="status" style={{ borderLeftColor: '#2f9e44' }}>
            <p style={{ margin: '0 0 6px' }}>
              <strong>
                Imported {importDone.sources.length} source
                {importDone.sources.length === 1 ? '' : 's'}
              </strong>{' '}
              from {importDone.filename}.
            </p>
            <ul className="small" style={{ margin: '0 0 6px', paddingLeft: 18 }}>
              {SOURCE_TYPES.map((t) => {
                const own = importDone.sources.filter((s) => s.sourceType === t.id)
                if (own.length === 0) return null
                return (
                  <li key={t.id}>
                    {own.length} {own.length === 1 ? t.label.toLowerCase() : t.plural.toLowerCase()}
                    {' — '}
                    {own.map((s) => s.label).join(', ')}
                  </li>
                )
              })}
            </ul>
            <p className="small" style={{ margin: 0 }}>
              <Link to={`/fieldwork/transcripts?new=${importDone.sources.map((s) => s.id).join(',')}`}>
                View {importDone.sources.length === 1 ? 'it' : 'just these records'} in Transcripts
              </Link>
              {' · '}
              Nothing is coded yet — run the coders on the{' '}
              <Link to="/analysis/coding">Coding page</Link>.
            </p>
          </div>
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
                    <th>Source</th>
                    <th>Type</th>
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
                        <td className="small">{sourceTypeLabel(r.sourceType)}</td>
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
                          <td colSpan={7}>
                            {r.answers.length === 0 ? (
                              <p className="small muted" style={{ margin: 0 }}>No answers in this row.</p>
                            ) : (
                              <ul className="small" style={{ margin: 0, paddingLeft: '1.1rem' }}>
                                {r.answers.map((a, ai) => (
                                  <li key={ai}>
                                    <strong>
                                      {r.sourceType === 'focus-group'
                                        ? a.speakerCode
                                        : r.sourceType === 'document'
                                          ? `Extract ${ai + 1}`
                                          : `Q${a.questionIndex + 1}`}
                                    </strong>
                                    : {preview(a.text)}
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
                Import {chosen.length} source{chosen.length === 1 ? '' : 's'}
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


      <div className="chip-row" role="group" aria-label="Evidence type">
        {SOURCE_TYPES.map((t) => (
          <button
            key={t.id}
            className={'chip' + (sourceType === t.id ? ' on' : '')}
            aria-pressed={sourceType === t.id}
            onClick={() => { setSourceType(t.id); setSourceSaved('') }}
          >
            {t.plural}
          </button>
        ))}
      </div>
      {sourceSaved && <p role="status" className="small" style={{ color: '#2f9e44' }}>{sourceSaved}</p>}

      {sourceType === 'focus-group' && (
        <>
          <section className="card">
            <h2>1 · Choose the focus group</h2>
            <div className="chip-row" role="group" aria-label="Focus group">
              {FOCUS_GROUPS.map((g) => (
                <button
                  key={g.id}
                  className={'chip' + (fg.focusGroupId === g.id ? ' on' : '')}
                  aria-pressed={fg.focusGroupId === g.id}
                  onClick={() => chooseFocusGroup(g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>
            <p className="small muted" style={{ marginBottom: 0 }}>
              The five groups are fixed by the study design. Adding a sixth would be a design
              change, not a data-entry choice.
            </p>
            {FOCUS_GROUPS.find((g) => g.id === fg.focusGroupId)?.external && (
              <p className="small" role="note" style={{ margin: '8px 0 0', fontWeight: 600 }}>
                Members of this group are <strong>external to the institution</strong>. Its
                consent and confidentiality terms differ from the internal groups — check the
                right ones were used before entering this session.
              </p>
            )}
          </section>

          {fg.focusGroupId && (
            <>
              <section className="card">
                <h2>2 · Who attended</h2>
                {participants.length === 0 ? (
                  <p className="muted">
                    No participant records yet — add them on{' '}
                    <Link to="/participants/records">Participant Records</Link> first.
                  </p>
                ) : (
                  <>
                    <div className="chip-row" role="group" aria-label="Attendees">
                      {participants.map((p) => {
                        const on = fg.participantCodes.includes(p.participantCode)
                        const { state, reason } = attendeeEligibility(fg.focusGroupId, p.group)
                        const blocked = state === 'ineligible'
                        return (
                          <button
                            key={p.id}
                            className={'chip' + (on ? ' on' : '')}
                            aria-pressed={on}
                            // Greyed, never hidden, and still clickable: a genuine
                            // exception has to stay possible. The confirm is what
                            // keeps it from happening by accident.
                            style={blocked && !on ? { opacity: 0.5 } : undefined}
                            title={reason}
                            onClick={() => {
                              if (
                                !on &&
                                blocked &&
                                !window.confirm(
                                  `Add ${p.participantCode} to ${focusGroupLabel(fg.focusGroupId)}?\n\n` +
                                    `${reason}. Add them only if they genuinely attended.`,
                                )
                              ) {
                                return
                              }
                              setFg({
                                ...fg,
                                participantCodes: on
                                  ? fg.participantCodes.filter((c) => c !== p.participantCode)
                                  : [...fg.participantCodes, p.participantCode],
                              })
                            }}
                          >
                            {p.participantCode}
                            <span className="muted">
                              {' · '}{reason}
                              {p.roleDescriptor ? ` · ${p.roleDescriptor}` : ''}
                            </span>
                            {otherAllocations(
                              allocated,
                              p.participantCode,
                              fg.focusGroupId,
                              p.group,
                            ).map((o) => (
                              // Attending two groups is by design where the
                              // mapping makes them eligible for both, so it is
                              // reported neutrally. Red is reserved for the case
                              // the mapping does not account for.
                              <span
                                key={o.id}
                                className={o.expected ? 'muted' : undefined}
                                style={o.expected ? undefined : { color: '#b03230' }}
                              >
                                {o.expected ? ' · also in ' : ' · already in '}
                                {o.label}
                              </span>
                            ))}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </section>

              <section className="card">
                <h2>Focus group protocol</h2>
                <p className="small muted">
                  The approved group instrument, edited on{' '}
                  <Link to="/design/protocol">Interview Protocol → Focus group protocol</Link>.
                  Read the opening script verbatim before recording.
                </p>
                <details>
                  <summary className="small">Opening script (read verbatim)</summary>
                  <p className="small" style={{ whiteSpace: 'pre-wrap' }}>
                    {ws.focusGroupProtocol.openingScript}
                  </p>
                </details>
                <ol className="small">
                  {fgQuestions.map((q) => (
                    <li key={q.id} style={{ marginBottom: 4 }}>
                      {q.text}
                      <div className="muted">
                        {rqList(q.rq).join(', ')}
                        {q.source ? ` · ${q.source}` : ' · no source recorded'}
                      </div>
                    </li>
                  ))}
                </ol>
                <details>
                  <summary className="small">Closing script (read verbatim)</summary>
                  <p className="small" style={{ whiteSpace: 'pre-wrap' }}>
                    {ws.focusGroupProtocol.closingScript}
                  </p>
                </details>
              </section>

              <section className="card">
                <h2>3 · Turns</h2>
                <p className="small muted">
                  Each turn belongs to <strong>one</strong> speaker. A turn with text but no
                  speaker will not save — attributing it to the group would put words in an
                  unidentified participant’s mouth, and the stakeholder row it landed in would
                  be a guess.
                </p>
                {fg.turns.map((t, i) => (
                  <div key={i} className="grid-2" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                    <div className="field" style={{ maxWidth: 200 }}>
                      <label htmlFor={`fg-sp-${i}`}>Speaker</label>
                      <select
                        id={`fg-sp-${i}`}
                        value={t.speakerCode}
                        onChange={(e) =>
                          setFg({ ...fg, turns: fg.turns.map((x, j) => (j === i ? { ...x, speakerCode: e.target.value } : x)) })
                        }
                      >
                        <option value="">— choose speaker —</option>
                        {fg.participantCodes.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="field" style={{ maxWidth: 260 }}>
                      <label htmlFor={`fg-q-${i}`}>Prompted by (optional)</label>
                      <select
                        id={`fg-q-${i}`}
                        value={t.questionId ?? ''}
                        onChange={(e) =>
                          setFg({ ...fg, turns: fg.turns.map((x, j) => (j === i ? { ...x, questionId: e.target.value } : x)) })
                        }
                      >
                        <option value="">— not on the schedule —</option>
                        {fgQuestions.map((q, qi) => (
                          <option key={q.id} value={q.id}>FG{qi + 1}. {q.text.slice(0, 60)}…</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor={`fg-tx-${i}`}>What they said</label>
                      <textarea
                        id={`fg-tx-${i}`}
                        rows={3}
                        value={t.text}
                        onChange={(e) =>
                          setFg({ ...fg, turns: fg.turns.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })
                        }
                      />
                    </div>
                  </div>
                ))}
                <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    className="btn secondary"
                    onClick={() =>
                      setFg({ ...fg, turns: [...fg.turns, { speakerCode: '', text: '', questionId: '' }] })
                    }
                    disabled={fg.participantCodes.length === 0}
                  >
                    + Add turn
                  </button>
                  <button className="btn" onClick={saveFocusGroup} disabled={!canSaveFg}>
                    Save focus group ({fgTurns.length} turn{fgTurns.length === 1 ? '' : 's'})
                  </button>
                </p>
                {fgOrphanTurns > 0 && (
                  <p className="small" role="alert" style={{ color: '#b03230' }}>
                    {fgOrphanTurns} turn{fgOrphanTurns === 1 ? ' has' : 's have'} text but no
                    speaker. Choose a speaker or clear the text.
                  </p>
                )}
              </section>
            </>
          )}
        </>
      )}

      {sourceType === 'document' && (
        <section className="card">
          <h2>Documentary source</h2>
          <p className="small muted">
            Records, not people. Document extracts are coded against the same codebook, but
            carry no participant and no speaker.
          </p>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="doc-title">Title</label>
              <input id="doc-title" type="text" value={doc.title}
                onChange={(e) => setDoc({ ...doc, title: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="doc-type">Document type</label>
              <select id="doc-type" value={doc.docType}
                onChange={(e) => setDoc({ ...doc, docType: e.target.value })}>
                {DOCUMENT_TYPES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="doc-period">Date or period</label>
              <input id="doc-period" type="text" placeholder="2024, or FY2023-24" value={doc.periodLabel}
                onChange={(e) => setDoc({ ...doc, periodLabel: e.target.value })} />
            </div>
          </div>
          {doc.extracts.map((x, i) => (
            <div key={i} className="field">
              <label htmlFor={`doc-x-${i}`}>Extract {i + 1}</label>
              <textarea id={`doc-x-${i}`} rows={3} value={x}
                onChange={(e) => setDoc({ ...doc, extracts: doc.extracts.map((y, j) => (j === i ? e.target.value : y)) })} />
            </div>
          ))}
          <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn secondary" onClick={() => setDoc({ ...doc, extracts: [...doc.extracts, ''] })}>
              + Add extract
            </button>
            <button className="btn" onClick={saveDocument} disabled={!canSaveDoc}>
              Save document ({docExtracts.length} extract{docExtracts.length === 1 ? '' : 's'})
            </button>
          </p>
        </section>
      )}

      {sourceType === 'interview' && (participants.length === 0 ? (
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
      ))}
    </>
  )
}
