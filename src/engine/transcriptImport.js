// Bulk transcript import for REAL MODE. Pure functions only: parsing and plan
// building never touch the store, never write, and never make a network call —
// the file is read with FileReader in the page and everything below runs on the
// resulting string, in-browser.
//
// Two layouts are accepted, chosen from the header row:
//   wide  participantCode,q1,q2,…,qN   — one row per participant
//   long  participantCode,questionNumber,answer — one row per answer
// N follows the current protocol, so adding a question to the protocol changes
// the expected shape and the template together.

import { looksLikeName } from '../data/seeds'

export const EXAMPLE_CODE = 'P00'

/**
 * RFC 4180 reader. A field wrapped in double quotes may contain the delimiter,
 * CR/LF, and escaped quotes written as "" — transcript answers contain all
 * three, so none of this is optional. Returns an array of records, each an
 * array of raw field strings.
 */
export function parseDelimited(text, delimiter = ',') {
  const src = text.replace(/^﻿/, '') // strip BOM
  const records = []
  let field = ''
  let record = []
  let i = 0
  let quoted = false

  const endField = () => { record.push(field); field = '' }
  const endRecord = () => { endField(); records.push(record); record = [] }

  while (i < src.length) {
    const c = src[i]
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 2; continue } // escaped quote
        quoted = false
        i++
        continue
      }
      if (c === '\r') {
        // A newline inside quotes is part of the answer, but the file's line
        // endings are not: normalise CRLF and lone CR to \n so a Windows-saved
        // export does not put stray carriage returns into stored transcripts.
        if (src[i + 1] === '\n') i++
        field += '\n'
        i++
        continue
      }
      field += c
      i++
      continue
    }
    if (c === '"' && field === '') { quoted = true; i++; continue }
    if (c === delimiter) { endField(); i++; continue }
    if (c === '\r') { i++; continue }
    if (c === '\n') { endRecord(); i++; continue }
    field += c
    i++
  }
  if (field !== '' || record.length > 0) endRecord()
  // Drop trailing blank records produced by a final newline.
  return records.filter((r) => !(r.length === 1 && r[0].trim() === ''))
}

/** Tab-separated wins only if the header line clearly uses tabs and not commas. */
export function detectDelimiter(text) {
  const header = text.replace(/^﻿/, '').split(/\r?\n/)[0] ?? ''
  return header.includes('\t') && !header.includes(',') ? '\t' : ','
}

