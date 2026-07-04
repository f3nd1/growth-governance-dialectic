// Reusable, self-contained chart components. Each reads the SAME selectors
// the tables use (via vizData) and renders the pure SVG builder, so any page
// can drop one in and it will always agree with that page's numbers.

import { Link } from 'react-router-dom'
import ChartFigure from './ChartFigure'
import { useWorkspace } from '../store/dataStore'
import {
  hypothesisColors,
  hypothesisDistributionData,
  reliabilitySeriesData,
  heatmapData,
} from '../engine/vizData'
import { hypothesisDistributionSVG, reliabilitySVG, heatmapSVG } from '../engine/charts'
import { kappaBand } from '../engine/coding'

const WH = ['wh1', 'wh2', 'wh3']

function EmptyChart({ children }) {
  return <div className="card muted small">{children}</div>
}

export function HypothesisDistributionChart() {
  const ws = useWorkspace()
  const colors = hypothesisColors(ws)
  const data = hypothesisDistributionData(ws)
  if (!data.hasData) {
    return (
      <EmptyChart>
        No aggregated evidence yet — <Link to="/analysis/coding">code some interviews</Link> to
        plot the hypothesis distribution.
      </EmptyChart>
    )
  }
  const svg = hypothesisDistributionSVG(data, colors)
  const rows = [...data.rows, data.aggregate]
  const fallback = (
    <table className="data">
      <thead>
        <tr><th>Participant (synthetic)</th>{WH.map((k) => <th key={k}>{ws.hypotheses[k].short}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={r.isAggregate ? { fontWeight: 700 } : {}}>
            <td>{r.paradox ? '⚡ ' : ''}{r.label}</td>
            {WH.map((k) => <td key={k}>{Math.round((r.shares[k] || 0) * 100)}%</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
  return (
    <ChartFigure
      svg={svg}
      caption="Reads synthetic pilot data — per-persona coded-evidence shares across WH1/WH2/WH3, with the aggregate pattern-matching result. ⚡ marks paradox personas split across two hypotheses."
      tableFallback={fallback}
    />
  )
}

export function ReliabilityChart() {
  const ws = useWorkspace()
  const colors = hypothesisColors(ws)
  const data = reliabilitySeriesData(ws)
  if (data.points.length === 0) {
    return (
      <EmptyChart>
        No coded segments yet — <Link to="/analysis/coding">run the coders</Link> to plot κ.
      </EmptyChart>
    )
  }
  const svg = reliabilitySVG(data, colors)
  const fallback = (
    <table className="data">
      <thead><tr><th>Seed</th><th>N segments</th><th>Cohen’s κ</th><th>Band</th></tr></thead>
      <tbody>
        {data.points.map((p) => (
          <tr key={p.seed}>
            <td>{p.seed}</td><td>{p.n}</td><td>{p.kappa.toFixed(3)}</td><td>{kappaBand(p.kappa).label}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
  return (
    <>
      <ChartFigure
        svg={svg}
        caption="Reads synthetic pilot data — Cohen’s κ per seed against the moderate / substantial / strong bands. Catching a weak instrument here, before real fieldwork, is the point of piloting."
        tableFallback={fallback}
      />
      {data.points.length < 2 && (
        <p className="small muted" style={{ marginTop: 6 }}>
          Only one seed run so far — <Link to="/fieldwork/run">Re-run (seed)</Link> a persona set
          to plot stability across seeds.
        </p>
      )}
    </>
  )
}

export function JointHeatmapChart() {
  const ws = useWorkspace()
  const colors = hypothesisColors(ws)
  const data = heatmapData(ws)
  const svg = heatmapSVG(data, colors)
  const fallback = (
    <table className="data">
      <thead>
        <tr><th>Evidence type</th>{WH.map((k) => <th key={k}>{ws.hypotheses[k].short}</th>)}</tr>
      </thead>
      <tbody>
        {data.rows.map((r) => (
          <tr key={r.label}>
            <td>{r.label}</td>
            {WH.map((k) => (
              <td key={k}>{r.populated && r.shares ? `${Math.round((r.shares[k] || 0) * 100)}%` : 'real-data phase'}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
  return (
    <ChartFigure
      svg={svg}
      caption="Reads synthetic pilot data — evidence strength per hypothesis. Only the interview row is populated (synthetic); financial, audit and report rows are hatched real-data-phase placeholders."
      tableFallback={fallback}
    />
  )
}
