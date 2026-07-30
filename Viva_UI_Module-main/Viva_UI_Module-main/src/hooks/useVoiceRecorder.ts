// src/hooks/useVoiceRecorder.ts
import { useState, useCallback } from "react";

type RecordingState = "idle" | "recording" | "paused" | "stopped";

export function useVoiceRecorder() {
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);

  const startRecording = useCallback(() => {
    setState("recording");
    // In real implementation, this would start MediaRecorder
  }, []);

  const pauseRecording = useCallback(() => {
    setState("paused");
  }, []);

  const stopRecording = useCallback(() => {
    setState("stopped");
  }, []);

  const resetRecording = useCallback(() => {
    setState("idle");
    setDuration(0);
  }, []);

  return {
    state,
    duration,
    isRecording: state === "recording",
    isPaused: state === "paused",
    isStopped: state === "stopped",
    startRecording,
    pauseRecording,
    stopRecording,
    resetRecording,
  };
}
