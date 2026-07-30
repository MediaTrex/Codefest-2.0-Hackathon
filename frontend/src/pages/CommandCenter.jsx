import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import KpiStrip from '../components/careflow/KpiStrip'
import PipelineFlowMap from '../components/careflow/PipelineFlowMap'
import LiveFeed from '../components/careflow/LiveFeed'
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
            Real-time hospital operations across the CareFlow AI pipeline
          </p>
        </div>
        <div className="flex items-center gap-2 text-[12.5px] text-[var(--cf-safe)] font-medium pt-1">
          <span className="w-2 h-2 rounded-full bg-[var(--cf-safe)] animate-pulse" />
          Systems live
        </div>
      </div>

      <div className="mb-4">
        <KpiStrip cases={cases} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        <PipelineFlowMap stageGroups={stageGroups} onSelectCase={onSelectCase} />
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
