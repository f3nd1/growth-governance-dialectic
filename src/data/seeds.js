// Seed content for the instrument being validated. All of it is editable in
// the app; these are the starting points the pilot exercises.

// The dissertation's three research questions. Shared so the protocol page's
// dropdown and anything displaying a question's mapping stay in step.
export const RESEARCH_QUESTIONS = [
  {
    id: 'RQ1',
    label:
      'RQ1 — influence of value-driven governance on the transition from investor-funded readiness to early market entry',
  },
  {
    id: 'RQ2',
    label:
      'RQ2 — risks and opportunities of commercial development while governance capability was still being built',
  },
  {
    id: 'RQ3',
    label:
      'RQ3 — interaction of governance capability and commercial development across the four phases',
  },
]

// Consent + wrap-up scripts read verbatim around the question set. Part of the
// instrument under validation, not decoration.
export const DEFAULT_OPENING_SCRIPT =
  'Thank you for making time. Before we start, I want to confirm a few things. This ' +
  'interview is part of a doctoral study about how this college balanced growing as a ' +
  'business against meeting its regulatory and quality requirements, between 2023 and ' +
  '2026. Taking part is completely voluntary. You can skip any question for any reason, ' +
  'and you can stop at any point. Nothing you say will affect your job, your standing ' +
  'here, or your working relationship with anyone. Your name will not appear anywhere — ' +
  'you will be given a code, and identifying details are removed when I type this up. I ' +
  'would like to audio-record this so I can transcribe it accurately. The recording is ' +
  'deleted as soon as the transcript is checked. Are you happy for me to record? [WAIT ' +
  'FOR EXPLICIT YES — then begin recording] [After recording starts] Just for the record ' +
  '— can you confirm you consent to take part and to being recorded?'

export const DEFAULT_CLOSING_SCRIPT =
  'That’s everything I wanted to ask. Two last things. Is there anything I didn’t ask ' +
  'about that you think matters to this — anything I’m missing? And: if I want to use a ' +
  'direct quote from what you’ve said, I’ll check with you first that you’re comfortable ' +
  'it can’t be traced back to you. Is that alright? Thank you — this was genuinely helpful.'

export function defaultProtocolQuestions() {
  return [
    {
      id: 'q1',
      order: 1,
      text: 'Walk me through how governance or compliance requirements show up in your day-to-day work at the institution.',
      rq: 'RQ1',
      source: 'Tricker (2019) — corporate governance practice in SMEs',
      probes: [
        'Can you give me a specific example from the last month or two?',
        'Who else is involved when that happens?',
        'Has that changed since you joined / over the last two years?',
      ],
    },
    {
      id: 'q2',
      order: 2,
      text: 'Tell me about a recent growth or commercial initiative you were involved in. What role, if any, did governance play in it?',
      rq: 'RQ1',
      source: 'Uhlaner, Wright & Huse (2007) — governance in SME growth contexts',
      probes: [
        'Did governance help it along, hold it up, or neither?',
        'Was there a point where you had to wait for an approval or a document?',
        'Looking back, would it have gone differently without that step?',
      ],
    },
    {
      id: 'q3',
      order: 3,
      text: 'Describe a specific time when a governance or compliance requirement changed a business decision — its timing, its shape, or its outcome.',
      rq: 'RQ1',
      source: 'Yin (2018) — critical-incident probing in case study interviews',
      probes: [
        'What was the decision originally going to be?',
        'What changed it?',
        'In hindsight, was that a good or bad thing for the college?',
      ],
    },
    {
      id: 'q4',
      order: 4,
      text: 'In your experience, how do students, parents and partner organisations respond to the institution’s governance and accreditation standing?',
      rq: 'RQ3',
      source: 'Spence (1973); Connelly et al. (2011) — signalling theory',
      probes: [
        'Has anyone ever asked you directly about EduTrust or registration?',
        'Did that change after we got certified?',
      ],
    },
    {
      id: 'q5',
      order: 5,
      text: 'Where do growth pressure and governance requirements collide for you personally, and how do you handle that tension?',
      rq: 'RQ1',
      source: 'Smith & Lewis (2011) — paradox theory (dynamic equilibrium)',
      probes: [
        'Is that a daily thing or an occasional thing?',
        'What do you do when both are urgent?',
        'Who do you go to?',
      ],
    },
    {
      id: 'q6',
      order: 6,
      text: 'If the governance and compliance apparatus disappeared tomorrow, what would honestly change for the business side — better or worse?',
      rq: 'RQ2',
      source: 'Yin (2018) — counterfactual probing for rival explanations',
      probes: [
        'What\'s the first thing that would go faster?',
        'What\'s the first thing that would go wrong?',
      ],
    },
    {
      id: 'q7-phase',
      order: 7,
      text: 'Thinking across the time you’ve been here — the earlier period when we were building systems and certifications, and the later period when students started coming in — did the relationship between governance work and business work feel different in those two periods? How?',
      rq: 'RQ3',
      source: 'Smith (2014) — dynamic decision making across time; Yin (2018) — temporal pattern matching',
      probes: [
        'When did it feel heaviest?',
        'Did anything shift once certification came through?',
        '(For staff who joined later) What did you walk into? What surprised you?',
      ],
    },
    {
      id: 'q7',
      order: 8,
      text: 'When recruitment agents decide whether to work with the institution, how much does its governance and registration standing matter to their trust?',
      rq: 'RQ3',
      source: 'Mayer, Davis & Schoorman (1995) — organisational trust; agent-channel literature',
      probes: [
        'Does the certification tier (one-year vs four-year) make a difference?',
        'What do the students or parents you deal with ask about?',
        'Would you refer differently to a school without it?',
      ],
    },
    {
      id: 'q8',
      order: 9,
      text: 'Did the institution’s governance maturity or certification status factor into your decision to invest?',
      rq: 'RQ1',
      source: 'Mayer, Davis & Schoorman (1995) — organisational trust; investor-confidence literature',
      probes: [
        'What would have worried you if it hadn\'t been in place?',
        'Was it decisive, or one factor among many?',
        'Did your view change between your first involvement and now?',
      ],
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
