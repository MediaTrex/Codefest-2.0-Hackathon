import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { getModel } from "../../config/llmModels.js"
import { checkAgentLimit } from "../../config/agentLimit.js"
import { deductCredits } from "../../utils/deductCredits.js"
import { safeParseJson } from "../../utils/parseJson.js"
import { getPatientHistory } from "../../config/careflowMemory.js"

const AGENT_NAME = "Medical Record Agent"

export const medicalRecordAgent = async (state) => {
    try {
        await checkAgentLimit(state.userId, "medicalRecord")

        // Stand-in for an EHR lookup: retrieves this patient's previous
        // CareFlow cases from Redis (previous medications, allergies,
        // chronic conditions, lab-report mentions).
        const previousRecords = await getPatientHistory(state.userId)

        const llm = await getModel("medicalRecord")

        const systemPrompt = `You are the Medical Record Agent inside CareFlow AI.

Your job is to retrieve and summarize the patient's medical history.

Rules:
- Do not diagnose.
- Combine the freeform medical history input with any previous case records provided.
- Extract chronic diseases, previous medications, allergies, and previous lab reports if mentioned.
- If no previous records exist, say so plainly instead of inventing history.

Return ONLY valid JSON, no markdown, no commentary, matching exactly this shape:
{
  "summary": "",
  "chronic_diseases": [],
  "previous_medications": [],
  "known_allergies": [],
  "previous_lab_reports": [],
  "has_previous_records": true
}`

        const userPayload = JSON.stringify({
            structured_case: state.structured_case,
            previous_records: previousRecords
        })

        const response = await llm.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userPayload)
        ])

        const medical_history = safeParseJson(response.content)

        await deductCredits(state.userId, "medicalRecord")

        return {
            ...state,
            medical_history,
            timeline: [{
                agent: AGENT_NAME,
                status: "completed",
                summary: previousRecords.length
                    ? `Reviewed ${previousRecords.length} previous case record(s) and summarized history.`
                    : "No previous records found. Summarized history from current intake only.",
                timestamp: new Date().toISOString()
            }]
        }
    } catch (error) {
        console.log("medicalRecordAgent error", error)
        return {
            ...state,
            medical_history: { summary: "Unable to retrieve medical history.", error: true },
            timeline: [{
                agent: AGENT_NAME,
                status: "failed",
                summary: error?.data?.message || "Medical history retrieval failed.",
                timestamp: new Date().toISOString()
            }]
        }
    }
}
