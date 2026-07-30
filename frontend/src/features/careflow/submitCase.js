import api from "../../../utils/axios"

export const submitCase = async (payload) => {
  const { data } = await api.post("/api/agent/careflow/case", payload)
  return data
}

export const fetchCase = async (caseId) => {
  const { data } = await api.get(`/api/agent/careflow/case/${caseId}`)
  return data
}

export const fetchCases = async () => {
  const { data } = await api.get("/api/agent/careflow/cases")
  return data?.cases || []
}

export const patchCase = async (caseId, patch) => {
  const { data } = await api.patch(`/api/agent/careflow/case/${caseId}`, patch)
  return data
}

export const voiceIntake = async (transcript, caseId) => {
  const path = caseId
    ? `/api/agent/careflow/case/${caseId}/voice-intake`
    : "/api/agent/careflow/voice-intake"
  const { data } = await api.post(path, { transcript })
  return data
}

export const uploadCaseFile = async (caseId, file, type = "diagnosis") => {
  const form = new FormData()
  form.append("file", file)
  form.append("type", type)
  const { data } = await api.post(
    `/api/agent/careflow/case/${caseId}/upload`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  )
  return data
}

export const fetchStaff = async () => {
  const { data } = await api.get("/api/agent/careflow/staff")
  return data?.staff || []
}

export const analyzePreview = async (description) => {
  const { data } = await api.post("/api/agent/careflow/case/analyze-preview", {
    description,
  })
  return data
}

export const matchPatients = async ({ name, photoId }) => {
  const { data } = await api.post("/api/agent/careflow/patients/match", {
    name,
    photoId,
  })
  return data?.candidates || []
}
