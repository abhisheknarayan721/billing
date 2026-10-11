// Backs up the database DATABASE_URL points at — local PostgreSQL or Supabase —
// to backups/<database>-<host>-<timestamp>.dump (pg_dump custom format).
//
//   npm run db:backup
//
// Restore into an EMPTY database with:
//   pg_restore --no-owner --no-privileges -d "<url>" backups/<file>.dump
//
// Only the `public` schema is dumped. On Supabase the other schemas (auth,
// storage, realtime, ...) belong to Supabase and are not the app's data.

import { execFileSync } from 'node:child_process'
import { mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import nextEnv from '@next/env'

import { findPgTool, toLibpqUrl } from './pg-tools.mjs'

// CommonJS module, so no named import.
nextEnv.loadEnvConfig(process.cwd())

const raw = process.env.DATABASE_URL
if (!raw) {
  console.error('[db-backup] DATABASE_URL is not set. Add it to .env at the project root.')
  process.exit(1)
}

const url = toLibpqUrl(raw)
const database = url.pathname.replace(/^\//, '') || 'postgres'
const host = url.hostname.split('.')[0]
const stamp = new Date().toISOString().replace(/[:T]/g, '-').replace(/\..+$/, '')
mkdirSync('backups', { recursive: true })
const file = join('backups', `${database}-${host}-${stamp}.dump`)

console.log(`[db-backup] Dumping ${database} on ${url.hostname} ...`)
try {
  execFileSync(
    findPgTool('pg_dump'),
    ['--format=custom', '--no-owner', '--no-privileges', '--schema=public', `--file=${file}`, url.toString()],
    { stdio: 'inherit' },
  )
} catch {
  console.error('[db-backup] pg_dump failed; see the message above.')
  process.exit(1)
}

console.log(`[db-backup] Saved ${file} (${(statSync(file).size / 1024).toFixed(1)} KB)`)
