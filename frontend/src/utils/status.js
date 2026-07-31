/**
 * Shared status/severity helpers — B&W chrome; weight carries meaning.
 * Colored urgency reserved for charts / twin via hex palettes.
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
    text: 'text-[var(--cf-ink)]',
    bg: 'bg-[var(--cf-surface-sunken)]',
    border: 'border-[var(--cf-border-strong)]',
    dot: 'bg-[var(--cf-ink)]',
    label: 'Emergency',
  },
  caution: {
    text: 'text-[var(--cf-ink-soft)]',
    bg: 'bg-[var(--cf-surface-sunken)]',
    border: 'border-[var(--cf-border)]',
    dot: 'bg-[var(--cf-ink-soft)]',
    label: 'Needs review',
  },
  safe: {
    text: 'text-[var(--cf-ink-soft)]',
    bg: 'bg-[var(--cf-surface)]',
    border: 'border-[var(--cf-border)]',
    dot: 'bg-[var(--cf-ink-faint)]',
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

export function severityTone(level) {
  return TONE_MAP[level] || TONE_MAP.idle
}

export function severityClasses(levelOrSeverity) {
  const med = (levelOrSeverity || '').toLowerCase()
  if (med === 'high' || med === 'moderate' || med === 'low' || med === '') {
    switch (med) {
      case 'high':
        return 'text-[var(--cf-ink)] bg-[var(--cf-surface-sunken)] border-[var(--cf-border-strong)]'
      case 'moderate':
        return 'text-[var(--cf-ink-soft)] bg-[var(--cf-surface-sunken)] border-[var(--cf-border)]'
      default:
        return 'text-[var(--cf-ink-faint)] bg-[var(--cf-surface)] border-[var(--cf-border)]'
    }
  }
  return TONE_MAP[levelOrSeverity] || TONE_MAP.idle
}

export function urgencyClasses(urgency) {
  switch ((urgency || '').toLowerCase()) {
    case 'emergency':
      return 'text-[var(--cf-ink)] bg-[var(--cf-surface-sunken)] border-[var(--cf-border-strong)] font-semibold'
    case 'urgent':
      return 'text-[var(--cf-ink-soft)] bg-[var(--cf-surface-sunken)] border-[var(--cf-border)]'
    default:
      return 'text-[var(--cf-ink-faint)] bg-[var(--cf-surface)] border-[var(--cf-border)]'
  }
}

export function urgencyDotClass(urgency) {
  switch ((urgency || '').toLowerCase()) {
    case 'emergency':
      return 'bg-[var(--cf-ink)]'
    case 'urgent':
      return 'bg-[var(--cf-ink-soft)]'
    default:
      return 'bg-[var(--cf-ink-faint)]'
  }
}

export function heatClasses(level) {
  switch (level) {
    case 'high':
      return 'text-[var(--cf-ink)] bg-[var(--cf-surface-sunken)] border-[var(--cf-border-strong)]'
    case 'medium':
    case 'mid':
      return 'text-[var(--cf-ink-soft)] bg-[var(--cf-surface-sunken)] border-[var(--cf-border)]'
    case 'low':
      return 'text-[var(--cf-ink-faint)] bg-[var(--cf-surface)] border-[var(--cf-border)]'
    default:
      return 'text-[var(--cf-ink-faint)] bg-[var(--cf-surface-sunken)] border-[var(--cf-border)]'
  }
}

export function confidenceTone(score) {
  const n = Number(score)
  if (!Number.isFinite(n)) return severityTone('idle')
  return severityTone(n < 60 ? 'caution' : 'safe')
}

export function confidenceBadgeClass(score) {
  const tone = confidenceTone(score)
  return `${tone.text} ${tone.bg} ${tone.border}`
}

export function urgencyLabel(urgency) {
  const u = (urgency || 'routine').toLowerCase()
  if (u === 'emergency') return 'Emergency'
  if (u === 'urgent') return 'Urgent'
  return 'Routine'
}

export function timeAgo(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function isToday(iso) {
  if (!iso) return false
  const d = new Date(iso)
  const n = new Date()
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  )
}
