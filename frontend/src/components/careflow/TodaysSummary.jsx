import React, { useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { isToday } from '../../utils/status'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

const card =
  'rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] p-5'

const SHIFT_LABELS = ['Morning', 'Afternoon', 'Evening', 'Night']

function bucketByShift(cases) {
  const buckets = [0, 0, 0, 0]
  cases.filter((c) => isToday(c.createdAt)).forEach((c) => {
    const hour = new Date(c.createdAt).getHours()
    if (hour >= 6 && hour < 12) buckets[0]++
    else if (hour >= 12 && hour < 18) buckets[1]++
    else if (hour >= 18 && hour < 22) buckets[2]++
    else buckets[3]++
  })
  return buckets
}

function TodaysSummary({ cases = [] }) {
  const todayCases = useMemo(
    () => cases.filter((c) => isToday(c.createdAt)),
    [cases]
  )

  const shiftBuckets = useMemo(() => bucketByShift(cases), [cases])

  const barData = useMemo(
    () => ({
      labels: SHIFT_LABELS,
      datasets: [
        {
          label: 'Patients',
          data: shiftBuckets,
          backgroundColor: 'var(--cf-brand)',
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 48,
        },
      ],
    }),
    [shiftBuckets]
  )

  const urgencyData = useMemo(() => {
    const routine = todayCases.filter(
      (c) => (c.urgency || 'routine').toLowerCase() === 'routine'
    ).length
    const urgent = todayCases.filter(
      (c) => (c.urgency || '').toLowerCase() === 'urgent'
    ).length
    const emergency = todayCases.filter(
      (c) => (c.urgency || '').toLowerCase() === 'emergency'
    ).length
    return {
      labels: ['Routine', 'Urgent', 'Emergency'],
      datasets: [
        {
          data: [routine, urgent, emergency],
          backgroundColor: [
            'var(--cf-safe)',
            'var(--cf-caution)',
            'var(--cf-danger)',
          ],
          borderWidth: 0,
        },
      ],
    }
  }, [todayCases])

  const barOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, color: '#64748b', font: { size: 11 } },
        grid: { color: 'rgba(148,163,184,0.25)' },
      },
    },
  }

  return (
    <div>
      <h2 className="text-[15px] font-semibold text-[var(--cf-ink)] mb-3">
        Today&apos;s Summary
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={card}>
          <p className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide mb-1">
            Patients today
          </p>
          <p className="text-[12px] text-[var(--cf-ink-faint)] mb-3">
            Volume by shift · {todayCases.length} total
          </p>
          <div className="h-[200px]">
            <Bar data={barData} options={barOpts} />
          </div>
        </div>

        <div className={card}>
          <p className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide mb-1">
            Urgency mix
          </p>
          <p className="text-[12px] text-[var(--cf-ink-faint)] mb-3">
            Today&apos;s cases by urgency
          </p>
          <div className="h-[200px] flex items-center justify-center">
            <div className="w-[200px] h-[200px]">
              <Doughnut
                data={urgencyData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { boxWidth: 10, font: { size: 11 } },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TodaysSummary
