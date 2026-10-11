import 'server-only'

import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '@/generated/prisma/client'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Add it to .env at the project root.')
}

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

type CachedPrismaClient = ReturnType<typeof createPrismaClient>

// Next's dev server re-evaluates modules on every hot reload. Without this
// cache each reload would build a fresh connection pool and eventually
// exhaust Postgres' connection limit, so the client is stashed on globalThis
// outside production.
const globalForPrisma = globalThis as unknown as {
  prisma?: CachedPrismaClient
}

/**
 * The cached instance belongs to whichever generated client existed when it was
 * built. After `prisma db pull` + `prisma generate` adds a model, a long-running
 * dev server keeps handing back the old instance and the new model reads as
 * `undefined` — surfacing as "Cannot read properties of undefined (reading
 * 'findFirst')". `Prisma.ModelName` is regenerated alongside the client, so a
 * cached instance missing any of its models is known to be out of date.
 */
function isStale(client: CachedPrismaClient): boolean {
  const delegates = client as unknown as Record<string, unknown>
  return Object.values(Prisma.ModelName).some((model) => delegates[model] === undefined)
}

const cached = globalForPrisma.prisma

if (cached && isStale(cached)) {
  console.warn(
    '[prisma] Cached client predates the current generated client — rebuilding. ' +
      'This happens after `prisma generate` while `next dev` is running.',
  )
  // Release the old pool rather than leaking it for the life of the process.
  void cached.$disconnect().catch(() => {})
}

export const prisma = cached && !isStale(cached) ? cached : createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