function csvField(v) {
  const s = String(v ?? '')
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCSV(rows) {
  return rows.map((r) => r.map(csvField).join(',')).join('\r\n') + '\r\n'
}

/**
 * The import template. The question-text row is generated from the live
 * protocol rather than stored, so it cannot drift when a question is edited.
 */
export function templateCSV(questions) {
  const header = ['participantCode', ...questions.map((_, i) => `q${i + 1}`)]
  const reference = [
    '# REFERENCE — question text. This row is ignored on import; leave it or delete it.',
    ...questions.map((q) => q.text),
  ]
  const example = [
    EXAMPLE_CODE,
    'Example answer: it contains a comma, and the phrase "quoted like this", to show how escaping works. Rows coded P00 are skipped on import.',
    ...questions.slice(1).map(() => ''),
  ]
  return toCSV([header, reference, example])
}

const norm = (s) => String(s ?? '').trim().toLowerCase()

function classifyHeader(header, questionCount) {
  const h = header.map(norm)
  if (h[0] !== 'participantcode') return { error: `First column must be "participantCode" — found "${header[0] ?? ''}".` }
  if (h.length === 3 && /^(question|questionnumber|questionno|q)$/.test(h[1]) && /^(answer|text|response)$/.test(h[2])) {
    return { format: 'long' }
  }
  const expected = Array.from({ length: questionCount }, (_, i) => `q${i + 1}`)
  if (h.length === questionCount + 1 && expected.every((e, i) => h[i + 1] === e)) {
    return { format: 'wide' }
  }
  return {
    error:
      `Header row does not match either supported layout. Expected wide format ` +
      `"participantCode,${expected.join(',')}" (${questionCount + 1} columns, matching the ` +
      `${questionCount} protocol questions) or long format "participantCode,questionNumber,answer". ` +
      `Found ${header.length} column${header.length === 1 ? '' : 's'}: ${header.join(', ')}.`,
  }
}

// A record whose code starts with # is a comment/reference line, dropped before
// anything else looks at it.
const isComment = (code) => code.trim().startsWith('#')

/**
 * Build the preview plan. Returns { ok, error, format, rows, blocking, notes }.
 * `blocking` non-empty means the batch must not be imported at all — a file the
 * reader cannot understand should never be half-applied.
 *
 * Nothing here writes: every row carries a proposed `action` the UI can change.
 */
export function buildImportPlan({ text, questions, participants, interviews }) {
  const delimiter = detectDelimiter(text)
  const records = parseDelimited(text, delimiter)
  if (records.length === 0) return { ok: false, error: 'The file is empty.' }

  const head = classifyHeader(records[0], questions.length)
  if (head.error) return { ok: false, error: head.error }
  const format = head.format
  const width = format === 'wide' ? questions.length + 1 : 3

  const blocking = []
  const body = []
  records.slice(1).forEach((rec, idx) => {
    const rowNumber = idx + 2 // header is row 1
    if (isComment(rec[0] ?? '')) return
    if (rec.length !== width) {
      blocking.push(
        `Row ${rowNumber}: expected ${width} columns, found ${rec.length}. ` +
          'Nothing has been imported — fix the row and re-select the file.',
      )
      return
    }
    body.push({ rowNumber, rec })
  })

  // ---- collect answers per participant code
  const byCode = new Map()
  const push = (code, rowNumber, answers) => {
    if (!byCode.has(code)) byCode.set(code, { code, rowNumbers: [], answers: [] })
    const e = byCode.get(code)
    e.rowNumbers.push(rowNumber)
    e.answers.push(...answers)
  }

  if (format === 'wide') {
    for (const { rowNumber, rec } of body) {
      const answers = []
      questions.forEach((q, qi) => {
        const t = (rec[qi + 1] ?? '').trim()
        // An empty cell means "not asked / not answered" and is stored as nothing.
        if (t) answers.push({ questionId: q.id, questionIndex: qi, questionText: q.text, text: t })
      })
      push(rec[0].trim(), rowNumber, answers)
    }
  } else {
    for (const { rowNumber, rec } of body) {
      const n = Number.parseInt(rec[1], 10)
      if (!Number.isInteger(n) || n < 1 || n > questions.length) {
        blocking.push(
          `Row ${rowNumber}: question number "${rec[1]}" is not between 1 and ${questions.length}.`,
        )
        continue
      }
      const t = (rec[2] ?? '').trim()
      const q = questions[n - 1]
      push(rec[0].trim(), rowNumber, t ? [{ questionId: q.id, questionIndex: n - 1, questionText: q.text, text: t }] : [])
    }
  }

  // ---- classify each participant
  const byCodeLower = new Map(participants.map((p) => [p.participantCode.toLowerCase(), p]))
  const rows = [...byCode.values()].map((e) => {
    const existing = byCodeLower.get(e.code.toLowerCase()) ?? null
    const hasTranscript = existing
      ? interviews.some((iv) => iv.personaId === existing.id)
      : false
    // In the wide layout one participant = one row, so a repeated code is a
    // duplicate. In the long layout many rows per participant is the format.
    const duplicate = format === 'wide' && e.rowNumbers.length > 1
    const example = e.code.toLowerCase() === EXAMPLE_CODE.toLowerCase()

    let status, action
    if (example) { status = 'example'; action = 'skip' }
    else if (duplicate) { status = 'duplicate'; action = 'skip' }
    else if (!existing) { status = 'unknown'; action = 'skip' }
    else if (hasTranscript) { status = 'existing-transcript'; action = 'skip' }
    else { status = 'ready'; action = 'import' }

    return {
      code: e.code,
      rowNumbers: e.rowNumbers,
      answers: e.answers.sort((a, b) => a.questionIndex - b.questionIndex),
      participantId: existing?.id ?? null,
      status,
      action, // 'import' | 'skip' | 'create' | 'overwrite' — the UI may change this
      newGroup: '',
      nameWarning: looksLikeName(e.code),
    }
  })

  const notes = []
  if (format === 'long') notes.push('Long format: one row per answer, grouped by participant code.')
  if (rows.some((r) => r.status === 'example')) {
    notes.push(`Rows coded ${EXAMPLE_CODE} are the template's example and are always skipped.`)
  }

  return { ok: blocking.length === 0, format, delimiter, rows, blocking, notes }
}

/**
 * Turn a confirmed plan into the next real dataset. Pure: it takes the current
 * dataset and returns a new one, so the caller applies it in a single commit
 * and a failure anywhere leaves the workspace untouched.
 */
export function applyImportPlan(real, rows) {
  let participants = real.participants
  let interviews = real.interviews
  let segments = real.coding.segments
  const now = new Date().toISOString()
  let counter = 0
  const imported = []

  for (const row of rows) {
    if (row.action === 'skip') continue
    let participantId = row.participantId
    if (row.action === 'create') {
      participantId = `real-${Date.now().toString(36)}-imp${counter++}`
      participants = [
        ...participants,
        {
          id: participantId,
          participantCode: row.code,
          group: row.newGroup,
          roleDescriptor: '',
          tenureBand: '',
          real: true,
          createdAt: now,
        },
      ]
    }
    if (!participantId) continue // defensive: nothing to attach to

    // Overwrite replaces the transcript AND drops its coded segments, exactly
    // as re-saving a transcript by hand does — codes derived from replaced text
    // would otherwise describe words nobody said.
    const priorIds = new Set(
      interviews.filter((iv) => iv.personaId === participantId).map((iv) => iv.id),
    )
    if (priorIds.size) {
      interviews = interviews.filter((iv) => !priorIds.has(iv.id))
      segments = segments.filter((s) => !priorIds.has(s.interviewId))
    }

    interviews = [
      ...interviews,
      {
        id: `real-iv-${participantId}-imp${counter++}`,
        personaId: participantId,
        personaName: row.code,
        real: true,
        mode: 'imported',
        seed: null,
        createdAt: now,
        updatedAt: now,
        // No lean, no secondaryLean, no contradictory: an imported answer carries
        // no pre-assigned hypothesis, exactly like a hand-entered one.
        answers: row.answers.map((a) => ({
          questionId: a.questionId,
          questionText: a.questionText,
          text: a.text,
        })),
      },
    ]
    imported.push(row.code)
  }

  return {
    next: { ...real, participants, interviews, coding: { ...real.coding, segments } },
    imported,
  }
}
