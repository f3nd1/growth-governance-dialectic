// Deterministic demo-data builder + workspace-mode detection.
//
// "Load demo data" reproduces the known-good end-to-end state (8 personas →
// 56 coded segments → κ≈0.88 Strong → split pattern on the paradox persona)
// so a fresh visitor can explore the whole pipeline immediately. It reuses
// the SAME simulator and coder the live pipeline uses, with fixed IDs/seed/
// timestamp so the result is fully deterministic and idempotent — loading
// twice yields byte-identical state. Everything is stamped SYNTHETIC exactly
// like user-created data.

import { defaultWorkspace } from '../store/defaults'
import { setState } from '../store/dataStore'
import { simulateInterview } from './simulator'
import { codeInterview } from './coding'

export const DEMO_SEED = 1
// Fixed timestamp keeps demo state byte-stable (Date.now would break idempotency).
const DEMO_TIMESTAMP = '2026-01-01T00:00:00.000Z'

/** Build the full demo workspace from a clean default base. Pure/deterministic. */
export function buildDemoWorkspace() {
  const base = defaultWorkspace()
  const questions = [...base.protocol.questions].sort((a, b) => a.order - b.order)

  const interviews = base.personas.map((p) => ({
    id: `demo-iv-${p.id}`,
    personaId: p.id,
    personaName: p.name,
    mode: 'offline',
    seed: DEMO_SEED,
    createdAt: DEMO_TIMESTAMP,
    synthetic: true,
    answers: simulateInterview(p, questions, DEMO_SEED),
  }))

  const segments = interviews.flatMap((iv) => codeInterview(iv, base.codebook))

  return {
    ...base,
    meta: { ...base.meta, createdAt: DEMO_TIMESTAMP, updatedAt: DEMO_TIMESTAMP },
    personas: base.personas.map((p) => ({ ...p, runCount: 1 })),
    interviews,
    coding: { segments, overridesLog: [] },
    calibration: { runs: [] },
  }
}

/** Empty instrument: seeded definitions remain, all run/analysis data cleared. */
export function buildEmptyWorkspace() {
  const base = defaultWorkspace()
  return {
    ...base,
    personas: base.personas.map((p) => ({ ...p, runCount: 0 })),
    interviews: [],
    coding: { segments: [], overridesLog: [] },
    calibration: { runs: [] },
  }
}

// Signature over just the run/analysis payload — the parts demo/reset own.
// Compared to detect whether the current workspace still matches a pristine
// demo (or empty) state, so status can never disagree with the actual data.
function runSignature(ws) {
  return JSON.stringify({
    interviews: ws.interviews,
    segments: ws.coding.segments,
    overrides: ws.coding.overridesLog,
    personas: ws.personas.map((p) => ({ ...p })),
  })
}

let demoSig = null
let emptySig = null

/** 'empty' | 'demo' | 'custom' — never recomputes analysis, just compares state. */
export function workspaceMode(ws) {
  if (demoSig === null) demoSig = runSignature(buildDemoWorkspace())
  if (emptySig === null) emptySig = runSignature(buildEmptyWorkspace())
  const sig = runSignature(ws)
  if (sig === demoSig) return 'demo'
  if (sig === emptySig || (ws.interviews.length === 0 && ws.coding.segments.length === 0))
    return 'empty'
  return 'custom'
}

export const MODE_LABELS = {
  empty: 'Empty',
  demo: 'Demo data loaded',
  custom: 'Custom (user-modified)',
}

// Both mutations preserve settings (keys/toggles) and are idempotent.
export function loadDemoData() {
  const demo = buildDemoWorkspace()
  setState((prev) => ({ ...demo, settings: prev.settings }))
}

export function resetToEmpty() {
  const empty = buildEmptyWorkspace()
  setState((prev) => ({ ...empty, settings: prev.settings }))
}
