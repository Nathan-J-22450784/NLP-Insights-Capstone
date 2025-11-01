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

  return (
    <div className="ttc-panel">
      <div className="ttc-flex-between">
        <h3 className="ttc-title ttc-title--sm">{title}</h3>
        <input
          className="ttc-input"
          placeholder="Find a word…"
          aria-label="Find a word"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="ttc-sub">• Contribution = lexicon rating × frequency; Score = raw lexicon rating.</div>

      {items.length === 0 ? (
        <div className="ttc-center">
          <p className="ttc-sub">No items.</p>
        </div>
      ) : (
        <>
          <table className="ttc-table">
          <thead>
            <tr>
              <th>Word</th>
              <th className="stat-cell">Score</th>
            <th className="stat-cell">Contribution</th>
            </tr>
        </thead>
        <tbody>
          {items.map(({ token, score, contrib }, i) => (
              <tr key={token + i}>
                <td><strong>{token}</strong></td>
                <td className="stat-cell">
                  <span className="ttc-pill">{score ?? "—"}</span>
                </td>
                <td className="stat-cell">
                  <span className="ttc-pill">
                    {contrib != null ? contrib.toFixed(4) : "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    <div className="ttc-stack-lg ttc-container">
      {/* Summary (big stat cards) */}
      <div className="ttc-grid ttc-grid-2-md">
        <div className="ttc-panel">
          <SentimentSummary summary={summary} />
        </div>
        <div className="ttc-panel">
          <h3 className="ttc-title ttc-title--sm">Emotion Averages</h3>
          <EmotionBars emotions={emotions} className="emotion-bars" />
        </div>
      </div>

      {/* Word lists: two equal columns, equal widths */}
      <div className="ttc-grid ttc-grid-2-md">
        <div>
        {/* Positive words container with adjusted width */}
          <WordListCard title="Positive words" words={pos.length ? pos : posAll} />
        </div>
        <div>
        {/* Negative words container (no width override) */}
          <WordListCard title="Negative words" words={neg.length ? neg : negAll} />
        </div>
      </div>
    </div>
  );
}
