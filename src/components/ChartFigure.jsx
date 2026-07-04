// Renders a pre-built SVG string inside an accessible <figure>, with a
// caption and a visually-available table fallback so no information is
// conveyed by colour/graphics alone. Reduced-motion safe: the SVG is fully
// static (no animation carries meaning).

import { useState } from 'react'

export default function ChartFigure({ svg, caption, tableFallback, defaultOpen = false }) {
  const [showTable, setShowTable] = useState(defaultOpen)
  return (
    <figure style={{ margin: 0 }}>
      <div
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <figcaption className="small muted" style={{ marginTop: 6, display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span style={{ flex: 1 }}>{caption}</span>
        {tableFallback && (
          <button
            className="btn small secondary"
            aria-expanded={showTable}
            onClick={() => setShowTable((v) => !v)}
          >
            {showTable ? 'Hide data table' : 'Show data table'}
          </button>
        )}
      </figcaption>
      {tableFallback && showTable && <div style={{ marginTop: 8 }}>{tableFallback}</div>}
    </figure>
  )
}
