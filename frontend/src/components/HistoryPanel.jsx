export default function HistoryPanel({ history }) {
  const dominantEmotion = history[0]?.emotion || "none yet";

  return (
    <section className="panel history-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Session trace</p>
          <h2>Recent predictions</h2>
        </div>
        <div className="chart-summary">
          <span className="chart-summary-label">Latest</span>
          <strong>{dominantEmotion}</strong>
        </div>
      </div>

      <div className="history-list">
        {history.length === 0 ? (
          <p className="empty-state">Predictions will appear here once the camera starts streaming.</p>
        ) : (
          history.map((entry, index) => (
            <article key={entry.id} className="history-item">
              <div>
                <p className="history-index">Frame {history.length - index}</p>
                <strong>{entry.emotion}</strong>
                <p>{entry.timestamp}</p>
              </div>
              <span>{Math.round(entry.topScore * 100)}%</span>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
