import { useWorkspace } from '../store/dataStore'

// The tag beside every page title follows the workspace mode. In real mode it
// must not say "synthetic pilot" — that would mislabel confidential human data
// on every screen it appears on.
export default function PageHeader({ title, desc }) {
  const real = useWorkspace().mode === 'real'
  return (
    <>
      <h1>
        {title}{' '}
        <span className="stamp" style={real ? { color: '#6d1f1d', borderColor: '#6d1f1d' } : undefined}>
          {real ? 'Confidential · real data' : 'Synthetic pilot'}
        </span>
      </h1>
      {desc && <p className="page-desc">{desc}</p>}
    </>
  )
}
