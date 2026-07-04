// Pilot Report assembly + exporters. The SYNTHETIC caveat is hard-coded into
// every output path and is not togglable anywhere in the app.

import { agreementStats, kappaBand } from './coding'
import { aggregateEvidence } from './patterns'
import { HYPOTHESIS_IDS } from '../store/defaults'

export const SYNTHETIC_CAVEAT =
  'SYNTHETIC PILOT — INSTRUMENT VALIDATION ONLY. All participants, transcripts, codes and ' +
  'figures in this document are generated from synthetic personas. Figures illustrate the ' +
  'METHOD, not validated coefficients. Nothing here is a real finding about the institution. ' +
  'Real fieldwork is pending advisor and IRB approval.'

export function buildReportModel(ws) {
  const stats = agreementStats(ws.coding.segments)
  const { personas, overall, topCodes } = aggregateEvidence(ws.coding.segments, ws.codebook)
  const hypTotal = overall.wh1 + overall.wh2 + overall.wh3
  return {
    caveat: SYNTHETIC_CAVEAT, // non-removable
    generatedAt: new Date().toISOString(),
    studyDesign: ws.studyDesign,
    hypotheses: HYPOTHESIS_IDS.map((id) => ws.hypotheses[id]),
    protocol: [...ws.protocol.questions].sort((a, b) => a.order - b.order),
    codebook: ws.codebook.codes,
    counts: {
      personas: ws.personas.length,
      interviews: ws.interviews.length,
      segments: ws.coding.segments.length,
      overrides: ws.coding.segments.filter((s) => s.override).length,
    },
    reliability: stats
      ? { ...stats, band: kappaBand(stats.kappa).label, advice: kappaBand(stats.kappa).advice }
      : null,
    patterns: {
      overall,
      hypTotal,
      shares: Object.fromEntries(
        HYPOTHESIS_IDS.map((id) => [id, hypTotal ? overall[id] / hypTotal : 0]),
      ),
      splits: personas.filter((p) => p.split),
      topCodes: topCodes.slice(0, 8),
      coverageGap: overall.emergent + overall.unclassified,
    },
  }
}

export function reportToMarkdown(m) {
  const lines = []
  lines.push('# Pilot Report — governance-growth-dialectic')
  lines.push('')
  lines.push(`> **${m.caveat}**`)
  lines.push('')
  lines.push(`_Generated ${new Date(m.generatedAt).toLocaleString()}_`)
  lines.push('')
  lines.push('## 1 · Study design (reference)')
  lines.push('')
  lines.push(`**${m.studyDesign.title}**`)
  lines.push('')
  lines.push(`- Design: ${m.studyDesign.design}`)
  lines.push(`- Unit of analysis: ${m.studyDesign.unitOfAnalysis}`)
  lines.push('')
  lines.push(m.studyDesign.summary)
  lines.push('')
  lines.push(`Pilot purpose: ${m.studyDesign.pilotPurpose}`)
  lines.push('')
  lines.push('## 2 · Working hypotheses (rival propositions)')
  lines.push('')
  for (const h of m.hypotheses) lines.push(`- **${h.label}** — ${h.description}`)
  lines.push('')
  lines.push('## 3 · Interview protocol under validation')
  lines.push('')
  m.protocol.forEach((q, i) => {
    lines.push(`${i + 1}. ${q.text}`)
    lines.push(`   - Maps to ${q.rq} · Source: ${q.source}`)
  })
  lines.push('')
  lines.push('## 4 · Codebook')
  lines.push('')
  for (const c of m.codebook) lines.push(`- **${c.label}** (${c.group}): ${c.definition || '_no definition_'}`)
  lines.push('')
  lines.push('## 5 · Pilot corpus (synthetic)')
  lines.push('')
  lines.push(`${m.counts.personas} synthetic personas · ${m.counts.interviews} interviews · ${m.counts.segments} dual-coded segments · ${m.counts.overrides} logged overrides.`)
  lines.push('')
  lines.push('## 6 · Reliability (illustrative of method)')
  lines.push('')
  if (m.reliability) {
    lines.push(`- N segments: ${m.reliability.n}`)
    lines.push(`- Observed agreement p₀: ${(m.reliability.po * 100).toFixed(1)}%`)
    lines.push(`- Cohen's kappa: ${m.reliability.kappa.toFixed(3)} — **${m.reliability.band}**`)
    lines.push(`- ${m.reliability.advice}`)
  } else {
    lines.push('_No coded segments in this workspace yet._')
  }
  lines.push('')
  lines.push('## 7 · Pattern-matching (distributed evidence, synthetic)')
  lines.push('')
  if (m.patterns.hypTotal > 0) {
    for (const h of m.hypotheses) {
      lines.push(
        `- ${h.short}: ${m.patterns.overall[h.id].toFixed(1)} weighted segments (${(m.patterns.shares[h.id] * 100).toFixed(0)}%)`,
      )
    }
    lines.push(`- Codebook coverage gap (emergent/unclassified): ${m.patterns.coverageGap.toFixed(1)} segments`)
    lines.push('')
    if (m.patterns.splits.length) {
      lines.push('### Split patterns (paradox findings)')
      lines.push('')
      for (const p of m.patterns.splits) {
        lines.push(
          `- ${p.personaName} supports ${p.splitPair.join(' + ').toUpperCase()} simultaneously — under paradox theory a finding, not noise.`,
        )
      }
    }
  } else {
    lines.push('_No aggregated evidence yet._')
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push(`**${m.caveat}**`)
  lines.push('')
  return lines.join('\n')
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Printable standalone HTML — caveat banner baked in at top and bottom. */
export function reportToHTML(m) {
  const md = reportToMarkdown(m)
  // Minimal markdown-ish rendering: headings, bold, lists, paragraphs.
  const body = md
    .split('\n')
    .map((line) => {
      if (line.startsWith('# ')) return `<h1>${esc(line.slice(2))}</h1>`
      if (line.startsWith('## ')) return `<h2>${esc(line.slice(3))}</h2>`
      if (line.startsWith('### ')) return `<h3>${esc(line.slice(4))}</h3>`
      if (line.startsWith('> ')) return `<div class="caveat">${esc(line.slice(2).replace(/\*\*/g, ''))}</div>`
      if (line.startsWith('---')) return '<hr />'
      if (/^\d+\. /.test(line)) return `<p class="li">${esc(line)}</p>`
      if (line.startsWith('   - ')) return `<p class="li sub">${esc(line.trim())}</p>`
      if (line.startsWith('- ')) return `<p class="li">• ${esc(line.slice(2))}</p>`
      if (line.trim() === '') return ''
      return `<p>${esc(line)}</p>`
    })
    .join('\n')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Pilot Report — SYNTHETIC instrument validation</title>
<style>
  body { font-family: Georgia, serif; max-width: 820px; margin: 2rem auto; padding: 0 1rem; line-height: 1.55; color: #1f2328; }
  h1, h2, h3 { font-family: 'Segoe UI', system-ui, sans-serif; }
  .caveat { background: #fbedb8; border: 2px solid #e4c65b; padding: 12px 16px; font-weight: 700; margin: 1rem 0; }
  .li { margin: 0.15rem 0; }
  .sub { margin-left: 1.5rem; color: #555; }
  @media print { .caveat { border-width: 3px; } }
</style>
</head>
<body>
${body}
</body>
</html>`
}
