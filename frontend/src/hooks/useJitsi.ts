import { useEffect, useRef } from "react";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

export function useJitsi(roomName: string, displayName: string, domain: string, onReady?: () => void, onLeft?: () => void) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<any>(null);

  useEffect(() => {
    if (!roomName || !containerRef.current) return;
    let cancelled = false;

    function mount() {
      if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI) return;
      apiRef.current = new window.JitsiMeetExternalAPI(domain, {
        roomName,
        parentNode: containerRef.current,
        userInfo: { displayName },
        width: "100%",
        height: "100%",
        configOverwrite: { prejoinPageEnabled: false },
      });
      apiRef.current.addListener("videoConferenceJoined", onReady || (() => {}));
      apiRef.current.addListener("readyToClose", onLeft || (() => {}));
    }

    if (window.JitsiMeetExternalAPI) {
      mount();
    } else {
      const script = document.createElement("script");
      script.src = `https://${domain}/external_api.js`;
      script.async = true;
      script.onload = mount;
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
      apiRef.current?.dispose?.();
      apiRef.current = null;
    };
  }, [roomName, displayName, domain, onReady, onLeft]);

  return {
    containerRef,
    toggleAudio: () => apiRef.current?.executeCommand?.("toggleAudio"),
    toggleVideo: () => apiRef.current?.executeCommand?.("toggleVideo"),
    hangup: () => apiRef.current?.executeCommand?.("hangup"),
  };
}
