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

export function words(text) {
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

// ------------------------------------------------------- text-only coding
//
// REAL DATA PATH. A real answer arrives with no researcher-assigned hypothesis:
// there is no `lean`, and there must not be one. These two coders therefore see
// only the text and the codebook, and search ALL groups at once — which
// proposition a segment supports is an output of coding, not an input to it.

/**
 * All codes scored by definition/label overlap with the text, best first.
 *
 * TIE-BREAKING IS PART OF THE METHOD, so it is stated rather than incidental.
 * Equal scores are resolved by code LABEL, not by internal id: an id is an
 * implementation detail that changes when a code is deleted and re-added (a
 * slug id becomes a generated one), and a research result must not turn on
 * that. Labels are the researcher's own words, visible on the Codebook page,
 * and survive a delete-and-re-add unchanged. Id is the last resort only when
 * two codes carry the identical label, where no stable answer exists.
 *
 * The resolution is still arbitrary in the sense that any tie-break is — which
 * is why a tie is RECORDED on the segment rather than quietly resolved.
 */
function rankCodes(text, codes) {
  return codes
    .map((c) => ({ code: c, score: overlapScore(text, c) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.code.label.localeCompare(b.code.label, 'en') ||
        a.code.id.localeCompare(b.code.id),
    )
}

/** True when the top two codes match the text equally well — i.e. the codebook
 *  does not discriminate here and the winner is decided by the tie-break. */
function topIsTied(ranked) {
  const [first, second] = ranked
  return Boolean(first && second && first.score > 0 && first.score === second.score)
}

/**
 * Both text-only coders, from one ranking.
 *
 * Coder A takes the best-matching code anywhere in the codebook, and
 * UNCLASSIFIED when nothing matches at all. The minimum score of 1 matters —
 * the synthetic path can fall back on the pre-tagged group, so a zero-overlap
 * answer still lands somewhere plausible; with no pre-tag, accepting a
 * zero-overlap "best" match would be assigning a proposition to text that
 * contains no evidence for it.
 *
 * Coder B agrees when the leading code is a clear winner and takes the
 * runner-up when the top two match equally well, so kappa against Coder A
 * measures how sharply the codebook DISCRIMINATES on this material. It is
 * deterministic and uses no random draw.
 *
 * This is a machine consistency check, NOT human inter-rater reliability, and
 * the Reliability page and exports say so in real mode.
 */
function textOnlyCoding(text, codebook) {
  const ranked = rankCodes(text, codebook.codes)
  const [first, second] = ranked
  const coderA = first && first.score > 0 ? first.code.id : UNCLASSIFIED
  const tied = topIsTied(ranked)
  const coderB =
    coderA === UNCLASSIFIED ? UNCLASSIFIED : tied ? second.code.id : coderA
  return { coderA, coderB, tied, topScore: first?.score ?? 0 }
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

/**
 * Produce dual-coded segments for one interview. Deterministic.
 *
 * `fromTextOnly` selects the real-data path: both coders see only the answer
 * text, and none of `lean`, `secondaryLean` or `contradictory` is read or
 * written. The flag is explicit rather than inferred from a missing field so
 * that no future transcript shape can silently re-open the pre-tagged path.
 */
export function codeInterview(interview, codebook, { fromTextOnly = false } = {}) {
  return interview.answers.map((answer, idx) => {
    if (fromTextOnly) {
      const { coderA, coderB, tied } = textOnlyCoding(answer.text, codebook)
      return {
        id: `${interview.id}:${idx}`,
        interviewId: interview.id,
        personaId: interview.personaId,
        personaName: interview.personaName,
        questionId: answer.questionId,
        questionIndex: idx,
        text: answer.text,
        coderA,
        coderB,
        // The two definitions matched equally well, so the winner came from the
        // tie-break rather than from the text. Recorded so it is visible.
        tied,
        override: null,
        synthetic: false,
        real: true,
      }
    }
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

// Default band cut-points follow the Landis & Koch (1977) convention
// (>= 0.81 near-perfect/"strong", 0.61–0.80 substantial). Configurable per
// workspace so the labels rest on a citable, adjustable standard rather than
// hard-coded magic numbers.
export const DEFAULT_KAPPA_THRESHOLDS = { strong: 0.8, substantial: 0.6 }

export function kappaBand(kappa, thresholds = DEFAULT_KAPPA_THRESHOLDS) {
  const strong = thresholds?.strong ?? DEFAULT_KAPPA_THRESHOLDS.strong
  const substantial = thresholds?.substantial ?? DEFAULT_KAPPA_THRESHOLDS.substantial
  if (kappa >= strong) {
    return { label: 'Strong', advice: 'Agreement is strong — the codebook definitions discriminate well.' }
  }
  if (kappa >= substantial) {
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
