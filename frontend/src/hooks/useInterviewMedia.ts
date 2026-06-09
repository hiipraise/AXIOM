import { useCallback, useEffect, useRef, useState } from "react";

export function useInterviewMedia() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const start = useCallback(async (video = true) => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      setStream(media);
      setMicEnabled(true);
      setCameraEnabled(video);
      setError("");
      return media;
    } catch {
      setError("Camera or microphone access was blocked.");
      return null;
    }
  }, []);

  const stop = useCallback(() => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  }, [stream]);

  const toggleMic = useCallback(() => {
    setMicEnabled((enabled) => {
      stream?.getAudioTracks().forEach((track) => {
        track.enabled = !enabled;
      });
      return !enabled;
    });
  }, [stream]);

  const toggleCamera = useCallback(() => {
    setCameraEnabled((enabled) => {
      stream?.getVideoTracks().forEach((track) => {
        track.enabled = !enabled;
      });
      return !enabled;
    });
  }, [stream]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => () => stop(), [stop]);

  return { stream, videoRef, micEnabled, cameraEnabled, error, start, stop, toggleMic, toggleCamera };
}
