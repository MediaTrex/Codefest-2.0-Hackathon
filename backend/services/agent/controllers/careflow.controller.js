import crypto from "crypto"
import { careflowGraph } from "../graph/careflow.graph.js"
import { getCaseState, saveCaseState, savePatientHistory, addCaseToIndex, getCaseIndex } from "../config/careflowMemory.js"

const shapeResponse = (caseId, result) => ({
    caseId,
    timeline: result?.timeline,
    structured_case: result?.structured_case,
    medical_history: result?.medical_history,
    diagnosis: result?.diagnosis,
    confidence_score: result?.confidence_score,
    medications: result?.medications,
    interaction_warnings: result?.interaction_warnings,
    insurance_summary: result?.insurance_summary,
    followup_plan: result?.followup_plan,
    conflicts: result?.conflicts,
    reasoning_trace: result?.reasoning_trace,
    doctor_notes: result?.doctor_notes,
    patient_summary: result?.patient_summary,
    final_report: result?.final_report
})

// Creates a new patient case and runs it through the full 7-agent
// CareFlow AI pipeline (Intake -> Medical Record -> Triage & Diagnostic
// -> Prescription Safety -> Insurance & Billing -> Follow-Up -> Explainability).
export const createCase = async (req, res, next) => {
    try {
        const userId = req.headers["x-user-id"] || "demo-user"
        const {
            patient_information,
            symptoms,
            allergies,
            medical_history_input,
            current_medications,
            insurance_provider,
            policy_number
        } = req.body

        const caseId = crypto.randomUUID()

        const result = await careflowGraph.invoke({
            userId,
            caseId,
            patient_information,
            symptoms,
            allergies,
            medical_history_input,
            current_medications,
            insurance_provider,
            policy_number
        })

        await saveCaseState(caseId, result)

        // Feed this case into the patient's rolling history so the
        // Medical Record Agent has real context on their next visit.
        await savePatientHistory(userId, {
            caseId,
            symptoms: result?.structured_case?.symptoms,
            diagnosis: result?.diagnosis?.possible_diagnoses,
            chronic_diseases: result?.medical_history?.chronic_diseases,
            medications: result?.medications
        })

        // Index this case for the Doctor Dashboard's case list.
        await addCaseToIndex({
            caseId,
            patientName: patient_information?.name || "Unknown patient",
            urgency: result?.final_report?.overall_urgency || result?.diagnosis?.urgency || "routine",
            requires_human_review: result?.final_report?.requires_human_review ?? true,
            topDiagnosis: result?.diagnosis?.possible_diagnoses?.[0]?.condition || "N/A",
            confidence_score: result?.confidence_score,
            createdAt: new Date().toISOString()
        })

        return res.status(200).json(shapeResponse(caseId, result))
    } catch (error) {
        next(error)
    }
}

// Retrieves a previously generated case (e.g. reload after refresh, or
// opening a case from the Doctor Dashboard).
export const getCase = async (req, res, next) => {
    try {
        const { caseId } = req.params
        const state = await getCaseState(caseId)

        if (!state) {
            return res.status(404).json({ message: "Case not found or expired." })
        }

        return res.status(200).json(shapeResponse(caseId, state))
    } catch (error) {
        next(error)
    }
}

// Lists recent cases across all patients for the Doctor Dashboard.
export const listCases = async (req, res, next) => {
    try {
        const cases = await getCaseIndex()
        return res.status(200).json({ cases })
    } catch (error) {
        next(error)
    }
}
