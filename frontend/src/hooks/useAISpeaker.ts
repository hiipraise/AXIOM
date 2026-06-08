import { useCallback, useEffect, useState } from "react";

function selectBestVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  return (
    voices.find((voice) => voice.name === "Google UK English Female") ||
    voices.find((voice) => voice.name === "Google US English") ||
    voices.find((voice) => voice.lang?.startsWith("en") && !voice.localService) ||
    voices.find((voice) => voice.lang?.startsWith("en")) ||
    null
  );
}

export function useAISpeaker() {
  const [isSupported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported("speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
  }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    const voice = selectBestVoice();
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => {
      setSpeaking(false);
      onEnd?.();
    };
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking, isSupported };
}
