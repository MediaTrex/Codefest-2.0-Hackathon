import { Annotation } from "@langchain/langgraph";

// Shared state passed between all 7 CareFlow AI agents.
export const careflowState = Annotation.Root({
    userId: Annotation(),
    caseId: Annotation(),

    // Raw patient input (from Intake request)
    patient_information: Annotation(),
    symptoms: Annotation(),
    allergies: Annotation(),
    medical_history_input: Annotation(),
    current_medications: Annotation(),
    insurance_provider: Annotation(),
    policy_number: Annotation(),

    // 1. Intake Agent output
    structured_case: Annotation(),

    // 2. Medical Record Agent output
    medical_history: Annotation(),

    // 3. Triage / Diagnostic Agent output
    diagnosis: Annotation(),
    confidence_score: Annotation(),

    // 4. Prescription Safety Agent output
    medications: Annotation(),
    interaction_warnings: Annotation(),

    // 5. Insurance & Billing Agent output
    insurance_summary: Annotation(),

    // 6. Follow-Up Care Agent output
    followup_plan: Annotation(),

    // 7. Explainability Agent output (final compiler + reasoning trace)
    conflicts: Annotation(),
    reasoning_trace: Annotation(),
    doctor_notes: Annotation(),
    patient_summary: Annotation(),
    final_report: Annotation(),

    // Execution trace shown on the frontend agent timeline
    timeline: Annotation({
        reducer: (current = [], update = []) => current.concat(update),
        default: () => []
    })
})
