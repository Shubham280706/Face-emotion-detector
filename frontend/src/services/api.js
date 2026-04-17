const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// In production, we use relative /api. In local development, we target port 8000 directly.
export const API_BASE_URL = isLocalhost ? 'http://localhost:8000/api' : '/api';

const getWsBaseUrl = () => {
  if (isLocalhost) {
    return 'ws://localhost:8000/api/emotion/ws';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
  return `${protocol}${window.location.host}/api/emotion/ws`;
};

export const WS_BASE_URL = getWsBaseUrl();

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
