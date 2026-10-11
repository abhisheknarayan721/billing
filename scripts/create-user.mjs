// Creates a login, or resets the password of an existing one.
//
//   npm run user:create -- <username> [full name] [--role admin|user]
//
// --role user  makes an order-only login: it sees only the retailer order
//              pages. New logins are admins unless told otherwise; an existing
//              login keeps its role unless --role is given. A role change takes
//              full effect the next time that person logs in.
//
// The password is asked for interactively so it never lands in shell history.
// The password is saved as plain text in app_user.password.

import { createInterface } from 'node:readline'

// @next/env is CommonJS, so it has no named ESM exports — default-import it.
import nextEnv from '@next/env'
import pg from 'pg'

const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error })

const ROLES = ['admin', 'user']
const USAGE = 'Usage: npm run user:create -- <username> [full name] [--role admin|user]'

// Pull --role out wherever it appears; everything else is username + name.
const args = process.argv.slice(2)
let role = null
for (let i = 0; i < args.length; i++) {
  const match = args[i].match(/^--role(?:=(.*))?$/)
  if (!match) continue
  const value = match[1] ?? args[i + 1]
  args.splice(i, match[1] === undefined ? 2 : 1)
  if (!ROLES.includes(value)) {
    console.error(`--role must be one of: ${ROLES.join(', ')}.`)
    console.error(USAGE)
    process.exit(1)
  }
  role = value
  i--
}

const [username, ...nameParts] = args
const fullname = nameParts.join(' ').trim() || null

if (!username) {
  console.error(USAGE)
  process.exit(1)
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set. Add it to .env at the project root.')
  process.exit(1)
}

// One reader for both prompts, read through its line iterator: that queues
// lines, so input that arrives early (e.g. piped in) is not lost.
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: Boolean(process.stdin.isTTY),
})
// Swallow the echo of whatever is typed; prompts are written directly.
rl._writeToOutput = () => {}
const lines = rl[Symbol.asyncIterator]()

/** Reads a line without echoing it to the terminal. */
async function askHidden(question) {
  process.stdout.write(question)
  const { value = '' } = await lines.next()
  process.stdout.write('\n')
  return value
}

const password = await askHidden(`Password for ${username}: `)
if (password.length < 8) {
  console.error('Password must be at least 8 characters.')
  process.exit(1)
}
if ((await askHidden('Repeat password: ')) !== password) {
  console.error('Passwords do not match.')
  process.exit(1)
}
rl.close()

const client = new pg.Client({ connectionString })
try {
  await client.connect()
  const { rows } = await client.query(
    `insert into app_user (username, fullname, password, role, createddate, updateddate)
     values ($1, $2, $3, coalesce($4, 'admin'), now(), now())
     on conflict (username) do update
       set password = excluded.password,
           fullname = coalesce(excluded.fullname, app_user.fullname),
           role = coalesce($4, app_user.role),
           updateddate = now()
     returning user_id, role, (xmax = 0) as inserted`,
    [username, fullname, password, role],
  )
  const [row] = rows
  console.log(
    row.inserted
      ? `Created ${row.role} "${username}" (ID ${row.user_id}).`
      : `Updated the password for "${username}" (ID ${row.user_id}, role ${row.role}).`,
  )
} catch (error) {
  console.error(`Could not save the user: ${error.message}`)
  if (error.code === '42P01') console.error('The app_user table is missing — run: npm run db:deploy')
  process.exitCode = 1
} finally {
  await client.end()
}
