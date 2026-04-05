function formatPercent(value) {
  return value ? `${Math.round(value * 100)}%` : "--";
}

export default function StatusBanner({
  message,
  modelSource,
  transport,
  currentEmotion,
  topConfidence,
  frameCount,
  secondaryEmotion,
  status,
  theme,
  onToggleTheme,
}) {
  return (
    <section className="status-banner">
      <div className="status-copy-block">
        <div className="banner-topline">
          <p className="eyebrow">Realtime affect sensing</p>
          <button type="button" className="theme-toggle-button" onClick={onToggleTheme}>
            {theme === "light" ? "Dark theme" : "Light theme"}
          </button>
        </div>
        <h1>Face Emotion Detector</h1>
        <p className="status-copy">{message}</p>
        <div className="hero-pills">
          <span className={`hero-pill hero-pill-${status.variant}`}>{status.label}</span>
          <span className="hero-pill hero-pill-muted">Secondary: {secondaryEmotion}</span>
        </div>
      </div>

      <div className="status-meta-grid">
        <article className="metric-card metric-card-primary">
          <span>Current emotion</span>
          <strong>{currentEmotion || "Scanning..."}</strong>
          <small>Top confidence {formatPercent(topConfidence)}</small>
        </article>
        <article className="metric-card">
          <span>Transport</span>
          <strong>{transport}</strong>
          <small>Automatic fallback enabled</small>
        </article>
        <article className="metric-card">
          <span>Frames tracked</span>
          <strong>{frameCount}</strong>
          <small>Recent prediction snapshots</small>
        </article>
        <article className="metric-card">
          <span>Model</span>
          <strong>{modelSource || "loading"}</strong>
          <small>Swappable inference backend</small>
        </article>
      </div>
    </section>
  );
}
