import React, { useEffect, useState } from 'react'
import { ArrowLeft, Loader2, RefreshCw, ChevronRight, AlertTriangle } from 'lucide-react'
import { fetchCases, fetchCase } from '../features/careflow/submitCase'
import CaseReport from '../components/careflow/CaseReport'
import CarePilotLogo from '../components/CarePilotLogo'

const urgencyDot = (urgency) => {
    switch ((urgency || '').toLowerCase()) {
        case 'emergency': return 'bg-red-400'
        case 'urgent': return 'bg-amber-400'
        default: return 'bg-emerald-400'
    }
}

function DoctorDashboard({ onBack }) {
    const [cases, setCases] = useState([])
    const [loadingList, setLoadingList] = useState(true)
    const [selectedId, setSelectedId] = useState(null)
    const [selectedCase, setSelectedCase] = useState(null)
    const [loadingCase, setLoadingCase] = useState(false)

    const loadCases = async () => {
        setLoadingList(true)
        try {
            const data = await fetchCases()
            setCases(data)
        } catch (err) {
            console.log(err)
        } finally {
            setLoadingList(false)
        }
    }

    useEffect(() => { loadCases() }, [])

    const openCase = async (caseId) => {
        setSelectedId(caseId)
        setLoadingCase(true)
        setSelectedCase(null)
        try {
            const data = await fetchCase(caseId)
            setSelectedCase(data)
        } catch (err) {
            console.log(err)
        } finally {
            setLoadingCase(false)
        }
    }

    return (
        <div className='h-screen w-full flex flex-col bg-[#0d0f14] text-white overflow-hidden'>
            <div className='h-14 flex items-center gap-2.5 px-5 border-b border-white/[0.06] shrink-0'>
                <button onClick={onBack} className='flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] bg-transparent border-none cursor-pointer'>
                    <ArrowLeft size={15} />
                </button>
                <CarePilotLogo size={28} variant="mark" className="text-emerald-400" />
                <div className='text-[14px] font-semibold text-slate-100 tracking-tight'>Doctor Dashboard</div>
                <span className='text-[10px] font-medium text-slate-600 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full'>CarePilot Ai</span>
                <button onClick={loadCases} className='ml-auto flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-slate-200 bg-transparent border-none cursor-pointer'>
                    <RefreshCw size={13} className={loadingList ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            <div className='flex-1 flex overflow-hidden'>
                {/* Case list */}
                <div className='w-[320px] shrink-0 border-r border-white/[0.06] overflow-y-auto p-3 flex flex-col gap-1.5'>
                    {loadingList && (
                        <div className='flex items-center justify-center py-10 text-slate-600'>
                            <Loader2 size={18} className='animate-spin' />
                        </div>
                    )}
                    {!loadingList && cases.length === 0 && (
                        <p className='text-[12.5px] text-slate-600 px-2 py-6 text-center'>No cases yet. Cases submitted from the Patient Portal will show up here.</p>
                    )}
                    {cases.map((c) => (
                        <button key={c.caseId} onClick={() => openCase(c.caseId)}
                            className={`text-left w-full rounded-xl p-3 border cursor-pointer transition-colors duration-150 ${selectedId === c.caseId ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'}`}>
                            <div className='flex items-center justify-between gap-2'>
                                <p className='text-[13px] text-slate-100 font-medium truncate'>{c.patientName}</p>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${urgencyDot(c.urgency)}`} />
                            </div>
                            <p className='text-[11.5px] text-slate-500 truncate mt-0.5'>{c.topDiagnosis}</p>
                            <div className='flex items-center justify-between mt-1.5'>
                                <span className='text-[10.5px] text-slate-600'>{new Date(c.createdAt).toLocaleString()}</span>
                                {c.requires_human_review && (
                                    <span className='flex items-center gap-1 text-[10px] text-amber-400'>
                                        <AlertTriangle size={10} /> review
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Case detail */}
                <div className='flex-1 overflow-y-auto p-5'>
                    {!selectedId && (
                        <div className='h-full flex flex-col items-center justify-center text-slate-600 gap-2'>
                            <ChevronRight size={24} />
                            <p className='text-[13px]'>Select a case from the list to view the full CarePilot Ai report.</p>
                        </div>
                    )}
                    {selectedId && loadingCase && (
                        <div className='h-full flex items-center justify-center text-slate-500'>
                            <Loader2 size={20} className='animate-spin' />
                        </div>
                    )}
                    {selectedId && !loadingCase && selectedCase && (
                        <div className='max-w-3xl'>
                            <CaseReport result={selectedCase} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default DoctorDashboard
