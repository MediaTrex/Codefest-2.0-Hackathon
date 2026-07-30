import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { AGENT_STAGES } from '../../utils/pipelineStage'
import { severityClasses, timeAgo } from '../../utils/status'

const WIDTH = 1000
const HEIGHT = 220
const BASELINE = 130

const SEVERITY_AMPLITUDE = { danger: 74, caution: 48, safe: 26, idle: 16 }
const SEVERITY_STROKE = {
  danger: 'var(--cf-danger)',
  caution: 'var(--cf-caution)',
  safe: 'var(--cf-safe)',
  idle: 'var(--cf-border-strong)',
}

/**
 * Builds one ECG-style "beat" per pipeline stage. Beat amplitude encodes
 * that stage's load/severity — a flat idle stage draws a near-flat line,
 * an overloaded/emergency stage draws a sharp tall spike. Returns the path
 * `d` string plus the {x,y} peak coordinate for each stage (used to place
 * the node marker).
 */
function buildHeartbeatPath(stageSeverities) {
  const segW = WIDTH / stageSeverities.length
  let d = `M 0 ${BASELINE}`
  const peaks = []

  stageSeverities.forEach((severity, i) => {
    const x0 = i * segW
    const amp = SEVERITY_AMPLITUDE[severity] ?? SEVERITY_AMPLITUDE.idle

    const p1x = x0 + segW * 0.12
    const p1y = BASELINE - 8
    const preQx = x0 + segW * 0.22
    const preQy = BASELINE
    const qx = x0 + segW * 0.32
    const qy = BASELINE + amp * 0.18
    const rx = x0 + segW * 0.4
    const ry = BASELINE - amp
    const sx = x0 + segW * 0.48
    const sy = BASELINE + amp * 0.3
    const bx = x0 + segW * 0.58
    const by = BASELINE
    const t1x = x0 + segW * 0.78
    const t1y = BASELINE - 12
    const endX = x0 + segW
    const endY = BASELINE

    d += ` L ${p1x} ${p1y} L ${preQx} ${preQy} L ${qx} ${qy} L ${rx} ${ry} L ${sx} ${sy} L ${bx} ${by} Q ${t1x} ${t1y} ${endX} ${endY}`
    peaks.push({ x: rx, y: ry, centerX: x0 + segW / 2 })
  })

  return { d, peaks }
}

