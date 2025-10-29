import React, { useEffect, useMemo, useState } from "react";
import SentimentResults from "./SentimentResults";

const API_URL = "http://localhost:8000/api/analyse-sentiment/";

export default function SentimentAnalyser({ uploadedText, uploadedPreview, corpusPreview, onBack, genre }) {
    const [data, setData] = useState(null);
    const [state, setState] = useState({ loading: true, error: "" });

    const previews = useMemo(() => {
        const out = [];
        if (uploadedPreview) out.push({ label: "Your text (preview)", body: uploadedPreview });
        if (corpusPreview) {
            const label = genre ? `Corpus preview (${genre})` : "Corpus preview";
            out.push({ label, body: corpusPreview });
        }
        return out;
    }, [uploadedPreview, corpusPreview, genre]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setState({ loading: true, error: "" });
            try {
                const res = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        uploaded_text: uploadedText || "",
                        corpus_name: genre || "",          // NEW: tell backend which genre corpus to use
                    }),
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
                if (!cancelled) setData(json);
            } catch (e) {
                if (!cancelled) setState({ loading: false, error: e.message || "Request failed" });
                return;
            }
            if (!cancelled) setState({ loading: false, error: "" });
        })();
        return () => { cancelled = true; };
    }, [uploadedText, genre]);   // re-run if user switches genre

    return (
        <main className="ttc-page">
          <div className="ttc-container ttc-stack-lg">
            <button onClick={onBack} className="ttc-button">
              ← Back
            </button>

        <section className="ttc-panel ttc-stack-md">
          <h1 className="analysis-title">Sentiment</h1>

                {state.loading && (
                    <div className="ttc-panel ttc-center">
                        <div className="loading-inline">
                            <span className="loading-spinner" aria-hidden="true"></span>
                        <span>Analysing your text…</span>
                    </div>
                 </div>
                )}

                {state.error && (
                    <div className="ttc-banner ttc-banner--error">
                        <strong>Error:</strong>&nbsp;{state.error}. Is the API available at <code>{API_URL}</code>?
                    </div>
                )}

                {!state.loading && !state.error && (
                    <>
                        {previews.length > 0 && (
                            <div className="ttc-grid ttc-grid-2-md">
                                {previews.map((b, i) => (
                                    <div key={i} className="ttc-panel">
                                        <div className="ttc-title--sm">{b.label}</div>
                                        <pre className="ttc-pre">{b.body}</pre>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="ttc-subtitle">
                            All statistics below are computed from <strong>your text</strong> only; the corpus preview is reference-only.
                        </p>
                        <SentimentResults data={data} />
                    </>
                )}
        </section>
     </div>
   </main>
    );
}
