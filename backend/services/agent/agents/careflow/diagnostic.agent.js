import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { QdrantVectorStore } from "@langchain/qdrant"
import { getModel } from "../../config/llmModels.js"
import { embeddings } from "../../config/embeddings.js"
import { checkAgentLimit } from "../../config/agentLimit.js"
import { deductCredits } from "../../utils/deductCredits.js"
import { safeParseJson } from "../../utils/parseJson.js"

const AGENT_NAME = "Triage & Diagnostic Agent"
const MEDICAL_KNOWLEDGE_COLLECTION = "careflow-medical-knowledge"

// Best-effort RAG lookup against a Qdrant collection of medical knowledge.
// If the collection isn't seeded / Qdrant isn't reachable, we degrade
// gracefully to plain LLM reasoning instead of failing the whole case.
const getMedicalKnowledgeContext = async (query) => {
    try {
        const store = await QdrantVectorStore.fromExistingCollection(embeddings, {
            url: process.env.QDRANT_URL,
            collectionName: MEDICAL_KNOWLEDGE_COLLECTION
        })
        const docs = await store.similaritySearch(query, 4)
        return docs.map(d => d.pageContent).join("\n\n")
    } catch (error) {
        return ""
    }
}

export const diagnosticAgent = async (state) => {
    try {
        await checkAgentLimit(state.userId, "diagnostic")

        const symptoms = state.structured_case?.symptoms || []
        const knowledgeContext = await getMedicalKnowledgeContext(symptoms.join(", "))

        const llm = await getModel("diagnostic")

        const systemPrompt = `You are the Triage & Diagnostic Agent inside CareFlow AI, a clinical decision-support assistant.

You assist clinicians — you do not replace them. Never state a diagnosis as certain.

Rules:
- Analyze symptoms together with medical history.
${knowledgeContext ? "- Ground your reasoning in the provided medical knowledge context where relevant." : "- No external medical knowledge context was retrieved; rely on general clinical reasoning and be conservative."}
- List possible diagnoses ranked by likelihood, most likely first.
- Suggest relevant medical tests to confirm.
- Estimate urgency: "routine", "urgent", or "emergency".
- Give an overall confidence score between 0 and 1.
- Always include a disclaimer that this requires clinician review.

Return ONLY valid JSON, no markdown, no commentary, matching exactly this shape:
{
  "possible_diagnoses": [{ "condition": "", "likelihood": "high|medium|low", "reasoning": "" }],
  "recommended_tests": [],
  "urgency": "routine",
  "confidence_score": 0.0,
  "disclaimer": "This is an AI-assisted suggestion and requires review by a licensed clinician."
}`

        const userPayload = JSON.stringify({
            structured_case: state.structured_case,
            medical_history: state.medical_history,
            medical_knowledge_context: knowledgeContext || "none available"
        })

        const response = await llm.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userPayload)
        ])

        const diagnosis = safeParseJson(response.content)

        await deductCredits(state.userId, "diagnostic")

        return {
            ...state,
            diagnosis,
            confidence_score: diagnosis?.confidence_score ?? null,
            timeline: [{
                agent: AGENT_NAME,
                status: "completed",
                summary: diagnosis?.urgency
                    ? `Generated ${diagnosis?.possible_diagnoses?.length || 0} possible diagnosis/es. Urgency: ${diagnosis.urgency}.`
                    : "Diagnosis analysis completed.",
                timestamp: new Date().toISOString()
            }]
        }
    } catch (error) {
        console.log("diagnosticAgent error", error)
        return {
            ...state,
            diagnosis: { possible_diagnoses: [], error: true },
            confidence_score: 0,
            timeline: [{
                agent: AGENT_NAME,
                status: "failed",
                summary: error?.data?.message || "Diagnosis generation failed.",
                timestamp: new Date().toISOString()
            }]
        }
    }
}
