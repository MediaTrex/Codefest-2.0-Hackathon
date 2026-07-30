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
