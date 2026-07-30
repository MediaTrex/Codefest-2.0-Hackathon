import React, { useMemo } from 'react'
import {
  ClipboardList,
  FileText,
  Stethoscope,
  ShieldAlert,
  ShieldCheck,
  Pill,
  Brain,
} from 'lucide-react'
import { groupCasesByStage } from '../../utils/pipelineStage'
import { heatClasses } from '../../utils/status'

const HEAT_THRESHOLDS = {
  lowMax: 2,
  mediumMax: 4,
}

const AGENT_META = [
  { name: 'Intake Agent', icon: ClipboardList, short: 'Intake' },
  { name: 'Medical Record Agent', icon: FileText, short: 'Records' },
  { name: 'Triage & Diagnostic Agent', icon: Stethoscope, short: 'Triage' },
  { name: 'Prescription Safety Agent', icon: ShieldAlert, short: 'Safety' },
  { name: 'Insurance & Billing Agent', icon: ShieldCheck, short: 'Insurance' },
  { name: 'Follow-up Agent', icon: Pill, short: 'Follow-up' },
  { name: 'Explainability Agent', icon: Brain, short: 'Explain' },
]

function heatLevel(count) {
  if (count <= 0) return 'none'
  if (count <= HEAT_THRESHOLDS.lowMax) return 'low'
  if (count <= HEAT_THRESHOLDS.mediumMax) return 'medium'
  return 'high'
}

function AgentHeatmap({ cases = [] }) {
  const groups = useMemo(() => groupCasesByStage(cases), [cases])

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 h-full flex flex-col">
      <div className="mb-3">
        <h2 className="text-[13px] font-semibold text-slate-900 tracking-tight">
          Agent heatmap
        </h2>
        <p className="text-[11.5px] text-slate-500 mt-0.5">
          Cases currently sitting at each pipeline stage
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 content-start">
        {AGENT_META.map(({ name, icon: Icon, short }) => {
          const count = (groups[name] || []).length
          const level = heatLevel(count)
          return (
            <div
              key={name}
              className={`rounded-xl border px-3 py-2.5 flex items-center gap-2.5 ${heatClasses(level)}`}
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/70 border border-inherit shrink-0">
                <Icon size={13} className="text-indigo-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium truncate">{short}</p>
                <p className="text-[10.5px] opacity-80 truncate">{name}</p>
              </div>
              <span className="text-[16px] font-semibold tabular-nums shrink-0">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AgentHeatmap
