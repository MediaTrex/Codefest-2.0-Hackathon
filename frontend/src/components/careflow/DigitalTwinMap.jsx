import React, { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { groupCasesByStage } from '../../utils/pipelineStage'

const FLOW = [
  { key: 'intake', agent: 'Intake Agent', label: 'Intake', color: '#38bdf8' },
  { key: 'records', agent: 'Medical Record Agent', label: 'Records', color: '#a78bfa' },
  { key: 'insurance', agent: 'Insurance & Billing Agent', label: 'Insurance', color: '#fbbf24' },
  { key: 'triage', agent: 'Triage & Diagnostic Agent', label: 'Triage', color: '#fb7185' },
  { key: 'safety', agent: 'Prescription Safety Agent', label: 'Safety', color: '#34d399' },
  { key: 'explain', agent: 'Explainability Agent', label: 'Explain', color: '#2dd4bf' },
  { key: 'followup', agent: 'Follow-up Agent', label: 'Follow-up', color: '#818cf8' },
]

function DigitalTwinMap({ cases = [], onSelectCase }) {
  const [hovered, setHovered] = useState(null)
  const userData = useSelector((state) => state.user.userData)
  const staffName = userData?.name || userData?.email || 'On-duty staff'
  const groups = useMemo(() => groupCasesByStage(cases), [cases])

  const nodes = useMemo(
    () =>
      FLOW.map((n) => {
        const list = groups[n.agent] || []
        const emergency = list.some((c) => (c.urgency || '').toLowerCase() === 'emergency')
        const review = list.some((c) => c.requires_human_review)
        return {
          ...n,
          cases: list,
          count: list.length,
          active: list.length > 0,
          tone: emergency ? '#EF4444' : review ? '#5B5CEB' : n.color,
        }
      }),
    [groups]
  )

  const tip = nodes.find((n) => n.key === hovered)

  return (
    <div className="cf-card h-full min-h-[360px] overflow-hidden relative flex flex-col">
      <div className="px-5 pt-4 pb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-slate-900 tracking-tight">Digital Twin Map</p>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Interactive CareFlow pipeline · live stage load
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-500"
            style={{ animation: 'pulse-live 1.4s ease-in-out infinite' }}
          />
          Live
        </span>
      </div>

      <div className="flex-1 relative px-4 pb-4 overflow-x-auto overflow-y-hidden">
        <div className="min-w-[640px] h-full flex items-center">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
            <defs>
              <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#5B5CEB" stopOpacity="0.15" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#22C55E" stopOpacity="0.2" />
              </linearGradient>
            </defs>
          </svg>

          <div className="relative w-full flex items-center justify-between gap-1 px-2">
            {nodes.map((n, i) => (
              <React.Fragment key={n.key}>
                <button
                  type="button"
                  className="relative flex flex-col items-center gap-2 border-none bg-transparent cursor-pointer p-1 min-w-[72px] group"
                  onMouseEnter={() => setHovered(n.key)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => n.cases[0] && onSelectCase?.(n.cases[0].caseId)}
                  aria-label={`${n.label}: ${n.count} cases`}
                >
                  <span
                    className="relative w-14 h-14 rounded-full flex items-center justify-center text-white text-[16px] font-semibold transition-transform duration-200 group-hover:scale-110"
                    style={{
                      background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.35), ${n.tone}aa 45%, ${n.tone} 100%)`,
                      boxShadow: n.active
                        ? `0 0 0 1px ${n.tone}88, 0 0 28px ${n.tone}66`
                        : `0 0 0 1px ${n.tone}44, 0 0 12px ${n.tone}33`,
                      animation: n.active ? 'node-pulse 2s ease-in-out infinite' : undefined,
                    }}
                  >
                    {n.count}
                  </span>
                  <span className="text-[12px] font-medium text-slate-700">{n.label}</span>
                </button>

                {i < nodes.length - 1 && (
                  <div className="flex-1 h-[2px] relative min-w-[12px] mx-0.5" aria-hidden>
                    <div
                      className="absolute inset-0 rounded-full opacity-60"
                      style={{ background: 'linear-gradient(90deg, #5B5CEB, #38bdf8)' }}
                    />
                    <svg className="absolute inset-0 w-full h-full overflow-visible">
                      <line
                        x1="0"
                        y1="1"
                        x2="100%"
                        y2="1"
                        stroke="#5B5CEB"
                        strokeWidth="2"
                        strokeDasharray="6 6"
                        strokeOpacity="0.7"
                        style={{ animation: 'flow-dash 1s linear infinite' }}
                      />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {tip && (
          <div className="absolute left-1/2 bottom-3 -translate-x-1/2 w-[240px] rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md p-3 shadow-xl z-20 pointer-events-none">
            <p className="text-[13px] font-semibold text-slate-900">{tip.label}</p>
            <div className="mt-2 space-y-1 text-[12px] text-slate-500">
              <div className="flex justify-between">
                <span className="text-slate-500">Active cases</span>
                <span className="font-semibold text-slate-900">{tip.count}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Patients</span>
                <span className="truncate max-w-[120px] text-right">
                  {tip.count
                    ? tip.cases
                        .map((c) => c.patientName || 'Unknown')
                        .slice(0, 2)
                        .join(', ')
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Doctors</span>
                <span>{tip.count ? staffName.split(' ')[0] : 'Idle'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DigitalTwinMap
