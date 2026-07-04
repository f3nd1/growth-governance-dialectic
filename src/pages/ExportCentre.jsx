import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useWorkspace } from '../store/dataStore'
import { buildReportModel, reportToMarkdown, reportToHTML, SYNTHETIC_CAVEAT } from '../engine/report'

function download(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ExportCentre() {
  const ws = useWorkspace()
  const [done, setDone] = useState('')

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

  return (
    <>
      <PageHeader
        title="Export Centre"
        desc="Every export carries the SYNTHETIC caveat in a header field that cannot be toggled off — the caveat is re-imposed at export time regardless of workspace contents."
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

      {done && <p role="status" className="small" style={{ color: '#2f9e44' }}>{done}</p>}
    </>
  )
}
