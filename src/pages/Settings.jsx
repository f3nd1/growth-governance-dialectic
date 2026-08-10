import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { useWorkspace, update, setMode } from '../store/dataStore'
import { liveModeAvailable, listChatModels } from '../engine/llm'
import { testSupabase, supabaseConfigured } from '../store/supabase'
import { initRemoteSync } from '../store/initSync'
import { loadDemoData, resetToEmpty, workspaceMode, MODE_LABELS } from '../engine/demo'
import { DEFAULT_SPLIT_THRESHOLD } from '../engine/patterns'

const MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini']

export default function Settings() {
  const ws = useWorkspace()
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)
  const [demoMsg, setDemoMsg] = useState('')
  const [modelOptions, setModelOptions] = useState(MODELS)
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const splitThreshold = ws.settings.patternMatching?.splitThreshold ?? DEFAULT_SPLIT_THRESHOLD

  async function fetchModels() {
    setFetching(true)
    setFetchError('')
    try {
      setModelOptions(await listChatModels(ws.settings))
    } catch (err) {
      setModelOptions(MODELS) // fallback to the hardcoded list
      setFetchError(String(err.message ?? err))
    } finally {
      setFetching(false)
    }
  }

  // Keep the currently-selected model selectable even if it's not in the list.
  const optionsWith = (current) =>
    modelOptions.includes(current) ? modelOptions : [current, ...modelOptions]

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
        <h2>Workspace mode</h2>
        <p className="small">
          Current mode:{' '}
          <strong>{ws.mode === 'real' ? 'REAL PARTICIPANT DATA' : 'Synthetic pilot'}</strong>
        </p>
        <p className="small muted">
          The two datasets are stored separately and are never combined: switching swaps
          which one the whole analysis pipeline reads. Synthetic records and real records
          cannot appear in the same tally, chart, kappa figure or export. Real participant
          data is held in this browser only and is never sent to Supabase, even when
          Supabase is configured.
        </p>
        <p className="small muted">
          Synthetic: {ws.personas.length} personas · {ws.interviews.length} interviews ·{' '}
          {ws.coding.segments.length} segments — Real: {ws.real.participants.length} participants ·{' '}
          {ws.real.interviews.length} interviews · {ws.real.coding.segments.length} segments
        </p>
        <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn secondary"
            disabled={ws.mode === 'synthetic'}
            onClick={() => {
              if (window.confirm('Switch to SYNTHETIC mode? The analysis pipeline will read the synthetic dataset. Real participant records are kept, untouched, and hidden until you switch back.')) {
                setMode('synthetic')
              }
            }}
          >
            Use synthetic mode
          </button>
          <button
            className="btn danger"
            disabled={ws.mode === 'real'}
            onClick={() => {
              if (window.confirm('Switch to REAL PARTICIPANT DATA mode?\n\nThis is for confidential data from consented participants, entered by hand — nothing is generated. The banner and every export change to a confidentiality treatment and the synthetic caveat is removed. Real data stays in this browser and is never synced to Supabase.\n\nOnly proceed with advisor and IRB approval in place.')) {
                setMode('real')
              }
            }}
          >
            Switch to real data mode
          </button>
        </p>
      </section>

      {ws.mode !== 'real' && (
      <section className="card">
        <h2>Demo data</h2>
        <p className="small">
          Current workspace: <strong>{MODE_LABELS[workspaceMode(ws)]}</strong>
        </p>
        <p className="small muted">
          “Load demo data” populates the entire pipeline — 13 synthetic personas, a full
          run-all interview pass at a fixed seed, complete dual-coding, reliability and
          pattern-matching — so you can explore end-to-end at once. It is deterministic:
          loading twice produces the identical state (72 coded segments, κ≈0.88 Strong,
          a split pattern on the paradox persona). Everything loaded is stamped SYNTHETIC,
          exactly like data you create yourself.
        </p>
        <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => { loadDemoData(); setDemoMsg('Demo data loaded — the whole pipeline is now populated.') }}>
            Load demo data
          </button>
          <button
            className="btn danger"
            onClick={() => {
              if (window.confirm('Reset to an empty instrument? This permanently clears all interviews, transcripts, codings, reliability and pattern-matching results. Protocol, codebook and persona definitions remain. This cannot be undone.')) {
                resetToEmpty()
                setDemoMsg('Workspace reset to an empty instrument.')
              }
            }}
          >
            Reset to empty
          </button>
        </p>
        {demoMsg && <p className="small" role="status" style={{ color: '#2f9e44' }}>{demoMsg}</p>}
      </section>
      )}

      <section className="card">
        <h2>OpenAI{ws.mode === 'real' ? '' : ' (live generation)'}</h2>

        {ws.mode === 'real' && (
          <div className="notice" role="note" style={{ borderLeftColor: '#6d1f1d', fontWeight: 700 }}>
            <p style={{ margin: '0 0 6px' }}>
              A key here enables the coder-disagreement diagnostic on the{' '}
              <Link to="/analysis/coding">Coding</Link> page. Running it{' '}
              <strong>transmits real participant answer text to OpenAI</strong>, where it is
              processed on their servers under their terms and retention policy. The diagnostic
              asks you to confirm that every single time.
            </p>
            <p className="small" style={{ margin: 0, fontWeight: 400 }}>
              Nothing else in real mode sends participant data anywhere: transcripts are typed
              in, coded and stored locally, and the real dataset is never synced. Fetching the
              model list below sends your key but no participant data. Only add a key if
              sending interview material to a third party is permitted by your ethics approval
              and participant consent — and note that a key typed here is stored in this
              browser and is readable by anyone with access to it, so prefer{' '}
              <code>VITE_OPENAI_KEY</code> in <code>.env.local</code> where you can.
            </p>
          </div>
        )}
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
          {ws.mode === 'real'
            ? 'Enable live AI (required for the coder-disagreement diagnostic)'
            : 'Enable live AI (uses one LLM call per persona interview)'}
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
        <p style={{ margin: '0 0 12px' }}>
          <button className="btn secondary" onClick={fetchModels} disabled={fetching}>
            {fetching ? 'Fetching…' : 'Fetch available models'}
          </button>
          {fetchError ? (
            <span className="small" role="status" style={{ marginLeft: 8, color: '#b03230' }}>
              {fetchError} Using built-in list.
            </span>
          ) : (
            modelOptions !== MODELS && (
              <span className="small muted" style={{ marginLeft: 8 }}>
                {modelOptions.length} models fetched.
              </span>
            )
          )}
        </p>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="set-model-analysis">Analysis model (interview generation)</label>
            <select
              id="set-model-analysis"
              value={ws.settings.openai.analysisModel}
              onChange={(e) => setOpenAI({ analysisModel: e.target.value })}
            >
              {optionsWith(ws.settings.openai.analysisModel).map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="set-model-utility">Utility model (light tasks)</label>
            <select
              id="set-model-utility"
              value={ws.settings.openai.utilityModel}
              onChange={(e) => setOpenAI({ utilityModel: e.target.value })}
            >
              {optionsWith(ws.settings.openai.utilityModel).map((m) => <option key={m}>{m}</option>)}
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
        <h2>Pattern-matching</h2>
        <p className="small muted">
          A participant counts as supporting a proposition once that proposition reaches this
          share of their hypothesis-relevant coded evidence. Two or more supported propositions
          are reported as a <strong>split (paradox) pattern</strong>.
        </p>
        <div className="field" style={{ maxWidth: 260 }}>
          <label htmlFor="set-split-threshold">Split-pattern cut-point (evidence share)</label>
          <input
            id="set-split-threshold"
            type="number" min="0.05" max="0.95" step="0.01"
            value={splitThreshold}
            onChange={(e) =>
              update('settings', (s) => ({
                ...s,
                patternMatching: { ...(s.patternMatching ?? {}), splitThreshold: Number(e.target.value) },
              }))
            }
          />
        </div>
        {(splitThreshold <= 0 || splitThreshold >= 1) && (
          <p className="small" role="alert" style={{ color: '#b03230' }}>
            Must be between 0 and 1.
          </p>
        )}
        {splitThreshold <= 1 / 3 + 0.0005 && (
          <p className="small muted">
            At or below 0.333 — the even-spread point across three propositions — so a
            participant whose evidence is evenly distributed is reported as supporting all
            three. The test is “share at or above the cut-point”, so an exactly even
            participant still meets 0.333; use a value strictly above it to exclude them.
          </p>
        )}
        <div className="field">
          <label htmlFor="set-split-note">Justification note (carried into the Pilot Report)</label>
          <textarea
            id="set-split-note"
            rows={5}
            value={ws.settings.patternMatching?.note ?? ''}
            onChange={(e) =>
              update('settings', (s) => ({
                ...s,
                patternMatching: { ...(s.patternMatching ?? {}), note: e.target.value },
              }))
            }
          />
        </div>
        <p>
          <button
            className="btn small secondary"
            onClick={() =>
              update('settings', (s) => ({
                ...s,
                patternMatching: { ...(s.patternMatching ?? {}), splitThreshold: DEFAULT_SPLIT_THRESHOLD },
              }))
            }
          >
            Restore default ({DEFAULT_SPLIT_THRESHOLD})
          </button>
        </p>
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
        <p style={{ marginTop: 12 }}>
          <button
            className="btn secondary"
            onClick={() =>
              update('settings', (s) => ({
                ...s,
                setupGuide: { ...(s.setupGuide ?? {}), dismissed: false },
              }))
            }
          >
            Run setup guide again
          </button>
          <span className="small muted" style={{ marginLeft: 8 }}>
            Re-expands the guided checklist on Home. Progress is derived from your data, so
            already-completed steps stay ticked.
          </span>
        </p>
      </section>
    </>
  )
}