export default function PipelineFlowMap({ stageGroups = {}, onSelectCase }) {
  const navigate = useNavigate()
  const select = (caseId) =>
    onSelectCase ? onSelectCase(caseId) : navigate(`/case/${caseId}`)
  const [scale, setScale] = useState(1)
  const [selectedStage, setSelectedStage] = useState(null)

  const stageSeverities = useMemo(
    () =>
      AGENT_STAGES.map((stage) => {
        const cases = stageGroups[stage.id] || []
        if (cases.some((c) => c.urgency === 'emergency')) return 'danger'
        if (cases.some((c) => c.requires_human_review || c.urgency === 'urgent')) return 'caution'
        if (cases.length > 0) return 'safe'
        return 'idle'
      }),
    [stageGroups]
  )

  const { d, peaks } = useMemo(() => buildHeartbeatPath(stageSeverities), [stageSeverities])

  const activeStage = selectedStage ? AGENT_STAGES.find((s) => s.id === selectedStage) : null
  const activeCases = selectedStage ? stageGroups[selectedStage] || [] : []

  return (
    <div className="rounded-xl border border-[var(--cf-border)] bg-[var(--cf-surface)] p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--cf-ink)] tracking-wide uppercase">
            Pipeline load
          </h3>
          <p className="text-[13px] text-[var(--cf-ink-faint)] mt-0.5">
            Each beat is one agent stage — taller and redder means more load waiting there
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label="Zoom in"
            onClick={() => setScale((s) => Math.min(2, s + 0.25))}
            className="w-7 h-7 grid place-items-center rounded-md border border-[var(--cf-border)] text-[var(--cf-ink-soft)] hover:bg-[var(--cf-surface-sunken)]"
          >
            <ZoomIn size={14} />
          </button>
          <button
            aria-label="Zoom out"
            onClick={() => setScale((s) => Math.max(1, s - 0.25))}
            className="w-7 h-7 grid place-items-center rounded-md border border-[var(--cf-border)] text-[var(--cf-ink-soft)] hover:bg-[var(--cf-surface-sunken)]"
          >
            <ZoomOut size={14} />
          </button>
          <button
            aria-label="Reset zoom"
            onClick={() => setScale(1)}
            className="w-7 h-7 grid place-items-center rounded-md border border-[var(--cf-border)] text-[var(--cf-ink-soft)] hover:bg-[var(--cf-surface-sunken)]"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-[var(--cf-surface-sunken)] mt-3">
        <div
          style={{ transform: `scale(${scale})`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }}
        >
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-[200px]" role="img" aria-label="Pipeline load, drawn as a heartbeat trace per agent stage">
            {/* baseline grid */}
            <line x1="0" y1={BASELINE} x2={WIDTH} y2={BASELINE} stroke="var(--cf-border)" strokeWidth="1" />

            {/* the trace itself — flat single color, no gradient */}
            <path d={d} fill="none" stroke="var(--cf-ink-faint)" strokeWidth="1.5" strokeLinejoin="round" />

            {AGENT_STAGES.map((stage, i) => {
              const severity = stageSeverities[i]
              const peak = peaks[i]
              const count = (stageGroups[stage.id] || []).length
              const isSelected = selectedStage === stage.id
              return (
                <g key={stage.id}>
                  <circle
                    cx={peak.x}
                    cy={peak.y}
                    r={isSelected ? 20 : 17}
                    fill="var(--cf-surface)"
                    stroke={SEVERITY_STROKE[severity]}
                    strokeWidth={isSelected ? 3 : 2}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedStage(isSelected ? null : stage.id)}
                  />
                  <text
                    x={peak.x}
                    y={peak.y + 4}
                    textAnchor="middle"
                    fontFamily="var(--cf-font-mono)"
                    fontSize="13"
                    fontWeight="600"
                    fill="var(--cf-ink)"
                    style={{ pointerEvents: 'none' }}
                  >
                    {count}
                  </text>
                  <text
                    x={peak.centerX}
                    y={HEIGHT - 12}
                    textAnchor="middle"
                    fontFamily="var(--cf-font-ui)"
                    fontSize="12.5"
                    fill="var(--cf-ink-soft)"
                  >
                    {stage.label}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 text-[12px] text-[var(--cf-ink-faint)]">
        <Legend color="var(--cf-danger)" label="Emergency" />
        <Legend color="var(--cf-caution)" label="Needs review" />
        <Legend color="var(--cf-safe)" label="Routine" />
        <span className="ml-auto">Tap a stage for detail</span>
      </div>

      {activeStage && (
        <div className="mt-4 pt-4 border-t border-[var(--cf-border)]">
          <p className="text-[13px] font-semibold text-[var(--cf-ink)]">
            {activeStage.label} &middot; {activeStage.agentName}
          </p>
          {activeCases.length === 0 ? (
            <p className="text-[13px] text-[var(--cf-ink-faint)] mt-1">No cases currently at this stage.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[var(--cf-border)]">
              {activeCases.map((c) => {
                const sev = severityClasses(
                  c.urgency === 'emergency' ? 'danger' : c.requires_human_review ? 'caution' : 'safe'
                )
                return (
                  <li key={c.caseId}>
                    <button
                      onClick={() => select(c.caseId)}
                      className="w-full flex items-center gap-3 py-2 text-left hover:bg-[var(--cf-surface-sunken)] rounded-md px-2 -mx-2"
                    >
                      <span className={`w-2 h-2 rounded-full ${sev.dot}`} />
                      <span className="text-[13px] text-[var(--cf-ink)] flex-1">{c.patientName}</span>
                      <span className="text-[12px] text-[var(--cf-ink-faint)]">{timeAgo(c.createdAt)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
