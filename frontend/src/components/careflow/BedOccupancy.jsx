import React from 'react'

function BedOccupancy({ value = 72 }) {
  const r = 54
  const c = 2 * Math.PI * r
  const offset = c - (value / 100) * c

  return (
    <div className="cf-card p-5 h-full flex flex-col items-center justify-center">
      <h2 className="text-[15px] font-semibold text-slate-900 self-start">Bed Occupancy</h2>
      <p className="text-[12px] text-slate-500 mt-0.5 mb-4 self-start">Hospital-wide</p>
      <div className="relative w-[140px] h-[140px]">
        <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden>
          <circle cx="70" cy="70" r={r} fill="none" stroke="#eef2f7" strokeWidth="12" />
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            stroke="#5B5CEB"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform="rotate(-90 70 70)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-[32px] font-semibold text-slate-900 leading-none tabular-nums">
            {value}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1">occupied</p>
        </div>
      </div>
    </div>
  )
}

export default BedOccupancy
