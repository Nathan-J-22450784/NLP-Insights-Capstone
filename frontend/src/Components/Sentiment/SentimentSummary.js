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

  const posPct = 100 * (positive_ratio || 0);
  const negPct = 100 * (negative_ratio || 0);
  const neuPct = 100 * (neutral_ratio || 0);
  const hasMatches = (matched_token_count ?? 0) > 0;

  return (
    <section className="results-summary">
    <div className="ttc-stack-md">
      {/* Pills */}
      <div className="ttc-btnrow" style={{ justifyContent: "center" }}>
        <span className="ttc-pill">
          <span className="ttc-sub" style={{ margin: 0 }}>Polarity:&nbsp;</span>
          <strong>{polarityLabel(polarity)}</strong>
        </span>
        <span className="ttc-pill">
          <span className="ttc-sub" style={{ margin: 0 }}>Coverage:&nbsp;</span>
          <strong>{formatPct(coverage)}</strong>
        </span>
        <span className="ttc-pill">
          <span className="ttc-sub" style={{ margin: 0 }}>Tokens:&nbsp;</span>
          <strong>
            {token_count ?? 0} (matched {matched_token_count ?? 0})
          </strong>
        </span>
      </div>

      {/* Metrics grid — force 4 equal columns to fill the panel */}
      <div className="ttc-grid ttc-grid-3-lg">
        <div className="stat-card">
          <div className="stat-label">Mean Sentiment</div>
          <div className="stat-number">{nice(sentiment_score_mean)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Magnitude</div>
          <div className="stat-number">{nice(magnitude)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Std Dev</div>
          <div className="stat-number">{nice(stddev)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Composition</div>
          {hasMatches ? (
            <div className="emotion-bars">
              <div className="emotion-bar">
                <div className="emotion-bar__label">Positive</div>
                <div className="emotion-bar__track">
                  <div className="emotion-bar__fill" style={{ "--value": `${posPct}%` }} />
                </div>
                <div className="emotion-bar__value">{formatPct(positive_ratio)}</div>
              </div>
              <div className="emotion-bar">
                <div className="emotion-bar__label">Negative</div>
                <div className="emotion-bar__track">
                  <div className="emotion-bar__fill" style={{ "--value": `${negPct}%` }} />
                </div>
                <div className="emotion-bar__value">{formatPct(negative_ratio)}</div>
              </div>
              <div className="emotion-bar">
                <div className="emotion-bar__label">Neutral</div>
                <div className="emotion-bar__track">
                  <div className="emotion-bar__fill" style={{ "--value": `${neuPct}%` }} />
                </div>
                <div className="emotion-bar__value">{formatPct(neutral_ratio)}</div>
              </div>
            </div>
          ) : (
            <p className="ttc-sub">
              No matched tokens in lexicon.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
