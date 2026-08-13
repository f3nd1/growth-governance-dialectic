// dataStore — single workspace state object with get/set/subscribe and a
// pluggable persistence backend. localStorage is always the cache/fallback;
// a remote backend (Supabase, Phase 7) can be attached on top.

import { useSyncExternalStore } from 'react'
import { defaultWorkspace, emptyRealDataset } from './defaults'
import { rqList, normaliseHeld } from '../data/seeds'

const STORAGE_KEY = 'ggd-workspace-v1'

// ---------------------------------------------------------------- backends

const localBackend = {
  name: 'localStorage',
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  },
}

let remoteBackend = null // set via attachRemoteBackend (Supabase adapter)

export function attachRemoteBackend(backend) {
  remoteBackend = backend
}

export function getRemoteBackend() {
  return remoteBackend
}

// ------------------------------------------------------------------ state

function mergeWithDefaults(loaded) {
  // Shallow-merge top-level keys so new phases can add keys without
  // clobbering an existing saved workspace.
  const base = defaultWorkspace()
  if (!loaded || typeof loaded !== 'object') return base
  const merged = { ...base, ...loaded }
  merged.mode = merged.mode === 'real' ? 'real' : 'synthetic'
  // The stamp is derived from the mode, never set by hand: synthetic while the
  // synthetic corpus is active, false once real participant data is.
  merged.meta = { ...base.meta, ...loaded.meta, synthetic: merged.mode !== 'real' }
  merged.settings = { ...base.settings, ...loaded.settings }
  // Instrument content saved by an earlier app version may predate seeding —
  // fall back to seeds when a section is empty (pages offer explicit
  // "restore defaults" for deliberate resets).
  // Fill in protocol keys added after a workspace was saved (e.g. scripts),
  // without discarding the user's own questions.
  merged.protocol = { ...base.protocol, ...merged.protocol }
  if (!merged.protocol?.questions?.length) merged.protocol = base.protocol
  // A question's `rq` was a single string before multi-mapping; widen the
  // legacy shape on load so no read site has to branch on it.
  merged.protocol = {
    ...merged.protocol,
    questions: merged.protocol.questions.map((q) => ({ ...q, rq: rqList(q.rq) })),
  }
  if (!merged.codebook?.codes?.length) merged.codebook = base.codebook
  if (!merged.personas?.length) merged.personas = base.personas
  // Real mode added later: back-fill so pre-existing synthetic workspaces load
  // unchanged and simply arrive in synthetic mode with an empty real dataset.
  merged.real = { ...emptyRealDataset(), ...(merged.real ?? {}) }
  // Focus groups and documents were added after individual interviews. A record
  // saved before that is an interview by definition, so it is labelled rather
  // than left ambiguous — no read path has to guess at a missing type.
  merged.real.interviews = merged.real.interviews.map((iv) => ({
    ...iv,
    sourceType: iv.sourceType ?? 'interview',
  }))
  // WH3 cannot coherently be held alongside WH1/WH2; drop it where a stored
  // persona has both, keeping the paradox signal.
  merged.personas = merged.personas.map((p) => ({ ...p, held: normaliseHeld(p.held) }))
  return merged
}

let state = mergeWithDefaults(localBackend.load())
const listeners = new Set()

// save status: 'saved' | 'saving' | 'error' — drives the header pill
let saveStatus = 'saved'
const statusListeners = new Set()
let saveTimer = null
let remoteTimer = null

function notify() {
  listeners.forEach((fn) => fn(state))
}

function setSaveStatus(next) {
  if (saveStatus === next) return
  saveStatus = next
  statusListeners.forEach((fn) => fn(saveStatus))
}

function persist() {
  setSaveStatus('saving')
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localBackend.save(state)
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
    if (remoteBackend) {
      clearTimeout(remoteTimer)
      remoteTimer = setTimeout(() => {
        // Real participant data is LOCAL ONLY. It is stripped here, at the single
        // point where anything leaves the browser, so no remote backend can ever
        // receive it regardless of how it was configured.
        const { real, ...syncable } = state
        remoteBackend.save({ ...syncable, real: emptyRealDataset() }).catch(() => {
          // remote failure is non-fatal — localStorage remains authoritative
        })
      }, 1200)
    }
  }, 350)
}

export function getState() {
  return state
}

export function hasLocalSave() {
  try {
    return localStorage.getItem(STORAGE_KEY) != null
  } catch {
    return false
  }
}

/**
 * setState(updater) — updater is either a partial object (shallow-merged at
 * top level) or a function (prev) => next full state.
 */
export function setState(updater) {
  const next =
    typeof updater === 'function' ? updater(state) : { ...state, ...updater }
  state = {
    ...next,
    meta: {
      ...next.meta,
      synthetic: next.mode !== 'real',
      updatedAt: new Date().toISOString(),
    },
  }
  notify()
  persist()
}

/** Convenience: update one top-level slice. update('personas', (p) => [...]) */
export function update(key, fn) {
  setState((prev) => ({ ...prev, [key]: fn(prev[key]) }))
}

/**
 * The active dataset for the current mode. EVERY analysis path reads records
 * through this — it returns one dataset or the other, never a union, so no view
 * can combine real and synthetic records.
 */
export function activeData(ws) {
  const real = ws.mode === 'real'
  return {
    isReal: real,
    participants: real ? ws.real.participants : ws.personas,
    interviews: real ? ws.real.interviews : ws.interviews,
    coding: real ? ws.real.coding : ws.coding,
    aiReviewLog: (real ? ws.real.aiReviewLog : ws.aiReviewLog) ?? [],
    codebookDecisions: (real ? ws.real.codebookDecisions : ws.codebookDecisions) ?? [],
  }
}

/** Write into whichever dataset is active, leaving the other untouched. */
export function updateActive(key, fn) {
  setState((prev) =>
    prev.mode === 'real'
      ? { ...prev, real: { ...prev.real, [key]: fn(prev.real[key]) } }
      : { ...prev, [key]: fn(prev[key]) },
  )
}

/**
 * Replace the whole real dataset in ONE state transition. Bulk import needs
 * participants, interviews and coded segments to land together or not at all;
 * three sequential updateActive calls would leave the workspace half-written if
 * the second threw. The batch is computed first and applied as a single commit,
 * so there is nothing to roll back. No-op outside real mode.
 */
export function updateRealBatch(fn) {
  setState((prev) => (prev.mode === 'real' ? { ...prev, real: fn(prev.real) } : prev))
}

export function setMode(mode) {
  setState((prev) => ({ ...prev, mode: mode === 'real' ? 'real' : 'synthetic' }))
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function replaceWorkspace(imported) {
  state = mergeWithDefaults(imported)
  notify()
  persist()
}

export function resetWorkspace() {
  state = defaultWorkspace()
  notify()
  persist()
}

// ------------------------------------------------------------- React hooks

export function useWorkspace() {
  return useSyncExternalStore(subscribe, getState)
}

export function useSaveStatus() {
  return useSyncExternalStore(
    (fn) => {
      statusListeners.add(fn)
      return () => statusListeners.delete(fn)
    },
    () => saveStatus,
  )
}
