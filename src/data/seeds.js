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

/**
 * `rq` was a single string before multi-mapping was supported. Normalise either
 * shape to an array so read sites never branch on it.
 */
export function rqList(rq) {
  if (Array.isArray(rq)) return rq
  return rq ? [rq] : []
}

/**
 * WH1 and WH2 can be held together — paradox theory predicts exactly that, and
 * surfacing the coexistence is the study's contribution. WH3 asserts there is no
 * association at all, so it cannot coherently sit beside either. Where a stored
 * persona has both, WH3 is dropped: the WH1/WH2 signal is the meaningful one.
 */
export function normaliseHeld(held) {
  const list = Array.isArray(held) ? held : []
  const hasDirectional = list.includes('wh1') || list.includes('wh2')
  return hasDirectional ? list.filter((h) => h !== 'wh3') : list
}

/** True when a held set is internally contradictory (WH3 beside WH1/WH2). */
export function heldIsValid(held) {
  const list = Array.isArray(held) ? held : []
  return !(list.includes('wh3') && (list.includes('wh1') || list.includes('wh2')))
}

// ---------------------------------------------------------------------------
// Focus group protocol — a SEPARATE instrument from the interview protocol,
// supervisor-approved and used only in real fieldwork. Its questions are built
// to make participants talk to each other, so they are not a subset of the nine
// interview questions and must never be substituted for them.
// ---------------------------------------------------------------------------

export const FOCUS_GROUP_OPENING_SCRIPT = [
  'Thank you all for making time.',
  'This discussion is part of a doctoral study about how this college balanced growing as a business against meeting its regulatory and quality requirements, between 2023 and 2026. You have each already given me an individual interview. Today is different: I am interested in what happens when you talk about this together, including where you disagree.',
  'Three things before we start.',
  'First, my role. I am here as a researcher, not as Principal. I will not give my own opinions, and I will not ask anyone to comment on any individual person, including me. There is no right answer I am hoping for.',
  'Second, this is voluntary and separate from work. This is not training and it is not part of any appraisal or performance process. Nothing said here goes into anyone\u2019s employment file. You can stay quiet on any topic, and you can leave at any point without giving a reason.',
  'Third, confidentiality works differently in a group. Everything I write up uses codes instead of names, and nothing will be attributed to anyone by name or identifiable role. But the people in this room will hear what you say. I am asking everyone to keep this discussion confidential, and I cannot guarantee that everyone will. Please take that into account in what you choose to share.',
  'Ground rules: one person at a time so the recording is usable; disagreement is welcome and useful; no comments about named individuals.',
  'I would like to audio-record so I can transcribe accurately. The recording is deleted once the transcript is checked. Is everyone content for me to record?',
  '[WAIT FOR EXPLICIT AGREEMENT FROM EVERY PARTICIPANT \u2014 then begin recording]',
  'Now that we are recording, can each of you confirm you consent to take part and to being recorded?',
  '[FOR THE EXTERNAL PARTIES SESSION ONLY, ADD] One more thing specific to this group. You work with institutions that compete with each other, and some of you may compete with each other. This discussion is about this college\u2019s governance and certification standing only. Please do not disclose your own commercial arrangements, or those of any other agency, and please do not ask each other to.',
].join('\n\n')

export const FOCUS_GROUP_CLOSING_SCRIPT = [
  'That is everything I planned to ask. Two last things.',
  'Is there anything none of us said in this room that someone outside it would say?',
  'And if I want to use a direct quote from today, I will check with you first that you are comfortable it cannot be traced back to you. Is that alright with everyone?',
  'Thank you. This was genuinely useful.',
].join('\n\n')

