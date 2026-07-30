import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { getModel } from "../../config/llmModels.js"
import { checkAgentLimit } from "../../config/agentLimit.js"
import { deductCredits } from "../../utils/deductCredits.js"
import { safeParseJson } from "../../utils/parseJson.js"

const AGENT_NAME = "Follow-up Agent"

export const followupAgent = async (state) => {
    try {
        await checkAgentLimit(state.userId, "followup")

        const llm = await getModel("followup")

        const systemPrompt = `You are the Follow-up Agent inside CareFlow AI.

Your job is post-visit care planning — you do not diagnose or change the prescription.

Rules:
- Build a recovery plan aligned with the diagnosis's urgency level.
- Include medication reminders based on the reviewed medications.
- Include practical lifestyle recommendations.
- Propose a concrete follow-up schedule (e.g. "in 3 days", "in 2 weeks").
- List warning signs that should prompt the patient to seek urgent/emergency care.
- Provide a short recovery checklist.

Return ONLY valid JSON, no markdown, no commentary, matching exactly this shape:
{
  "recovery_plan": "",
  "medication_reminders": [],
  "lifestyle_recommendations": [],
  "follow_up_schedule": "",
  "warning_signs": [],
  "recovery_checklist": []
}`

        const userPayload = JSON.stringify({
            diagnosis: state.diagnosis,
            medications: state.medications,
            interaction_warnings: state.interaction_warnings
        })

        const response = await llm.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userPayload)
        ])

        const followup_plan = safeParseJson(response.content)

        await deductCredits(state.userId, "followup")

        return {
            ...state,
            followup_plan,
            timeline: [{
                agent: AGENT_NAME,
                status: "completed",
                summary: "Follow-up and recovery plan generated.",
                timestamp: new Date().toISOString()
            }]
        }
    } catch (error) {
        console.log("followupAgent error", error)
        return {
            ...state,
            followup_plan: { recovery_plan: "Unable to generate follow-up plan.", error: true },
            timeline: [{
                agent: AGENT_NAME,
                status: "failed",
                summary: error?.data?.message || "Follow-up plan generation failed.",
                timestamp: new Date().toISOString()
            }]
        }
    }
}
