import { Fragment, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useWorkspace } from '../store/dataStore'
import { clearAILog } from '../store/aiLog'

const MODE_LABEL = {
  live: 'live',
  simulated: 'simulated',
  'live-failed-fallback': 'live → fell back to simulation',
}

const PRESETS = [
  { id: 'today', label: 'Today', ms: null }, // handled specially (since midnight)
  { id: '7', label: '7 days', ms: 7 * 864e5 },
  { id: '30', label: '30 days', ms: 30 * 864e5 },
  { id: 'all', label: 'All', ms: Infinity },
]

function cutoffFor(preset) {
  if (preset === 'all') return 0
  if (preset === 'today') {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }
  const p = PRESETS.find((x) => x.id === preset)
  return Date.now() - (p?.ms ?? Infinity)
}

export default function AIReviewLog() {
  const ws = useWorkspace()
  const log = ws.aiReviewLog ?? []
  const [moduleFilter, setModuleFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [preset, setPreset] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const modules = ['all', ...new Set(log.map((e) => e.module))]
  const total = log.length
  const liveN = log.filter((e) => e.mode === 'live').length
  const simN = log.filter((e) => e.mode === 'simulated').length
  const fallbackN = log.filter((e) => e.mode === 'live-failed-fallback').length

  const q = query.trim().toLowerCase()
  const cutoff = cutoffFor(preset)
  const shown = log.filter((e) => {
    if (moduleFilter !== 'all' && e.module !== moduleFilter) return false
    if (new Date(e.when).getTime() < cutoff) return false
    if (!q) return true
    return [e.purpose, e.module, e.model, e.mode, e.prompt, e.output]
      .some((v) => String(v ?? '').toLowerCase().includes(q))
  })

  return (
    <>
      <PageHeader
        title="AI Review Log"
        desc="Every AI call the app has made, live or simulated, newest first. The API key is never stored here."
      />

      <section className="card">
        <h2>
          {total} run{total === 1 ? '' : 's'} · {liveN} live · {simN} simulated · {fallbackN} failed &amp; fell back
        </h2>

        <div className="chip-row" role="group" aria-label="Filter by module">
          {modules.map((m) => (
            <button key={m} className={'chip' + (moduleFilter === m ? ' on' : '')} aria-pressed={moduleFilter === m} onClick={() => setModuleFilter(m)}>
              {m === 'all' ? 'All modules' : m}
            </button>
          ))}
        </div>

        <div className="chip-row" role="group" aria-label="Date range">
          {PRESETS.map((p) => (
            <button key={p.id} className={'chip' + (preset === p.id ? ' on' : '')} aria-pressed={preset === p.id} onClick={() => setPreset(p.id)}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="field" style={{ maxWidth: 360 }}>
          <label htmlFor="ail-search">Search (agent/purpose, model, prompt, output…)</label>
          <input id="ail-search" type="text" placeholder="e.g. Marcus Tay, gpt-4o…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {log.length > 0 && (
          <p>
            <button
              className="btn small danger"
              onClick={() => { if (window.confirm('Clear the entire AI review log? This permanently deletes all logged AI-call entries. This cannot be undone.')) clearAILog() }}
            >
              Clear log
            </button>
          </p>
        )}

        {shown.length === 0 ? (
          <p className="muted">{log.length === 0 ? 'No AI calls logged yet — run interviews to populate.' : 'No matching entries.'}</p>
        ) : (
          <table className="data">
            <thead>
              <tr><th>Agent / Purpose</th><th>Module</th><th>Model</th><th>Mode</th><th>Tokens</th><th>When</th></tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <Fragment key={e.id}>
                  <tr onClick={() => setExpanded(expanded === e.id ? null : e.id)} style={{ cursor: 'pointer' }}>
                    <td>{expanded === e.id ? '▾ ' : '▸ '}{e.purpose}</td>
                    <td>{e.module}</td>
                    <td><code>{e.model}</code></td>
                    <td>
                      <span className="tag" style={{ color: e.mode === 'live' ? 'var(--wh2)' : e.mode === 'simulated' ? 'var(--muted)' : '#b03230' }}>
                        {MODE_LABEL[e.mode] ?? e.mode}
                      </span>
                    </td>
                    <td>{e.tokens ?? '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(e.when).toLocaleString()}</td>
                  </tr>
                  {expanded === e.id && (
                    <tr>
                      <td colSpan={6}>
                        {e.error && <p className="small" style={{ color: '#b03230' }}>Live error: {e.error}</p>}
                        <h4 style={{ margin: '4px 0' }}>Prompt Sent</h4>
                        <pre className="small" style={{ whiteSpace: 'pre-wrap', background: '#f7f7f4', padding: 10, borderRadius: 6, margin: 0 }}>{e.prompt}</pre>
                        <h4 style={{ margin: '10px 0 4px' }}>Output Received</h4>
                        <pre className="small" style={{ whiteSpace: 'pre-wrap', background: '#f7f7f4', padding: 10, borderRadius: 6, margin: 0 }}>{e.output}</pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
