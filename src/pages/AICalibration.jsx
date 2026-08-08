import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useWorkspace, update } from '../store/dataStore'
import { simulateInterview } from '../engine/simulator'
import { generateLiveInterview, liveModeAvailable } from '../engine/llm'
import { logAICall } from '../store/aiLog'

export default function AICalibration() {
  const ws = useWorkspace()
  const [personaId, setPersonaId] = useState(ws.personas[0]?.id ?? '')
  const [seed, setSeed] = useState(1)
  const [running, setRunning] = useState(false)
  const [comparison, setComparison] = useState(null)
  const [error, setError] = useState(null)

  const live = liveModeAvailable(ws.settings)
  const persona = ws.personas.find((p) => p.id === personaId)
  const questions = [...ws.protocol.questions].sort((a, b) => a.order - b.order)

  async function runComparison() {
    if (!persona) return
    setRunning(true)
    setError(null)
    const base = { purpose: `Persona Interview — ${persona.name}`, module: 'AI Calibration' }
    try {
      const offline = simulateInterview(persona, questions, seed)
      logAICall({
        ...base,
        model: 'offline-simulator',
        mode: 'simulated',
        tokens: null,
        prompt: `Offline deterministic simulator\nPersona: ${persona.name} · seed ${seed}\nQuestions:\n${questions.map((q, i) => `${i + 1}. ${q.text}`).join('\n')}`,
        output: offline.map((a, i) => `Q${i + 1} [${a.lean}]: ${a.text}`).join('\n\n'),
      })
      let liveAnswers = null
      if (live) {
        const meta = await generateLiveInterview(persona, questions, ws.hypotheses, ws.settings)
        liveAnswers = meta.answers
        logAICall({ ...base, model: ws.settings.openai.analysisModel || 'gpt-4o', mode: 'live', tokens: meta.tokens, prompt: meta.prompt, output: meta.output })
      }
      setComparison({ offline, live: liveAnswers, persona: persona.name, seed })
      const leanDist = (answers) => {
        const d = {}
        for (const a of answers ?? []) d[a.lean] = (d[a.lean] ?? 0) + 1
        return d
      }
      update('calibration', (c) => ({
        ...c,
        runs: [
          {
            when: new Date().toISOString(),
            persona: persona.name,
            seed,
            liveUsed: Boolean(liveAnswers),
            offlineLeans: leanDist(offline),
            liveLeans: liveAnswers ? leanDist(liveAnswers) : null,
          },
          ...c.runs,
        ].slice(0, 12),
      }))
    } catch (err) {
      // Live attempt failed; the offline comparison stands in. Log one fallback entry.
      logAICall({ ...base, model: 'offline-simulator', mode: 'live-failed-fallback', tokens: null, prompt: '(live call attempted)', output: '(fell back to offline comparison)', error: String(err.message ?? err) })
      setError(String(err.message ?? err))
    } finally {
      setRunning(false)
    }
  }

  return (
    <>
      <PageHeader
        title="AI Calibration"
        desc="Sanity-check the offline simulator against live LLM output for the same synthetic persona: do both produce answers with a similar hypothesis lean profile?"
      />

      {!live && (
        <div className="notice">
          Live mode is off, so only the offline side will generate. Add a key and enable
          live AI in <Link to="/settings">Settings</Link> to compare both. The comparison
          question: does the deterministic simulator’s lean distribution roughly match what
          a live LLM produces for the same persona? If yes, offline piloting is a fair
          zero-cost stand-in.
        </div>
      )}

      <section className="card">
        <div className="grid-2">
          <div className="field">
            <label htmlFor="cal-persona">Persona</label>
            <select id="cal-persona" value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
              {ws.personas.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cal-seed">Offline seed</label>
            <input id="cal-seed" type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
          </div>
        </div>
        <button className="btn" onClick={runComparison} disabled={running || !persona}>
          {running ? 'Generating…' : live ? 'Generate offline + live' : 'Generate offline only'}
        </button>
        {error && <p className="small" style={{ color: '#b03230', marginTop: 8 }}>{error}</p>}
      </section>

      {comparison && (
        <section className="card" style={{ overflowX: 'auto' }}>
          <h2>{comparison.persona} <span className="stamp">Synthetic</span></h2>
          <table className="data">
            <thead>
              <tr>
                <th style={{ width: '18%' }}>Question</th>
                <th>Offline simulator (seed {comparison.seed})</th>
                <th>{comparison.live ? 'Live LLM' : 'Live LLM (not run)'}</th>
              </tr>
            </thead>
            <tbody>
              {comparison.offline.map((a, i) => (
                <tr key={i}>
                  <td className="small">Q{i + 1}</td>
                  <td className="small">
                    <span className="tag" style={{ color: ws.hypotheses[a.lean]?.color ?? '#7c3aed' }}>
                      {ws.hypotheses[a.lean]?.short ?? a.lean}
                    </span>{' '}
                    {a.text}
                  </td>
                  <td className="small">
                    {comparison.live ? (
                      <>
                        <span className="tag" style={{ color: ws.hypotheses[comparison.live[i]?.lean]?.color ?? '#7c3aed' }}>
                          {ws.hypotheses[comparison.live[i]?.lean]?.short ?? comparison.live[i]?.lean}
                        </span>{' '}
                        {comparison.live[i]?.text}
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="card">
        <h2>Run history (last 12)</h2>
        {ws.calibration.runs.length === 0 ? (
          <p className="muted">No calibration runs yet.</p>
        ) : (
          <table className="data">
            <thead>
              <tr><th>When</th><th>Persona</th><th>Seed</th><th>Live?</th><th>Offline leans</th><th>Live leans</th></tr>
            </thead>
            <tbody>
              {ws.calibration.runs.map((r, i) => (
                <tr key={i}>
                  <td>{new Date(r.when).toLocaleString()}</td>
                  <td>{r.persona}</td>
                  <td>{r.seed}</td>
                  <td>{r.liveUsed ? 'yes' : 'no'}</td>
                  <td className="small">{Object.entries(r.offlineLeans).map(([k, v]) => `${k}:${v}`).join(' ')}</td>
                  <td className="small">{r.liveLeans ? Object.entries(r.liveLeans).map(([k, v]) => `${k}:${v}`).join(' ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
