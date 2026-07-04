// Sidebar navigation model. Route paths are defined once here and reused by
// the router and the sidebar.

export const NAV_GROUPS = [
  {
    id: 'home',
    label: 'Home',
    items: [{ path: '/', label: 'Overview' }],
  },
  {
    id: 'design',
    label: '1 · Design',
    items: [
      { path: '/design/study', label: 'Study Design' },
      { path: '/design/hypotheses', label: 'Hypotheses' },
      { path: '/design/protocol', label: 'Interview Protocol' },
      { path: '/design/codebook', label: 'Codebook' },
    ],
  },
  {
    id: 'participants',
    label: '2 · Participants',
    items: [
      { path: '/participants/builder', label: 'Persona Builder' },
      { path: '/participants/library', label: 'Persona Library' },
    ],
  },
  {
    id: 'fieldwork',
    label: '3 · Fieldwork',
    items: [
      { path: '/fieldwork/run', label: 'Run Interviews' },
      { path: '/fieldwork/transcripts', label: 'Transcripts' },
    ],
  },
  {
    id: 'analysis',
    label: '4 · Analysis',
    items: [
      { path: '/analysis/coding', label: 'Coding' },
      { path: '/analysis/reliability', label: 'Reliability' },
      { path: '/analysis/patterns', label: 'Pattern-Matching' },
      { path: '/analysis/joint-display', label: 'Joint Display' },
      { path: '/analysis/visualisations', label: 'Visualisations' },
    ],
  },
  {
    id: 'outputs',
    label: '5 · Outputs',
    items: [
      { path: '/outputs/report', label: 'Pilot Report' },
      { path: '/outputs/export', label: 'Export Centre' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    items: [
      { path: '/settings', label: 'Settings' },
      { path: '/settings/calibration', label: 'AI Calibration' },
      { path: '/settings/changelog', label: 'Change Log' },
    ],
  },
]
