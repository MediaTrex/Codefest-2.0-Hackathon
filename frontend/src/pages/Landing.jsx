import React from 'react'
import {
    ClipboardList, FileText, Stethoscope, ShieldAlert, ShieldCheck,
    Pill, Brain, ArrowRight, Network, Sparkles, GitBranch, Database, LogIn
} from 'lucide-react'
import CarePilotLogo from '../components/CarePilotLogo'

const problems = [
    'Delayed clinical decisions',
    'Repeated data entry across systems',
    'Poor coordination between departments',
    'Stress for patients and healthcare staff'
]

const agents = [
    { icon: ClipboardList, name: 'Intake Agent', desc: 'Onboarding, symptom & history capture' },
    { icon: FileText, name: 'Medical Record Agent', desc: 'Retrieves & summarizes patient history' },
    { icon: Stethoscope, name: 'Triage & Diagnostic Agent', desc: 'Differential diagnosis & urgency detection' },
    { icon: ShieldAlert, name: 'Prescription Safety Agent', desc: 'Allergy & drug-interaction checks' },
    { icon: ShieldCheck, name: 'Insurance & Billing Agent', desc: 'Coverage checks & claim readiness' },
    { icon: Pill, name: 'Follow-Up Care Agent', desc: 'Reminders & adherence monitoring' },
    { icon: Brain, name: 'Explainability Agent', desc: 'Human-readable reasoning & evidence' }
]

const workflow = [
    { step: '1', title: 'Intake', desc: 'Collects patient data' },
    { step: '2', title: 'Records', desc: 'Retrieves & summarizes history' },
    { step: '3', title: 'Diagnosis', desc: 'Analyzes symptoms' },
    { step: '4', title: 'Safety', desc: 'Checks medicine safety' },
    { step: '5', title: 'Insurance', desc: 'Validates coverage' },
    { step: '6', title: 'Follow-Up', desc: 'Creates monitoring plan' },
    { step: '7', title: 'Explain', desc: 'Shows transparent reasoning' }
]

const stack = [
    { icon: Sparkles, name: 'LLMs', desc: 'Medical summarization, clinical notes, symptom reasoning' },
    { icon: Network, name: 'RAG', desc: 'Grounds answers in guidelines & records, reduces hallucination' },
    { icon: GitBranch, name: 'LangGraph', desc: 'Orchestrates the multi-agent workflow' },
    { icon: Database, name: 'Redis', desc: 'Session memory, case checkpoints & patient history' }
]

const improves = [
    'Hospital efficiency', 'Patient experience', 'Diagnostic support quality',
    'Medication safety', 'Discharge & follow-up compliance', 'Insurance process clarity'
]
const reduces = [
    'Repeated tests', 'Manual paperwork', 'Missed follow-ups', 'Treatment delays', 'Administrative burden on staff'
]

