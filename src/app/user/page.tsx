import { connection } from 'next/server'

import EntityForm from '@/components/form/entity-form'
import { createUser } from '@/app/user/actions'
import { userFields } from '@/lib/user'

export const metadata = {
  title: 'Add User',
}

/** Admin only: proxy.ts keeps order-only users away, and the action re-checks. */
export default async function UserPage() {
  // Rendered per request, like the other entry forms (EntityForm reads the URL).
  await connection()

  return (
    <EntityForm entity="User" fields={userFields('create')} listHref="/user/list" action={createUser} />
  )
}
