import Groq from "groq-sdk"
import { GoogleGenerativeAI } from "@google/generative-ai"
import dotenv from "dotenv"
dotenv.config()

const groqKey = process.env.GROQ_API_KEY?.trim()
const googleKey = process.env.GOOGLE_API_KEY?.trim()

const hasGroq = Boolean(groqKey) && !/^add your/i.test(groqKey)
const hasGoogle = Boolean(googleKey) && !/^add your/i.test(googleKey)

const groq = hasGroq ? new Groq({ apiKey: groqKey }) : null
const google = hasGoogle ? new GoogleGenerativeAI(googleKey) : null

const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL || "llama-3.3-70b-versatile"
const GROQ_VISION_MODEL =
  process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct"
const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-flash-latest"
const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL || "gemini-flash-latest"

/**
 * Prefer Google Gemini when GOOGLE_API_KEY is set; else Groq.
 * Keys stay server-side only.
 */

async function viaGemini({ prompt, system, maxTokens = 1000, image }) {
  const model = google.getGenerativeModel({
    model: image ? GEMINI_VISION_MODEL : GEMINI_TEXT_MODEL,
    systemInstruction: system || "You are a careful clinical assistant.",
  })

  const parts = []
  if (image?.base64) {
    parts.push({
      inlineData: {
        data: image.base64,
        mimeType: image.mimeType || "image/jpeg",
      },
    })
  }
  parts.push({ text: prompt })

  const res = await model.generateContent({
    contents: [{ role: "user", parts }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
  })
  return res.response?.text?.() ?? ""
}

async function viaGroqText({ prompt, system, maxTokens = 1000 }) {
  const res = await groq.chat.completions.create({
    model: GROQ_TEXT_MODEL,
    max_tokens: maxTokens,
    temperature: 0.2,
    messages: [
      { role: "system", content: system || "You are a careful clinical assistant." },
      { role: "user", content: prompt },
    ],
  })
  return res.choices?.[0]?.message?.content ?? ""
}

async function viaGroqVision({ prompt, system, maxTokens = 1200, mediaBase64, mediaType }) {
  const res = await groq.chat.completions.create({
    model: GROQ_VISION_MODEL,
    max_tokens: maxTokens,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `${system || ""}\nReturn ONLY valid JSON when asked for JSON. No markdown fences.`,
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: `data:${mediaType};base64,${mediaBase64}` },
          },
        ],
      },
    ],
  })
  return res.choices?.[0]?.message?.content ?? ""
}

export async function generateNarrative({ prompt, system, maxTokens = 1000 }) {
  try {
    if (google) {
      const text = await viaGemini({ prompt, system, maxTokens })
      return { text, demo: false }
    }
    if (groq) {
      const text = await viaGroqText({ prompt, system, maxTokens })
      return { text, demo: false }
    }
  } catch (err) {
    console.log("generateNarrative error", err.message)
  }

  const snippet = String(prompt || "").trim().slice(0, 160)
  return {
    text: snippet
      ? `Draft clinical note based on intake text: ${snippet}${prompt.length > 160 ? "…" : ""}`
      : "Draft clinical note pending additional detail.",
    demo: true,
  }
}

export async function generateJson({ prompt, system, maxTokens = 1000 }) {
  const { text, demo } = await generateNarrative({
    prompt,
    system: `${system || ""}\n\nReturn ONLY valid JSON. No markdown fences.`,
    maxTokens,
  })
  if (demo) {
    return { data: null, narrative: text, demo: true, parseError: false }
  }
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim()
    const data = JSON.parse(cleaned)
    return { data, narrative: text, demo: false, parseError: false }
  } catch {
    return { data: null, narrative: text, demo: false, parseError: true }
  }
}

function demoDocumentPayload({ fileName = "document", mediaType, typeHint }) {
  const cleanName = String(fileName)
    .replace(/\u00a0/g, " ")
    .replace(/â€¯/g, " ")
    .trim()

  if (typeHint === "prescription") {
    return {
      items: [
        { drug: "Amoxicillin", dose: "500 mg", frequency: "TID × 5 days" },
        { drug: "Ibuprofen", dose: "400 mg", frequency: "PRN pain" },
      ],
      narrative: `Prescription image “${cleanName}” filed for review.`,
      confidence: 48,
    }
  }

  return {
    narrative: `“${cleanName}” was uploaded (${mediaType || "image"}). Automated analysis unavailable — review the original file.`,
    confidence: 52,
    extractedFields: {
      fileName: cleanName,
      mediaType: mediaType || null,
      status: "filed_pending_review",
    },
  }
}

export async function analyzeDocument({
  prompt,
  system,
  mediaBase64,
  mediaType = "image/jpeg",
  isPdf = false,
  fileName = "document",
  typeHint = "diagnosis",
}) {
  try {
    if (isPdf || mediaType === "application/pdf") {
      const { text, demo } = await generateNarrative({
        prompt: `A clinician uploaded a PDF named "${fileName}". Without reliable PDF pixel access, produce the requested JSON from filename/context only, keep confidence ≤40, and say staff must open the PDF.\n\nInstruction:\n${prompt}`,
        system,
        maxTokens: 800,
      })
      return { text, demo }
    }

    if (google) {
      const text = await viaGemini({
        prompt,
        system: `${system || ""}\nReturn ONLY valid JSON when asked for JSON. No markdown fences.`,
        maxTokens: 1200,
        image: { base64: mediaBase64, mimeType: mediaType },
      })
      return { text, demo: false }
    }

    if (groq) {
      const text = await viaGroqVision({
        prompt,
        system,
        mediaBase64,
        mediaType,
      })
      return { text, demo: false }
    }
  } catch (err) {
    console.log("analyzeDocument error", err.message)
  }

  return {
    text: JSON.stringify(demoDocumentPayload({ fileName, mediaType, typeHint })),
    demo: true,
  }
}

export function aiProviderStatus() {
  return {
    google: hasGoogle,
    groq: hasGroq,
    active: hasGoogle ? "google" : hasGroq ? "groq" : "demo",
  }
}
