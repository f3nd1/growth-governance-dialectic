// Pure SVG chart builders — no dependencies, no data computation. Each takes
// already-computed values (from vizData.js selectors) and returns an SVG
// string. React components render these via dangerouslySetInnerHTML and the
// printable report embeds the identical markup, so on-screen and exported
// charts are byte-for-byte the same and always match their source tables.
//
// The WH1/WH2/WH3 palette is low-separation for colour-vision-deficient
// viewers (WH3 is a deliberate neutral grey), so every chart carries
// SECONDARY ENCODING — fixed column order, text %/labels, gaps between
// fills — and each React wrapper adds a table fallback. Identity is never
// conveyed by colour alone.

const WH_ORDER = ['wh1', 'wh2', 'wh3']
const WH_LABEL = { wh1: 'WH1', wh2: 'WH2', wh3: 'WH3' }

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function syntheticMark(x, y) {
  return `<text x="${x}" y="${y}" text-anchor="end" font-size="9" fill="#9a9a94" letter-spacing="0.08em">SYNTHETIC</text>`
}

function legend(x, y, colors) {
  return WH_ORDER.map((k, i) => {
    const lx = x + i * 78
    return (
      `<rect x="${lx}" y="${y - 9}" width="11" height="11" rx="2" fill="${colors[k]}" />` +
      `<text x="${lx + 16}" y="${y}" font-size="11" fill="#61676e">${WH_LABEL[k]}</text>`
    )
  }).join('')
}

// ---------------------------------------------------------------- Chart A

/** Per-persona + aggregate stacked horizontal bars. */
export function hypothesisDistributionSVG(data, colors) {
  const rows = [...data.rows, data.aggregate]
  const W = 560
  const labelW = 156
  const barX = labelW
  const barW = W - labelW - 14
  const rh = 28
  const top = 10
  const plotH = rows.length * rh
  const H = top + plotH + 44

  let body = ''
  rows.forEach((row, i) => {
    const y = top + i * rh
    const barY = y + 4
    const barH = rh - 10
    const isAgg = row.isAggregate
    if (isAgg) {
      body += `<line x1="6" y1="${y}" x2="${W - 6}" y2="${y}" stroke="#d0d0ca" stroke-width="1" />`
    }
    const labelText = (row.paradox ? '⚡ ' : '') + row.label
    body +=
      `<text x="8" y="${barY + barH / 2}" dy="0.35em" font-size="11" ` +
      `fill="${isAgg ? '#1f2328' : '#61676e'}" font-weight="${isAgg ? '700' : '400'}">${esc(labelText)}</text>`

    const clipId = `hdc-${i}`
    body += `<clipPath id="${clipId}"><rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="4" /></clipPath>`
    let segs = ''
    let cx = barX
    WH_ORDER.forEach((k, si) => {
      const segW = Math.max(0, (row.shares[k] || 0) * barW)
      const gap = si > 0 ? 2 : 0
      const drawX = cx + gap
      const drawW = Math.max(0, segW - gap)
      segs += `<rect x="${drawX.toFixed(1)}" y="${barY}" width="${drawW.toFixed(1)}" height="${barH}" fill="${colors[k]}" />`
      if ((row.shares[k] || 0) >= 0.12) {
        segs +=
          `<text x="${(drawX + drawW / 2).toFixed(1)}" y="${barY + barH / 2}" dy="0.35em" ` +
          `text-anchor="middle" font-size="10" fill="#ffffff" font-weight="600">${Math.round(row.shares[k] * 100)}%</text>`
      }
      cx += segW
    })
    body += `<g clip-path="url(#${clipId})">${segs}</g>`
  })

  body += legend(barX, H - 16, colors)
  body += syntheticMark(W - 6, H - 16)

  return (
    `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" ` +
    `aria-label="Stacked hypothesis distribution per synthetic persona with an aggregate bar" ` +
    `font-family="Segoe UI, system-ui, sans-serif">${body}</svg>`
  )
}

// ---------------------------------------------------------------- Chart B

/**
 * Cohen's kappa across seeds with moderate/substantial/strong band zones.
 * The band cut-points come from the configured thresholds so the chart's
 * shaded zones always match the table's band labels.
 */
