// src/hooks/useTimer.ts
import { useState, useEffect, useRef, useCallback } from "react";

interface UseTimerOptions {
  initialSeconds?: number;
  autoStart?: boolean;
  countdown?: boolean;
  onComplete?: () => void;
}

export function useTimer({
  initialSeconds = 0,
  autoStart = false,
  countdown = false,
  onComplete,
}: UseTimerOptions = {}) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback(() => {
    stop();
    setSeconds(initialSeconds);
  }, [stop, initialSeconds]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (countdown) {
          if (prev <= 1) {
            stop();
            onComplete?.();
            return 0;
          }
          return prev - 1;
        }
        return prev + 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, countdown, stop, onComplete]);

  const formatted = `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(
    seconds % 60
  )
    .toString()
    .padStart(2, "0")}`;

  return { seconds, formatted, isRunning, start, pause, stop, reset };
}
