// Brings the database and the Prisma client up to date with prisma/migrations.
// Runs automatically before `npm run dev` (predev), and after db:migrate /
// db:deploy. Safe to run any number of times.
//
//   1. A database that already has tables but no migration history (built from
//      db/schema.sql, restored from a dump, or set up by hand) is adopted:
//      Prisma refuses to migrate it (P3005), so every migration is run here
//      instead and then recorded as applied. Each migration is written to be
//      re-runnable — it creates what is missing and brings what exists into
//      line — so nothing already there is lost.
//   2. Migrations edited after being applied (to make them re-runnable) have
//      their recorded checksum refreshed, so `prisma migrate dev` does not
//      take the edit for drift and offer to reset the database.
//   3. prisma migrate deploy  applies migrations not yet in the database;
//                             already-applied ones are skipped, data untouched.
//   4. prisma generate        rebuilds src/generated/prisma. Prisma 7's
//                             `migrate dev` no longer does this on its own.
//   5. If the generated client changed, clears Turbopack's dev cache. Next
//      does not notice changes in src/generated (it is gitignored), so a
//      cached build would keep the old client even across restarts — the
//      "Unknown field ... on model" error.

import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'

// @next/env is CommonJS, so it has no named ESM exports — default-import it.
import nextEnv from '@next/env'
import pg from 'pg'

nextEnv.loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error })

const GENERATED = 'src/generated/prisma'
const TURBOPACK_CACHE = '.next/dev/cache/turbopack'
const MIGRATIONS = 'prisma/migrations'

function run(command) {
  execSync(command, { stdio: 'inherit' })
}

/** Content hash of every file under a folder; '' when it does not exist. */
function hashDir(dir) {
  if (!existsSync(dir)) return ''
  const hash = createHash('sha256')
  const walk = (current) => {
    for (const name of readdirSync(current).sort()) {
      const path = join(current, name)
      if (statSync(path).isDirectory()) walk(path)
      else hash.update(path).update(readFileSync(path))
    }
  }
  walk(dir)
  return hash.digest('hex')
}

/** Migration folders in the order Prisma applies them, with their SQL. */
function migrations() {
  return readdirSync(MIGRATIONS)
    .filter((name) => existsSync(join(MIGRATIONS, name, 'migration.sql')))
    .sort()
    .map((name) => {
      const sql = readFileSync(join(MIGRATIONS, name, 'migration.sql'))
      // Prisma's checksum is the SHA-256 of the file as it is on disk.
      return { name, sql: sql.toString('utf8'), checksum: createHash('sha256').update(sql).digest('hex') }
    })
}

async function tableExists(client, name) {
  const { rows } = await client.query(
    `select 1 from information_schema.tables where table_schema = current_schema() and table_name = $1`,
    [name],
  )
  return rows.length > 0
}

/** Steps 1 and 2. Connection problems are left for `migrate deploy` to report. */
async function prepareHistory() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  try {
    await client.connect()
  } catch {
    return
  }

  try {
    const hasHistory = await tableExists(client, '_prisma_migrations')
    const hasTables = await tableExists(client, 'product')

    if (!hasHistory && hasTables) {
      console.log('[db-sync] Existing database with no migration history: bringing it up to date.')
      for (const migration of migrations()) {
        await client.query(migration.sql)
        console.log(`[db-sync]   applied ${migration.name}`)
      }
      // Recorded through Prisma so its history table is created its own way.
      for (const migration of migrations()) {
        execSync(`npx prisma migrate resolve --applied "${migration.name}"`, { stdio: 'ignore' })
      }
      console.log('[db-sync] Migration history recorded.')
      return
    }

    if (hasHistory) {
      for (const migration of migrations()) {
        const { rowCount } = await client.query(
          `update "_prisma_migrations" set checksum = $1
            where migration_name = $2 and finished_at is not null and checksum <> $1`,
          [migration.checksum, migration.name],
        )
        if (rowCount > 0) console.log(`[db-sync] Refreshed checksum of edited ${migration.name}`)
      }
    }
  } finally {
    await client.end()
  }
}

try {
  await prepareHistory()
  run('npx prisma migrate deploy')
} catch (error) {
  if (error?.message) console.error(`\n[db-sync] ${error.message}`)
  console.error('\n[db-sync] Could not apply migrations. Is PostgreSQL running and .env set up?')
  console.error('[db-sync] Check DATABASE_URL in .env, and create the database if it is missing:')
  console.error('[db-sync]   psql -U postgres -c "CREATE DATABASE billing;"')
  process.exit(1)
}

const before = hashDir(GENERATED)
run('npx prisma generate')

if (before !== '' && before !== hashDir(GENERATED) && existsSync(TURBOPACK_CACHE)) {
  try {
    rmSync(TURBOPACK_CACHE, { recursive: true, force: true })
    console.log('[db-sync] Prisma client changed — cleared the Next.js dev cache.')
  } catch {
    // Files are locked while `next dev` is running (notably on Windows).
    console.warn('[db-sync] Prisma client changed, but the Next.js dev cache is in use.')
    console.warn('[db-sync] Stop the dev server, then run `npm run dev` again.')
  }
}
