import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { getModel } from "../../config/llmModels.js"
import { checkAgentLimit } from "../../config/agentLimit.js"
import { deductCredits } from "../../utils/deductCredits.js"
import { safeParseJson } from "../../utils/parseJson.js"

const AGENT_NAME = "Explainability Agent"

// The Explainability Agent is the final node in the pipeline. It does NOT
// perform new medical reasoning — it coordinates: merges the outputs of
// the other 6 agents, flags disagreements between them, and produces a
// transparent, human-readable reasoning trace plus the two audience-
// specific summaries (doctor notes + patient explanation).
export const explainabilityAgent = async (state) => {
    try {
        await checkAgentLimit(state.userId, "explainability")

        const llm = await getModel("explainability")

        const systemPrompt = `You are the Explainability Agent inside CareFlow AI, a multi-agent healthcare assistant.

You do NOT diagnose, prescribe, or perform new medical reasoning. You already have the outputs of six specialist agents (Intake, Medical Record, Triage & Diagnostic, Prescription Safety, Insurance & Billing, Follow-Up). Your job is purely coordination and transparency:

- Detect conflicts between agent outputs (e.g. a follow-up medication reminder for a drug Prescription Safety flagged as unsafe, or a diagnosis urgency that contradicts a "routine" insurance claim readiness). If none exist, return an empty array.
- Build a "reasoning_trace": a short ordered list of steps explaining WHY the final recommendation looks the way it does, referencing which agent contributed which fact (e.g. "Diagnostic Agent flagged possible pneumonia (medium likelihood) based on reported symptoms + chest pain history from Medical Record Agent").
- Write "doctor_notes": a concise clinical-style summary for a physician (findings, urgency, safety flags, insurance/logistics note, recommended next step).
- Write "patient_summary": the same information in warm, plain, non-alarming language a patient can understand, avoiding medical jargon.
- Never invent new medical facts that are not present in the agent outputs you were given.

Return ONLY valid JSON, no markdown, no commentary, matching exactly this shape:
{
  "conflicts": [{ "between": ["", ""], "description": "" }],
  "reasoning_trace": ["", ""],
  "doctor_notes": "",
  "patient_summary": "",
  "overall_urgency": "routine",
  "requires_human_review": true
}`

        const userPayload = JSON.stringify({
            structured_case: state.structured_case,
            medical_history: state.medical_history,
            diagnosis: state.diagnosis,
            confidence_score: state.confidence_score,
            medications: state.medications,
            interaction_warnings: state.interaction_warnings,
            insurance_summary: state.insurance_summary,
            followup_plan: state.followup_plan
        })

        const response = await llm.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userPayload)
        ])

        const merged = safeParseJson(response.content)

        await deductCredits(state.userId, "explainability")

        const final_report = {
            structured_case: state.structured_case,
            medical_history: state.medical_history,
            diagnosis: state.diagnosis,
            confidence_score: state.confidence_score,
            medications: state.medications,
            interaction_warnings: state.interaction_warnings,
            insurance_summary: state.insurance_summary,
            followup_plan: state.followup_plan,
            conflicts: merged?.conflicts || [],
            reasoning_trace: merged?.reasoning_trace || [],
            doctor_notes: merged?.doctor_notes || "",
            patient_summary: merged?.patient_summary || "",
            overall_urgency: merged?.overall_urgency || state.diagnosis?.urgency || "routine",
            requires_human_review: merged?.requires_human_review ?? true,
            generatedAt: new Date().toISOString()
        }

        return {
            ...state,
            conflicts: final_report.conflicts,
            reasoning_trace: final_report.reasoning_trace,
            doctor_notes: final_report.doctor_notes,
            patient_summary: final_report.patient_summary,
            final_report,
            timeline: [{
                agent: AGENT_NAME,
                status: "completed",
                summary: final_report.conflicts.length
                    ? `Final report compiled with transparent reasoning. ${final_report.conflicts.length} conflict(s) flagged for review.`
                    : "Final report compiled with transparent reasoning. No conflicts detected between agents.",
                timestamp: new Date().toISOString()
            }]
        }
    } catch (error) {
        console.log("explainabilityAgent error", error)
        const final_report = {
            structured_case: state.structured_case,
            medical_history: state.medical_history,
            diagnosis: state.diagnosis,
            confidence_score: state.confidence_score,
            medications: state.medications,
            interaction_warnings: state.interaction_warnings,
            insurance_summary: state.insurance_summary,
            followup_plan: state.followup_plan,
            conflicts: [],
            reasoning_trace: [],
            doctor_notes: "Explainability Agent failed to compile notes. Please review individual agent outputs.",
            patient_summary: "We ran into an issue preparing your summary. A member of the care team will review your case shortly.",
            overall_urgency: state.diagnosis?.urgency || "routine",
            requires_human_review: true,
            generatedAt: new Date().toISOString(),
            error: true
        }
        return {
            ...state,
            final_report,
            timeline: [{
                agent: AGENT_NAME,
                status: "failed",
                summary: error?.data?.message || "Explainability Agent merge failed.",
                timestamp: new Date().toISOString()
            }]
        }
    }
}
