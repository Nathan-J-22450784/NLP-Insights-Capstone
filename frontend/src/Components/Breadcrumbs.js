import React from "react";

/**
 * Props:
 *  - activePage: "home" | "keyness" | "keyness-results" | "keyness-word-detail" | "clustering" | "sentiment" | "sensorimotor"
 *  - onNavigate: (page) => void   // usually setActivePage
 *  - currentWord?: string         // for keyness-word-detail
 */
export default function Breadcrumbs({ activePage, onNavigate, currentWord, showBack = false }) {
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
      {showBack && canGoBack && (
        <button onClick={goBack} className="ttc-button ttc-button-sm ttc-breadcrumbs__back">
          ← Back
        </button>
      )}

      <nav className="ttc-breadcrumbs__nav" aria-label="Breadcrumb">
        <ol className="ttc-breadcrumbs__list">
          {items.map((it, i) => (
            <li key={`${it.label}-${i}`} className="ttc-breadcrumbs__item">
              {i > 0 && <span className="ttc-breadcrumbs__sep" aria-hidden="true">›</span>}
              {i === items.length - 1 || !it.page ? (
                <span aria-current="page" className="ttc-breadcrumbs__current">
                  {it.label}
                </span>
              ) : (
                <button className="ttc-breadcrumbs__link" onClick={() => onNavigate(it.page)}>
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
