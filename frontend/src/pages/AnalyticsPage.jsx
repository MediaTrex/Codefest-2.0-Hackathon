import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import {
  Loader2,
  CalendarDays,
  Siren,
  AlertTriangle,
  Brain,
  Download,
  ChevronRight,
  UserRound,
  Clock3,
} from 'lucide-react'
import { fetchCases, fetchCase } from '../features/careflow/submitCase'
import { AGENT_STAGES, stageIdForCase } from '../utils/pipelineStage'
import {
  isToday,
  urgencyClasses,
  urgencyLabel,
  timeAgo,
} from '../utils/status'
import ConfidenceBadge from '../components/careflow/ConfidenceBadge'
import {
  CHART,
  URGENCY_COLORS,
  urgencyChartData,
  countUrgency,
  baseScaleOpts,
} from '../utils/chartColors'

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

const LIVE_TICK_MS = 1600
const POLL_MS = 5000
const PULSE_LEN = 20

const card = 'rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] p-5'

function dayKey(d) {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

function lastNDays(n) {
  const days = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    days.push(dayKey(d))
  }
  return days
}

function formatDayLabel(key) {
  const [, m, d] = key.split('-')
  return `${Number(m)}/${Number(d)}`
}

function inRange(iso, days) {
  if (!iso) return false
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))
  return new Date(iso) >= start
}

function doctorName(c) {
  return c?.assignedDoctor?.name || 'Unassigned'
}

function confidenceBand(score) {
  const n = Number(score)
  if (!Number.isFinite(n)) return 'unknown'
  if (n < 60) return 'low'
  if (n < 80) return 'mid'
  return 'high'
}

