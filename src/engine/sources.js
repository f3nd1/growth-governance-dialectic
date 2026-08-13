// Evidence-source helpers for REAL mode.
//
// Real fieldwork comprises three evidence types — individual interviews,
// moderated focus groups, and documentary sources. All three live in the same
// `real.interviews` collection, distinguished by `sourceType`, because every
// downstream reader (Transcripts, Coding, Pattern-Matching, the exports)
// already consumes that collection. Splitting it would have meant touching each
// of them to read two lists instead of one, for no analytic gain.
//
// The load-bearing convention: a SEGMENT's personaId is whoever said it.
//   interview    -> the interviewee's participant id
//   focus group  -> the SPEAKING participant's id, per turn
//   document     -> the document's own id, which matches no participant
// Attribution in patterns.js and the stakeholder rows therefore needs no
// special case: a focus-group turn lands in its speaker's row because the
// segment genuinely carries the speaker.

import {
  FOCUS_GROUPS,
  DOCUMENT_TYPES,
  SOURCE_TYPES,
  FOCUS_GROUP_ELIGIBILITY,
  UNDETERMINED_GROUP,
  STAKEHOLDER_GROUPS,
} from '../data/seeds'

export function stakeholderGroupLabel(id) {
  return STAKEHOLDER_GROUPS.find((g) => g.id === id)?.label ?? (id || '(no group)')
}

/**
 * Whether a participant's stakeholder group may attend a focus group.
 * Returns 'eligible' | 'ineligible' | 'undetermined' with the reason to show.
 * Never hides anyone: the picker greys, and an explicit override stays possible.
 */
export function attendeeEligibility(focusGroupId, group) {
  const label = stakeholderGroupLabel(group)
  if (group === UNDETERMINED_GROUP) {
    return { state: 'undetermined', reason: `${label} — spans groups, eligibility not determined` }
  }
  const allowed = FOCUS_GROUP_ELIGIBILITY[focusGroupId]
  if (allowed) {
    return allowed.includes(group)
      ? { state: 'eligible', reason: label }
      : { state: 'ineligible', reason: `${label} — not a member of this group` }
  }
  // No roster supplied for this group. The one fixed rule still applies.
  if (group === 'agent') {
    return { state: 'ineligible', reason: `${label} — external, not a member of an internal group` }
  }
  return { state: 'unspecified', reason: label }
}

/**
 * participantCode -> labels of the focus groups they are already saved into.
 * Read from the saved rosters so double-allocation is visible in the picker,
 * before a second session is entered rather than after.
 */
export function focusGroupAllocations(sessions) {
  const out = new Map()
  for (const s of sessions) {
    if (sourceTypeOf(s) !== 'focus-group') continue
    for (const c of s.participantCodes ?? []) {
      if (!out.has(c)) out.set(c, [])
      const label = focusGroupLabel(s.focusGroupId)
      if (!out.get(c).includes(label)) out.get(c).push(label)
    }
  }
  return out
}

/** True while a focus group's roster rule has not been supplied. */
export function rosterUnspecified(focusGroupId) {
  return !FOCUS_GROUP_ELIGIBILITY[focusGroupId]
}

export const SOURCE_TYPE_IDS = SOURCE_TYPES.map((t) => t.id)

export function sourceTypeOf(session) {
  return session?.sourceType ?? 'interview'
}

export function sourceTypeLabel(id) {
  return SOURCE_TYPES.find((t) => t.id === id)?.label ?? id
}

export function focusGroupLabel(id) {
  return FOCUS_GROUPS.find((g) => g.id === id)?.label ?? id
}

export function documentTypeLabel(id) {
  return DOCUMENT_TYPES.find((d) => d.id === id)?.label ?? id
}

/** Display name for a session in lists, chips and exports. */
export function sessionLabel(session) {
  const type = sourceTypeOf(session)
  if (type === 'focus-group') return focusGroupLabel(session.focusGroupId)
  if (type === 'document') return session.title || '(untitled document)'
  return session.personaName
}

/** Counts per evidence type: sessions/sources, distinct participants, segments. */
export function countsByType(sessions, segments) {
  const bySession = new Map(sessions.map((s) => [s.id, sourceTypeOf(s)]))
  return SOURCE_TYPE_IDS.map((id) => {
    const own = sessions.filter((s) => sourceTypeOf(s) === id)
    const people = new Set()
    for (const s of own) {
      if (id === 'focus-group') for (const c of s.participantCodes ?? []) people.add(c)
      else if (id === 'interview') people.add(s.personaName)
    }
    return {
      id,
      label: sourceTypeLabel(id),
      sessions: own.length,
      participants: people.size,
      segments: segments.filter((sg) => bySession.get(sg.interviewId) === id).length,
    }
  })
}

/** Segments belonging to one evidence type — the filter every split reads. */
export function segmentsOfType(sessions, segments, typeId) {
  if (!typeId || typeId === 'all') return segments
  const ids = new Set(sessions.filter((s) => sourceTypeOf(s) === typeId).map((s) => s.id))
  return segments.filter((s) => ids.has(s.interviewId))
}
