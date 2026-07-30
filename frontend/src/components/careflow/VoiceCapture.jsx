import { useState, useRef } from 'react'
import { Mic } from 'lucide-react'

/**
 * Voice capture with pulsing ring + live captions.
 * Interim words show in the caption strip; only final phrases commit via onTranscript.
 */
export default function VoiceCapture({ onTranscript }) {
  const [listening, setListening] = useState(false)
  const [liveCaption, setLiveCaption] = useState('')
  const recognitionRef = useRef(null)
  const committedRef = useRef('')

  function start() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      alert('Voice input not supported in this browser — try Chrome.')
      return
    }
    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    committedRef.current = ''

    recognition.onresult = (e) => {
      let interim = ''
      let finalChunk = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalChunk += t + ' '
        else interim += t
      }
      const caption = (committedRef.current + ' ' + finalChunk + interim).trim()
      setLiveCaption(caption)

      if (finalChunk.trim()) {
        committedRef.current = (committedRef.current + ' ' + finalChunk).trim()
        onTranscript(committedRef.current)
      }
    }
    recognition.onend = () => {
      setListening(false)
      setLiveCaption('')
    }
    recognition.onerror = () => {
      setListening(false)
      setLiveCaption('')
    }
    recognition.start()
    recognitionRef.current = recognition
    setListening(true)
    setLiveCaption('')
  }

  function stop() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={listening ? stop : start}
        className={`relative inline-flex items-center gap-2 text-[13px] px-3.5 py-2 rounded-full font-medium border cursor-pointer transition-colors overflow-visible ${
          listening
            ? 'bg-[var(--cf-danger-soft)] text-[var(--cf-danger-ink)] border-[var(--cf-danger-border)]'
            : 'bg-[var(--cf-brand)] text-white border-[var(--cf-brand)]'
        }`}
      >
        {listening && (
          <span className="absolute inset-0 rounded-full bg-[var(--cf-danger)] opacity-40 animate-ping pointer-events-none" />
        )}
        <Mic size={16} className={`relative z-10 ${listening ? 'text-[var(--cf-danger)]' : ''}`} />
        <span className="relative z-10">{listening ? 'Listening…' : 'Speak the case'}</span>
      </button>
      {listening && (
        <p className="text-[13px] text-[var(--cf-ink-faint)] italic max-w-[280px] text-right">
          {liveCaption || 'Listening…'}
        </p>
      )}
    </div>
  )
}
