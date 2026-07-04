// Minimal Supabase REST adapter for the dataStore's remote backend.
// Table: workspace_state(id text primary key, data jsonb, updated_at timestamptz)
// Credentials: env first (.env.local), Settings second. Anon/publishable key
// only — never a service_role key. localStorage remains the cache/fallback.

const ROW_ID = 'default'

export function getSupabaseConfig(settings) {
  const url = import.meta.env.VITE_SUPABASE_URL || settings?.supabase?.url || ''
  const anonKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || settings?.supabase?.anonKey || ''
  return { url: url.replace(/\/$/, ''), anonKey }
}

export function supabaseConfigured(settings) {
  const { url, anonKey } = getSupabaseConfig(settings)
  return Boolean(url && anonKey)
}

function headers(anonKey) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
  }
}

export function createSupabaseBackend(settings) {
  const { url, anonKey } = getSupabaseConfig(settings)
  if (!url || !anonKey) return null
  const endpoint = `${url}/rest/v1/workspace_state`
  return {
    name: 'supabase',
    async load() {
      const res = await fetch(`${endpoint}?id=eq.${ROW_ID}&select=data`, {
        headers: headers(anonKey),
      })
      if (!res.ok) throw new Error(`Supabase load failed (${res.status})`)
      const rows = await res.json()
      return rows[0]?.data ?? null
    },
    async save(state) {
      const res = await fetch(`${endpoint}?on_conflict=id`, {
        method: 'POST',
        headers: {
          ...headers(anonKey),
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          id: ROW_ID,
          data: state,
          updated_at: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error(`Supabase save failed (${res.status})`)
    },
  }
}

/** Settings-page connection test. Returns {ok, message}. */
export async function testSupabase(settings) {
  const backend = createSupabaseBackend(settings)
  if (!backend) return { ok: false, message: 'URL and anon key are both required.' }
  try {
    await backend.load()
    return { ok: true, message: 'Connected — workspace_state table reachable.' }
  } catch (err) {
    return { ok: false, message: `${err.message}. Check the table exists and RLS allows the anon role.` }
  }
}
