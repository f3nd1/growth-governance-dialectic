// Candidate emergent codes — separating "fits no pattern at all" from "fits a
// recurring pattern nobody has named yet".
//
// A segment that no a priori code matched lands as UNCLASSIFIED. That is two
// different situations wearing one label. This pass groups the unclassified
// segments by shared significant vocabulary: a group spanning two or more
// personas becomes a CANDIDATE emergent code for researcher review; a segment
// with no thematic sibling stays unclassified, which is a legitimate result and
// stays visible and counted.
//
// ponytail: deliberately word-overlap, not embeddings/TF-IDF. At pilot scale
// (~100 segments) real similarity detection is disproportionate and would add a
// dependency; swap the sibling test here if a corpus ever outgrows it.
//
// This is a DERIVED read over existing segments. It never mutates coderA or
// coderB, so inter-coder agreement and kappa are computed on exactly the codes
// the two coders assigned — promotion to a real code stays a researcher action.

import { words, effectiveCode, UNCLASSIFIED } from './coding'

// Two unclassified segments are thematic siblings if they share at least this
// many significant words. Three is strict enough to reject incidental overlap
// at pilot scale.
export const SIBLING_WORD_THRESHOLD = 3

const significant = (text) => new Set(words(text))

function sharedWords(a, b) {
  const bw = significant(b)
  return [...significant(a)].filter((w) => bw.has(w))
}

function titleCase(w) {
  return w.charAt(0).toUpperCase() + w.slice(1)
}

/**
 * findEmergentCandidates(segments, codebook)
 *   -> { candidates: [...], unclassified: [...], counts: {...} }
 *
 * candidates: clusters of >=2 unclassified segments from different personas
 * that share vocabulary, each with a PROPOSED label and definition drawn from
 * the shared language — never invented from a single instance.
 */
export function findEmergentCandidates(segments, codebook) {
  const codeGroup = (id) => codebook.codes.find((c) => c.id === id)?.group
  // Segments no a priori code claimed. Anything already sitting in a named
  // emergent code is classified, so it is out of scope here.
  const pool = segments.filter((s) => {
    const code = effectiveCode(s)
    return code === UNCLASSIFIED || codeGroup(code) === undefined
  })

  // Greedy connected-components over the sibling relation.
  const seen = new Set()
  const clusters = []
  for (const seg of pool) {
    if (seen.has(seg.id)) continue
    const cluster = [seg]
    seen.add(seg.id)
    for (const other of pool) {
      if (seen.has(other.id)) continue
      // Compare against any member already in the cluster.
      const link = cluster.some(
        (m) => sharedWords(m.text, other.text).length >= SIBLING_WORD_THRESHOLD,
      )
      if (link) {
        cluster.push(other)
        seen.add(other.id)
      }
    }
    clusters.push(cluster)
  }

  const candidates = []
  const unclassified = []

  for (const cluster of clusters) {
    const personas = new Set(cluster.map((s) => s.personaId))
    const interviews = new Set(cluster.map((s) => s.interviewId))
    // A pattern needs corroboration beyond one speaker/session to be a pattern.
    if (cluster.length < 2 || (personas.size < 2 && interviews.size < 2)) {
      unclassified.push(...cluster)
      continue
    }

    // Vocabulary shared across the cluster, most widespread first.
    const freq = {}
    for (const s of cluster) for (const w of significant(s.text)) freq[w] = (freq[w] ?? 0) + 1
    // Most widespread first; on ties prefer the longer word, which is almost
    // always the more distinctive one ("couriering" over "actually").
    const shared = Object.entries(freq)
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length || a[0].localeCompare(b[0]))
      .map(([w]) => w)

    const keywords = shared.slice(0, 3)
    candidates.push({
      id: `cand-${cluster.map((s) => s.id).sort()[0]}`,
      label: keywords.length ? keywords.map(titleCase).join(' / ') : 'Unnamed recurring theme',
      definition:
        `CANDIDATE — proposed from ${cluster.length} segments across ` +
        `${personas.size} persona${personas.size === 1 ? '' : 's'} that no a priori code matched. ` +
        `Shared language: ${shared.slice(0, 8).join(', ') || '—'}. ` +
        'Rewrite this definition in your own terms, with inclusion/exclusion criteria, before approving.',
      keywords: shared.slice(0, 8),
      segments: cluster,
      personaNames: [...new Set(cluster.map((s) => s.personaName))],
    })
  }

  return {
    candidates: candidates.sort((a, b) => b.segments.length - a.segments.length),
    unclassified,
    counts: {
      candidateSegments: candidates.reduce((n, c) => n + c.segments.length, 0),
      unclassifiedSegments: unclassified.length,
      candidates: candidates.length,
    },
  }
}

/** Shape a reviewed candidate into a real emergent codebook entry. */
export function candidateToCode(candidate) {
  return {
    id: `c-emergent-${candidate.id}`,
    group: 'emergent',
    label: candidate.label,
    definition: candidate.definition,
  }
}
