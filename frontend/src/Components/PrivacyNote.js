import React from "react";

export default function PrivacyTile({ style, className = "" }) {
  return (
    <section className="ttc-panel ttc-panel--notice ttc-stack-sm" style={style} aria-live="polite">
      <h3 className="ttc-title--sm" style={{ margin: 0 }}>Privacy & Method</h3>
      <p className="ttc-sub" style={{ margin: 0 }}>
        Your writing is yours. We only use your text to generate your results,
        processing it on our server and deleting it right after. We don’t store
        or reuse your content—your privacy and intellectual property stay protected.
      </p>
    </section>
  );
}
