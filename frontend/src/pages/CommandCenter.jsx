import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Siren } from 'lucide-react'
import KpiStrip from '../components/careflow/KpiStrip'
import PipelineFlowMap from '../components/careflow/PipelineFlowMap'
import LiveFeed from '../components/careflow/LiveFeed'
import DigitalTwinMap from '../components/careflow/DigitalTwinMap'
import TodaysSummary from '../components/careflow/TodaysSummary'
import ChatAssistant from '../components/careflow/ChatAssistant'
import { groupByStage } from '../utils/pipelineStage'
import { fetchCases, fetchCase } from '../features/careflow/submitCase'

const POLL_MS = 5000
const RECENT_DETAIL_LIMIT = 15

export default function CommandCenter() {
  const navigate = useNavigate()
  const onSelectCase = (caseId) => navigate(`/case/${caseId}`)
  const [cases, setCases] = useState([])
  const [stageGroups, setStageGroups] = useState({})
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const list = await fetchCases()
      setCases(list)

      const hasStage = list.some((c) => c.current_stage || (c.timeline && c.timeline.length))
      if (hasStage) {
        setStageGroups(groupByStage(list))
      } else {
        const recent = [...list]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, RECENT_DETAIL_LIMIT)

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
      console.error('Failed to load cases', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, POLL_MS)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[24px] font-semibold text-[var(--cf-ink)]">Command Center</h1>
          <p className="text-[14px] text-[var(--cf-ink-faint)] mt-1">
            Real-time hospital operations across the CarePilot Ai pipeline
          </p>
        </div>
        <div className="flex items-center gap-2 text-[12.5px] text-[var(--cf-ink-soft)] font-medium pt-1">
          <span className="w-2 h-2 rounded-full bg-[var(--cf-ink)] animate-pulse" />
          Systems live
        </div>
      </div>

      <div className="mb-4">
        <KpiStrip cases={cases} />
      </div>

      <WarRoomBanner cases={cases} onEnter={(id) => navigate(`/war-room/${id}`)} />

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <PipelineFlowMap stageGroups={stageGroups} onSelectCase={onSelectCase} />
          <DigitalTwinMap
            cases={cases}
            stageGroups={stageGroups}
            onSelectCase={onSelectCase}
          />
        </div>
        <LiveFeed cases={cases} onSelectCase={onSelectCase} />
      </div>

      <div className="mt-4">
        <TodaysSummary cases={cases} />
      </div>

      {!loading && (
        <ChatAssistant cases={cases} stageGroups={stageGroups} onSelectCase={onSelectCase} />
      )}
    </div>
  )
}

function WarRoomBanner({ cases = [], onEnter }) {
  const emergencies = useMemo(
    () =>
      cases.filter((c) => (c.urgency || '').toLowerCase() === 'emergency'),
    [cases]
  )
  if (emergencies.length === 0) return null
  const primary = [...emergencies].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  )[0]

  return (
    <div className="mb-4 rounded-xl border border-[#e8a0a6] bg-[#fce8ea] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-9 h-9 rounded-lg bg-[#c1121f] grid place-items-center shrink-0 shadow-[0_0_14px_rgba(220,38,38,0.4)]">
          <Siren size={18} className="text-white" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#780000] m-0">
            {emergencies.length} active emergenc{emergencies.length === 1 ? 'y' : 'ies'}
          </p>
          <p className="text-[12px] text-[#780000]/85 m-0 truncate">
            {primary.patientName || 'Patient'} needs crisis coordination
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onEnter(primary.caseId)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#c1121f] text-white text-[13px] font-bold tracking-wide uppercase border-none cursor-pointer animate-[warPulse_1.6s_ease-in-out_infinite]"
      >
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        Enter War Room
      </button>
      <style>{`
        @keyframes warPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(193, 18, 31, 0.45); }
          50% { box-shadow: 0 0 0 10px rgba(193, 18, 31, 0); }
        }
      `}</style>
    </div>
  )
}