export function defaultFocusGroupQuestions() {
  return [
    {
      id: 'fgq1',
      order: 1,
      text: 'Thinking about the last two years here, what stands out most to each of you as a change in how this college actually works day to day?',
      rq: ['RQ3'],
      // Left empty deliberately: the approved protocol records no source for
      // this question, and inventing a citation would misrepresent it.
      source: '',
      probes: [
        'Does everyone see the same change, or does it look different from where you each sit?',
        'Has anyone here experienced that differently?',
      ],
    },
    {
      id: 'fgq2',
      order: 2,
      text: 'Here are four areas of the college. Working together, I would like you to place where governance work has helped this college most, and where it has cost most. Talk it through as a group; you do not need to agree.',
      rq: ['RQ1', 'RQ3'],
      source:
        'Smith & Lewis (2011) dynamic equilibrium; Sundaramurthy & Lewis (2003) control-collaboration paradox',
      probes: [
        'Where do you disagree with each other on that placement?',
        'Is there an area where it is both a help and a cost at once?',
        'Would your answer be different for two years ago?',
      ],
    },
    {
      id: 'fgq3',
      order: 3,
      text: 'Some people in this study have said the compliance work slowed us down at exactly the moment we needed to move fast. Others have said it is the only reason we got certified and could recruit at all. Both of those have been said. Which rings truer for your part of the college, and why?',
      rq: ['RQ1', 'RQ2', 'RQ3'],
      source:
        'Smith & Lewis (2011); Miron-Spektor et al. (2018) paradox mindset; Putnam et al. (2016) contradictions and dialectics',
      probes: [
        'Has anyone changed their mind on that while working here?',
        'Does anyone want to argue the other side of that?',
        'Can both be true at the same time? Where?',
      ],
    },
    {
      id: 'fgq4',
      order: 4,
      text: 'Walk me through the move from building systems to students actually arriving. What did that shift look like from where each of you sat?',
      rq: ['RQ3'],
      source: 'Smith (2014) dynamic decision making across time; Yin (2018) temporal pattern matching',
      probes: [
        'When did it feel heaviest, and was that the same moment for everyone?',
        'For anyone who joined later: what did you walk into, and what surprised you?',
        'Did anything change between you as a result?',
      ],
    },
    {
      id: 'fgq5',
      order: 5,
      text: 'If you had to slow down one area of governance in order to move faster commercially, what would this group choose, and what would you refuse to touch?',
      rq: ['RQ2'],
      source:
        'Wenke et al. (2021) and Hu et al. (2023) SME resource constraint under ambidexterity; Lubatkin et al. (2006) top management team behavioural integration',
      probes: [
        'What would go wrong first if you did that?',
        'Is there anything here nobody would give up?',
        'Who would feel it most?',
      ],
    },
  ]
}

export function defaultFocusGroupProtocol() {
  return {
    questions: defaultFocusGroupQuestions(),
    openingScript: FOCUS_GROUP_OPENING_SCRIPT,
    closingScript: FOCUS_GROUP_CLOSING_SCRIPT,
  }
}

export function defaultProtocolQuestions() {
  return [
    {
      id: 'q1',
      order: 1,
      text: 'Walk me through how governance or compliance requirements show up in your day-to-day work at the institution.',
      rq: ['RQ1'],
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
      rq: ['RQ1', 'RQ3'],
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
      rq: ['RQ1', 'RQ3'],
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
      rq: ['RQ2', 'RQ3'],
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
      rq: ['RQ1', 'RQ3'],
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
      rq: ['RQ2'],
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
      rq: ['RQ3'],
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
      rq: ['RQ2', 'RQ3'],
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
      rq: ['RQ1', 'RQ2'],
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
        'Speaker describes time, money, or staff attention being pulled away from teaching, recruitment, or commercial work specifically in order to satisfy governance or compliance demands. Must name a resource AND where it went. EXCLUDE general complaints about being busy with no governance cause named.',
    },
    {
      id: 'c-bureaucracy',
      group: 'wh1',
      label: 'Bureaucracy',
      definition:
        'Speaker describes paperwork, approvals, forms, or procedural steps experienced as burdensome overhead, with no compensating benefit named in the same segment. EXCLUDE where the speaker names a benefit in the same breath — code that as Decision quality or Stability instead.',
    },
    {
      id: 'c-decision-delay',
      group: 'wh1',
      label: 'Decision delay',
      definition:
        'Speaker attributes a slowed, deferred, or missed business decision or opportunity to a governance step (approval, audit, board cycle, regulator response). Must link a specific decision to a specific governance step. EXCLUDE delays attributed to market, staffing, or external parties.',
    },
    // WH2 — governance enables growth
    {
      id: 'c-stability',
      group: 'wh2',
      label: 'Stability',
      definition:
        'Speaker credits governance with predictability, continuity, or protection from shocks (financial controls, risk registers, succession clarity, documented process) that lets the business operate or plan. EXCLUDE generic praise with no mechanism named.',
    },
    {
      id: 'c-trust-signal',
      group: 'wh2',
      label: 'Trust signal',
      definition:
        'Speaker describes governance or accreditation status functioning as a signal that wins or retains students, parents, agents, partners, investors, or regulators. Must name who is receiving the signal.',
    },
    {
      id: 'c-decision-quality',
      group: 'wh2',
      label: 'Decision quality',
      definition:
        'Speaker credits a governance mechanism (board scrutiny, documented process, risk review, audit finding) with a better-considered or better-evidenced business decision. Must name the mechanism.',
    },
    {
      id: 'c-enabled-growth',
      group: 'wh2',
      label: 'Enabled growth',
      definition:
        'Speaker links a concrete growth outcome (new programme, new market, partnership, enrolment gain, capital raised) to governance standing as a precondition or enabler. Must name the outcome.',
    },
    {
      id: 'c-sequencing-cost',
      group: 'wh1',
      label: 'Sequencing cost',
      definition:
        'Speaker describes governance capability being built ahead of the business it was meant to support, and names a cost of that ordering (capital consumed before revenue, staff hired ahead of students, systems built before use). Specific to the pre-launch and launch-transition phases.',
    },
    {
      id: 'c-investability',
      group: 'wh2',
      label: 'Investability',
      definition:
        'Speaker describes governance capability, certification, or audit readiness as a factor in attracting, reassuring, or retaining investors or shareholders — governance as evidence of viability before revenue exists.',
    },
    // WH3 — no discernible effect
    {
      id: 'c-separate-function',
      group: 'wh3',
      label: 'Separate function',
      definition:
        'Speaker frames governance as a parallel or back-office track that neither helps nor hinders their own business-facing work. EXCLUDE where the speaker also names an effect elsewhere in the same segment.',
    },
    {
      id: 'c-external-attribution',
      group: 'wh3',
      label: 'External attribution',
      definition:
        'Speaker attributes business outcomes to external factors (market demand, visa policy, competition, economy, investor timing, regulatory schedules) rather than anything governance-related.',
    },
    {
      id: 'c-no-link',
      group: 'wh3',
      label: 'No link perceived',
      definition:
        'Speaker explicitly says they see no connection between governance and business results, or cannot recall governance affecting an outcome either way. Must be an explicit statement, not an inference from silence.',
    },
  ]
}

