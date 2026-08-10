// Pilot Report assembly + exporters. Every output path carries a header the
// app cannot toggle off: the SYNTHETIC caveat for the synthetic pilot corpus,
// or the confidentiality header for real participant data. Which one is used
// follows the workspace mode, never a user setting.

import { agreementStats, kappaBand } from './coding'
import { aggregateEvidence } from './patterns'
import { HYPOTHESIS_IDS } from '../store/defaults'
import {
  hypothesisColors,
  hypothesisDistributionData,
  reliabilitySeriesData,
  heatmapData,
} from './vizData'
import { hypothesisDistributionSVG, reliabilitySVG, heatmapSVG } from './charts'
import { rqList } from '../data/seeds'
import { activeData } from '../store/dataStore'

export const REAL_CONFIDENTIALITY_HEADER =
  'CONFIDENTIAL — REAL PARTICIPANT DATA. This document contains pseudonymised material from ' +
  'consented human participants. Handle under the approved ethics protocol: do not circulate ' +
  'beyond the approved supervisory team, do not re-identify participants, and store it only ' +
  'where your data-management plan permits. The code-to-identity key is held separately and ' +
  'is not part of this document.'

export const SYNTHETIC_CAVEAT =
  'SYNTHETIC PILOT — INSTRUMENT VALIDATION ONLY. All participants, transcripts, codes and ' +
  'figures in this document are generated from synthetic personas. Figures illustrate the ' +
  'METHOD, not validated coefficients. Nothing here is a real finding about the institution. ' +
  'Real fieldwork is pending advisor and IRB approval.'

/** Inline note stamped under every exported chart. Mode-driven, not settable. */
function figureNote(m) {
  return m.isReal
    ? 'CONFIDENTIAL real participant data — pseudonymised.'
    : 'SYNTHETIC pilot data — illustrates the method, not a real finding.'
}

