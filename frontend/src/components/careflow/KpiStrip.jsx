import { CalendarDays, AlertTriangle, Siren, ClipboardList } from 'lucide-react'
import { isToday } from '../../utils/status'

export default function KpiStrip({ cases = [] }) {
  const casesToday = cases.filter((c) => isToday(c.createdAt)).length
  const needsReview = cases.filter((c) => c.requires_human_review).length
  const activeEmergencies = cases.filter((c) => c.urgency === 'emergency').length
  const openCases = cases.filter((c) => !c.topDiagnosis || c.requires_human_review).length

  const stats = [
    { label: 'Cases today', value: casesToday, icon: CalendarDays, tone: 'neutral' },
    { label: 'Needs review', value: needsReview, icon: AlertTriangle, tone: 'caution' },
    { label: 'Active emergencies', value: activeEmergencies, icon: Siren, tone: 'danger' },
    { label: 'Open cases', value: openCases, icon: ClipboardList, tone: 'safe' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </div>
  )
}

const TONE_CLASSES = {
  neutral: { bg: 'bg-[var(--cf-surface-sunken)]', text: 'text-[var(--cf-ink-soft)]' },
  caution: { bg: 'bg-[var(--cf-caution-soft)]', text: 'text-[var(--cf-caution)]' },
  danger: { bg: 'bg-[var(--cf-danger-soft)]', text: 'text-[var(--cf-danger-ink)]' },
  safe: { bg: 'bg-[var(--cf-safe-soft)]', text: 'text-[var(--cf-safe)]' },
}

function StatCard({ label, value, icon: Icon, tone }) {
  const t = TONE_CLASSES[tone]
  return (
    <div className="rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${t.bg}`}>
        <Icon size={17} className={t.text} strokeWidth={2} />
      </div>
      <div>
        <p className="text-[13px] text-[var(--cf-ink-faint)]">{label}</p>
        <p
          className="text-[22px] leading-none font-semibold text-[var(--cf-ink)] mt-1"
          style={{ fontFamily: 'var(--cf-font-mono)' }}
        >
          {value}
        </p>
      </div>
    </div>
  )
}
