import { useEffect, useRef } from "react";

function drawFaceBox(canvas, video, faceBox) {
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);

  if (!faceBox || !video.videoWidth || !video.videoHeight) {
    return;
  }

  const scaleX = canvas.width / video.videoWidth;
  const scaleY = canvas.height / video.videoHeight;

  context.strokeStyle = "#8f6b42";
  context.lineWidth = 3;
  context.strokeRect(
    faceBox.x * scaleX,
    faceBox.y * scaleY,
    faceBox.width * scaleX,
    faceBox.height * scaleY,
  );
}

export default function WebcamPanel({
  videoRef,
  status,
  currentEmotion,
  currentConfidence,
  faceBox,
  transport,
  cameraEnabled,
  onToggleCamera,
}) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = overlayRef.current;
    if (!video || !canvas) {
      return;
    }

    drawFaceBox(canvas, video, faceBox);
  }, [videoRef, faceBox, currentEmotion]);

  return (
    <section className="panel webcam-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Live camera</p>
          <h2>Webcam stream</h2>
        </div>
        <div className="webcam-actions">
          <button
            type="button"
            className={`camera-toggle-button ${cameraEnabled ? "camera-toggle-stop" : "camera-toggle-start"}`}
            onClick={onToggleCamera}
          >
            {cameraEnabled ? "Stop camera" : "Turn on camera"}
          </button>
          <span className={`status-pill status-${status.variant}`}>{status.label}</span>
        </div>
      </div>

      <div className="video-shell">
        <video ref={videoRef} className="video-feed" autoPlay playsInline muted />
        <canvas ref={overlayRef} className="video-overlay" width="640" height="480" />
        <div className="video-chrome">
          <div className="live-indicator">
            <span className="live-dot" />
            {cameraEnabled ? "Live capture" : "Camera paused"}
          </div>
          <div className="transport-badge">{transport}</div>
        </div>
        {!cameraEnabled ? (
          <div className="camera-off-overlay">
            <p className="eyebrow">Camera paused</p>
            <strong>Turn the camera back on to continue detection</strong>
          </div>
        ) : null}
        <div className="video-scanline" />
      </div>

      <div className="emotion-highlight">
        <div className="emotion-stat-card">
          <p className="muted-label">Current emotion</p>
          <strong>{currentEmotion || "Waiting for signal"}</strong>
        </div>
        <div className="emotion-stat-card">
          <p className="muted-label">Top confidence</p>
          <strong>{currentConfidence ? `${Math.round(currentConfidence * 100)}%` : "--"}</strong>
        </div>
      </div>
    </section>
  );
}
