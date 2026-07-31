import { AGENT_STAGES, stageIdForCase } from '../../utils/pipelineStage'
import { urgencyLabel } from '../../utils/status'
import '../../styles/report-print.css'

const AUTOPSY_DISCLAIMER =
  'AI-generated estimate for workflow demonstration only — not a certified forensic or medical-legal determination.'

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function pipelineStatus(caseData) {
  const timeline = Array.isArray(caseData.timeline) ? caseData.timeline : []
  const currentId = stageIdForCase(caseData)

  return AGENT_STAGES.map((stage) => {
    const step = timeline.find(
      (t) =>
        t.agent === stage.agentName ||
        String(t.agent || '').toLowerCase().includes(stage.label.toLowerCase())
    )
    if (step?.status === 'completed') return { ...stage, mark: 'done' }
    if (stage.id === currentId) return { ...stage, mark: 'current' }
    if (step?.status === 'in_progress') return { ...stage, mark: 'current' }
    return { ...stage, mark: 'pending' }
  })
}

export default function ReportDocument({ case: c }) {
  if (!c) return null

  const age = c.patient_information?.age ?? c.age ?? '—'
  const gender = c.patient_information?.gender ?? c.gender ?? '—'
  const generated = new Date().toLocaleString()
  const stages = pipelineStatus(c)

  return (
    <article className="cf-report-doc" id="cf-report-doc">
      <header>
        <div className="cf-report-brand-row">
          <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#0a0a0b" />
            <path
              d="M16 6.5L24.2 22.4h-4.6L16 15.2l-3.6 7.2H7.8L16 6.5z"
              fill="#fff"
            />
            <path
              d="M9 25.2h3.2l1.2-2.4 1.6 4.2 1.4-3.2H23"
              fill="none"
              stroke="#fff"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="cf-report-brand">CarePilot Ai</p>
        </div>
        <h1>Patient Case Report</h1>
        <p className="cf-report-meta">Generated {generated}</p>
        <hr className="cf-report-rule" />
      </header>

      <section>
        <h2>Patient information</h2>
        <div className="cf-report-grid">
          <div>
            <strong>Patient:</strong> {c.patientName || 'Unknown'}
          </div>
          <div>
            <strong>Case ID:</strong> {c.caseId}
          </div>
          <div>
            <strong>Age:</strong> {age}
          </div>
          <div>
            <strong>Gender:</strong> {gender}
          </div>
          <div>
            <strong>Assigned doctor:</strong>{' '}
            {c.assignedDoctor?.name || 'Unassigned'}
          </div>
          <div>
            <strong>Urgency:</strong> {urgencyLabel(c.urgency)}
          </div>
          <div>
            <strong>Created:</strong> {fmtDate(c.createdAt)}
          </div>
          <div>
            <strong>Top diagnosis:</strong> {c.topDiagnosis || '—'}
          </div>
        </div>
      </section>

      <section>
        <h2>AI case summary</h2>
        <p>{c.aiNarrative || c.description || 'No summary available.'}</p>
        <p className="cf-report-meta">
          AI Confidence:{' '}
          {c.aiConfidence != null ? `${c.aiConfidence}%` : '—'} (intake
          completeness, not diagnostic certainty)
        </p>
      </section>

      <section>
        <h2>Pipeline timeline</h2>
        <ul className="cf-report-pipeline">
          {stages.map((s) => (
            <li key={s.id} className={s.mark}>
              {s.label}
              {s.mark === 'done'
                ? ' ✓'
                : s.mark === 'current'
                  ? ' …'
                  : ' — pending'}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Labs</h2>
        {(c.labs || []).length === 0 ? (
          <p className="cf-report-meta">No labs recorded.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {c.labs.map((lab, i) => (
                <tr key={i}>
                  <td>{lab.name}</td>
                  <td>{lab.status || '—'}</td>
                  <td>{lab.resultSummary || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Prescriptions</h2>
        {(c.prescriptions || []).length === 0 ? (
          <p className="cf-report-meta">No prescriptions recorded.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Drug</th>
                <th>Dose</th>
                <th>Frequency</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {c.prescriptions.map((rx, i) => (
                <tr key={i}>
                  <td>{rx.drug}</td>
                  <td>{rx.dose || '—'}</td>
                  <td>{rx.frequency || '—'}</td>
                  <td>{rx.source || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2>Uploaded reports</h2>
        {(c.uploadedReports || []).length === 0 ? (
          <p className="cf-report-meta">No uploaded reports.</p>
        ) : (
          <ul style={{ paddingLeft: '1.2em', margin: '8px 0 0' }}>
            {c.uploadedReports.map((r) => (
              <li key={r.fileId} style={{ marginBottom: 10 }}>
                <strong>{r.fileName}</strong> ({r.type}) —{' '}
                {r.aiConfidence != null ? `${r.aiConfidence}%` : '—'}
                <br />
                <span style={{ fontSize: '11pt' }}>{r.aiNarrative}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {c.autopsyEstimate && (
        <section>
          <h2>Autopsy / time-of-death estimate</h2>
          <p>{c.autopsyEstimate.aiNarrative}</p>
          <p className="cf-report-meta">
            Estimated range:{' '}
            {fmtDate(c.autopsyEstimate.timeOfDeathRangeStart)} →{' '}
            {fmtDate(c.autopsyEstimate.timeOfDeathRangeEnd)} · Confidence:{' '}
            {c.autopsyEstimate.aiConfidence != null
              ? `${c.autopsyEstimate.aiConfidence}%`
              : '—'}
          </p>
          <p className="cf-report-disclaimer">{AUTOPSY_DISCLAIMER}</p>
        </section>
      )}

      <footer className="cf-report-footer">
        <span>
          Next follow-up:{' '}
          {c.nextFollowUpDate ? fmtDate(c.nextFollowUpDate) : 'Not scheduled'}
        </span>
        <span>CarePilot Ai · confidential</span>
      </footer>
    </article>
  )
}
