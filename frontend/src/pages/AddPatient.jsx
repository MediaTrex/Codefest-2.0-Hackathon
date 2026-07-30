import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import VoiceCapture from '../components/careflow/VoiceCapture'
import PresetConditionChips from '../components/careflow/PresetConditionChips'
import RecentlyAddedPanel from '../components/careflow/RecentlyAddedPanel'
import PatientPhotoCapture from '../components/careflow/PatientPhotoCapture'
import ProgressRail, { deriveIntakeStep } from '../components/careflow/ProgressRail'
import AiPreviewCard from '../components/careflow/AiPreviewCard'
import {
  submitCase,
  fetchCases,
  analyzePreview,
  matchPatients,
} from '../features/careflow/submitCase'
import api from '../../utils/axios'
import { urgencyLabel, timeAgo } from '../utils/status'

const card =
  'rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] p-5'
const inputClass =
  'w-full bg-white border border-[var(--cf-border)] rounded-lg px-3 py-2 text-[13px] text-[var(--cf-ink)] outline-none focus:border-[var(--cf-brand)] placeholder:text-[var(--cf-ink-faint)]'

const emptyForm = {
  patientName: '',
  age: '',
  gender: '',
  description: '',
  urgency: 'routine',
  photoUrl: null,
  photoSource: null,
  photoSkipped: false,
  patientId: null,
}

function useLiveAnalysis(description) {
  const [preview, setPreview] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const debounceRef = useRef(null)
  const reqId = useRef(0)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (description.trim().length < 15) {
      setPreview(null)
      setAnalyzing(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      const id = ++reqId.current
      setAnalyzing(true)
      try {
        const data = await analyzePreview(description)
        if (id === reqId.current) setPreview(data)
      } catch {
        if (id === reqId.current) setPreview(null)
      } finally {
        if (id === reqId.current) setAnalyzing(false)
      }
    }, 800)
    return () => clearTimeout(debounceRef.current)
  }, [description])

  return { preview, setPreview, analyzing }
}

