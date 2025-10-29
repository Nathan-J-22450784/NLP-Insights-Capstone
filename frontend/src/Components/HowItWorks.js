import React, { useEffect, useState } from "react";
import HowItWorksCard from "./HowItWorksCard"; 

export default function HowItWorks({ id, title = "How it works" }) {
  const storageKey = id ? `howit:${id}` : null;

  const [open, setOpen] = useState(() => {
    if (!storageKey) return true;
    const saved = localStorage.getItem(storageKey);
    return saved === null ? true : saved === "1";
  });

  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, open ? "1" : "0");
  }, [open, storageKey]);

  const body = id ? HowItWorksCard[id] : null;
  if (!body) return null;

  return (
    <details
      className="ttc-howitworks ttc-panel ttc-panel--notice"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="ttc-howitworks__title">{title}</summary>
      <div className="ttc-prose ttc-stack-sm">{body}</div>
    </details>
  );
}
