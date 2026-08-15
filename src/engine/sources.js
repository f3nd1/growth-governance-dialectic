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
  STAKEHOLDER_GROUPS,
} from '../data/seeds'

export function stakeholderGroupLabel(id) {
  return STAKEHOLDER_GROUPS.find((g) => g.id === id)?.label ?? (id || '(no group)')
}

/**
 * Whether a participant's stakeholder group may attend a focus group.
 * Returns 'eligible' | 'ineligible' | 'unspecified' with the reason to show.
 * Never hides anyone: the picker greys, and an explicit override stays possible.
 */
export function attendeeEligibility(focusGroupId, group) {
  const label = stakeholderGroupLabel(group)
  const allowed = FOCUS_GROUP_ELIGIBILITY[focusGroupId]
  if (allowed) {
    return allowed.includes(group)
      ? { state: 'eligible', reason: label }
      : { state: 'ineligible', reason: `${label} — not a member of this group` }
  }
  // Defensive only: every focus group in FOCUS_GROUPS has a roster. An id with
  // none is a typo, and greying everyone off the back of it would be worse than
  // saying nothing.
  return { state: 'unspecified', reason: label }
}

/**
 * participantCode -> the focus-group ids they are already saved into, so
 * double-allocation is visible in the picker before a second session is entered
 * rather than after. Ids, not labels: the caller re-checks eligibility against
 * them, because attending two groups is expected for a participant eligible for
 * both and only a problem when they are not.
 */
export function focusGroupAllocations(sessions) {
  const out = new Map()
  for (const s of sessions) {
    if (sourceTypeOf(s) !== 'focus-group') continue
    for (const c of s.participantCodes ?? []) {
      if (!out.has(c)) out.set(c, [])
      if (!out.get(c).includes(s.focusGroupId)) out.get(c).push(s.focusGroupId)
    }
  }
  return out
}

/**
 * How to report a participant's other focus-group memberships in the picker:
 * expected when the mapping makes them eligible for both, unexpected otherwise.
 */
export function otherAllocations(allocations, code, currentId, group) {
  const others = (allocations.get(code) ?? []).filter((id) => id !== currentId)
  const eligibleHere = attendeeEligibility(currentId, group).state === 'eligible'
  return others.map((id) => ({
    id,
    label: focusGroupLabel(id),
    expected: eligibleHere && attendeeEligibility(id, group).state === 'eligible',
  }))
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
      plural: SOURCE_TYPES.find((t) => t.id === id)?.plural ?? sourceTypeLabel(id),
      sessions: own.length,
      participants: people.size,
      segments: segments.filter((sg) => bySession.get(sg.interviewId) === id).length,
    }
  })
}

/**
 * Which evidence types the corpus actually holds. Prose that names the
 * composition — what is collected, what the matrix rests on — must be built
 * from this rather than written down, because a sentence asserting "only the
 * interviews are populated" is true for exactly as long as nobody enters a
 * focus group, and then silently becomes a false claim in an export.
 *
 * `collected` is any session of that type. `populated` is any CODED segment:
 * an entered-but-uncoded source contributes nothing to the joint display, so
 * the two questions have different answers and both get asked.
 */
export function evidenceCoverage(sessions, segments) {
  const counts = countsByType(sessions, segments)
  return {
    collected: counts.filter((t) => t.sessions > 0),
    uncollected: counts.filter((t) => t.sessions === 0),
    populated: counts.filter((t) => t.segments > 0),
  }
}

/** "focus groups", "focus groups and documents", "a, b and c" — for prose. */
export function listTypes(types) {
  const names = types.map((t) => t.plural.toLowerCase())
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** For a derived list that lands at the start of a sentence. */
export function sentenceCase(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/** Segments belonging to one evidence type — the filter every split reads. */
export function segmentsOfType(sessions, segments, typeId) {
  if (!typeId || typeId === 'all') return segments
  const ids = new Set(sessions.filter((s) => sourceTypeOf(s) === typeId).map((s) => s.id))
  return segments.filter((s) => ids.has(s.interviewId))
}
