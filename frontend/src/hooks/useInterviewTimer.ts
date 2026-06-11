import { useEffect, useMemo, useState } from "react";

export function useInterviewTimer(minutes: number, onTimeUp?: () => void) {
  const [remaining, setRemaining] = useState(Math.max(1, minutes) * 60);

  useEffect(() => {
    const id = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (remaining === 0) onTimeUp?.();
  }, [remaining, onTimeUp]);

  const label = useMemo(() => {
    const mins = Math.floor(remaining / 60).toString().padStart(2, "0");
    const secs = (remaining % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }, [remaining]);

  return { remaining, label, warning: remaining <= 300 };
}