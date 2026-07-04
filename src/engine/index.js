// Orchestrates interview runs: offline simulator by default, live LLM when
// enabled, always falling back to the simulator on live failure.

import { simulateInterview } from './simulator'
import { generateLiveInterview, liveModeAvailable } from './llm'
import { getState, setState } from '../store/dataStore'

let counter = 0

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
    if (live) {
      try {
        answers = await generateLiveInterview(persona, questions, ws.hypotheses, ws.settings)
        mode = 'live'
      } catch (err) {
        errors.push(`${persona.name}: live generation failed (${err.message}) — used offline simulator.`)
      }
    }
    if (!answers) answers = simulateInterview(persona, questions, seed)

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

  setState((prev) => ({
    ...prev,
    interviews: [...prev.interviews, ...interviews],
    personas: prev.personas.map((p) =>
      personaIds.includes(p.id)
        ? { ...p, runCount: (p.runCount ?? 0) + 1 }
        : p,
    ),
  }))

  return { interviews, errors }
}
