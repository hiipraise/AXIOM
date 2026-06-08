import { Volume2 } from "lucide-react";
import { useEffect } from "react";
import { useAISpeaker } from "../../hooks/useAISpeaker";

export default function QuestionPlayer({ question, autoPlay }: { question: string; autoPlay: boolean }) {
  const speaker = useAISpeaker();
  useEffect(() => {
    if (autoPlay && question) speaker.speak(question);
    return () => speaker.stop();
  }, [autoPlay, question, speaker.speak, speaker.stop]);

  return (
    <div className="space-y-3">
      <p className="text-lg font-medium leading-7 text-ink">{question}</p>
      {speaker.isSupported && (
        <button type="button" className="btn-secondary !py-1.5 !px-3 !text-xs" onClick={() => speaker.speak(question)}>
          <Volume2 size={13} /> {speaker.speaking ? "Speaking" : "Replay"}
        </button>
      )}
    </div>
  );
}