export default function AddPatient() {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [cases, setCases] = useState([])
  const [optimistic, setOptimistic] = useState([])
  const [matchCandidates, setMatchCandidates] = useState([])
  const { preview, setPreview, analyzing } = useLiveAnalysis(form.description)

  const currentStep = useMemo(() => deriveIntakeStep(form), [form])

  const loadCases = useCallback(async () => {
    try {
      const list = await fetchCases()
      setCases(list)
      setOptimistic((prev) =>
        prev.filter((o) => !list.some((c) => c.caseId === o.caseId))
      )
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    const boot = async () => {
      try {
        const list = await fetchCases()
        const hasPhotos = list.some((c) => c.photoUrl)
        if (list.length === 0 || !hasPhotos) {
          await api.post('/api/agent/careflow/seed-demo')
        }
      } catch (e) {
        console.log(e)
      }
      await loadCases()
    }
    boot()
    const id = setInterval(loadCases, 5000)
    return () => clearInterval(id)
  }, [loadCases])

  const setField = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const runMatch = useCallback(async (name) => {
    if (!name || name.trim().length < 2) {
      setMatchCandidates([])
      return
    }
    try {
      const candidates = await matchPatients({ name: name.trim() })
      setMatchCandidates(candidates)
    } catch {
      setMatchCandidates([])
    }
  }, [])

  const onPhotoChange = ({ photoUrl, photoSource }) => {
    setForm((f) => {
      const next = {
        ...f,
        photoUrl,
        photoSource,
        photoSkipped: !photoUrl ? f.photoSkipped : false,
      }
      return next
    })
    if (photoUrl) {
      const name = form.patientName.trim()
      if (name) runMatch(name)
    }
  }

  const linkToExisting = (candidate) => {
    setForm((f) => ({
      ...f,
      patientName: candidate.name || f.patientName,
      age: candidate.age != null ? String(candidate.age) : f.age,
      gender: candidate.gender || f.gender,
      photoUrl: f.photoUrl || candidate.photoUrl,
      patientId: candidate.patientId || candidate.id,
    }))
    setMatchCandidates([])
  }

  const mergedRecent = [...optimistic, ...cases].reduce((acc, c) => {
    if (!acc.find((x) => x.caseId === c.caseId)) acc.push(c)
    return acc
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.patientName.trim()) return
    setSaving(true)
    setError(null)
    const snapshot = { ...form, patientName: form.patientName.trim() }
    const tempId = `temp-${Date.now()}`
    setOptimistic((o) => [
      {
        caseId: tempId,
        patientName: snapshot.patientName,
        description: snapshot.description,
        urgency: snapshot.urgency,
        createdAt: new Date().toISOString(),
        aiNarrative: null,
        aiConfidence: null,
        photoUrl: snapshot.photoUrl,
        photoSource: snapshot.photoSource,
      },
      ...o,
    ])
    setForm(emptyForm)
    setPreview(null)
    setMatchCandidates([])
    try {
      const data = await submitCase({
        patientName: snapshot.patientName,
        age: snapshot.age,
        gender: snapshot.gender,
        description: snapshot.description,
        urgency: snapshot.urgency,
        photoUrl: snapshot.photoUrl,
        photoSource: snapshot.photoSource,
        patientId: snapshot.patientId,
        fastIntake: true,
        runPipeline: false,
      })
      setOptimistic((o) =>
        o.map((c) =>
          c.caseId === tempId
            ? {
                ...c,
                caseId: data.caseId,
                aiNarrative: data.aiNarrative ?? null,
                aiConfidence: data.aiConfidence ?? null,
                createdAt: data.createdAt || c.createdAt,
                description: data.description || c.description,
                photoUrl: data.photoUrl || c.photoUrl,
                photoSource: data.photoSource || c.photoSource,
              }
            : c
        )
      )
      await loadCases()
    } catch (err) {
      setOptimistic((o) => o.filter((c) => c.caseId !== tempId))
      setForm(snapshot)
      setError(err?.response?.data?.message || 'Failed to save patient.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
      <div className={card}>
        <h1 className="text-[22px] font-semibold text-[var(--cf-ink)]">
          Add New Patient
        </h1>
        <p className="text-[13px] text-[var(--cf-ink-faint)] mt-1 mb-4">
          Fast intake — speak, tap chips, or type. Photo from door camera or patient app.
        </p>

        <ProgressRail currentStep={currentStep} />

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <PatientPhotoCapture
            photoUrl={form.photoUrl}
            photoSource={form.photoSource}
            patientName={form.patientName}
            onChange={onPhotoChange}
          />
          {!form.photoUrl && (
            <button
              type="button"
              onClick={() =>
                setForm((f) => ({ ...f, photoSkipped: true, photoUrl: null }))
              }
              className="self-start text-[12px] text-[var(--cf-ink-faint)] bg-transparent border-none cursor-pointer underline"
            >
              Skip photo for now
            </button>
          )}

          <div>
            <label className="text-[12px] text-[var(--cf-ink-faint)] block mb-1.5">
              Patient name
            </label>
            <input
              required
              value={form.patientName}
              onChange={setField('patientName')}
              onBlur={() => runMatch(form.patientName)}
              placeholder="Full name"
              className={inputClass}
            />
            {matchCandidates.length > 0 && (
              <div className="rounded-lg border border-[var(--cf-border-strong)] bg-[var(--cf-surface-sunken)] px-3 py-2 mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] text-[var(--cf-ink-soft)]">
                  Possible match:{' '}
                  <strong className="text-[var(--cf-ink)]">
                    {matchCandidates[0].name}
                  </strong>
                  {matchCandidates[0].lastVisit
                    ? ` — last visit ${timeAgo(matchCandidates[0].lastVisit)}`
                    : ''}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => linkToExisting(matchCandidates[0])}
                    className="text-[12px] font-medium text-[var(--cf-brand)] bg-transparent border-none cursor-pointer"
                  >
                    Link instead
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchCandidates([])}
                    className="text-[12px] text-[var(--cf-ink-faint)] bg-transparent border-none cursor-pointer"
                  >
                    This is a new patient
                  </button>
                </div>
              </div>
            )}
            {form.patientId && (
              <p className="text-[11px] text-[var(--cf-brand)] mt-1.5">
                Linked to existing patient record
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] text-[var(--cf-ink-faint)] block mb-1.5">
                Age
              </label>
              <input
                value={form.age}
                onChange={setField('age')}
                placeholder="e.g. 42"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-[12px] text-[var(--cf-ink-faint)] block mb-1.5">
                Gender
              </label>
              <select
                value={form.gender}
                onChange={setField('gender')}
                className={inputClass}
              >
                <option value="">Select</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="unspecified">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="text-[12px] text-[var(--cf-ink-faint)]">Speak the case</label>
            <VoiceCapture
              onTranscript={(text) =>
                setForm((f) => ({
                  ...f,
                  description: text,
                }))
              }
            />
          </div>

          <PresetConditionChips
            description={form.description}
            onDescriptionChange={(description) =>
              setForm((f) => ({ ...f, description }))
            }
          />

          <div>
            <label className="text-[12px] text-[var(--cf-ink-faint)] block mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={setField('description')}
              rows={5}
              placeholder="Presenting complaint, context, notes…"
              className={`${inputClass} resize-none`}
            />
            <AiPreviewCard preview={preview} analyzing={analyzing} />
          </div>

          <fieldset>
            <legend className="text-[12px] text-[var(--cf-ink-faint)] mb-2">
              Urgency
            </legend>
            {preview?.suggestedUrgency &&
              preview.suggestedUrgency !== form.urgency && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--cf-caution-border)] bg-[var(--cf-caution-soft)] px-3 py-2 mb-3">
                  <span className="text-[13px] text-[var(--cf-caution)]">
                    AI flagged this as possibly{' '}
                    <strong>{urgencyLabel(preview.suggestedUrgency)}</strong>
                    {preview.urgencyReason ? ` — ${preview.urgencyReason}` : ''}
                  </span>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          urgency: preview.suggestedUrgency,
                        }))
                      }
                      className="text-[12px] font-medium text-[var(--cf-brand)] bg-transparent border-none cursor-pointer"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPreview((p) =>
                          p ? { ...p, suggestedUrgency: null } : p
                        )
                      }
                      className="text-[12px] text-[var(--cf-ink-faint)] bg-transparent border-none cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            <div className="flex flex-wrap gap-4">
              {['routine', 'urgent', 'emergency'].map((u) => (
                <label
                  key={u}
                  className="flex items-center gap-2 text-[13px] text-[var(--cf-ink)] cursor-pointer capitalize"
                >
                  <input
                    type="radio"
                    name="urgency"
                    value={u}
                    checked={form.urgency === u}
                    onChange={setField('urgency')}
                    className="accent-[var(--cf-brand)]"
                  />
                  {u}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={saving}
            className="mt-1 w-full py-2.5 rounded-xl text-[13px] font-medium bg-[var(--cf-brand)] text-white border-none cursor-pointer disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Patient'}
          </button>
          {error && <p className="text-[12px] text-[var(--cf-danger)]">{error}</p>}
        </form>
      </div>

      <RecentlyAddedPanel cases={mergedRecent} allCases={cases} />
    </div>
  )
}
