import React, { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  Pill,
  ShieldAlert,
  Stethoscope,
  XCircle,
  ShieldCheck,
  Brain,
} from 'lucide-react'
import { urgencyClasses, severityClasses } from '../../utils/status'

export function Section({ icon: Icon, title, children, right }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--cf-surface-sunken)] border border-[var(--cf-border)]">
            <Icon size={13} className="text-[var(--cf-ink-soft)]" />
          </div>
          <h3 className="text-[13px] font-semibold text-slate-900 tracking-tight">{title}</h3>
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

export function Tag({ children, className = '' }) {
  return (
    <span
      className={`text-[11px] px-2 py-0.5 rounded-full border ${className || 'text-slate-600 bg-slate-50 border-slate-200'}`}
    >
      {children}
    </span>
  )
}

// Renders the full 7-agent CareFlow AI case output.
function CaseReport({ result }) {
  const [tab, setTab] = useState('patient')

  if (!result) return null

  return (
    <div className="flex flex-col gap-4">
      <Section icon={Activity} title="Agent Execution Timeline">
        <div className="flex flex-col gap-2">
          {(result.timeline || []).map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              {step.status === 'completed' ? (
                <CheckCircle2 size={14} className="text-[var(--cf-ink-soft)] mt-0.5 shrink-0" />
              ) : (
                <XCircle size={14} className="text-[var(--cf-ink)] mt-0.5 shrink-0" />
              )}
              <div>
                <p className="text-[12.5px] text-slate-800 font-medium">{step.agent}</p>
                <p className="text-[12px] text-slate-500">{step.summary}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={FileText} title="Structured Patient Case">
        <div className="flex flex-wrap gap-1.5">
          {(result.structured_case?.symptoms || []).map((s, i) => (
            <Tag key={i}>{s}</Tag>
          ))}
        </div>
        {result.structured_case?.missing_fields?.length > 0 && (
          <p className="text-[11.5px] text-amber-600">
            Missing: {result.structured_case.missing_fields.join(', ')}
          </p>
        )}
        {result.medical_history?.summary && (
          <p className="text-[12.5px] text-slate-500 mt-1">{result.medical_history.summary}</p>
        )}
      </Section>

      <Section icon={Stethoscope} title="Triage & Diagnostic Report">
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className={urgencyClasses(result.diagnosis?.urgency)}>
            Urgency: {result.diagnosis?.urgency || 'unknown'}
          </Tag>
          <Tag>Confidence: {Math.round((result.confidence_score || 0) * 100)}%</Tag>
        </div>
        <div className="flex flex-col gap-2 mt-1">
          {(result.diagnosis?.possible_diagnoses || []).map((d, i) => (
            <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-slate-900 font-medium">{d.condition}</p>
                <Tag>{d.likelihood}</Tag>
              </div>
              <p className="text-[12px] text-slate-500 mt-1">{d.reasoning}</p>
            </div>
          ))}
        </div>
        {result.diagnosis?.recommended_tests?.length > 0 && (
          <div className="mt-1">
            <p className="text-[12px] text-slate-500 mb-1">Recommended tests</p>
            <div className="flex flex-wrap gap-1.5">
              {result.diagnosis.recommended_tests.map((t, i) => (
                <Tag key={i}>{t}</Tag>
              ))}
            </div>
          </div>
        )}
        <p className="text-[11px] text-slate-400 italic mt-1">{result.diagnosis?.disclaimer}</p>
      </Section>

      <Section icon={ShieldAlert} title="Medication Safety">
        {(result.interaction_warnings || []).length === 0 && (
          <p className="text-[12.5px] text-[var(--cf-ink-soft)] flex items-center gap-1.5">
            <CheckCircle2 size={13} /> No medication safety issues detected.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {(result.interaction_warnings || []).map((w, i) => (
            <div key={i} className={`border rounded-lg p-3 ${severityClasses(w.severity)}`}>
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={13} />
                <p className="text-[12.5px] font-medium">{w.issue}</p>
              </div>
              <p className="text-[12px] opacity-80 mt-1">{w.recommendation}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={ShieldCheck} title="Insurance & Billing">
        <div className="flex items-center gap-2 flex-wrap">
          <Tag>{result.insurance_summary?.coverage_status || 'unverified'}</Tag>
          <Tag>Claim: {result.insurance_summary?.claim_readiness || 'unverified'}</Tag>
        </div>
        {result.insurance_summary?.likely_covered?.length > 0 && (
          <div className="mt-1">
            <p className="text-[11px] text-slate-500 mb-1">Likely covered</p>
            <div className="flex flex-wrap gap-1.5">
              {result.insurance_summary.likely_covered.map((t, i) => (
                <Tag key={i} className="text-[var(--cf-ink-soft)] bg-[var(--cf-surface-sunken)] border-[var(--cf-border)]">
                  {t}
                </Tag>
              ))}
            </div>
          </div>
        )}
        {result.insurance_summary?.likely_requires_preauth?.length > 0 && (
          <div className="mt-1">
            <p className="text-[11px] text-slate-500 mb-1">May need pre-authorization</p>
            <div className="flex flex-wrap gap-1.5">
              {result.insurance_summary.likely_requires_preauth.map((t, i) => (
                <Tag key={i} className="text-amber-600 bg-amber-50 border-amber-200">
                  {t}
                </Tag>
              ))}
            </div>
          </div>
        )}
        <p className="text-[12px] text-slate-500 mt-1">{result.insurance_summary?.notes}</p>
      </Section>

      <Section icon={Pill} title="Follow-up Plan">
        <p className="text-[13px] text-slate-800">{result.followup_plan?.recovery_plan}</p>
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div>
            <p className="text-[11px] text-slate-500 mb-1">Follow-up schedule</p>
            <p className="text-[12.5px] text-slate-800">{result.followup_plan?.follow_up_schedule}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 mb-1">Warning signs</p>
            <ul className="text-[12.5px] text-slate-700 list-disc list-inside">
              {(result.followup_plan?.warning_signs || []).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section icon={Brain} title="Explainability — Reasoning Trace">
        <ol className="flex flex-col gap-1.5 list-decimal list-inside">
          {(result.reasoning_trace || []).map((step, i) => (
            <li key={i} className="text-[12.5px] text-slate-700">
              {step}
            </li>
          ))}
        </ol>
      </Section>

      <Section icon={ClipboardList} title="Final Recommendation">
        <div className="flex gap-1.5 mb-1">
          <button
            type="button"
            onClick={() => setTab('patient')}
            className={`text-[11.5px] px-2.5 py-1 rounded-full border cursor-pointer ${
              tab === 'patient'
                ? 'bg-[var(--cf-surface-sunken)] border-[var(--cf-border)] text-[var(--cf-ink)]'
                : 'bg-transparent border-slate-200 text-slate-500'
            }`}
          >
            Patient Summary
          </button>
          <button
            type="button"
            onClick={() => setTab('doctor')}
            className={`text-[11.5px] px-2.5 py-1 rounded-full border cursor-pointer ${
              tab === 'doctor'
                ? 'bg-[var(--cf-surface-sunken)] border-[var(--cf-border)] text-[var(--cf-ink)]'
                : 'bg-transparent border-slate-200 text-slate-500'
            }`}
          >
            Doctor Notes
          </button>
        </div>
        <p className="text-[13px] text-slate-800 leading-relaxed">
          {tab === 'patient' ? result.patient_summary : result.doctor_notes}
        </p>
        {(result.conflicts || []).length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            <p className="text-[11px] text-amber-600">Conflicts flagged for review</p>
            {result.conflicts.map((c, i) => (
              <p
                key={i}
                className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5"
              >
                {c.description}
              </p>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

export default CaseReport