export const CODE_GROUPS = [
  { id: 'wh1', label: 'WH1 · constrains' },
  { id: 'wh2', label: 'WH2 · enables' },
  { id: 'wh3', label: 'WH3 · no effect' },
  { id: 'emergent', label: 'Emergent (inductive)' },
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

// Real fieldwork now comprises three evidence types. A recorded item carries
// exactly one of these; interview is the default so existing records migrate
// without a decision being made for them.
export const SOURCE_TYPES = [
  { id: 'interview', label: 'Individual interview', plural: 'Individual interviews' },
  { id: 'focus-group', label: 'Focus group', plural: 'Focus groups' },
  { id: 'document', label: 'Document', plural: 'Documentary sources' },
]

// Exactly four moderated focus groups, fixed by the study design. They are not
// free text: a fifth group would be a design change, not a data-entry choice.
export const FOCUS_GROUPS = [
  { id: 'fg-shareholders-board', label: 'Shareholders and board' },
  { id: 'fg-academic-board', label: 'Academic Board members' },
  { id: 'fg-managers', label: 'Managers' },
  { id: 'fg-executives', label: 'Executives' },
  // The four above are seniority tiers inside the institution. This one is not:
  // its members are external, so its consent and confidentiality terms differ
  // and the UI has to say so before anyone is added to it.
  { id: 'fg-external-agents', label: 'External parties (recruitment agents)', external: true },
]

// Which participant stakeholder groups may attend which focus group. Supplied
// by the researcher — this is a study-design decision, not something the app
// derives from a participant record.
//
// A stakeholder group may appear in SEVERAL focus groups by design — multi-role
// in three, academic in two. Those participants attend every session they are
// listed for, so being saved into more than one is expected, not a
// double-allocation error, and the picker distinguishes the two cases.
export const FOCUS_GROUP_ELIGIBILITY = {
  'fg-shareholders-board': ['shareholder', 'multi-role'],
  'fg-academic-board': ['multi-role', 'academic'],
  'fg-managers': ['ph-ops', 'support', 'academic'],
  'fg-executives': ['teacher'],
  'fg-external-agents': ['agent', 'multi-role'],
}

// Focus-group ids that were renamed after sessions could already have been
// saved against them. Applied on load so a stored session keeps its group
// rather than becoming an orphan with an unrecognised id. The session's own id
// is NOT rewritten — coded segments join on it.
export const RENAMED_FOCUS_GROUPS = {
  'fg-heads-of-departments': 'fg-academic-board',
}

export const DOCUMENT_TYPES = [
  { id: 'policy', label: 'Policy' },
  { id: 'minutes', label: 'Minutes' },
  { id: 'audit-report', label: 'Audit report' },
  { id: 'certification-correspondence', label: 'Certification correspondence' },
  { id: 'strategic-plan', label: 'Strategic plan' },
  { id: 'other', label: 'Other' },
]

export const STAKEHOLDER_GROUPS = [
  { id: 'shareholder', label: 'Shareholder' },
  { id: 'senior-leader', label: 'Senior leader' },
  { id: 'academic', label: 'Academic' },
  { id: 'teacher', label: 'Teacher' },
  { id: 'support', label: 'Support' },
  { id: 'ph-ops', label: 'PH operations' },
  { id: 'agent', label: 'Agent' },
  { id: 'multi-role', label: 'Multi-role' },
]

// 13 synthetic role archetypes spanning every stakeholder group, including two
// paradox holders (P02, P12 — hold WH1 and WH2 at once) and one blind-spot probe
// (P13). Weights must sum to 1.0; validated on load by assertPersonaWeights().
export function defaultPersonas() {
  return [
    {
      id: 'P01',
      name: 'Dana Reyes (synthetic)',
      role: 'Board member / shareholder',
      group: 'shareholder',
      tenureYears: 3,
      weights: { wh1: 0.2, wh2: 0.65, wh3: 0.15 },
      held: ['wh2'],
      blindSpot: false,
      voice:
        'Invested during the capability-building phase. Assessed the college on governance evidence because there was no revenue to assess. Credits certification with de-risking the capital decision. Impatient about how long certification took, but does not blame governance for that — blames the regulator\'s timeline.',
      synthetic: true,
    },
    {
      id: 'P02',
      name: 'Marcus Tay (synthetic)',
      role: 'Senior leader (commercial + governance)',
      group: 'senior-leader',
      tenureYears: 5,
      weights: { wh1: 0.4, wh2: 0.5, wh3: 0.1 },
      held: ['wh1', 'wh2'],
      blindSpot: false,
      voice:
        'Accountable for both commercial results and compliance outcomes — the paradox lives in his job description. Genuinely believes certification is why agents take the college seriously, AND genuinely resents that audit season stops everything else for weeks. Will state both within the same interview without noticing the contradiction.',
      synthetic: true,
    },
    {
      id: 'P03',
      name: 'Priya Nathan (synthetic)',
      role: 'Academic Director',
      group: 'academic',
      tenureYears: 4,
      weights: { wh1: 0.3, wh2: 0.55, wh3: 0.15 },
      held: ['wh2'],
      blindSpot: false,
      voice:
        'Sees academic governance as inseparable from programme quality. Frames documentation as what makes new programme approvals possible at all. Mild frustration that governance is treated as an administrative task rather than an academic one.',
      synthetic: true,
    },
    {
      id: 'P04',
      name: 'Ellen Koh (synthetic)',
      role: 'Teacher (long tenure)',
      group: 'teacher',
      tenureYears: 6,
      weights: { wh1: 0.55, wh2: 0.2, wh3: 0.25 },
      held: ['wh1'],
      blindSpot: false,
      voice:
        'Long-serving teacher. Experiences governance almost entirely as added admin — forms, evidence collection, audit preparation — with little visible connection to students. Not hostile, but unconvinced. Will say \'I\'m sure it matters to someone, just not to my classroom.\'',
      synthetic: true,
    },
    {
      id: 'P05',
      name: 'Sam Oduya (synthetic)',
      role: 'Teacher (launch-phase joiner)',
      group: 'teacher',
      tenureYears: 1,
      weights: { wh1: 0.35, wh2: 0.3, wh3: 0.35 },
      held: ['wh3'],
      blindSpot: false,
      voice:
        'Joined during the launch transition. Walked into systems already built and has no memory of life before them, so has no baseline to compare against. Tends to attribute outcomes to market conditions or luck. Useful for testing whether the codebook handles \'I wasn\'t here for that.\'',
      synthetic: true,
    },
    {
      id: 'P06',
      name: 'Wendy Lim (synthetic)',
      role: 'Student support officer',
      group: 'support',
      tenureYears: 3,
      weights: { wh1: 0.25, wh2: 0.5, wh3: 0.25 },
      held: ['wh2'],
      blindSpot: false,
      voice:
        'Student-facing. Notices that students and parents ask about certification, and that having it makes conversations easier. Also notices the volume of records she now has to keep. Nets out positive but not uncritically.',
      synthetic: true,
    },
    {
      id: 'P07',
      name: 'Ramon Cruz (synthetic)',
      role: 'Operations lead, offshore team',
      group: 'ph-ops',
      tenureYears: 3.5,
      weights: { wh1: 0.3, wh2: 0.55, wh3: 0.15 },
      held: ['wh2'],
      blindSpot: false,
      voice:
        'Offshore operations lead, longest tenure on the team. Built many of the systems that operationalise compliance. Sees governance and systems work as the same job. Proud of the automation; frames it as what lets a small team meet requirements that would otherwise need double the headcount.',
      synthetic: true,
    },
    {
      id: 'P08',
      name: 'Bea Santos (synthetic)',
      role: 'HR & finance, offshore team',
      group: 'ph-ops',
      tenureYears: 2,
      weights: { wh1: 0.45, wh2: 0.35, wh3: 0.2 },
      held: ['wh1'],
      blindSpot: false,
      voice:
        'HR and finance, offshore. Feels the cost side most directly — sees money going out for consultants, certifications, and audit prep while revenue was still nil. Supportive in principle, strained in practice. Best source for the sequencing-cost code.',
      synthetic: true,
    },
    {
      id: 'P09',
      name: 'Jorge Medina (synthetic)',
      role: 'Marketing, offshore team (new joiner)',
      group: 'ph-ops',
      tenureYears: 0.8,
      weights: { wh1: 0.25, wh2: 0.25, wh3: 0.5 },
      held: ['wh3'],
      blindSpot: false,
      voice:
        'Marketing, joined under a year ago. Governance feels like someone else\'s department. Attributes enrolment growth to campaign work and market recovery. Genuinely does not perceive a link — not defensive about it, just doesn\'t see one.',
      synthetic: true,
    },
    {
      id: 'P10',
      name: 'Kai Zhang (synthetic)',
      role: 'Recruitment agent (certification-led)',
      group: 'agent',
      tenureYears: null,
      weights: { wh1: 0.05, wh2: 0.8, wh3: 0.15 },
      held: ['wh2'],
      blindSpot: false,
      voice:
        'Agent who screens institutions on certification before anything else. Will not refer to a school without valid standing. Explicit that tier matters and that parents ask. Strong, clean WH2 signal from outside the institution.',
      synthetic: true,
    },
    {
      id: 'P11',
      name: 'Nina Farrow (synthetic)',
      role: 'Recruitment agent (sceptical)',
      group: 'agent',
      tenureYears: null,
      weights: { wh1: 0.2, wh2: 0.3, wh3: 0.5 },
      held: ['wh3'],
      blindSpot: false,
      voice:
        'Agent who says certification is table stakes, not a differentiator — everyone credible has it, so it decides nothing. Refers based on commission, responsiveness and student outcomes. Useful counterweight to Kai Zhang; tests whether the codebook can hold \'it matters but doesn\'t differentiate.\'',
      synthetic: true,
    },
    {
      id: 'P12',
      name: 'Theo Alvarez (synthetic)',
      role: 'Shareholder who also acts as agent',
      group: 'multi-role',
      tenureYears: 4,
      weights: { wh1: 0.35, wh2: 0.45, wh3: 0.2 },
      held: ['wh1', 'wh2'],
      blindSpot: false,
      voice:
        'Shareholder who also brings students. Sees governance one way as an investor (de-risking, evidence of viability) and another way as an agent (slow approvals, paperwork before he can place a student). Holds both without resolving them. Tests whether segmented multi-role interviews produce codeable data.',
      synthetic: true,
    },
    {
      id: 'P13',
      name: 'Robin Ige (synthetic)',
      role: 'Blind-spot probe',
      group: 'support',
      tenureYears: 1,
      weights: { wh1: 0.3, wh2: 0.3, wh3: 0.4 },
      held: ['wh3'],
      blindSpot: true,
      voice:
        'Deliberately off-script. Answers in terms the a priori codebook does not anticipate — talks about governance as identity and staff morale rather than as cost or benefit; says it changed how people talk to each other rather than what the business achieved. Exists to test whether the emergent bucket catches what the deductive codes miss. If Robin\'s answers all get forced into existing codes, the codebook is too greedy.',
      synthetic: true,
    },
  ]
}

// Weight profiles condition generation, so a profile that does not sum to 1
// would silently skew a persona. Fail loudly instead.
export function assertPersonaWeights(personas) {
  const bad = personas.filter((p) => {
    const sum = p.weights.wh1 + p.weights.wh2 + p.weights.wh3
    return Math.abs(sum - 1) > 0.005
  })
  if (bad.length) {
    throw new Error(
      'Persona weight profiles must sum to 1.0: ' + bad.map((p) => p.id).join(', '),
    )
  }
  return personas
}
