import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Mic, MicOff, Upload } from 'lucide-react'
import {
  submitCase,
  voiceIntake,
  uploadCaseFile,
  patchCase,
} from '../features/careflow/submitCase'
import ConfidenceBadge from '../components/careflow/ConfidenceBadge'
import LoadingAnimation from '../components/LoadingAnimation'

const emptyForm = {
  name: '',
  age: '',
  gender: '',
  contact: '',
  symptoms: '',
  allergies: '',
  medicalHistory: '',
  currentMedications: '',
  insuranceProvider: '',
  policyNumber: '',
  urgency: 'routine',
  description: '',
}

const inputClass =
  'bg-white border border-[var(--cf-border)] rounded-lg px-3 py-2 text-[13px] text-[var(--cf-ink)] outline-none focus:border-[var(--cf-brand)] placeholder:text-[var(--cf-ink-faint)]'
const card =
  'rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] p-5'

function CaseIntake() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [voiceBusy, setVoiceBusy] = useState(false)
  const [draftCaseId, setDraftCaseId] = useState(null)
  const [uploads, setUploads] = useState([])
  const [uploadBusy, setUploadBusy] = useState(false)
  const recognitionRef = useRef(null)
  const fileRef = useRef(null)

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  const toList = (text) =>
    text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

  const ensureDraftCase = async () => {
    if (draftCaseId) return draftCaseId
    const data = await submitCase({
      patient_information: {
        name: form.name || 'Pending intake',
        age: form.age,
        gender: form.gender,
        contact: form.contact,
      },
      symptoms: toList(form.symptoms),
      allergies: toList(form.allergies),
      medical_history_input: form.medicalHistory || form.description,
      current_medications: toList(form.currentMedications),
      insurance_provider: form.insuranceProvider,
      policy_number: form.policyNumber,
      urgency: form.urgency,
      description: form.description,
      runPipeline: false,
    })
    setDraftCaseId(data.caseId)
    return data.caseId
  }

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setError('Speech recognition is not supported in this browser.')
      return
    }
    const rec = new SR()
    recognitionRef.current = rec
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    let finalText = ''
    rec.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += t + ' '
        else interim += t
      }
      setTranscript((finalText + interim).trim())
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    rec.start()
    setListening(true)
    setError(null)
  }

  const stopVoice = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  const structureVoice = async () => {
    if (!transcript.trim()) return
    setVoiceBusy(true)
    setError(null)
    try {
      const res = await voiceIntake(transcript)
      const f = res.fields || {}
      setForm((prev) => ({
        ...prev,
        name: f.patientName || prev.name,
        symptoms: Array.isArray(f.symptoms) ? f.symptoms.join(', ') : prev.symptoms,
        urgency: f.urgency || prev.urgency,
        description: f.description || prev.description,
        medicalHistory: f.description || prev.medicalHistory,
      }))
    } catch (err) {
      setError(err?.response?.data?.message || 'Voice structuring failed.')
    } finally {
      setVoiceBusy(false)
    }
  }

  const onDropFiles = async (files) => {
    setUploadBusy(true)
    setError(null)
    try {
      const id = await ensureDraftCase()
      for (const file of files) {
        const res = await uploadCaseFile(id, file, 'diagnosis')
        setUploads((u) => [
          ...u,
          {
            fileName: file.name,
            narrative: res.report?.aiNarrative,
            confidence: res.report?.aiConfidence,
            extracted: res.report?.extractedFields,
          },
        ])
        const extracted = res.report?.extractedFields || {}
        if (extracted.patientName || extracted.symptoms) {
          setForm((prev) => ({
            ...prev,
            name: extracted.patientName || prev.name,
            symptoms: Array.isArray(extracted.symptoms)
              ? extracted.symptoms.join(', ')
              : prev.symptoms,
            description: res.report?.aiNarrative || prev.description,
          }))
        } else if (res.report?.aiNarrative) {
          setForm((prev) => ({
            ...prev,
            description: prev.description || res.report.aiNarrative,
          }))
        }
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Upload failed.')
    } finally {
      setUploadBusy(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (draftCaseId) {
        await patchCase(draftCaseId, {
          patientName: form.name,
          description: form.description || form.medicalHistory,
          urgency: form.urgency,
        })
        navigate(`/case/${draftCaseId}`)
        return
      }
      const payload = {
        patient_information: {
          name: form.name,
          age: form.age,
          gender: form.gender,
          contact: form.contact,
        },
        symptoms: toList(form.symptoms),
        allergies: toList(form.allergies),
        medical_history_input: form.medicalHistory || form.description,
        current_medications: toList(form.currentMedications),
        insurance_provider: form.insuranceProvider,
        policy_number: form.policyNumber,
        urgency: form.urgency,
        description: form.description,
        runPipeline: true,
      }
      const data = await submitCase(payload)
      if (data?.caseId) navigate(`/case/${data.caseId}`)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create case.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4 items-start">
      <div className={card}>
        <h1 className="text-[22px] font-semibold text-[var(--cf-ink)]">New Case</h1>
        <p className="text-[13px] text-[var(--cf-ink-faint)] mt-1 mb-4">
          Type intake details, or speak and review AI-structured fields before saving.
        </p>

        <div className="mb-5 p-3 rounded-lg border border-[var(--cf-border)] bg-[var(--cf-surface-sunken)]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[12px] font-medium text-[var(--cf-ink)]">Voice intake</p>
            <div className="flex gap-2">
              {!listening ? (
                <button
                  type="button"
                  onClick={startVoice}
                  className="flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-lg bg-[var(--cf-brand)] text-white border-none cursor-pointer"
                >
                  <Mic size={13} /> Speak
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopVoice}
                  className="flex items-center gap-1.5 text-[12px] px-2.5 py-1.5 rounded-lg bg-[var(--cf-danger)] text-white border-none cursor-pointer"
                >
                  <MicOff size={13} /> Stop
                </button>
              )}
              <button
                type="button"
                disabled={!transcript || voiceBusy}
                onClick={structureVoice}
                className="text-[12px] px-2.5 py-1.5 rounded-lg border border-[var(--cf-border)] bg-white cursor-pointer disabled:opacity-50"
              >
                {voiceBusy ? 'Structuring…' : 'Fill form from speech'}
              </button>
            </div>
          </div>
          <p className="text-[12.5px] text-[var(--cf-ink-soft)] min-h-[40px]">
            {transcript || 'Transcript appears here…'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Full name"
              value={form.name}
              onChange={handleChange('name')}
              className={`col-span-2 ${inputClass}`}
              required
            />
            <input
              placeholder="Age / DOB"
              value={form.age}
              onChange={handleChange('age')}
              className={inputClass}
            />
            <input
              placeholder="Gender"
              value={form.gender}
              onChange={handleChange('gender')}
              className={inputClass}
            />
          </div>

          <label className="text-[12px] text-[var(--cf-ink-faint)]">Symptoms (comma separated)</label>
          <textarea
            value={form.symptoms}
            onChange={handleChange('symptoms')}
            rows={2}
            className={`${inputClass} resize-none`}
          />

          <label className="text-[12px] text-[var(--cf-ink-faint)]">Urgency</label>
          <select value={form.urgency} onChange={handleChange('urgency')} className={inputClass}>
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
            <option value="emergency">Emergency</option>
          </select>

          <label className="text-[12px] text-[var(--cf-ink-faint)]">Notes / description</label>
          <textarea
            value={form.description}
            onChange={handleChange('description')}
            rows={3}
            className={`${inputClass} resize-none`}
          />

          <label className="text-[12px] text-[var(--cf-ink-faint)]">Allergies</label>
          <textarea
            value={form.allergies}
            onChange={handleChange('allergies')}
            rows={2}
            className={`${inputClass} resize-none`}
          />

          <label className="text-[12px] text-[var(--cf-ink-faint)]">Medical history</label>
          <textarea
            value={form.medicalHistory}
            onChange={handleChange('medicalHistory')}
            rows={2}
            className={`${inputClass} resize-none`}
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Insurance provider"
              value={form.insuranceProvider}
              onChange={handleChange('insuranceProvider')}
              className={inputClass}
            />
            <input
              placeholder="Policy number"
              value={form.policyNumber}
              onChange={handleChange('policyNumber')}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium bg-[var(--cf-brand)] hover:opacity-90 disabled:opacity-60 cursor-pointer border-none text-white"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Saving case…
              </>
            ) : draftCaseId ? (
              'Confirm & open case'
            ) : (
              'Create case'
            )}
          </button>
          {error && <p className="text-[12px] text-[var(--cf-danger)]">{error}</p>}
        </form>
      </div>

      <div className="flex flex-col gap-4">
        <div
          className={`${card} border-dashed cursor-pointer`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const files = [...(e.dataTransfer.files || [])]
            if (files.length) onDropFiles(files)
          }}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = [...(e.target.files || [])]
              if (files.length) onDropFiles(files)
              e.target.value = ''
            }}
          />
          <div className="flex flex-col items-center text-center py-8 gap-2">
            <Upload size={22} className="text-[var(--cf-ink-faint)]" />
            <p className="text-[14px] font-medium text-[var(--cf-ink)]">
              Upload existing reports (PDF/image)
            </p>
            <p className="text-[12.5px] text-[var(--cf-ink-faint)] max-w-sm">
              AI reads each file and shows a narrative + confidence before you accept the case.
            </p>
            {uploadBusy && (
              <span className="text-[12px] text-[var(--cf-brand)] flex items-center gap-1.5 mt-2">
                <Loader2 size={13} className="animate-spin" /> Analyzing…
              </span>
            )}
          </div>
        </div>

        {uploads.map((u, i) => (
          <div key={i} className={card}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[13px] font-medium text-[var(--cf-ink)]">{u.fileName}</p>
              <ConfidenceBadge score={u.confidence} />
            </div>
            <p className="text-[13px] text-[var(--cf-ink-soft)]">{u.narrative}</p>
          </div>
        ))}

        {loading && (
          <div className={`${card} flex flex-col items-center gap-3 py-10`}>
            <LoadingAnimation />
            <p className="text-[13px] text-[var(--cf-ink-faint)] text-center">
              Running CareFlow pipeline…
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CaseIntake
