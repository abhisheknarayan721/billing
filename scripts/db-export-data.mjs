// Exports the app's rows as plain INSERT statements that can be pasted into
// Supabase's SQL Editor (or run with psql). Tables are NOT created — run
// `npx prisma migrate deploy` against the target first.
//
//   npm run db:export-data                              all tables
//   npm run db:export-data -- --tables=product,supplier only these tables
//   npm run db:export-data -- --replace                 empty the tables first
//   npm run db:export-data -- --out=backups/my.sql      another file name
//
// Reads from SOURCE_DATABASE_URL when set in .env, else DATABASE_URL. Keep
// SOURCE_DATABASE_URL pointed at the local database once DATABASE_URL is Supabase.
//
// Without --replace, rows whose id already exists in the target fail with
// "duplicate key" and the whole file is rolled back — it runs in one transaction.

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import nextEnv from '@next/env'

import { findPgTool, toLibpqUrl } from './pg-tools.mjs'

// CommonJS module, so no named import.
nextEnv.loadEnvConfig(process.cwd())

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=')
    return [key, value ?? true]
  }),
)

const raw = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL
if (!raw) {
  console.error('[db-export] Neither SOURCE_DATABASE_URL nor DATABASE_URL is set in .env.')
  process.exit(1)
}

const tables = typeof args.tables === 'string' ? args.tables.split(',').map((t) => t.trim()).filter(Boolean) : []
for (const table of tables) {
  if (!/^[a-z_][a-z0-9_]*$/.test(table)) {
    console.error(`[db-export] Not a valid table name: ${table}`)
    process.exit(1)
  }
}
const out = typeof args.out === 'string' ? args.out : 'backups/supabase-sql-editor.sql'

const url = toLibpqUrl(raw)
const dumpArgs = [
  '--data-only',
  '--inserts',
  '--no-owner',
  '--no-privileges',
  '--schema=public',
  // Prisma's own record of applied migrations; `migrate deploy` writes it on the target.
  '--exclude-table=public._prisma_migrations',
  ...tables.map((t) => `--table=public.${t}`),
  url.toString(),
]

console.log(`[db-export] Reading ${tables.length ? tables.join(', ') : 'all tables'} from ${url.hostname} ...`)
let sql
try {
  sql = execFileSync(findPgTool('pg_dump'), dumpArgs, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 })
} catch {
  console.error('[db-export] pg_dump failed; see the message above.')
  process.exit(1)
}

// The SQL Editor is not psql: drop psql meta-commands (\restrict) and settings
// older servers do not know (transaction_timeout is PostgreSQL 17+).
const body = sql
  .split('\n')
  .filter((line) => !line.startsWith('\\') && !line.startsWith('SET transaction_timeout'))
  .join('\n')

const exported = [...new Set([...body.matchAll(/^INSERT INTO public\.(\w+)/gm)].map((m) => m[1]))]
const rows = (body.match(/^INSERT INTO /gm) ?? []).length

// The tables the TRUNCATE covers: the ones asked for, else every table that had rows.
const toEmpty = tables.length ? tables : exported
const replace =
  args.replace && toEmpty.length
    ? `-- --replace: empties these tables first and restarts their id counters.\n` +
      `-- Fails (and changes nothing) if another table still points at their rows.\n` +
      `TRUNCATE ${toEmpty.map((t) => `public.${t}`).join(', ')} RESTART IDENTITY;\n\n`
    : ''

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, `BEGIN;\n\n${replace}${body.trim()}\n\nCOMMIT;\n`)

console.log(`[db-export] Saved ${out}: ${rows} rows from ${exported.join(', ') || 'no tables'}.`)
if (readFileSync(out, 'utf8').includes('app_user')) {
  console.log('[db-export] Contains app_user logins — keep this file out of Git and delete it after use.')
}
