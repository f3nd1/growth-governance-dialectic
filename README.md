# governance-growth-dialectic

**A doctoral research INSTRUMENT — not a source of findings.**

This app is a **synthetic-participant pilot pipeline** for a mixed-methods
doctoral study on the growth-vs-governance dialectic in an SME private
education institution. It exists to **validate the data-collection and
analysis method** (interview protocol, a priori codebook, dual independent
coding, reliability statistics, pattern-matching joint display) on
clearly-labelled **SYNTHETIC** participants, **before** real fieldwork and
**pending advisor and IRB approval**.

Synthetic data cannot substitute for real stakeholder accounts. **No output
of this app is a real finding about the institution.** Every screen, card,
transcript, coded segment and export is stamped SYNTHETIC, and the caveat in
exports cannot be toggled off.

## Run it

```bash
git pull && npm run dev
```

That's it — standard Vite dev server, everything on `main`, no build step
needed for development. (First time: `npm install` once.)

## Environment / secrets

Copy the example env file and fill in what you have:

```bash
cp .env.local.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `VITE_OPENAI_KEY` | Optional. Switches persona/interview generation to live LLM calls. |
| `VITE_SUPABASE_URL` | Optional. Enables cloud sync of the workspace state. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Optional. Anon/publishable key ONLY — never `service_role`. |

`.env.local` is gitignored. Never commit keys. Keys can also be entered on
the Settings page (stored locally in your browser); env vars take precedence.

### Supabase table (optional sync)

If you enable Supabase sync, create the table once:

```sql
create table workspace_state (
  id text primary key,
  data jsonb,
  updated_at timestamptz
);
```

Grant the anon role access via your RLS policy of choice (the pilot stores a
single row with id `'default'`). The app never needs — and must never be
given — a `service_role` key.

## Offline vs live modes

- **Offline (default, zero cost):** with no OpenAI key the entire pipeline
  runs on a deterministic rule-based simulator — persona answers are
  generated from the persona's WH1/WH2/WH3 weight profile and a seed, so the
  whole instrument is testable end-to-end for free and reproducibly.
- **Live:** with a key and "Enable live AI" switched on in Settings,
  interview generation uses one LLM call per persona. The AI Calibration
  page compares offline vs live output for the same persona.

## The three working hypotheses

Framed as **rival working propositions** (not statistical H0/H1):

- **WH1** — governance NEGATIVELY affects business pursuits
- **WH2** — governance POSITIVELY affects business pursuits
- **WH3** — no discernible effect

A synthetic persona can genuinely hold two at once (paradox marker ⚡);
the instrument surfacing that coexistence is a design goal of the pilot.

## Change log workflow

After each commit, record it:

```bash
npm run log-change -- "commit message" "one-line summary" [push|pull]
```

This reads the latest commit hash/branch and prepends an entry to
`src/data/changelog.json`, which the in-app Change Log page renders.
Commit the changelog update (or amend it into the commit it describes).

## Stack

Vite + React (JavaScript), React Router, plain CSS. Workspace state is a
single object persisted to localStorage; optional Supabase sync
(`workspace_state` table) with localStorage as cache/fallback.
