import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { activeData, update, updateActive, useWorkspace } from '../store/dataStore'
import { codeInterview, UNCLASSIFIED } from '../engine/coding'
import { chatComplete, liveModeAvailable } from '../engine/llm'
import { logAICall } from '../store/aiLog'
import {
  buildDiagnosticPrompt,
  diagnosticToMarkdown,
  parseProposals,
  stripProposalBlock,
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
  // Per-proposal UI state, keyed by proposal id. Decisions are recorded in the
  // workspace; this only tracks which row is open for editing.
  const [editing, setEditing] = useState({})

  const segments = data.coding.segments
  const codedInterviewIds = new Set(segments.map((s) => s.interviewId))
  const uncoded = data.interviews.filter((iv) => !codedInterviewIds.has(iv.id))
  const disagreements = segments.filter((s) => s.coderA !== s.coderB)

  const overrideCount = segments.filter((s) => s.override).length

  function codeAll(recode) {
    // Re-coding re-derives what the CODERS think. Overrides are what the
    // RESEARCHER decided, and are carried across by segment id — the ids are
    // stable, so each override rejoins the same answer. The override log is
    // kept too: it used to be emptied on re-code, which destroyed the audit
    // trail as well as the decisions.
    const priorOverrides = new Map(
      segments.filter((s) => s.override).map((s) => [s.id, s.override]),
    )
    if (recode && priorOverrides.size > 0) {
      const ok = window.confirm(
        `Re-code all ${data.interviews.length} transcripts?\n\n` +
          `Coder A and Coder B will be re-run against the current codebook, so codes may ` +
          `change.\n\n` +
          `Your ${priorOverrides.size} manual override${priorOverrides.size === 1 ? '' : 's'} ` +
          `will be KEPT and re-attached, and the override log is preserved. Clear an ` +
          `individual override from its row if you want the fresh coder result instead.`,
      )
      if (!ok) return
    }
    const targets = recode ? data.interviews : uncoded
    const fresh = targets.flatMap((iv) =>
      codeInterview(iv, ws.codebook, { fromTextOnly: data.isReal, priorOverrides }),
    )
    updateActive('coding', (c) => ({
      ...c,
      segments: recode ? fresh : [...c.segments, ...fresh],
      overridesLog: c.overridesLog,
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
        // Proposal ids come from the model and repeat between runs ("p1", "p2"),
        // so a decision is only ever matched within the run that produced it.
        runId: `diag-${Date.now().toString(36)}`,
        analysis: stripProposalBlock(res.content),
        proposals: parseProposals(res.content, ws.codebook),
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

  // ----------------------------------------------- acting on proposals
  // Only ever writes codebook.codes[].definition and appends a decision
  // record. Coded segments are deliberately untouched: changing a definition
  // does not change what the coders already decided, and silently re-coding
  // would destroy the before/after comparison that motivates the change.
  function recordDecision(proposal, decision, appliedText) {
    const code = ws.codebook.codes.find((c) => c.id === proposal.codeId)
    updateActive('codebookDecisions', (log) => [
      {
        id: `dec-${Date.now().toString(36)}-${log.length}`,
        when: new Date().toISOString(),
        runId: diagnostic?.runId ?? null,
        decidedBy: (ws.settings.researcherId || '').trim() || '(unattributed)',
        decision, // 'accepted' | 'accepted-edited' | 'rejected'
        proposalId: proposal.id,
        proposalTitle: proposal.title,
        proposalRationale: proposal.rationale,
        codeId: proposal.codeId,
        codeLabel: code?.label ?? proposal.codeLabel,
        before: code?.definition ?? '',
        proposed: proposal.proposedDefinition,
        after: decision === 'rejected' ? (code?.definition ?? '') : appliedText,
      },
      ...(log ?? []),
    ])
  }

  function decide(proposal, decision, appliedText) {
    recordDecision(proposal, decision, appliedText)
    if (decision !== 'rejected') {
      update('codebook', (cb) => ({
        ...cb,
        codes: cb.codes.map((c) =>
          c.id === proposal.codeId ? { ...c, definition: appliedText } : c,
        ),
      }))
    }
    setEditing((e) => ({ ...e, [proposal.id]: undefined }))
  }

  const decisions = data.codebookDecisions ?? []
  const decisionFor = (proposal) =>
    decisions.find((d) => d.runId === diagnostic?.runId && d.proposalId === proposal.id)

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
        <>
        <div className="notice" role="note">
          <strong>Non-answers are not coded.</strong> A role disclaimer — “not applicable, I am
          not a recruitment agent” — carries no position on any proposition, so it is marked{' '}
          <em>non-answer</em> and left unclassified rather than forced into a code by word
          overlap with a definition’s procedural wording. They are excluded from the agreement
          figure on the <Link to="/analysis/reliability">Reliability</Link> page. If you judge
          one of them substantive, override it — the override still decides.
        </div>

        <div className="notice" role="note">
          <strong>These are two machine passes, not two human coders.</strong> The agreement
          figure on the Reliability page measures how sharply the codebook discriminates on
          this text, not inter-rater reliability. Real fieldwork still requires a second
          human coder; treat every code below as a first pass to be reviewed, and use the
          override column — it is your audit trail.
        </div>
        </>
      )}

      {ws.settings.guidance && (
        <div className="notice">
          Disagreements are the signal, not the noise: they cluster on vague definitions,{' '}
          {data.isReal
            ? 'answers carrying both a cost and a benefit, and content the codebook did not anticipate. Overrides are allowed but logged — that log is your audit trail.'
            : 'contradictory (paradox) answers and off-script content. Overrides are allowed but logged — in real fieldwork that log is your audit trail.'}
        </div>
      )}

      <section className="card">
        <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn" onClick={() => codeAll(false)} disabled={uncoded.length === 0}>
            Code {uncoded.length} uncoded interview{uncoded.length === 1 ? '' : 's'}
          </button>
          <button className="btn secondary" onClick={() => codeAll(true)} disabled={data.interviews.length === 0}>
            Re-code everything{overrideCount > 0 ? ` (keeps ${overrideCount} override${overrideCount === 1 ? '' : 's'})` : ''}
          </button>
          <span className="muted small">
            {segments.length} segments · {disagreements.length} disagreements ·{' '}
            {segments.filter((s) => s.override).length} manual overrides
            {segments.some((s) => s.tied) &&
              ` · ${segments.filter((s) => s.tied).length} tied top match`}
            {segments.some((s) => s.nonAnswer) &&
              ` · ${segments.filter((s) => s.nonAnswer).length} non-answers (not coded)`}
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
                  and a fabricated analysis would be worse than none. Add a key as{' '}
                  <code>VITE_OPENAI_KEY</code> in <code>.env.local</code>, or enable live AI and
                  paste one into <Link to="/settings">Settings</Link>.
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
                <div role="alert" style={{ color: '#b03230' }}>
                  <p className="small" style={{ margin: '0 0 4px', fontWeight: 700 }}>
                    The call failed — nothing was changed, and the attempt is logged in the{' '}
                    <Link to="/settings/ai-review-log">AI Review Log</Link>.
                  </p>
                  <p
                    className="small"
                    style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  >
                    {diagnosticError}
                  </p>
                </div>
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


              {diagnostic.proposals?.definitional.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h3 style={{ marginBottom: 4 }}>
                    Definition proposals ({diagnostic.proposals.definitional.length})
                  </h3>
                  <p className="small muted" style={{ marginTop: 0 }}>
                    Each one replaces the definition text of a single existing code. Nothing is
                    applied until you accept it, and accepting does not re-code anything.
                  </p>

                  <div className="field" style={{ maxWidth: 320 }}>
                    <label htmlFor="cd-researcher">Record decisions as</label>
                    <input
                      id="cd-researcher"
                      type="text"
                      placeholder="your initials or researcher ID"
                      value={ws.settings.researcherId ?? ''}
                      onChange={(e) =>
                        update('settings', (st) => ({ ...st, researcherId: e.target.value }))
                      }
                    />
                    <p className="small muted" style={{ margin: '4px 0 0' }}>
                      This app has no accounts, so attribution in the decision log is
                      self-declared. Blank is recorded as “(unattributed)”.
                    </p>
                  </div>

                  {diagnostic.proposals.definitional.map((pr) => {
                    const live = ws.codebook.codes.find((c) => c.id === pr.codeId)
                    const done = decisionFor(pr)
                    const draft = editing[pr.id]
                    return (
                      <div
                        key={pr.id}
                        style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 10 }}
                      >
                        <p style={{ margin: '0 0 2px', fontWeight: 600 }}>
                          <span className="swatch" style={{ background: ws.hypotheses[live?.group]?.color ?? '#7c3aed' }} aria-hidden="true" />
                          {pr.codeLabel} — {pr.title}
                        </p>
                        {pr.rationale && (
                          <p className="small muted" style={{ margin: '0 0 6px' }}>{pr.rationale}</p>
                        )}

                        {/* Once decided, "Current" is the accepted text, so showing it
                            against the proposal prints the same paragraph twice and reads
                            as though nothing happened. Decided rows show what the
                            definition WAS, from the decision log, against what it is now. */}
                        {done ? (
                          done.decision === 'rejected' ? (
                            <>
                              <p className="small" style={{ margin: '0 0 2px' }}>
                                <strong>Definition — unchanged</strong>
                              </p>
                              <p className="small muted" style={{ margin: '0 0 6px' }}>
                                {done.before || '(no definition written)'}
                              </p>
                              <p className="small" style={{ margin: '0 0 2px' }}>
                                <strong>Rejected proposal</strong>
                              </p>
                              <p className="small muted" style={{ margin: '0 0 6px', textDecoration: 'line-through' }}>
                                {done.proposed}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="small" style={{ margin: '0 0 2px' }}><strong>Before</strong></p>
                              <p className="small muted" style={{ margin: '0 0 6px' }}>
                                {done.before || '(no definition written)'}
                              </p>
                              <p className="small" style={{ margin: '0 0 2px' }}><strong>Now</strong></p>
                              <p className="small" style={{ margin: '0 0 6px' }}>{done.after}</p>
                              {done.decision === 'accepted-edited' && (
                                <>
                                  <p className="small" style={{ margin: '0 0 2px' }}>
                                    <strong>The model proposed</strong>
                                  </p>
                                  <p className="small muted" style={{ margin: '0 0 6px' }}>{done.proposed}</p>
                                </>
                              )}
                            </>
                          )
                        ) : (
                          <>
                            <p className="small" style={{ margin: '0 0 2px' }}><strong>Current</strong></p>
                            <p className="small muted" style={{ margin: '0 0 6px' }}>
                              {live?.definition || '(no definition written)'}
                            </p>
                            <p className="small" style={{ margin: '0 0 2px' }}><strong>Proposed</strong></p>
                            {draft === undefined ? (
                              <p className="small" style={{ margin: '0 0 6px' }}>{pr.proposedDefinition}</p>
                            ) : (
                              <textarea
                                aria-label={`Edit proposed definition for ${pr.codeLabel}`}
                                rows={3}
                                value={draft}
                                onChange={(e) => setEditing((x) => ({ ...x, [pr.id]: e.target.value }))}
                              />
                            )}
                          </>
                        )}

                        {done ? (
                          <p className="small" style={{ margin: 0, color: done.decision === 'rejected' ? '#b03230' : '#2f9e44' }}>
                            {done.decision === 'rejected'
                              ? 'Rejected'
                              : done.decision === 'accepted-edited'
                                ? 'Accepted with edits'
                                : 'Accepted'}{' '}
                            by {done.decidedBy} · {new Date(done.when).toLocaleString()} ·{' '}
                            <Link to="/design/codebook">see the decision log</Link>
                          </p>
                        ) : (
                          <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: 0 }}>
                            <button
                              className="btn small"
                              onClick={() =>
                                decide(
                                  pr,
                                  draft === undefined ? 'accepted' : 'accepted-edited',
                                  (draft === undefined ? pr.proposedDefinition : draft).trim(),
                                )
                              }
                              disabled={draft !== undefined && !draft.trim()}
                            >
                              {draft === undefined ? 'Accept' : 'Accept edited'}
                            </button>
                            {draft === undefined ? (
                              <button
                                className="btn small secondary"
                                onClick={() => setEditing((x) => ({ ...x, [pr.id]: pr.proposedDefinition }))}
                              >
                                Edit
                              </button>
                            ) : (
                              <button
                                className="btn small secondary"
                                onClick={() => setEditing((x) => ({ ...x, [pr.id]: undefined }))}
                              >
                                Cancel edit
                              </button>
                            )}
                            <button className="btn small danger" onClick={() => decide(pr, 'rejected')}>
                              Reject
                            </button>
                          </p>
                        )}
                      </div>
                    )
                  })}

                  {diagnostic.proposals.definitional.some((pr) => decisionFor(pr)) && (
                    <p className="small" style={{ marginTop: 10, fontWeight: 600 }}>
                      Definitions changed here do <strong>not</strong> re-code anything — the
                      existing {segments.length} segments still carry the codes the coders
                      assigned under the old wording, which is what lets you compare before and
                      after. Use <em>Re-code everything</em> above when you want the new
                      definitions applied.
                    </p>
                  )}
                </div>
              )}

              {diagnostic.proposals?.structural.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h3 style={{ marginBottom: 4 }}>
                    Requires a design decision, not applied here (
                    {diagnostic.proposals.structural.length})
                  </h3>
                  <p className="small muted" style={{ marginTop: 0 }}>
                    These change the coding scheme rather than the wording of one definition —
                    adding, splitting or merging codes, or allowing more than one code per
                    segment. They are methodological choices with consequences for the kappa
                    figure and the pattern-matching, so the app offers no button for them.
                  </p>
                  {diagnostic.proposals.structural.map((pr) => (
                    <div key={pr.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 8, marginTop: 8 }}>
                      <p style={{ margin: '0 0 2px', fontWeight: 600 }}>{pr.title}</p>
                      {pr.rationale && <p className="small" style={{ margin: '0 0 2px' }}>{pr.rationale}</p>}
                      {pr.proposedDefinition && (
                        <p className="small muted" style={{ margin: '0 0 2px' }}>{pr.proposedDefinition}</p>
                      )}
                      <p className="small muted" style={{ margin: 0 }}>Not applicable automatically: {pr.reason}.</p>
                    </div>
                  ))}
                </div>
              )}

              {diagnostic.proposals && !diagnostic.proposals.parsed && (
                <p className="small muted" style={{ marginTop: 12 }}>
                  The model returned no machine-readable proposal block, so the suggestions above
                  are prose only — apply anything you agree with by hand on the{' '}
                  <Link to="/design/codebook">Codebook</Link> page.
                </p>
              )}

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
                        {s.nonAnswer && (
                          <span className="tag muted" style={{ marginLeft: 6 }}>non-answer</span>
                        )}
                        {!data.isReal && s.contradictory && ' ⚡'}
                        <div className="small muted" style={{ maxWidth: 420 }}>{s.text}</div>
                      </td>
                      <td>
                        <CodeName codeId={s.coderA} codebook={ws.codebook} hypotheses={ws.hypotheses} />
                        {s.tied && (
                          <div className="small muted" title="Two definitions matched this text equally well">
                            tied — decided by tie-break, not by the text
                          </div>
                        )}
                      </td>
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
