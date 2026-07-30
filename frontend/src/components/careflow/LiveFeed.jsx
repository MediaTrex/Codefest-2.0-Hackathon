import { Inbox } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { severityOf, severityClasses, timeAgo } from '../../utils/status'
import { PatientAvatar } from './PatientPhotoCapture'

export default function LiveFeed({ cases = [], onSelectCase }) {
  const navigate = useNavigate()
  const select = (caseId) =>
    onSelectCase ? onSelectCase(caseId) : navigate(`/case/${caseId}`)
  const sorted = [...cases].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--cf-ink)] tracking-wide uppercase">Live feed</h3>
          <p className="text-[13px] text-[var(--cf-ink-faint)] mt-0.5">Recent pipeline cases</p>
        </div>
        <span className="flex items-center gap-1.5 text-[12px] text-[var(--cf-safe)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--cf-safe)]" />
          Live
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="flex-1 grid place-items-center text-center py-10">
          <div>
            <Inbox size={22} className="mx-auto text-[var(--cf-ink-faint)] mb-2" />
            <p className="text-[13px] text-[var(--cf-ink-faint)]">No cases yet. Log a new case from intake.</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--cf-border)] overflow-y-auto">
          {sorted.map((c) => {
            const sev = severityClasses(severityOf(c))
            return (
              <li key={c.caseId}>
                <button
                  onClick={() => select(c.caseId)}
                  className="w-full flex items-start gap-3 py-3 text-left hover:bg-[var(--cf-surface-sunken)] rounded-md px-2 -mx-2"
                >
                  <PatientAvatar photoUrl={c.photoUrl} name={c.patientName} size={36} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sev.dot}`} />
                      <span className="text-[13px] font-medium text-[var(--cf-ink)] truncate">{c.patientName}</span>
                      {c.requires_human_review && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded border border-[var(--cf-caution-border)] bg-[var(--cf-caution-soft)] text-[var(--cf-caution)]">
                          Review
                        </span>
                      )}
                    </span>
                    <span className="block text-[12.5px] text-[var(--cf-ink-faint)] truncate">
                      {c.topDiagnosis || 'Diagnosis pending'}
                    </span>
                  </span>
                  <span className="text-[12px] text-[var(--cf-ink-faint)] shrink-0">{timeAgo(c.createdAt)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
