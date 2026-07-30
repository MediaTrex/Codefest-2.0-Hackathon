import dotenv from "dotenv"
dotenv.config()
import { ChatGroq } from "@langchain/groq"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"

const groq = new ChatGroq({
    model: "openai/gpt-oss-120b"
})

const gemini = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash"
})

export const getModel = async (agent) => {
    switch (agent) {
        case "intake":
            return groq;
        case "medicalRecord":
            return groq;
        case "diagnostic":
            return gemini;
        case "prescriptionSafety":
            return groq;
        case "insuranceBilling":
            return groq;
        case "followup":
            return groq;
        case "explainability":
            return gemini;

        default:
            return groq;
    }
}
