const isProd = import.meta.env.PROD;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL ||
  (isProd
    ? `wss://${window.location.host}/api/emotion/ws`
    : `ws://${window.location.host}/api/emotion/ws`);

export async function detectEmotion(formData) {
  const response = await fetch(`${API_BASE_URL}/emotion`, {
    method: "POST",
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.detail || "Emotion detection failed.");
  }

  return payload;
}

export function createEmotionSocket({ onMessage, onError }) {
  const socket = new WebSocket(WS_BASE_URL);

  socket.onmessage = (event) => {
    const payload = JSON.parse(event.data);
    if (payload.ok === false) {
      onMessage?.({
        ok: false,
        error: payload.error || "WebSocket emotion detection failed.",
      });
      return;
    }
    onMessage?.(payload);
  };

  socket.onerror = () => {
    onError?.(new Error("WebSocket connection error."));
  };

  return socket;
}
