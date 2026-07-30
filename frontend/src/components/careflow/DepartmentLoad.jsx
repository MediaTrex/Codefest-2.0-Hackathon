import React from 'react'

const DEPARTMENTS = [
  { name: 'Emergency', load: 78, color: '#EF4444' },
  { name: 'ICU', load: 64, color: '#5B5CEB' },
  { name: 'OPD', load: 52, color: '#22C55E' },
  { name: 'Radiology', load: 41, color: '#F59E0B' },
]

function DepartmentLoad() {
  return (
    <div className="cf-card p-5 h-full">
      <h2 className="text-[15px] font-semibold text-slate-900">Department Load</h2>
      <p className="text-[12px] text-slate-500 mt-0.5 mb-4">Capacity utilization</p>
      <div className="flex flex-col gap-3.5">
        {DEPARTMENTS.map((d) => (
          <div key={d.name}>
            <div className="flex items-center justify-between text-[13px] mb-1.5">
              <span className="font-medium text-slate-700">{d.name}</span>
              <span className="tabular-nums text-slate-500">{d.load}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${d.load}%`, background: d.color }}
                role="progressbar"
                aria-valuenow={d.load}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${d.name} load`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DepartmentLoad
