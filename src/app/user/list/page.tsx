import Link from 'next/link'
import { connection } from 'next/server'

import ConfirmDeleteButton from '@/components/form/confirm-delete-button'
import PasswordCell from '@/components/user/password-cell'
import { deleteUser } from '@/app/user/actions'
import { listUsers } from '@/api/services/user.service'
import { requireAdmin } from '@/lib/auth/session'
import { formatDateTime } from '@/lib/company'
import { ADMINISTRATOR_USERNAME } from '@/lib/user'

export const metadata = {
  title: 'Users',
}

const roleTone: Record<string, string> = {
  admin: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  user: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

export default async function UserListPage() {
  // Must reflect the database at request time, not build time.
  await connection()
  const [me, users] = await Promise.all([requireAdmin(), listUsers()])

  return (
    <section className="page">
      <div className="page-header">
        <h2 className="page-title">Users</h2>
        <Link href="/user" className="btn-primary">
          New user
        </Link>
      </div>

      <p className="mb-4 text-sm text-slate-600">
        <span className="font-medium">Admin</span> logins see everything.{' '}
        <span className="font-medium">User</span> logins see only retailer orders. The{' '}
        <span className="font-medium">{ADMINISTRATOR_USERNAME}</span> account cannot be removed.
      </p>

      {users.length === 0 ? (
        <p className="empty-state">No users yet.</p>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th className="font-semibold">Username</th>
                <th className="font-semibold">Full Name</th>
                <th className="font-semibold">Role</th>
                <th className="font-semibold">Password</th>
                <th className="font-semibold">Created</th>
                <th className="text-right font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id}>
                  <td className="font-medium">
                    {user.username}
                    {user.user_id === me.userId && (
                      <span className="ml-2 text-xs font-normal text-slate-500">(you)</span>
                    )}
                  </td>
                  <td>{user.fullname ?? '-'}</td>
                  <td>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${roleTone[user.role] ?? roleTone.user}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <PasswordCell password={user.password} />
                  </td>
                  <td>{user.createddate ? formatDateTime(user.createddate) : '-'}</td>
                  <td className="whitespace-nowrap text-right">
                    <Link href={`/user/${user.user_id}/edit`} className="link">
                      Edit
                    </Link>
                    {/* The administrator account and your own login cannot be removed;
                        the button stays, disabled, so it is clear why. */}
                    <span className="ml-3">
                      <ConfirmDeleteButton
                        action={deleteUser.bind(null, user.user_id)}
                        confirmMessage={`Remove user "${user.username}"? They will be signed out.`}
                        label="Remove"
                        disabledReason={
                          user.username === ADMINISTRATOR_USERNAME
                            ? 'The administrator account cannot be removed.'
                            : user.user_id === me.userId
                              ? 'You cannot remove your own login.'
                              : undefined
                        }
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
