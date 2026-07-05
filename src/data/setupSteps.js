// Guided-setup content and derived completion checks.
//
// Progress is DERIVED from real workspace data, never stored — each step's
// `done(ws)` reads the same state the pipeline pages read, so the checklist
// can never drift from reality. The only persisted field for this feature is
// settings.setupGuide.dismissed (minimise vs expand). Edit the copy here.

export const SETUP_WELCOME = {
  title: 'Getting started',
  body:
    'This is a doctoral research INSTRUMENT — a synthetic-participant pilot that validates ' +
    'the data-collection and analysis method before real fieldwork. Nothing it produces is a ' +
    'real finding. Work through the pipeline below; the whole thing runs offline at zero cost.',
}

// Pages worth reading first. These are a REFERENCE list, deliberately NOT
// checkboxes — nothing in the data can prove a page was read, and this tool
// does not pretend otherwise.
export const SETUP_REFERENCES = [
  { path: '/design/study', label: 'Study Design' },
  { path: '/design/hypotheses', label: 'Hypotheses' },
  { path: '/design/protocol', label: 'Interview Protocol' },
  { path: '/design/codebook', label: 'Codebook' },
]

// The six checkable milestones. `done` is a pure derived predicate. Redundant
// signals (coding ⇒ reliability/patterns available) are intentional and
// honest: a ticked step means "the data this page needs now exists".
export const SETUP_STEPS = [
  {
    id: 'personas',
    label: 'Build or seed synthetic personas',
    path: '/participants/library',
    hint: 'Eight are seeded by default; edit them or add your own.',
    done: (ws) => ws.personas.length > 0,
  },
  {
    id: 'interviews',
    label: 'Run interviews',
    path: '/fieldwork/run',
    hint: 'Run all personas through the protocol (offline simulator or live LLM).',
    done: (ws) => ws.interviews.length > 0,
  },
  {
    id: 'coding',
    label: 'Dual-code the transcripts',
    path: '/analysis/coding',
    hint: 'Two independent coders classify every segment; disagreements are surfaced.',
    done: (ws) => ws.coding.segments.length > 0,
  },
  {
    id: 'reliability',
    label: 'Check reliability (Cohen’s κ)',
    path: '/analysis/reliability',
    hint: 'Observed agreement and kappa against your chosen interpretation bands.',
    done: (ws) => ws.coding.segments.length > 0,
  },
  {
    id: 'patterns',
    label: 'Review pattern-matching & joint display',
    path: '/analysis/patterns',
    hint: 'Evidence distributed across WH1/WH2/WH3; split (paradox) patterns surfaced.',
    done: (ws) => ws.coding.segments.length > 0,
  },
  {
    id: 'report',
    label: 'Assemble the Pilot Report & export',
    path: '/outputs/report',
    hint: 'Review-ready summary; export JSON / Markdown / printable HTML with the caveat.',
    done: (ws) => ws.interviews.length > 0 && ws.coding.segments.length > 0,
  },
]

// Optional integrations — explicitly optional; offline works fully with zero keys.
export const SETUP_OPTIONAL = {
  title: 'Optional — connect services',
  body:
    'Entirely optional. With no keys the whole pipeline runs on the deterministic offline ' +
    'simulator. Add an OpenAI key to switch interview generation to a live LLM, and/or a ' +
    'Supabase anon key to sync the workspace to the cloud.',
  path: '/settings',
  isDone: (ws) =>
    Boolean(
      (ws.settings.openai.enabled && (ws.settings.openai.key || '')) ||
        (ws.settings.supabase.url && ws.settings.supabase.anonKey),
    ),
}

/** The first milestone not yet complete — drives the sidebar nudge dot. */
export function nextIncompleteStep(ws) {
  return SETUP_STEPS.find((s) => !s.done(ws)) ?? null
}

export function completedCount(ws) {
  return SETUP_STEPS.filter((s) => s.done(ws)).length
}
