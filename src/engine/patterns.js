// Pattern-matching aggregation: distributes coded evidence across the three
// rival propositions as weights, never winner-take-all. A contradictory
// (paradox) segment carries genuine evidence for two hypotheses and is split
// 50/50 between them, so a paradox participant shows up in two columns.

import { effectiveCode, UNCLASSIFIED } from './coding'

const COLUMNS = ['wh1', 'wh2', 'wh3', 'emergent', UNCLASSIFIED]

/**
 * Share of a participant's hypothesis-relevant evidence a proposition must reach
 * to count as supported. Two or more supported propositions = a split pattern.
 *
 * There is NO established convention for this cut-point — see the note in
 * settings.patternMatching. It is a researcher decision, configurable per
 * workspace, and must be stated in the write-up rather than cited.
 */
export const DEFAULT_SPLIT_THRESHOLD = 0.3

function emptyTally() {
  return Object.fromEntries(COLUMNS.map((c) => [c, 0]))
}

function groupOf(codeId, codebook) {
  if (codeId === UNCLASSIFIED) return UNCLASSIFIED
  return codebook.codes.find((c) => c.id === codeId)?.group ?? UNCLASSIFIED
}

/**
 * Returns { perPersona, overall, topCodes } where each tally maps
 * wh1/wh2/wh3/emergent/unclassified -> weighted segment count.
 */
export function aggregateEvidence(segments, codebook, splitThreshold = DEFAULT_SPLIT_THRESHOLD) {
  const perPersona = new Map()
  const overall = emptyTally()
  const codeCounts = {}

  for (const seg of segments) {
    const code = effectiveCode(seg)
    const group = groupOf(code, codebook)
    if (code !== UNCLASSIFIED) codeCounts[code] = (codeCounts[code] ?? 0) + 1

    if (!perPersona.has(seg.personaId)) {
      perPersona.set(seg.personaId, {
        personaId: seg.personaId,
        personaName: seg.personaName,
        tally: emptyTally(),
        total: 0,
      })
    }
    const entry = perPersona.get(seg.personaId)

    const splitAcross =
      seg.contradictory && seg.secondaryLean && seg.secondaryLean !== group
        ? [[group, 0.5], [seg.secondaryLean, 0.5]]
        : [[group, 1]]

    for (const [g, w] of splitAcross) {
      entry.tally[g] = (entry.tally[g] ?? 0) + w
      overall[g] = (overall[g] ?? 0) + w
    }
    entry.total += 1
  }

  const personas = [...perPersona.values()].map((p) => {
    // Share across the three hypotheses only (emergent/unclassified are
    // codebook-coverage signals, not hypothesis evidence).
    const hypTotal = p.tally.wh1 + p.tally.wh2 + p.tally.wh3
    const shares = {
      wh1: hypTotal ? p.tally.wh1 / hypTotal : 0,
      wh2: hypTotal ? p.tally.wh2 / hypTotal : 0,
      wh3: hypTotal ? p.tally.wh3 / hypTotal : 0,
    }
    const supported = Object.entries(shares).filter(([, v]) => v >= splitThreshold)
    const split = supported.length >= 2
    return {
      ...p,
      shares,
      split,
      splitPair: split ? supported.map(([k]) => k) : null,
      coverageGap: p.tally[UNCLASSIFIED] + p.tally.emergent,
    }
  })

  const topCodes = Object.entries(codeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([codeId, count]) => ({
      codeId,
      count,
      label: codebook.codes.find((c) => c.id === codeId)?.label ?? codeId,
      group: groupOf(codeId, codebook),
    }))

  return { personas, overall, topCodes }
}

export function topCodesForGroup(topCodes, group, limit = 3) {
  return topCodes.filter((c) => c.group === group).slice(0, limit)
}
