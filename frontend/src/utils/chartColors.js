/**
 * Analytics / charts — Coolors color (not B&W).
 * Navy · Steel · Brick · Lava
 */
export const CHART = {
  brand: '#003049',
  brandSoft: 'rgba(0, 48, 73, 0.12)',
  brandMuted: 'rgba(0, 48, 73, 0.06)',
  accent: '#669bbc',
  accentSoft: 'rgba(102, 155, 188, 0.22)',
  ink: '#0a0a0b',
  inkSoft: '#3f3f46',
  inkFaint: '#71717a',
  grid: 'rgba(102, 155, 188, 0.28)',
  border: '#e4e4e7',
  surface: '#ffffff',
  safe: '#669bbc',
  safeSoft: 'rgba(102, 155, 188, 0.2)',
  caution: '#003049',
  cautionSoft: 'rgba(0, 48, 73, 0.12)',
  danger: '#c1121f',
  dangerSoft: 'rgba(193, 18, 31, 0.12)',
  shifts: ['#003049', '#1a4a63', '#669bbc', '#8fb4ce'],
  stages: [
    '#003049',
    '#0a3d56',
    '#1a4a63',
    '#3d6f8a',
    '#669bbc',
    '#8fb4ce',
    '#a8c9db',
  ],
}

export const URGENCY_COLORS = {
  routine: '#669bbc',
  urgent: '#003049',
  emergency: '#c1121f',
}

export const URGENCY_SOFT = {
  routine: 'rgba(102, 155, 188, 0.55)',
  urgent: 'rgba(0, 48, 73, 0.65)',
  emergency: 'rgba(193, 18, 31, 0.65)',
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
        backgroundColor: [
          URGENCY_COLORS.routine,
          URGENCY_COLORS.urgent,
          URGENCY_COLORS.emergency,
        ],
        hoverBackgroundColor: ['#8fb4ce', '#00263a', '#780000'],
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
