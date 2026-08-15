import { useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { Link } from 'react-router-dom'
import { useWorkspace, replaceWorkspace } from '../store/dataStore'
import { staleSyntheticProse } from '../engine/storedProse'
import { countsByType } from '../engine/sources'
import {
  buildReportModel,
  reportToMarkdown,
  reportToHTML,
  appendixToMarkdown,
  appendixToHTML,
  SYNTHETIC_CAVEAT,
  REAL_CONFIDENTIALITY_HEADER,
} from '../engine/report'

function download(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Re-impose the SYNTHETIC stamp on every layer of an imported workspace, so an
// import can never smuggle in unlabelled data. mergeWithDefaults also forces
// meta.synthetic = true, but we belt-and-brace the nested records here.
function restampSynthetic(wsIn) {
  return {
    ...wsIn,
    meta: { ...(wsIn.meta || {}), synthetic: true },
    personas: (wsIn.personas || []).map((p) => ({ ...p, synthetic: true })),
    interviews: (wsIn.interviews || []).map((iv) => ({ ...iv, synthetic: true })),
    coding: {
      ...(wsIn.coding || {}),
      segments: (wsIn.coding?.segments || []).map((s) => ({ ...s, synthetic: true })),
    },
  }
}

// Accept either a raw workspace or the export wrapper { workspace, ... }.
// Returns { ok, workspace, counts } or { ok:false, error }.
function parseImport(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Not valid JSON.' }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'File is not a JSON object.' }
  }
  const wsIn = parsed.workspace && typeof parsed.workspace === 'object' ? parsed.workspace : parsed
  const shapeOk =
    wsIn.protocol && Array.isArray(wsIn.protocol.questions) &&
    wsIn.codebook && Array.isArray(wsIn.codebook.codes) &&
    Array.isArray(wsIn.personas) &&
    Array.isArray(wsIn.interviews) &&
    wsIn.coding && Array.isArray(wsIn.coding.segments)
  if (!shapeOk) {
    return {
      ok: false,
      error: 'This does not look like a governance-growth-dialectic workspace export (missing protocol / codebook / personas / interviews / coding).',
    }
  }
  return {
    ok: true,
    workspace: wsIn,
    counts: {
      personas: wsIn.personas.length,
      protocolQs: wsIn.protocol.questions.length,
      codes: wsIn.codebook.codes.length,
      interviews: wsIn.interviews.length,
      segments: wsIn.coding.segments.length,
    },
  }
}

/**
 * The confirmation shown before any real-data export names exactly what leaves
 * the app. An export of confidential material should never be a single
 * unlabelled click, and "are you sure?" without the contents is not consent.
 */
function confirmRealExport(ws, what) {
  const answers = ws.real.interviews.reduce((n, iv) => n + iv.answers.length, 0)
  // A pooled transcript count hides that a focus group carries several people's
  // words in one file, so the consent prompt names the types it is releasing.
  const byType = countsByType(ws.real.interviews, ws.real.coding.segments)
    .filter((t) => t.sessions > 0)
    .map((t) => `    – ${t.sessions} ${t.label} (${t.segments} coded segments)`)
    .join('\n')
  return window.confirm(
    `Export ${what} containing REAL PARTICIPANT DATA?\n\n` +
      `· ${ws.real.participants.length} participant records (codes, groups, role descriptors)\n` +
      `· ${ws.real.interviews.length} transcripts — ${answers} verbatim answers\n` +
      (byType ? byType + '\n' : '') +
      `· ${ws.real.coding.segments.length} coded segments (each carries its verbatim text)\n` +
      `· ${(ws.real.aiReviewLog ?? []).length} AI review log entries (each stores the full prompt sent)\n` +
      `· ${(ws.real.codebookDecisions ?? []).length} codebook decision records\n\n` +
      'The file is written unencrypted to this device\'s downloads folder. Store and share it ' +
      'only as your approved data-management plan allows.',
  )
}

export default function ExportCentre() {
  const ws = useWorkspace()
  const [done, setDone] = useState('')
  const [pending, setPending] = useState(null) // { workspace, counts, filename }
  const [importError, setImportError] = useState('')
  const fileRef = useRef(null)

  const stamp = new Date().toISOString().slice(0, 10)
  const isReal = ws.mode === 'real'
  // Warned about at the point the document is produced, since that is where a
  // stale methods statement stops being a draft and becomes a claim.
  const stale = staleSyntheticProse(ws)
  // Real exports are named for what they are, and carry the confidentiality
  // header INSTEAD of the synthetic caveat — never both, and never neither.
  const tag = isReal ? 'REAL-CONFIDENTIAL' : 'SYNTHETIC'
  // Synthetic mode has one evidence type, so the breakdown would be a table with
  // one populated row saying what the page already says.
  const corpus = isReal ? countsByType(ws.real.interviews, ws.real.coding.segments) : []
  const guard = (what) => !isReal || confirmRealExport(ws, what)

  function exportJSON() {
    if (!guard('the full workspace JSON')) return
    if (isReal) {
      // Only the real dataset plus the shared instrument: the synthetic corpus
      // is deliberately left out so the file matches what the confirm named.
      const payload = {
        CONFIDENTIAL: REAL_CONFIDENTIALITY_HEADER, // header field, first key in the file
        exportedAt: new Date().toISOString(),
        mode: 'real',
        instrument: {
          studyDesign: ws.studyDesign,
          hypotheses: ws.hypotheses,
          protocol: ws.protocol,
          codebook: ws.codebook,
          settings: { patternMatching: ws.settings.patternMatching, reliability: ws.settings.reliability },
        },
        participants: ws.real.participants,
        interviews: ws.real.interviews,
        coding: ws.real.coding,
        aiReviewLog: ws.real.aiReviewLog,
        codebookDecisions: ws.real.codebookDecisions,
      }
      download(`ggd-data-${tag}-${stamp}.json`, JSON.stringify(payload, null, 2), 'application/json')
      setDone('Real participant data exported (confidentiality header embedded; synthetic corpus excluded).')
      return
    }
    // The caveat is written into a header field that no toggle can remove;
    // it is re-imposed here regardless of what the workspace contains.
    const payload = {
      SYNTHETIC_CAVEAT, // header field, first key in the file
      exportedAt: new Date().toISOString(),
      workspace: { ...ws, meta: { ...ws.meta, synthetic: true } },
    }
    download(`ggd-workspace-SYNTHETIC-${stamp}.json`, JSON.stringify(payload, null, 2), 'application/json')
    setDone('Workspace JSON exported (caveat embedded in header).')
  }

  function exportMarkdown() {
    if (!guard('the report as Markdown')) return
    const md = reportToMarkdown(buildReportModel(ws))
    download(`ggd-pilot-report-${tag}-${stamp}.md`, md, 'text/markdown')
    setDone(`Pilot Report exported as Markdown (${isReal ? 'confidentiality header' : 'caveat'} at top and bottom).`)
  }

  function exportHTML() {
    if (!guard('the report as printable HTML')) return
    const html = reportToHTML(buildReportModel(ws))
    download(`ggd-pilot-report-${tag}-${stamp}.html`, html, 'text/html')
    setDone('Printable HTML exported — open it and print to PDF if needed.')
  }

  function openPrintable() {
    if (!guard('the report in a printable window')) return
    const html = reportToHTML(buildReportModel(ws))
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
    }
    setDone('Printable report opened in a new tab.')
  }

  function exportAppendixMarkdown() {
    if (!guard('the Chapter-3 appendix as Markdown')) return
    const md = appendixToMarkdown(buildReportModel(ws))
    download(`ggd-chapter3-appendix-${tag}-${stamp}.md`, md, 'text/markdown')
    setDone(`Chapter-3 appendix exported as Markdown (${isReal ? 'confidentiality header' : 'caveat'} at head and foot).`)
  }

  function exportAppendixHTML() {
    if (!guard('the Chapter-3 appendix as printable HTML')) return
    const html = appendixToHTML(buildReportModel(ws))
    download(`ggd-chapter3-appendix-${tag}-${stamp}.html`, html, 'text/html')
    setDone('Chapter-3 appendix exported as printable HTML.')
  }

  function openAppendixPrintable() {
    if (!guard('the Chapter-3 appendix in a printable window')) return
    const html = appendixToHTML(buildReportModel(ws))
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
    }
    setDone('Printable appendix opened in a new tab.')
  }

  function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError('')
    setDone('')
    setPending(null)
    const reader = new FileReader()
    reader.onload = () => {
      const result = parseImport(String(reader.result))
      if (!result.ok) {
        setImportError(result.error)
        return
      }
      setPending({ workspace: result.workspace, counts: result.counts, filename: file.name })
    }
    reader.onerror = () => setImportError('Could not read the file.')
    reader.readAsText(file)
    e.target.value = '' // allow re-selecting the same file
  }

  function confirmImport() {
    if (!pending) return
    replaceWorkspace(restampSynthetic(pending.workspace))
    setDone(`Imported ${pending.filename} — workspace replaced and re-stamped SYNTHETIC.`)
    setPending(null)
  }

  return (
    <>
      <PageHeader
        title="Export Centre"
        desc={
          isReal
            ? 'Every export carries the confidentiality header in a field that cannot be toggled off, and never the synthetic caveat. Each one asks you to confirm exactly what is leaving the app first.'
            : 'Export and import are symmetric. Every export carries the SYNTHETIC caveat in a header field that cannot be toggled off, and every import is re-stamped SYNTHETIC on the way in — the caveat is re-imposed regardless of file contents.'
        }
      />

      <div
        className="notice"
        role="note"
        style={isReal ? { borderLeftColor: '#6d1f1d', fontWeight: 700 } : undefined}
      >
        {isReal ? REAL_CONFIDENTIALITY_HEADER : SYNTHETIC_CAVEAT}
      </div>

      {stale.length > 0 && (
        <div className="notice" role="alert" style={{ borderLeftColor: '#b03230' }}>
          <p style={{ margin: '0 0 6px', fontWeight: 700 }}>
            {stale.length} stored field{stale.length === 1 ? '' : 's'} in this workspace still
            describe{stale.length === 1 ? 's' : ''} a synthetic pilot.
          </p>
          <p className="small" style={{ margin: 0 }}>
            {stale.map((f) => f.label).join(', ')} — printed verbatim in the Pilot Report below
            the confidentiality header. Exporting now produces a document that claims real
            participant data at the top and denies findings about the institution in the body.
            Edit them on <Link to="/design/study">Study Design</Link>
            {stale.some((f) => f.where === 'Settings') && (
              <> and in <Link to="/settings">Settings</Link></>
            )}{' '}
            first. The app will not rewrite your text for you.
          </p>
        </div>
      )}

      {isReal && (
        <section className="card">
          <h2>What is in the corpus</h2>
          <p className="small muted">
            What every export below contains, by evidence type. Interviews, focus groups and
            documents pool into one transcript count everywhere else; before a file leaves the
            app is the point at which that pooling matters.
          </p>
          <table className="data">
            <thead>
              <tr>
                <th>Evidence type</th>
                <th>Sources</th>
                <th>People</th>
                <th>Coded segments</th>
              </tr>
            </thead>
            <tbody>
              {corpus.map((t) => (
                <tr key={t.id} className={t.sessions === 0 ? 'muted' : undefined}>
                  <td>{t.label}</td>
                  <td>{t.sessions}</td>
                  {/* A document has no speaker, so a people count there would be
                      a zero that reads as missing data rather than as N/A. */}
                  <td>{t.id === 'document' ? '—' : t.participants}</td>
                  <td>{t.segments}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {corpus.every((t) => t.sessions === 0) && (
            <p className="small muted" style={{ marginBottom: 0 }}>
              Nothing entered yet — an export now carries the instrument and no evidence.
            </p>
          )}
        </section>
      )}

      <div className="grid-2">
        <section className="card">
          <h2>{isReal ? 'Participant data (JSON)' : 'Workspace (JSON)'}</h2>
          <p className="small muted">
            {isReal
              ? 'Participant records, entered transcripts and coded segments, plus the instrument they were coded against. The synthetic corpus is not included.'
              : 'Full workspace state — design, protocol, codebook, personas, interviews, coded segments, settings (keys included only if you typed them into Settings; env keys never leave .env.local).'}
          </p>
          <button className="btn" onClick={exportJSON}>
            {isReal ? 'Download participant data JSON…' : 'Download workspace JSON'}
          </button>
        </section>

        <section className="card">
          <h2>Pilot Report</h2>
          <p className="small muted">
            The advisor-facing summary: design, hypotheses, protocol, codebook, reliability
            figures and pattern-matching, with the caveat at head and foot.
          </p>
          <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" onClick={exportMarkdown}>Markdown</button>
            <button className="btn" onClick={exportHTML}>Printable HTML</button>
            <button className="btn secondary" onClick={openPrintable}>Open print view</button>
          </p>
        </section>
      </div>

      <section className="card">
        <h2>Chapter-3 Appendix</h2>
        <p className="small muted">
          A denser, citation-ready appendix distinct from the advisor summary — the codebook
          with definitions, the reliability figures with band cut-points and citation, the
          pattern-matching result, and the joint-display matrix, plus the three charts. Headed
          with the non-removable caveat and a note that figures illustrate the METHOD, not
          validated coefficients or real findings.
        </p>
        <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={exportAppendixMarkdown}>Markdown</button>
          <button className="btn" onClick={exportAppendixHTML}>Printable HTML</button>
          <button className="btn secondary" onClick={openAppendixPrintable}>Open print view</button>
        </p>
      </section>

      {isReal ? (
        <section className="card">
          <h2>Import workspace (JSON)</h2>
          <p className="small muted" style={{ marginBottom: 0 }}>
            Import is disabled in real mode. It replaces the entire workspace and re-stamps
            everything SYNTHETIC, which would both destroy your participant records and
            mislabel confidential material as generated. Switch to synthetic mode to import.
          </p>
        </section>
      ) : (
      <section className="card">
        <h2>Import workspace (JSON)</h2>
        <p className="small muted">
          Load a previously-exported workspace JSON. This <strong>replaces</strong> your
          current workspace, so you will be asked to confirm after reviewing what the file
          contains. Everything imported is re-stamped SYNTHETIC.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onFile}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
          aria-hidden="true"
          tabIndex={-1}
        />
        <button className="btn secondary" onClick={() => fileRef.current?.click()}>
          Choose JSON file…
        </button>

        {importError && (
          <p className="small" role="alert" style={{ color: '#b03230', marginTop: 10 }}>
            {importError}
          </p>
        )}

        {pending && (
          <div className="notice" style={{ marginTop: 12 }}>
            <p style={{ margin: '0 0 6px' }}>
              <strong>{pending.filename}</strong> is a valid workspace export containing:
            </p>
            <ul className="small" style={{ margin: '0 0 8px 1.1rem' }}>
              <li>{pending.counts.protocolQs} protocol questions</li>
              <li>{pending.counts.codes} codebook codes</li>
              <li>{pending.counts.personas} synthetic personas</li>
              <li>{pending.counts.interviews} interviews</li>
              <li>{pending.counts.segments} coded segments</li>
            </ul>
            <p className="small" style={{ margin: '0 0 8px' }}>
              Importing will <strong>overwrite your current workspace</strong>
              {' '}({ws.personas.length} personas, {ws.interviews.length} interviews,{' '}
              {ws.coding.segments.length} segments). This cannot be undone — export your
              current workspace first if you want to keep it.
            </p>
            <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: 0 }}>
              <button className="btn danger" onClick={confirmImport}>
                Replace workspace with this import
              </button>
              <button className="btn secondary" onClick={() => setPending(null)}>
                Cancel
              </button>
            </p>
          </div>
        )}
      </section>
      )}

      {done && <p role="status" className="small" style={{ color: '#2f9e44' }}>{done}</p>}
    </>
  )
}
