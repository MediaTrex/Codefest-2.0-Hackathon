import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { getModel } from "../../config/llmModels.js"
import { checkAgentLimit } from "../../config/agentLimit.js"
import { deductCredits } from "../../utils/deductCredits.js"
import { safeParseJson } from "../../utils/parseJson.js"

const AGENT_NAME = "Intake Agent"

export const intakeAgent = async (state) => {
    try {
        await checkAgentLimit(state.userId, "intake")

        const llm = await getModel("intake")

        const systemPrompt = `You are the Intake Agent inside CareFlow AI, a multi-agent healthcare assistant.

Your ONLY job is to convert raw patient input into a clean, structured patient case.

Rules:
- Do not diagnose, do not suggest treatment.
- Validate that demographics, symptoms, allergies and medical history are present.
- If something is missing, list it in "missing_fields" instead of guessing values.
- Normalize symptoms and allergies into arrays of short strings.

Return ONLY valid JSON, no markdown, no commentary, matching exactly this shape:
{
  "demographics": { "name": "", "age": "", "gender": "", "contact": "" },
  "symptoms": [],
  "allergies": [],
  "medical_history_input": "",
  "current_medications": [],
  "missing_fields": [],
  "validated": true
}`

        const userPayload = JSON.stringify({
            patient_information: state.patient_information || {},
            symptoms: state.symptoms || [],
            allergies: state.allergies || [],
            medical_history_input: state.medical_history_input || "",
            current_medications: state.current_medications || []
        })

        const response = await llm.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userPayload)
        ])

        const structured_case = safeParseJson(response.content)

        await deductCredits(state.userId, "intake")

        const missing = structured_case?.missing_fields || []

        return {
            ...state,
            structured_case,
            timeline: [{
                agent: AGENT_NAME,
                status: "completed",
                summary: missing.length
                    ? `Structured case created. Missing fields: ${missing.join(", ")}.`
                    : "Patient case structured and validated successfully.",
                timestamp: new Date().toISOString()
            }]
        }
    } catch (error) {
        console.log("intakeAgent error", error)
        return {
            ...state,
            structured_case: { validated: false, error: true },
            timeline: [{
                agent: AGENT_NAME,
                status: "failed",
                summary: error?.data?.message || "Intake processing failed.",
                timestamp: new Date().toISOString()
            }]
        }
    }
}
