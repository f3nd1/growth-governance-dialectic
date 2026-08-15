// The Chapter 3 pattern-matching matrix (Table 2): expected evidence for each
// evidence type under each rival proposition. Shared by the Joint Display page,
// the heatmap chart and the Chapter-3 appendix export so they cannot diverge.
//
// `populatedBy` marks which synthetic segments fill a row:
//   'internal' -> interviews with internal staff (all groups except agent/investor)
//   'external' -> interviews with investors and agents
//   null       -> real-data-phase placeholder (not produced by this pilot)

export const EXTERNAL_GROUPS = ['agent', 'investor']


// ---------------------------------------------------------------- real mode
//
// Chapter 3 moved to interviews-only, and its Table 2 is organised by
// STAKEHOLDER GROUP rather than by evidence type. Real mode therefore uses a
// different row set entirely: five groups, no "not yet collected" placeholders,
// because the design no longer collects documents or focus groups.
//
// Synthetic mode keeps JOINT_DISPLAY_ROWS above unchanged — it is validating a
// different, earlier version of the instrument and its exports are frozen.
//
// EXPECTED-EVIDENCE WORDING IS A DERIVED DRAFT. It specialises the old internal
// and external interview rows to each group; it is NOT transcribed from the
// chapter's Table 2, which the app has never held. Replace it with the
// chapter's own wording. It is not editable in-app — see the note on the Joint
// Display page.
export const REAL_JOINT_DISPLAY_ROWS = [
  {
    id: 'board-shareholders',
    label: 'Board and shareholders',
    groups: ['shareholder'],
    expected: {
      wh1: 'Governance obligations are described as a cost against capital: compliance spend, approval cycles or audit readiness delaying commercial moves the board wanted.',
      wh2: 'Governance standing is described as what made the institution fundable and defensible — certification and controls as the basis of confidence and continued backing.',
      wh3: 'Returns and growth are attributed to market conditions, price or management execution, with governance treated as a licence-to-operate cost unrelated to performance.',
    },
  },
  {
    id: 'leadership',
    label: 'Senior and academic leadership',
    groups: ['senior-leader', 'academic'],
    expected: {
      wh1: 'Leaders recount approvals, evidence requirements and board or regulator cycles deferring launches, intakes or programme decisions.',
      wh2: 'Leaders credit documented process, academic controls and accreditation with better-evidenced decisions and with growth the institution could sustain.',
      wh3: 'Leaders frame governance as a compliance track running parallel to commercial strategy, with outcomes driven by demand and competition.',
    },
  },
  {
    id: 'teaching-support',
    label: 'Teaching and support staff',
    groups: ['teacher', 'support'],
    expected: {
      wh1: 'Staff describe documentation, moderation and approval steps consuming time that would otherwise go to teaching, students or recruitment.',
      wh2: 'Staff describe consistent procedure and records as what keeps quality and student handling stable as volume grows.',
      wh3: 'Staff report governance as something handled elsewhere, visible only as paperwork, with no perceived bearing on business results.',
    },
  },
  {
    id: 'ph-operations',
    label: 'Philippines operations team',
    groups: ['ph-ops'],
    expected: {
      wh1: 'The offshore team describes controls arriving as requirements to implement — manual approvals, access rules and evidence — slowing delivery.',
      wh2: 'The offshore team describes standardised workflow and clear requirements as what let operations absorb higher volume without loss of control.',
      wh3: 'The offshore team sees governance as an instruction from the Singapore entity, disconnected from the commercial outcome it supports.',
    },
  },
  {
    id: 'external-agents',
    label: 'External recruitment agents',
    groups: ['agent'],
    expected: {
      wh1: 'Agents cite document checks and internal approvals slowing applications, costing enrolments to faster competitors.',
      wh2: 'Agents cite registration and accreditation as what they rely on to place students and as the basis of a durable relationship.',
      wh3: 'Agents treat governance as the institution\'s internal affair, with enrolment driven by fees, programme fit and responsiveness.',
    },
  },
]

// Appended after the five stakeholder rows. Documents have no speaker, so they
// cannot sit in a person's row; they are evidence of what the organisation
// RECORDED rather than what anyone said, which is a different kind of claim and
// belongs on its own line.
//
// EXPECTED-EVIDENCE WORDING IS A DERIVED DRAFT, like the five rows above — this
// app has never held Chapter 3's Table 2 text for a documentary row.
export const DOCUMENTARY_ROW = {
  id: 'documentary-evidence',
  label: 'Documentary evidence',
  groups: [],
  document: true,
  expected: {
    wh1: 'Minutes, audit findings and policy records show approvals, audit cycles or certification requirements deferring or reshaping commercial decisions.',
    wh2: 'Certification correspondence, strategic plans and board records tie governance standing to expansion, investment or partner confidence.',
    wh3: 'The documentary record shows governance and commercial activity proceeding on separate tracks, with outcomes recorded against market or operational causes.',
  },
}

