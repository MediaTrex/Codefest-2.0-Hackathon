import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { Loader2 } from 'lucide-react'
import { fetchCases, fetchCase } from '../features/careflow/submitCase'
import { AGENT_STAGES, stageIdForCase } from '../utils/pipelineStage'
import ConfidenceBadge from '../components/careflow/ConfidenceBadge'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
)

const card = 'rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] p-5'

function dayKey(d) {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

function last30Days() {
  const days = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    days.push(dayKey(d))
  }
  return days
}

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [patient, setPatient] = useState('')
  const [timelineEvents, setTimelineEvents] = useState([])
  const [timelineLoading, setTimelineLoading] = useState(false)

  useEffect(() => {
    fetchCases()
      .then(setCases)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const patients = useMemo(() => {
    const names = [...new Set(cases.map((c) => c.patientName).filter(Boolean))]
    return names.sort()
  }, [cases])

  useEffect(() => {
    if (!patient) {
      setTimelineEvents([])
      return
    }
    let cancelled = false
    setTimelineLoading(true)
    const matching = cases.filter((c) => c.patientName === patient)
    Promise.all(
      matching.map((c) =>
        fetchCase(c.caseId)
          .then((detail) => ({ summary: c, detail }))
          .catch(() => ({ summary: c, detail: null }))
      )
    )
      .then((rows) => {
        if (cancelled) return
        const events = []
        for (const { summary, detail } of rows) {
          events.push({
            id: `case-${summary.caseId}`,
            at: summary.createdAt,
            kind: 'case',
            label: `Case opened · ${summary.topDiagnosis || 'intake'}`,
            narrative: detail?.aiNarrative || summary.topDiagnosis || '',
            confidence: detail?.aiConfidence,
            caseId: summary.caseId,
          })
          for (const r of detail?.uploadedReports || []) {
            events.push({
              id: r.fileId,
              at: r.uploadedAt,
              kind: 'report',
              label: `Report · ${r.fileName}`,
              narrative: r.aiNarrative,
              confidence: r.aiConfidence,
              caseId: summary.caseId,
            })
          }
        }
        events.sort((a, b) => new Date(a.at) - new Date(b.at))
        setTimelineEvents(events)
      })
      .finally(() => {
        if (!cancelled) setTimelineLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [patient, cases])

  const volumeData = useMemo(() => {
    const days = last30Days()
    const counts = Object.fromEntries(days.map((d) => [d, 0]))
    for (const c of cases) {
      if (!c.createdAt) continue
      const k = dayKey(c.createdAt)
      if (k in counts) counts[k] += 1
    }
    return {
      labels: days.map((d) => d.slice(5)),
      datasets: [
        {
          label: 'Cases',
          data: days.map((d) => counts[d]),
          borderColor: 'var(--cf-brand)',
          backgroundColor: 'color-mix(in srgb, var(--cf-brand) 18%, transparent)',
          fill: true,
          tension: 0.35,
          pointRadius: 0,
        },
      ],
    }
  }, [cases])

  const stageData = useMemo(() => {
    const counts = AGENT_STAGES.map(
      (s) => cases.filter((c) => stageIdForCase(c) === s.id).length
    )
    return {
      labels: AGENT_STAGES.map((s) => s.label),
      datasets: [
        {
          label: 'Cases at stage',
          data: counts,
          backgroundColor: [
            'var(--cf-brand)',
            'var(--cf-safe)',
            'var(--cf-caution)',
            'var(--cf-danger)',
            'var(--cf-brand)',
            'var(--cf-safe)',
            'var(--cf-caution)',
          ],
          borderWidth: 0,
          borderRadius: 6,
        },
      ],
    }
  }, [cases])

  const urgencyData = useMemo(() => {
    const routine = cases.filter((c) => (c.urgency || 'routine').toLowerCase() === 'routine').length
    const urgent = cases.filter((c) => (c.urgency || '').toLowerCase() === 'urgent').length
    const emergency = cases.filter((c) => (c.urgency || '').toLowerCase() === 'emergency').length
    return {
      labels: ['Routine', 'Urgent', 'Emergency'],
      datasets: [
        {
          data: [routine, urgent, emergency],
          backgroundColor: ['var(--cf-safe)', 'var(--cf-caution)', 'var(--cf-danger)'],
          borderWidth: 0,
        },
      ],
    }
  }, [cases])

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, color: '#64748b', font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.25)' },
      },
    },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--cf-ink-faint)]">
        <Loader2 size={22} className="animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div>
        <h1 className="text-[24px] font-semibold text-[var(--cf-ink)]">Analytics</h1>
        <p className="text-[14px] text-[var(--cf-ink-faint)] mt-1">
          Case volume, stage load, urgency mix, and patient timelines
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={card}>
          <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide mb-3">
            Cases over time (30 days)
          </h2>
          <div className="h-[220px]">
            <Line data={volumeData} options={chartOpts} />
          </div>
        </div>

        <div className={card}>
          <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide mb-3">
            Stage load
          </h2>
          <div className="h-[220px]">
            <Bar data={stageData} options={chartOpts} />
          </div>
        </div>

        <div className={card}>
          <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide mb-3">
            Urgency mix
          </h2>
          <div className="h-[220px] flex items-center justify-center">
            <div className="w-[220px] h-[220px]">
              <Doughnut
                data={urgencyData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
                }}
              />
            </div>
          </div>
        </div>

        <div className={card}>
          <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide mb-3">
            Patient timeline
          </h2>
          <select
            value={patient}
            onChange={(e) => setPatient(e.target.value)}
            className="w-full text-[13px] border border-[var(--cf-border)] rounded-lg px-2.5 py-1.5 bg-white mb-4 outline-none focus:border-[var(--cf-brand)]"
          >
            <option value="">Select a patient…</option>
            {patients.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {timelineLoading && (
            <div className="flex justify-center py-8 text-[var(--cf-ink-faint)]">
              <Loader2 size={18} className="animate-spin" />
            </div>
          )}

          {!timelineLoading && patient && timelineEvents.length === 0 && (
            <p className="text-[12.5px] text-[var(--cf-ink-faint)]">No events for this patient.</p>
          )}

          {!timelineLoading && timelineEvents.length > 0 && (
            <div className="relative pt-2 pb-1 overflow-x-auto">
              <div className="flex gap-0 min-w-max items-stretch">
                {timelineEvents.map((ev, i) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => navigate(`/case/${ev.caseId}`)}
                    className="group relative flex flex-col items-start w-[160px] text-left bg-transparent border-none cursor-pointer px-2"
                    title={ev.narrative}
                  >
                    <div className="flex items-center w-full mb-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[var(--cf-brand)] shrink-0" />
                      {i < timelineEvents.length - 1 && (
                        <div className="flex-1 h-px bg-[var(--cf-border)] ml-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--cf-ink-faint)]">
                      {ev.at ? new Date(ev.at).toLocaleDateString() : '—'}
                    </p>
                    <p className="text-[12px] font-medium text-[var(--cf-ink)] mt-0.5 line-clamp-2">
                      {ev.label}
                    </p>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-2 p-2 rounded-md border border-[var(--cf-border)] bg-[var(--cf-surface)] shadow-sm absolute top-full left-0 z-10 w-[220px]">
                      <div className="flex justify-between gap-2 mb-1">
                        <span className="text-[11px] text-[var(--cf-ink-faint)] capitalize">{ev.kind}</span>
                        {ev.confidence != null && <ConfidenceBadge score={ev.confidence} />}
                      </div>
                      <p className="text-[12px] text-[var(--cf-ink-soft)]">{ev.narrative || 'No narrative'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
