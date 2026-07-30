import React, { useState } from 'react'
import { Loader2 } from 'lucide-react'
import api from '../../utils/axios'
import ConfidenceBadge from '../components/careflow/ConfidenceBadge'

const card =
  'rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] p-5'
const inputClass =
  'w-full bg-white border border-[var(--cf-border)] rounded-lg px-3 py-2 text-[13px] text-[var(--cf-ink)] outline-none focus:border-[var(--cf-brand)] placeholder:text-[var(--cf-ink-faint)]'

const DISCLAIMER =
  'AI-generated estimate for workflow demonstration only — not a certified forensic or medical-legal determination.'

export default function DeathOrganization() {
  const [decedentName, setDecedentName] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/api/agent/careflow/death/estimate', {
        decedentName,
        notes,
      })
      setResult(data)
    } catch (err) {
      setError(err?.response?.data?.message || 'Estimate failed.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold text-[var(--cf-ink)]">
          Death Organization
        </h1>
        <p className="text-[14px] text-[var(--cf-ink-faint)] mt-1">
          Separate mortuary / forensic workflow — not part of living patient cases.
        </p>
      </div>

      <form onSubmit={onSubmit} className={`${card} flex flex-col gap-4`}>
        <div>
          <label className="text-[12px] text-[var(--cf-ink-faint)] block mb-1.5">
            Decedent name (optional)
          </label>
          <input
            value={decedentName}
            onChange={(e) => setDecedentName(e.target.value)}
            className={inputClass}
            placeholder="Name for this record"
          />
        </div>
        <div>
          <label className="text-[12px] text-[var(--cf-ink-faint)] block mb-1.5">
            Pathology / lab notes
          </label>
          <textarea
            required
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            className={`${inputClass} resize-none`}
            placeholder="Findings used to model an estimated time-of-death range…"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl text-[13px] font-medium bg-[var(--cf-brand)] text-white border-none cursor-pointer disabled:opacity-60"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2 justify-center">
              <Loader2 size={14} className="animate-spin" /> Estimating…
            </span>
          ) : (
            'Estimate time of death'
          )}
        </button>
        {error && <p className="text-[12px] text-[var(--cf-danger)]">{error}</p>}
      </form>

      {result && (
        <div className={`${card} mt-4`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="text-[13px] font-semibold text-[var(--cf-ink)] uppercase tracking-wide">
              Estimated time of death (modeled)
            </h2>
            <ConfidenceBadge score={result.aiConfidence} />
          </div>
          {result.decedentName && (
            <p className="text-[13px] text-[var(--cf-ink-soft)] mb-2">
              Record: {result.decedentName}
            </p>
          )}
          <p className="text-[14px] text-[var(--cf-ink)] mb-2">{result.aiNarrative}</p>
          <p
            className="text-[13px] text-[var(--cf-ink-soft)] mb-3"
            style={{ fontFamily: 'var(--cf-font-mono)' }}
          >
            Estimated range:{' '}
            {result.timeOfDeathRangeStart
              ? new Date(result.timeOfDeathRangeStart).toLocaleString()
              : '—'}{' '}
            →{' '}
            {result.timeOfDeathRangeEnd
              ? new Date(result.timeOfDeathRangeEnd).toLocaleString()
              : '—'}
          </p>
          <p className="text-[12px] text-[var(--cf-caution)] border-t border-[var(--cf-border)] pt-3">
            {DISCLAIMER}
          </p>
        </div>
      )}
    </div>
  )
}
