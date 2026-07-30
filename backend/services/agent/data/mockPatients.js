import crypto from "crypto"
import { saveCaseState, addCaseToIndex, getCaseIndex } from "../config/careflowMemory.js"

/**
 * Demo patients — photos are static placeholders under frontend /patients/*.svg
 * (door camera / patient-app upload will replace photoUrl at intake).
 */
const MOCK_PATIENTS = [
  {
    patientName: "Hanisha",
    age: 29,
    gender: "female",
    urgency: "urgent",
    description:
      "Severe unilateral headache for 8 hours with nausea and photophobia. History of occasional migraines; this episode more intense than usual. No fever or focal neuro deficits at intake.",
    topDiagnosis: "Migraine — eval",
    photoUrl: "/patients/p7.svg",
    photoSource: "patient_app",
    assignedDoctor: { id: "dr-anubappal", name: "Dr. Anubappal" },
    aiNarrative:
      "29-year-old woman with severe unilateral headache, nausea, and photophobia for about 8 hours. Prior migraines noted; this episode is more intense. Completeness is good for urgent triage.",
    aiConfidence: 86,
    hoursAgo: 0.02,
    stage: "Triage & Diagnostic Agent",
  },
  {
    patientName: "Jaya Rao",
    age: 34,
    gender: "female",
    urgency: "urgent",
    description: "Fever and sore throat for 2 days. Suspected viral infection.",
    topDiagnosis: "Viral pharyngitis",
    photoUrl: "/patients/p1.svg",
    photoSource: "patient_app",
    assignedDoctor: { id: "dr-mehta", name: "Dr. Ananya Mehta" },
    aiNarrative:
      "34-year-old presenting with fever and sore throat for two days. Intake notes suggest a suspected viral infection; completeness is adequate for triage.",
    aiConfidence: 82,
    hoursAgo: 0.05,
    stage: "Triage & Diagnostic Agent",
  },
  {
    patientName: "Meera Iyer",
    age: 58,
    gender: "female",
    urgency: "emergency",
    description: "Chest pain radiating to left arm. ECG pending at door intake.",
    topDiagnosis: "ACS rule-out",
    photoUrl: "/patients/p2.svg",
    photoSource: "door_camera",
    assignedDoctor: { id: "dr-rao", name: "Dr. Vikram Rao" },
    aiNarrative:
      "58-year-old with chest pain radiating to the left arm. Door-camera photo captured; flagged emergency pending ECG and clinician review.",
    aiConfidence: 71,
    hoursAgo: 0.25,
    stage: "Intake Agent",
  },
  {
    patientName: "Arjun Singh",
    age: 27,
    gender: "male",
    urgency: "routine",
    description: "Follow-up visit for ongoing asthma management. Stable, refill request.",
    topDiagnosis: "Asthma follow-up",
    photoUrl: "/patients/p3.svg",
    photoSource: "patient_app",
    assignedDoctor: { id: "dr-chen", name: "Dr. Lisa Chen" },
    aiNarrative:
      "27-year-old routine follow-up for asthma. Patient-app photo on file; presentation appears stable with a medication refill request.",
    aiConfidence: 88,
    hoursAgo: 1.2,
    stage: "Follow-up Agent",
  },
  {
    patientName: "Priya Kapoor",
    age: 41,
    gender: "female",
    urgency: "urgent",
    description: "Abdominal pain and nausea since morning. No prior surgery.",
    topDiagnosis: "Abdominal pain — eval",
    photoUrl: "/patients/p4.svg",
    photoSource: "door_camera",
    assignedDoctor: null,
    aiNarrative:
      "41-year-old with abdominal pain and nausea since morning. Door intake photo captured; needs assignment and further workup.",
    aiConfidence: 64,
    hoursAgo: 2.5,
    stage: "Medical Record Agent",
    requires_human_review: true,
  },
  {
    patientName: "Leo Nguyen",
    age: 19,
    gender: "male",
    urgency: "routine",
    description: "Sports injury — twisted ankle during practice. Swelling noted.",
    topDiagnosis: "Ankle sprain",
    photoUrl: "/patients/p5.svg",
    photoSource: "upload",
    assignedDoctor: { id: "dr-anubappal", name: "Dr. Anubappal" },
    aiNarrative:
      "19-year-old with a twisted ankle and visible swelling after sports practice. Photo uploaded at desk; routine ortho triage path.",
    aiConfidence: 79,
    hoursAgo: 4,
    stage: "Prescription Safety Agent",
  },
  {
    patientName: "Ravi Verma",
    age: 66,
    gender: "male",
    urgency: "urgent",
    description: "Headache with photophobia. History of hypertension.",
    topDiagnosis: "Headache — HTN context",
    photoUrl: "/patients/p6.svg",
    photoSource: "patient_app",
    assignedDoctor: { id: "dr-mehta", name: "Dr. Ananya Mehta" },
    aiNarrative:
      "66-year-old with headache and photophobia on a background of hypertension. Patient-app photo available; urgency set to urgent pending neuro vitals.",
    aiConfidence: 75,
    hoursAgo: 5.5,
    stage: "Triage & Diagnostic Agent",
    requires_human_review: true,
  },
]

function mockTimeline(currentStage) {
  const agents = [
    "Intake Agent",
    "Medical Record Agent",
    "Triage & Diagnostic Agent",
    "Prescription Safety Agent",
    "Insurance & Billing Agent",
    "Follow-up Agent",
    "Explainability Agent",
  ]
  const idx = Math.max(0, agents.indexOf(currentStage))
  return agents.map((agent, i) => ({
    agent,
    status: i < idx ? "completed" : i === idx ? "in_progress" : "pending",
  }))
}

export async function seedMockPatientsIfEmpty() {
  const existing = await getCaseIndex()
  if (existing.length > 0) return { seeded: false, count: existing.length }
  return seedMockPatients()
}

export async function seedMockPatients() {
  const now = Date.now()
  for (const m of MOCK_PATIENTS) {
    const caseId = crypto.randomUUID()
    const createdAt = new Date(now - m.hoursAgo * 3600 * 1000).toISOString()
    const timeline = mockTimeline(m.stage)
    const state = {
      caseId,
      createdAt,
      patientName: m.patientName,
      patient_information: {
        name: m.patientName,
        age: m.age,
        gender: m.gender,
      },
      urgency: m.urgency,
      requires_human_review: m.requires_human_review ?? false,
      topDiagnosis: m.topDiagnosis,
      current_stage: m.stage,
      timeline,
      photoUrl: m.photoUrl,
      photoSource: m.photoSource,
      clinical: {
        assignedDoctor: m.assignedDoctor,
        description: m.description,
        labs: [],
        prescriptions: [],
        nextFollowUpDate: null,
        uploadedReports: [],
        autopsyEstimate: null,
        aiNarrative: m.aiNarrative,
        aiConfidence: m.aiConfidence,
      },
    }
    await saveCaseState(caseId, state)
    await addCaseToIndex({
      caseId,
      patientName: state.patientName,
      urgency: state.urgency,
      requires_human_review: state.requires_human_review,
      topDiagnosis: state.topDiagnosis,
      timeline,
      current_stage: state.current_stage,
      assignedDoctor: state.clinical.assignedDoctor,
      nextFollowUpDate: null,
      description: state.clinical.description,
      aiNarrative: state.clinical.aiNarrative,
      aiConfidence: state.clinical.aiConfidence,
      photoUrl: state.photoUrl,
      photoSource: state.photoSource,
      createdAt,
    })
  }

  return { seeded: true, count: MOCK_PATIENTS.length }
}

export { MOCK_PATIENTS }