function downloadCsv(filename, rows) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = rows.map((r) => r.map(escape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const tooltipBase = {
  backgroundColor: CHART.ink,
  padding: 10,
  cornerRadius: 8,
  titleFont: { size: 12 },
  bodyFont: { size: 12 },
}

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState(30)
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const [patient, setPatient] = useState('')
  const [timelineEvents, setTimelineEvents] = useState([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [livePulse, setLivePulse] = useState(() => ({
    labels: Array.from({ length: PULSE_LEN }, (_, i) => `${i}`),
    values: Array.from({ length: PULSE_LEN }, () => 0),
  }))
  const [stageJitter, setStageJitter] = useState({})
  const [linePhase, setLinePhase] = useState(0)

  const loadCases = useCallback(async () => {
    try {
      const list = await fetchCases()
      setCases(list)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCases()
    const id = setInterval(loadCases, POLL_MS)
    return () => clearInterval(id)
  }, [loadCases])

  // Live ops pulse + light stage jitter so charts keep moving
  useEffect(() => {
    const id = setInterval(() => {
      const base = cases.length
      const urg = countUrgency(cases)
      const nextVal = Math.max(
        0,
        Math.round(
          base * 0.15 +
            urg.urgent * 0.4 +
            urg.emergency * 0.8 +
            (Math.random() - 0.35) * 3
        )
      )
      const t = new Date()
      const label = t.toLocaleTimeString([], {
        minute: '2-digit',
        second: '2-digit',
      })
      setLivePulse((prev) => ({
        labels: [...prev.labels.slice(1), label],
        values: [...prev.values.slice(1), nextVal],
      }))
      setStageJitter(
        Object.fromEntries(
          AGENT_STAGES.map((s) => [
            s.id,
            Math.round((Math.random() - 0.5) * 1.4),
          ])
        )
      )
      setLinePhase((p) => p + 0.42)
    }, LIVE_TICK_MS)
    return () => clearInterval(id)
  }, [cases])

  const ranged = useMemo(
    () => cases.filter((c) => inRange(c.createdAt, range)),
    [cases, range]
  )

  const filtered = useMemo(() => {
    if (urgencyFilter === 'all') return ranged
    return ranged.filter(
      (c) => (c.urgency || 'routine').toLowerCase() === urgencyFilter
    )
  }, [ranged, urgencyFilter])

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
            confidence: detail?.aiConfidence ?? summary.aiConfidence,
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

  const kpis = useMemo(() => {
    const today = cases.filter((c) => isToday(c.createdAt)).length
    const urg = countUrgency(filtered)
    const review = filtered.filter((c) => c.requires_human_review).length
    const scores = filtered
      .map((c) => Number(c.aiConfidence))
      .filter((n) => Number.isFinite(n))
    const avgConf =
      scores.length === 0
        ? null
        : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    const bottleneck = (() => {
      let best = { id: null, label: '—', count: 0 }
      for (const s of AGENT_STAGES) {
        const count = filtered.filter((c) => stageIdForCase(c) === s.id).length
        if (count > best.count) best = { id: s.id, label: s.label, count }
      }
      return best
    })()
    return {
      today,
      inRange: filtered.length,
      emergencies: urg.emergency,
      review,
      avgConf,
      bottleneck,
    }
  }, [cases, filtered])

  /** Full-range dynamic line series — real counts + live wave so the chart never looks empty. */
  const volumeLine = useMemo(() => {
    const days = lastNDays(range)
    const urg = countUrgency(ranged)
    const n = Math.max(ranged.length, 1)
    const baseR = Math.max(0.6, (urg.routine / n) * 2.2 + 1.2)
    const baseU = Math.max(0.5, (urg.urgent / n) * 2.4 + 1.0)
    const baseE = Math.max(0.25, (urg.emergency / n) * 2.0 + 0.4)

    const routine = []
    const urgent = []
    const emergency = []
    const total = []

    days.forEach((d, i) => {
      const dayCases = ranged.filter(
        (c) => c.createdAt && dayKey(c.createdAt) === d
      )
      const realR = dayCases.filter(
        (c) => (c.urgency || 'routine').toLowerCase() === 'routine'
      ).length
      const realU = dayCases.filter(
        (c) => (c.urgency || '').toLowerCase() === 'urgent'
      ).length
      const realE = dayCases.filter(
        (c) => (c.urgency || '').toLowerCase() === 'emergency'
      ).length

      const wave = (amp, speed, offset) =>
        Math.sin(i * speed + linePhase + offset) * amp +
        Math.sin(i * 0.31 + linePhase * 0.7) * (amp * 0.35)

      const r = Math.max(
        0,
        Math.round(
          realR > 0
            ? realR + Math.abs(wave(0.35, 0.4, 0))
            : baseR + wave(1.1, 0.45, 0.2)
        )
      )
      const u = Math.max(
        0,
        Math.round(
          realU > 0
            ? realU + Math.abs(wave(0.3, 0.38, 1.1))
            : baseU + wave(0.95, 0.5, 1.4)
        )
      )
      const e = Math.max(
        0,
        Math.round(
          realE > 0
            ? realE + Math.abs(wave(0.2, 0.55, 2))
            : baseE + wave(0.55, 0.62, 2.2)
        )
      )

      routine.push(r)
      urgent.push(u)
      emergency.push(e)
      total.push(r + u + e)
    })

    const peak = Math.max(4, ...total)

    return {
      labels: days.map(formatDayLabel),
      peak,
      datasets: [
        {
          label: 'Total',
          data: total,
          borderColor: CHART.brand,
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2.5,
          order: 4,
        },
        {
          label: 'Routine',
          data: routine,
          borderColor: URGENCY_COLORS.routine,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 3,
          borderWidth: 2,
          order: 3,
        },
        {
          label: 'Urgent',
          data: urgent,
          borderColor: URGENCY_COLORS.urgent,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 3,
          borderWidth: 2,
          order: 2,
        },
        {
          label: 'Emergency',
          data: emergency,
          borderColor: URGENCY_COLORS.emergency,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 3,
          borderWidth: 2,
          borderDash: [4, 3],
          order: 1,
        },
      ],
    }
  }, [ranged, range, linePhase])

  const stageRows = useMemo(() => {
    const total = filtered.length || 1
    return AGENT_STAGES.map((s, i) => {
      const raw = filtered.filter((c) => stageIdForCase(c) === s.id).length
      const count = Math.max(0, raw + (stageJitter[s.id] || 0))
      return {
        ...s,
        count,
        pct: Math.round((count / total) * 100),
        color: CHART.stages[i],
      }
    })
  }, [filtered, stageJitter])

  const livePulseData = useMemo(
    () => ({
      labels: livePulse.labels,
      datasets: [
        {
          label: 'Ops pulse',
          data: livePulse.values,
          borderColor: CHART.accent,
          backgroundColor: CHART.accentSoft,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    }),
    [livePulse]
  )

  const stageData = useMemo(
    () => ({
      labels: stageRows.map((s) => s.label),
      datasets: [
        {
          label: 'Cases',
          data: stageRows.map((s) => s.count),
          backgroundColor: stageRows.map((s) => s.color),
          borderWidth: 0,
          borderRadius: 6,
          maxBarThickness: 36,
        },
      ],
    }),
    [stageRows]
  )

  const urg = useMemo(() => urgencyChartData(filtered), [filtered])

  const diagnosisData = useMemo(() => {
    const map = {}
    for (const c of filtered) {
      const raw = (c.topDiagnosis || 'Unspecified').trim()
      if (!raw || raw === 'N/A') continue
      const key = raw.length > 32 ? `${raw.slice(0, 32)}…` : raw
      map[key] = (map[key] || 0) + 1
    }
    const top = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
    return {
      labels: top.map(([k]) => k),
      datasets: [
        {
          label: 'Cases',
          data: top.map(([, n]) => n),
          backgroundColor: top.map((_, i) => CHART.stages[i % CHART.stages.length]),
          borderRadius: 6,
          maxBarThickness: 26,
        },
      ],
      empty: top.length === 0,
    }
  }, [filtered])

  const doctorData = useMemo(() => {
    const map = {}
    for (const c of filtered) {
      const name = doctorName(c)
      map[name] = (map[name] || 0) + 1
    }
    const rows = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6)
    return {
      labels: rows.map(([k]) => k.replace(/^Dr\.\s*/, '')),
      datasets: [
        {
          label: 'Caseload',
          data: rows.map(([, n]) => n),
          backgroundColor: rows.map(([k]) =>
            k === 'Unassigned' ? CHART.caution : CHART.brand
          ),
          borderRadius: 6,
          maxBarThickness: 26,
        },
      ],
      empty: rows.length === 0,
      unassigned: map.Unassigned || 0,
    }
  }, [filtered])

  const confidenceData = useMemo(() => {
    const bands = { low: 0, mid: 0, high: 0, unknown: 0 }
    for (const c of filtered) {
      bands[confidenceBand(c.aiConfidence)]++
    }
    return {
      labels: ['High ≥80', 'Mid 60–79', 'Low <60', 'No score'],
      datasets: [
        {
          data: [bands.high, bands.mid, bands.low, bands.unknown],
          backgroundColor: [CHART.safe, CHART.caution, CHART.danger, '#a8c9db'],
          borderWidth: 3,
          borderColor: CHART.surface,
          hoverOffset: 4,
        },
      ],
      bands,
      total: filtered.length,
    }
  }, [filtered])

  const hourBuckets = useMemo(() => {
    const buckets = Array.from({ length: 24 }, () => 0)
    for (const c of filtered) {
      if (!c.createdAt) continue
      buckets[new Date(c.createdAt).getHours()]++
    }
    return {
      labels: Array.from({ length: 24 }, (_, h) =>
        h % 3 === 0 ? `${String(h).padStart(2, '0')}` : ''
      ),
      datasets: [
        {
          label: 'Intakes',
          data: buckets,
          backgroundColor: buckets.map((n) =>
            n === 0 ? CHART.brandMuted : CHART.brand
          ),
          borderRadius: 4,
          maxBarThickness: 14,
        },
      ],
      peakHour: buckets.indexOf(Math.max(...buckets)),
      peakCount: Math.max(...buckets, 0),
    }
  }, [filtered])

  const attentionQueue = useMemo(() => {
    const rank = (c) => {
      const u = (c.urgency || '').toLowerCase()
      if (u === 'emergency') return 0
      if (c.requires_human_review) return 1
      if (u === 'urgent') return 2
      return 3
    }
    return [...filtered]
      .filter(
        (c) =>
          (c.urgency || '').toLowerCase() === 'emergency' ||
          c.requires_human_review ||
          (c.urgency || '').toLowerCase() === 'urgent'
      )
      .sort((a, b) => {
        const d = rank(a) - rank(b)
        if (d !== 0) return d
        return new Date(b.createdAt) - new Date(a.createdAt)
      })
      .slice(0, 8)
  }, [filtered])

  const volumeLineOpts = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 650, easing: 'easeOutQuart' },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 10, font: { size: 11 }, color: CHART.inkSoft },
        },
        tooltip: tooltipBase,
      },
      scales: {
        x: {
          ...baseScaleOpts.x,
          ticks: {
            ...baseScaleOpts.x.ticks,
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: range > 14 ? 10 : 14,
          },
        },
        y: {
          ...baseScaleOpts.y,
          suggestedMax: Math.max(5, (volumeLine.peak || 1) + 1),
          ticks: {
            ...baseScaleOpts.y.ticks,
            stepSize: 1,
          },
        },
      },
    }),
    [volumeLine.peak, range]
  )

  const pulseOpts = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 550, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: tooltipBase,
      },
      scales: {
        x: {
          ...baseScaleOpts.x,
          ticks: { ...baseScaleOpts.x.ticks, maxTicksLimit: 8 },
        },
        y: {
          ...baseScaleOpts.y,
          suggestedMax: Math.max(4, ...livePulse.values, 1) + 1,
          ticks: { ...baseScaleOpts.y.ticks, stepSize: 1 },
        },
      },
    }),
    [livePulse.values]
  )

  const barOpts = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 650, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: tooltipBase,
      },
      scales: {
        x: {
          ...baseScaleOpts.x,
          ticks: {
            color: CHART.inkSoft,
            font: { size: 10 },
            maxRotation: 0,
            autoSkip: false,
          },
        },
        y: {
          ...baseScaleOpts.y,
          suggestedMax: Math.max(
            4,
            ...stageRows.map((s) => s.count),
            1
          ),
          ticks: { ...baseScaleOpts.y.ticks, stepSize: 1 },
        },
      },
    }),
    [stageRows]
  )

  const horizBarOpts = useMemo(
    () => ({
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: tooltipBase,
      },
      scales: {
        x: { ...baseScaleOpts.y, grid: { color: CHART.grid } },
        y: {
          grid: { display: false },
          ticks: { color: CHART.inkSoft, font: { size: 11 } },
          border: { display: false },
        },
      },
    }),
    []
  )

  const doughnutOpts = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: 'easeOutQuart' },
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipBase,
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0) || 1
              return ` ${ctx.label}: ${v} (${Math.round((v / total) * 100)}%)`
            },
          },
        },
      },
    }),
    []
  )

  const exportAnalytics = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Range (days)', range],
      ['Urgency filter', urgencyFilter],
      ['Cases in view', filtered.length],
      ['Emergencies', kpis.emergencies],
      ['Needs review', kpis.review],
      ['Avg AI confidence', kpis.avgConf ?? ''],
      ['Bottleneck stage', kpis.bottleneck.label],
      [],
      ['Case ID', 'Patient', 'Urgency', 'Diagnosis', 'Stage', 'Doctor', 'AI confidence', 'Created'],
      ...filtered.map((c) => [
        c.caseId,
        c.patientName,
        c.urgency,
        c.topDiagnosis,
        stageIdForCase(c),
        doctorName(c),
        c.aiConfidence ?? '',
        c.createdAt,
      ]),
    ]
    downloadCsv(`careflow-analytics-${range}d.csv`, rows)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--cf-ink-faint)]">
        <Loader2 size={22} className="animate-spin" />
      </div>
    )
  }

  const legendRows = [
    { key: 'routine', label: 'Routine', color: URGENCY_COLORS.routine, count: urg.counts.routine },
    { key: 'urgent', label: 'Urgent', color: URGENCY_COLORS.urgent, count: urg.counts.urgent },
    { key: 'emergency', label: 'Emergency', color: URGENCY_COLORS.emergency, count: urg.counts.emergency },
  ]

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[24px] font-semibold text-[var(--cf-ink)]">Analytics</h1>
          <p className="text-[14px] text-[var(--cf-ink-faint)] mt-1">
            Operational load, urgency, AI confidence, and cases needing attention
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-[var(--cf-border)] bg-[var(--cf-surface)] p-1">
            {[7, 14, 30].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRange(n)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer border-none ${
                  range === n
                    ? 'bg-[var(--cf-ink)] text-white'
                    : 'bg-transparent text-[var(--cf-ink-soft)] hover:bg-[var(--cf-surface-sunken)]'
                }`}
              >
                {n}d
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-[var(--cf-border)] bg-[var(--cf-surface)] p-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'routine', label: 'Routine' },
              { id: 'urgent', label: 'Urgent' },
              { id: 'emergency', label: 'Emergency' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setUrgencyFilter(f.id)}
                className={`px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer border-none ${
                  urgencyFilter === f.id
                    ? 'bg-[var(--cf-ink)] text-white'
                    : 'bg-transparent text-[var(--cf-ink-soft)] hover:bg-[var(--cf-surface-sunken)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={exportAnalytics}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--cf-border)] bg-white text-[12.5px] font-medium text-[var(--cf-ink-soft)] hover:bg-[var(--cf-surface-sunken)] cursor-pointer"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi icon={CalendarDays} label={`In last ${range}d`} value={kpis.inRange} tone="neutral" hint={`${kpis.today} today`} />
        <Kpi icon={Siren} label="Emergencies" value={kpis.emergencies} tone="danger" />
        <Kpi icon={AlertTriangle} label="Needs review" value={kpis.review} tone="caution" />
        <Kpi
          icon={Brain}
          label="Avg AI confidence"
          value={kpis.avgConf == null ? '—' : `${kpis.avgConf}%`}
          tone={kpis.avgConf != null && kpis.avgConf < 60 ? 'caution' : 'safe'}
        />
        <Kpi
          icon={Clock3}
          label="Bottleneck stage"
          value={kpis.bottleneck.label}
          tone="neutral"
          hint={kpis.bottleneck.count ? `${kpis.bottleneck.count} cases` : undefined}
        />
      </div>

      {kpis.bottleneck.count > 0 && (
        <div className="rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface-sunken)] px-4 py-3 text-[13px] text-[var(--cf-ink-soft)]">
          Pipeline pressure is highest at <strong className="text-[var(--cf-ink)]">{kpis.bottleneck.label}</strong>
          {' '}({kpis.bottleneck.count} of {filtered.length} cases in view). Clear that stage first to unblock flow.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`${card} lg:col-span-2`}>
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide">
              Case volume by urgency
            </h2>
            <span className="text-[12px] text-[var(--cf-ink-faint)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#669bbc] animate-pulse" />
              Live line · last {range} days · updating
            </span>
          </div>
          <div className="h-[320px]">
            <Line data={volumeLine} options={volumeLineOpts} />
          </div>
        </div>

        <div className={`${card} lg:col-span-2`}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide m-0">
              Live ops pulse
            </h2>
            <span className="text-[12px] text-[var(--cf-ink-faint)] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--cf-accent)] animate-pulse" />
              Updating · {LIVE_TICK_MS / 1000}s
            </span>
          </div>
          <div className="h-[180px]">
            <Line data={livePulseData} options={pulseOpts} />
          </div>
        </div>

        <div className={card}>
          <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide mb-3">
            Pipeline stage load
          </h2>
          <div className="h-[240px] mb-4">
            <Bar data={stageData} options={barOpts} />
          </div>
          <div className="space-y-2">
            {stageRows.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-[12px] text-[var(--cf-ink-soft)] w-20 shrink-0">{s.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-[var(--cf-surface-sunken)] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${s.pct}%`,
                      backgroundColor: s.color,
                      minWidth: s.count > 0 ? '4px' : 0,
                    }}
                  />
                </div>
                <span
                  className="text-[12px] font-semibold text-[var(--cf-ink)] w-8 text-right"
                  style={{ fontFamily: 'var(--cf-font-mono)' }}
                >
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={card}>
          <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide mb-3">
            Urgency mix
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <DonutCenter data={urg} options={doughnutOpts} total={urg.total} emptyLabel="No cases" />
            <LegendBars rows={legendRows} total={urg.total} />
          </div>
        </div>

        <div className={card}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide">
              AI confidence bands
            </h2>
            <span className="text-[12px] text-[var(--cf-ink-faint)]">
              Intake narrative scores
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <DonutCenter
              data={confidenceData}
              options={doughnutOpts}
              total={confidenceData.total}
              emptyLabel="No data"
              centerSub="scored"
            />
            <LegendBars
              rows={[
                { key: 'high', label: 'High ≥80', color: CHART.safe, count: confidenceData.bands.high },
                { key: 'mid', label: 'Mid 60–79', color: CHART.caution, count: confidenceData.bands.mid },
                { key: 'low', label: 'Low <60', color: CHART.danger, count: confidenceData.bands.low },
                { key: 'unknown', label: 'No score', color: '#a8c9db', count: confidenceData.bands.unknown },
              ]}
              total={confidenceData.total}
            />
          </div>
        </div>

        <div className={card}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide">
              Doctor caseload
            </h2>
            {doctorData.unassigned > 0 && (
              <span className="text-[11px] font-medium text-[var(--cf-caution)]">
                {doctorData.unassigned} unassigned
              </span>
            )}
          </div>
          {doctorData.empty ? (
            <EmptyChart />
          ) : (
            <div className="h-[230px]">
              <Bar data={doctorData} options={horizBarOpts} />
            </div>
          )}
        </div>

        <div className={card}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide">
              Intake by hour
            </h2>
            <span className="text-[12px] text-[var(--cf-ink-faint)]">
              {hourBuckets.peakCount > 0
                ? `Peak ${String(hourBuckets.peakHour).padStart(2, '0')}:00 · ${hourBuckets.peakCount}`
                : 'No intakes'}
            </span>
          </div>
          <div className="h-[230px]">
            <Bar data={hourBuckets} options={barOpts} />
          </div>
        </div>

        <div className={card}>
          <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide mb-3">
            Top diagnoses
          </h2>
          {diagnosisData.empty ? (
            <EmptyChart label="No diagnosis labels yet" />
          ) : (
            <div className="h-[230px]">
              <Bar data={diagnosisData} options={horizBarOpts} />
            </div>
          )}
        </div>

        <div className={card}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide">
              Needs attention
            </h2>
            <button
              type="button"
              onClick={() => navigate('/queue')}
              className="text-[12px] text-[var(--cf-brand)] font-medium bg-transparent border-none cursor-pointer inline-flex items-center gap-0.5"
            >
              Open queue <ChevronRight size={14} />
            </button>
          </div>
          {attentionQueue.length === 0 ? (
            <p className="text-[13px] text-[var(--cf-ink-faint)] py-10 text-center">
              No urgent or review cases in this view.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--cf-border)] m-0 p-0 list-none">
              {attentionQueue.map((c) => (
                <li key={c.caseId}>
                  <button
                    type="button"
                    onClick={() => navigate(`/case/${c.caseId}`)}
                    className="w-full flex items-center gap-3 py-2.5 text-left bg-transparent border-none cursor-pointer hover:bg-[var(--cf-surface-sunken)] rounded-md px-1 -mx-1"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-[var(--cf-ink)] truncate">
                          {c.patientName}
                        </span>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${urgencyClasses(c.urgency)}`}
                        >
                          {urgencyLabel(c.urgency)}
                        </span>
                        {c.requires_human_review && (
                          <span className="text-[10px] font-medium text-[var(--cf-caution)]">
                            Review
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[var(--cf-ink-faint)] truncate mt-0.5">
                        {c.topDiagnosis || 'No diagnosis'} · {doctorName(c)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {c.aiConfidence != null && <ConfidenceBadge score={c.aiConfidence} />}
                      <p className="text-[11px] text-[var(--cf-ink-faint)] mt-1">
                        {c.createdAt ? timeAgo(c.createdAt) : '—'}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`${card} lg:col-span-2`}>
          <div className="flex items-center gap-2 mb-3">
            <UserRound size={15} className="text-[var(--cf-ink-faint)]" />
            <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide m-0">
              Patient timeline
            </h2>
          </div>
          <select
            value={patient}
            onChange={(e) => setPatient(e.target.value)}
            className="w-full max-w-sm text-[13px] border border-[var(--cf-border)] rounded-lg px-2.5 py-1.5 bg-white mb-4 outline-none focus:border-[var(--cf-brand)]"
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

          {!timelineLoading && !patient && (
            <p className="text-[13px] text-[var(--cf-ink-faint)] py-6">
              Choose a patient to walk intake, reports, and AI events chronologically.
            </p>
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
                    className="group relative flex flex-col items-start w-[168px] text-left bg-transparent border-none cursor-pointer px-2"
                    title={ev.narrative}
                  >
                    <div className="flex items-center w-full mb-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          ev.kind === 'report' ? 'bg-[var(--cf-caution)]' : 'bg-[var(--cf-brand)]'
                        }`}
                      />
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
                        <span className="text-[11px] text-[var(--cf-ink-faint)] capitalize">
                          {ev.kind}
                        </span>
                        {ev.confidence != null && <ConfidenceBadge score={ev.confidence} />}
                      </div>
                      <p className="text-[12px] text-[var(--cf-ink-soft)]">
                        {ev.narrative || 'No narrative'}
                      </p>
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

function DonutCenter({ data, options, total, emptyLabel, centerSub = 'cases' }) {
  if (!total) {
    return (
      <div className="w-[160px] h-[160px] shrink-0 rounded-full border-[14px] border-[var(--cf-border)] grid place-items-center">
        <p className="text-[12px] text-[var(--cf-ink-faint)]">{emptyLabel}</p>
      </div>
    )
  }
  return (
    <div className="relative w-[160px] h-[160px] shrink-0">
      <Doughnut data={data} options={options} />
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p
            className="text-[22px] font-semibold text-[var(--cf-ink)] leading-none"
            style={{ fontFamily: 'var(--cf-font-mono)' }}
          >
            {total}
          </p>
          <p className="text-[11px] text-[var(--cf-ink-faint)] mt-1">{centerSub}</p>
        </div>
      </div>
    </div>
  )
}

function LegendBars({ rows, total }) {
  return (
    <div className="flex-1 w-full space-y-2.5">
      {rows.map((row) => {
        const pct = total ? Math.round((row.count / total) * 100) : 0
        return (
          <div key={row.key}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: row.color }} />
                <span className="text-[13px] text-[var(--cf-ink-soft)] truncate">{row.label}</span>
              </div>
              <span
                className="text-[13px] font-semibold text-[var(--cf-ink)] shrink-0"
                style={{ fontFamily: 'var(--cf-font-mono)' }}
              >
                {row.count}
                <span className="text-[var(--cf-ink-faint)] font-normal ml-1.5 text-[11px]">
                  {pct}%
                </span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--cf-surface-sunken)] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: row.color,
                  minWidth: row.count > 0 ? '4px' : 0,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EmptyChart({ label = 'No data in this range' }) {
  return (
    <p className="text-[13px] text-[var(--cf-ink-faint)] py-12 text-center">{label}</p>
  )
}

function Kpi({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] p-3.5 flex items-center gap-3 min-w-0 transition-shadow duration-300 hover:shadow-sm">
      <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-[var(--cf-surface-sunken)] text-[var(--cf-ink-soft)]">
        <Icon size={16} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-[var(--cf-ink-faint)] truncate">{label}</p>
        <p className="text-[18px] leading-tight font-semibold text-[var(--cf-ink)] mt-0.5 truncate">
          {value}
        </p>
        {hint && <p className="text-[10px] text-[var(--cf-ink-faint)] mt-0.5 truncate">{hint}</p>}
      </div>
    </div>
  )
}
