import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import ModeGate from '../components/ModeGate'
import { useWorkspace, updateActive } from '../store/dataStore'
import { STAKEHOLDER_GROUPS } from '../data/seeds'

// Bands, not dates — a precise start date is re-identifying in a single small
// institution where most roles are held by one person.
export const TENURE_BANDS = [
  'under 1 year',
  '1–3 years',
  '3–5 years',
  '5–10 years',
  'over 10 years',
]

/**
 * A participant code is a pseudonym: short, no spaces, no natural-language
 * name. Anything that reads like a person's name is flagged — a warning, never
 * a block, because the researcher may have a coding scheme we cannot predict
 * and refusing to save would just push the note somewhere unlogged.
 */
export function looksLikeName(code) {
  const v = (code ?? '').trim()
  if (!v) return false
  if (/\s/.test(v)) return true // "Jane Tan"
  if (v.length > 12) return true
  // A run of 4+ letters with no digit is prose, not a code: P01, INT-04, SL2 pass.
  return /^[A-Za-z]{4,}$/.test(v)
}

const blank = { participantCode: '', group: 'senior-leader', roleDescriptor: '', tenureBand: '' }

export default function RealParticipants() {
  const ws = useWorkspace()
  const [draft, setDraft] = useState(blank)
  const participants = ws.real.participants

  if (ws.mode !== 'real') {
    return (
      <>
        <PageHeader title="Participant Records" desc="Pseudonymised records for real, consented participants." />
        <ModeGate want="real" />
      </>
    )
  }

  const codeTaken = participants.some(
    (p) => p.participantCode.toLowerCase() === draft.participantCode.trim().toLowerCase(),
  )
  const canAdd = draft.participantCode.trim().length > 0 && !codeTaken

  function add() {
    if (!canAdd) return
    updateActive('participants', (list) => [
      ...list,
      {
        id: `real-${draft.participantCode.trim().toLowerCase()}-${list.length}`,
        participantCode: draft.participantCode.trim(),
        group: draft.group,
        roleDescriptor: draft.roleDescriptor.trim(),
        tenureBand: draft.tenureBand,
        real: true,
        createdAt: new Date().toISOString(),
      },
    ])
    setDraft(blank)
  }

  function remove(p) {
    const owned = ws.real.interviews.filter((iv) => iv.personaId === p.id).length
    if (
      !window.confirm(
        `Delete participant ${p.participantCode}?` +
          (owned ? `\n\nThis also deletes ${owned} entered transcript(s) and their coded segments.` : '') +
          '\n\nThis cannot be undone.',
      )
    ) {
      return
    }
    const ivIds = new Set(ws.real.interviews.filter((iv) => iv.personaId === p.id).map((iv) => iv.id))
    updateActive('participants', (list) => list.filter((x) => x.id !== p.id))
    updateActive('interviews', (list) => list.filter((iv) => !ivIds.has(iv.id)))
    updateActive('coding', (c) => ({
      ...c,
      segments: c.segments.filter((s) => !ivIds.has(s.interviewId)),
    }))
  }

  return (
    <>
      <PageHeader
        title="Participant Records"
        desc="Pseudonymised records for real, consented participants. There is no name field, no weight profile and no held-proposition field — a real participant's position is something the coding determines from what they said, never something you assert in advance."
      />

      <div className="notice" role="note">
        <strong>Confidential.</strong> These records stay in this browser's local storage. They
        are excluded from any remote sync, and consent forms, contact details and signed
        paperwork belong in your approved secure store — not in this tool.
      </div>

      <section className="card">
        <h2>Add participant</h2>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="rp-code">Participant code (required)</label>
            <input
              id="rp-code"
              type="text"
              value={draft.participantCode}
              placeholder="P01"
              onChange={(e) => setDraft({ ...draft, participantCode: e.target.value })}
            />
            {looksLikeName(draft.participantCode) && (
              <p className="small" style={{ color: '#b03230', margin: '4px 0 0' }}>
                This looks like a personal name rather than a code. Use a pseudonymous
                identifier (P01, INT-04) — you can still save, but names should live only in
                your separate, secured code-to-identity key.
              </p>
            )}
            {codeTaken && (
              <p className="small" style={{ color: '#b03230', margin: '4px 0 0' }}>
                That code is already used.
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="rp-group">Stakeholder group</label>
            <select
              id="rp-group"
              value={draft.group}
              onChange={(e) => setDraft({ ...draft, group: e.target.value })}
            >
              {STAKEHOLDER_GROUPS.map((g) => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rp-role">Role descriptor (optional, non-identifying)</label>
            <input
              id="rp-role"
              type="text"
              value={draft.roleDescriptor}
              placeholder="programme administration"
              onChange={(e) => setDraft({ ...draft, roleDescriptor: e.target.value })}
            />
            <p className="small muted" style={{ margin: '4px 0 0' }}>
              Describe the function, not the post. In a single small institution a unique job
              title identifies the person as surely as their name does.
            </p>
          </div>
          <div className="field">
            <label htmlFor="rp-tenure">Tenure band (optional)</label>
            <select
              id="rp-tenure"
              value={draft.tenureBand}
              onChange={(e) => setDraft({ ...draft, tenureBand: e.target.value })}
            >
              <option value="">— not recorded —</option>
              {TENURE_BANDS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn" onClick={add} disabled={!canAdd}>
          Add participant record
        </button>
      </section>

      <section className="card" style={{ overflowX: 'auto' }}>
        <h2>Participants ({participants.length})</h2>
        {participants.length === 0 ? (
          <p className="muted">No participant records yet.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Code</th>
                <th>Group</th>
                <th>Role descriptor</th>
                <th>Tenure</th>
                <th>Transcripts</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.participantCode}</strong></td>
                  <td>{STAKEHOLDER_GROUPS.find((g) => g.id === p.group)?.label ?? p.group}</td>
                  <td className="small">{p.roleDescriptor || '—'}</td>
                  <td className="small">{p.tenureBand || '—'}</td>
                  <td>{ws.real.interviews.filter((iv) => iv.personaId === p.id).length}</td>
                  <td>
                    <button className="btn small danger" onClick={() => remove(p)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
