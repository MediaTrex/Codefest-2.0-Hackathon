import {
  ClipboardList,
  FileText,
  Stethoscope,
  ShieldCheck,
  ShieldAlert,
  Pill,
  Brain,
} from 'lucide-react'

// Canonical pipeline order — agentName must match backend AGENT_NAME values.
export const AGENT_STAGES = [
  { id: 'intake', label: 'Intake', agentName: 'Intake Agent', icon: ClipboardList },
  { id: 'records', label: 'Records', agentName: 'Medical Record Agent', icon: FileText },
  { id: 'triage', label: 'Triage', agentName: 'Triage & Diagnostic Agent', icon: Stethoscope },
  { id: 'safety', label: 'Safety', agentName: 'Prescription Safety Agent', icon: ShieldCheck },
  { id: 'insurance', label: 'Insurance', agentName: 'Insurance & Billing Agent', icon: ShieldAlert },
  { id: 'followup', label: 'Follow-up', agentName: 'Follow-up Agent', icon: Pill },
  { id: 'explain', label: 'Explain', agentName: 'Explainability Agent', icon: Brain },
]

export const PIPELINE_AGENTS = AGENT_STAGES.map((s) => s.agentName)

function resolveStageId(stageKey) {
  if (!stageKey) return AGENT_STAGES[0].id
  const hit = AGENT_STAGES.find(
    (s) =>
      s.id === stageKey ||
      s.agentName === stageKey ||
      s.agentName.toLowerCase() === String(stageKey).toLowerCase() ||
      stageKey.includes?.(s.label)
  )
  return hit?.id || AGENT_STAGES[0].id
}

/**
 * Given a case's timeline array, return the agent name representing where
 * this case currently sits.
 */
export function currentStage(timeline) {
  if (!Array.isArray(timeline) || timeline.length === 0) {
    return PIPELINE_AGENTS[0]
  }
  const incomplete = timeline.find((step) => step.status !== 'completed')
  if (incomplete?.agent) return incomplete.agent
  return timeline[timeline.length - 1].agent || PIPELINE_AGENTS[PIPELINE_AGENTS.length - 1]
}

/** Prefer backend-provided current_stage; fall back to timeline derivation. */
export function stageForCase(caseItem) {
  if (caseItem?.current_stage) return caseItem.current_stage
  return currentStage(caseItem?.timeline)
}

/** Stage id (intake|records|…) for a case — used by PipelineFlowMap. */
export function stageIdForCase(caseItem) {
  return resolveStageId(stageForCase(caseItem))
}

/**
 * Groups cases by pipeline stage id: { [stageId]: caseObject[] }.
 */
export function groupByStage(casesWithTimeline = []) {
  const groups = Object.fromEntries(AGENT_STAGES.map((s) => [s.id, []]))
  for (const c of casesWithTimeline) {
    const id = stageIdForCase(c)
    if (groups[id]) groups[id].push(c)
  }
  return groups
}

/** @deprecated alias — groups by full agent name */
export function groupCasesByStage(cases = []) {
  const groups = Object.fromEntries(PIPELINE_AGENTS.map((a) => [a, []]))
  for (const c of cases) {
    const agent = stageForCase(c)
    const id = resolveStageId(agent)
    const name = AGENT_STAGES.find((s) => s.id === id)?.agentName || PIPELINE_AGENTS[0]
    groups[name].push(c)
  }
  return groups
}

export function timeAgo(dateInput) {
  if (!dateInput) return ''
  const then = new Date(dateInput).getTime()
  if (Number.isNaN(then)) return '—'
  const mins = Math.floor((Date.now() - then) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
