import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { HeartPulse, Bell } from 'lucide-react'
import { useSelector } from 'react-redux'

const NAV_ITEMS = [
  { to: '/', id: 'command', label: 'Dashboard', end: true },
  { to: '/intake', id: 'intake', label: 'New Case' },
  { to: '/queue', id: 'queue', label: 'Case Queue' },
  { to: '/reports', id: 'reports', label: 'Reports' },
  { to: '/analytics', id: 'analytics', label: 'Analytics' },
  { to: '/death', id: 'death', label: 'Death Org' },
]

function AppShell({ children }) {
  const location = useLocation()
  const userData = useSelector((state) => state.user.userData)
  const staffName =
    userData?.name || userData?.email || userData?.displayName || 'Staff'
  const initials = staffName
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const isNavActive = (item) => {
    if (item.id === 'command') return location.pathname === '/'
    if (item.id === 'queue') {
      return (
        location.pathname.startsWith('/queue') ||
        location.pathname.startsWith('/case/')
      )
    }
    return location.pathname.startsWith(item.to)
  }

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden bg-[var(--cf-bg)]"
      style={{ fontFamily: 'var(--cf-font-ui)' }}
    >
      <header className="border-b border-[var(--cf-border)] bg-[var(--cf-surface)] shrink-0 no-print">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[var(--cf-brand)] grid place-items-center">
              <HeartPulse size={16} className="text-white" strokeWidth={2.25} />
            </div>
            <div className="leading-tight">
              <p className="text-[14px] font-semibold text-[var(--cf-ink)]">CareFlow AI</p>
              <p className="text-[11px] text-[var(--cf-ink-faint)]">Hospital Command</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
            {NAV_ITEMS.map((item) => {
              const active = isNavActive(item)
              return (
                <NavLink
                  key={item.id}
                  to={item.to}
                  end={item.end}
                  className={`text-[13.5px] px-3 py-2 rounded-md font-medium transition-colors no-underline ${
                    active
                      ? 'bg-[var(--cf-brand)] text-white'
                      : 'bg-transparent text-[var(--cf-ink-soft)] hover:bg-[var(--cf-surface-sunken)]'
                  }`}
                >
                  {item.label}
                </NavLink>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              aria-label="Notifications"
              className="w-9 h-9 rounded-full border border-[var(--cf-border)] grid place-items-center text-[var(--cf-ink-soft)] hover:bg-[var(--cf-surface-sunken)] bg-white cursor-pointer"
            >
              <Bell size={16} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[var(--cf-brand-soft)] text-[var(--cf-brand)] grid place-items-center text-[12px] font-semibold">
                {initials || 'S'}
              </div>
              <div className="leading-tight hidden sm:block">
                <p className="text-[13px] font-medium text-[var(--cf-ink)]">{staffName}</p>
                <p className="text-[11px] text-[var(--cf-ink-faint)]">Clinical staff</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  )
}

export default AppShell
