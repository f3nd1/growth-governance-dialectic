// Chart INPUT builders. These read the exact same selectors the existing
// pages use (aggregateEvidence, agreementStats) and never recompute κ,
// weights or distributions independently — so a chart can never disagree
// with the table beside it.

import { agreementStats } from './coding'
import { aggregateEvidence } from './patterns'
import { HYPOTHESIS_IDS } from '../store/defaults'
import { activeData } from '../store/dataStore'
import { visibleJointRows, unmappedParticipants, EXTERNAL_GROUPS } from '../data/jointDisplayMatrix'

/** Colours keyed wh1/wh2/wh3, pulled from the workspace hypotheses. */
export function hypothesisColors(ws) {
  return Object.fromEntries(HYPOTHESIS_IDS.map((id) => [id, ws.hypotheses[id].color]))
}

/**
 * Chart A input — per-persona stacked shares + an aggregate bar.
 * Reads aggregateEvidence (the Pattern-Matching page's selector).
 */
export function hypothesisDistributionData(ws) {
  const { personas, overall } = aggregateEvidence(
    activeData(ws).coding.segments,
    ws.codebook,
    ws.settings.patternMatching?.splitThreshold,
  )
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
  const data = activeData(ws)
  // Real transcripts carry no seed (nothing is generated), so the per-seed
  // series is empty in real mode and only the pooled figure is reported.
  const seedOf = new Map(data.interviews.map((iv) => [iv.id, iv.seed]))
  const bySeed = new Map()
  for (const s of data.coding.segments) {
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

  const pooledStats = agreementStats(data.coding.segments)
  return { points, pooled: pooledStats ? pooledStats.kappa : null }
}

// Hypothesis shares over an arbitrary segment subset, via the same selector
// the tables use — so a subset row can never disagree with the whole.
function sharesFor(segments, codebook) {
  const { overall } = aggregateEvidence(segments, codebook)
  const t = overall.wh1 + overall.wh2 + overall.wh3
  return {
    total: t,
    shares: t
      ? { wh1: overall.wh1 / t, wh2: overall.wh2 / t, wh3: overall.wh3 / t }
      : { wh1: 0, wh2: 0, wh3: 0 },
  }
}

/**
 * Chart C / Joint Display input — the Chapter 3 matrix rows with expected
 * evidence and, for populated rows, the hypothesis shares of the matching
 * synthetic segment subset (internal staff vs external investors/agents).
 * Placeholder rows carry null shares (real-data phase).
 */
export function heatmapData(ws) {
  const data = activeData(ws)
  const groupById = new Map(data.participants.map((p) => [p.id, p.group]))
  // Filtered here, at the single selector every consumer reads — the page, the
  // chart and both exports — so a hidden row cannot survive in one of them.
  const visible = visibleJointRows(ws.settings, ws.mode)

  if (data.isReal) {
    // Real rows are stakeholder groups. Membership comes from the participant
    // record's group field, so a segment lands in a row because of who said it.
    const rows = visible.map((r) => {
      const groups = new Set(r.groups)
      const segs = data.coding.segments.filter((s) => groups.has(groupById.get(s.personaId)))
      const { shares, total } = sharesFor(segs, ws.codebook)
      return {
        id: r.id,
        label: r.label,
        populated: true, // no placeholder rows: the design collects interviews only
        populatedBy: r.id,
        placeholderLabel: null,
        expected: r.expected,
        shares,
        segmentCount: total,
        participantCount: data.participants.filter((p) => groups.has(p.group)).length,
      }
    })
    return {
      rows,
      hasData: data.coding.segments.length > 0,
      // Reported, never guessed at: a participant whose group the five chapter
      // rows do not cover is excluded from every row and named instead.
      unmapped: unmappedParticipants(data.participants),
    }
  }

  const isExternal = (s) => EXTERNAL_GROUPS.includes(groupById.get(s.personaId))
  const external = data.coding.segments.filter(isExternal)
  const internal = data.coding.segments.filter((s) => !isExternal(s))
  const bySource = {
    internal: sharesFor(internal, ws.codebook),
    external: sharesFor(external, ws.codebook),
  }
  const rows = visible.map((r) => ({
    id: r.id,
    label: r.label,
    populated: r.populatedBy != null,
    populatedBy: r.populatedBy,
    placeholderLabel: r.placeholderLabel,
    expected: r.expected,
    shares: r.populatedBy ? bySource[r.populatedBy].shares : null,
    segmentCount: r.populatedBy ? bySource[r.populatedBy].total : 0,
  }))
  return { rows, hasData: data.coding.segments.length > 0, unmapped: [] }
}
