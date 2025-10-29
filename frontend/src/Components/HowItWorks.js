import React, { useEffect, useState } from "react";
import HowItWorksCard from "./HowItWorksCard"; 

export default function HowItWorks({ id, title = "How it works" }) {
  const [open, setOpen] = useState(false);
  const storageKey = id ? `howit:${id}` : null;
  const body = id ? HowItWorksCard[id] : null;

  // restore open/closed state per page
  useEffect(() => {
    if (!storageKey) return;
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) setOpen(saved === "1");
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, open ? "1" : "0");
  }, [open, storageKey]);

  if (!body) return null;

  return (
    <details className="ttc-howitworks" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="ttc-link">{title}</summary>
      <div className="ttc-prose ttc-stack-sm">{body}</div>
    </details>
  );
}
