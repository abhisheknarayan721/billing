// Shared helpers for the scripts that call PostgreSQL's command-line tools.

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * libpq (pg_dump, psql) rejects query parameters it does not know, such as
 * node-postgres' `uselibpqcompat` or Prisma's `schema`. Keeps only sslmode.
 */
export function toLibpqUrl(raw) {
  const url = new URL(raw)
  const sslmode = url.searchParams.get('sslmode')
  url.search = ''
  if (sslmode) url.searchParams.set('sslmode', sslmode)
  return url
}

/** A PostgreSQL tool from PATH, else the newest version under Program Files on Windows. */
export function findPgTool(name) {
  try {
    execFileSync(name, ['--version'], { stdio: 'ignore' })
    return name
  } catch {
    const root = 'C:\\Program Files\\PostgreSQL'
    if (existsSync(root)) {
      const versions = readdirSync(root)
        .filter((v) => existsSync(join(root, v, 'bin', `${name}.exe`)))
        .sort((a, b) => Number(b) - Number(a))
      if (versions.length > 0) return join(root, versions[0], 'bin', `${name}.exe`)
    }
  }
  console.error(`${name} not found. Install the PostgreSQL client tools or add them to PATH.`)
  process.exit(1)
}
