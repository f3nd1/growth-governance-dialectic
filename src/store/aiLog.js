// AI review log — one entry per AI call (live or simulated). Rides the normal
// workspace dataStore (localStorage + whatever sync workspace_state already
// uses). Never stores the API key; model name and token counts are fine.

import { update, updateActive } from './dataStore'

const MAX = 500 // ponytail: cap the log; raise if a longer audit trail is needed

let counter = 0

/**
 * entry: { purpose, module, model, mode, tokens, prompt, output, error? }
 * mode ∈ 'live' | 'simulated' | 'live-failed-fallback'
 */
export function logAICall(entry) {
  const record = {
    id: `ai-${Date.now().toString(36)}-${counter++}`,
    when: new Date().toISOString(),
    tokens: null,
    ...entry,
  }
  // Follows the workspace mode: a real-mode prompt quotes participant answers,
  // so its entry belongs in the real slice, which never leaves the browser.
  updateActive('aiReviewLog', (log) => [record, ...(log ?? [])].slice(0, MAX))
}

export function clearAILog() {
  updateActive('aiReviewLog', () => [])
}
