// Coder-disagreement diagnostic. READ-ONLY BY CONSTRUCTION: nothing in this
// module writes, and nothing it returns is shaped like a code assignment. It
// takes segments in, and returns statistics, a prompt, and prose out. The
// caller displays the prose; no code path exists to apply it.
//
// The two coders are automated passes over the same text against the same
// codebook, so their disagreements are a property of the CODEBOOK, not of the
// participants — which is what makes them worth diagnosing.

import { UNCLASSIFIED } from './coding'
import { REAL_CONFIDENTIALITY_HEADER } from './report'

// Well under gpt-4o's context, leaving room for the response. Exceeding this
// stops the run with a batching proposal — never a silent truncation, because a
// diagnostic computed over a hidden subset would misstate its own counts.
export const MAX_INPUT_TOKENS = 60000

/** Rough but stable: ~4 characters per token for English prose. */
export function estimateTokens(text) {
  return Math.ceil(text.length / 4)
}

function labelFor(codeId, codebook) {
  if (codeId === UNCLASSIFIED) return 'unclassified'
  return codebook.codes.find((c) => c.id === codeId)?.label ?? codeId
}

/** Segments where the two passes differ. Manual overrides are ignored — this
 *  is about the independent passes, exactly as the kappa figure is. */
export function disagreements(segments) {
  return segments.filter((s) => s.coderA !== s.coderB)
}

/**
 * Deterministic pair counts, computed locally rather than asked of the model:
 * a language model is the wrong tool for counting, and the researcher should be
 * able to check the model's interpretation against numbers it did not produce.
 * The pair is unordered — A:x/B:y and A:y/B:x are the same confusion.
 */
export function pairCounts(segs, codebook) {
  const counts = new Map()
  for (const s of segs) {
    const [x, y] = [labelFor(s.coderA, codebook), labelFor(s.coderB, codebook)].sort()
    const key = `${x} ⇄ ${y}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([pair, count]) => ({ pair, count }))
    .sort((a, b) => b.count - a.count || a.pair.localeCompare(b.pair))
}

const SECTIONS = [
  '1. CONFUSION PAIRS — for each of the most frequent pairs above, say whether the two definitions genuinely overlap or are distinguishable and the coders are simply crude. Quote the words in the definitions that collide.',
  '2. NON-ANSWERS — how many of the listed segments are not substantive answers at all (refusals, "not applicable", "I am not the right person to ask", role disclaimers) and are being force-coded anyway? Give the count, the segment numbers, and which codes are absorbing them.',
  '3. BOTH COST AND BENEFIT — how many listed segments describe a cost AND a benefit of governance in the same answer, which a one-code-per-segment scheme cannot represent? Give the count and segment numbers.',
  '4. DEFINITIONS TO TIGHTEN — name the specific codes whose definitions you judge too vague or overlapping. QUOTE the definition text verbatim and say precisely what is ambiguous about it.',
  '5. PROPOSED EDITS — concrete proposed rewrites or boundary rules, each phrased as a proposal for the researcher to accept or reject. Number them so they can be discussed individually.',
]

/**
 * Assemble the two messages. Returns { system, user, stats, tokens } so the
 * caller can show the estimate and the exact prompt before anything is sent.
 */
export function buildDiagnosticPrompt(segments, codebook) {
  const segs = disagreements(segments)
  const stats = {
    total: segments.length,
    disagreements: segs.length,
    rate: segments.length ? segs.length / segments.length : 0,
    pairs: pairCounts(segs, codebook),
  }

  const system = [
    'You are a qualitative methods advisor auditing a codebook for a doctoral single-case study.',
    'Two AUTOMATED coding passes classified each interview segment against the codebook below.',
    'Both passes read only the segment text — neither was given any hypothesis in advance — so',
    'their disagreements are evidence about the CODEBOOK, not about the participants.',
    '',
    'You are READ-ONLY. Do NOT assign codes. Do NOT output a corrected coding, a per-segment',
    'verdict, a "correct answer" column, or any list that could be pasted back in as codes.',
    'Report PATTERNS across the set. Every recommendation is a proposal the researcher accepts',
    'or rejects; you are not applying anything.',
    '',
    'Where you give a count, base it on the numbered segments supplied and cite their numbers so',
    'the researcher can check you. If you are unsure, say so rather than estimating.',
    '',
    'Answer in Markdown with exactly these five sections, in this order:',
    ...SECTIONS,
  ].join('\n')

  const codebookBlock = codebook.codes
    .map((c) => `- [${c.group}] ${c.label}: ${c.definition || '(NO DEFINITION WRITTEN)'}`)
    .join('\n')

  const segmentBlock = segs
    .map(
      (s, i) =>
        `#${i + 1} [A: ${labelFor(s.coderA, codebook)} | B: ${labelFor(s.coderB, codebook)}]\n${s.text}`,
    )
    .join('\n\n')

  const user = [
    'CODEBOOK (group, label, definition):',
    codebookBlock,
    '',
    'DISAGREEMENT STATISTICS (counted in the app, not by you — treat them as given):',
    `- ${stats.total} coded segments, ${stats.disagreements} disagreements (${(stats.rate * 100).toFixed(0)}%)`,
    ...stats.pairs.map((p) => `- ${p.pair}: ${p.count}`),
    '',
    `DISAGREEING SEGMENTS (${segs.length}), verbatim participant answers:`,
    segmentBlock,
  ].join('\n')

  return { system, user, stats, tokens: estimateTokens(system) + estimateTokens(user) }
}

/** Markdown export of a completed analysis. Real-mode output, so it carries the
 *  confidentiality header — the quoted excerpts are participant speech. */
export function diagnosticToMarkdown({ analysis, stats, model, when }) {
  const L = []
  L.push('# Coder disagreement diagnostic')
  L.push('')
  L.push(`> **${REAL_CONFIDENTIALITY_HEADER}**`)
  L.push('')
  L.push(
    `_Generated ${new Date(when).toLocaleString()} · model ${model} · ` +
      `${stats.disagreements} of ${stats.total} segments disagree (${(stats.rate * 100).toFixed(0)}%)_`,
  )
  L.push('')
  L.push(
    '**This is a diagnostic, not a coding decision.** No code, override or definition was ' +
      'changed by producing it. Every suggestion below is a proposal for the researcher to ' +
      'accept or reject by hand.',
  )
  L.push('')
  L.push('## Confusion pairs (counted in the app)')
  L.push('')
  L.push('| Pair | Segments |')
  L.push('| --- | ---: |')
  for (const p of stats.pairs) L.push(`| ${p.pair} | ${p.count} |`)
  L.push('')
  L.push('## Analysis')
  L.push('')
  L.push(analysis)
  L.push('')
  L.push(`**${REAL_CONFIDENTIALITY_HEADER}**`)
  return L.join('\n')
}
