import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai"
import dotenv from "dotenv"
dotenv.config()

const googleKey = process.env.GOOGLE_API_KEY?.trim()
const hasGoogle = Boolean(googleKey) && !/^add your/i.test(googleKey)

let _embeddings = null

export function getEmbeddings() {
  if (!hasGoogle) {
    throw new Error(
      "GOOGLE_API_KEY is missing. Set it in backend/services/agent/.env for vector search."
    )
  }
  if (!_embeddings) {
    _embeddings = new GoogleGenerativeAIEmbeddings({
      model: "gemini-embedding-001",
      apiKey: googleKey,
    })
  }
  return _embeddings
}

/** @deprecated use getEmbeddings() — kept so older imports don't crash at boot */
export const embeddings = {
  embedQuery: (...args) => getEmbeddings().embedQuery(...args),
  embedDocuments: (...args) => getEmbeddings().embedDocuments(...args),
}
