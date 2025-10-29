import React from "react";
import SentimentSummary from "./SentimentSummary";
import EmotionBars from "./EmotionBars";
import SentimentWordList from "./SentimentWordList";

export default function SentimentResults({ data }) {
  const summary = data?.summary || {};
  const emotions = data?.emotions || {};
  const pos = data?.top_contributors?.positive || [];
  const neg = data?.top_contributors?.negative || [];

  // Build full positive/negative lists from per-token transparency
  const tokens = data?.tokens || [];
  const POS_T = 0.05;
  const NEG_T = -0.05;

  const posAll = [...tokens]
    .filter((t) => t.sentiment_score > POS_T)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const negAll = [...tokens]
    .filter((t) => t.sentiment_score < NEG_T)
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return (
    <div className="tcc-stack-lg">
      {/* Summary + Emotion bars */}
      <div className="tcc-grid tcc-grid-2-md">
        <div className="tcc-panel">
          <SentimentSummary summary={summary} />
        </div>
        <div className="tcc-panel">
          <h3 className="tcc-title tcc-title--sm">Emotion Averages</h3>
          <EmotionBars emotions={emotions} />
        </div>
      </div>

      {/* Word lists */}
      <div className="tcc-grid tcc-grid-2-lg">
        <div className="tcc-panel">
          <SentimentWordList title="Positive words" rows={pos} allRows={posAll} sign="pos" />
        </div>
        <div className="tcc-panel">
          <SentimentWordList title="Negative words" rows={neg} allRows={negAll} sign="neg" />
        </div>
      </div>
    </div>
  );
}
