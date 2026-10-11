import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import EntityForm from '@/components/form/entity-form'
import { updateUser } from '@/app/user/actions'
import { getUser } from '@/api/services/user.service'
import { userFields } from '@/lib/user'

export const metadata = {
  title: 'Edit User',
}

export default async function UserEditPage(props: PageProps<'/user/[user_id]/edit'>) {
  const { user_id } = await props.params

  // Reject non-numeric ids before they reach the database.
  if (!/^\d+$/.test(user_id)) notFound()

  await connection()
  const user = await getUser(Number(user_id))
  if (!user) notFound()

  return (
    <>
      <EntityForm
        entity="User"
        fields={userFields('edit')}
        record={{
          id: user.user_id,
          label: user.username,
          // Admin only. Shown in the form; clearing it keeps it.
          values: {
            username: user.username,
            fullname: user.fullname ?? '',
            role: user.role,
            password: user.password,
          },
        }}
        listHref="/user/list"
        // Bound on the server, so the id never travels through the form.
        action={updateUser.bind(null, user.user_id)}
      />
      <p className="page mt-3 text-xs text-slate-500">
        A role change fully applies the next time this person logs in.
      </p>
    </>
  )
}
