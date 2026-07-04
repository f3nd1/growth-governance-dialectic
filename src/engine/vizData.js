// Chart INPUT builders. These read the exact same selectors the existing
// pages use (aggregateEvidence, agreementStats) and never recompute κ,
// weights or distributions independently — so a chart can never disagree
// with the table beside it.

import { agreementStats } from './coding'
import { aggregateEvidence } from './patterns'
import { HYPOTHESIS_IDS } from '../store/defaults'

/** Colours keyed wh1/wh2/wh3, pulled from the workspace hypotheses. */
export function hypothesisColors(ws) {
  return Object.fromEntries(HYPOTHESIS_IDS.map((id) => [id, ws.hypotheses[id].color]))
}

/**
 * Chart A input — per-persona stacked shares + an aggregate bar.
 * Reads aggregateEvidence (the Pattern-Matching page's selector).
 */
export function hypothesisDistributionData(ws) {
  const { personas, overall } = aggregateEvidence(ws.coding.segments, ws.codebook)
  const hypTotal = overall.wh1 + overall.wh2 + overall.wh3
  const aggregateShares = {
    wh1: hypTotal ? overall.wh1 / hypTotal : 0,
    wh2: hypTotal ? overall.wh2 / hypTotal : 0,
    wh3: hypTotal ? overall.wh3 / hypTotal : 0,
  }
  const rows = personas.map((p) => ({
    label: p.personaName.replace(' (synthetic)', ''),
    shares: p.shares,
    paradox: p.split,
    isAggregate: false,
  }))
  return {
    rows,
    aggregate: { label: 'Aggregate', shares: aggregateShares, isAggregate: true },
    hasData: personas.length > 0 && hypTotal > 0,
  }
}

/**
 * Chart B input — κ per seed, using agreementStats (the Reliability page's
 * selector) on each seed's segment subset, plus the pooled κ over all.
 */
export function reliabilitySeriesData(ws) {
  const seedOf = new Map(ws.interviews.map((iv) => [iv.id, iv.seed]))
  const bySeed = new Map()
  for (const s of ws.coding.segments) {
    const seed = seedOf.get(s.interviewId)
    if (seed == null) continue
    if (!bySeed.has(seed)) bySeed.set(seed, [])
    bySeed.get(seed).push(s)
  }
  const points = [...bySeed.entries()]
    .map(([seed, segs]) => {
      const stats = agreementStats(segs)
      return stats ? { seed, kappa: stats.kappa, n: stats.n } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.seed - b.seed)

  const pooledStats = agreementStats(ws.coding.segments)
  return { points, pooled: pooledStats ? pooledStats.kappa : null }
}

// Chapter 3 evidence rows; only the interview row is populated by the pilot.
const HEATMAP_ROWS = [
  { id: 'interviews', label: 'Interviews', populated: true },
  { id: 'focus', label: 'Focus groups', populated: false },
  { id: 'financial', label: 'Financial data', populated: false },
  { id: 'audit', label: 'Audit / risk data', populated: false },
  { id: 'reports', label: 'Company reports', populated: false },
]

/**
 * Chart C input — heatmap rows. Interview row intensity = overall hypothesis
 * shares from aggregateEvidence (the Joint Display selector); other rows are
 * real-data-phase placeholders.
 */
export function heatmapData(ws) {
  const { overall } = aggregateEvidence(ws.coding.segments, ws.codebook)
  const hypTotal = overall.wh1 + overall.wh2 + overall.wh3
  const shares = {
    wh1: hypTotal ? overall.wh1 / hypTotal : 0,
    wh2: hypTotal ? overall.wh2 / hypTotal : 0,
    wh3: hypTotal ? overall.wh3 / hypTotal : 0,
  }
  const rows = HEATMAP_ROWS.map((r) => ({
    label: r.label,
    populated: r.populated,
    shares: r.populated ? shares : null,
  }))
  return { rows, hasData: hypTotal > 0 }
}
