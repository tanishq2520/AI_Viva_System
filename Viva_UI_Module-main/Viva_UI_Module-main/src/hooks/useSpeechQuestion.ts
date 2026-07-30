// src/hooks/useSpeechQuestion.ts
// Wraps browser Web Speech API (speechSynthesis) to speak viva questions aloud.
// Falls back silently if the API is not available.

import { useState, useCallback, useEffect } from "react"

export function useSpeechQuestion() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const supported = typeof window !== "undefined" && "speechSynthesis" in window

  // Cancel any ongoing speech on unmount
  useEffect(() => {
    return () => {
      if (supported) {
        window.speechSynthesis.cancel()
      }
    }
  }, [supported])

  /**
   * Speak the given text aloud using the browser TTS engine.
   * If speaking is already in progress, it is cancelled first.
   */
  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return

      // Cancel any current speech first
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "en-US"
      utterance.rate = 0.92   // slightly slower than default for clarity
      utterance.pitch = 1.0
      utterance.volume = 1.0

      // Try to pick a good English voice if available
      const voices = window.speechSynthesis.getVoices()
      const preferred = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Google") || v.name.includes("Microsoft") || v.name.includes("Neural"))
      )
      if (preferred) utterance.voice = preferred

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      window.speechSynthesis.speak(utterance)
    },
    [supported]
  )

  const cancel = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [supported])

  return { speak, cancel, isSpeaking, supported }
}
