// dataStore — single workspace state object with get/set/subscribe and a
// pluggable persistence backend. localStorage is always the cache/fallback;
// a remote backend (Supabase, Phase 7) can be attached on top.

import { useSyncExternalStore } from 'react'
import { defaultWorkspace } from './defaults'

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
  merged.meta = { ...base.meta, ...loaded.meta, synthetic: true }
  merged.settings = { ...base.settings, ...loaded.settings }
  // Instrument content saved by an earlier app version may predate seeding —
  // fall back to seeds when a section is empty (pages offer explicit
  // "restore defaults" for deliberate resets).
  // Fill in protocol keys added after a workspace was saved (e.g. scripts),
  // without discarding the user's own questions.
  merged.protocol = { ...base.protocol, ...merged.protocol }
  if (!merged.protocol?.questions?.length) merged.protocol = base.protocol
  if (!merged.codebook?.codes?.length) merged.codebook = base.codebook
  if (!merged.personas?.length) merged.personas = base.personas
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
        remoteBackend.save(state).catch(() => {
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
    meta: { ...next.meta, synthetic: true, updatedAt: new Date().toISOString() },
  }
  notify()
  persist()
}

/** Convenience: update one top-level slice. update('personas', (p) => [...]) */
export function update(key, fn) {
  setState((prev) => ({ ...prev, [key]: fn(prev[key]) }))
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
