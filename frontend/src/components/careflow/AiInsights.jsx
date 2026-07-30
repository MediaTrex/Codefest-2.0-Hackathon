import React from 'react'
import { Sparkles, TrendingUp, Lightbulb, Users } from 'lucide-react'

const INSIGHTS = [
  {
    icon: TrendingUp,
    title: 'Predicted patient surge',
    body: 'OPD volume likely +18% in the next 4 hours based on intake velocity.',
    tone: '#5B5CEB',
  },
  {
    icon: Lightbulb,
    title: 'AI recommendation',
    body: 'Prioritize review queue for emergency-flagged cases before routine follow-ups.',
    tone: '#F59E0B',
  },
  {
    icon: Users,
    title: 'Resource allocation',
    body: 'Suggest shifting 1 triage clinician to Emergency for the afternoon window.',
    tone: '#22C55E',
  },
]

function AiInsights() {
  return (
    <div className="cf-card p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(91,92,235,0.12)', color: '#5B5CEB' }}
        >
          <Sparkles size={15} />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">AI Insights</h2>
          <p className="text-[12px] text-slate-500">Operational recommendations</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {INSIGHTS.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5"
          >
            <div className="flex items-start gap-2.5">
              <item.icon size={15} style={{ color: item.tone, marginTop: 2 }} />
              <div>
                <p className="text-[13px] font-semibold text-slate-800">{item.title}</p>
                <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">{item.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AiInsights
