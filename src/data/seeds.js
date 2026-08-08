// Seed content for the instrument being validated. All of it is editable in
// the app; these are the starting points the pilot exercises.

export function defaultProtocolQuestions() {
  return [
    {
      id: 'q1',
      order: 1,
      text: 'Walk me through how governance or compliance requirements show up in your day-to-day work at the institution.',
      rq: 'RQ2',
      source: 'Tricker (2019) — corporate governance practice in SMEs',
    },
    {
      id: 'q2',
      order: 2,
      text: 'Tell me about a recent growth or commercial initiative you were involved in. What role, if any, did governance play in it?',
      rq: 'RQ2',
      source: 'Uhlaner, Wright & Huse (2007) — governance in SME growth contexts',
    },
    {
      id: 'q3',
      order: 3,
      text: 'Describe a specific time when a governance or compliance requirement changed a business decision — its timing, its shape, or its outcome.',
      rq: 'RQ2',
      source: 'Yin (2018) — critical-incident probing in case study interviews',
    },
    {
      id: 'q4',
      order: 4,
      text: 'In your experience, how do students, parents and partner organisations respond to the institution’s governance and accreditation standing?',
      rq: 'RQ3',
      source: 'Spence (1973); Connelly et al. (2011) — signalling theory',
    },
    {
      id: 'q5',
      order: 5,
      text: 'Where do growth pressure and governance requirements collide for you personally, and how do you handle that tension?',
      rq: 'RQ2',
      source: 'Smith & Lewis (2011) — paradox theory (dynamic equilibrium)',
    },
    {
      id: 'q6',
      order: 6,
      text: 'If the governance and compliance apparatus disappeared tomorrow, what would honestly change for the business side — better or worse?',
      rq: 'RQ2',
      source: 'Yin (2018) — counterfactual probing for rival explanations',
    },
    {
      id: 'q7',
      order: 7,
      text: 'When recruitment agents decide whether to work with the institution, how much does its governance and registration standing matter to their trust?',
      rq: 'RQ3',
      source: 'Mayer, Davis & Schoorman (1995) — organisational trust; agent-channel literature',
    },
    {
      id: 'q8',
      order: 8,
      text: 'Did the institution’s governance maturity or certification status factor into your decision to invest?',
      rq: 'RQ3',
      source: 'Mayer, Davis & Schoorman (1995) — organisational trust; investor-confidence literature',
    },
  ]
}

export function defaultCodebookCodes() {
  return [
    // WH1 — governance constrains growth
    {
      id: 'c-resource-diversion',
      group: 'wh1',
      label: 'Resource diversion',
      definition:
        'Speaker describes time, money or staff attention being pulled away from teaching or commercial work specifically to satisfy governance/compliance demands. Must name a resource and where it went.',
    },
    {
      id: 'c-bureaucracy',
      group: 'wh1',
      label: 'Bureaucracy',
      definition:
        'Speaker describes paperwork, approvals, forms or procedural steps experienced as burdensome overhead, without a compensating benefit named in the same segment.',
    },
    {
      id: 'c-decision-delay',
      group: 'wh1',
      label: 'Decision delay',
      definition:
        'Speaker attributes a slowed, deferred or missed business decision or opportunity to a governance step (approval, audit, board cycle, regulator response).',
    },
    // WH2 — governance enables growth
    {
      id: 'c-stability',
      group: 'wh2',
      label: 'Stability',
      definition:
        'Speaker credits governance with predictability, continuity or protection from shocks (financial controls, risk registers, succession clarity) that lets the business operate or plan.',
    },
    {
      id: 'c-trust-signal',
      group: 'wh2',
      label: 'Trust signal',
      definition:
        'Speaker describes governance/accreditation status functioning as a signal that wins or retains students, parents, agents, partners or regulators.',
    },
    {
      id: 'c-decision-quality',
      group: 'wh2',
      label: 'Decision quality',
      definition:
        'Speaker credits a governance mechanism (board scrutiny, documented process, risk review) with a better-considered or better-evidenced business decision.',
    },
    {
      id: 'c-enabled-growth',
      group: 'wh2',
      label: 'Enabled growth',
      definition:
        'Speaker links a concrete growth outcome (new programme, market, partnership, enrolment gain) to governance standing as a precondition or enabler.',
    },
    // WH3 — no discernible effect
    {
      id: 'c-separate-function',
      group: 'wh3',
      label: 'Separate function',
      definition:
        'Speaker frames governance as a parallel or back-office track that neither helps nor hinders their business-facing work.',
    },
    {
      id: 'c-external-attribution',
      group: 'wh3',
      label: 'External attribution',
      definition:
        'Speaker attributes business outcomes to external factors (market demand, visa policy, competition, economy) rather than anything governance-related.',
    },
    {
      id: 'c-no-link',
      group: 'wh3',
      label: 'No link perceived',
      definition:
        'Speaker explicitly says they see no connection between governance and business results, or cannot recall governance affecting an outcome either way.',
    },
  ]
}

