import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#8f6b42", "#c08457", "#b98b3f", "#7d8b5f", "#6a8b8d", "#8f7f6b", "#b26e63"];

export default function ConfidenceChart({ confidence, currentEmotion }) {
  const data = Object.entries(confidence || {})
    .map(([emotion, value]) => ({
    emotion,
    value: Number((value * 100).toFixed(1)),
  }))
    .sort((left, right) => right.value - left.value);

  return (
    <section className="panel chart-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Model output</p>
          <h2>Confidence scores</h2>
        </div>
        <div className="chart-summary">
          <span className="chart-summary-label">Lead signal</span>
          <strong>{currentEmotion || "Pending"}</strong>
        </div>
      </div>

      <div className="chart-shell">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(108, 93, 74, 0.14)" vertical={false} />
            <XAxis dataKey="emotion" tickLine={false} axisLine={false} stroke="#7a6d5b" />
            <YAxis tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} stroke="#7a6d5b" />
            <Tooltip
              formatter={(value) => `${value}%`}
              cursor={{ fill: "rgba(143, 107, 66, 0.06)" }}
              contentStyle={{
                background: "#fffaf2",
                border: "1px solid rgba(143, 107, 66, 0.16)",
                borderRadius: "14px",
                color: "#2b241d",
              }}
            />
            <Bar dataKey="value" radius={[10, 10, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={entry.emotion} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="confidence-rankings">
        {data.length === 0 ? (
          <p className="empty-state">Confidence tiers will animate here after the first prediction.</p>
        ) : (
          data.slice(0, 3).map((entry, index) => (
            <article key={entry.emotion} className="ranking-chip">
              <span>#{index + 1}</span>
              <strong>{entry.emotion}</strong>
              <small>{entry.value}%</small>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
