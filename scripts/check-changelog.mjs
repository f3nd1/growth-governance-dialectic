#!/usr/bin/env node
// Fails if a recent commit has no Change Log entry.
//
//   node scripts/check-changelog.mjs           (checks every commit after the
//                                               baseline in changelog.json)
//   npm run changelog:check
//
// log-change.mjs now commits the entry it writes, so an entry can no longer be
// generated and then lost. This catches the other failure: forgetting to run
// log-change at all. It is a check, not an automation — see the note in
// log-change.mjs on why this project has no git hook.

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const git = (cmd) => execSync(cmd, { cwd: root }).toString().trim()
const book = JSON.parse(readFileSync(join(root, 'src', 'data', 'changelog.json'), 'utf8'))
const logged = book.entries.map((e) => e.commit)

// Entries written before the baseline recorded the hash of the changelog commit
// rather than the commit they describe, so they cannot be matched by hash. They
// are grandfathered rather than papered over.
const base = book.checkFrom

// A commit is covered if any entry's hash prefixes it or vice versa — entries
// store short hashes and the two lengths need not match.
const covered = (sha) => logged.some((l) => sha.startsWith(l) || l.startsWith(sha))

const range = base ? `${base}..HEAD` : 'HEAD'
const commits = git(`git log ${range} --no-merges --format=%h%x09%s`)
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [sha, ...rest] = line.split('\t')
    return { sha, subject: rest.join('\t') }
  })
  // The changelog commits themselves describe no change of their own.
  .filter((c) => !c.subject.startsWith('chore(changelog)'))

const missing = commits.filter((c) => !covered(c.sha))

if (missing.length === 0) {
  console.log(
    `changelog: all ${commits.length} commit(s) since ${base ?? 'the start'} are logged.`,
  )
  process.exit(0)
}

console.error(`changelog: ${missing.length} commit(s) since ${base} with no entry:\n`)
for (const c of missing) console.error(`  ${c.sha}  ${c.subject}`)
console.error('\nAdd each with:  npm run log-change -- "message" "summary"')
process.exit(1)
