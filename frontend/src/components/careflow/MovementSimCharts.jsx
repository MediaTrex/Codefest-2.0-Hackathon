import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { AGENT_STAGES, stageIdForCase } from '../../utils/pipelineStage'
import { CHART } from '../../utils/chartColors'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend
)

const HISTORY = 24
const TICK_MS = 1400

const STAGE_COLORS = [
  '#003049',
  '#0a3d56',
  '#1a4a63',
  '#3d6f8a',
  '#669bbc',
  '#8fb4ce',
  '#a8c9db',
]

function countByStage(cases) {
  const counts = Object.fromEntries(AGENT_STAGES.map((s) => [s.id, 0]))
  for (const c of cases) {
    const id = stageIdForCase(c)
    if (counts[id] != null) counts[id] += 1
  }
  return counts
}

function seedSeries(baseCounts) {
  const labels = []
  const series = Object.fromEntries(AGENT_STAGES.map((s) => [s.id, []]))
  const flow = []
  const now = Date.now()
  for (let i = HISTORY - 1; i >= 0; i--) {
    const t = new Date(now - i * TICK_MS)
    labels.push(
      t.toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })
    )
    let sum = 0
    for (const s of AGENT_STAGES) {
      const wobble = Math.max(
        0,
        Math.round((baseCounts[s.id] || 0) + (Math.random() - 0.45) * 2)
      )
      series[s.id].push(wobble)
      sum += wobble
    }
    flow.push(Math.max(0, sum + Math.round((Math.random() - 0.3) * 3)))
  }
  return { labels, series, flow }
}

export default function MovementSimCharts({ cases = [] }) {
  const baseCounts = useMemo(() => countByStage(cases), [cases])
  const seed = useMemo(() => seedSeries(baseCounts), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [labels, setLabels] = useState(seed.labels)
  const [series, setSeries] = useState(seed.series)
  const [flow, setFlow] = useState(seed.flow)
  const [moves, setMoves] = useState(0)
  const tickRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current += 1
      const t = new Date()
      const label = t.toLocaleTimeString([], {
        minute: '2-digit',
        second: '2-digit',
      })

      setLabels((prev) => [...prev.slice(1), label])
      setSeries((prev) => {
        const next = {}
        for (const s of AGENT_STAGES) {
          const live = baseCounts[s.id] || 0
          const last = prev[s.id][prev[s.id].length - 1] ?? live
          // Blend live count with mild simulation drift
          const drift = (Math.random() - 0.5) * 1.4
          const val = Math.max(0, Math.round(live * 0.65 + last * 0.35 + drift))
          next[s.id] = [...prev[s.id].slice(1), val]
        }
        return next
      })
      setFlow((prev) => {
        const total = Object.values(baseCounts).reduce((a, b) => a + b, 0)
        const last = prev[prev.length - 1] ?? total
        const nextVal = Math.max(
          0,
          Math.round(total * 0.5 + last * 0.5 + (Math.random() - 0.4) * 2)
        )
        return [...prev.slice(1), nextVal]
      })
      if (Math.random() > 0.35) setMoves((m) => m + 1)
    }, TICK_MS)
    return () => clearInterval(id)
  }, [baseCounts])

  const zoneBar = useMemo(
    () => ({
      labels: AGENT_STAGES.map((s) => s.label),
      datasets: [
        {
          label: 'Patients in zone',
          data: AGENT_STAGES.map((s) => baseCounts[s.id] || 0),
          backgroundColor: STAGE_COLORS.map((c) => c + 'cc'),
          borderColor: STAGE_COLORS,
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.7,
        },
      ],
    }),
    [baseCounts]
  )

  const flowLine = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: 'Active on floor',
          data: flow,
          borderColor: CHART.brand,
          backgroundColor: CHART.brandSoft,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    }),
    [labels, flow]
  )

  const stackedLines = useMemo(
    () => ({
      labels,
      datasets: AGENT_STAGES.map((s, i) => ({
        label: s.label,
        data: series[s.id] || [],
        borderColor: STAGE_COLORS[i],
        backgroundColor: 'transparent',
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 1.75,
      })),
    }),
    [labels, series]
  )

  const commonOpts = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 650, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: CHART.ink,
        titleFont: { size: 11 },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 6,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: CHART.inkFaint, font: { size: 10 }, maxTicksLimit: 8 },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, color: CHART.inkFaint, font: { size: 10 } },
        grid: { color: CHART.grid },
        border: { display: false },
      },
    },
  }

  const card =
    'rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] p-4'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className={`${card} lg:col-span-1`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--cf-ink)] m-0">
              Zone load
            </h3>
            <p className="text-[12px] text-[var(--cf-ink-faint)] m-0 mt-0.5">
              Live occupancy by stage
            </p>
          </div>
          <span className="text-[11px] text-[var(--cf-ink-soft)] tabular-nums">
            {Object.values(baseCounts).reduce((a, b) => a + b, 0)} patients
          </span>
        </div>
        <div className="h-[180px]">
          <Bar data={zoneBar} options={commonOpts} />
        </div>
      </div>

      <div className={`${card} lg:col-span-1`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--cf-ink)] m-0">
              Floor pulse
            </h3>
            <p className="text-[12px] text-[var(--cf-ink-faint)] m-0 mt-0.5">
              Simulated throughput · updating
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--cf-ink-soft)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--cf-brand)] animate-pulse" />
            Live
          </span>
        </div>
        <div className="h-[180px]">
          <Line data={flowLine} options={commonOpts} />
        </div>
      </div>

      <div className={`${card} lg:col-span-1`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--cf-ink)] m-0">
              Movement streams
            </h3>
            <p className="text-[12px] text-[var(--cf-ink-faint)] m-0 mt-0.5">
              Per-zone simulation · {moves} shifts
            </p>
          </div>
        </div>
        <div className="h-[180px]">
          <Line
            data={stackedLines}
            options={{
              ...commonOpts,
              plugins: {
                ...commonOpts.plugins,
                legend: {
                  display: true,
                  position: 'bottom',
                  labels: {
                    boxWidth: 8,
                    boxHeight: 8,
                    font: { size: 9 },
                    color: CHART.inkSoft,
                    padding: 8,
                  },
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}
