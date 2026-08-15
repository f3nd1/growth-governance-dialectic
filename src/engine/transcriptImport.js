// Bulk transcript import for REAL MODE. Pure functions only: parsing and plan
// building never touch the store, never write, and never make a network call —
// the file is read with FileReader in the page and everything below runs on the
// resulting string, in-browser.
//
// Three layouts are accepted, chosen from the header row:
//   wide  participantCode,q1,q2,…,qN   — one row per participant
//   long  participantCode,questionNumber,answer — one row per answer
//   long+ participantCode,questionNumber,answer,sourceType,source — as long,
//         plus focus groups and documentary sources
// N follows the current protocol, so adding a question to the protocol changes
// the expected shape and the template together.
//
// In every layout column 1 is WHOEVER SAID IT — the same rule the rest of the
// app attributes by. That is why a focus-group turn puts the speaker there and
// a document extract leaves it empty: a document has no speaker, and inventing
// one would attribute an organisational record to a person.

import { looksLikeName, FOCUS_GROUPS } from '../data/seeds'
import { focusGroupLabel } from './sources'

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

/**
 * Template for the extended long layout. Interviews, focus groups and documents
 * in one file; the example rows show what each type puts in which column.
 */
export function sourcesTemplateCSV(questions, fgQuestions = [], focusGroups = FOCUS_GROUPS) {
  // Every row here starts with # and is dropped on import. The interview
  // template uses a live P00 example row, but that trick does not carry: a
  // document must leave column 1 EMPTY, so an example document row would have
  // no code to mark it skippable and would import itself. Showing the shape in
  // comments is the version that cannot half-work.
  return toCSV([
    ['participantCode', 'questionNumber', 'answer', 'sourceType', 'source'],
    [
      '# REFERENCE — column 1 is WHO SAID IT. Delete these # rows and add your own. ' +
        `Interview protocol has ${questions.length} question${questions.length === 1 ? '' : 's'}: ` +
        `q1 = ${questions[0]?.text ?? ''}`,
      '',
      '',
      '',
      '',
    ],
    ['# P01', '1', 'Interview: the interviewee in column 1, questionNumber 1-' + questions.length + ', source left empty.', 'interview', ''],
    [
      '# P01',
      '1',
      `Focus group: the SPEAKER of this turn in column 1 — required, a turn without one is rejected. questionNumber is the FOCUS GROUP question 1-${fgQuestions.length} and may be left blank for a turn that answers none of them.`,
      'focus-group',
      focusGroups[0]?.id ?? '',
    ],
    // Pulled from the live focus group protocol, like the interview reference
    // row above it, so neither can go stale when a question is edited.
    ...fgQuestions.map((q, i) => [`# FG${i + 1}`, '', q.text, '', '']),
    [
      '#',
      '',
      'Document: column 1 EMPTY — a document has no speaker — and the title in source. One row per extract.',
      'document',
      'Board minutes FY2023-24',
    ],
    [
      `# Focus group ids: ${focusGroups.map((g) => g.id).join(' | ')}`,
      '',
      '',
      '',
      '',
    ],
  ])
}

const norm = (s) => String(s ?? '').trim().toLowerCase()

