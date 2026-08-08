// Deterministic rule-based interview simulator (offline mode).
// Answers are composed from per-theme, per-hypothesis template banks and
// sampled with a seeded PRNG weighted by the persona's WH1/WH2/WH3 profile.
// Paradox personas always emit at least one genuinely contradictory answer;
// blind-spot probes frequently answer off-script.

import { hashSeed, mulberry32, pick, weightedPick } from './rng'

// Question themes keyed by default protocol order; custom questions fall
// back to the generic bank.
const THEMES = ['daily', 'initiative', 'incident', 'external', 'tension', 'counterfactual', 'agentTrust', 'investorTrust']

const BANK = {
  daily: {
    wh1: [
      'Honestly, a lot of my week goes into compliance artefacts — attendance records, audit files, committee minutes — time that used to go into actual delivery.',
      'Every term there is another template, another declaration, another folder to keep inspection-ready. It sits on top of the real job, not inside it.',
    ],
    wh2: [
      'The routines look heavy from outside, but they are why nothing falls over — fees are protected, records are clean, and I can answer any parent or regulator on the spot.',
      'Day to day the framework gives me cover: when I follow the documented process, my decisions stand up later, and that saves rework.',
    ],
    wh3: [
      'Truthfully it barely touches me. The compliance team handles that side; I only notice it at renewal season.',
      'It is there in the background like the fire alarm — I know it exists, I sign what I am asked to sign, and I get on with my work.',
    ],
  },
  initiative: {
    wh1: [
      'We tried to launch a short-course line last year and the internal approvals took longer than building the course itself. Two intakes were missed waiting on sign-offs.',
      'The partnership push stalled at the risk-assessment stage — by the time the paperwork cleared, the partner had signed with a competitor.',
    ],
    wh2: [
      'The new diploma only got off the ground because our registration standing was clean — the partner university checked that before anything else.',
      'When we pitched the corporate training contract, the client audited our governance first. Passing that audit basically won us the deal.',
    ],
    wh3: [
      'The initiative succeeded on the strength of demand and the sales team. I cannot say governance helped or hurt it either way.',
      'Growth projects run on their own track. Governance was neither the obstacle nor the enabler — market timing decided it.',
    ],
  },
  incident: {
    wh1: [
      'We had priced an early-bird promotion, but the fee-protection rules meant restructuring the whole payment schedule; we lost the launch window.',
      'A hiring decision for a revenue-critical role sat with the board for a full cycle because the delegation limits are so tight.',
    ],
    wh2: [
      'The board made us re-run the numbers on an overseas campus idea. It felt slow, but the review exposed a currency risk that would have sunk us.',
      'An audit finding forced us to formalise refund handling — painful for a month, and then complaints dropped and conversions actually improved.',
    ],
    wh3: [
      'I have racked my brain and I honestly cannot point to a decision that changed because of governance. Decisions changed because budgets changed.',
      'Nothing specific comes to mind — requirements get absorbed by admin and the business decisions look the same as before.',
    ],
  },
  external: {
    wh1: [
      'Frankly most students never ask about it — they ask about fees, timetables and jobs. The badge costs us far more than they will ever notice.',
      'Parents care about outcomes and word of mouth. I have not once been asked about our governance arrangements at an open house.',
    ],
    wh2: [
      'Registration status is the first thing serious parents and partner institutions verify. It is our entry ticket to every conversation.',
      'When a competitor lost their accreditation, their students came to us. External confidence tracks the badge very directly.',
    ],
    wh3: [
      'Reactions are mixed and mostly indifferent — a formality box people tick, then they decide on price and location like always.',
      'Externally it is wallpaper. The decision drivers I see are course fit, cost and visa outcomes, not our governance posture.',
    ],
  },
  tension: {
    wh1: [
      'The collision is constant: enrolment targets go up while every new marketing claim needs a compliance review. I handle it by quietly deprioritising the paperwork.',
      'Growth wants speed and governance wants certainty. In practice, deadlines slip on the growth side because the control side cannot flex.',
    ],
    wh2: [
      'There is tension, but it is productive — the guardrails force us to grow in ways we can actually sustain and defend.',
      'I used to see the checks as friction; now I see them as brakes that let us drive faster on the straights.',
    ],
    wh3: [
      'People above me may feel the collision; at my level the two worlds simply do not meet.',
      'I would not call it tension — the requirements and the targets live in different meetings with different people.',
    ],
  },
  counterfactual: {
    wh1: [
      'If it vanished tomorrow we would move twice as fast — launch faster, hire faster, price more freely. The honest answer is it mostly slows us down.',
      'A lot of roles would suddenly have spare capacity, and I suspect revenue work would absorb it happily.',
    ],
    wh2: [
      'It would feel liberating for a quarter, and then something would break — a fee dispute, a bad hire, a regulator query — with nothing to catch it. Growth would get riskier, not faster.',
      'Without the framework, agents and partners would have no basis to trust us. The pipeline would dry up within a year.',
    ],
    wh3: [
      'Truthfully? For my work, very little would change. The same students would enrol and the same classes would run.',
      'I suspect the surface would look identical for a long time — which tells you how loosely coupled the two things are day to day.',
    ],
  },
  agentTrust: {
    wh1: [
      'Agents care about commission speed and visa success. The governance file is something our staff maintain for auditors, not something agents read.',
      'In my experience agents follow conversion rates. The compliance branding rarely comes up until something goes wrong.',
    ],
    wh2: [
      'Agents absolutely check registration status first — recommending an unregistered school can end their own business, so the badge is their safety net.',
      'Our standing is the reason established agents shortlist us; they tell me directly that fee protection is what they sell to parents.',
    ],
    wh3: [
      'It is one line in their checklist among many — present but rarely decisive next to commissions and processing speed.',
      'Some agents mention it, most do not. I cannot honestly say it moves their behaviour much either way.',
    ],
  },
  investorTrust: {
    wh1: [
      'As an investor I saw the compliance load as a cost centre — money and management time going to auditors instead of into growth. It gave me pause.',
      'Honestly the governance overhead worried me: it reads as friction that slows the institution down when it should be scaling.',
    ],
    wh2: [
      'The institution’s governance maturity and certification were decisive for me — a clean audit trail and fee-protection standing are exactly what de-risk the capital.',
      'I would not have put money in without the accreditation. Governance maturity signalled a board I could trust to protect my investment.',
    ],
    wh3: [
      'My decision came down to the numbers and the market. Governance status was neither here nor there in my model.',
      'I looked at enrolment trends and unit economics; the compliance posture did not really factor into the investment either way.',
    ],
  },
  generic: {
    wh1: [
      'My honest experience is that the control environment takes more from the business than it gives back — hours, momentum, and sometimes whole opportunities.',
      'Whatever the intention, the practical effect I see is drag: more steps between an idea and its execution.',
    ],
    wh2: [
      'On balance the structures help — they keep us credible and stop expensive mistakes, which is what lets growth compound.',
      'My experience is that the discipline pays for itself: cleaner operations, fewer surprises, easier partnerships.',
    ],
    wh3: [
      'I genuinely do not see a strong link either way — the governance world and the business world mostly pass each other by.',
      'From where I sit the effect is neutral; other forces decide our results.',
    ],
  },
}

