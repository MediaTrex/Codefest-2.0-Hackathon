/**
 * Hex palette for Chart.js — canvas cannot resolve CSS variables.
 * Mirrors careflow-theme.css tokens.
 */
export const CHART = {
  brand: '#4338ca',
  brandSoft: 'rgba(67, 56, 202, 0.16)',
  brandMuted: 'rgba(67, 56, 202, 0.08)',
  ink: '#12161c',
  inkSoft: '#4b5563',
  inkFaint: '#8a93a3',
  grid: 'rgba(148, 163, 184, 0.22)',
  border: '#e2e5eb',
  surface: '#ffffff',
  safe: '#15803d',
  safeSoft: 'rgba(21, 128, 61, 0.14)',
  caution: '#d97706',
  cautionSoft: 'rgba(217, 119, 6, 0.16)',
  danger: '#b91c1c',
  dangerSoft: 'rgba(185, 28, 28, 0.14)',
  shifts: ['#4338ca', '#6366f1', '#818cf8', '#a5b4fc'],
  stages: ['#4338ca', '#15803d', '#d97706', '#b91c1c', '#6366f1', '#0f766e', '#7c3aed'],
}

export const URGENCY_COLORS = {
  routine: CHART.safe,
  urgent: CHART.caution,
  emergency: CHART.danger,
}

export function countUrgency(cases = []) {
  const counts = { routine: 0, urgent: 0, emergency: 0 }
  for (const c of cases) {
    const u = (c.urgency || 'routine').toLowerCase()
    if (u === 'emergency') counts.emergency++
    else if (u === 'urgent') counts.urgent++
    else counts.routine++
  }
  return counts
}

export function urgencyChartData(cases = []) {
  const { routine, urgent, emergency } = countUrgency(cases)
  return {
    labels: ['Routine', 'Urgent', 'Emergency'],
    datasets: [
      {
        data: [routine, urgent, emergency],
        backgroundColor: [URGENCY_COLORS.routine, URGENCY_COLORS.urgent, URGENCY_COLORS.emergency],
        hoverBackgroundColor: ['#166534', '#b45309', '#991b1b'],
        borderWidth: 3,
        borderColor: CHART.surface,
        hoverOffset: 4,
      },
    ],
    counts: { routine, urgent, emergency },
    total: routine + urgent + emergency,
  }
}

export const baseScaleOpts = {
  x: {
    grid: { display: false },
    ticks: { color: CHART.inkFaint, font: { size: 11 } },
    border: { display: false },
  },
  y: {
    beginAtZero: true,
    ticks: { precision: 0, color: CHART.inkFaint, font: { size: 11 } },
    grid: { color: CHART.grid },
    border: { display: false },
  },
}
