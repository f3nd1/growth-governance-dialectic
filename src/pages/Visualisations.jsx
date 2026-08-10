import PageHeader from '../components/PageHeader'
import { useWorkspace, activeData } from '../store/dataStore'
import {
  HypothesisDistributionChart,
  ReliabilityChart,
  JointHeatmapChart,
} from '../components/AppCharts'

export default function Visualisations() {
  const ws = useWorkspace()
  const isReal = activeData(ws).isReal

  return (
    <>
      <PageHeader
        title="Visualisations"
        desc={
          isReal
            ? 'Flat charts of the coded evidence. Every chart reads the same computed values as the analysis tables (κ, shares, distributions) — it never recalculates them, so the picture can never disagree with the numbers.'
            : 'Three flat charts of the pilot results. Every chart reads the same computed values as the analysis tables (κ, weights, distributions) — it never recalculates them, so the picture can never disagree with the numbers.'
        }
      />

      {ws.settings.guidance && (
        <div className="notice">
          {isReal
            ? 'These are drawn from real participant evidence and are stamped CONFIDENTIAL. '
            : 'These are validation aids for the method, drawn entirely from synthetic data. '}
          Each chart has a data-table fallback and is fully static (no meaning is carried by
          animation), for accessibility.
        </div>
      )}

      <section className="card">
        <h2>A · Hypothesis distribution</h2>
        <p className="small muted">
          {isReal
            ? 'Per-participant coded-evidence shares across WH1/WH2/WH3, plus the aggregate — the pattern-matching result in one glance. A participant whose evidence spans two columns is the dialectic showing up within one person.'
            : 'Per-persona coded-evidence shares across WH1/WH2/WH3, plus the aggregate — the pattern-matching result in one glance. Paradox personas visibly occupy two columns.'}
        </p>
        <HypothesisDistributionChart />
      </section>

      {/* Seeds exist only for generated interviews, so this whole section is
          meaningless on entered transcripts rather than merely empty. */}
      {!isReal && (
        <section className="card">
          <h2>B · Reliability over seeds</h2>
          <p className="small muted">
            Cohen’s κ for each seed against the interpretation bands. Movement across seeds is
            the sensitivity that reveals a weak instrument on synthetic data — before real fieldwork.
          </p>
          <ReliabilityChart />
        </section>
      )}

      <section className="card">
        <h2>{isReal ? 'B · Joint-display heatmap' : 'C · Joint-display heatmap'}</h2>
        <p className="small muted">
          {isReal
            ? 'The Chapter 3 matrix as intensity. Only the interview rows are populated; the financial, audit and report rows are not yet collected, making plain which evidence types the analysis currently rests on.'
            : 'The Chapter 3 matrix as intensity. Only the interview row is populated from synthetic data; the financial, audit and report rows are explicit real-data-phase placeholders — making plain what synthetic data can and cannot validate.'}
        </p>
        <JointHeatmapChart />
      </section>
    </>
  )
}
