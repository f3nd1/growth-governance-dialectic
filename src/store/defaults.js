// Initial workspace state. Everything in this app is SYNTHETIC pilot data —
// this default shape is the single source of truth for the data model.

import { defaultProtocolQuestions, defaultCodebookCodes, defaultPersonas } from '../data/seeds'

export const HYPOTHESIS_IDS = ['wh1', 'wh2', 'wh3']

export function defaultWorkspace() {
  return {
    meta: {
      version: 1,
      synthetic: true, // non-removable stamp; exports read this
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    studyDesign: {
      title: 'The growth-vs-governance dialectic in an SME private education institution',
      design: 'Convergent mixed-methods single-case study',
      summary:
        'A convergent mixed-methods single-case design examining how corporate governance ' +
        'practices interact with business growth pursuits in a small-to-medium private ' +
        'education institution. Qualitative strand: semi-structured interviews and focus ' +
        'groups with internal stakeholders. Quantitative strand: financial, enrolment and ' +
        'audit/risk indicators. Strands are analysed independently and merged in a ' +
        'pattern-matching joint display against three rival propositions.',
      unitOfAnalysis: 'The institution as a single case; stakeholder groups as embedded units.',
      pilotPurpose:
        'This pilot validates the INSTRUMENT (protocol, codebook, dual-coding and ' +
        'pattern-matching procedure) on synthetic participants before real fieldwork. ' +
        'It produces no findings about the institution.',
    },
    hypotheses: {
      wh1: {
        id: 'wh1',
        label: 'WH1 · Governance constrains growth',
        short: 'WH1',
        color: '#c2410c',
        description:
          'Governance NEGATIVELY affects business pursuits: compliance work diverts ' +
          'resources, adds bureaucracy and delays commercial decisions.',
      },
      wh2: {
        id: 'wh2',
        label: 'WH2 · Governance enables growth',
        short: 'WH2',
        color: '#0e7490',
        description:
          'Governance POSITIVELY affects business pursuits: it stabilises operations, ' +
          'signals trustworthiness to students/agents/regulators and improves decision quality.',
      },
      wh3: {
        id: 'wh3',
        label: 'WH3 · No discernible effect',
        short: 'WH3',
        color: '#6b7280',
        description:
          'No discernible effect: governance and business pursuits are experienced as ' +
          'separate functions; outcomes are attributed to external factors.',
      },
    },
    protocol: { questions: defaultProtocolQuestions() },
    codebook: { codes: defaultCodebookCodes() },
    personas: defaultPersonas(),
    interviews: [], // Phase 4
    coding: { segments: [], overridesLog: [] }, // Phase 5
    settings: {
      openai: { enabled: false, key: '', analysisModel: 'gpt-4o', utilityModel: 'gpt-4o-mini' },
      supabase: { url: '', anonKey: '' },
      developer: false,
      guidance: true,
      // Guided-setup: the ONLY persisted field is whether the card is minimised.
      // All step progress is derived from data, never stored.
      setupGuide: { dismissed: false },
      reliability: {
        // Cohen's kappa band cut-points; editable on the Reliability page.
        thresholds: { strong: 0.8, substantial: 0.6 },
        citation:
          'Bands follow Landis & Koch (1977): κ 0.61–0.80 substantial, ≥ 0.81 almost perfect. ' +
          'McHugh (2012) cautions these are lenient for high-stakes coding and suggests ≥ 0.80 ' +
          'as a stricter floor. Adjust the cut-points to the convention you report against.',
      },
    },
    calibration: { runs: [] }, // Phase 7
  }
}
