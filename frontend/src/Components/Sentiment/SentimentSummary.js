import React from "react";

const polarityLabel = (p) =>
  typeof p === "number" ? (p > 0 ? "Positive" : p < 0 ? "Negative" : "Neutral") : "—";
const formatPct = (x) => `${(100 * (x || 0)).toFixed(1)}%`;
const nice = (x, d = 3) => (typeof x === "number" ? x.toFixed(d) : "—");

export default function SentimentSummary({ summary }) {
  const {
    polarity,
    coverage,
    token_count,
    matched_token_count,
    sentiment_score_mean,
    magnitude,
    stddev,
    positive_ratio,
    negative_ratio,
    neutral_ratio,
  } = summary || {};

  // ——— layout tokens (no local stylesheet) ———
  const root = { width: "100%" };

  const pillsRow = {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 14,
  };
  const chip = {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "1px solid var(--ttc-border)",
    background: "var(--ttc-accent)",
    color: "var(--ttc-accent-foreground)",
  };
  const chipLabel = { opacity: 0.7 };

  // Cards
  const card = {
    padding: 20,
    borderRadius: 14,
    background: "var(--ttc-card,#fff)",
    border: "1px solid var(--ttc-border)",
    boxShadow: "var(--ttc-shadow-card,0 1px 0 rgba(0,0,0,.02))",
  };
  const label = { fontSize: 12, opacity: 0.75, marginBottom: 6, color: "var(--ttc-ink-muted,inherit)" };
  // color/weight come from global ttc rules
  const value = { fontSize: 36, lineHeight: 1.1 };

  // Composition bars
  const row = {
    display: "grid",
    gridTemplateColumns: "96px 1fr 56px",
    alignItems: "center",
    gap: 10,
  };
  const track = {
    height: 12,
    borderRadius: 999,
    background: "var(--ttc-ring-soft)",
    border: "1px solid var(--ttc-border)",
    overflow: "hidden",
    width: "100%",
  };
  const fill = (w) => ({
    width: `${w}%`,
    height: "100%",
    display: "block",
    background:
      "linear-gradient(90deg, var(--ttc-chart-start, #3b82f6), var(--ttc-chart-end, #806ba1))",
  });

  const posPct = 100 * (positive_ratio || 0);
  const negPct = 100 * (negative_ratio || 0);
  const neuPct = 100 * (neutral_ratio || 0);
  const hasMatches = (matched_token_count ?? 0) > 0;

  return (
    <div className="ttc-stack-md results-container" style={root}>
      {/* Pills */}
      <div style={pillsRow}>
        <span style={chip}>
          <span style={chipLabel}>Polarity:</span>
          <strong>{polarityLabel(polarity)}</strong>
        </span>
        <span style={chip}>
          <span style={chipLabel}>Coverage:</span>
          <strong>{formatPct(coverage)}</strong>
        </span>
        <span style={chip}>
          <span style={chipLabel}>Tokens:</span>
          <strong>
            {token_count ?? 0} (matched {matched_token_count ?? 0})
          </strong>
        </span>
      </div>

      {/* Metrics grid — force 4 equal columns to fill the panel */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 16,
          width: "100%",
          alignItems: "stretch",
        }}
      >
        <div className="ttc-panel" style={{ ...card, textAlign: "center" }}>
          <div style={label}>Mean Sentiment</div>
          <div className="value stat-number" style={value}>{nice(sentiment_score_mean)}</div>
        </div>

        <div className="ttc-panel" style={{ ...card, textAlign: "center" }}>
          <div style={label}>Magnitude</div>
          <div className="value stat-number" style={value}>{nice(magnitude)}</div>
        </div>

        <div className="ttc-panel" style={{ ...card, textAlign: "center" }}>
          <div style={label}>Std Dev</div>
          <div className="value stat-number" style={value}>{nice(stddev)}</div>
        </div>

        <div className="ttc-panel" style={{ ...card, textAlign: "left" }}>
          <div style={label}>Composition</div>
          {hasMatches ? (
            <div className="ttc-stack-md" style={{ gap: 12 }}>
              <div style={row}>
                <div style={{ opacity: 0.8, fontSize: 13 }}>Positive</div>
                <div style={track}><span style={fill(posPct)} /></div>
                <div style={{ textAlign: "right", fontSize: 13 }}>{formatPct(positive_ratio)}</div>
              </div>
              <div style={row}>
                <div style={{ opacity: 0.8, fontSize: 13 }}>Negative</div>
                <div style={track}><span style={fill(negPct)} /></div>
                <div style={{ textAlign: "right", fontSize: 13 }}>{formatPct(negative_ratio)}</div>
              </div>
              <div style={row}>
                <div style={{ opacity: 0.8, fontSize: 13 }}>Neutral</div>
                <div style={track}><span style={fill(neuPct)} /></div>
                <div style={{ textAlign: "right", fontSize: 13 }}>{formatPct(neutral_ratio)}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, opacity: 0.75, color: "var(--ttc-ink-muted,inherit)" }}>
              No matched tokens in lexicon.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
