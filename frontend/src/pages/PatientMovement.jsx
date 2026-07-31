import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPinned, Radio } from 'lucide-react'
import DigitalTwinMap from '../components/careflow/DigitalTwinMap'
import LiveFeed from '../components/careflow/LiveFeed'
import MovementSimCharts from '../components/careflow/MovementSimCharts'
import { groupByStage, AGENT_STAGES, stageIdForCase } from '../utils/pipelineStage'
import { fetchCases, fetchCase } from '../features/careflow/submitCase'

const POLL_MS = 4000
const EVENT_MS = 2200

const MOVE_VERBS = [
  'entered',
  'moved to',
  'cleared into',
  'handed off at',
  'arrived in',
]

function loadTone(n) {
  if (n <= 0) return { bar: '#c5d9e6', glow: 'transparent' }
  if (n >= 3) return { bar: '#c1121f', glow: 'rgba(193, 18, 31, 0.25)' }
  if (n === 2) return { bar: '#003049', glow: 'rgba(0, 48, 73, 0.25)' }
  return { bar: '#669bbc', glow: 'rgba(102, 155, 188, 0.28)' }
}

function ZoneStat({ label, count }) {
  const tone = loadTone(count)
  const prev = useRef(count)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (prev.current !== count) {
      prev.current = count
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 320)
      return () => clearTimeout(t)
    }
  }, [count])

  return (
    <div className="rounded-lg border border-[var(--cf-border)] bg-[var(--cf-surface)] px-3 py-2.5 shadow-sm">
      <p className="text-[11px] uppercase tracking-wide text-[var(--cf-ink-faint)] m-0">
        {label}
      </p>
      <p
        className={`text-[22px] font-semibold text-[var(--cf-ink)] m-0 mt-0.5 tabular-nums leading-none ${
          pulse ? 'pm-stat-pulse' : ''
        }`}
      >
        {count}
      </p>
      <div
        className="mt-2 h-1 rounded-full w-full overflow-hidden bg-[#f0f0f1]"
        aria-hidden
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: count <= 0 ? '8%' : `${Math.min(100, 28 + count * 24)}%`,
            backgroundColor: tone.bar,
            boxShadow: count > 0 ? `0 0 8px ${tone.glow}` : 'none',
          }}
        />
      </div>
    </div>
  )
}

