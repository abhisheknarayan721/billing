import { logout } from '@/app/login/actions'

const UserMenu = () => {
  return (
    <form action={logout}>
      <button
        type="submit"
        title="Log out"
        aria-label="Log out"
        className="rounded-lg p-2 text-slate-500 transition hover:bg-white hover:text-red-600"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      </button>
    </form>
  )
}

export default UserMenu