// Off-script answers for blind-spot probes: real experiences the a priori
// codebook was not designed for — they should force the emergent bucket.
const OFFSCRIPT = [
  'What actually decides things on my side is the time difference — approvals happen on WhatsApp at 11pm or not at all, and no policy document describes that reality.',
  'The biggest factor nobody asks about is currency swings; a peso movement changes family decisions faster than any accreditation ever could.',
  'Families here decide based on what a cousin in Singapore says over dinner. Formal signals barely reach them; kinship networks do the vetting.',
  'Half my job is couriering documents between agencies that do not talk to each other — the friction is inter-government, not internal governance.',
  'My honest answer is about staffing: when our one licensed counsellor resigns, everything stops. That single point of failure shapes outcomes more than any framework.',
]

const OPENERS = ['', '', 'Speaking from my role — ', 'Let me be concrete: ', 'From where I sit, ']

function themeFor(question, index) {
  return THEMES[index] ?? 'generic'
}

/**
 * simulateInterview(persona, questions, seed) -> answer[]
 * Deterministic: identical inputs always produce identical output.
 */
export function simulateInterview(persona, questions, seed) {
  const rng = mulberry32(hashSeed(`${persona.id}::${seed}`))
  const paradox = persona.held.length >= 2

  // Pre-select where the contradictory answer lands for paradox personas:
  // prefer the tension question (index 4 in the default protocol).
  const contradictionIndex = paradox
    ? questions.length > 4 ? 4 : Math.floor(rng() * questions.length)
    : -1

  return questions.map((q, i) => {
    const theme = themeFor(q, i)
    const bank = BANK[theme] ?? BANK.generic
    const opener = pick(rng, OPENERS)

    if (i === contradictionIndex && paradox) {
      const [a, b] = persona.held
      const first = pick(rng, (bank[a] ?? BANK.generic[a]))
      const second = pick(rng, (bank[b] ?? BANK.generic[b]))
      return {
        questionId: q.id,
        questionText: q.text,
        text: `${opener}${first} And yet — I know this contradicts what I just said — ${second.charAt(0).toLowerCase()}${second.slice(1)} Both of those are true at the same time; that is exactly what it feels like.`,
        lean: a,
        secondaryLean: b,
        contradictory: true,
        offscript: false,
      }
    }

    if (persona.blindSpot && rng() < 0.45) {
      return {
        questionId: q.id,
        questionText: q.text,
        text: `${opener}${pick(rng, OFFSCRIPT)}`,
        lean: 'offscript',
        contradictory: false,
        offscript: true,
      }
    }

    const lean = weightedPick(rng, persona.weights)
    return {
      questionId: q.id,
      questionText: q.text,
      text: `${opener}${pick(rng, bank[lean] ?? BANK.generic[lean])}`,
      lean,
      contradictory: false,
      offscript: false,
    }
  })
}
