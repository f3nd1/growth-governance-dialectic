import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { activeData, updateActive, useWorkspace } from '../store/dataStore'
import { codeInterview, UNCLASSIFIED } from '../engine/coding'
import { chatComplete, liveModeAvailable } from '../engine/llm'
import { logAICall } from '../store/aiLog'
import {
  buildDiagnosticPrompt,
  diagnosticToMarkdown,
  MAX_INPUT_TOKENS,
} from '../engine/codingDiagnostic'

function download(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

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
  // Diagnostic state is display-only. It never feeds back into a segment.
  const [diagnosing, setDiagnosing] = useState(false)
  const [diagnostic, setDiagnostic] = useState(null)
  const [diagnosticError, setDiagnosticError] = useState('')

  const segments = data.coding.segments
  const codedInterviewIds = new Set(segments.map((s) => s.interviewId))
  const uncoded = data.interviews.filter((iv) => !codedInterviewIds.has(iv.id))
  const disagreements = segments.filter((s) => s.coderA !== s.coderB)

  function codeAll(recode) {
    const targets = recode ? data.interviews : uncoded
    const fresh = targets.flatMap((iv) =>
      codeInterview(iv, ws.codebook, { fromTextOnly: data.isReal }),
    )
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

  // ------------------------------------------------- disagreement diagnostic
  // READ-ONLY. This function reads segments and sets React state. It calls no
  // store writer except logAICall, which appends to the audit log — no segment
  // field is touched anywhere in this path.
  const aiAvailable = liveModeAvailable(ws.settings)
  const built = data.isReal && disagreements.length > 0
    ? buildDiagnosticPrompt(segments, ws.codebook)
    : null
  const overBudget = Boolean(built && built.tokens > MAX_INPUT_TOKENS)

  async function runDiagnostic() {
    if (!built || !aiAvailable || overBudget) return
    const ok = window.confirm(
      'Send REAL PARTICIPANT DATA to OpenAI?\n\n' +
        `The verbatim answer text of ${disagreements.length} disagreeing segments, plus your ` +
        'codebook definitions, will be transmitted over the internet to the OpenAI API and ' +
        'processed on their servers under their terms and retention policy.\n\n' +
        `Estimated size: ~${built.tokens.toLocaleString()} tokens.\n\n` +
        'Real mode otherwise makes no network requests at all. This is the one exception, and ' +
        'it is asked every time — there is no "remember this choice".\n\n' +
        'Only proceed if sending this material to a third party is permitted by your ethics ' +
        'approval and participant consent.',
    )
    if (!ok) return
    setDiagnosing(true)
    setDiagnosticError('')
    setDiagnostic(null)
    try {
      const res = await chatComplete({
        settings: ws.settings,
        system: built.system,
        user: built.user,
      })
      const record = {
        analysis: res.content,
        stats: built.stats,
        model: res.model,
        tokens: res.tokens,
        when: new Date().toISOString(),
      }
      setDiagnostic(record)
      logAICall({
        purpose: 'Coder disagreement diagnostic (read-only)',
        module: 'coding-diagnostic',
        model: res.model,
        mode: 'live',
        tokens: res.tokens,
        prompt: res.prompt,
        output: res.content,
      })
    } catch (err) {
      const message = String(err.message ?? err)
      setDiagnosticError(message)
      logAICall({
        purpose: 'Coder disagreement diagnostic (read-only)',
        module: 'coding-diagnostic',
        model: ws.settings.openai.analysisModel || 'gpt-4o',
        mode: 'live',
        tokens: null,
        prompt: `SYSTEM:\n${built.system}\n\nUSER:\n${built.user}`,
        output: '',
        error: message,
      })
    } finally {
      setDiagnosing(false)
    }
  }

  function exportDiagnostic() {
    if (!diagnostic) return
    const ok = window.confirm(
      'Export the diagnostic?\n\n' +
        'The file quotes REAL PARTICIPANT answer text in its examples and carries the ' +
        'confidentiality header. It is written unencrypted to this device.',
    )
    if (!ok) return
    download(
      `ggd-coding-diagnostic-REAL-CONFIDENTIAL-${new Date().toISOString().slice(0, 10)}.md`,
      diagnosticToMarkdown(diagnostic),
      'text/markdown',
    )
  }


  const shown = filter === 'disagreements' ? disagreements : segments

  return (
    <>
      <PageHeader
        title="Coding"
        desc={
          data.isReal
            ? 'Two automated passes classify every entered segment against the codebook from the TEXT ALONE. No participant attribute, and no hypothesis assigned in advance, is consulted — which proposition a segment supports is decided here.'
            : 'Two independent coders classify every synthetic transcript segment against the codebook. Coder A is the primary keyword classifier; Coder B is a second heuristic pass whose reliability depends on how sharp your code definitions are.'
        }
      />

      {data.isReal && (
        <div className="notice" role="note">
          <strong>These are two machine passes, not two human coders.</strong> The agreement
          figure on the Reliability page measures how sharply the codebook discriminates on
          this text, not inter-rater reliability. Real fieldwork still requires a second
          human coder; treat every code below as a first pass to be reviewed, and use the
          override column — it is your audit trail.
        </div>
      )}

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


      {data.isReal && (
        <section className="card">
          <h2>Diagnose disagreements (AI, read-only)</h2>
          <p className="small muted">
            Sends the {disagreements.length} disagreeing segment{disagreements.length === 1 ? '' : 's'} and
            your codebook definitions to the configured OpenAI model and asks{' '}
            <strong>why</strong> the two passes disagree — which definitions collide, how many
            disagreements are non-answers being force-coded, and how many describe a cost and a
            benefit at once.
          </p>
          <p className="small" style={{ fontWeight: 700 }}>
            This changes nothing. It cannot set a code, an override or a definition — it returns
            prose for you to read. Every suggestion it makes is yours to apply by hand or ignore.
          </p>

          {disagreements.length === 0 ? (
            <p className="muted">
              No disagreements to diagnose{segments.length === 0 ? ' — nothing is coded yet' : ''}.
            </p>
          ) : (
            <>
              <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  className="btn"
                  onClick={runDiagnostic}
                  disabled={!aiAvailable || diagnosing || overBudget}
                >
                  {diagnosing ? 'Analysing…' : 'Diagnose disagreements…'}
                </button>
                {built && (
                  <span className="muted small">
                    ~{built.tokens.toLocaleString()} tokens ·{' '}
                    {ws.settings.openai.analysisModel || 'gpt-4o'}
                  </span>
                )}
              </p>

              {!aiAvailable && (
                <p className="small" style={{ color: '#b03230' }}>
                  <strong>No OpenAI key configured, so this is disabled.</strong> There is no
                  offline version of this diagnostic: the simulator cannot judge your definitions,
                  and a fabricated analysis would be worse than none. Add a key to{' '}
                  <code>.env.local</code> as <code>VITE_OPENAI_KEY</code>, or enable live AI in{' '}
                  <Link to="/settings">Settings</Link> — the OpenAI settings are editable in
                  synthetic mode only, deliberately, so a key cannot be pasted in while real
                  participant data is on screen.
                </p>
              )}

              {overBudget && (
                <p className="small" style={{ color: '#b03230' }}>
                  This set is about {built.tokens.toLocaleString()} tokens, over the{' '}
                  {MAX_INPUT_TOKENS.toLocaleString()} limit for one call. Nothing is truncated
                  automatically — a diagnostic computed over a hidden subset would misreport its
                  own counts. Narrow the set first (code fewer transcripts, or split the corpus
                  and run it twice), then re-run.
                </p>
              )}

              {diagnosticError && (
                <p className="small" role="alert" style={{ color: '#b03230' }}>
                  The call failed: {diagnosticError} — nothing was changed, and the attempt is in
                  the <Link to="/settings/ai-review-log">AI Review Log</Link>.
                </p>
              )}
            </>
          )}

          {diagnostic && (
            <div className="notice" style={{ marginTop: 12 }}>
              <p className="small muted" style={{ margin: '0 0 8px' }}>
                {new Date(diagnostic.when).toLocaleString()} · {diagnostic.model}
                {diagnostic.tokens ? ` · ${diagnostic.tokens.toLocaleString()} tokens` : ''} ·{' '}
                <Link to="/settings/ai-review-log">logged</Link>
              </p>

              <table className="data" style={{ marginBottom: 12 }}>
                <thead>
                  <tr><th>Confusion pair (counted in the app)</th><th>Segments</th></tr>
                </thead>
                <tbody>
                  {diagnostic.stats.pairs.map((p) => (
                    <tr key={p.pair}><td>{p.pair}</td><td>{p.count}</td></tr>
                  ))}
                </tbody>
              </table>

              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  font: 'inherit',
                  margin: 0,
                }}
              >
                {diagnostic.analysis}
              </pre>

              <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0 0' }}>
                <button className="btn secondary" onClick={exportDiagnostic}>
                  Export as Markdown…
                </button>
                <button className="btn secondary" onClick={() => setDiagnostic(null)}>
                  Dismiss
                </button>
              </p>
            </div>
          )}
        </section>
      )}

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
                  <th style={{ minWidth: 260 }}>Segment{data.isReal ? '' : ' (synthetic)'}</th>
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
                        {!data.isReal && s.contradictory && ' ⚡'}
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
              <tr><th>When</th><th>{data.isReal ? 'Participant' : 'Persona'}</th><th>From</th><th>To</th></tr>
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
