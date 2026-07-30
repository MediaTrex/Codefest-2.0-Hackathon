import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { getModel } from "../../config/llmModels.js"
import { checkAgentLimit } from "../../config/agentLimit.js"
import { deductCredits } from "../../utils/deductCredits.js"
import { safeParseJson } from "../../utils/parseJson.js"

const AGENT_NAME = "Insurance & Billing Agent"

// Note: there is no live payer/clearinghouse integration here. This agent
// reasons over the insurance details the patient provided plus the
// recommended tests/treatment path to estimate coverage and claim
// readiness — a placeholder for a real FHIR/payer API integration.
export const insuranceBillingAgent = async (state) => {
    try {
        await checkAgentLimit(state.userId, "insuranceBilling")

        const llm = await getModel("insuranceBilling")

        const systemPrompt = `You are the Insurance & Billing Agent inside CareFlow AI.

Your job is administrative, not clinical: estimate insurance coverage readiness for the recommended tests/care path.

Rules:
- Do not diagnose or change any clinical recommendation.
- If no insurance provider/policy number was given, state that coverage could not be verified and mark claim_readiness as "unverified".
- List which recommended tests/procedures are typically covered vs typically require pre-authorization (general knowledge, not a real-time payer lookup — say so).
- List documents the patient/front-desk should prepare for a claim.
- Never guarantee coverage; always frame amounts/coverage as estimates.

Return ONLY valid JSON, no markdown, no commentary, matching exactly this shape:
{
  "provider": "",
  "policy_number": "",
  "coverage_status": "verified|unverified|partial",
  "likely_covered": [],
  "likely_requires_preauth": [],
  "required_documents": [],
  "claim_readiness": "ready|needs_preauth|unverified",
  "notes": ""
}`

        const userPayload = JSON.stringify({
            insurance_provider: state.insurance_provider || "not provided",
            policy_number: state.policy_number || "not provided",
            recommended_tests: state.diagnosis?.recommended_tests || [],
            urgency: state.diagnosis?.urgency
        })

        const response = await llm.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userPayload)
        ])

        const insurance_summary = safeParseJson(response.content)

        await deductCredits(state.userId, "insuranceBilling")

        return {
            ...state,
            insurance_summary,
            timeline: [{
                agent: AGENT_NAME,
                status: "completed",
                summary: insurance_summary?.coverage_status === "unverified"
                    ? "Insurance details not provided — coverage could not be verified."
                    : `Coverage estimated: ${insurance_summary?.claim_readiness || "reviewed"}.`,
                timestamp: new Date().toISOString()
            }]
        }
    } catch (error) {
        console.log("insuranceBillingAgent error", error)
        return {
            ...state,
            insurance_summary: { coverage_status: "unverified", claim_readiness: "unverified", error: true },
            timeline: [{
                agent: AGENT_NAME,
                status: "failed",
                summary: error?.data?.message || "Insurance & billing check failed.",
                timestamp: new Date().toISOString()
            }]
        }
    }
}
