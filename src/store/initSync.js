// Attaches (or detaches) the Supabase remote backend based on current
// configuration. Called at startup and again whenever Settings change the
// Supabase credentials. localStorage always remains the cache/fallback.

import { attachRemoteBackend, getState, replaceWorkspace, hasLocalSave } from './dataStore'
import { createSupabaseBackend, supabaseConfigured } from './supabase'

export function initRemoteSync() {
  const settings = getState().settings
  if (!supabaseConfigured(settings)) {
    attachRemoteBackend(null)
    return
  }
  const backend = createSupabaseBackend(settings)
  attachRemoteBackend(backend)
  // Only adopt the remote copy when this browser has no local workspace yet —
  // otherwise local stays authoritative and syncs up on the next save.
  if (backend && !hasLocalSave()) {
    backend
      .load()
      .then((remote) => {
        if (remote) replaceWorkspace(remote)
      })
      .catch(() => {})
  }
}
