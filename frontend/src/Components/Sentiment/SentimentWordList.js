import React, { useMemo, useState } from "react";

const nice = (x, d = 3) => (typeof x === "number" ? x.toFixed(d) : "—");

export default function SentimentWordList({ title, rows, allRows = [], sign = "pos" }) {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");

  const source = showAll ? (allRows || []) : (rows || []);

  const items = (source || []).map((t) => ({
    word: t.word,
    count: t.count,
    contribution: t.contribution,
    sentiment: t.sentiment_score,
  }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => (it.word || "").toLowerCase().includes(q));
  }, [items, query]);

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold">{title}</h4>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a word…"
            className="border rounded px-2 py-1 text-xs"
          />
          {allRows.length > (rows?.length || 0) && (
            <button
              onClick={() => setShowAll((s) => !s)}
              className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200"
            >
              {showAll ? "Show top" : "Show all"}
            </button>
          )}
        </div>
      </div>

      <div className="text-[11px] text-gray-500 mb-2">
        Contribution = lexicon rating × frequency; Score = raw lexicon rating.
      </div>

      <ul className="space-y-2">
        {filtered.length === 0 && <li className="text-sm text-gray-500">No items.</li>}
        {filtered.map((it, idx) => (
          <li key={`${it.word}-${idx}`} className="flex items-center justify-between gap-3">
            <div className="truncate">
              <span className="font-mono">{it.word}</span>{" "}
              <span className="text-xs text-gray-500">×{it.count}</span>
            </div>
            <div className="text-right">
              <div className={`text-xs ${sign === "pos" ? "text-green-700" : "text-red-700"}`}>
                {sign === "pos" ? "+" : ""}
                {nice(it.contribution)} contrib
              </div>
              <div className="text-[11px] text-gray-500">score {nice(it.sentiment)}</div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}