function Landing({ onPatientPortal, onDoctorDashboard }) {
    return (
        <div className='min-h-screen w-full bg-[#0d0f14] text-white'>
            {/* Nav */}
            <div className='sticky top-0 z-30 h-14 flex items-center px-6 border-b border-white/[0.06] bg-[#0d0f14]/80 backdrop-blur-md'>
                <CarePilotLogo size={28} variant="mark" className="text-emerald-400" />
                <span className='ml-2.5 text-[14px] font-semibold tracking-tight'>CarePilot Ai</span>
                <button onClick={onDoctorDashboard}
                    className='ml-auto flex items-center gap-1.5 text-[12.5px] text-slate-400 hover:text-slate-200 bg-transparent border-none cursor-pointer'>
                    <LogIn size={13} /> Doctor Dashboard
                </button>
            </div>

            {/* Hero */}
            <section className='px-6 pt-20 pb-24 max-w-4xl mx-auto text-center flex flex-col items-center'>
                <span className='text-[11px] tracking-wide font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1'>
                    HEALTHCARE · MULTI-AGENT SYSTEMS · TEAM METRIX
                </span>
                <h1 className='mt-5 text-[40px] sm:text-[52px] leading-[1.08] font-semibold tracking-tight'>
                    Multi-Agent AI<br />Care Assistant
                </h1>
                <p className='mt-5 text-[15px] text-slate-400 max-w-xl leading-relaxed'>
                    Coordinating intake, diagnosis, prescriptions, insurance, and follow-up
                    through a team of seven specialized AI agents — instead of one generic chatbot.
                </p>
                <div className='mt-8 flex items-center gap-3'>
                    <button onClick={onPatientPortal}
                        className='flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-[13.5px] font-medium border-none cursor-pointer transition-colors duration-150'>
                        Enter Patient Portal <ArrowRight size={15} />
                    </button>
                    <button onClick={onDoctorDashboard}
                        className='flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-slate-200 text-[13.5px] font-medium cursor-pointer transition-colors duration-150'>
                        Doctor Dashboard
                    </button>
                </div>
            </section>

            {/* Problem */}
            <section className='px-6 py-16 border-t border-white/[0.06]'>
                <div className='max-w-5xl mx-auto'>
                    <p className='text-[11px] tracking-wide font-medium text-slate-500'>THE PROBLEM</p>
                    <h2 className='mt-2 text-[26px] font-semibold tracking-tight max-w-xl'>Hospital systems are fragmented</h2>
                    <p className='mt-3 text-[14px] text-slate-400 max-w-2xl leading-relaxed'>
                        Appointments, records, diagnosis support, prescriptions, insurance claims, lab reports, and
                        follow-ups often live in separate platforms — creating delays, repeated data entry, and a
                        stressful experience for patients and staff alike.
                    </p>
                    <div className='mt-6 grid sm:grid-cols-2 gap-3 max-w-2xl'>
                        {problems.map((p, i) => (
                            <div key={i} className='flex items-start gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3'>
                                <span className='w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0' />
                                <p className='text-[13px] text-slate-300'>{p}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 7 Agents */}
            <section className='px-6 py-16 border-t border-white/[0.06]'>
                <div className='max-w-5xl mx-auto'>
                    <p className='text-[11px] tracking-wide font-medium text-slate-500'>THE SOLUTION</p>
                    <h2 className='mt-2 text-[26px] font-semibold tracking-tight'>Seven specialized agents</h2>
                    <p className='mt-3 text-[14px] text-slate-400 max-w-2xl leading-relaxed'>
                        Each agent owns one healthcare function, sharing context through a common
                        medical knowledge layer for consistent, coordinated decisions.
                    </p>
                    <div className='mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3'>
                        {agents.map((a, i) => (
                            <div key={i} className='bg-[#13151c] border border-white/[0.08] rounded-2xl p-4 flex flex-col gap-2'>
                                <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20'>
                                    <a.icon size={14} className='text-emerald-400' />
                                </div>
                                <p className='text-[13.5px] text-slate-100 font-medium'>{a.name}</p>
                                <p className='text-[12px] text-slate-500 leading-relaxed'>{a.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Workflow */}
            <section className='px-6 py-16 border-t border-white/[0.06]'>
                <div className='max-w-5xl mx-auto'>
                    <p className='text-[11px] tracking-wide font-medium text-slate-500'>HOW IT WORKS</p>
                    <h2 className='mt-2 text-[26px] font-semibold tracking-tight'>A coordinated workflow</h2>
                    <p className='mt-3 text-[14px] text-slate-400 max-w-2xl leading-relaxed'>
                        Each agent hands off structured output to the next, creating a single, coordinated
                        care journey rather than a set of isolated tools.
                    </p>
                    <div className='mt-8 flex flex-wrap gap-2 items-stretch'>
                        {workflow.map((w, i) => (
                            <React.Fragment key={i}>
                                <div className='flex flex-col gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 min-w-[130px]'>
                                    <span className='text-[10px] text-emerald-400 font-semibold'>STEP {w.step}</span>
                                    <p className='text-[13px] text-slate-100 font-medium'>{w.title}</p>
                                    <p className='text-[11px] text-slate-500'>{w.desc}</p>
                                </div>
                                {i < workflow.length - 1 && (
                                    <div className='flex items-center text-slate-700'><ArrowRight size={14} /></div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </section>

            {/* Tech stack */}
            <section className='px-6 py-16 border-t border-white/[0.06]'>
                <div className='max-w-5xl mx-auto'>
                    <p className='text-[11px] tracking-wide font-medium text-slate-500'>TECH STACK</p>
                    <h2 className='mt-2 text-[26px] font-semibold tracking-tight'>Built for coordinated, grounded, explainable care</h2>
                    <div className='mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3'>
                        {stack.map((s, i) => (
                            <div key={i} className='bg-[#13151c] border border-white/[0.08] rounded-2xl p-4 flex flex-col gap-2'>
                                <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20'>
                                    <s.icon size={14} className='text-emerald-400' />
                                </div>
                                <p className='text-[13.5px] text-slate-100 font-medium'>{s.name}</p>
                                <p className='text-[12px] text-slate-500 leading-relaxed'>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Impact */}
            <section className='px-6 py-16 border-t border-white/[0.06]'>
                <div className='max-w-5xl mx-auto'>
                    <p className='text-[11px] tracking-wide font-medium text-slate-500'>REAL-LIFE IMPACT</p>
                    <div className='mt-4 grid sm:grid-cols-2 gap-6'>
                        <div>
                            <p className='text-[13px] text-emerald-400 font-medium mb-3'>Improves</p>
                            <div className='flex flex-col gap-2'>
                                {improves.map((t, i) => (
                                    <div key={i} className='flex items-center gap-2 text-[13px] text-slate-300'>
                                        <span className='w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0' /> {t}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className='text-[13px] text-red-400 font-medium mb-3'>Reduces</p>
                            <div className='flex flex-col gap-2'>
                                {reduces.map((t, i) => (
                                    <div key={i} className='flex items-center gap-2 text-[13px] text-slate-300'>
                                        <span className='w-1.5 h-1.5 rounded-full bg-red-400 shrink-0' /> {t}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className='px-6 py-20 border-t border-white/[0.06] text-center'>
                <h2 className='text-[28px] font-semibold tracking-tight'>Care that's coordinated, not fragmented.</h2>
                <div className='mt-7 flex items-center justify-center gap-3'>
                    <button onClick={onPatientPortal}
                        className='flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-[13.5px] font-medium border-none cursor-pointer transition-colors duration-150'>
                        Enter Patient Portal <ArrowRight size={15} />
                    </button>
                    <button onClick={onDoctorDashboard}
                        className='flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-slate-200 text-[13.5px] font-medium cursor-pointer transition-colors duration-150'>
                        Doctor Dashboard
                    </button>
                </div>
                <p className='mt-10 text-[11.5px] text-slate-600'>CarePilot Ai — Multi-Agent AI Care Assistant · Team MetriX</p>
            </section>
        </div>
    )
}

export default Landing
