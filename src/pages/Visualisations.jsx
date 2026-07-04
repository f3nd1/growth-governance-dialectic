import PageHeader from '../components/PageHeader'
import { useWorkspace } from '../store/dataStore'
import {
  HypothesisDistributionChart,
  ReliabilityChart,
  JointHeatmapChart,
} from '../components/AppCharts'

export default function Visualisations() {
  const ws = useWorkspace()

  return (
    <>
      <PageHeader
        title="Visualisations"
        desc="Three flat charts of the pilot results. Every chart reads the same computed values as the analysis tables (κ, weights, distributions) — it never recalculates them, so the picture can never disagree with the numbers."
      />

      {ws.settings.guidance && (
        <div className="notice">
          These are validation aids for the method, drawn entirely from synthetic data.
          Each chart has a data-table fallback and is fully static (no meaning is carried by
          animation), for accessibility.
        </div>
      )}

      <section className="card">
        <h2>A · Hypothesis distribution</h2>
        <p className="small muted">
          Per-persona coded-evidence shares across WH1/WH2/WH3, plus the aggregate — the
          pattern-matching result in one glance. Paradox personas visibly occupy two columns.
        </p>
        <HypothesisDistributionChart />
      </section>

      <section className="card">
        <h2>B · Reliability over seeds</h2>
        <p className="small muted">
          Cohen’s κ for each seed against the interpretation bands. Movement across seeds is
          the sensitivity that reveals a weak instrument on synthetic data — before real fieldwork.
        </p>
        <ReliabilityChart />
      </section>

      <section className="card">
        <h2>C · Joint-display heatmap</h2>
        <p className="small muted">
          The Chapter 3 matrix as intensity. Only the interview row is populated from
          synthetic data; the financial, audit and report rows are explicit real-data-phase
          placeholders — making plain what synthetic data can and cannot validate.
        </p>
        <JointHeatmapChart />
      </section>
    </>
  )
}
