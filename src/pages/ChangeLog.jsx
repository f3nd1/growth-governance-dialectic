import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import changelog from '../data/changelog.json'

export default function ChangeLog() {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')

  const entries = changelog.entries ?? []
  const pushes = entries.filter((e) => e.action === 'push').length
  const pulls = entries.filter((e) => e.action === 'pull').length

  const q = query.trim().toLowerCase()
  const shown = entries.filter((e) => {
    if (filter !== 'all' && e.action !== filter) return false
    if (!q) return true
    return [e.message, e.summary, e.commit, e.branch]
      .some((v) => String(v ?? '').toLowerCase().includes(q))
  })

  return (
    <>
      <PageHeader
        title="Change Log"
        desc="Read-only history from committed src/data/changelog.json — append entries with `npm run log-change` after each commit."
      />

      <section className="card">
        <h2>
          {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} · {pushes} push{pushes === 1 ? '' : 'es'} · {pulls} pull{pulls === 1 ? '' : 's'}
        </h2>

        <div className="chip-row" role="group" aria-label="Filter by action">
          {['all', 'push', 'pull'].map((f) => (
            <button
              key={f}
              className={'chip' + (filter === f ? ' on' : '')}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        <div className="field" style={{ maxWidth: 340 }}>
          <label htmlFor="cl-search">Search</label>
          <input
            id="cl-search"
            type="text"
            placeholder="message, summary, commit…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {shown.length === 0 ? (
          <p className="muted">No matching entries.</p>
        ) : (
          <table className="data">
            <thead>
              <tr><th>When</th><th>Action</th><th>Commit</th><th>Message</th><th>Summary</th></tr>
            </thead>
            <tbody>
              {shown.map((e, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(e.when).toLocaleString()}</td>
                  <td><span className="tag" style={{ color: e.action === 'push' ? 'var(--wh2)' : 'var(--accent)' }}>{e.action}</span></td>
                  <td><code>{e.commit}</code></td>
                  <td>{e.message}</td>
                  <td className="small muted">{e.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
