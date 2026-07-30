import { StateGraph } from "@langchain/langgraph"
import { careflowState } from "./careflow.state.js"
import { intakeAgent } from "../agents/careflow/intake.agent.js"
import { medicalRecordAgent } from "../agents/careflow/medicalRecord.agent.js"
import { diagnosticAgent } from "../agents/careflow/diagnostic.agent.js"
import { prescriptionSafetyAgent } from "../agents/careflow/prescriptionSafety.agent.js"
import { insuranceBillingAgent } from "../agents/careflow/insuranceBilling.agent.js"
import { followupAgent } from "../agents/careflow/followup.agent.js"
import { explainabilityAgent } from "../agents/careflow/explainability.agent.js"

// Patient Input -> Intake -> Medical Record -> Triage & Diagnostic
//              -> Prescription Safety -> Insurance & Billing
//              -> Follow-Up -> Explainability -> Final
const workflow = new StateGraph(careflowState)

workflow.addNode("intake", intakeAgent)
workflow.addNode("medicalRecord", medicalRecordAgent)
workflow.addNode("diagnostic", diagnosticAgent)
workflow.addNode("prescriptionSafety", prescriptionSafetyAgent)
workflow.addNode("insuranceBilling", insuranceBillingAgent)
workflow.addNode("followup", followupAgent)
workflow.addNode("explainability", explainabilityAgent)

workflow.addEdge("__start__", "intake")
workflow.addEdge("intake", "medicalRecord")
workflow.addEdge("medicalRecord", "diagnostic")
workflow.addEdge("diagnostic", "prescriptionSafety")
workflow.addEdge("prescriptionSafety", "insuranceBilling")
workflow.addEdge("insuranceBilling", "followup")
workflow.addEdge("followup", "explainability")
workflow.addEdge("explainability", "__end__")

export const careflowGraph = workflow.compile()
