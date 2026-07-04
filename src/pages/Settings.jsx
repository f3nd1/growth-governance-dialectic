import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useWorkspace, update } from '../store/dataStore'
import { liveModeAvailable } from '../engine/llm'
import { testSupabase, supabaseConfigured } from '../store/supabase'
import { initRemoteSync } from '../store/initSync'

const MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini']

export default function Settings() {
  const ws = useWorkspace()
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)

  const envOpenAI = Boolean(import.meta.env.VITE_OPENAI_KEY)
  const envSupabase = Boolean(import.meta.env.VITE_SUPABASE_URL)
  const live = liveModeAvailable(ws.settings)

  function setOpenAI(patch) {
    update('settings', (s) => ({ ...s, openai: { ...s.openai, ...patch } }))
  }

  function setSupabase(patch) {
    update('settings', (s) => ({ ...s, supabase: { ...s.supabase, ...patch } }))
  }

  async function runTest() {
    setTesting(true)
    setTestResult(null)
    try {
      setTestResult(await testSupabase(ws.settings))
    } finally {
      setTesting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Settings"
        desc="Keys are read from .env.local first, then from here (stored only in this browser). Nothing entered on this page is ever committed."
      />

      <section className="card">
        <h2>OpenAI (live generation)</h2>
        <p className="small">
          Status:{' '}
          {live ? (
            <strong style={{ color: '#2f9e44' }}>LIVE mode available</strong>
          ) : (
            <strong>OFFLINE — deterministic simulator (zero cost, fully functional)</strong>
          )}
          {envOpenAI && ' · key supplied via .env.local'}
        </p>
        <label style={{ display: 'block', margin: '10px 0' }}>
          <input
            type="checkbox"
            checked={ws.settings.openai.enabled}
            onChange={(e) => setOpenAI({ enabled: e.target.checked })}
          />{' '}
          Enable live AI (uses one LLM call per persona interview)
        </label>
        <div className="field">
          <label htmlFor="set-openai-key">
            API key {envOpenAI ? '(optional — env var takes precedence)' : ''}
          </label>
          <input
            id="set-openai-key"
            type="password"
            autoComplete="off"
            placeholder="sk-…"
            value={ws.settings.openai.key}
            onChange={(e) => setOpenAI({ key: e.target.value })}
          />
        </div>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="set-model-analysis">Analysis model (interview generation)</label>
            <select
              id="set-model-analysis"
              value={ws.settings.openai.analysisModel}
              onChange={(e) => setOpenAI({ analysisModel: e.target.value })}
            >
              {MODELS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="set-model-utility">Utility model (light tasks)</label>
            <select
              id="set-model-utility"
              value={ws.settings.openai.utilityModel}
              onChange={(e) => setOpenAI({ utilityModel: e.target.value })}
            >
              {MODELS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Supabase (workspace sync)</h2>
        <p className="small muted">
          Optional cloud persistence for the workspace state (table{' '}
          <code>workspace_state(id text pk, data jsonb, updated_at timestamptz)</code>).
          localStorage remains the cache and fallback. <strong>Anon/publishable key only —
          never a service_role key.</strong>
          {envSupabase && ' Credentials supplied via .env.local take precedence.'}
        </p>
        <div className="field">
          <label htmlFor="set-sb-url">Project URL</label>
          <input
            id="set-sb-url"
            type="text"
            placeholder="https://xyz.supabase.co"
            value={ws.settings.supabase.url}
            onChange={(e) => setSupabase({ url: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="set-sb-key">Anon / publishable key</label>
          <input
            id="set-sb-key"
            type="password"
            autoComplete="off"
            value={ws.settings.supabase.anonKey}
            onChange={(e) => setSupabase({ anonKey: e.target.value })}
          />
        </div>
        <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => { initRemoteSync(); setTestResult({ ok: true, message: 'Sync re-initialised with current credentials.' }) }} disabled={!supabaseConfigured(ws.settings)}>
            Save &amp; activate
          </button>
          <button className="btn secondary" onClick={runTest} disabled={testing || !supabaseConfigured(ws.settings)}>
            {testing ? 'Testing…' : 'Test connection'}
          </button>
          <button
            className="btn danger"
            onClick={() => { setSupabase({ url: '', anonKey: '' }); initRemoteSync(); setTestResult(null) }}
          >
            Clear
          </button>
        </p>
        {testResult && (
          <p className="small" style={{ color: testResult.ok ? '#2f9e44' : '#b03230' }} role="status">
            {testResult.message}
          </p>
        )}
      </section>

      <section className="card">
        <h2>Interface</h2>
        <label style={{ display: 'block', margin: '6px 0' }}>
          <input
            type="checkbox"
            checked={ws.settings.developer}
            onChange={(e) => update('settings', (s) => ({ ...s, developer: e.target.checked }))}
          />{' '}
          Developer mode — show latest commit footer and dev-only details
        </label>
        <label style={{ display: 'block', margin: '6px 0' }}>
          <input
            type="checkbox"
            checked={ws.settings.guidance}
            onChange={(e) => update('settings', (s) => ({ ...s, guidance: e.target.checked }))}
          />{' '}
          Guidance notes — show the methodological explainer boxes on each page
        </label>
      </section>
    </>
  )
}