function MovementEventFeed({ cases = [] }) {
  const [events, setEvents] = useState([])

  useEffect(() => {
    if (!cases.length) return undefined

    const push = () => {
      const c = cases[Math.floor(Math.random() * cases.length)]
      if (!c) return
      const stage = AGENT_STAGES.find((s) => s.id === stageIdForCase(c))
      const verb = MOVE_VERBS[Math.floor(Math.random() * MOVE_VERBS.length)]
      const next = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        at: Date.now(),
        name: c.patientName || 'Patient',
        text: `${verb} ${stage?.label || 'zone'}`,
        caseId: c.caseId,
      }
      setEvents((prev) => [next, ...prev].slice(0, 28))
    }

    push()
    const id = setInterval(push, EVENT_MS)
    return () => clearInterval(id)
  }, [cases])

  return (
    <div className="rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] p-5 h-full flex flex-col min-h-[320px]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--cf-ink)] tracking-wide uppercase m-0">
            Movement log
          </h3>
          <p className="text-[13px] text-[var(--cf-ink-faint)] mt-0.5 mb-0">
            Simulated location shifts
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-[12px] text-[var(--cf-ink-soft)]">
          <Radio size={12} className="text-[var(--cf-brand)]" />
          Streaming
        </span>
      </div>
      <ul className="m-0 p-0 list-none divide-y divide-[var(--cf-border)] overflow-y-auto flex-1">
        {events.length === 0 ? (
          <li className="py-8 text-center text-[13px] text-[var(--cf-ink-faint)]">
            Waiting for floor activity…
          </li>
        ) : (
          events.map((e) => (
            <li key={e.id} className="py-2.5 flex gap-3 items-start">
              <span className="text-[11px] tabular-nums text-[var(--cf-ink-faint)] shrink-0 pt-0.5 w-[54px]">
                {new Date(e.at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
              <span className="min-w-0">
                <span className="text-[13px] font-medium text-[var(--cf-ink)]">
                  {e.name}
                </span>
                <span className="text-[13px] text-[var(--cf-ink-soft)]">
                  {' '}
                  {e.text}
                </span>
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

export default function PatientMovement() {
  const navigate = useNavigate()
  const onSelectCase = (caseId) => navigate(`/case/${caseId}`)
  const [cases, setCases] = useState([])
  const [stageGroups, setStageGroups] = useState({})
  const [loading, setLoading] = useState(true)
  const [liveOccupancy, setLiveOccupancy] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const list = await fetchCases()
      setCases(list)
      const hasStage = list.some(
        (c) => c.current_stage || (c.timeline && c.timeline.length)
      )
      if (hasStage) {
        setStageGroups(groupByStage(list))
      } else {
        const recent = [...list]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 20)
        const details = await Promise.all(
          recent.map((c) =>
            fetchCase(c.caseId)
              .then((res) => ({
                ...c,
                timeline: res?.timeline,
                current_stage: res?.current_stage,
              }))
              .catch(() => ({ ...c, timeline: [] }))
          )
        )
        setStageGroups(groupByStage(details))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, POLL_MS)
    return () => clearInterval(interval)
  }, [fetchData])

  const zoneCounts = useMemo(() => {
    if (liveOccupancy) return liveOccupancy
    const counts = Object.fromEntries(AGENT_STAGES.map((s) => [s.id, 0]))
    for (const c of cases) {
      const id = stageIdForCase(c)
      if (counts[id] != null) counts[id] += 1
    }
    return counts
  }, [cases, liveOccupancy])

  return (
    <div className="-mx-2 sm:mx-0">
      {/* Header — icon left, title + subtext clear of badge */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-[var(--cf-brand)] grid place-items-center shrink-0 shadow-sm">
            <MapPinned size={20} className="text-white" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[24px] font-semibold text-[var(--cf-ink)] m-0 leading-tight tracking-tight">
              Patient Movement
            </h1>
            <p className="text-[14px] text-[var(--cf-ink-faint)] mt-1 mb-0 leading-snug">
              Live location twin · floor simulation · movement streams
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[12.5px] text-[var(--cf-ink-soft)] font-medium pt-1 shrink-0">
          <span className="w-2 h-2 rounded-full bg-[var(--cf-brand)] animate-pulse" />
          {loading ? 'Syncing…' : `${cases.length} tracked · simulation live`}
        </div>
      </div>

      {/* Zone strip */}
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {AGENT_STAGES.map((s) => (
          <ZoneStat key={s.id} label={s.label} count={zoneCounts[s.id] || 0} />
        ))}
      </div>

      <div className="mb-4">
        <DigitalTwinMap
          cases={cases}
          stageGroups={stageGroups}
          onSelectCase={onSelectCase}
          size="hero"
          demoMovement
          onOccupancyChange={setLiveOccupancy}
          title="Hospital floor · digital twin"
          subtitle="Dynamic live track · patients and staff across care zones"
        />
      </div>

      <div className="mb-4">
        <MovementSimCharts cases={cases} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <MovementEventFeed cases={cases} />
        <div className="min-h-[320px]">
          <LiveFeed cases={cases} onSelectCase={onSelectCase} />
        </div>
      </div>

      <style>{`
        @keyframes pm-stat-pulse {
          0% { transform: scale(1); }
          40% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        .pm-stat-pulse {
          display: inline-block;
          animation: pm-stat-pulse 0.32s ease-out;
        }
      `}</style>
    </div>
  )
}
