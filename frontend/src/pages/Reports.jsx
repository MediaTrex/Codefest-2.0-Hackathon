import React, { useEffect, useState } from 'react'
import { Download, FileSpreadsheet, Loader2, Printer } from 'lucide-react'
import PatientPicker from '../components/careflow/PatientPicker'
import ReportDocument from '../components/careflow/ReportDocument'
import { fetchCase } from '../features/careflow/submitCase'
import { downloadExcel, downloadPdf } from '../utils/reportExport'

const btn =
  'inline-flex items-center gap-1.5 text-[12.5px] px-3 py-2 rounded-lg border border-[var(--cf-border)] bg-white text-[var(--cf-ink)] hover:bg-[var(--cf-surface-sunken)] cursor-pointer disabled:opacity-50'
const btnPrimary =
  'inline-flex items-center gap-1.5 text-[12.5px] px-3 py-2 rounded-lg border border-[var(--cf-brand)] bg-[var(--cf-brand)] text-white cursor-pointer disabled:opacity-50'

export default function Reports() {
  const [caseId, setCaseId] = useState(null)
  const [caseData, setCaseData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [error, setError] = useState(null)

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
      <div className="mb-6 no-print">
        <h1 className="text-[24px] font-semibold text-[var(--cf-ink)]">
          Patient Reports
        </h1>
        <p className="text-[14px] text-[var(--cf-ink-faint)] mt-1">
          Generate a full case report for download or printing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_auto] gap-4 items-end mb-4 no-print">
        <PatientPicker value={caseId} onSelect={setCaseId} />
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

      {loading && (
        <div className="flex justify-center py-16 text-[var(--cf-ink-faint)] no-print">
          <Loader2 size={22} className="animate-spin" />
        </div>
      )}

      {!loading && !caseData && (
        <p className="text-[13px] text-[var(--cf-ink-faint)] py-12 text-center no-print">
          Select a patient or case ID to preview the report.
        </p>
      )}

      {!loading && caseData && <ReportDocument case={caseData} />}
    </div>
  )
}
