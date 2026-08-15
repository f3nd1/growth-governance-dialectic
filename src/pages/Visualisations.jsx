import PageHeader from '../components/PageHeader'
import { useWorkspace, activeData } from '../store/dataStore'
import {
  HypothesisDistributionChart,
  ReliabilityChart,
  JointHeatmapChart,
} from '../components/AppCharts'
import { evidenceCoverage, listTypes, sentenceCase } from '../engine/sources'
import { visibleJointRows } from '../data/jointDisplayMatrix'

export default function Visualisations() {
  const ws = useWorkspace()
  const data = activeData(ws)
  const isReal = data.isReal
  const coverage = evidenceCoverage(data.interviews, data.coding.segments)
  // Which synthetic rows carry simulated evidence and which are placeholders is
  // a property of the row definitions, so the caption reads them.
  const synRows = visibleJointRows(ws.settings, 'synthetic')
  const synPopulated = synRows.filter((r) => r.populatedBy)
  const synPlaceholder = synRows.filter((r) => !r.populatedBy)
  const listRows = (rows) => {
    const names = rows.map((r) => `the ${r.label.toLowerCase()} row`)
    if (names.length === 0) return 'no row'
    if (names.length === 1) return names[0]
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
  }

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
            ? // Same derivation as the Joint Display's claims card: one corpus, one
              // account of what it holds, so the two pages cannot disagree.
              'The Chapter 3 matrix as intensity, by stakeholder group. ' +
              (coverage.populated.length === 0
                ? 'Nothing is coded yet, so no row carries intensity.'
                : `Intensity currently rests on ${listTypes(coverage.populated)}` +
                  (coverage.uncollected.length > 0
                    ? `; ${listTypes(coverage.uncollected)} ` +
                      `${coverage.uncollected.length === 1 ? 'has' : 'have'} not been collected, ` +
                      'making plain which evidence types the analysis currently rests on.'
                    : ' — every evidence type is now represented.'))
            : // Named from the synthetic row definitions rather than written
              // down: the rows this once called financial, audit and report
              // had already been replaced when the sentence was left behind.
              'The Chapter 3 matrix as intensity. ' +
              `${sentenceCase(listRows(synPopulated))} ` +
              `${synPopulated.length === 1 ? 'is' : 'are'} populated from synthetic data; ` +
              `${listRows(synPlaceholder)} ` +
              `${synPlaceholder.length === 1 ? 'is an explicit placeholder' : 'are explicit placeholders'}` +
              ' for the real-data phase — making plain what synthetic data can and cannot validate.'}
        </p>
        <JointHeatmapChart />
      </section>
    </>
  )
}
