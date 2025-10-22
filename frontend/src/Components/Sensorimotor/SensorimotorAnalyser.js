import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

// Vercel → Settings → Environment Variables
const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "https://nlp-insights-capstone.onrender.com";

const SensorimotorAnalyser = ({ words, uploadedPreview, onBack }) => {
  const [status, setStatus] = useState("idle"); // idle | loading | error | done
  const [error, setError] = useState("");
  const [matchedCount, setMatchedCount] = useState(0);
  const [modalities, setModalities] = useState([]);
  const [profile, setProfile] = useState([]);
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const CHART_START = cssVar("--ttc-chart-start") || "#3b82f6";
  const CHART_END   = cssVar("--ttc-chart-end")   || "#8b5cf6";
  const GRID_STROKE = cssVar("--ttc-border")      || "#e5e7eb";
  const TICK_FILL   = "#475569";

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setStatus("loading");
      try {
        const res = await fetch(`${BACKEND_URL}/api/sm/profile/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ words }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setMatchedCount(data.matchedCount || 0);
          setModalities(data.modalities || []);
          setProfile(data.profile || []);
          setStatus("done");
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            "Analysis failed. Check backend URL/CORS. Backend should load sm_norms_min.json (via SM_JSON_URL or static file)."
          );
          setStatus("error");
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, [words]);

  const chartData = modalities.map((m, i) => ({ modality: m, value: Number(profile[i] || 0) }));

  return (
    <div className="analysis-container">
      {/* header row: back + title on one line */}
      <div className="analysis-header">
        <button type="button" onClick={onBack} className="ttc-button">
          ← Back
        </button>
        <h1 className="analysis-title">Sensorimotor Analysis</h1>
      </div>

      <div className="analysis-main">
        {status === "loading" && <p>Crunching numbers…</p>}
        {status === "error" && <p className="error-text">{error}</p>}

        {status === "done" && (
          <>
            {uploadedPreview && <pre className="analysis-preview">{uploadedPreview}</pre>}

            <p className="tcc-sub">
              Matched <strong>{matchedCount}</strong> words. Higher values indicate stronger
              sensory/action associations in the Lancaster norms.
            </p>

            <div className="tcc-grid tcc-grid-2-md">
              {/* ================= BAR CHART ================= */}
              <div className="tcc-panel">
                <h3 className="ttc-chart-title">Bar chart</h3>
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                    {/* gradient for bars */}
                    <defs>
                      <linearGradient id="smBarGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%"  stopColor={CHART_START} />
                        <stop offset="100%" stopColor={CHART_END} />
                      </linearGradient>
                    </defs>
                  
                    <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                    <XAxis dataKey="modality" tick={{ fontSize: 12, fill: TICK_FILL }} />
                    <YAxis tick={{ fontSize: 12, fill: TICK_FILL }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: `1px solid ${GRID_STROKE}` }}
                      labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                      itemStyle={{ color: "#0f172a" }}
                    />
                  
                    {/* use the gradient + rounded tops */}
                    <Bar dataKey="value" fill="url(#smBarGrad)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ================= RADAR CHART ================= */}
              <div className="tcc-panel">
                <h3 className="ttc-chart-title">Radar chart</h3>
                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={chartData} outerRadius="70%">
                      {/* subtle blue→violet fill */}
                      <defs>
                        <linearGradient id="smRadarGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%"  stopColor={CHART_START} stopOpacity={0.18} />
                          <stop offset="100%" stopColor={CHART_END}   stopOpacity={0.18} />
                        </linearGradient>
                      </defs>
                    
                      <PolarGrid stroke={GRID_STROKE} />
                      <PolarAngleAxis dataKey="modality" tick={{ fontSize: 12, fill: TICK_FILL }} />
                      <PolarRadiusAxis tick={{ fontSize: 11, fill: TICK_FILL }} stroke={GRID_STROKE} />
                      <Radar
                        name="Profile"
                        dataKey="value"
                        stroke={CHART_END}
                        strokeWidth={2}
                        fill="url(#smRadarGrad)"
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 10, border: `1px solid ${GRID_STROKE}` }}
                        labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                        itemStyle={{ color: "#0f172a" }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <details className="tcc-panel" style={{ marginTop: 12 }}>
              <summary className="tcc-title--sm">Privacy & method</summary>
              <p className="tcc-sub" style={{ margin: 0 }}>
                We send only your token list to the backend. The backend keeps the norms in memory,
                averages scores per modality across matched words, and stores nothing.
              </p>
            </details>
          </>
        )}
      </div>
    </div>
  );
};

export default SensorimotorAnalyser;
