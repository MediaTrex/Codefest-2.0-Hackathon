import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search,
  Loader2,
  Users,
  UserCheck,
  Activity,
  Moon,
  X,
} from 'lucide-react'
import { fetchCases, fetchStaff } from '../features/careflow/submitCase'
import {
  STAFF_ROSTER,
  DEPARTMENTS,
  SHIFTS,
  enrichStaff,
  statusMeta,
  weekSchedule,
} from '../data/staffRoster'
import { urgencyClasses, severityOf, severityTone, timeAgo } from '../utils/status'
import { AGENT_STAGES, stageIdForCase } from '../utils/pipelineStage'
import { PatientAvatar } from '../components/careflow/PatientPhotoCapture'

function initials(name) {
  return (name || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const STATUS_DOT = {
  safe: 'bg-[var(--cf-ink-faint)]',
  caution: 'bg-[var(--cf-ink-soft)]',
  danger: 'bg-[var(--cf-ink)]',
  idle: 'bg-[var(--cf-border-strong)]',
}

const STATUS_PILL = {
  safe: 'text-[var(--cf-ink-soft)] bg-[var(--cf-surface)] border-[var(--cf-border)]',
  caution: 'text-[var(--cf-ink)] bg-[var(--cf-surface-sunken)] border-[var(--cf-border)]',
  danger: 'text-[var(--cf-ink)] bg-[var(--cf-surface-sunken)] border-[var(--cf-border-strong)] font-semibold',
  idle: 'text-[var(--cf-ink-faint)] bg-[var(--cf-surface-sunken)] border-[var(--cf-border)]',
}

export default function StaffPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [cases, setCases] = useState([])
  const [apiStaff, setApiStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('all')
  const [shift, setShift] = useState('all')
  const [availability, setAvailability] = useState('all')
  const [selectedId, setSelectedId] = useState(searchParams.get('staff') || null)

  useEffect(() => {
    Promise.all([fetchCases(), fetchStaff().catch(() => [])])
      .then(([c, s]) => {
        setCases(c)
        setApiStaff(s)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const roster = useMemo(() => {
    // Prefer local enriched roster; merge any API-only names
    const base = [...STAFF_ROSTER]
    for (const s of apiStaff) {
      if (!base.some((b) => b.id === s.id || b.name === s.name)) {
        base.push({
          id: s.id,
          name: s.name,
          role: 'Doctor',
          department: 'General',
          shift: 'Morning',
          baseStatus: 'available',
        })
      }
    }
    return enrichStaff(base, cases)
  }, [apiStaff, cases])

  useEffect(() => {
    const q = searchParams.get('staff')
    if (q) setSelectedId(q)
  }, [searchParams])

  const filtered = useMemo(() => {
    let list = [...roster]
    if (department !== 'all') list = list.filter((s) => s.department === department)
    if (shift !== 'all') list = list.filter((s) => s.shift === shift)
    if (availability !== 'all') list = list.filter((s) => s.status === availability)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.role.toLowerCase().includes(q) ||
          s.department.toLowerCase().includes(q)
      )
    }
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [roster, department, shift, availability, search])

  const selected = roster.find((s) => s.id === selectedId) || null

  const stats = useMemo(() => {
    const onShift = roster.filter((s) => s.status !== 'off').length
    const available = roster.filter((s) => s.status === 'available').length
    const busy = roster.filter(
      (s) => s.status === 'with_patient' || s.status === 'in_surgery'
    ).length
    const off = roster.filter((s) => s.status === 'off').length
    return { onShift, available, busy, off }
  }, [roster])

  const openStaff = (id) => {
    setSelectedId(id)
    setSearchParams(id ? { staff: id } : {})
  }

  const selectClass =
    'text-[12px] border border-[var(--cf-border)] rounded-lg px-2.5 py-1.5 bg-white text-[var(--cf-ink)] outline-none focus:border-[var(--cf-brand)]'

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-[var(--cf-ink-faint)]">
        <Loader2 className="animate-spin" size={22} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-8 relative">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[24px] font-semibold text-[var(--cf-ink)]">Staff</h1>
          <p className="text-[14px] text-[var(--cf-ink-faint)] mt-1">
            Live shift status and case load across CarePilot Ai
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--cf-ink-faint)]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff, role, department"
            className="w-full text-[12.5px] border border-[var(--cf-border)] rounded-lg pl-8 pr-3 py-1.5 bg-white outline-none focus:border-[var(--cf-brand)]"
          />
        </div>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className={selectClass}
        >
          <option value="all">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select value={shift} onChange={(e) => setShift(e.target.value)} className={selectClass}>
          <option value="all">All shifts</option>
          {SHIFTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          className={selectClass}
        >
          <option value="all">All availability</option>
          <option value="available">Available</option>
          <option value="with_patient">With patient</option>
          <option value="in_surgery">In surgery</option>
          <option value="off">Off shift</option>
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="On shift now" value={stats.onShift} tone="info" />
        <StatCard icon={UserCheck} label="Available" value={stats.available} tone="safe" />
        <StatCard
          icon={Activity}
          label="In surgery / with patient"
          value={stats.busy}
          tone="caution"
        />
        <StatCard icon={Moon} label="Off shift" value={stats.off} tone="neutral" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((member) => {
          const meta = statusMeta(member.status)
          const highlighted = selectedId === member.id
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => openStaff(member.id)}
              className={`text-left rounded-xl border p-4 bg-[var(--cf-surface)] cursor-pointer transition-colors ${
                highlighted
                  ? 'border-[var(--cf-brand)] ring-2 ring-[var(--cf-brand-soft)]'
                  : 'border-[var(--cf-border)] hover:bg-[var(--cf-surface-sunken)]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-[var(--cf-brand-soft)] text-[var(--cf-brand)] grid place-items-center text-[13px] font-semibold shrink-0">
                  {initials(member.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[14px] font-semibold text-[var(--cf-ink)] m-0 truncate">
                      {member.name}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${STATUS_PILL[meta.tone]}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[meta.tone]} ${
                          meta.pulse ? 'animate-pulse' : ''
                        }`}
                      />
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-[var(--cf-ink-faint)] mt-0.5 mb-0">
                    {member.role} · {member.department} · {member.shift}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-[12px] text-[var(--cf-ink-soft)] m-0">
                  <span className="font-semibold text-[var(--cf-ink)]">{member.caseCount}</span>{' '}
                  active case{member.caseCount === 1 ? '' : 's'}
                </p>
                <div className="flex -space-x-2">
                  {member.cases.slice(0, 4).map((c) => (
                    <span
                      key={c.caseId}
                      title={c.patientName}
                      className="inline-block"
                    >
                      <PatientAvatar
                        photoUrl={c.photoUrl}
                        name={c.patientName}
                        size={26}
                        className="border-2 border-white"
                      />
                    </span>
                  ))}
                  {member.cases.length > 4 && (
                    <span className="w-[26px] h-[26px] rounded-full bg-[var(--cf-surface-sunken)] border-2 border-white text-[10px] grid place-items-center text-[var(--cf-ink-faint)]">
                      +{member.cases.length - 4}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-[13px] text-[var(--cf-ink-faint)] py-10">
          No staff match the current filters.
        </p>
      )}

      {/* Slide-out panel */}
      {selected && (
        <>
          <button
            type="button"
            aria-label="Close panel"
            className="fixed inset-0 bg-black/20 z-30 border-none cursor-pointer"
            onClick={() => openStaff(null)}
          />
          <aside className="fixed top-0 right-0 h-full w-full max-w-[420px] z-40 bg-[var(--cf-surface)] border-l border-[var(--cf-border)] shadow-xl flex flex-col animate-[staffSlide_0.25s_ease]">
            <div className="px-5 py-4 border-b border-[var(--cf-border)] flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full bg-[var(--cf-brand-soft)] text-[var(--cf-brand)] grid place-items-center text-[14px] font-semibold shrink-0">
                  {initials(selected.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold text-[var(--cf-ink)] m-0 truncate">
                    {selected.name}
                  </p>
                  <p className="text-[12.5px] text-[var(--cf-ink-faint)] mt-0.5 mb-0">
                    {selected.role} · {selected.department}
                  </p>
                  <span
                    className={`mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${STATUS_PILL[statusMeta(selected.status).tone]}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[statusMeta(selected.status).tone]} ${
                        statusMeta(selected.status).pulse ? 'animate-pulse' : ''
                      }`}
                    />
                    {statusMeta(selected.status).label}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openStaff(null)}
                className="w-8 h-8 grid place-items-center rounded-md border border-[var(--cf-border)] bg-white cursor-pointer text-[var(--cf-ink-soft)]"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--cf-ink)] m-0">
                    Active cases
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/queue?doctor=${encodeURIComponent(selected.name)}`)
                    }
                    className="text-[12px] font-medium text-[var(--cf-brand)] bg-transparent border-none cursor-pointer"
                  >
                    Reassign cases
                  </button>
                </div>
                {selected.cases.length === 0 ? (
                  <p className="text-[13px] text-[var(--cf-ink-faint)]">No active cases.</p>
                ) : (
                  <ul className="m-0 p-0 list-none divide-y divide-[var(--cf-border)] rounded-xl border border-[var(--cf-border)] overflow-hidden">
                    {selected.cases.map((c) => {
                      const tone = severityTone(severityOf(c))
                      const stage =
                        AGENT_STAGES.find((s) => s.id === stageIdForCase(c))?.label || '—'
                      return (
                        <li key={c.caseId}>
                          <button
                            type="button"
                            onClick={() => navigate(`/case/${c.caseId}`)}
                            className="w-full text-left px-3 py-2.5 bg-transparent border-none cursor-pointer hover:bg-[var(--cf-surface-sunken)]"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                              <span className="text-[13px] font-medium text-[var(--cf-ink)] truncate">
                                {c.patientName}
                              </span>
                              <span
                                className={`ml-auto text-[10px] px-1.5 py-0.5 rounded border capitalize ${urgencyClasses(c.urgency)}`}
                              >
                                {c.urgency || 'routine'}
                              </span>
                            </div>
                            <p className="text-[12px] text-[var(--cf-ink-faint)] mt-1 mb-0 truncate">
                              {stage} · {c.topDiagnosis || 'Pending'} ·{' '}
                              {timeAgo(c.createdAt)}
                            </p>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--cf-ink)] m-0 mb-2">
                  Week schedule
                </h3>
                <div className="grid grid-cols-7 gap-1">
                  {weekSchedule(selected).map((d) => (
                    <div
                      key={d.day}
                      className={`rounded-lg border px-1 py-2 text-center ${
                        d.slot === 'Off'
                          ? 'border-[var(--cf-border)] bg-[var(--cf-surface-sunken)]'
                          : 'border-[var(--cf-brand)]/30 bg-[var(--cf-brand-soft)]'
                      }`}
                    >
                      <p className="text-[10px] text-[var(--cf-ink-faint)] m-0">{d.day}</p>
                      <p
                        className={`text-[11px] font-semibold m-0 mt-1 ${
                          d.slot === 'Off'
                            ? 'text-[var(--cf-ink-faint)]'
                            : 'text-[var(--cf-brand)]'
                        }`}
                      >
                        {d.slot === 'Off' ? 'Off' : d.slot.slice(0, 3)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </aside>
        </>
      )}

      <style>{`
        @keyframes staffSlide {
          from { transform: translateX(24px); opacity: 0.6; }
          to { transform: none; opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] p-4 flex items-center gap-3 transition-shadow duration-300 hover:shadow-sm">
      <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-[var(--cf-surface-sunken)] text-[var(--cf-ink-soft)]">
        <Icon size={17} strokeWidth={2} />
      </div>
      <div>
        <p className="text-[12.5px] text-[var(--cf-ink-soft)] m-0">{label}</p>
        <p className="text-[22px] leading-none font-semibold mt-1 mb-0 text-[var(--cf-ink)]">
          {value}
        </p>
      </div>
    </div>
  )
}