function classifyHeader(header, questionCount) {
  const h = header.map(norm)
  if (h[0] !== 'participantcode') return { error: `First column must be "participantCode" — found "${header[0] ?? ''}".` }
  const isLongPair =
    /^(question|questionnumber|questionno|q)$/.test(h[1] ?? '') &&
    /^(answer|text|response)$/.test(h[2] ?? '')
  if (h.length === 3 && isLongPair) return { format: 'long' }
  if (
    h.length === 5 &&
    isLongPair &&
    /^(sourcetype|type)$/.test(h[3] ?? '') &&
    /^(source|session|sourcelabel)$/.test(h[4] ?? '')
  ) {
    return { format: 'long+' }
  }
  const expected = Array.from({ length: questionCount }, (_, i) => `q${i + 1}`)
  if (h.length === questionCount + 1 && expected.every((e, i) => h[i + 1] === e)) {
    return { format: 'wide' }
  }
  return {
    error:
      `Header row does not match either supported layout. Expected wide format ` +
      `"participantCode,${expected.join(',')}" (${questionCount + 1} columns, matching the ` +
      `${questionCount} protocol questions), long format "participantCode,questionNumber,answer", ` +
      `or extended long format "participantCode,questionNumber,answer,sourceType,source". ` +
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
export function buildImportPlan({ text, questions, fgQuestions = [], participants, interviews }) {
  const delimiter = detectDelimiter(text)
  const records = parseDelimited(text, delimiter)
  if (records.length === 0) return { ok: false, error: 'The file is empty.' }

  const head = classifyHeader(records[0], questions.length)
  if (head.error) return { ok: false, error: head.error }
  const format = head.format
  const width = format === 'wide' ? questions.length + 1 : format === 'long+' ? 5 : 3

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

  // ---- collect answers per SESSION. For an interview the participant is the
  // session; a focus group and a document are sessions in their own right, with
  // many speakers or none.
  const bySession = new Map()
  const key = (type, label, code) => (type === 'interview' ? `interview::${code.toLowerCase()}` : `${type}::${label.toLowerCase()}`)
  const push = (type, label, code, rowNumber, answers) => {
    const k = key(type, label, code)
    if (!bySession.has(k)) bySession.set(k, { sourceType: type, sourceLabel: label, code, rowNumbers: [], answers: [] })
    const e = bySession.get(k)
    e.rowNumbers.push(rowNumber)
    e.answers.push(...answers)
  }

  const fgByKey = new Map(
    FOCUS_GROUPS.flatMap((g) => [[g.id.toLowerCase(), g], [g.label.toLowerCase(), g]]),
  )

  if (format === 'wide') {
    for (const { rowNumber, rec } of body) {
      const answers = []
      questions.forEach((q, qi) => {
        const t = (rec[qi + 1] ?? '').trim()
        // An empty cell means "not asked / not answered" and is stored as nothing.
        if (t) answers.push({ questionId: q.id, questionIndex: qi, questionText: q.text, text: t })
      })
      push('interview', '', rec[0].trim(), rowNumber, answers)
    }
  } else {
    for (const { rowNumber, rec } of body) {
      const code = (rec[0] ?? '').trim()
      const text = (rec[2] ?? '').trim()
      const type = format === 'long+' ? (norm(rec[3]) || 'interview') : 'interview'
      const source = format === 'long+' ? (rec[4] ?? '').trim() : ''

      if (!['interview', 'focus-group', 'document'].includes(type)) {
        blocking.push(`Row ${rowNumber}: sourceType "${rec[3]}" is not one of interview, focus-group, document.`)
        continue
      }

      if (type === 'interview') {
        const n = Number.parseInt(rec[1], 10)
        if (!Number.isInteger(n) || n < 1 || n > questions.length) {
          blocking.push(
            `Row ${rowNumber}: question number "${rec[1]}" is not between 1 and ${questions.length}.`,
          )
          continue
        }
        if (!code) {
          blocking.push(`Row ${rowNumber}: an interview row needs a participantCode in column 1.`)
          continue
        }
        const q = questions[n - 1]
        push('interview', '', code, rowNumber, text ? [{ questionId: q.id, questionIndex: n - 1, questionText: q.text, text }] : [])
        continue
      }

      if (type === 'focus-group') {
        const group = fgByKey.get(source.toLowerCase())
        if (!group) {
          blocking.push(
            `Row ${rowNumber}: source "${source}" is not a known focus group. Use one of: ` +
              `${FOCUS_GROUPS.map((g) => g.id).join(', ')}.`,
          )
          continue
        }
        // The requirement this enforces: a turn with no speaker is REJECTED
        // here rather than attributed to the group as a whole, which would put
        // words in a person's row that no person was recorded as saying.
        if (!code && text) {
          blocking.push(
            `Row ${rowNumber}: focus-group turn has no speaker code in column 1. Every turn must ` +
              'name who spoke — nothing is imported until it does.',
          )
          continue
        }
        // questionNumber on a focus-group row indexes the FOCUS GROUP
        // protocol, not the interview one, and may be blank: a group
        // discussion produces turns that answer nothing on the schedule.
        const qn = (rec[1] ?? '').trim()
        let q = null
        if (qn) {
          const n = Number.parseInt(qn, 10)
          if (!Number.isInteger(n) || n < 1 || n > fgQuestions.length) {
            blocking.push(
              `Row ${rowNumber}: focus-group question number "${qn}" is not between 1 and ` +
                `${fgQuestions.length}, the focus group protocol's questions. Leave it blank ` +
                'for a turn that answers none of them.',
            )
            continue
          }
          q = fgQuestions[n - 1]
        }
        if (text) {
          push('focus-group', group.id, group.label, rowNumber, [
            { text, speakerCode: code, questionId: q?.id ?? null, questionText: q?.text ?? '' },
          ])
        }
        continue
      }

      // document
      if (!source) {
        blocking.push(`Row ${rowNumber}: a document row needs a title in the source column.`)
        continue
      }
      if (code) {
        blocking.push(
          `Row ${rowNumber}: a document has no speaker, but column 1 holds "${code}". Leave it empty.`,
        )
        continue
      }
      if (text) push('document', source, source, rowNumber, [{ text }])
    }
  }

  // ---- classify each session
  const byCodeLower = new Map(participants.map((p) => [p.participantCode.toLowerCase(), p]))
  const rows = [...bySession.values()].map((e) => {
    if (e.sourceType === 'focus-group') {
      // Resolved here, once, so attribution at coding time is a lookup and not
      // a guess. An unrecognised speaker blocks the file rather than being
      // created: a focus-group roster is not the place to mint participants.
      const unknown = new Set()
      const answers = e.answers.map((a) => {
        const p = byCodeLower.get(a.speakerCode.toLowerCase())
        if (!p) unknown.add(a.speakerCode)
        return { ...a, speakerParticipantId: p?.id ?? null }
      })
      if (unknown.size) {
        blocking.push(
          `${e.code}: speaker code${unknown.size === 1 ? '' : 's'} ${[...unknown].join(', ')} ` +
            `${unknown.size === 1 ? 'has' : 'have'} no participant record. Add ` +
            `${unknown.size === 1 ? 'it' : 'them'} on Participant Records first.`,
        )
      }
      const existing = interviews.filter((iv) => iv.focusGroupId === e.sourceLabel)
      return {
        ...e, answers,
        participantId: null,
        existingSessionIds: existing.map((iv) => iv.id),
        status: existing.length ? 'existing-transcript' : 'ready',
        action: existing.length ? 'skip' : 'import',
        newGroup: '',
        nameWarning: [...new Set(e.answers.map((a) => a.speakerCode))].some(looksLikeName),
      }
    }

    if (e.sourceType === 'document') {
      const existing = interviews.filter(
        (iv) => iv.sourceType === 'document' && iv.title === e.sourceLabel,
      )
      return {
        ...e,
        participantId: null,
        existingSessionIds: existing.map((iv) => iv.id),
        status: existing.length ? 'existing-transcript' : 'ready',
        action: existing.length ? 'skip' : 'import',
        newGroup: '',
        nameWarning: false,
      }
    }

    const existing = byCodeLower.get(e.code.toLowerCase()) ?? null
    const priorSessions = existing
      ? interviews.filter((iv) => iv.personaId === existing.id && (iv.sourceType ?? 'interview') === 'interview')
      : []
    // In the wide layout one participant = one row, so a repeated code is a
    // duplicate. In the long layout many rows per participant is the format.
    const duplicate = format === 'wide' && e.rowNumbers.length > 1
    const example = e.code.toLowerCase() === EXAMPLE_CODE.toLowerCase()

    let status, action
    if (example) { status = 'example'; action = 'skip' }
    else if (duplicate) { status = 'duplicate'; action = 'skip' }
    else if (!existing) { status = 'unknown'; action = 'skip' }
    else if (priorSessions.length) { status = 'existing-transcript'; action = 'skip' }
    else { status = 'ready'; action = 'import' }

    return {
      ...e,
      answers: e.answers.sort((a, b) => a.questionIndex - b.questionIndex),
      participantId: existing?.id ?? null,
      existingSessionIds: priorSessions.map((iv) => iv.id),
      status,
      action, // 'import' | 'skip' | 'create' | 'overwrite' — the UI may change this
      newGroup: '',
      nameWarning: looksLikeName(e.code),
    }
  })

  const notes = []
  if (format === 'long') notes.push('Long format: one row per answer, grouped by participant code.')
  if (format === 'long+') {
    notes.push('Extended long format: one row per answer, turn or extract, grouped into sessions by type and source.')
  }
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

    // Overwrite replaces the session AND drops its coded segments, exactly as
    // re-saving a transcript by hand does — codes derived from replaced text
    // would otherwise describe words nobody said.
    const priorIds = new Set(row.existingSessionIds ?? [])
    if (priorIds.size) {
      interviews = interviews.filter((iv) => !priorIds.has(iv.id))
      segments = segments.filter((s) => !priorIds.has(s.interviewId))
    }

    const base = {
      real: true,
      mode: 'imported',
      seed: null,
      createdAt: now,
      updatedAt: now,
    }

    if (row.sourceType === 'focus-group') {
      const id = `real-fg-${row.sourceLabel}-imp${counter++}`
      interviews = [
        ...interviews,
        {
          ...base,
          id,
          sourceType: 'focus-group',
          focusGroupId: row.sourceLabel,
          participantCodes: [...new Set(row.answers.map((a) => a.speakerCode))],
          // No single interviewee: each TURN carries its own speaker, matching a
          // focus group entered by hand.
          personaId: null,
          personaName: row.code,
          answers: row.answers.map((a) => ({
            questionId: a.questionId ?? null,
            questionText: a.questionText ?? '',
            text: a.text,
            speakerCode: a.speakerCode,
            speakerParticipantId: a.speakerParticipantId ?? null,
          })),
        },
      ]
      imported.push({ id, sourceType: 'focus-group', label: focusGroupLabel(row.sourceLabel) })
      continue
    }

    if (row.sourceType === 'document') {
      const id = `real-doc-${Date.now().toString(36)}-imp${counter++}`
      interviews = [
        ...interviews,
        {
          ...base,
          id,
          sourceType: 'document',
          title: row.sourceLabel,
          docType: 'other',
          periodLabel: '',
          // Its own id, matching no participant — what puts it in the
          // Documentary evidence row rather than a person's.
          personaId: id,
          personaName: row.sourceLabel,
          answers: row.answers.map((a) => ({ questionId: null, questionText: '', text: a.text })),
        },
      ]
      imported.push({ id, sourceType: 'document', label: row.sourceLabel })
      continue
    }

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

    const id = `real-iv-${participantId}-imp${counter++}`
    interviews = [
      ...interviews,
      {
        ...base,
        id,
        sourceType: 'interview',
        personaId: participantId,
        personaName: row.code,
        // No lean, no secondaryLean, no contradictory: an imported answer carries
        // no pre-assigned hypothesis, exactly like a hand-entered one.
        answers: row.answers.map((a) => ({
          questionId: a.questionId,
          questionText: a.questionText,
          text: a.text,
        })),
      },
    ]
    imported.push({ id, sourceType: 'interview', label: row.code })
  }

  return {
    next: { ...real, participants, interviews, coding: { ...real.coding, segments } },
    imported,
  }
}
