// Dual independent coding + reliability statistics.
//
// Coder A (primary): deterministic keyword classifier — scores every code in
// the answer's pre-tagged hypothesis group by word overlap between the code
// DEFINITION and the answer text, and assigns the best match.
//
// Coder B (second variant): an independent heuristic pass whose agreement
// with Coder A depends on the QUALITY of the code definitions. Vague or
// short definitions give Coder B little to work with, so it disagrees more —
// which is exactly the failure mode a pilot reliability check exists to
// catch. Both coders are deterministic given the interview seed.

import { hashSeed, mulberry32, weightedPick } from './rng'

export const UNCLASSIFIED = 'unclassified'

const STOPWORDS = new Set([
  'the', 'and', 'that', 'with', 'from', 'this', 'have', 'their', 'them',
  'they', 'when', 'what', 'where', 'which', 'speaker', 'describes', 'about',
  'into', 'more', 'than', 'been', 'were', 'over', 'because',
])

function words(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w))
}

function overlapScore(answerText, code) {
  const aw = new Set(words(answerText))
  const dw = words(`${code.label} ${code.definition}`)
  let score = 0
  for (const w of dw) if (aw.has(w)) score++
  return score
}

function bestCodeInGroup(answerText, codes, group, rng) {
  const candidates = codes.filter((c) => c.group === group)
  if (!candidates.length) return null
  let best = []
  let bestScore = -1
  for (const c of candidates) {
    const s = overlapScore(answerText, c)
    if (s > bestScore) {
      bestScore = s
      best = [c]
    } else if (s === bestScore) {
      best.push(c)
    }
  }
  return best[Math.floor(rng() * best.length)] ?? null
}

/**
 * Definition quality in [0,1]: longer, criteria-bearing definitions score
 * higher. Feeds Coder B's agreement probability — the "vague defs => lower
 * kappa" mechanism.
 */
export function definitionQuality(code) {
  const def = (code?.definition ?? '').trim()
  if (!def) return 0
  const lengthFactor = Math.min(1, def.length / 180)
  const hasCriteria = /must|only|explicit|specific|attribut|credit|link|frames|neither|without/i.test(def)
  return lengthFactor * (hasCriteria ? 1 : 0.8)
}

function coderAFor(answer, codebook, rng) {
  if (answer.lean === 'offscript') {
    const best = bestCodeInGroup(answer.text, codebook.codes, 'emergent', rng)
    return best ? best.id : UNCLASSIFIED
  }
  const best = bestCodeInGroup(answer.text, codebook.codes, answer.lean, rng)
  return best ? best.id : UNCLASSIFIED
}

function coderBFor(answer, codebook, codeAId, rng) {
  const codeA = codebook.codes.find((c) => c.id === codeAId)

  if (answer.lean === 'offscript') {
    // Off-script content is inherently hard: Coder B often cannot place it.
    if (codeA && rng() < 0.6) return codeAId
    const emergent = codebook.codes.filter((c) => c.group === 'emergent' && c.id !== codeAId)
    if (emergent.length && rng() < 0.5) return emergent[Math.floor(rng() * emergent.length)].id
    return UNCLASSIFIED
  }

  const quality = codeA ? definitionQuality(codeA) : 0
  const pAgree = 0.5 + 0.45 * quality

  // Contradictory answers carry genuine evidence for two hypotheses, so the
  // second coder legitimately reads them the other way more often.
  const contradictionPenalty = answer.contradictory ? 0.3 : 0

  if (codeA !== UNCLASSIFIED && rng() < pAgree - contradictionPenalty) return codeAId

  // Disagreement: prefer the rival reading for contradictory answers,
  // otherwise a neighbouring code in the same group, otherwise any code.
  if (answer.contradictory && answer.secondaryLean) {
    const rival = bestCodeInGroup(answer.text, codebook.codes, answer.secondaryLean, rng)
    if (rival) return rival.id
  }
  const sameGroup = codebook.codes.filter(
    (c) => c.group === (codeA?.group ?? answer.lean) && c.id !== codeAId,
  )
  if (sameGroup.length && rng() < 0.7) {
    return sameGroup[Math.floor(rng() * sameGroup.length)].id
  }
  const groups = { wh1: 1, wh2: 1, wh3: 1 }
  delete groups[answer.lean]
  const otherGroup = weightedPick(rng, groups)
  const other = bestCodeInGroup(answer.text, codebook.codes, otherGroup, rng)
  return other ? other.id : UNCLASSIFIED
}

/** Produce dual-coded segments for one interview. Deterministic. */
export function codeInterview(interview, codebook) {
  return interview.answers.map((answer, idx) => {
    const rng = mulberry32(hashSeed(`${interview.id}:${answer.questionId}:${idx}:${interview.seed}`))
    const coderA = coderAFor(answer, codebook, rng)
    const coderB = coderBFor(answer, codebook, coderA, rng)
    return {
      id: `${interview.id}:${idx}`,
      interviewId: interview.id,
      personaId: interview.personaId,
      personaName: interview.personaName,
      questionId: answer.questionId,
      questionIndex: idx,
      text: answer.text,
      lean: answer.lean,
      secondaryLean: answer.secondaryLean,
      contradictory: Boolean(answer.contradictory),
      coderA,
      coderB,
      override: null,
      synthetic: true,
    }
  })
}

// -------------------------------------------------------------- statistics

/** Observed agreement + Cohen's kappa over coderA vs coderB. */
export function agreementStats(segments) {
  const n = segments.length
  if (!n) return null
  let agree = 0
  const margA = {}
  const margB = {}
  for (const s of segments) {
    if (s.coderA === s.coderB) agree++
    margA[s.coderA] = (margA[s.coderA] ?? 0) + 1
    margB[s.coderB] = (margB[s.coderB] ?? 0) + 1
  }
  const po = agree / n
  let pe = 0
  for (const cat of new Set([...Object.keys(margA), ...Object.keys(margB)])) {
    pe += ((margA[cat] ?? 0) / n) * ((margB[cat] ?? 0) / n)
  }
  const kappa = pe >= 1 ? 1 : (po - pe) / (1 - pe)
  return { n, agreements: agree, po, pe, kappa }
}

export function kappaBand(kappa) {
  if (kappa >= 0.8) {
    return { label: 'Strong', advice: 'Agreement is strong — the codebook definitions discriminate well.' }
  }
  if (kappa >= 0.6) {
    return {
      label: 'Substantial',
      advice: 'Substantial but improvable — review the codes where disagreements cluster.',
    }
  }
  return {
    label: 'Moderate — tighten codebook',
    advice:
      'Agreement is too low to code real fieldwork reliably. Sharpen definitions (inclusion/exclusion criteria) and re-run the pilot before touching real data.',
  }
}

/** Final code for a segment: manual override wins, else Coder A. */
export function effectiveCode(segment) {
  return segment.override ?? segment.coderA
}
