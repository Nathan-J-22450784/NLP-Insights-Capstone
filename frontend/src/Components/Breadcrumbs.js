import React from "react";

/**
 * Props:
 *  - activePage: "home" | "keyness" | "keyness-results" | "keyness-word-detail" | "clustering" | "sentiment" | "sensorimotor"
 *  - onNavigate: (page) => void   // usually setActivePage
 *  - currentWord?: string         // for keyness-word-detail
 */
export default function Breadcrumbs({ activePage, onNavigate, currentWord }) {
  const items = [{ label: "Home", page: "home" }];

  if (["keyness","keyness-results","keyness-word-detail"].includes(activePage)) {
    items.push({ label: "Keyness", page: "keyness" });
  }
  if (["keyness-results","keyness-word-detail"].includes(activePage)) {
    items.push({ label: "Results", page: "keyness-results" });
  }
  if (activePage === "keyness-word-detail") {
    items.push({ label: currentWord ? `Word: ${currentWord}` : "Word Detail", page: null }); // last item not clickable
  }

  if (activePage === "clustering") {
    items.push({ label: "Clustering", page: null });
  }
  if (activePage === "sentiment") {
    items.push({ label: "Sentiment", page: null });
  }
  if (activePage === "sensorimotor") {
    items.push({ label: "Sensorimotor", page: null });
  }

  const canGoBack = items.length > 1;
  const goBack = () => {
    // simple state-based back logic
    if (activePage === "keyness-word-detail") return onNavigate("keyness-results");
    if (activePage === "keyness-results")     return onNavigate("keyness");
    return onNavigate("home");
  };

  return (
    <div className="ttc-breadcrumbs">
      {canGoBack && (
        <button onClick={goBack} className="ttc-button ttc-button-sm">
          ← Back
        </button>
      )}

      <nav aria-label="Breadcrumb" style={{overflowX:"auto"}}>
        <ol style={{display:"flex",gap:"0.5rem",listStyle:"none",padding:0,margin:0}}>
          {items.map((it, i) => (
            <li key={`${it.label}-${i}`} style={{display:"flex",gap:"0.5rem",alignItems:"center",whiteSpace:"nowrap"}}>
              {i > 0 && <span aria-hidden="true">›</span>}
              {i === items.length - 1 || !it.page ? (
                <span aria-current="page" className="ttc-crumb-current" style={{fontWeight:600}}>
                  {it.label}
                </span>
              ) : (
                <button className="ttc-crumb-link" onClick={() => onNavigate(it.page)} style={{all:"unset",cursor:"pointer",color:"var(--ttc-primary,#492c79)"}}>
                  {it.label}
                </button>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
