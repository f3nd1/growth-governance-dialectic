import { useSaveStatus } from '../store/dataStore'

const LABELS = { saved: 'Saved', saving: 'Saving…', error: 'Save failed' }

export default function SavePill() {
  const status = useSaveStatus()
  return (
    <span className={`save-pill ${status}`} role="status" aria-live="polite">
      <span className="dot" aria-hidden="true" />
      {LABELS[status]}
    </span>
  )
}
