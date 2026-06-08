import { useJitsi } from "../../hooks/useJitsi";

interface JitsiRoomProps {
  roomName: string;
  displayName: string;
  onReady?: () => void;
  onLeft?: () => void;
}

export default function JitsiRoom({ roomName, displayName, onReady, onLeft }: JitsiRoomProps) {
  const domain = import.meta.env.VITE_JITSI_DOMAIN || "meet.jit.si";
  const { containerRef } = useJitsi(roomName, displayName, domain, onReady, onLeft);
  return <div ref={containerRef} className="h-[62vh] min-h-[420px] w-full overflow-hidden rounded-lg border border-ash-border bg-ink" />;
}