/** group id -> real row id. The single place membership is decided. */
const GROUP_TO_REAL_ROW = new Map(
  REAL_JOINT_DISPLAY_ROWS.flatMap((r) => r.groups.map((g) => [g, r.id])),
)

/**
 * Participant groups the five chapter rows do not cover.
 *
 * JUDGEMENT CALL, deliberately not resolved here: "multi-role" is a real option
 * in the participant dropdown and belongs to no single row — a participant who
 * is both a shareholder and a recruiting principal genuinely sits in two. The
 * app reports them rather than assigning them, because assigning them would be
 * inventing a membership the researcher never stated.
 */
export function unmappedParticipants(participants) {
  return (participants ?? []).filter((p) => !GROUP_TO_REAL_ROW.has(p.group))
}

/**
 * How much of the participant roster the five stakeholder rows actually cover.
 *
 * The Joint Display and Pattern-Matching run over the same corpus but not the
 * same denominator: a participant whose group maps to no row is excluded from
 * every row of the matrix while still counting in the aggregate. Both pages
 * and the exports state this from here, so the two numbers are never presented
 * side by side without the gap between them being visible.
 */
export function rowCoverage(participants) {
  const all = participants ?? []
  const unmapped = unmappedParticipants(all)
  return { total: all.length, mapped: all.length - unmapped.length, unmapped }
}

export function realRowForGroup(group) {
  return GROUP_TO_REAL_ROW.get(group) ?? null
}

/** The row set for a mode. Real mode is stakeholder groups; synthetic is
 *  evidence types, unchanged. */
export function rowsForMode(mode) {
  return mode === 'real'
    ? [...REAL_JOINT_DISPLAY_ROWS, DOCUMENTARY_ROW]
    : JOINT_DISPLAY_ROWS
}

/**
 * Which matrix rows are shown, per workspace mode. The two modes
 * keep independent sets: a synthetic pilot legitimately wants all four rows to
 * show what the instrument does and does not cover, while real fieldwork that
 * has only collected interviews wants the uncollected rows out of the way.
 *
 * Stored as an id -> false map of EXCLUSIONS, so a row is enabled unless it has
 * been explicitly turned off. That keeps existing workspaces unchanged and
 * means a row added to JOINT_DISPLAY_ROWS later appears rather than silently
 * hiding. Rows are never deleted — a hidden row keeps its expected-evidence
 * text and comes back intact.
 */
export function jointRowsEnabled(settings, mode) {
  return settings?.jointDisplay?.rows?.[mode === 'real' ? 'real' : 'synthetic'] ?? {}
}

export function isJointRowEnabled(settings, mode, id) {
  return jointRowsEnabled(settings, mode)[id] !== false
}

export function visibleJointRows(settings, mode) {
  return rowsForMode(mode).filter((r) => isJointRowEnabled(settings, mode, r.id))
}

export const JOINT_DISPLAY_ROWS = [
  {
    id: 'documents',
    label: 'Documents',
    populatedBy: null,
    placeholderLabel: 'real-data phase',
    expected: {
      wh1: 'Governance/compliance records, minutes and financial records show approvals, audits or board cycles delaying or reshaping commercial decisions.',
      wh2: 'Registration, accreditation and audit records coincide with expansion moves and partner/investor confidence.',
      wh3: 'The documentary record shows governance and business activity proceeding on separate tracks.',
    },
  },
  {
    id: 'internal-interviews',
    label: 'Internal interviews',
    populatedBy: 'internal',
    expected: {
      wh1: 'Internal staff recount resource diversion, bureaucracy and delayed/blocked decisions.',
      wh2: 'Internal staff recount stability, trust signalling and governance-enabled wins.',
      wh3: 'Internal staff perceive governance as a separate function; outcomes attributed externally.',
    },
  },
  {
    id: 'external-interviews',
    label: 'External interviews (investors, agents)',
    populatedBy: 'external',
    expected: {
      wh1: 'Investors/agents cite governance burden or slowness as a drag on the institution’s growth.',
      wh2: 'Investors/agents credit governance maturity and certification as the basis for their confidence and continued backing.',
      wh3: 'Investors/agents decide on commercial factors; governance standing is not a discernible factor.',
    },
  },
  {
    id: 'focus-groups',
    label: 'Focus group discussions',
    populatedBy: null,
    placeholderLabel: 'not simulated in this pilot',
    expected: {
      wh1: 'Group consensus frames governance as a brake; shared stories of missed opportunities.',
      wh2: 'Group consensus frames governance as licence to operate and grow.',
      wh3: 'Governance barely arises without prompting; discussion centres on external drivers.',
    },
  },
]
