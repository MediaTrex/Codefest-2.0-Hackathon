import React, { useState } from 'react'
import {
    Activity, AlertTriangle, CheckCircle2, ClipboardList, FileText,
    Pill, ShieldAlert, Stethoscope, XCircle, ShieldCheck, Brain
} from 'lucide-react'

const urgencyColor = (urgency) => {
    switch ((urgency || '').toLowerCase()) {
        case 'emergency': return 'text-red-400 bg-red-500/10 border-red-500/30'
        case 'urgent': return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
        default: return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    }
}

const severityColor = (severity) => {
    switch ((severity || '').toLowerCase()) {
        case 'high': return 'text-red-400 bg-red-500/10 border-red-500/30'
        case 'moderate': return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
        default: return 'text-slate-300 bg-white/[0.04] border-white/[0.08]'
    }
}

export function Section({ icon: Icon, title, children, right }) {
    return (
        <div className='bg-[#13151c] border border-white/[0.08] rounded-2xl p-5 flex flex-col gap-3'>
            <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                    <div className='flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20'>
                        <Icon size={13} className='text-indigo-400' />
                    </div>
                    <h3 className='text-[13px] font-semibold text-slate-100 tracking-tight'>{title}</h3>
                </div>
                {right}
            </div>
            {children}
        </div>
    )
}

