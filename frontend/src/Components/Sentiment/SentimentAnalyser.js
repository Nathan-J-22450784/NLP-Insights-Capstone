import React, { useEffect, useMemo, useState } from "react";
import SentimentResults from "./SentimentResults";

const API_URL = "http://localhost:8000/api/analyse-sentiment/";

export default function SentimentAnalyser({ uploadedText, uploadedPreview, onBack, genre }) {
    const [data, setData] = useState(null);
    const [state, setState] = useState({ loading: true, error: "" });

    const previews = useMemo(() => {
        const out = [];
        if (uploadedPreview) out.push({ label: "Your text (preview)", body: uploadedPreview });
        return out;
    }, [uploadedPreview, genre]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setState({ loading: true, error: "" });
            try {
                const res = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        uploaded_text: uploadedText || ""
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
  <div style={{ gridColumn: "1 / -1", justifySelf: "center", marginBottom: 12 }}>
    <div className="ttc-panel" style={{ maxWidth: 860, margin: "0 auto" }}>
      <h3
        className="ttc-title ttc-title--sm"
        style={{ marginTop: 0, textAlign: "center" }}
      >
        {previews[0].label}
      </h3>
      <pre className="ttc-pre">{previews[0].body}</pre>
    </div>
  </div>
)}
                        <SentimentResults data={data} />
                    </>
                )}
        </section>
     </div>
   </main>
    );
}
