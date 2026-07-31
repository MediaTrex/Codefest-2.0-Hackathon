import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Loader2, RefreshCw, Search, Siren } from 'lucide-react'
import { fetchCases } from '../features/careflow/submitCase'
import { urgencyClasses, severityOf, severityTone } from '../utils/status'
import { AGENT_STAGES, stageIdForCase, timeAgo } from '../utils/pipelineStage'
import { STAFF_ROSTER } from '../data/staffRoster'

function CaseQueue() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const [reviewFilter, setReviewFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [doctorFilter, setDoctorFilter] = useState(
    searchParams.get('doctor') || 'all'
  )
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    const d = searchParams.get('doctor')
    if (d) setDoctorFilter(d)
  }, [searchParams])

  const loadCases = async () => {
    setLoading(true)
    try {
      const data = await fetchCases()
      setCases(data)
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCases()
  }, [])

  const doctors = useMemo(() => {
    const names = new Set()
    for (const c of cases) {
      const n = c.assignedDoctor?.name
      if (n) names.add(n)
    }
    return [...names].sort()
  }, [cases])

  const filtered = useMemo(() => {
    let list = [...cases]

    if (urgencyFilter !== 'all') {
      list = list.filter((c) => (c.urgency || '').toLowerCase() === urgencyFilter)
    }
    if (reviewFilter === 'needs') {
      list = list.filter((c) => c.requires_human_review === true)
    }
    if (stageFilter !== 'all') {
      list = list.filter((c) => stageIdForCase(c) === stageFilter)
    }
    if (doctorFilter !== 'all') {
      list = list.filter((c) => (c.assignedDoctor?.name || '') === doctorFilter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((c) => (c.patientName || '').toLowerCase().includes(q))
    }

    const urgencyRank = (u) => {
      switch ((u || '').toLowerCase()) {
        case 'emergency':
          return 0
        case 'urgent':
          return 1
        default:
          return 2
      }
    }

    list.sort((a, b) => {
      if (sort === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      }
      if (sort === 'urgency') {
        const d = urgencyRank(a.urgency) - urgencyRank(b.urgency)
        if (d !== 0) return d
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return list
  }, [cases, urgencyFilter, reviewFilter, stageFilter, doctorFilter, search, sort])

  const selectClass =
    'text-[12px] border border-[var(--cf-border)] rounded-lg px-2.5 py-1.5 bg-white text-[var(--cf-ink)] outline-none focus:border-[var(--cf-brand)]'

  const stageLabel = (c) =>
    AGENT_STAGES.find((s) => s.id === stageIdForCase(c))?.label || '—'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[24px] font-semibold text-[var(--cf-ink)] tracking-tight">
            Case Queue
          </h1>
          <p className="text-[14px] text-[var(--cf-ink-faint)] mt-1">
            Filter and open cases — see who is handling each one
          </p>
        </div>
        <button
          type="button"
          onClick={loadCases}
          className="flex items-center gap-1.5 text-[12px] text-[var(--cf-ink-soft)] hover:text-[var(--cf-ink)] bg-[var(--cf-surface)] border border-[var(--cf-border)] rounded-lg px-3 py-1.5 cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] p-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--cf-ink-faint)]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient name"
            className="w-full text-[12.5px] border border-[var(--cf-border)] rounded-lg pl-8 pr-3 py-1.5 bg-white outline-none focus:border-[var(--cf-brand)]"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className={selectClass}
        >
          <option value="all">All stages</option>
          {AGENT_STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
          className={selectClass}
        >
          <option value="all">All urgency</option>
          <option value="emergency">Emergency</option>
          <option value="urgent">Urgent</option>
          <option value="routine">Routine</option>
        </select>
        <select
          value={reviewFilter}
          onChange={(e) => setReviewFilter(e.target.value)}
          className={selectClass}
        >
          <option value="all">All review</option>
          <option value="needs">Needs review</option>
        </select>
        <select
          value={doctorFilter}
          onChange={(e) => setDoctorFilter(e.target.value)}
          className={selectClass}
        >
          <option value="all">All doctors</option>
          {doctors.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectClass}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="urgency">Urgency</option>
        </select>
      </div>

      <div className="rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] overflow-hidden">
        <div className="hidden lg:grid grid-cols-[1.3fr_1.2fr_0.8fr_0.8fr_0.9fr_0.7fr_0.8fr] gap-2 px-4 py-2.5 border-b border-[var(--cf-border)] bg-[var(--cf-surface-sunken)] text-[11px] font-medium text-[var(--cf-ink-faint)] uppercase tracking-wide">
          <span>Patient</span>
          <span>Assigned doctor</span>
          <span>Urgency</span>
          <span>Stage</span>
          <span>Needs review</span>
          <span>Created</span>
          <span>Follow-up</span>
        </div>

        {loading && cases.length === 0 && (
          <div className="flex items-center justify-center py-16 text-[var(--cf-ink-faint)]">
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-[12.5px] text-[var(--cf-ink-faint)] text-center py-12">
            No cases match the current filters.
          </p>
        )}

        <div className="divide-y divide-[var(--cf-border)]">
          {filtered.map((c) => {
            const tone = severityTone(severityOf(c))
            const isEmergency = (c.urgency || '').toLowerCase() === 'emergency'
            const doctorName = c.assignedDoctor?.name
            const doctorId =
              c.assignedDoctor?.id ||
              STAFF_ROSTER.find((s) => s.name === doctorName)?.id
            return (
              <div
                key={c.caseId}
                className={`w-full grid lg:grid-cols-[1.3fr_1.2fr_0.8fr_0.8fr_0.9fr_0.7fr_0.8fr] gap-2 px-4 py-3 hover:bg-[var(--cf-surface-sunken)] transition-colors border-l-2 items-center ${tone.border}`}
              >
                <button
                  type="button"
                  onClick={() => navigate(`/case/${c.caseId}`)}
                  className={`text-[13px] font-medium truncate text-left bg-transparent border-none cursor-pointer p-0 ${tone.text}`}
                >
                  {c.patientName || 'Unknown'}
                </button>
                {doctorName && doctorId ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/staff?staff=${encodeURIComponent(doctorId)}`)
                    }}
                    className="text-[12.5px] text-[var(--cf-brand)] font-medium truncate text-left bg-transparent border-none cursor-pointer p-0 hover:underline"
                    title="Open staff profile"
                  >
                    {doctorName}
                  </button>
                ) : (
                  <span className="text-[12.5px] text-[var(--cf-ink-soft)] truncate">
                    {doctorName || 'Unassigned'}
                  </span>
                )}
                {isEmergency ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/war-room/${c.caseId}`)
                    }}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border border-[#e8a0a6] bg-[#fce8ea] text-[#780000] w-fit capitalize cursor-pointer font-semibold animate-pulse"
                    title="Enter War Room"
                  >
                    <Siren size={11} />
                    {c.urgency}
                  </button>
                ) : (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-md border w-fit capitalize ${urgencyClasses(c.urgency)}`}
                  >
                    {c.urgency || 'routine'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/case/${c.caseId}`)}
                  className="text-[12.5px] text-[var(--cf-ink-soft)] text-left bg-transparent border-none cursor-pointer p-0"
                >
                  {stageLabel(c)}
                </button>
                <span className="text-[12px] text-[var(--cf-ink-faint)]">
                  {c.requires_human_review ? (
                    <span className="inline-flex items-center gap-1 text-[var(--cf-caution)]">
                      <AlertTriangle size={11} /> Needs review
                    </span>
                  ) : (
                    '—'
                  )}
                </span>
                <span className="text-[12px] text-[var(--cf-ink-faint)]">
                  {timeAgo(c.createdAt)}
                </span>
                <span className="text-[12px] text-[var(--cf-ink-faint)]">
                  {c.nextFollowUpDate
                    ? new Date(c.nextFollowUpDate).toLocaleDateString()
                    : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default CaseQueue
