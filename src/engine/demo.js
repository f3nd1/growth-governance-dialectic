// Deterministic demo-data builder + workspace-mode detection.
//
// "Load demo data" reproduces the known-good end-to-end state (9 personas →
// 72 coded segments → κ≈0.88 Strong → split pattern on the paradox persona)
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
    interviews,
    coding: { segments, overridesLog: [] },
    calibration: { runs: [] },
  }
}

// ------------------------------------------------------------- mode detection
//
// Progress is DERIVED from data, never stored. We compare signatures of the
// live workspace against known pristine states so the reported mode can never
// disagree with what is actually present.

// Design layer = the parts a researcher edits while building the instrument.
function designSignature(protocol, codebook, personas) {
  return JSON.stringify({
    protocol: protocol.questions,
    codebook: codebook.codes,
    personas,
  })
}

// Full signature = design layer + run/analysis layer, for exact demo match.
function fullSignature(ws) {
  return JSON.stringify({
    protocol: ws.protocol.questions,
    codebook: ws.codebook.codes,
    personas: ws.personas,
    interviews: ws.interviews,
    segments: ws.coding.segments,
    overrides: ws.coding.overridesLog,
  })
}

let demoSig = null
let defaultDesignSig = null

function designIsDefault(ws) {
  if (defaultDesignSig === null) {
    const d = defaultWorkspace()
    defaultDesignSig = designSignature(d.protocol, d.codebook, d.personas)
  }
  return designSignature(ws.protocol, ws.codebook, ws.personas) === defaultDesignSig
}

/**
 * 'empty' | 'demo' | 'custom' — derived from data, never a stored flag.
 * - demo:   design is default AND the run/analysis layer is exactly the demo build.
 * - empty:  design is still the pristine defaults AND nothing has been run.
 * - custom: anything else — including a designed-but-not-yet-run instrument
 *           (edited protocol/codebook/personas), so design work is never
 *           mislabelled "Empty".
 */
export function workspaceMode(ws) {
  if (demoSig === null) demoSig = fullSignature(buildDemoWorkspace())
  if (fullSignature(ws) === demoSig) return 'demo'
  const noRuns = ws.interviews.length === 0 && ws.coding.segments.length === 0
  if (noRuns && designIsDefault(ws)) return 'empty'
  return 'custom'
}

export const MODE_LABELS = {
  empty: 'Empty',
  demo: 'Demo data loaded',
  custom: 'Custom (user-modified)',
}

// ------------------------------------------------------------------ mutations

/** Load the deterministic demo pipeline. Preserves settings; idempotent. */
export function loadDemoData() {
  const demo = buildDemoWorkspace()
  // Preserve settings and the AI review log (an audit trail of real calls).
  setState((prev) => ({ ...demo, settings: prev.settings, aiReviewLog: prev.aiReviewLog ?? [] }))
}

/**
 * Reset to an empty instrument. Preserves the DESIGN layer exactly as promised
 * to the user — custom protocol, codebook and persona definitions remain — and
 * clears only the pipeline-output layer: interviews/transcripts, coding,
 * reliability and pattern-matching results, plus calibration history.
 */
export function resetToEmpty() {
  setState((prev) => ({
    ...prev,
    interviews: [],
    coding: { segments: [], overridesLog: [] },
    calibration: { runs: [] },
  }))
}