export const CODE_GROUPS = [
  { id: 'wh1', label: 'WH1 · constrains' },
  { id: 'wh2', label: 'WH2 · enables' },
  { id: 'wh3', label: 'WH3 · no effect' },
  { id: 'emergent', label: 'Emergent (inductive)' },
]

export const STAKEHOLDER_GROUPS = [
  { id: 'leader', label: 'Leader' },
  { id: 'manager', label: 'Manager' },
  { id: 'teacher', label: 'Teacher' },
  { id: 'support', label: 'Support' },
  { id: 'ph-ops', label: 'PH-ops' },
  { id: 'agent', label: 'Agent' },
  { id: 'investor', label: 'Investor' },
]

// ~9 synthetic personas spanning all stakeholder groups, incl. one paradox
// holder (⚡ holds WH1 and WH2 at once) and one blind-spot probe.
export function defaultPersonas() {
  return [
    {
      id: 'p1',
      name: 'Dr Elena Marquez (synthetic)',
      role: 'Principal / Academic Director',
      group: 'leader',
      tenureYears: 12,
      weights: { wh1: 0.25, wh2: 0.6, wh3: 0.15 },
      held: ['wh2'],
      blindSpot: false,
      voice: 'Strategic, board-facing; cites accreditation wins and long-term stability.',
      synthetic: true
    },
    {
      id: 'p2',
      name: 'Marcus Tay (synthetic)',
      role: 'Head of Admissions & Marketing',
      group: 'manager',
      tenureYears: 6,
      weights: { wh1: 0.45, wh2: 0.45, wh3: 0.1 },
      held: ['wh1', 'wh2'],
      blindSpot: false,
      voice:
        'Growth-driven and candid; complains about approval delays in one breath and credits EduTrust standing for agent deals in the next. Genuinely holds both positions.',
      synthetic: true
    },
    {
      id: 'p3',
      name: 'Priya Nair (synthetic)',
      role: 'Compliance & Quality Manager',
      group: 'manager',
      tenureYears: 4,
      weights: { wh1: 0.1, wh2: 0.7, wh3: 0.2 },
      held: ['wh2'],
      blindSpot: false,
      voice: 'Process-proud; frames every control as protecting students and the licence to operate.',
      synthetic: true
    },
    {
      id: 'p4',
      name: 'Samuel Ong (synthetic)',
      role: 'Senior Lecturer, Business Programmes',
      group: 'teacher',
      tenureYears: 8,
      weights: { wh1: 0.3, wh2: 0.2, wh3: 0.5 },
      held: ['wh3'],
      blindSpot: false,
      voice: 'Classroom-focused; sees governance as paperwork that happens to other people.',
      synthetic: true
    },
    {
      id: 'p5',
      name: 'Aisha Rahman (synthetic)',
      role: 'Adjunct Lecturer',
      group: 'teacher',
      tenureYears: 2,
      weights: { wh1: 0.55, wh2: 0.2, wh3: 0.25 },
      held: ['wh1'],
      blindSpot: false,
      voice: 'Time-poor; experiences audits and documentation as unpaid overhead crowding out teaching prep.',
      synthetic: true
    },
    {
      id: 'p6',
      name: 'Gerald Lim (synthetic)',
      role: 'Finance & Administration Officer',
      group: 'support',
      tenureYears: 5,
      weights: { wh1: 0.4, wh2: 0.25, wh3: 0.35 },
      held: ['wh1'],
      blindSpot: false,
      voice: 'Detail-oriented; lives inside the fee-protection and reporting workflows and feels their weight.',
      synthetic: true
    },
    {
      id: 'p7',
      name: 'Joy Villanueva (synthetic)',
      role: 'Overseas Operations Coordinator (PH)',
      group: 'ph-ops',
      tenureYears: 3,
      weights: { wh1: 0.34, wh2: 0.33, wh3: 0.33 },
      held: ['wh3'],
      blindSpot: true,
      voice:
        'BLIND-SPOT PROBE: deliberately off-script. Talks about cross-border logistics, informal WhatsApp approvals, currency issues and family expectations — themes the a priori codebook may not capture. Tests the emergent bucket.',
      synthetic: true
    },
    {
      id: 'p8',
      name: 'Kenji Sato (synthetic)',
      role: 'Regional Recruitment Agent',
      group: 'agent',
      tenureYears: 7,
      weights: { wh1: 0.1, wh2: 0.65, wh3: 0.25 },
      held: ['wh2'],
      blindSpot: false,
      voice:
        'External channel partner; weighs registration status and fee-protection when deciding which institutions to represent.',
      synthetic: true
    },
    {
      id: 'I01',
      name: 'Rachel Bennett (synthetic)',
      role: 'Investor',
      group: 'investor',
      tenureYears: 3,
      weights: { wh1: 0.15, wh2: 0.65, wh3: 0.2 },
      held: ['wh2'],
      blindSpot: false,
      voice:
        'External capital provider; assessed whether governance maturity and certification de-risked the investment, and credits them with her confidence to back the institution.',
      synthetic: true
    },
  ]
}
