import React, { useEffect, useState } from "react";
import HowItWorksCard from "./HowItWorksCard"; 

export default function HowItWorks({ id, title = "How it works" }) {
 const body = id ? HowItWorksCard[id] : null;
 if (!body) return null;

 return (
    <div className="ttc-panel ttc-panel--notice">
      <h3 className="ttc-title--sm">{title}</h3>
      <div className="ttc-prose ttc-stack-sm">{body}</div>
    </div>
  );
}
