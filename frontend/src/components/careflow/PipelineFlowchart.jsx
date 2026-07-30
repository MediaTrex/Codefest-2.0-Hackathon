import { AGENT_STAGES } from '../../utils/pipelineStage'
import { Check } from 'lucide-react'

/**
 * Horizontal flowchart of the 7 CareFlow agents.
 * Chart.js is for stats charts — this is a real flow diagram (nodes + edges).
 */
export default function PipelineFlowchart({ timeline = [] }) {
  const steps = AGENT_STAGES.map((stage) => {
    const hit = timeline.find(
      (t) =>
        t.agent === stage.agentName ||
        String(t.agent || '')
          .toLowerCase()
          .includes(stage.label.toLowerCase())
    )
    let status = 'pending'
    if (hit?.status === 'completed') status = 'completed'
    else if (hit?.status === 'in_progress' || hit?.status === 'current') status = 'current'
    return { ...stage, status, hit }
  })

  // If timeline incomplete, mark first non-completed as current
  const firstOpen = steps.findIndex((s) => s.status !== 'completed')
  if (firstOpen >= 0 && !steps.some((s) => s.status === 'current')) {
    steps[firstOpen].status = 'current'
  }

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="flex items-stretch min-w-[720px] gap-0 py-2">
        {steps.map((step, i) => {
          const Icon = step.icon
          const done = step.status === 'completed'
          const current = step.status === 'current'
          const nodeClass = done
            ? 'bg-[var(--cf-safe)] text-white border-[var(--cf-safe)]'
            : current
              ? 'bg-[var(--cf-brand)] text-white border-[var(--cf-brand)] shadow-[0_0_0_4px_var(--cf-brand-soft)]'
              : 'bg-[var(--cf-surface)] text-[var(--cf-ink-faint)] border-[var(--cf-border)]'

          const edgeClass = done
            ? 'bg-[var(--cf-safe)]'
            : current
              ? 'bg-[var(--cf-brand)]/40'
              : 'bg-[var(--cf-border)]'

          return (
            <div key={step.id} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center gap-2 w-full px-1">
                <div
                  className={`w-11 h-11 rounded-xl border-2 grid place-items-center shrink-0 transition-colors ${nodeClass}`}
                  title={step.agentName}
                >
                  {done ? <Check size={18} strokeWidth={2.5} /> : <Icon size={18} />}
                </div>
                <div className="text-center w-full">
                  <p
                    className={`text-[11.5px] font-semibold leading-tight ${
                      current
                        ? 'text-[var(--cf-brand)]'
                        : done
                          ? 'text-[var(--cf-ink)]'
                          : 'text-[var(--cf-ink-faint)]'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-[10px] text-[var(--cf-ink-faint)] capitalize mt-0.5">
                    {done ? 'done' : current ? 'current' : 'pending'}
                  </p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="flex items-center shrink-0 -mt-6" aria-hidden>
                  <div className={`h-0.5 w-4 sm:w-6 ${edgeClass}`} />
                  <div
                    className={`w-0 h-0 border-y-[4px] border-y-transparent border-l-[6px] ${
                      done
                        ? 'border-l-[var(--cf-safe)]'
                        : current
                          ? 'border-l-[var(--cf-brand)]/50'
                          : 'border-l-[var(--cf-border)]'
                    }`}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
