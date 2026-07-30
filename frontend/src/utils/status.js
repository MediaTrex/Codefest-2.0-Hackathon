/**
 * Shared status/severity helpers.
 */

export function severityOf(caseItem) {
  if (!caseItem) return 'idle'
  if ((caseItem.urgency || '').toLowerCase() === 'emergency') return 'danger'
  if (caseItem.requires_human_review) return 'caution'
  if ((caseItem.urgency || '').toLowerCase() === 'urgent') return 'caution'
  return 'safe'
}

const TONE_MAP = {
  danger: {
    text: 'text-[var(--cf-danger-ink)]',
    bg: 'bg-[var(--cf-danger-soft)]',
    border: 'border-[var(--cf-danger-border)]',
    dot: 'bg-[var(--cf-danger)]',
    label: 'Emergency',
  },
  caution: {
    text: 'text-[var(--cf-caution)]',
    bg: 'bg-[var(--cf-caution-soft)]',
    border: 'border-[var(--cf-caution-border)]',
    dot: 'bg-[var(--cf-caution)]',
    label: 'Needs review',
  },
  safe: {
    text: 'text-[var(--cf-safe)]',
    bg: 'bg-[var(--cf-safe-soft)]',
    border: 'border-[var(--cf-safe-border)]',
    dot: 'bg-[var(--cf-safe)]',
    label: 'Routine',
  },
  idle: {
    text: 'text-[var(--cf-ink-faint)]',
    bg: 'bg-[var(--cf-surface-sunken)]',
    border: 'border-[var(--cf-border)]',
    dot: 'bg-[var(--cf-ink-faint)]',
    label: 'Idle',
  },
}

/** Object tone styles for feed / pipeline map badges. */
export function severityTone(level) {
  return TONE_MAP[level] || TONE_MAP.idle
}

/** Alias used by careflow-ui components. */
export function severityClasses(levelOrSeverity) {
  // Medication warning severities from CaseReport (string of utility classes)
  const med = (levelOrSeverity || '').toLowerCase()
  if (med === 'high' || med === 'moderate' || med === 'low' || med === '') {
    switch (med) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'moderate':
        return 'text-amber-600 bg-amber-50 border-amber-200'
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200'
    }
  }
  // Pipeline tone object
  return TONE_MAP[levelOrSeverity] || TONE_MAP.idle
}

export function urgencyClasses(urgency) {
  switch ((urgency || '').toLowerCase()) {
    case 'emergency':
      return 'text-red-600 bg-red-50 border-red-200'
    case 'urgent':
      return 'text-amber-600 bg-amber-50 border-amber-200'
    default:
      return 'text-emerald-600 bg-emerald-50 border-emerald-200'
  }
}

export function urgencyDotClass(urgency) {
  switch ((urgency || '').toLowerCase()) {
    case 'emergency':
      return 'bg-red-500'
    case 'urgent':
      return 'bg-amber-500'
    default:
      return 'bg-emerald-500'
  }
}

export function heatClasses(level) {
  switch (level) {
    case 'high':
      return 'text-red-600 bg-red-50 border-red-200'
    case 'medium':
      return 'text-amber-600 bg-amber-50 border-amber-200'
    case 'low':
      return 'text-emerald-600 bg-emerald-50 border-emerald-200'
    default:
      return 'text-slate-500 bg-slate-50 border-slate-200'
  }
}

export function urgencyLabel(urgency) {
  if ((urgency || '').toLowerCase() === 'emergency') return 'Emergency'
  if ((urgency || '').toLowerCase() === 'urgent') return 'Urgent'
  return 'Routine'
}

/** AI confidence 0–100 → caution (<60) or safe (≥60), using shared tone map. */
export function confidenceTone(score) {
  const n = Number(score)
  if (!Number.isFinite(n)) return severityTone('idle')
  return severityTone(n < 60 ? 'caution' : 'safe')
}

export function confidenceBadgeClass(score) {
  const tone = confidenceTone(score)
  return `${tone.text} ${tone.bg} ${tone.border}`
}

export { timeAgo } from './pipelineStage'

export function isToday(isoString) {
  if (!isoString) return false
  const d = new Date(isoString)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}
