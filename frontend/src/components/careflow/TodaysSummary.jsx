import React, { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { isToday } from '../../utils/status'
import { CHART, URGENCY_COLORS, urgencyChartData } from '../../utils/chartColors'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
)

const card =
  'rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] p-5'

const SHIFT_LABELS = ['Morning', 'Afternoon', 'Evening', 'Night']

function shiftIndex(hour) {
  if (hour >= 6 && hour < 12) return 0
  if (hour >= 12 && hour < 18) return 1
  if (hour >= 18 && hour < 22) return 2
  return 3
}

function urgencyKey(c) {
  const u = (c.urgency || 'routine').toLowerCase()
  if (u === 'emergency') return 'emergency'
  if (u === 'urgent') return 'urgent'
  return 'routine'
}

function TodaysSummary({ cases = [] }) {
  const todayCases = useMemo(
    () => cases.filter((c) => isToday(c.createdAt)),
    [cases]
  )

  const shiftStacks = useMemo(() => {
    const stacks = {
      routine: [0, 0, 0, 0],
      urgent: [0, 0, 0, 0],
      emergency: [0, 0, 0, 0],
    }
    for (const c of todayCases) {
      if (!c.createdAt) continue
      const i = shiftIndex(new Date(c.createdAt).getHours())
      stacks[urgencyKey(c)][i]++
    }
    return stacks
  }, [todayCases])

  const shiftTotals = useMemo(
    () =>
      SHIFT_LABELS.map(
        (_, i) =>
          shiftStacks.routine[i] + shiftStacks.urgent[i] + shiftStacks.emergency[i]
      ),
    [shiftStacks]
  )

  const hourly = useMemo(() => {
    const counts = Array.from({ length: 24 }, () => 0)
    for (const c of todayCases) {
      if (!c.createdAt) continue
      counts[new Date(c.createdAt).getHours()]++
    }
    return counts
  }, [todayCases])

  const urg = useMemo(() => urgencyChartData(todayCases), [todayCases])

  const stackedBarData = useMemo(
    () => ({
      labels: SHIFT_LABELS,
      datasets: [
        {
          label: 'Routine',
          data: shiftStacks.routine,
          backgroundColor: URGENCY_COLORS.routine,
          hoverBackgroundColor: '#64748b',
          borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 6, bottomRight: 6 },
          borderSkipped: false,
          maxBarThickness: 42,
          stack: 'shift',
        },
        {
          label: 'Urgent',
          data: shiftStacks.urgent,
          backgroundColor: URGENCY_COLORS.urgent,
          hoverBackgroundColor: '#334155',
          borderSkipped: false,
          maxBarThickness: 42,
          stack: 'shift',
        },
        {
          label: 'Emergency',
          data: shiftStacks.emergency,
          backgroundColor: URGENCY_COLORS.emergency,
          hoverBackgroundColor: '#020617',
          borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
          borderSkipped: false,
          maxBarThickness: 42,
          stack: 'shift',
        },
      ],
    }),
    [shiftStacks]
  )

  const barOpts = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 900,
        easing: 'easeOutQuart',
      },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            borderRadius: 2,
            useBorderRadius: true,
            font: { size: 11 },
            color: CHART.inkSoft,
            padding: 14,
          },
        },
        tooltip: {
          backgroundColor: CHART.ink,
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 12, weight: '600' },
          bodyFont: { size: 12 },
          callbacks: {
            afterBody: (items) => {
              const i = items[0]?.dataIndex ?? 0
              return `Total: ${shiftTotals[i]}`
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { color: CHART.inkFaint, font: { size: 11 } },
          border: { display: false },
        },
        y: {
          stacked: true,
          beginAtZero: true,
          suggestedMax: Math.max(4, ...shiftTotals) + 1,
          ticks: { precision: 0, color: CHART.inkFaint, font: { size: 11 } },
          grid: { color: CHART.grid },
          border: { display: false },
        },
      },
    }),
    [shiftTotals]
  )

  const sparkData = useMemo(
    () => ({
      labels: Array.from({ length: 24 }, (_, h) => `${h}`),
      datasets: [
        {
          label: 'Intakes',
          data: hourly,
          borderColor: CHART.brand,
          backgroundColor: CHART.brandSoft,
          fill: true,
          tension: 0.4,
          pointRadius: hourly.map((n) => (n > 0 ? 3 : 0)),
          pointHoverRadius: 5,
          pointBackgroundColor: CHART.brand,
          borderWidth: 2,
        },
      ],
    }),
    [hourly]
  )

  const sparkOpts = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1100, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: CHART.ink,
          padding: 8,
          cornerRadius: 8,
          callbacks: {
            title: (items) => {
              const h = Number(items[0]?.label ?? 0)
              return `${String(h).padStart(2, '0')}:00`
            },
            label: (ctx) => ` ${ctx.parsed.y} intake${ctx.parsed.y === 1 ? '' : 's'}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: CHART.inkFaint,
            font: { size: 9 },
            maxRotation: 0,
            callback: (_, i) => (i % 4 === 0 ? `${String(i).padStart(2, '0')}` : ''),
          },
          border: { display: false },
        },
        y: {
          display: false,
          beginAtZero: true,
        },
      },
    }),
    []
  )

  const doughnutOpts = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1000,
        easing: 'easeOutBack',
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: CHART.ink,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed
              const pct = urg.total ? Math.round((v / urg.total) * 100) : 0
              return ` ${ctx.label}: ${v} (${pct}%)`
            },
          },
        },
      },
    }),
    [urg.total]
  )

  const peakShift = useMemo(() => {
    let max = -1
    let idx = 0
    shiftTotals.forEach((n, i) => {
      if (n > max) {
        max = n
        idx = i
      }
    })
    return max > 0 ? SHIFT_LABELS[idx] : null
  }, [shiftTotals])

  const legendRows = [
    { key: 'routine', label: 'Routine', color: URGENCY_COLORS.routine, count: urg.counts.routine },
    { key: 'urgent', label: 'Urgent', color: URGENCY_COLORS.urgent, count: urg.counts.urgent },
    { key: 'emergency', label: 'Emergency', color: URGENCY_COLORS.emergency, count: urg.counts.emergency },
  ]

  return (
    <div>
      <h2 className="text-[15px] font-semibold text-[var(--cf-ink)] mb-3">
        Today&apos;s Summary
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={card}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <p className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide m-0">
                Patients today
              </p>
              <p className="text-[12px] text-[var(--cf-ink-faint)] mt-1 mb-0">
                Stacked by urgency · {todayCases.length} total
                {peakShift ? ` · peak ${peakShift}` : ''}
              </p>
            </div>
          </div>

          <div className="h-[200px] mt-3">
            <Bar data={stackedBarData} options={barOpts} />
          </div>

          {/* Empty-shift hint chips */}
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {SHIFT_LABELS.map((label, i) => (
              <div
                key={label}
                className={`rounded-md px-1.5 py-1 text-center border ${
                  shiftTotals[i] === 0
                    ? 'border-dashed border-[var(--cf-border)] bg-[var(--cf-surface-sunken)]'
                    : 'border-transparent bg-[var(--cf-surface-sunken)]'
                }`}
              >
                <p className="text-[9px] uppercase tracking-wide text-[var(--cf-ink-faint)] m-0">
                  {label.slice(0, 3)}
                </p>
                <p className="text-[13px] font-semibold text-[var(--cf-ink)] m-0 leading-tight">
                  {shiftTotals[i]}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--cf-border)]">
            <p className="text-[11px] font-medium text-[var(--cf-ink-faint)] mb-2 uppercase tracking-wide">
              Intake pulse · 24h
            </p>
            <div className="h-[72px]">
              <Line data={sparkData} options={sparkOpts} />
            </div>
          </div>
        </div>

        <div className={card}>
          <p className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide mb-1">
            Urgency mix
          </p>
          <p className="text-[12px] text-[var(--cf-ink-faint)] mb-3">
            Today&apos;s cases by clinical priority
          </p>

          <div className="flex flex-col items-center gap-4">
            <div className="relative w-[200px] h-[200px]">
              {urg.total === 0 ? (
                <div className="w-full h-full rounded-full border-[14px] border-[var(--cf-border)] grid place-items-center">
                  <p className="text-[12px] text-[var(--cf-ink-faint)]">No cases</p>
                </div>
              ) : (
                <>
                  <Doughnut data={urg} options={doughnutOpts} />
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <p className="text-[28px] font-semibold text-[var(--cf-ink)] leading-none m-0">
                        {urg.total}
                      </p>
                      <p className="text-[11px] text-[var(--cf-ink-faint)] mt-1 mb-0">cases</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="w-full space-y-2.5">
              {legendRows.map((row) => {
                const pct = urg.total ? Math.round((row.count / urg.total) * 100) : 0
                return (
                  <div key={row.key} className="flex items-center gap-3">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="text-[13px] text-[var(--cf-ink-soft)] w-20">{row.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-[var(--cf-surface-sunken)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: row.color,
                          minWidth: row.count > 0 ? '6px' : 0,
                        }}
                      />
                    </div>
                    <span className="text-[13px] font-semibold text-[var(--cf-ink)] tabular-nums w-14 text-right">
                      {row.count}
                      <span className="text-[11px] font-normal text-[var(--cf-ink-faint)] ml-1">
                        {pct}%
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TodaysSummary
