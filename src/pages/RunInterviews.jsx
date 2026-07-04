import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import WeightBar from '../components/WeightBar'
import { useWorkspace } from '../store/dataStore'
import { runInterviews } from '../engine'
import { liveModeAvailable } from '../engine/llm'

export default function RunInterviews() {
  const ws = useWorkspace()
  const [selected, setSelected] = useState(() => new Set())
  const [seed, setSeed] = useState(1)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)

  const live = liveModeAvailable(ws.settings)

  function toggle(id) {
    setSelected((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function run(ids, seedToUse) {
    setRunning(true)
    setResult(null)
    try {
      const { interviews, errors } = await runInterviews(ids, seedToUse)
      setResult({ count: interviews.length, errors, seed: seedToUse })
    } finally {
      setRunning(false)
    }
  }

  const chosen = [...selected]

  return (
    <>
      <PageHeader
        title="Run Interviews"
        desc="Runs each chosen synthetic persona through the current Interview Protocol. No real people are involved at any point."
      />

      <div className="notice">
        Mode: <strong>{live ? 'LIVE — one LLM call per persona' : 'OFFLINE — deterministic simulator (zero cost)'}</strong>.{' '}
        {live
          ? 'Live answers vary between runs; the simulator remains the fallback on any failure.'
          : 'Same persona + same seed always reproduces the identical interview — that determinism is what the stability and reliability checks exploit.'}
        {!live && <> Enable live AI in <Link to="/settings">Settings</Link>.</>}
      </div>

      <section className="card">
        <h2>1 · Choose personas</h2>
        <div className="chip-row" role="group" aria-label="Persona selection">
          {ws.personas.map((p) => (
            <button
              key={p.id}
              className={'chip' + (selected.has(p.id) ? ' on' : '')}
              aria-pressed={selected.has(p.id)}
              onClick={() => toggle(p.id)}
            >
              {p.held.length >= 2 ? '⚡ ' : ''}
              {p.name.replace(' (synthetic)', '')}
              {p.blindSpot ? ' 🕳' : ''}
            </button>
          ))}
        </div>
        {chosen.length > 0 && (
          <div style={{ maxWidth: 380 }}>
            {chosen.map((id) => {
              const p = ws.personas.find((x) => x.id === id)
              return p ? (
                <div key={id} style={{ marginBottom: 6 }}>
                  <span className="small">{p.name}</span>
                  <WeightBar weights={p.weights} height={8} />
                </div>
              ) : null
            })}
          </div>
        )}
      </section>

      <section className="card">
        <h2>2 · Seed &amp; run</h2>
        <div className="field" style={{ maxWidth: 220 }}>
          <label htmlFor="run-seed">Seed (offline determinism)</label>
          <input
            id="run-seed"
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value))}
          />
        </div>
        <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn"
            disabled={running || chosen.length === 0}
            onClick={() => run(chosen, seed)}
          >
            {running ? 'Running…' : `Run ${chosen.length || ''} selected`}
          </button>
          <button
            className="btn secondary"
            disabled={running || ws.personas.length === 0}
            onClick={() => run(ws.personas.map((p) => p.id), seed)}
          >
            Run all {ws.personas.length}
          </button>
          <button
            className="btn secondary"
            disabled={running || chosen.length === 0}
            title="Regenerate the same personas with a fresh seed — feeds the stability/reliability checks"
            onClick={() => {
              const next = seed + 1
              setSeed(next)
              run(chosen, next)
            }}
          >
            Re-run (seed +1)
          </button>
        </p>
        <p className="muted small">
          Re-running with a new seed produces a different synthetic interview for the same
          persona — compare runs on the Reliability page’s stability view.
        </p>
      </section>

      {result && (
        <section className="card" aria-live="polite">
          <h2>Result</h2>
          <p>
            Generated <strong>{result.count}</strong> synthetic interview
            {result.count === 1 ? '' : 's'} with seed {result.seed}.{' '}
            <Link to="/fieldwork/transcripts">View transcripts →</Link>
          </p>
          {result.errors.map((e, i) => (
            <p key={i} className="small" style={{ color: '#b03230' }}>{e}</p>
          ))}
        </section>
      )}

      <section className="card">
        <h2>Run history</h2>
        {ws.interviews.length === 0 ? (
          <p className="muted">No interviews yet.</p>
        ) : (
          <table className="data">
            <thead>
              <tr><th>When</th><th>Persona</th><th>Mode</th><th>Seed</th><th>Answers</th></tr>
            </thead>
            <tbody>
              {[...ws.interviews].reverse().slice(0, 15).map((iv) => (
                <tr key={iv.id}>
                  <td>{new Date(iv.createdAt).toLocaleTimeString()}</td>
                  <td>{iv.personaName} <span className="stamp">syn</span></td>
                  <td>{iv.mode}</td>
                  <td>{iv.seed}</td>
                  <td>{iv.answers.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
