import dotenv from "dotenv"
dotenv.config()
import { ChatGroq } from "@langchain/groq"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"

const groqKey = process.env.GROQ_API_KEY?.trim()
const googleKey = process.env.GOOGLE_API_KEY?.trim()
const hasGroq = Boolean(groqKey) && !/^add your/i.test(groqKey)
const hasGoogle = Boolean(googleKey) && !/^add your/i.test(googleKey)

let groq = null
let gemini = null

function getGroq() {
  if (!hasGroq) {
    throw new Error(
      "GROQ_API_KEY is missing. Set it in backend/services/agent/.env (starts with gsk_)."
    )
  }
  if (!groq) {
    groq = new ChatGroq({
      model: "llama-3.3-70b-versatile",
      apiKey: groqKey,
    })
  }
  return groq
}

function getGemini() {
  if (!hasGoogle) {
    // Fall back to Groq when Google key isn't configured
    return getGroq()
  }
  if (!gemini) {
    gemini = new ChatGoogleGenerativeAI({
      model: "gemini-flash-latest",
      apiKey: googleKey,
    })
  }
  return gemini
}

export const getModel = async (agent) => {
  switch (agent) {
    case "intake":
      return getGroq()
    case "medicalRecord":
      return getGroq()
    case "diagnostic":
      return getGemini()
    case "prescriptionSafety":
      return getGroq()
    case "insuranceBilling":
      return getGroq()
    case "followup":
      return getGroq()
    case "explainability":
      return getGemini()
    default:
      return getGroq()
  }
}
