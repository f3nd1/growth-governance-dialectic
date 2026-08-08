// The Chapter 3 pattern-matching matrix (Table 2): expected evidence for each
// evidence type under each rival proposition. Shared by the Joint Display page,
// the heatmap chart and the Chapter-3 appendix export so they cannot diverge.
//
// `populatedBy` marks which synthetic segments fill a row:
//   'internal' -> interviews with internal staff (all groups except agent/investor)
//   'external' -> interviews with investors and agents
//   null       -> real-data-phase placeholder (not produced by this pilot)

export const EXTERNAL_GROUPS = ['agent', 'investor']

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