export function reliabilitySVG(data, colors, thresholds = { strong: 0.8, substantial: 0.6 }) {
  const W = 560
  const H = 260
  const mL = 46
  const mR = 116
  const mT = 16
  const mB = 36
  const pw = W - mL - mR
  const ph = H - mT - mB
  const yFor = (k) => mT + (1 - k) * ph
  const pts = data.points
  const n = pts.length
  const xFor = (i) => (n <= 1 ? mL + pw / 2 : mL + (i / (n - 1)) * pw)

  const sub = thresholds?.substantial ?? 0.6
  const str = thresholds?.strong ?? 0.8
  const bands = [
    { lo: 0, hi: sub, fill: '#f6e7e5', label: 'moderate' },
    { lo: sub, hi: str, fill: '#f3eddc', label: 'substantial' },
    { lo: str, hi: 1, fill: '#e6f0ea', label: 'strong' },
  ]
  let body = ''
  for (const b of bands) {
    const yTop = yFor(b.hi)
    const yBot = yFor(b.lo)
    body += `<rect x="${mL}" y="${yTop}" width="${pw}" height="${(yBot - yTop).toFixed(1)}" fill="${b.fill}" />`
    body += `<text x="${mL + pw + 8}" y="${((yTop + yBot) / 2).toFixed(1)}" dy="0.35em" font-size="10" fill="#61676e">${b.label}</text>`
  }

  // y axis ticks — 0, both cut-points, and 1
  for (const t of [0, sub, str, 1]) {
    const y = yFor(t)
    body += `<line x1="${mL}" y1="${y}" x2="${mL + pw}" y2="${y}" stroke="#d0d0ca" stroke-width="1" stroke-dasharray="2 2" />`
    body += `<text x="${mL - 6}" y="${y}" dy="0.35em" text-anchor="end" font-size="10" fill="#61676e">${t.toFixed(1)}</text>`
  }
  body += `<text x="12" y="${mT + ph / 2}" font-size="10" fill="#61676e" transform="rotate(-90 12 ${mT + ph / 2})" text-anchor="middle">Cohen&#39;s &#954;</text>`

  // x labels + line + dots
  pts.forEach((p, i) => {
    const x = xFor(i)
    body += `<text x="${x.toFixed(1)}" y="${mT + ph + 16}" text-anchor="middle" font-size="10" fill="#61676e">seed ${p.seed}</text>`
  })
  if (n >= 2) {
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p.kappa).toFixed(1)}`).join(' ')
    body += `<path d="${d}" fill="none" stroke="${colors.wh2}" stroke-width="2" />`
  }
  pts.forEach((p, i) => {
    const x = xFor(i)
    const y = yFor(p.kappa)
    body += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${colors.wh2}" stroke="#fff" stroke-width="2" />`
    body += `<text x="${x.toFixed(1)}" y="${(y - 10).toFixed(1)}" text-anchor="middle" font-size="10" fill="#1f2328" font-weight="600">${p.kappa.toFixed(2)}</text>`
  })
  body += syntheticMark(W - 6, H - 6)

  return (
    `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" ` +
    `aria-label="Cohen's kappa across seeds against moderate, substantial and strong reliability bands" ` +
    `font-family="Segoe UI, system-ui, sans-serif">${body}</svg>`
  )
}

// ---------------------------------------------------------------- Chart C

/** Joint-display heatmap: evidence types x hypotheses; only interviews populated. */
export function heatmapSVG(data, colors) {
  const W = 520
  const labelW = 150
  const headerH = 26
  const rowH = 42
  const gap = 3
  const colW = (W - labelW - 8 - gap * 2) / 3
  const H = headerH + data.rows.length * rowH + 26

  let body =
    `<defs><pattern id="hm-hatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">` +
    `<rect width="7" height="7" fill="#f1f1ec" /><line x1="0" y1="0" x2="0" y2="7" stroke="#cfcfc8" stroke-width="2" /></pattern></defs>`

  // column headers
  WH_ORDER.forEach((k, ci) => {
    const x = labelW + 8 + ci * (colW + gap)
    body += `<text x="${(x + colW / 2).toFixed(1)}" y="${headerH - 8}" text-anchor="middle" font-size="12" font-weight="700" fill="${colors[k]}">${WH_LABEL[k]}</text>`
  })

  data.rows.forEach((row, ri) => {
    const y = headerH + ri * rowH
    body += `<text x="8" y="${y + rowH / 2}" dy="0.35em" font-size="11" fill="#1f2328">${esc(row.label)}</text>`
    WH_ORDER.forEach((k, ci) => {
      const x = labelW + 8 + ci * (colW + gap)
      if (row.populated && row.shares) {
        const share = row.shares[k] || 0
        const op = (0.15 + 0.85 * share).toFixed(2)
        body += `<rect x="${x.toFixed(1)}" y="${y + 3}" width="${colW.toFixed(1)}" height="${rowH - 6}" rx="4" fill="${colors[k]}" fill-opacity="${op}" />`
        body += `<text x="${(x + colW / 2).toFixed(1)}" y="${y + rowH / 2}" dy="0.35em" text-anchor="middle" font-size="11" fill="#1f2328" font-weight="600">${Math.round(share * 100)}%</text>`
      } else {
        body += `<rect x="${x.toFixed(1)}" y="${y + 3}" width="${colW.toFixed(1)}" height="${rowH - 6}" rx="4" fill="url(#hm-hatch)" stroke="#d8d8d2" stroke-width="1" />`
        if (ci === 1) {
          body += `<text x="${(x + colW / 2).toFixed(1)}" y="${y + rowH / 2}" dy="0.35em" text-anchor="middle" font-size="9.5" fill="#8a8a84">real-data phase</text>`
        }
      }
    })
  })

  body += syntheticMark(W - 6, H - 8)

  return (
    `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" ` +
    `aria-label="Joint-display heatmap of evidence types by hypothesis; only the interview row is populated from synthetic data, other rows are real-data-phase placeholders" ` +
    `font-family="Segoe UI, system-ui, sans-serif">${body}</svg>`
  )
}
