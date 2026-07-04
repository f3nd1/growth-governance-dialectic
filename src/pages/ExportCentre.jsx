import { useRef, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useWorkspace, replaceWorkspace } from '../store/dataStore'
import {
  buildReportModel,
  reportToMarkdown,
  reportToHTML,
  SYNTHETIC_CAVEAT,
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

export default function ExportCentre() {
  const ws = useWorkspace()
  const [done, setDone] = useState('')
  const [pending, setPending] = useState(null) // { workspace, counts, filename }
  const [importError, setImportError] = useState('')
  const fileRef = useRef(null)

  const stamp = new Date().toISOString().slice(0, 10)

  function exportJSON() {
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
    const md = reportToMarkdown(buildReportModel(ws))
    download(`ggd-pilot-report-SYNTHETIC-${stamp}.md`, md, 'text/markdown')
    setDone('Pilot Report exported as Markdown (caveat at top and bottom).')
  }

  function exportHTML() {
    const html = reportToHTML(buildReportModel(ws))
    download(`ggd-pilot-report-SYNTHETIC-${stamp}.html`, html, 'text/html')
    setDone('Printable HTML exported — open it and print to PDF if needed.')
  }

  function openPrintable() {
    const html = reportToHTML(buildReportModel(ws))
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
    }
    setDone('Printable report opened in a new tab.')
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
        desc="Export and import are symmetric. Every export carries the SYNTHETIC caveat in a header field that cannot be toggled off, and every import is re-stamped SYNTHETIC on the way in — the caveat is re-imposed regardless of file contents."
      />

      <div className="notice" role="note">
        {SYNTHETIC_CAVEAT}
      </div>

      <div className="grid-2">
        <section className="card">
          <h2>Workspace (JSON)</h2>
          <p className="small muted">
            Full workspace state — design, protocol, codebook, personas, interviews, coded
            segments, settings (keys included only if you typed them into Settings; env keys
            never leave .env.local).
          </p>
          <button className="btn" onClick={exportJSON}>Download workspace JSON</button>
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

      {done && <p role="status" className="small" style={{ color: '#2f9e44' }}>{done}</p>}
    </>
  )
}
