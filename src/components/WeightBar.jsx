import { useWorkspace } from '../store/dataStore'
import { HYPOTHESIS_IDS } from '../store/defaults'

/** Mini stacked bar for a WH1/WH2/WH3 weight profile (weights sum to 1). */
export default function WeightBar({ weights, height = 14 }) {
  const ws = useWorkspace()
  const title = HYPOTHESIS_IDS
    .map((id) => `${ws.hypotheses[id].short} ${(weights[id] * 100).toFixed(0)}%`)
    .join(' · ')
  return (
    <div
      role="img"
      aria-label={`Weight profile: ${title}`}
      title={title}
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
  )
}
