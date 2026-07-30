import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Camera,
  Check,
  Loader2,
  Pencil,
  Upload,
} from 'lucide-react'
import {
  fetchCase,
  fetchStaff,
  patchCase,
  uploadCaseFile,
} from '../features/careflow/submitCase'
import ConfidenceBadge from '../components/careflow/ConfidenceBadge'
import { PatientAvatar } from '../components/careflow/PatientPhotoCapture'
import PipelineFlowchart from '../components/careflow/PipelineFlowchart'
import { urgencyClasses } from '../utils/status'
import { AGENT_STAGES, stageIdForCase } from '../utils/pipelineStage'

const card =
  'rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] p-5'
const inputClass =
  'text-[13px] border border-[var(--cf-border)] rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-[var(--cf-brand)] text-[var(--cf-ink)]'

function CaseDetail() {
  const { caseId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState('')
  const [pendingRx, setPendingRx] = useState(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [expandedReport, setExpandedReport] = useState(null)
  const rxInputRef = useRef(null)
  const pathInputRef = useRef(null)

  const load = useCallback(async () => {
    if (!caseId) return
    setLoading(true)
    setError(null)
    try {
      const [res, staffList] = await Promise.all([fetchCase(caseId), fetchStaff()])
      setData(res)
      setStaff(staffList)
      setDescDraft(res.description || '')
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load case.')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    load()
  }, [load])

  const applyPatch = async (patch, optimistic) => {
    if (!caseId) return
    const prev = data
    if (optimistic) setData((d) => ({ ...d, ...optimistic }))
    setSaving(true)
    try {
      const res = await patchCase(caseId, patch)
      setData(res)
      return res
    } catch (err) {
      if (prev) setData(prev)
      setError(err?.response?.data?.message || 'Update failed.')
      return null
    } finally {
      setSaving(false)
    }
  }

  const onDoctorChange = (e) => {
    const id = e.target.value
    const doc = staff.find((s) => s.id === id) || null
    applyPatch(
      { assignedDoctor: doc },
      { assignedDoctor: doc }
    )
  }

  const onFollowUpChange = (e) => {
    const v = e.target.value || null
    applyPatch(
      { nextFollowUpDate: v },
      { nextFollowUpDate: v }
    )
  }

  const saveDescription = async () => {
    await applyPatch({ description: descDraft }, { description: descDraft })
    setEditingDesc(false)
  }

  const handleRxPhoto = async (file) => {
    if (!file || !caseId) return
    setUploadBusy(true)
    try {
      const res = await uploadCaseFile(caseId, file, 'prescription')
      const items = res?.report?.extractedFields?.items || []
      if (items.length) {
        setPendingRx(items)
      } else {
        setData(res.case)
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Prescription upload failed.')
    } finally {
      setUploadBusy(false)
    }
  }

  const confirmPendingRx = async () => {
    if (!pendingRx) return
    const next = [...(data.prescriptions || []), ...pendingRx.map((i) => ({ ...i, source: 'photo' }))]
    const res = await applyPatch({ prescriptions: next }, { prescriptions: next })
    if (res) setPendingRx(null)
  }

  const handleReportUpload = async (file) => {
    if (!file || !caseId) return
    setUploadBusy(true)
    try {
      const res = await uploadCaseFile(caseId, file, 'diagnosis')
      setData(res.case)
    } catch (err) {
      setError(err?.response?.data?.message || 'Report upload failed.')
    } finally {
      setUploadBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[var(--cf-ink-faint)]">
        <Loader2 size={22} className="animate-spin" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex flex-col gap-3">
        <Link
          to="/queue"
          className="text-[13px] text-[var(--cf-ink-soft)] no-underline inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={14} /> Back to queue
        </Link>
        <p className="text-[13px] text-[var(--cf-danger)]">{error}</p>
      </div>
    )
  }

  const stageId = stageIdForCase(data)
  const stageMeta = AGENT_STAGES.find((s) => s.id === stageId)
  const timeline = Array.isArray(data.timeline) ? data.timeline : []

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => navigate('/queue')}
          className="flex items-center gap-1.5 text-[12.5px] text-[var(--cf-ink-soft)] hover:text-[var(--cf-ink)] bg-[var(--cf-surface)] border border-[var(--cf-border)] rounded-lg px-2.5 py-1.5 cursor-pointer"
        >
          <ArrowLeft size={13} /> Back to queue
        </button>
        {saving && (
          <span className="text-[11px] text-[var(--cf-ink-faint)]">Saving…</span>
        )}
        {error && <span className="text-[11px] text-[var(--cf-danger)]">{error}</span>}
      </div>

      {/* Header */}
      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <PatientAvatar
              photoUrl={data.photoUrl}
              name={data.patientName}
              size={72}
              className="rounded-xl"
            />
            <div className="min-w-0">
              <h1 className="text-[22px] font-semibold text-[var(--cf-ink)]">
                {data.patientName || 'Unknown patient'}
              </h1>
              <p
                className="text-[12px] text-[var(--cf-ink-faint)] mt-1"
                style={{ fontFamily: 'var(--cf-font-mono)' }}
              >
                Case ID {data.caseId}
              </p>
              {data.photoSource && (
                <p className="text-[11px] text-[var(--cf-ink-faint)] mt-0.5 capitalize">
                  Photo via {String(data.photoSource).replace('_', ' ')}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-md border capitalize ${urgencyClasses(data.urgency)}`}
                >
                  {data.urgency || 'routine'}
                </span>
                <span className="text-[12px] text-[var(--cf-ink-soft)]">
                  Stage: {stageMeta?.label || data.current_stage || '—'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <label className="text-[11px] text-[var(--cf-ink-faint)] uppercase tracking-wide">
              Assigned doctor
            </label>
            <select
              className={inputClass}
              value={data.assignedDoctor?.id || ''}
              onChange={onDoctorChange}
            >
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AI Narrative */}
        <div className={card}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide">
              AI narrative
            </h2>
            <ConfidenceBadge score={data.aiConfidence} />
          </div>
          <p className="text-[14px] leading-relaxed text-[var(--cf-ink)]">
            {data.aiNarrative || 'No AI narrative yet.'}
          </p>
        </div>

        {/* Clinical detail */}
        <div className={card}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide">
              Clinical detail
            </h2>
            {!editingDesc && (
              <button
                type="button"
                onClick={() => setEditingDesc(true)}
                className="text-[var(--cf-ink-faint)] hover:text-[var(--cf-ink)] bg-transparent border-none cursor-pointer"
                aria-label="Edit description"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>

          {editingDesc ? (
            <div className="flex flex-col gap-2 mb-4">
              <textarea
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                rows={3}
                className={`${inputClass} resize-none w-full`}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveDescription}
                  className="text-[12px] px-3 py-1.5 rounded-lg bg-[var(--cf-brand)] text-white border-none cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDescDraft(data.description || '')
                    setEditingDesc(false)
                  }}
                  className="text-[12px] px-3 py-1.5 rounded-lg border border-[var(--cf-border)] bg-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[13.5px] text-[var(--cf-ink-soft)] mb-4">
              {data.description || 'No description.'}
            </p>
          )}

          <div className="mb-4">
            <p className="text-[11px] text-[var(--cf-ink-faint)] uppercase tracking-wide mb-2">
              Labs
            </p>
            {(data.labs || []).length === 0 ? (
              <p className="text-[12.5px] text-[var(--cf-ink-faint)]">No labs recorded.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.labs.map((lab, i) => (
                  <li
                    key={i}
                    className="text-[13px] flex justify-between gap-2 border-b border-[var(--cf-border)] pb-1.5"
                  >
                    <span>{lab.name}</span>
                    <span className="text-[var(--cf-ink-faint)] capitalize">{lab.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-[var(--cf-ink-faint)] uppercase tracking-wide">
                Prescriptions
              </p>
              <button
                type="button"
                disabled={uploadBusy}
                onClick={() => rxInputRef.current?.click()}
                className="flex items-center gap-1 text-[11.5px] text-[var(--cf-brand)] bg-transparent border-none cursor-pointer"
              >
                <Camera size={12} /> Add via photo
              </button>
              <input
                ref={rxInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleRxPhoto(f)
                  e.target.value = ''
                }}
              />
            </div>
            {(data.prescriptions || []).length === 0 ? (
              <p className="text-[12.5px] text-[var(--cf-ink-faint)]">No prescriptions yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {data.prescriptions.map((rx, i) => (
                  <li key={i} className="text-[13px] text-[var(--cf-ink)]">
                    <span className="font-medium">{rx.drug}</span>
                    {rx.dose ? ` · ${rx.dose}` : ''}
                    {rx.frequency ? ` · ${rx.frequency}` : ''}
                    {rx.source === 'photo' && (
                      <span className="ml-1.5 text-[10px] text-[var(--cf-ink-faint)]">photo</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="text-[11px] text-[var(--cf-ink-faint)] uppercase tracking-wide block mb-1.5">
              Next follow-up
            </label>
            <input
              type="date"
              className={inputClass}
              value={
                data.nextFollowUpDate
                  ? String(data.nextFollowUpDate).slice(0, 10)
                  : ''
              }
              onChange={onFollowUpChange}
            />
          </div>
        </div>
      </div>

      {/* Pending RX human review */}
      {pendingRx && (
        <div className={`${card} border-[var(--cf-caution-border)]`}>
          <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] mb-2">
            Review photo-extracted prescriptions
          </h2>
          <p className="text-[12px] text-[var(--cf-ink-faint)] mb-3">
            Confirm or edit before saving to the case record.
          </p>
          {pendingRx.map((rx, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 mb-2">
              <input
                className={inputClass}
                value={rx.drug || ''}
                onChange={(e) => {
                  const next = [...pendingRx]
                  next[i] = { ...next[i], drug: e.target.value }
                  setPendingRx(next)
                }}
                placeholder="Drug"
              />
              <input
                className={inputClass}
                value={rx.dose || ''}
                onChange={(e) => {
                  const next = [...pendingRx]
                  next[i] = { ...next[i], dose: e.target.value }
                  setPendingRx(next)
                }}
                placeholder="Dose"
              />
              <input
                className={inputClass}
                value={rx.frequency || ''}
                onChange={(e) => {
                  const next = [...pendingRx]
                  next[i] = { ...next[i], frequency: e.target.value }
                  setPendingRx(next)
                }}
                placeholder="Frequency"
              />
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={confirmPendingRx}
              className="flex items-center gap-1 text-[12px] px-3 py-1.5 rounded-lg bg-[var(--cf-brand)] text-white border-none cursor-pointer"
            >
              <Check size={13} /> Confirm
            </button>
            <button
              type="button"
              onClick={() => setPendingRx(null)}
              className="text-[12px] px-3 py-1.5 rounded-lg border border-[var(--cf-border)] bg-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Uploaded reports */}
      <div className={card}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide">
            Uploaded reports
          </h2>
          <button
            type="button"
            disabled={uploadBusy}
            onClick={() => pathInputRef.current?.click()}
            className="flex items-center gap-1.5 text-[12px] text-[var(--cf-brand)] bg-transparent border-none cursor-pointer"
          >
            <Upload size={13} /> Upload report
          </button>
          <input
            ref={pathInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleReportUpload(f)
              e.target.value = ''
            }}
          />
        </div>
        {(data.uploadedReports || []).length === 0 ? (
          <p className="text-[12.5px] text-[var(--cf-ink-faint)]">No uploads yet.</p>
        ) : (
          <ul className="space-y-3">
            {data.uploadedReports.map((r) => (
              <li
                key={r.fileId}
                className="border border-[var(--cf-border)] rounded-lg p-3 cursor-pointer hover:bg-[var(--cf-surface-sunken)]"
                onClick={() =>
                  setExpandedReport(expandedReport === r.fileId ? null : r.fileId)
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-medium text-[var(--cf-ink)]">
                      {r.fileName}
                    </p>
                    <p className="text-[11px] text-[var(--cf-ink-faint)] capitalize">
                      {r.type} · {r.uploadedAt ? new Date(r.uploadedAt).toLocaleString() : ''}
                    </p>
                  </div>
                  <ConfidenceBadge score={r.aiConfidence} />
                </div>
                <p className="text-[13px] text-[var(--cf-ink-soft)] mt-2">{r.aiNarrative}</p>
                {expandedReport === r.fileId && (
                  <pre className="mt-2 text-[11px] overflow-auto bg-[var(--cf-surface-sunken)] p-2 rounded-md text-[var(--cf-ink)]">
                    {JSON.stringify(r.extractedFields || {}, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Timeline */}
      <div className={card}>
        <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide mb-1">
          Pipeline timeline
        </h2>
        <p className="text-[12px] text-[var(--cf-ink-faint)] mb-4">
          Agent flow — completed → current → pending
        </p>
        <PipelineFlowchart timeline={timeline} />
      </div>
    </div>
  )
}

export default CaseDetail
