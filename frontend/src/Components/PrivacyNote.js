import React from "react";

export default function PrivacyNote({ variant = "panel" }) {
  if (variant === "banner") {
    return (
      <div className="ttc-banner" style={{ marginTop: 12 }}>
        <strong>Privacy:</strong> Your writing is yours. We only use your text to generate your results, processing it on our server and then deleting it right after. We don’t store or reuse your content - your privacy and intellectual property stay protected. 
      </div>
    );
  }

  // default: collapsible panel
  return (
    <details className="ttc-panel" style={{ marginTop: 12 }}>
      <summary className="ttc-title--sm">Privacy & method</summary>
      <p className="ttc-sub" style={{ margin: 0 }}>
        Your writing is yours. We only use your text to generate your results, processing it on our server and then deleting it right after. We don’t store or reuse your content - your privacy and intellectual property stay protected. 
      </p>
    </details>
  );
}
