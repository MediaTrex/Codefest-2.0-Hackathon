import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { getModel } from "../../config/llmModels.js"
import { checkAgentLimit } from "../../config/agentLimit.js"
import { deductCredits } from "../../utils/deductCredits.js"
import { safeParseJson } from "../../utils/parseJson.js"

const AGENT_NAME = "Prescription Safety Agent"

export const prescriptionSafetyAgent = async (state) => {
    try {
        await checkAgentLimit(state.userId, "prescriptionSafety")

        const llm = await getModel("prescriptionSafety")

        const systemPrompt = `You are the Prescription Safety Agent inside CareFlow AI.

Your job is medication safety review — you do not diagnose.

Rules:
- Check the patient's current medications and any medications implied by the diagnosis's recommended tests/treatment path against the patient's known allergies.
- Detect drug-drug interactions among current medications.
- Detect contraindications given chronic diseases in the medical history.
- Detect duplicate medicines (same or overlapping active ingredient class).
- Where a risk is found, recommend a safer alternative class if possible.
- Never assume a medication is safe without checking allergies and chronic conditions.

Return ONLY valid JSON, no markdown, no commentary, matching exactly this shape:
{
  "reviewed_medications": [],
  "interaction_warnings": [{ "severity": "low|moderate|high", "issue": "", "recommendation": "" }],
  "allergy_conflicts": [],
  "duplicate_medications": [],
  "safe_to_proceed": true
}`

        const userPayload = JSON.stringify({
            current_medications: state.structured_case?.current_medications || state.current_medications || [],
            allergies: state.structured_case?.allergies || state.allergies || [],
            chronic_diseases: state.medical_history?.chronic_diseases || [],
            diagnosis: state.diagnosis
        })

        const response = await llm.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userPayload)
        ])

        const safetyReport = safeParseJson(response.content)

        await deductCredits(state.userId, "prescriptionSafety")

        const warnings = safetyReport?.interaction_warnings || []

        return {
            ...state,
            medications: safetyReport?.reviewed_medications || [],
            interaction_warnings: warnings,
            timeline: [{
                agent: AGENT_NAME,
                status: "completed",
                summary: warnings.length
                    ? `Found ${warnings.length} medication safety warning(s).`
                    : "No medication safety issues detected.",
                timestamp: new Date().toISOString()
            }]
        }
    } catch (error) {
        console.log("prescriptionSafetyAgent error", error)
        return {
            ...state,
            medications: [],
            interaction_warnings: [],
            timeline: [{
                agent: AGENT_NAME,
                status: "failed",
                summary: error?.data?.message || "Prescription safety check failed.",
                timestamp: new Date().toISOString()
            }]
        }
    }
}
