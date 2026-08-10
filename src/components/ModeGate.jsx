import { Link } from 'react-router-dom'

/**
 * Pages that belong to exactly one workspace mode render this instead of their
 * content when the workspace is in the other mode. It is a UI courtesy only —
 * the real separation is that every read goes through activeData() and every
 * write through updateActive(), so neither dataset can see the other.
 */
export default function ModeGate({ want }) {
  const real = want === 'real'
  return (
    <div className="card muted">
      <p style={{ marginTop: 0 }}>
        This page belongs to{' '}
        <strong>{real ? 'REAL PARTICIPANT DATA mode' : 'synthetic pilot mode'}</strong>, and the
        workspace is currently in {real ? 'synthetic' : 'real'} mode.
      </p>
      <p style={{ marginBottom: 0 }}>
        {real
          ? 'Nothing here generates data — real records are only ever typed in by hand.'
          : 'Persona generation and the simulator are disabled in real mode by design.'}{' '}
        Change mode in <Link to="/settings">Settings</Link>.
      </p>
    </div>
  )
}
