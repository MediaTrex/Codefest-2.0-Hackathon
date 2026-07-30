// Safely parses JSON returned by an LLM, stripping markdown fences if present.
export const safeParseJson = (raw) => {
    if (!raw) return null

    if (typeof raw !== "string") return raw

    const cleaned = raw
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim()

    try {
        return JSON.parse(cleaned)
    } catch (error) {
        return {
            raw_output: cleaned,
            parse_error: true
        }
    }
}
