// src/components/Breadcrumbs.js
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

/**
 * routeNames: map canonical paths to human labels.
 * Provide entries for the paths you care about.
 * Example keys:
 *  "/" , "/keyness" , "/keyness/results" , "/clustering" , "/about"
 */
const defaultRouteNames = {
  "/": "Home",
};

export default function Breadcrumbs({
  routeNames = defaultRouteNames,
  separator = "›", // keep it simple; replace with icon if you like
  className = "",
  backButton = true,
  onMissingLabel, // optional: (segment, fullPath) => string
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const parts = location.pathname.split("/").filter(Boolean);
  const crumbs = [];

  let pathAcc = "";
  parts.forEach((seg, i) => {
    pathAcc += `/${seg}`;
    const label =
      routeNames[pathAcc] ??
      // optional hook lets you name dynamic segments like /projects/:id
      (onMissingLabel ? onMissingLabel(seg, pathAcc) : nice(seg));

    crumbs.push({
      path: pathAcc,
      label,
      isLast: i === parts.length - 1,
    });
  });

  // Special case for root
  if (crumbs.length === 0) {
    crumbs.push({ path: "/", label: routeNames["/"] ?? "Home", isLast: true });
  }

  return (
    <div className={`ttc-breadcrumbs ${className}`} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      {backButton && (
        <button
          type="button"
          onClick={() => {
            // go back if possible; else send home
            if (window.history.length > 1) navigate(-1);
            else navigate("/");
          }}
          className="ttc-btn--ghost"
          aria-label="Go back"
          style={{ padding: "0.25rem 0.5rem", borderRadius: "9999px" }}
        >
          ← Back
        </button>
      )}

      <nav aria-label="Breadcrumb" style={{ overflowX: "auto" }}>
        <ol style={{ display: "flex", gap: "0.5rem", listStyle: "none", padding: 0, margin: 0 }}>
          {crumbs.map((c, i) => (
            <li key={c.path} style={{ display: "flex", gap: "0.5rem", alignItems: "center", whiteSpace: "nowrap" }}>
              {i > 0 && <span aria-hidden="true">{separator}</span>}
              {c.isLast ? (
                <span aria-current="page" className="ttc-crumb-current" style={{ fontWeight: 600 }}>
                  {c.label}
                </span>
              ) : (
                <Link className="ttc-crumb-link" to={c.path}>
                  {c.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}

function nice(seg) {
  // Turn "keyness-results" -> "Keyness Results"; "id123" -> "Id123"
  return seg
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