export function buildReportModel(ws) {
  const real = activeData(ws).isReal
  const stats = agreementStats(activeData(ws).coding.segments)
  const { personas, overall, topCodes } = aggregateEvidence(
    activeData(ws).coding.segments,
    ws.codebook,
    ws.settings.patternMatching?.splitThreshold,
  )
  const hypTotal = overall.wh1 + overall.wh2 + overall.wh3
  const colors = hypothesisColors(ws)
  const distData = hypothesisDistributionData(ws)
  const relData = reliabilitySeriesData(ws)
  const heatData = heatmapData(ws)
  const thresholds = ws.settings.reliability?.thresholds
  const citation = ws.settings.reliability?.citation ?? ''
  return {
    // Charts are built from the same selectors as the on-screen charts, so
    // the exported report matches the app exactly. Null when there is no data.
    charts: {
      // The watermark on every exported chart follows the dataset, so a chart
      // pasted into a document cannot misdeclare its own provenance. Chart B
      // plots kappa per generation seed and is omitted entirely for real data,
      // which has no seeds.
      distribution: distData.hasData
        ? hypothesisDistributionSVG(distData, colors, { isReal: real })
        : null,
      reliability: !real && relData.points.length
        ? reliabilitySVG(relData, colors, thresholds, { isReal: real })
        : null,
      // No selected evidence types means no matrix — an axis-only frame would
      // assert a comparison the researcher deliberately switched off.
      heatmap: heatData.rows.length ? heatmapSVG(heatData, colors, { isReal: real }) : null,
    },
    jointDisplay: heatData.rows,
    // Non-removable, and chosen by mode rather than by any setting: real
    // exports must never carry the synthetic caveat, which would misdescribe
    // confidential human data as generated.
    isReal: real,
    caveat: real ? REAL_CONFIDENTIALITY_HEADER : SYNTHETIC_CAVEAT,
    generatedAt: new Date().toISOString(),
    studyDesign: ws.studyDesign,
    hypotheses: HYPOTHESIS_IDS.map((id) => ws.hypotheses[id]),
    protocol: [...ws.protocol.questions].sort((a, b) => a.order - b.order),
    openingScript: ws.protocol.openingScript ?? '',
    closingScript: ws.protocol.closingScript ?? '',
    codebook: ws.codebook.codes,
    counts: {
      personas: activeData(ws).participants.length,
      interviews: activeData(ws).interviews.length,
      segments: activeData(ws).coding.segments.length,
      overrides: activeData(ws).coding.segments.filter((s) => s.override).length,
    },
    reliability: stats
      ? {
          ...stats,
          band: kappaBand(stats.kappa, thresholds).label,
          advice: kappaBand(stats.kappa, thresholds).advice,
          thresholds: thresholds ?? { strong: 0.8, substantial: 0.6 },
          citation,
        }
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
      splitThreshold: ws.settings.patternMatching?.splitThreshold ?? 0.3,
      splitNote: ws.settings.patternMatching?.note ?? '',
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
  lines.push('## 2 · Rival propositions')
  lines.push('')
  for (const h of m.hypotheses) lines.push(`- **${h.label}** — ${h.description}`)
  lines.push('')
  lines.push('## 3 · Interview protocol under validation')
  lines.push('')
  if (m.openingScript) {
    lines.push('**Opening script (read verbatim):** ' + m.openingScript)
    lines.push('')
  }
  m.protocol.forEach((q, i) => {
    lines.push(`${i + 1}. ${q.text}`)
    lines.push(`   - Maps to ${rqList(q.rq).join(', ')} · Source: ${q.source}`)
    for (const pr of q.probes ?? []) lines.push(`   - Probe: ${pr}`)
  })
  if (m.closingScript) {
    lines.push('')
    lines.push('**Closing script (read verbatim):** ' + m.closingScript)
  }
  lines.push('')
  lines.push('## 4 · Codebook')
  lines.push('')
  for (const c of m.codebook) lines.push(`- **${c.label}** (${c.group}): ${c.definition || '_no definition_'}`)
  lines.push('')
  lines.push(m.isReal ? '## 5 · Corpus (real participants)' : '## 5 · Pilot corpus (synthetic)')
  lines.push('')
  lines.push(
    m.isReal
      ? `${m.counts.personas} participants · ${m.counts.interviews} entered transcripts · ${m.counts.segments} dual-coded segments · ${m.counts.overrides} logged overrides.`
      : `${m.counts.personas} synthetic personas · ${m.counts.interviews} interviews · ${m.counts.segments} dual-coded segments · ${m.counts.overrides} logged overrides.`,
  )
  lines.push('')
  lines.push(
    m.isReal
      ? '## 6 · Coding agreement (two automated passes — NOT inter-rater reliability)'
      : '## 6 · Reliability (illustrative of method)',
  )
  lines.push('')
  if (m.reliability) {
    lines.push(`- N segments: ${m.reliability.n}`)
    lines.push(`- Observed agreement p₀: ${(m.reliability.po * 100).toFixed(1)}%`)
    lines.push(`- Cohen's kappa: ${m.reliability.kappa.toFixed(3)} — **${m.reliability.band}**`)
    lines.push(
      `- Band cut-points: substantial ≥ ${m.reliability.thresholds.substantial}, strong ≥ ${m.reliability.thresholds.strong}`,
    )
    if (m.reliability.citation) lines.push(`- ${m.reliability.citation}`)
    lines.push(`- ${m.reliability.advice}`)
  } else {
    lines.push('_No coded segments in this workspace yet._')
  }
  lines.push('')
  lines.push(
    m.isReal
      ? '## 7 · Pattern-matching (distributed evidence)'
      : '## 7 · Pattern-matching (distributed evidence, synthetic)',
  )
  lines.push('')
  if (m.patterns.hypTotal > 0) {
    for (const h of m.hypotheses) {
      lines.push(
        `- ${h.short}: ${m.patterns.overall[h.id].toFixed(1)} weighted segments (${(m.patterns.shares[h.id] * 100).toFixed(0)}%)`,
      )
    }
    lines.push(`- Codebook coverage gap (emergent/unclassified): ${m.patterns.coverageGap.toFixed(1)} segments`)
    lines.push(
      `- Split-pattern cut-point: a proposition counts as supported at an evidence share of ${m.patterns.splitThreshold} or above`,
    )
    if (m.patterns.splitNote) lines.push(`- ${m.patterns.splitNote}`)
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

  const figure = (title, svg, caption) =>
    svg
      ? `<figure class="chart">
  <h3>${esc(title)}</h3>
  ${svg}
  <figcaption>${esc(caption)} <span class="cav-inline">${esc(figureNote(m))}</span></figcaption>
</figure>`
      : ''

  const chartsBlock = `
<h2>8 · Visualisations</h2>
${figure('A · Hypothesis distribution', m.charts.distribution, m.isReal
  ? 'Per-participant coded-evidence shares across WH1/WH2/WH3 with the aggregate; ⚡ marks participants whose evidence spans two propositions.'
  : 'Per-persona coded-evidence shares across WH1/WH2/WH3 with the aggregate; ⚡ paradox personas span two hypotheses.')}
${figure('B · Reliability over seeds', m.charts.reliability, 'Cohen’s κ per seed against the moderate / substantial / strong bands.')}
${figure('C · Joint-display heatmap', m.charts.heatmap, `Evidence strength per hypothesis; only the interview row is populated from ${m.isReal ? 'entered transcripts' : 'synthetic data'}.`)}
`

  // Insert the visualisations section just before the closing separator/caveat.
  const bodyWithCharts = body.includes('<hr />')
    ? body.replace('<hr />', `${chartsBlock}<hr />`)
    : body + chartsBlock

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${m.isReal ? 'Pilot Report — CONFIDENTIAL real participant data' : 'Pilot Report — SYNTHETIC instrument validation'}</title>
<style>
  body { font-family: Georgia, serif; max-width: 820px; margin: 2rem auto; padding: 0 1rem; line-height: 1.55; color: #1f2328; }
  h1, h2, h3 { font-family: 'Segoe UI', system-ui, sans-serif; }
  .caveat { background: #fbedb8; border: 2px solid #e4c65b; padding: 12px 16px; font-weight: 700; margin: 1rem 0; }
  .li { margin: 0.15rem 0; }
  .sub { margin-left: 1.5rem; color: #555; }
  .chart { margin: 1.2rem 0; padding: 12px 14px; border: 1px solid #e2e2de; border-radius: 8px; page-break-inside: avoid; }
  .chart h3 { margin: 0 0 8px; }
  .chart figcaption { font-size: 0.82rem; color: #555; margin-top: 6px; }
  .chart .cav-inline { color: #7a5c00; font-weight: 600; }
  @media print { .caveat { border-width: 3px; } }
</style>
</head>
<body>
${bodyWithCharts}
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Chapter-3 appendix — a denser, canonical, citation-ready bundle distinct
// from the advisor-summary Pilot Report. Same non-removable mode-driven header.
// ---------------------------------------------------------------------------

const APPENDIX_METHOD_NOTE =
  'These figures are illustrative of the METHOD, not validated coefficients and not real ' +
  'findings about the institution. All data is generated from synthetic personas for ' +
  'instrument validation ahead of advisor- and IRB-approved fieldwork.'

const APPENDIX_REAL_NOTE =
  'These figures come from real, consented participants and are reported under the approved ' +
  'ethics protocol. The two coding passes are automated: their agreement describes how sharply ' +
  'the codebook discriminates on this material and must NOT be reported as inter-rater ' +
  'reliability, which requires a second human coder.'

function appendixNote(m) {
  return m.isReal ? APPENDIX_REAL_NOTE : APPENDIX_METHOD_NOTE
}

function mdEsc(s) {
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

export function appendixToMarkdown(m) {
  const L = []
  L.push(m.isReal ? '# Appendix — Analysis (CONFIDENTIAL real participant data)' : '# Appendix — Pilot Instrument Validation (SYNTHETIC)')
  L.push('')
  L.push(`> **${m.caveat}**`)
  L.push('')
  L.push(`**${appendixNote(m)}**`)
  L.push('')
  L.push(
    `_Generated ${new Date(m.generatedAt).toLocaleString()} · ${m.counts.personas} ` +
      `${m.isReal ? 'participants' : 'synthetic personas'} · ${m.counts.interviews} ` +
      `${m.isReal ? 'entered transcripts' : 'interviews'} · ${m.counts.segments} dual-coded ` +
      `segments · ${m.counts.overrides} logged overrides._`,
  )
  L.push('')

  L.push('## A1 · Codebook (a priori + emergent)')
  L.push('')
  L.push('| Code | Hypothesis | Definition |')
  L.push('| --- | --- | --- |')
  for (const c of m.codebook) {
    const grp = m.hypotheses.find((h) => h.id === c.group)?.short ?? c.group
    L.push(`| ${mdEsc(c.label)} | ${grp} | ${mdEsc(c.definition || '—')} |`)
  }
  L.push('')

  L.push('## A2 · Inter-coder reliability')
  L.push('')
  if (m.reliability) {
    L.push(`- Coded segments (N): ${m.reliability.n}`)
    L.push(`- Observed agreement (p₀): ${(m.reliability.po * 100).toFixed(1)}%`)
    L.push(`- Expected agreement (pₑ): ${(m.reliability.pe * 100).toFixed(1)}%`)
    L.push(`- Cohen's κ: **${m.reliability.kappa.toFixed(3)}** — **${m.reliability.band}**`)
    L.push(
      `- Band cut-points: substantial ≥ ${m.reliability.thresholds.substantial}, strong ≥ ${m.reliability.thresholds.strong}`,
    )
    if (m.reliability.citation) L.push(`- ${m.reliability.citation}`)
  } else {
    L.push('_No coded segments in this workspace._')
  }
  L.push('')

  L.push('## A3 · Pattern-matching (distributed evidence)')
  L.push('')
  if (m.patterns.hypTotal > 0) {
    L.push('| Hypothesis | Weighted segments | Share |')
    L.push('| --- | --- | --- |')
    for (const h of m.hypotheses) {
      L.push(`| ${h.short} — ${mdEsc(h.label)} | ${m.patterns.overall[h.id].toFixed(1)} | ${(m.patterns.shares[h.id] * 100).toFixed(0)}% |`)
    }
    L.push('')
    L.push(`Codebook coverage gap (emergent/unclassified): ${m.patterns.coverageGap.toFixed(1)} weighted segments.`)
    if (m.patterns.splits.length) {
      L.push('')
      L.push('Split (paradox) patterns — coexisting support for two hypotheses, a finding under paradox theory (Smith & Lewis 2011):')
      for (const p of m.patterns.splits) {
        L.push(`- ${p.personaName}: ${p.splitPair.join(' + ').toUpperCase()}`)
      }
    }
  } else {
    L.push('_No aggregated evidence yet._')
  }
  L.push('')

  L.push('## A4 · Joint-display matrix (pattern-matching)')
  L.push('')
  if (m.jointDisplay.length === 0) {
    L.push('_No evidence types are selected for the joint display, so no matrix is reported._')
    L.push('')
  } else {
  L.push(
    m.isReal
      ? 'Expected evidence under each rival proposition by evidence type. The two interview rows (internal staff; external investors/agents) are populated from entered transcripts; documents and focus groups are not yet collected.'
      : 'Expected evidence under each rival proposition by evidence type. The two interview rows (internal staff; external investors/agents) are populated from synthetic data; documents and focus groups are real-data-phase placeholders, making explicit what synthetic data can and cannot validate.',
  )
  L.push('')
  const [ha, hb, hc] = m.hypotheses
  L.push(`| Evidence type | Status | ${ha.short} | ${hb.short} | ${hc.short} |`)
  L.push('| --- | --- | --- | --- | --- |')
  for (const row of m.jointDisplay) {
    const status = row.populated
      ? (m.isReal ? 'populated · interviews' : 'populated · synthetic')
      : row.placeholderLabel ?? 'not yet collected'
    const cells = HYPOTHESIS_IDS.map((id) => {
      const base = row.expected[id]
      return row.populated ? `${base} (${(row.shares[id] * 100).toFixed(0)}%)` : base
    })
    L.push(`| ${mdEsc(row.label)} | ${status} | ${mdEsc(cells[0])} | ${mdEsc(cells[1])} | ${mdEsc(cells[2])} |`)
  }
  L.push('')
  }
  L.push('---')
  L.push('')
  L.push(`**${m.caveat}**`)
  L.push('')
  return L.join('\n')
}

export function appendixToHTML(m) {
  const codebookRows = m.codebook
    .map((c) => {
      const grp = m.hypotheses.find((h) => h.id === c.group)?.short ?? c.group
      return `<tr><td>${esc(c.label)}</td><td>${esc(grp)}</td><td>${esc(c.definition || '—')}</td></tr>`
    })
    .join('')

  const relBlock = m.reliability
    ? `<ul>
  <li>Coded segments (N): ${m.reliability.n}</li>
  <li>Observed agreement (p₀): ${(m.reliability.po * 100).toFixed(1)}%</li>
  <li>Expected agreement (pₑ): ${(m.reliability.pe * 100).toFixed(1)}%</li>
  <li>Cohen&#39;s κ: <strong>${m.reliability.kappa.toFixed(3)}</strong> — <strong>${esc(m.reliability.band)}</strong></li>
  <li>Band cut-points: substantial ≥ ${m.reliability.thresholds.substantial}, strong ≥ ${m.reliability.thresholds.strong}</li>
  ${m.reliability.citation ? `<li>${esc(m.reliability.citation)}</li>` : ''}
</ul>`
    : '<p><em>No coded segments in this workspace.</em></p>'

  const patternRows =
    m.patterns.hypTotal > 0
      ? m.hypotheses
          .map(
            (h) =>
              `<tr><td>${h.short} — ${esc(h.label)}</td><td>${m.patterns.overall[h.id].toFixed(1)}</td><td>${(m.patterns.shares[h.id] * 100).toFixed(0)}%</td></tr>`,
          )
          .join('')
      : ''
  const splitsBlock =
    m.patterns.hypTotal > 0 && m.patterns.splits.length
      ? `<p>Split (paradox) patterns — coexisting support for two hypotheses, a finding under paradox theory (Smith &amp; Lewis 2011):</p><ul>${m.patterns.splits
          .map((p) => `<li>${esc(p.personaName)}: ${p.splitPair.join(' + ').toUpperCase()}</li>`)
          .join('')}</ul>`
      : ''

  const jointRows = m.jointDisplay.map((row) => {
    const status = row.populated
      ? (m.isReal ? 'populated · interviews' : 'populated · synthetic')
      : row.placeholderLabel ?? 'not yet collected'
    const cells = HYPOTHESIS_IDS.map((id) => {
      const base = row.expected[id]
      return row.populated
        ? `${esc(base)} <strong>(${(row.shares[id] * 100).toFixed(0)}%)</strong>`
        : esc(base)
    })
    return `<tr${row.populated ? '' : ' class="placeholder"'}><td>${esc(row.label)}</td><td>${esc(status)}</td><td>${cells[0]}</td><td>${cells[1]}</td><td>${cells[2]}</td></tr>`
  }).join('')

  const chartFig = (title, svg, cap) =>
    svg
      ? `<figure class="chart"><h3>${esc(title)}</h3>${svg}<figcaption>${esc(cap)} <span class="cav-inline">${esc(figureNote(m))}</span></figcaption></figure>`
      : ''

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${m.isReal ? 'Chapter-3 Appendix — CONFIDENTIAL real participant data' : 'Chapter-3 Appendix — SYNTHETIC instrument validation'}</title>
<style>
  body { font-family: Georgia, serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; color: #1f2328; }
  h1, h2, h3 { font-family: 'Segoe UI', system-ui, sans-serif; }
  .caveat { background: #fbedb8; border: 2px solid #e4c65b; padding: 12px 16px; font-weight: 700; margin: 1rem 0; }
  .method { border-left: 4px solid #b03230; padding: 8px 14px; font-weight: 600; margin: 1rem 0; }
  table { width: 100%; border-collapse: collapse; margin: 0.6rem 0 1.2rem; font-size: 0.9rem; }
  th, td { border: 1px solid #d8d8d2; padding: 6px 9px; text-align: left; vertical-align: top; }
  th { background: #f2f2ee; font-family: 'Segoe UI', system-ui, sans-serif; }
  tr.placeholder { color: #8a8a84; background: #f7f7f4; }
  .chart { margin: 1.2rem 0; padding: 12px 14px; border: 1px solid #e2e2de; border-radius: 8px; page-break-inside: avoid; }
  .chart figcaption { font-size: 0.82rem; color: #555; margin-top: 6px; }
  .chart .cav-inline { color: #7a5c00; font-weight: 600; }
  @media print { .caveat { border-width: 3px; } table { font-size: 0.82rem; } }
</style>
</head>
<body>
<h1>${m.isReal ? 'Appendix — Analysis (CONFIDENTIAL real participant data)' : 'Appendix — Pilot Instrument Validation (SYNTHETIC)'}</h1>
<div class="caveat">${esc(m.caveat)}</div>
<div class="method">${esc(appendixNote(m))}</div>
<p><em>Generated ${esc(new Date(m.generatedAt).toLocaleString())} · ${m.counts.personas} ${m.isReal ? 'participants' : 'synthetic personas'} · ${m.counts.interviews} ${m.isReal ? 'entered transcripts' : 'interviews'} · ${m.counts.segments} dual-coded segments · ${m.counts.overrides} logged overrides.</em></p>

<h2>A1 · Codebook (a priori + emergent)</h2>
<table><thead><tr><th>Code</th><th>Hypothesis</th><th>Definition</th></tr></thead><tbody>${codebookRows}</tbody></table>

<h2>A2 · Inter-coder reliability</h2>
${relBlock}
${chartFig('Reliability over seeds', m.charts.reliability, 'Cohen’s κ per seed against the interpretation bands.')}

<h2>A3 · Pattern-matching (distributed evidence)</h2>
${patternRows ? `<table><thead><tr><th>Hypothesis</th><th>Weighted segments</th><th>Share</th></tr></thead><tbody>${patternRows}</tbody></table><p>Codebook coverage gap (emergent/unclassified): ${m.patterns.coverageGap.toFixed(1)} weighted segments.</p>${splitsBlock}` : '<p><em>No aggregated evidence yet.</em></p>'}
${chartFig('Hypothesis distribution', m.charts.distribution, m.isReal ? 'Per-participant coded-evidence shares with the aggregate.' : 'Per-persona coded-evidence shares with the aggregate.')}

<h2>A4 · Joint-display matrix (pattern-matching)</h2>
${m.jointDisplay.length === 0
  ? '<p><em>No evidence types are selected for the joint display, so no matrix is reported.</em></p>'
  : `<p>Expected evidence under each hypothesis by evidence type. Only the interview row is populated${m.isReal ? '' : ' from synthetic data'}; the remaining rows are ${m.isReal ? 'not yet collected' : 'real-data-phase placeholders'}.</p>
<table><thead><tr><th>Evidence type</th><th>Status</th><th>${m.hypotheses[0].short}</th><th>${m.hypotheses[1].short}</th><th>${m.hypotheses[2].short}</th></tr></thead><tbody>${jointRows}</tbody></table>`}
${m.jointDisplay.length ? chartFig('Joint-display heatmap', m.charts.heatmap, 'Evidence strength per hypothesis; only the interview row is populated.') : ''}

<hr />
<div class="caveat">${esc(m.caveat)}</div>
</body>
</html>`
}
