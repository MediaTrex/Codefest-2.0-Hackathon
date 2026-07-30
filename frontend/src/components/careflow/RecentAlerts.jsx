import React, { useMemo } from 'react'
import { AlertOctagon, AlertTriangle, Info } from 'lucide-react'

function RecentAlerts({ cases = [] }) {
  const alerts = useMemo(() => {
    const list = []
    for (const c of cases) {
      if ((c.urgency || '').toLowerCase() === 'emergency') {
        list.push({
          id: `${c.caseId}-e`,
          level: 'critical',
          title: `Critical · ${c.patientName || 'Patient'}`,
          body: c.topDiagnosis || 'Emergency flagged by triage',
          Icon: AlertOctagon,
        })
      } else if (c.requires_human_review) {
        list.push({
          id: `${c.caseId}-w`,
          level: 'warning',
          title: `Warning · review needed`,
          body: `${c.patientName || 'Patient'} awaiting clinician review`,
          Icon: AlertTriangle,
        })
      }
    }
    if (list.length === 0) {
      return [
        {
          id: 'info-1',
          level: 'info',
          title: 'Information · systems nominal',
          body: 'No critical alerts in the current case queue.',
          Icon: Info,
        },
      ]
    }
    return list.slice(0, 5)
  }, [cases])

  const tone = {
    critical: { bg: 'bg-rose-50', border: 'border-rose-100', color: '#EF4444' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-100', color: '#F59E0B' },
    info: { bg: 'bg-slate-50', border: 'border-slate-100', color: '#5B5CEB' },
  }

  return (
    <div className="cf-card p-5 h-full">
      <h2 className="text-[15px] font-semibold text-slate-900">Recent Alerts</h2>
      <p className="text-[12px] text-slate-500 mt-0.5 mb-4">Timeline</p>
      <ol className="relative border-l border-slate-200 ml-2 space-y-4">
        {alerts.map((a) => {
          const t = tone[a.level]
          return (
            <li key={a.id} className="pl-4 relative">
              <span
                className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white"
                style={{ background: t.color }}
              />
              <div className={`rounded-2xl border p-3 ${t.bg} ${t.border}`}>
                <div className="flex items-center gap-1.5">
                  <a.Icon size={13} style={{ color: t.color }} />
                  <p className="text-[13px] font-semibold text-slate-800">{a.title}</p>
                </div>
                <p className="text-[12px] text-slate-500 mt-1">{a.body}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export default RecentAlerts
