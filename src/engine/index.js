// Orchestrates interview runs: offline simulator by default, live LLM when
// enabled, always falling back to the simulator on live failure.

import { simulateInterview } from './simulator'
import { generateLiveInterview, liveModeAvailable } from './llm'
import { getState, setState } from '../store/dataStore'
import { logAICall } from '../store/aiLog'

let counter = 0

// Readable, key-free prompt/output summary for a simulated (offline) run.
function simSummary(persona, questions, answers, seed) {
  return {
    prompt:
      `Offline deterministic simulator\nPersona: ${persona.name} (${persona.role}, ${persona.group}) · seed ${seed}\n` +
      `Questions:\n${questions.map((q, i) => `${i + 1}. ${q.text}`).join('\n')}`,
    output: answers.map((a, i) => `Q${i + 1} [${a.lean}]: ${a.text}`).join('\n\n'),
  }
}

/**
 * Runs the protocol for each persona id. Returns {interviews, errors}.
 * Live failures fall back to offline and are reported, never thrown.
 */
export async function runInterviews(personaIds, seed) {
  const ws = getState()
  const questions = [...ws.protocol.questions].sort((a, b) => a.order - b.order)
  const live = liveModeAvailable(ws.settings)
  const errors = []
  const interviews = []

  for (const personaId of personaIds) {
    const persona = ws.personas.find((p) => p.id === personaId)
    if (!persona) continue

    let answers = null
    let mode = 'offline'
    let liveError = null
    let liveMeta = null
    if (live) {
      try {
        liveMeta = await generateLiveInterview(persona, questions, ws.hypotheses, ws.settings)
        answers = liveMeta.answers
        mode = 'live'
      } catch (err) {
        liveError = err.message
        errors.push(`${persona.name}: live generation failed (${err.message}) — used offline simulator.`)
      }
    }
    if (!answers) answers = simulateInterview(persona, questions, seed)

    // One log entry per attempt: live success, live-failed-fallback, or simulated.
    const base = { purpose: `Persona Interview — ${persona.name}`, module: 'Fieldwork' }
    if (mode === 'live') {
      logAICall({ ...base, model: ws.settings.openai.analysisModel || 'gpt-4o', mode: 'live', tokens: liveMeta.tokens, prompt: liveMeta.prompt, output: liveMeta.output })
    } else if (liveError) {
      const sim = simSummary(persona, questions, answers, seed)
      logAICall({ ...base, model: 'offline-simulator', mode: 'live-failed-fallback', tokens: null, prompt: sim.prompt, output: sim.output, error: liveError })
    } else {
      const sim = simSummary(persona, questions, answers, seed)
      logAICall({ ...base, model: 'offline-simulator', mode: 'simulated', tokens: null, prompt: sim.prompt, output: sim.output })
    }

    interviews.push({
      id: `iv-${Date.now().toString(36)}-${counter++}`,
      personaId: persona.id,
      personaName: persona.name,
      mode,
      seed,
      createdAt: new Date().toISOString(),
      synthetic: true,
      answers,
    })
  }

  // Run counts are derived live from ws.interviews wherever they are shown,
  // so a run only appends interviews — the persona records are never mutated.
  setState((prev) => ({
    ...prev,
    interviews: [...prev.interviews, ...interviews],
  }))

  return { interviews, errors }
}
