import { useNavigate } from 'react-router-dom'
import { Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { isToday, timeAgo } from '../../utils/status'
import ConfidenceBadge from './ConfidenceBadge'
import { PatientAvatar } from './PatientPhotoCapture'

const card =
  'rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] p-5'

export function exportToExcel(cases) {
  const rows = cases.map((c) => ({
    'Case ID': c.caseId,
    Patient: c.patientName,
    Urgency: c.urgency,
    Description: c.description,
    'AI Narrative': c.aiNarrative,
    'AI Confidence': c.aiConfidence,
    'Photo source': c.photoSource ?? '',
    'Assigned Doctor': c.assignedDoctor?.name ?? '',
    'Next Follow-up': c.nextFollowUpDate ?? '',
    Created: c.createdAt,
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Patients')
  XLSX.writeFile(
    wb,
    `careflow_patients_${new Date().toISOString().slice(0, 10)}.xlsx`
  )
}

export default function RecentlyAddedPanel({ cases = [], allCases = [] }) {
  const navigate = useNavigate()
  const recent = [...cases]
    .filter((c) => isToday(c.createdAt))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8)

  return (
    <div className={`${card} sticky top-4`}>
      <h2 className="text-[15px] font-semibold text-[var(--cf-ink)] mb-1">
        Recently Added
      </h2>
      <p className="text-[12px] text-[var(--cf-ink-faint)] mb-4">
        Today&apos;s intakes · confidence = intake completeness, not diagnosis certainty
      </p>

      {recent.length === 0 && (
        <p className="text-[12.5px] text-[var(--cf-ink-faint)] py-6 text-center">
          No patients added today yet.
        </p>
      )}

      <ul className="divide-y divide-[var(--cf-border)]">
        {recent.map((c) => {
          const pending = c.aiNarrative == null || c.aiNarrative === ''
          return (
            <li key={c.caseId}>
              <button
                type="button"
                onClick={() => navigate(`/case/${c.caseId}`)}
                className="w-full text-left py-3 hover:bg-[var(--cf-surface-sunken)] rounded-md px-1 -mx-1 border-none bg-transparent cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <PatientAvatar
                    photoUrl={c.photoUrl}
                    name={c.patientName}
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-[var(--cf-ink)] truncate">
                        {c.patientName || 'Unknown'}
                      </span>
                      <span className="text-[11px] text-[var(--cf-ink-faint)] shrink-0">
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    {pending ? (
                      <div className="mt-1.5 space-y-1.5">
                        <div className="h-3 w-4/5 max-w-[180px] rounded bg-[var(--cf-surface-sunken)] animate-pulse" />
                        <p className="text-[11px] text-[var(--cf-ink-faint)]">
                          AI summary pending…
                        </p>
                      </div>
                    ) : (
                      <div className="mt-1 flex items-start justify-between gap-2">
                        <p className="text-[12px] text-[var(--cf-ink-soft)] line-clamp-2">
                          {c.aiNarrative}
                        </p>
                        {c.aiConfidence != null && (
                          <ConfidenceBadge score={c.aiConfidence} className="shrink-0" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={() => exportToExcel(allCases.length ? allCases : cases)}
        className="mt-4 w-full flex items-center justify-center gap-2 text-[12.5px] py-2 rounded-lg border border-[var(--cf-border)] bg-white text-[var(--cf-ink-soft)] hover:bg-[var(--cf-surface-sunken)] cursor-pointer"
      >
        <Download size={13} /> Export to Excel
      </button>
    </div>
  )
}
