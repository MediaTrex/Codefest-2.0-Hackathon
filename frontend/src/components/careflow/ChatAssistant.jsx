import { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Stethoscope } from 'lucide-react'
import { isToday } from '../../utils/status'

const SUGGESTIONS = [
  'How many emergencies right now?',
  'Which cases need review?',
  'Where is the pipeline backed up?',
]

/**
 * Floating "Ask CarePilot" assistant.
 *
 * This ships with a small local answer engine that inspects the `cases`
 * prop directly — no network call, no hallucination risk, works offline.
 * It's deliberately narrow: it answers questions the data can actually
 * support, and says so when it can't.
 *
 * To upgrade to a real LLM-backed assistant: replace `answerLocally()`
 * with a call to your own backend (which in turn calls the Anthropic API
 * with the case data + a system prompt describing what the assistant is
 * allowed to say). Do NOT call the Anthropic API directly from the
 * browser — that requires exposing an API key client-side.
 */
export default function ChatAssistant({ cases = [], stageGroups = {}, onSelectCase }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "I can answer questions about today's case load. Try one of the prompts below." },
  ])
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  function send(text) {
    const question = (text ?? input).trim()
    if (!question) return
    const answer = answerLocally(question, cases, stageGroups)
    setMessages((m) => [...m, { role: 'user', text: question }, { role: 'assistant', text: answer }])
    setInput('')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[var(--cf-brand)] text-white pl-4 pr-5 py-3 shadow-none border border-[var(--cf-brand)]"
        aria-label="Open CarePilot assistant"
      >
        <MessageSquare size={16} />
        <span className="text-[13px] font-medium">Ask CarePilot</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            aria-label="Close assistant"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[var(--cf-ink)]/20"
          />
          <div className="relative w-full max-w-sm h-full bg-[var(--cf-surface)] border-l border-[var(--cf-border)] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--cf-border)]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[var(--cf-brand-soft)] grid place-items-center">
                  <Stethoscope size={14} className="text-[var(--cf-brand)]" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--cf-ink)]">CarePilot Assistant</p>
                  <p className="text-[11.5px] text-[var(--cf-ink-faint)]">Reads live case data only</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-[var(--cf-ink-faint)] hover:text-[var(--cf-ink)]">
                <X size={18} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] text-[13px] leading-relaxed rounded-lg px-3 py-2 ${
                    m.role === 'user'
                      ? 'ml-auto bg-[var(--cf-brand-soft)] text-[var(--cf-ink)]'
                      : 'bg-[var(--cf-surface-sunken)] text-[var(--cf-ink)]'
                  }`}
                >
                  {m.text}
                </div>
              ))}
            </div>

            <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-[var(--cf-border)]">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-[11.5px] px-2.5 py-1 rounded-full border border-[var(--cf-border)] text-[var(--cf-ink-soft)] hover:bg-[var(--cf-surface-sunken)]"
                >
                  {s}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                send()
              }}
              className="px-3 py-3 border-t border-[var(--cf-border)] flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about today's cases..."
                className="flex-1 text-[13px] rounded-lg border border-[var(--cf-border)] px-3 py-2 outline-none focus:border-[var(--cf-brand)]"
              />
              <button
                type="submit"
                aria-label="Send"
                className="w-9 h-9 rounded-lg bg-[var(--cf-brand)] text-white grid place-items-center shrink-0"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function answerLocally(question, cases, stageGroups) {
  const q = question.toLowerCase()

  if (q.includes('emergenc')) {
    const emergencies = cases.filter((c) => c.urgency === 'emergency')
    if (emergencies.length === 0) return 'No active emergencies right now.'
    return `${emergencies.length} active emergency case${emergencies.length > 1 ? 's' : ''}: ${emergencies
      .map((c) => c.patientName)
      .join(', ')}.`
  }

  if (q.includes('review')) {
    const review = cases.filter((c) => c.requires_human_review)
    if (review.length === 0) return 'Nothing is currently flagged for human review.'
    return `${review.length} case${review.length > 1 ? 's' : ''} flagged for review: ${review
      .map((c) => c.patientName)
      .join(', ')}.`
  }

  if (q.includes('backed up') || q.includes('bottleneck') || q.includes('stuck')) {
    const entries = Object.entries(stageGroups).sort((a, b) => b[1].length - a[1].length)
    const [topStage, topCases] = entries[0] || []
    if (!topStage || topCases.length === 0) return 'No stage currently has a backlog.'
    const label = topStage.charAt(0).toUpperCase() + topStage.slice(1)
    return `${label} has the most cases waiting right now: ${topCases.length}.`
  }

  if (q.includes('today')) {
    const today = cases.filter((c) => isToday(c.createdAt))
    return `${today.length} case${today.length === 1 ? '' : 's'} logged today.`
  }

  return "I can only answer from live case data right now — try asking about emergencies, review status, today's count, or where the pipeline is backed up."
}
