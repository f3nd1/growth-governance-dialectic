import { useWorkspace } from '../store/dataStore'
import { HYPOTHESIS_IDS } from '../store/defaults'

// The same stacked bar renders two different quantities, and conflating them
// would imply an agreement the pipeline does not establish:
//   authored — the persona's stored weight profile, an INPUT the researcher set
//   coded    — the share of that participant's coded evidence, an OUTPUT of the
//              coding pass
// `kind` is required at every call site so neither can be mistaken for the other.
const KIND_LABEL = {
  authored: 'Authored profile',
  coded: 'Coded evidence',
}

/**
 * Mini stacked bar over WH1/WH2/WH3 (values sum to 1).
 * `kind` labels what the bar represents; `caption` also shows it on screen.
 */
export default function WeightBar({ weights, height = 14, kind, caption = false }) {
  const ws = useWorkspace()
  const title = HYPOTHESIS_IDS
    .map((id) => `${ws.hypotheses[id].short} ${(weights[id] * 100).toFixed(0)}%`)
    .join(' · ')
  const what = KIND_LABEL[kind] ?? 'Distribution'
  return (
    <>
      {caption && (
        <div className="small muted" style={{ marginBottom: 3 }}>{what}</div>
      )}
      <div
        role="img"
        aria-label={`${what}: ${title}`}
        title={`${what} — ${title}`}
        style={{
          display: 'flex',
          height,
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid var(--line)',
        }}
      >
        {HYPOTHESIS_IDS.map((id) => (
          <span
            key={id}
            style={{
              width: `${weights[id] * 100}%`,
              background: ws.hypotheses[id].color,
            }}
          />
        ))}
      </div>
    </>
  )
}
