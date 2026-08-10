#!/usr/bin/env node
// Prepends an entry to src/data/changelog.json describing the latest commit,
// and COMMITS that entry.
//
// Usage:
//   node scripts/log-change.mjs "message" "summary" [push|pull] [--no-commit]
//   npm run log-change -- "message" "summary"
//
// Run AFTER committing, so the entry records the commit it describes.
//
// Why this script commits, and why there is no git hook
// ----------------------------------------------------
// The script used to leave changelog.json modified and rely on the caller to
// commit it. Six entries were written and then lost to a `git checkout --` that
// was tidying the working tree: the entry existed for about a second each time.
// Generating a change and leaving it lying around is the bug, so the script now
// finishes the job itself.
//
// A post-commit hook was considered and rejected:
//   1. .git/hooks is not versioned. A fresh clone, or a rebuilt container, gets
//      nothing — and this project's contract is that `git pull && npm run dev`
//      just works. A safeguard that silently isn't there is worse than none.
//   2. A hook cannot know the summary. The summary is written by hand and is the
//      only thing the Change Log has that `git log` does not; a hook could only
//      echo the commit subject, turning the feature into a worse `git log`.
//   3. To land the entry in the commit it describes, a post-commit hook must
//      `git commit --amend` from inside the commit it is running in. That
//      rewrites history under rebase, merge and cherry-pick, and recurses
//      unless carefully guarded.
//   4. It would fire on merges, reverts and rebases, where an entry is wrong.
//
// The entry is committed SEPARATELY rather than amended into the commit it
// describes, deliberately: amending changes the hash after the entry has already
// recorded it. That is exactly how one existing entry ended up pointing at
// bfba65b, a commit that no longer exists.
//
// A skipped invocation is still possible; `npm run changelog:check` catches it.

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const argv = process.argv.slice(2)
const noCommit = argv.includes('--no-commit')
const [message, summary, action = 'push'] = argv.filter((a) => a !== '--no-commit')

if (!message || !summary) {
  console.error('Usage: node scripts/log-change.mjs "message" "summary" [push|pull] [--no-commit]')
  process.exit(1)
}
if (!['push', 'pull'].includes(action)) {
  console.error(`Unknown action "${action}" — expected push or pull`)
  process.exit(1)
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const file = join(root, 'src', 'data', 'changelog.json')

const commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim()
const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: root }).toString().trim()

const data = JSON.parse(readFileSync(file, 'utf8'))
data.entries.unshift({
  when: new Date().toISOString(),
  action,
  commit,
  branch,
  message,
  summary,
})
writeFileSync(file, JSON.stringify(data, null, 2) + '\n')

if (noCommit) {
  console.log(`Logged ${action} ${commit} (${branch}): ${message} — NOT committed (--no-commit)`)
  process.exit(0)
}

// Commit only the changelog, so an unrelated dirty working tree is left alone.
execSync('git add src/data/changelog.json', { cwd: root })
const staged = execSync('git diff --cached --name-only', { cwd: root }).toString().trim()
if (!staged) {
  console.log('Changelog already up to date — nothing to commit.')
  process.exit(0)
}
execSync(`git commit -q -m ${JSON.stringify(`chore(changelog): ${message}`)}`, { cwd: root })
const entryCommit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim()
console.log(`Logged ${action} ${commit} (${branch}): ${message}`)
console.log(`Committed as ${entryCommit} — push both commits together.`)
