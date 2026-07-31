import React, { useState } from 'react'
import { ArrowLeft, HeartPulse, Loader2, Stethoscope, User } from 'lucide-react'
import { submitCase } from '../features/careflow/submitCase'
import CaseReport from '../components/careflow/CaseReport'
import LoadingAnimation from '../components/LoadingAnimation'

const emptyForm = {
    name: '', age: '', gender: '', contact: '',
    symptoms: '', allergies: '', medicalHistory: '', currentMedications: '',
    insuranceProvider: '', policyNumber: ''
}

function PatientPortal({ onBack }) {
    const [form, setForm] = useState(emptyForm)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [result, setResult] = useState(null)

    const handleChange = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))
    const toList = (text) => text.split(',').map(s => s.trim()).filter(Boolean)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setResult(null)
        try {
            const payload = {
                patient_information: {
                    name: form.name, age: form.age, gender: form.gender, contact: form.contact
                },
                symptoms: toList(form.symptoms),
                allergies: toList(form.allergies),
                medical_history_input: form.medicalHistory,
                current_medications: toList(form.currentMedications),
                insurance_provider: form.insuranceProvider,
                policy_number: form.policyNumber
            }
            const data = await submitCase(payload)
            setResult(data)
        } catch (err) {
            console.log(err)
            setError(err?.response?.data?.message || 'Failed to run CarePilot Ai on this case.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='h-screen w-full flex flex-col bg-[#0d0f14] text-white overflow-hidden'>
            <div className='h-14 flex items-center gap-2.5 px-5 border-b border-white/[0.06] shrink-0'>
                <button onClick={onBack} className='flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] bg-transparent border-none cursor-pointer'>
                    <ArrowLeft size={15} />
                </button>
                <div className='flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20'>
                    <HeartPulse size={13} className='text-emerald-400' />
                </div>
                <div className='text-[14px] font-semibold text-slate-100 tracking-tight'>Patient Portal</div>
                <span className='text-[10px] font-medium text-slate-600 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full'>CarePilot Ai</span>
            </div>

            <div className='flex-1 flex overflow-hidden'>
                <div className='w-[380px] shrink-0 border-r border-white/[0.06] overflow-y-auto p-5'>
                    <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
                        <div className='flex items-center gap-2 text-slate-400 text-[12px] font-medium'>
                            <User size={13} /> Patient Intake
                        </div>

                        <div className='grid grid-cols-2 gap-2'>
                            <input placeholder='Full name' value={form.name} onChange={handleChange('name')}
                                className='col-span-2 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-emerald-500/50' />
                            <input placeholder='Age' value={form.age} onChange={handleChange('age')}
                                className='bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-emerald-500/50' />
                            <input placeholder='Gender' value={form.gender} onChange={handleChange('gender')}
                                className='bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-emerald-500/50' />
                            <input placeholder='Contact (optional)' value={form.contact} onChange={handleChange('contact')}
                                className='col-span-2 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-emerald-500/50' />
                        </div>

                        <label className='text-[12px] text-slate-500'>Symptoms (comma separated)</label>
                        <textarea value={form.symptoms} onChange={handleChange('symptoms')} rows={2}
                            placeholder='fever, headache, sore throat'
                            className='bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-emerald-500/50 resize-none' />

                        <label className='text-[12px] text-slate-500'>Allergies (comma separated)</label>
                        <textarea value={form.allergies} onChange={handleChange('allergies')} rows={2}
                            placeholder='penicillin, peanuts'
                            className='bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-emerald-500/50 resize-none' />

                        <label className='text-[12px] text-slate-500'>Current medications (comma separated)</label>
                        <textarea value={form.currentMedications} onChange={handleChange('currentMedications')} rows={2}
                            placeholder='metformin, ibuprofen'
                            className='bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-emerald-500/50 resize-none' />

                        <label className='text-[12px] text-slate-500'>Medical history</label>
                        <textarea value={form.medicalHistory} onChange={handleChange('medicalHistory')} rows={3}
                            placeholder='Type 2 diabetes since 2019, asthma as a child...'
                            className='bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-emerald-500/50 resize-none' />

                        <div className='grid grid-cols-2 gap-2'>
                            <input placeholder='Insurance provider' value={form.insuranceProvider} onChange={handleChange('insuranceProvider')}
                                className='bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-emerald-500/50' />
                            <input placeholder='Policy number' value={form.policyNumber} onChange={handleChange('policyNumber')}
                                className='bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-emerald-500/50' />
                        </div>

                        <button type='submit' disabled={loading}
                            className='mt-1 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 transition-colors duration-150 cursor-pointer border-none text-white'>
                            {loading ? <><Loader2 size={14} className='animate-spin' /> Running 7 agents...</> : 'Run CarePilot Ai'}
                        </button>
                        {error && <p className='text-[12px] text-red-400'>{error}</p>}
                    </form>
                </div>

                <div className='flex-1 overflow-y-auto p-5'>
                    {!result && !loading && (
                        <div className='h-full flex flex-col items-center justify-center text-slate-600 gap-2'>
                            <Stethoscope size={28} />
                            <p className='text-[13px]'>Submit a patient case to run the CarePilot Ai pipeline.</p>
                        </div>
                    )}

                    {loading && (
                        <div className='h-full flex flex-col items-center justify-center text-slate-500 gap-4 text-center px-8'>
                            <LoadingAnimation />
                            <p className='text-[13px]'>Intake → Medical Record → Triage &amp; Diagnostic → Prescription Safety → Insurance &amp; Billing → Follow-Up → Explainability</p>
                        </div>
                    )}

                    {result && (
                        <div className='max-w-3xl'>
                            <CaseReport result={result} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default PatientPortal
