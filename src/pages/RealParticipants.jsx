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
  const [editingId, setEditingId] = useState(null)
  const participants = ws.real.participants

  if (ws.mode !== 'real') {
    return (
      <>
        <PageHeader title="Participant Records" desc="Pseudonymised records for real, consented participants." />
        <ModeGate want="real" />
      </>
    )
  }

  const editing = participants.find((p) => p.id === editingId) ?? null
  const code = draft.participantCode.trim()
  const codeTaken = participants.some(
    (p) => p.id !== editingId && p.participantCode.toLowerCase() === code.toLowerCase(),
  )
  const canSave = code.length > 0 && !codeTaken

  function edit(p) {
    setEditingId(p.id)
    setDraft({
      participantCode: p.participantCode,
      group: p.group,
      roleDescriptor: p.roleDescriptor ?? '',
      tenureBand: p.tenureBand ?? '',
    })
  }

  function cancel() {
    setEditingId(null)
    setDraft(blank)
  }

  function save() {
    if (!canSave) return
    const patch = {
      participantCode: code,
      group: draft.group,
      roleDescriptor: draft.roleDescriptor.trim(),
      tenureBand: draft.tenureBand,
    }
    if (!editing) {
      // The record id is generated once and never derived from the code again:
      // transcripts and segments join on it, so it must survive a re-code.
      updateActive('participants', (list) => [
        ...list,
        { id: `real-${Date.now().toString(36)}-${list.length}`, ...patch, real: true, createdAt: new Date().toISOString() },
      ])
      cancel()
      return
    }
    updateActive('participants', (list) =>
      list.map((p) => (p.id === editing.id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)),
    )
    if (patch.participantCode !== editing.participantCode) {
      // personaName is a denormalised copy of the code carried on transcripts
      // and coded segments for display and export. The join is by personaId, so
      // nothing is orphaned — but the copies go stale unless they follow.
      updateActive('interviews', (list) =>
        list.map((iv) => (iv.personaId === editing.id ? { ...iv, personaName: patch.participantCode } : iv)),
      )
      updateActive('coding', (c) => ({
        ...c,
        segments: c.segments.map((s) =>
          s.personaId === editing.id ? { ...s, personaName: patch.participantCode } : s,
        ),
        overridesLog: c.overridesLog.map((o) =>
          o.persona === editing.participantCode ? { ...o, persona: patch.participantCode } : o,
        ),
      }))
    }
    cancel()
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
        <h2>{editing ? `Edit ${editing.participantCode}` : 'Add participant'}</h2>
        {editing && (
          <p className="small muted" style={{ marginTop: 0 }}>
            Editing an existing record. Changing the code updates the{' '}
            {ws.real.interviews.filter((iv) => iv.personaId === editing.id).length} transcript(s)
            and {ws.real.coding.segments.filter((sg) => sg.personaId === editing.id).length} coded
            segment(s) already attached to it — they are linked to the record itself, not to the
            code, so nothing is detached by a re-code.
          </p>
        )}
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
        <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: 0 }}>
          <button className="btn" onClick={save} disabled={!canSave}>
            {editing ? 'Save changes' : 'Add participant record'}
          </button>
          {editing && (
            <button className="btn secondary" onClick={cancel}>Cancel</button>
          )}
        </p>
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
                <tr key={p.id} style={p.id === editingId ? { background: '#fff9e6' } : {}}>
                  <td><strong>{p.participantCode}</strong></td>
                  <td>{STAKEHOLDER_GROUPS.find((g) => g.id === p.group)?.label ?? p.group}</td>
                  <td className="small">{p.roleDescriptor || '—'}</td>
                  <td className="small">{p.tenureBand || '—'}</td>
                  <td>{ws.real.interviews.filter((iv) => iv.personaId === p.id).length}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button
                      className="btn small secondary"
                      aria-label={`Edit ${p.participantCode}`}
                      onClick={() => edit(p)}
                    >
                      Edit
                    </button>{' '}
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
