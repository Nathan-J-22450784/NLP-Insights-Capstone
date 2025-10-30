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
      className="ttc-panel ttc-panel--notice"
      open={open}
      onToggle={(e) => { e.currentTarget.open = true; }}
    >
      <summary className="ttc-title--sm" onClick={(e)=>e.preventDefault()}>{title}</summary>
      <div className="ttc-prose ttc-stack-sm">{body}</div>
    </details>
  );
}