export function Tag({ children, className = '' }) {
    return (
        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${className || 'text-slate-300 bg-white/[0.04] border-white/[0.08]'}`}>
            {children}
        </span>
    )
}

// Renders the full 7-agent CareFlow AI case output. Shared between the
// Patient Portal (single case, just submitted) and the Doctor Dashboard
// (any case selected from the list).
function CaseReport({ result }) {
    const [tab, setTab] = useState('patient')

    if (!result) return null

    return (
        <div className='flex flex-col gap-4'>
            <Section icon={Activity} title='Agent Execution Timeline'>
                <div className='flex flex-col gap-2'>
                    {(result.timeline || []).map((step, i) => (
                        <div key={i} className='flex items-start gap-2'>
                            {step.status === 'completed'
                                ? <CheckCircle2 size={14} className='text-emerald-400 mt-0.5 shrink-0' />
                                : <XCircle size={14} className='text-red-400 mt-0.5 shrink-0' />}
                            <div>
                                <p className='text-[12.5px] text-slate-200 font-medium'>{step.agent}</p>
                                <p className='text-[12px] text-slate-500'>{step.summary}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            <Section icon={FileText} title='Structured Patient Case'>
                <div className='flex flex-wrap gap-1.5'>
                    {(result.structured_case?.symptoms || []).map((s, i) => <Tag key={i}>{s}</Tag>)}
                </div>
                {result.structured_case?.missing_fields?.length > 0 && (
                    <p className='text-[11.5px] text-amber-400'>Missing: {result.structured_case.missing_fields.join(', ')}</p>
                )}
                {result.medical_history?.summary && (
                    <p className='text-[12.5px] text-slate-400 mt-1'>{result.medical_history.summary}</p>
                )}
            </Section>

            <Section icon={Stethoscope} title='Triage & Diagnostic Report'>
                <div className='flex items-center gap-2 flex-wrap'>
                    <Tag className={urgencyColor(result.diagnosis?.urgency)}>
                        Urgency: {result.diagnosis?.urgency || 'unknown'}
                    </Tag>
                    <Tag>Confidence: {Math.round((result.confidence_score || 0) * 100)}%</Tag>
                </div>
                <div className='flex flex-col gap-2 mt-1'>
                    {(result.diagnosis?.possible_diagnoses || []).map((d, i) => (
                        <div key={i} className='bg-white/[0.03] border border-white/[0.06] rounded-lg p-3'>
                            <div className='flex items-center justify-between'>
                                <p className='text-[13px] text-slate-100 font-medium'>{d.condition}</p>
                                <Tag>{d.likelihood}</Tag>
                            </div>
                            <p className='text-[12px] text-slate-500 mt-1'>{d.reasoning}</p>
                        </div>
                    ))}
                </div>
                {result.diagnosis?.recommended_tests?.length > 0 && (
                    <div className='mt-1'>
                        <p className='text-[12px] text-slate-500 mb-1'>Recommended tests</p>
                        <div className='flex flex-wrap gap-1.5'>
                            {result.diagnosis.recommended_tests.map((t, i) => <Tag key={i}>{t}</Tag>)}
                        </div>
                    </div>
                )}
                <p className='text-[11px] text-slate-600 italic mt-1'>{result.diagnosis?.disclaimer}</p>
            </Section>

            <Section icon={ShieldAlert} title='Medication Safety'>
                {(result.interaction_warnings || []).length === 0 && (
                    <p className='text-[12.5px] text-emerald-400 flex items-center gap-1.5'>
                        <CheckCircle2 size={13} /> No medication safety issues detected.
                    </p>
                )}
                <div className='flex flex-col gap-2'>
                    {(result.interaction_warnings || []).map((w, i) => (
                        <div key={i} className={`border rounded-lg p-3 ${severityColor(w.severity)}`}>
                            <div className='flex items-center gap-1.5'>
                                <AlertTriangle size={13} />
                                <p className='text-[12.5px] font-medium'>{w.issue}</p>
                            </div>
                            <p className='text-[12px] opacity-80 mt-1'>{w.recommendation}</p>
                        </div>
                    ))}
                </div>
            </Section>

            <Section icon={ShieldCheck} title='Insurance & Billing'>
                <div className='flex items-center gap-2 flex-wrap'>
                    <Tag>{result.insurance_summary?.coverage_status || 'unverified'}</Tag>
                    <Tag>Claim: {result.insurance_summary?.claim_readiness || 'unverified'}</Tag>
                </div>
                {result.insurance_summary?.likely_covered?.length > 0 && (
                    <div className='mt-1'>
                        <p className='text-[11px] text-slate-500 mb-1'>Likely covered</p>
                        <div className='flex flex-wrap gap-1.5'>
                            {result.insurance_summary.likely_covered.map((t, i) => <Tag key={i} className='text-emerald-400 bg-emerald-500/10 border-emerald-500/20'>{t}</Tag>)}
                        </div>
                    </div>
                )}
                {result.insurance_summary?.likely_requires_preauth?.length > 0 && (
                    <div className='mt-1'>
                        <p className='text-[11px] text-slate-500 mb-1'>May need pre-authorization</p>
                        <div className='flex flex-wrap gap-1.5'>
                            {result.insurance_summary.likely_requires_preauth.map((t, i) => <Tag key={i} className='text-amber-400 bg-amber-500/10 border-amber-500/20'>{t}</Tag>)}
                        </div>
                    </div>
                )}
                <p className='text-[12px] text-slate-500 mt-1'>{result.insurance_summary?.notes}</p>
            </Section>

            <Section icon={Pill} title='Follow-up Plan'>
                <p className='text-[13px] text-slate-200'>{result.followup_plan?.recovery_plan}</p>
                <div className='grid grid-cols-2 gap-3 mt-1'>
                    <div>
                        <p className='text-[11px] text-slate-500 mb-1'>Follow-up schedule</p>
                        <p className='text-[12.5px] text-slate-200'>{result.followup_plan?.follow_up_schedule}</p>
                    </div>
                    <div>
                        <p className='text-[11px] text-slate-500 mb-1'>Warning signs</p>
                        <ul className='text-[12.5px] text-slate-300 list-disc list-inside'>
                            {(result.followup_plan?.warning_signs || []).map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                    </div>
                </div>
            </Section>

            <Section icon={Brain} title='Explainability — Reasoning Trace'>
                <ol className='flex flex-col gap-1.5 list-decimal list-inside'>
                    {(result.reasoning_trace || []).map((step, i) => (
                        <li key={i} className='text-[12.5px] text-slate-300'>{step}</li>
                    ))}
                </ol>
            </Section>

            <Section icon={ClipboardList} title='Final Recommendation'>
                <div className='flex gap-1.5 mb-1'>
                    <button onClick={() => setTab('patient')}
                        className={`text-[11.5px] px-2.5 py-1 rounded-full border cursor-pointer ${tab === 'patient' ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' : 'bg-transparent border-white/[0.08] text-slate-400'}`}>
                        Patient Summary
                    </button>
                    <button onClick={() => setTab('doctor')}
                        className={`text-[11.5px] px-2.5 py-1 rounded-full border cursor-pointer ${tab === 'doctor' ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' : 'bg-transparent border-white/[0.08] text-slate-400'}`}>
                        Doctor Notes
                    </button>
                </div>
                <p className='text-[13px] text-slate-200 leading-relaxed'>
                    {tab === 'patient' ? result.patient_summary : result.doctor_notes}
                </p>
                {(result.conflicts || []).length > 0 && (
                    <div className='mt-2 flex flex-col gap-1.5'>
                        <p className='text-[11px] text-amber-400'>Conflicts flagged for review</p>
                        {result.conflicts.map((c, i) => (
                            <p key={i} className='text-[12px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5'>
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
