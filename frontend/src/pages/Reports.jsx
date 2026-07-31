import React, { useEffect, useMemo, useState } from 'react'
import {
  Download,
  FileSpreadsheet,
  Loader2,
  Printer,
  Search,
  Inbox,
} from 'lucide-react'
import ReportDocument from '../components/careflow/ReportDocument'
import { PatientAvatar } from '../components/careflow/PatientPhotoCapture'
import { fetchCase, fetchCases } from '../features/careflow/submitCase'
import { downloadExcel, downloadPdf } from '../utils/reportExport'
import { severityOf, severityClasses, timeAgo, urgencyLabel } from '../utils/status'

const btn =
  'inline-flex items-center gap-1.5 text-[12.5px] px-3 py-2 rounded-lg border border-[var(--cf-border)] bg-white text-[var(--cf-ink)] hover:bg-[var(--cf-surface-sunken)] cursor-pointer disabled:opacity-50'
const btnPrimary =
  'inline-flex items-center gap-1.5 text-[12.5px] px-3 py-2 rounded-lg border border-[var(--cf-brand)] bg-[var(--cf-brand)] text-white cursor-pointer disabled:opacity-50'

export default function Reports() {
  const [cases, setCases] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [q, setQ] = useState('')
  const [caseId, setCaseId] = useState(null)
  const [caseData, setCaseData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchCases()
      .then((list) => {
        const sorted = [...list].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )
        setCases(sorted)
        if (sorted[0]?.caseId) setCaseId(sorted[0].caseId)
      })
      .catch(console.error)
      .finally(() => setListLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!q.trim()) return cases
    const needle = q.trim().toLowerCase()
    return cases.filter(
      (c) =>
        (c.patientName || '').toLowerCase().includes(needle) ||
        (c.caseId || '').toLowerCase().includes(needle) ||
        (c.topDiagnosis || '').toLowerCase().includes(needle)
    )
  }, [cases, q])

  useEffect(() => {
    if (!caseId) {
      setCaseData(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchCase(caseId)
      .then((data) => {
        if (!cancelled) setCaseData(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setCaseData(null)
          setError(err?.response?.data?.message || 'Failed to load case.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [caseId])

  const onPdf = async () => {
    if (!caseData) return
    setPdfBusy(true)
    try {
      await downloadPdf(caseData)
    } catch (e) {
      console.error(e)
      setError('PDF export failed.')
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <div className="cf-report-print-root pb-10">
      <div className="mb-6 no-print flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[var(--cf-ink)] m-0">
            Patient Reports
          </h1>
          <p className="text-[14px] text-[var(--cf-ink-faint)] mt-1 mb-0">
            Select a patient to preview, download, or print their case report.
          </p>
        </div>
        {caseData && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} onClick={onPdf} disabled={pdfBusy}>
              {pdfBusy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              Download PDF
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => downloadExcel(caseData)}
            >
              <FileSpreadsheet size={14} /> Download Excel
            </button>
            <button type="button" className={btn} onClick={() => window.print()}>
              <Printer size={14} /> Print
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-[13px] text-[var(--cf-danger)] mb-3 no-print">{error}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">
        {/* Always-visible patient list */}
        <aside className="rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] overflow-hidden no-print flex flex-col max-h-[min(720px,calc(100vh-12rem))]">
          <div className="px-4 pt-4 pb-3 border-b border-[var(--cf-border)] shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] tracking-wide uppercase m-0">
                Patients
              </h2>
              <span className="text-[12px] text-[var(--cf-ink-faint)] tabular-nums">
                {filtered.length}
                {q.trim() ? ` of ${cases.length}` : ''}
              </span>
            </div>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cf-ink-faint)]"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, case ID…"
                className="w-full text-[13px] border border-[var(--cf-border)] rounded-lg pl-9 pr-3 py-2 bg-white outline-none focus:border-[var(--cf-brand)]"
              />
            </div>
          </div>

          <ul className="m-0 p-0 list-none overflow-y-auto flex-1">
            {listLoading && (
              <li className="px-4 py-10 grid place-items-center text-[var(--cf-ink-faint)]">
                <Loader2 size={20} className="animate-spin" />
              </li>
            )}
            {!listLoading && filtered.length === 0 && (
              <li className="px-4 py-10 text-center">
                <Inbox size={20} className="mx-auto text-[var(--cf-ink-faint)] mb-2" />
                <p className="text-[13px] text-[var(--cf-ink-faint)] m-0">
                  {cases.length === 0
                    ? 'No patients yet. Add a case from New Case.'
                    : 'No matches for this search.'}
                </p>
              </li>
            )}
            {!listLoading &&
              filtered.map((c) => {
                const selected = c.caseId === caseId
                const sev = severityClasses(severityOf(c))
                return (
                  <li key={c.caseId} className="border-b border-[var(--cf-border)] last:border-0">
                    <button
                      type="button"
                      onClick={() => setCaseId(c.caseId)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left border-none cursor-pointer transition-colors ${
                        selected
                          ? 'bg-[var(--cf-brand-soft)]'
                          : 'bg-transparent hover:bg-[var(--cf-surface-sunken)]'
                      }`}
                    >
                      <PatientAvatar
                        photoUrl={c.photoUrl}
                        name={c.patientName}
                        size={40}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${sev.dot}`}
                          />
                          <span
                            className={`text-[13.5px] font-medium truncate ${
                              selected
                                ? 'text-[var(--cf-brand)]'
                                : 'text-[var(--cf-ink)]'
                            }`}
                          >
                            {c.patientName || 'Unknown'}
                          </span>
                        </span>
                        <span className="block text-[12px] text-[var(--cf-ink-faint)] truncate mt-0.5">
                          {c.topDiagnosis || 'Diagnosis pending'}
                        </span>
                        <span className="block text-[11px] text-[var(--cf-ink-faint)] mt-0.5">
                          {c.caseId?.slice(0, 8)}… ·{' '}
                          {urgencyLabel(c.urgency)} · {timeAgo(c.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
          </ul>
        </aside>

        {/* Report preview */}
        <div className="min-w-0">
          {loading && (
            <div className="flex justify-center py-16 text-[var(--cf-ink-faint)] no-print">
              <Loader2 size={22} className="animate-spin" />
            </div>
          )}

          {!loading && !caseData && (
            <div className="rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] py-16 text-center no-print">
              <p className="text-[13px] text-[var(--cf-ink-faint)] m-0">
                Select a patient from the list to preview their report.
              </p>
            </div>
          )}

          {!loading && caseData && <ReportDocument case={caseData} />}
        </div>
      </div>
    </div>
  )
}
