import React from 'react'
import { confidenceBadgeClass } from '../../utils/status'

export default function ConfidenceBadge({ score, className = '' }) {
  const n = Number(score)
  const label = Number.isFinite(n) ? `${Math.round(n)}%` : '—'
  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md border ${confidenceBadgeClass(n)} ${className}`}
      style={{ fontFamily: 'var(--cf-font-mono, "IBM Plex Mono", monospace)' }}
    >
      AI {label}
    </span>
  )
}
