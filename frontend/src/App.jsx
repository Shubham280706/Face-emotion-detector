import { useEffect, useRef, useState } from "react";
import ConfidenceChart from "./components/ConfidenceChart";
import HistoryPanel from "./components/HistoryPanel";
import StatusBanner from "./components/StatusBanner";
import WebcamPanel from "./components/WebcamPanel";
import { createEmotionSocket, detectEmotion } from "./services/api";

const CAPTURE_INTERVAL_MS = 500;
const MAX_HISTORY = 12;

function dataUrlToFormData(dataUrl) {
  const formData = new FormData();
  formData.append("image", dataUrl);
  return formData;
}

function getTopConfidence(confidence) {
  if (!confidence) {
    return 0;
  }
  return Math.max(...Object.values(confidence));
}

function buildHistoryEntry(payload) {
  return {
    id: crypto.randomUUID(),
    emotion: payload.emotion,
    topScore: getTopConfidence(payload.confidence),
    timestamp: new Date().toLocaleTimeString(),
  };
}

function getSortedConfidence(confidence) {
  return Object.entries(confidence || {}).sort(([, left], [, right]) => right - left);
}

export default function App() {
  const videoRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const intervalRef = useRef(null);
  const socketRef = useRef(null);
  const isSendingRef = useRef(false);
  const mediaStreamRef = useRef(null);

  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [statusMessage, setStatusMessage] = useState("Requesting camera access...");
  const [status, setStatus] = useState({ label: "Booting", variant: "idle" });
  const [transport, setTransport] = useState("WebSocket");
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [theme, setTheme] = useState("light");

  const topConfidence = getTopConfidence(prediction?.confidence);
  const rankedConfidence = getSortedConfidence(prediction?.confidence);
  const secondaryEmotion = rankedConfidence[1]?.[0] || "calibrating";
  const frameCount = history.length;

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("emotion-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("emotion-theme", theme);
  }, [theme]);

  useEffect(() => {
    async function syncCameraState() {
      if (!cameraEnabled) {
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setStatus({ label: "Camera off", variant: "idle" });
        setStatusMessage("Camera is paused. Turn it back on to resume live emotion tracking.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setStatus({ label: "Camera ready", variant: "ok" });
        setStatusMessage("Camera connected. Starting live emotion inference.");
      } catch (error) {
        setStatus({ label: "Camera blocked", variant: "error" });
        setStatusMessage(error.message || "Unable to access the webcam.");
        setCameraEnabled(false);
      }
    }

    syncCameraState();

    return () => {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    };
  }, [cameraEnabled]);

  useEffect(() => {
    const socket = createEmotionSocket({
      onMessage: (payload) => {
        if (payload.ok === false) {
          setStatus({ label: "Adjust framing", variant: "warn" });
          setStatusMessage(payload.error);
          return;
        }

        setPrediction(payload);
        setHistory((current) => [buildHistoryEntry(payload), ...current].slice(0, MAX_HISTORY));
        setStatus({ label: "Streaming", variant: "ok" });
        setStatusMessage(`Detected ${payload.emotion} with live WebSocket inference.`);
      },
      onError: () => {
        setTransport("REST fallback");
        setStatus({ label: "REST mode", variant: "warn" });
        setStatusMessage("WebSocket unavailable. Continuing with REST polling.");
      },
    });

    socketRef.current = socket;
    return () => socket.close();
  }, []);

  useEffect(() => {
    async function captureAndSend() {
      const video = videoRef.current;
      if (!cameraEnabled || !video || video.readyState < 2 || isSendingRef.current) {
        return;
      }

      const canvas = captureCanvasRef.current || document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      captureCanvasRef.current = canvas;

      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

      isSendingRef.current = true;
      try {
        if (socketRef.current?.readyState === WebSocket.OPEN && transport === "WebSocket") {
          socketRef.current.send(dataUrl);
        } else {
          const payload = await detectEmotion(dataUrlToFormData(dataUrl));
          setPrediction(payload);
          setHistory((current) => [buildHistoryEntry(payload), ...current].slice(0, MAX_HISTORY));
          setStatus({ label: "Streaming", variant: "ok" });
          setStatusMessage(`Detected ${payload.emotion} with REST polling.`);
        }
      } catch (error) {
        setStatus({ label: "Adjust framing", variant: "warn" });
        setStatusMessage(error.message || "Emotion inference failed.");
      } finally {
        isSendingRef.current = false;
      }
    }

    intervalRef.current = window.setInterval(captureAndSend, CAPTURE_INTERVAL_MS);
    return () => window.clearInterval(intervalRef.current);
  }, [transport]);

  return (
    <main className="app-shell">
      <StatusBanner
        message={statusMessage}
        modelSource={prediction?.modelSource}
        transport={transport}
        currentEmotion={prediction?.emotion}
        topConfidence={topConfidence}
        frameCount={frameCount}
        secondaryEmotion={secondaryEmotion}
        status={status}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
      />

      <section className="dashboard-grid">
        <WebcamPanel
          videoRef={videoRef}
          status={status}
          currentEmotion={prediction?.emotion}
          currentConfidence={topConfidence}
          faceBox={prediction?.faceBox}
          transport={transport}
          cameraEnabled={cameraEnabled}
          onToggleCamera={() => setCameraEnabled((current) => !current)}
        />
        <ConfidenceChart confidence={prediction?.confidence} currentEmotion={prediction?.emotion} />
      </section>

      <HistoryPanel history={history} />
    </main>
  );
}
