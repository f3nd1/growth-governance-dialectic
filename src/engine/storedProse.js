// Provenance check over RESEARCHER-AUTHORED text.
//
// Some of what the app prints is not app copy at all: the study-design fields
// and the pattern-matching note are stored in the workspace and edited by the
// researcher. The app must not rewrite them — they are the researcher's words,
// and a tool that silently reworded a methods statement would be worse than one
// that printed a stale one.
//
// What it CAN do is notice. A workspace in real mode whose stored prose still
// describes a synthetic pilot produces a document that asserts real participant
// data in its header and denies any findings in its body. This flags that, names
// the field, and points at the page that edits it.

/** Whole words only: "personally" is not a persona reference. */
const SYNTHETIC_PROSE = /\bsynthetic\w*\b|\bpersonas?\b/i

/**
 * Stored prose that reaches a reader. Each entry names where it is edited, so
 * the warning can say what to do rather than only what is wrong.
 */
function storedFields(ws) {
  const sd = ws.studyDesign ?? {}
  return [
    { key: 'title', label: 'Working title', where: 'Study Design', path: '/design/study', text: sd.title },
    { key: 'design', label: 'Design', where: 'Study Design', path: '/design/study', text: sd.design },
    { key: 'summary', label: 'Design summary', where: 'Study Design', path: '/design/study', text: sd.summary },
    { key: 'unitOfAnalysis', label: 'Unit of analysis', where: 'Study Design', path: '/design/study', text: sd.unitOfAnalysis },
    { key: 'pilotPurpose', label: 'Purpose of this pilot', where: 'Study Design', path: '/design/study', text: sd.pilotPurpose },
    {
      key: 'splitNote',
      label: 'Pattern-matching cut-point note',
      where: 'Settings',
      path: '/settings',
      text: ws.settings?.patternMatching?.note,
    },
  ]
}

/**
 * Fields whose stored text still describes a synthetic pilot. Returns [] in
 * synthetic mode, where that wording is correct.
 */
export function staleSyntheticProse(ws) {
  if (ws.mode !== 'real') return []
  return storedFields(ws)
    .filter((f) => SYNTHETIC_PROSE.test(String(f.text ?? '')))
    .map((f) => ({
      ...f,
      excerpt: String(f.text)
        .split(/(?<=[.!?])\s+/)
        .find((s) => SYNTHETIC_PROSE.test(s))
        ?.trim(),
    }))
}
