import { loadEnvConfig } from '@next/env'
import { defineConfig } from 'prisma/config'

// Prisma 7 no longer reads `.env` on its own, and the datasource `url` was
// removed from schema.prisma. The CLI (migrate / db pull / studio) gets its
// connection string from here instead. `loadEnvConfig` is Next's own loader,
// so the CLI resolves `.env` exactly the way `next dev` does.
loadEnvConfig(process.cwd())

const url = process.env.DATABASE_URL
// Prisma Migrate replays migrations into a throwaway database to detect drift.
// It is wiped on every use, so it must never point at real data.
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL

// The datasource is attached only when the URL is present. `prisma generate`
// needs no database, and it runs from `postinstall` — so on a fresh checkout
// `npm install` must not die just because `.env` has not been written yet.
// Commands that do need a connection still fail, with Prisma's own message.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  ...(url
    ? { datasource: { url, ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}) } }
    : {}),
})
