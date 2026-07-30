import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { fetchCases } from '../../features/careflow/submitCase'
import { timeAgo } from '../../utils/status'

export default function PatientPicker({ value, onSelect }) {
  const [cases, setCases] = useState([])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCases()
      .then(setCases)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const list = [...cases].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )
    if (!q.trim()) return list.slice(0, 40)
    const needle = q.trim().toLowerCase()
    return list
      .filter(
        (c) =>
          (c.patientName || '').toLowerCase().includes(needle) ||
          (c.caseId || '').toLowerCase().includes(needle)
      )
      .slice(0, 40)
  }, [cases, q])

  const selected = cases.find((c) => c.caseId === value)

  return (
    <div className="relative no-print">
      <label className="text-[12px] text-[var(--cf-ink-faint)] block mb-1.5">
        Select case
      </label>
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cf-ink-faint)]"
        />
        <input
          value={open ? q : selected ? `${selected.patientName} · ${selected.caseId?.slice(0, 8)}…` : q}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            setOpen(true)
            setQ('')
          }}
          placeholder="Search patient / case ID…"
          className="w-full text-[13px] border border-[var(--cf-border)] rounded-lg pl-9 pr-3 py-2 bg-white outline-none focus:border-[var(--cf-brand)]"
        />
      </div>
      {open && (
        <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-[var(--cf-border)] bg-[var(--cf-surface)] shadow-sm">
          {loading && (
            <li className="px-3 py-2 text-[12px] text-[var(--cf-ink-faint)]">
              Loading…
            </li>
          )}
          {!loading && filtered.length === 0 && (
            <li className="px-3 py-2 text-[12px] text-[var(--cf-ink-faint)]">
              No matches
            </li>
          )}
          {filtered.map((c) => (
            <li key={c.caseId}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-[var(--cf-surface-sunken)] border-none bg-transparent cursor-pointer"
                onClick={() => {
                  onSelect(c.caseId)
                  setOpen(false)
                  setQ('')
                }}
              >
                <span className="text-[13px] font-medium text-[var(--cf-ink)]">
                  {c.patientName || 'Unknown'}
                </span>
                <span className="block text-[11px] text-[var(--cf-ink-faint)]">
                  {c.caseId?.slice(0, 8)}… · {c.urgency || 'routine'} ·{' '}
                  {timeAgo(c.createdAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
