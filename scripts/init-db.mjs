// Applies db/schema.sql to the database in DATABASE_URL.
// Safe to re-run — every statement in the schema is IF NOT EXISTS.
//
//   npm run db:init

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// @next/env is CommonJS, so it has no named ESM exports — default-import it.
import nextEnv from '@next/env'
import pg from 'pg'

const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error })

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set. Add it to .env at the project root.')
  process.exit(1)
}

const schemaPath = resolve(process.cwd(), 'db/schema.sql')
const client = new pg.Client({ connectionString })

try {
  await client.connect()
} catch (error) {
  console.error(`Could not connect to the database: ${error.message}`)
  console.error('If the database itself is missing, create it first:')
  console.error('  psql -U postgres -c "CREATE DATABASE billing;"')
  process.exit(1)
}

try {
  await client.query(readFileSync(schemaPath, 'utf8'))

  const { rows } = await client.query(
    `select table_name,
            (select count(*) from information_schema.columns c
              where c.table_schema = 'public' and c.table_name = t.table_name)::int as columns
       from information_schema.tables t
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name`,
  )

  console.log(`Applied ${schemaPath}`)
  for (const row of rows) {
    console.log(`  ${row.table_name.padEnd(14)} ${row.columns} columns`)
  }
  console.log(`\n${rows.length} tables present.`)
  console.log('If any table was just recreated, refresh the Prisma client:')
  console.log('  npx prisma db pull && npx prisma generate')
} catch (error) {
  console.error(`Failed to apply schema: ${error.message}`)
  process.exitCode = 1
} finally {
  await client.end()
}
