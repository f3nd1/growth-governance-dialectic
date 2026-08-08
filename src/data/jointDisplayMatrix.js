// The Chapter 3 pattern-matching matrix: expected evidence for each evidence
// type under each rival proposition. Shared by the Joint Display page and the
// Chapter-3 appendix export so the two can never diverge. Only qualitative
// rows can be populated by the synthetic pilot; the rest await the real-data
// phase.

export const JOINT_DISPLAY_ROWS = [
  {
    id: 'reports',
    label: 'Company reports',
    placeholder: true,
    expected: {
      wh1: 'Strategy documents defer or shelve growth initiatives citing compliance workload or regulatory risk.',
      wh2: 'Reports credit accreditation/registration milestones as preconditions for expansion moves.',
      wh3: 'Growth narrative develops with no reference to governance either way.',
    },
  },
  {
    id: 'financial',
    label: 'Financial data',
    placeholder: true,
    expected: {
      wh1: 'Compliance cost line grows faster than revenue; margin compression follows governance events.',
      wh2: 'Revenue/enrolment inflections follow governance milestones (e.g. certification renewals).',
      wh3: 'No systematic relationship between governance-related spend/events and business indicators.',
    },
  },
  {
    id: 'interviews',
    label: 'Interviews (qualitative)',
    placeholder: false,
    expected: {
      wh1: 'Stakeholders recount resource diversion, bureaucracy and delayed/blocked decisions.',
      wh2: 'Stakeholders recount stability, trust signalling and governance-enabled wins.',
      wh3: 'Stakeholders perceive governance as a separate function; outcomes attributed externally.',
    },
  },
  {
    id: 'focus',
    label: 'Focus groups (qualitative)',
    placeholder: true,
    placeholderLabel: 'not simulated in this pilot',
    expected: {
      wh1: 'Group consensus frames governance as brake; shared war stories of missed opportunities.',
      wh2: 'Group consensus frames governance as licence to operate and grow.',
      wh3: 'Governance barely arises without prompting; discussion centres on external drivers.',
    },
  },
  {
    id: 'audit',
    label: 'Audit / risk data',
    placeholder: true,
    expected: {
      wh1: 'Findings and remediation absorb management attention in periods of stalled growth.',
      wh2: 'Clean audits precede successful partnership/enrolment cycles.',
      wh3: 'Audit outcomes uncorrelated with business trajectory.',
    },
  },
]
