// src/hooks/useSpeechRecognition.ts
// Wraps the browser Web Speech Recognition API for live transcription.
// Provides continuous transcription while the user speaks.

import { useState, useRef, useCallback } from "react"

interface UseSpeechRecognitionReturn {
  transcript: string
  interimTranscript: string
  isListening: boolean
  supported: boolean
  start: () => void
  stop: () => void
  reset: () => void
}

// Browser compatibility shim
const SpeechRecognition =
  (typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
  null

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  const supported = SpeechRecognition !== null

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
    setInterimTranscript("")
  }, [])

  const start = useCallback(() => {
    if (!supported) return
    stop() // ensure clean slate

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: any) => {
      let finalText = ""
      let interimText = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interimText += result[0].transcript
        }
      }

      if (finalText) {
        setTranscript((prev) => (prev ? prev + " " + finalText.trim() : finalText.trim()))
      }
      setInterimTranscript(interimText)
    }

    recognition.onerror = (event: any) => {
      if (event.error !== "aborted") {
        console.warn("Speech recognition error:", event.error)
      }
      setIsListening(false)
      setInterimTranscript("")
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimTranscript("")
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [supported, stop])

  const reset = useCallback(() => {
    stop()
    setTranscript("")
    setInterimTranscript("")
  }, [stop])

  return {
    transcript,
    interimTranscript,
    isListening,
    supported,
    start,
    stop,
    reset,
  }
}
