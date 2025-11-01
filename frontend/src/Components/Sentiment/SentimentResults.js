import React from "react";
import SentimentSummary from "./SentimentSummary";
import EmotionBars from "./EmotionBars";
import SentimentWordList from "./SentimentWordList";

// Shared card for word lists
function WordListCard({ title, words }) {
  const [q, setQ] = React.useState("");

  const norm = (w) => {
    if (!w) return null;
    const token = (w.word ?? w.token ?? w.term ?? `${w}`).toString();
    const score = w.score ?? w.lexicon_rating ?? w.rating ?? null;
    const freq  = w.freq ?? w.frequency ?? w.count ?? null;
    const contrib = w.contribution ?? (score != null && freq != null ? score * freq : null);
    return { token, score, freq, contrib };
  };

  const items = (words || [])
    .map(norm)
    .filter(Boolean)
    .filter(({ token }) => token.toLowerCase().includes(q.toLowerCase()));

  const panel = {
    padding: 16,
    borderRadius: 14,
    background: "var(--ttc-card,#fff)",
    border: "1px solid var(--ttc-border)",
    boxShadow: "var(--ttc-shadow-card,0 1px 0 rgba(0,0,0,.02))",
    display: "flex",
    flexDirection: "column",
    height: "100%",
  };
  const header = {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: 12,
  };
  const inputCss = {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid var(--ttc-border)",
    background: "var(--ttc-surface,#fff)",
    width: "clamp(180px, 28vw, 260px)",
  };
  const helper = {
    color: "var(--ttc-ink-muted)",
    fontSize: 12,
    marginTop: 6,
    marginBottom: 10,
  };
  const row = {
    display: "grid",
    gridTemplateColumns: "1fr auto auto",
    gap: 10,
    alignItems: "center",
    padding: "8px 0",
    borderTop: "1px solid var(--ttc-border)",
  };
  const pill = {
    fontSize: 12,
    padding: "4px 8px",
    borderRadius: 999,
    border: "1px solid var(--ttc-border)",
    background: "var(--ttc-accent)",
    color: "var(--ttc-accent-foreground)",
    textAlign: "center",
    minWidth: 72,
  };

  return (
    <div className="ttc-panel" style={panel}>
      <div style={header}>
        <h3 className="ttc-title ttc-title--sm" style={{ margin: 0 }}>{title}</h3>
        <input
          className="ttc-input"
          style={inputCss}
          placeholder="Find a word…"
          aria-label="Find a word"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div style={helper}>• Contribution = lexicon rating × frequency; Score = raw lexicon rating.</div>

      {items.length === 0 ? (
        <div className="ttc-center" style={{ padding: 16, color: "var(--ttc-ink-muted)" }}>
          <div style={{ fontSize: 13 }}>No items.</div>
        </div>
      ) : (
        <>
          <div style={{ ...row, borderTop: "none", fontSize: 12, opacity: 0.7 }}>
            <div>Word</div>
            <div style={{ textAlign: "center" }}>Score</div>
            <div style={{ textAlign: "center" }}>Contribution</div>
          </div>
          {items.map(({ token, score, contrib }, i) => (
            <div key={token + i} style={row}>
              <div className="value" style={{ fontWeight: 600 }}>{token}</div>
              <div style={pill}>{score ?? "—"}</div>
              <div style={pill}>{contrib != null ? contrib.toFixed(4) : "—"}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default function SentimentResults({ data }) {
  const summary = data?.summary || {};
  const emotions = data?.emotions || {};

  const tokens = data?.tokens || [];
  const POS_T = 0.05, NEG_T = -0.05;

  const pos = data?.top_contributors?.positive || [];
  const neg = data?.top_contributors?.negative || [];

  const posAll = [...tokens]
    .filter((t) => t.sentiment_score > POS_T)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const negAll = [...tokens]
    .filter((t) => t.sentiment_score < NEG_T)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return (
    <div className="ttc-stack-lg results-container" style={{ width: "100%", maxWidth: "1080px", margin: "0 auto", padding: "16px" }}>
      {/* Summary (big stat cards) */}
      <div
        className="tcc-grid tcc-grid-2-md"
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(4, 1fr)", // Ensure the cards are spread evenly
          alignItems: "stretch",
          width: "100%", // Ensure the container stretches fully
        }}
      >
        <div className="tcc-panel">
          <SentimentSummary summary={summary} />
        </div>
        <div className="tcc-panel">
          <h3 className="tcc-title ttc-title--sm">Emotion Averages</h3>
          <EmotionBars emotions={emotions} />
        </div>
      </div>

      {/* Word lists: two equal columns, equal widths */}
      <div
        className="ttc-grid"
        style={{
          gap: 16,
          gridTemplateColumns: "1fr 1fr", // Create 2-column layout with equal width
          alignItems: "stretch",  // Stretch both columns equally
          maxWidth: "1080px",     // Ensure the grid is the same width as the preview
          margin: "0 auto",       // Center the grid horizontally
          width: "100%",          // Force the grid to fill available space
        }}
      >
        {/* Positive words container with adjusted width */}
        <div style={{ width: "103%" }}>
          <WordListCard title="Positive words" words={pos.length ? pos : posAll} />
        </div>

        {/* Negative words container (no width override) */}
        <div style={{ width: "100%" }}>
          <WordListCard title="Negative words" words={neg.length ? neg : negAll} />
        </div>
      </div>
    </div>
  );
}