#!/usr/bin/env node
// Prepends an entry to src/data/changelog.json using the latest git commit.
//
// Usage:
//   node scripts/log-change.mjs "message" "summary" [push|pull]
//   npm run log-change -- "message" "summary"
//
// Run AFTER committing so the entry records the commit it describes; then
// amend or commit the changelog update.

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const [message, summary, action = 'push'] = process.argv.slice(2)

if (!message || !summary) {
  console.error('Usage: node scripts/log-change.mjs "message" "summary" [push|pull]')
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
console.log(`Logged ${action} ${commit} (${branch}): ${message}`)
