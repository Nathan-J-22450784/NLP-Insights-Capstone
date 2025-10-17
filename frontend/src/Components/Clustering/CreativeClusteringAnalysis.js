import React, { useState, useEffect } from "react";
import ClusteringCharts from "./ClusteringCharts";

const CreativeClusteringAnalysis = ({ clusters, topTerms, themes, textDocuments = [] }) => {
  const [showChart, setShowChart] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState("all");
  const [showTopTerms, setShowTopTerms] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [showThematicFlow, setShowThematicFlow] = useState(false);
  const [showOverusedThemes, setShowOverusedThemes] = useState(false);
  const [themeAnalysisData, setThemeAnalysisData] = useState(null);
  const [isLoadingThemeAnalysis, setIsLoadingThemeAnalysis] = useState(false);
  const [themeAnalysisError, setThemeAnalysisError] = useState(null);
  const [thematicFlowData, setThematicFlowData] = useState(null);
  const [isLoadingThematicFlow, setIsLoadingThematicFlow] = useState(false);
  const [thematicFlowError, setThematicFlowError] = useState(null);
  const [overusedThemesData, setOverusedThemesData] = useState(null);
  const [isLoadingOverusedThemes, setIsLoadingOverusedThemes] = useState(false);
  const [overusedThemesError, setOverusedThemesError] = useState(null);
  const [chartSummaryData, setChartSummaryData] = useState(null);
  const [isLoadingChartSummary, setIsLoadingChartSummary] = useState(false);
  const [chartSummaryError, setChartSummaryError] = useState(null);

  const generateChartSummary = async () => {
    setIsLoadingChartSummary(true);
    setChartSummaryError(null);

    const prepareClusterSummary = (clusters, selectedCluster) => {
      if (!clusters || clusters.length === 0) return [];
      if (selectedCluster === "all") {
        return clusters.map((c) => ({
          label: c.label ?? "unknown",
          doc: c.doc ?? "",
          words: c.words ?? [],
          x: c.x ?? 0,
          y: c.y ?? 0,
        }));
      }
      return clusters
        .filter((c) => c.label === selectedCluster)
        .map((c) => ({
          label: c.label ?? "unknown",
          doc: c.doc ?? "",
          words: c.words ?? [],
          x: c.x ?? 0,
          y: c.y ?? 0,
        }));
    };

    try {
      const clusterSummary = prepareClusterSummary(clusters, selectedCluster);

      const response = await fetch("http://localhost:8000/api/summarise-clustering-chart/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cluster_summary: clusterSummary,
          top_terms: topTerms,
          themes: themes,
          selected_cluster: selectedCluster,
          title: `Clustering Analysis - ${
            selectedCluster === "all" ? "All Clusters" : `Cluster ${selectedCluster}`
          }`,
        }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setChartSummaryData(data);
    } catch (error) {
      console.error("Error generating summary:", error);
      setChartSummaryError(error.message);
    } finally {
      setIsLoadingChartSummary(false);
    }
  };

  useEffect(() => {
    if (showChart && clusters.length > 0) {
      generateChartSummary();
    }
  }, [showChart, selectedCluster, clusters.length]);

  const generateGeneralSummary = async () => {};

  const generateThemeAnalysis = async () => {
    setIsLoadingThemeAnalysis(true);
    setThemeAnalysisError(null);

    try {
      const response = await fetch("http://localhost:8000/api/analyse-themes/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text_documents: textDocuments,
          clusters: clusters,
          top_terms: topTerms,
          themes: themes,
          title: "Document Collection Theme Analysis",
        }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setThemeAnalysisData(data);
    } catch (error) {
      console.error("Error generating theme analysis:", error);
      setThemeAnalysisError(error.message);
    } finally {
      setIsLoadingThemeAnalysis(false);
    }
  };

  useEffect(() => {
    if (showThemes && !themeAnalysisData && !isLoadingThemeAnalysis && !themeAnalysisError) {
      generateThemeAnalysis();
    }
  }, [showThemes]);

  const generateThematicFlow = async () => {
    setIsLoadingThematicFlow(true);
    setThematicFlowError(null);

    try {
      const response = await fetch("http://localhost:8000/api/analyse-thematic-flow/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text_documents: textDocuments,
          clusters: clusters,
          top_terms: topTerms,
          themes: themes,
          title: "Thematic Flow Analysis",
        }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setThematicFlowData(data);
    } catch (error) {
      console.error("Error generating thematic flow:", error);
      setThematicFlowError(error.message);
    } finally {
      setIsLoadingThematicFlow(false);
    }
  };

  useEffect(() => {
    if (showThematicFlow && !thematicFlowData && !isLoadingThematicFlow && !thematicFlowError) {
      generateThematicFlow();
    }
  }, [showThematicFlow]);

  const generateOverusedThemes = async () => {
    setIsLoadingOverusedThemes(true);
    setOverusedThemesError(null);

    try {
      const response = await fetch("http://localhost:8000/api/analyse-overused-themes/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text_documents: textDocuments,
          clusters: clusters,
          top_terms: topTerms,
          themes: themes,
          title: "Overused/Underused Analysis",
        }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setOverusedThemesData(data);
    } catch (error) {
      console.error("Error generating overused themes analysis:", error);
      setOverusedThemesError(error.message);
    } finally {
      setIsLoadingOverusedThemes(false);
    }
  };

  useEffect(() => {
    if (
      showOverusedThemes &&
      !overusedThemesData &&
      !isLoadingOverusedThemes &&
      !overusedThemesError
    ) {
      generateOverusedThemes();
    }
  }, [showOverusedThemes]);

  const clusterOptions = Array.from(new Set(clusters.map((c) => c.label))).sort((a, b) => a - b);

  const displayedClusters =
    selectedCluster === "all" ? clusters : clusters.filter((c) => c.label === Number(selectedCluster));

  const handleViewChange = (view) => {
    setShowChart(view === "chart");
    setShowTopTerms(view === "terms");
    setShowDocuments(view === "documents");
    setShowThemes(view === "themes");
    setShowThematicFlow(view === "flow");
    setShowOverusedThemes(view === "overused");
  };

  return (
    <div className="ttc-page">
      <div className="ttc-container">

        {/* View Controls */}
        <div className="ttc-btnrow" style={{ justifyContent: "flex-start", marginBottom: 14 }}>
          <button
            className="ttc-button ttc-button-sm"
            onClick={() => handleViewChange("chart")}
            aria-pressed={showChart}
          >
            Show Chart
          </button>
          <button
            className="ttc-button ttc-button-sm"
            onClick={() => handleViewChange("terms")}
            aria-pressed={showTopTerms}
          >
            Show Top Terms
          </button>
          <button
            className="ttc-button ttc-button-sm"
            onClick={() => handleViewChange("documents")}
            aria-pressed={showDocuments}
          >
            Show Clustered Documents
          </button>
          <button
            className="ttc-button ttc-button-sm"
            onClick={() => handleViewChange("themes")}
            aria-pressed={showThemes}
          >
            Themes
          </button>
          <button
            className="ttc-button ttc-button-sm"
            onClick={() => handleViewChange("flow")}
            aria-pressed={showThematicFlow}
          >
            Thematic Flow
          </button>
          <button
            className="ttc-button ttc-button-sm"
            onClick={() => handleViewChange("overused")}
            aria-pressed={showOverusedThemes}
          >
            Overused Themes
          </button>
        </div>

        {/* Cluster Filter */}
        {clusters.length > 0 && (
          <div className="ttc-stack-md" style={{ marginBottom: 12 }}>
            <label style={{ fontWeight: 700, color: "#1f2937" }}>Filter Cluster:</label>
            <select
              value={selectedCluster}
              onChange={(e) => setSelectedCluster(e.target.value)}
              className="ttc-select"
              style={{ maxWidth: 280 }}
            >
              <option value="all">All Clusters</option>
              {clusterOptions.map((label) => (
                <option key={label} value={label}>
                  Cluster {label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Chart View + Summary */}
        {showChart && clusters.length > 0 && (
          <div className="ttc-stack-md">
            <ClusteringCharts clusters={clusters} selectedCluster={selectedCluster} />

            <div className="ttc-panel">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <h3 className="ttc-title--sm" style={{ margin: 0 }}>
                  Chart Analysis
                </h3>
                <button
                  className="ttc-button ttc-button-sm"
                  onClick={generateChartSummary}
                  disabled={isLoadingChartSummary}
                  title="Regenerate analysis"
                >
                  {isLoadingChartSummary ? "⟳" : "↻"}
                </button>
              </div>

              {isLoadingChartSummary && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#475569" }}>
                  <div className="loading-spinner" />
                  <p style={{ margin: 0 }}>Analysing clustering results...</p>
                </div>
              )}

              {chartSummaryError && (
                <div className="ttc-banner ttc-banner--error">
                  <p style={{ margin: 0 }}>Error generating analysis: {chartSummaryError}</p>
                  <button onClick={generateChartSummary} className="ttc-button ttc-button-sm">
                    Try Again
                  </button>
                </div>
              )}

              {chartSummaryData && !isLoadingChartSummary && (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, color: "#475569" }}>
                    <span>Scope: {chartSummaryData.analysis_scope}</span>
                    <span>Documents: {chartSummaryData.total_documents}</span>
                    <span>Clusters: {chartSummaryData.num_clusters}</span>
                  </div>
                  <pre className="ttc-pre">{chartSummaryData.analysis}</pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top Terms View */}
        {showTopTerms && Object.keys(topTerms).length > 0 && (
          <div className="ttc-grid ttc-grid-3-lg" style={{ gap: 16 }}>
            {Object.entries(topTerms).map(([cluster, terms]) => (
              <div key={cluster} className="ttc-panel">
                <h3 className="ttc-title--sm" style={{ color: "var(--ttc-primary)", marginTop: 0 }}>
                  Cluster {cluster}
                </h3>
                <div style={{ color: "#374151", lineHeight: 1.55 }}>{terms.join(", ")}</div>
                {themes[cluster] && (
                  <div style={{ marginTop: 8, fontWeight: 600, color: "var(--ttc-accent-foreground)" }}>
                    Suggested theme: {themes[cluster]}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Documents View */}
        {showDocuments && displayedClusters.length > 0 && (
          <div className="ttc-stack-md">
            <h2 className="ttc-title" style={{ color: "var(--ttc-primary)" }}>
              Clustered Documents
            </h2>
            <div className="ttc-stack-md">
              {displayedClusters.map((item, idx) => (
                <div key={idx} className="ttc-panel">
                  <strong style={{ color: "var(--ttc-primary)", marginRight: 6 }}>
                    Cluster {item.label}:
                  </strong>
                  <span style={{ color: "#374151" }}>{item.doc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Themes View */}
        {showThemes && (
          <div className="ttc-panel">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <h2 className="ttc-title" style={{ margin: 0 }}>
                Theme Analysis
              </h2>
              <button
                className="ttc-button ttc-button-sm"
                onClick={generateThemeAnalysis}
                disabled={isLoadingThemeAnalysis}
              >
                {isLoadingThemeAnalysis ? "Analysing..." : "Regenerate"}
              </button>
            </div>

            {isLoadingThemeAnalysis && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#475569" }}>
                <div className="loading-spinner" />
                <p style={{ margin: 0 }}>Analysing themes and topics in your document collection...</p>
              </div>
            )}

            {themeAnalysisError && (
              <div className="ttc-banner ttc-banner--error">
                <p style={{ margin: 0 }}>Error generating theme analysis: {themeAnalysisError}</p>
                <button onClick={generateThemeAnalysis} className="ttc-button ttc-button-sm">
                  Try Again
                </button>
              </div>
            )}

            {themeAnalysisData && !isLoadingThemeAnalysis && (
              <div className="ttc-stack-md">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, color: "#475569" }}>
                  <span>Data Source: {themeAnalysisData.data_source}</span>
                  <span>Total Documents: {themeAnalysisData.total_documents}</span>
                  <span>Analysed: {themeAnalysisData.documents_analysed}</span>
                  {themeAnalysisData.has_clustering_context && <span>Clustering Context: Available</span>}
                </div>
                <pre className="ttc-pre">{themeAnalysisData.analysis}</pre>
              </div>
            )}

            {!themeAnalysisData && !themeAnalysisError && !isLoadingThemeAnalysis && (
              <div className="ttc-callout">
                <p className="ttc-callout-title">Heads up</p>
                <p style={{ margin: 0 }}>
                  Theme analysis will automatically generate when you first view this tab. This analysis identifies
                  dominant themes, topics, and conceptual patterns in your document collection.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Thematic Flow View */}
        {showThematicFlow && (
          <div className="ttc-panel">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <h2 className="ttc-title" style={{ margin: 0 }}>
                Thematic Flow Analysis
              </h2>
              <button
                className="ttc-button ttc-button-sm"
                onClick={generateThematicFlow}
                disabled={isLoadingThematicFlow}
              >
                {isLoadingThematicFlow ? "Analysing..." : "Regenerate"}
              </button>
            </div>

            {isLoadingThematicFlow && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#475569" }}>
                <div className="loading-spinner" />
                <p style={{ margin: 0 }}>Analysing thematic relationships and flow patterns...</p>
              </div>
            )}

            {thematicFlowError && (
              <div className="ttc-banner ttc-banner--error">
                <p style={{ margin: 0 }}>Error generating thematic flow analysis: {thematicFlowError}</p>
                <button onClick={generateThematicFlow} className="ttc-button ttc-button-sm">
                  Try Again
                </button>
              </div>
            )}

            {thematicFlowData && !isLoadingThematicFlow && (
              <div className="ttc-stack-md">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, color: "#475569" }}>
                  <span>Data Source: {thematicFlowData.data_source}</span>
                  <span>Total Documents: {thematicFlowData.total_documents}</span>
                  <span>Analysed: {thematicFlowData.documents_analysed}</span>
                  {thematicFlowData.has_clustering_context && <span>Clustering Context: Available</span>}
                </div>
                <pre className="ttc-pre">{thematicFlowData.analysis}</pre>
              </div>
            )}

            {!thematicFlowData && !thematicFlowError && !isLoadingThematicFlow && (
              <div className="ttc-callout">
                <p className="ttc-callout-title">Quick tip</p>
                <p style={{ margin: 0 }}>
                  Thematic flow analysis will automatically generate when you first view this tab. It examines how
                  themes interconnect, develop, and flow throughout your documents.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Overused Themes View */}
        {showOverusedThemes && (
          <div className="ttc-panel">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <h2 className="ttc-title" style={{ margin: 0 }}>
                Overused/Underused Analysis
              </h2>
              <button
                className="ttc-button ttc-button-sm"
                onClick={generateOverusedThemes}
                disabled={isLoadingOverusedThemes}
              >
                {isLoadingOverusedThemes ? "Analysing..." : "Regenerate"}
              </button>
            </div>

            {isLoadingOverusedThemes && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#475569" }}>
                <div className="loading-spinner" />
                <p style={{ margin: 0 }}>Analysing patterns of overuse and underuse...</p>
              </div>
            )}

            {overusedThemesError && (
              <div className="ttc-banner ttc-banner--error">
                <p style={{ margin: 0 }}>Error generating overused themes analysis: {overusedThemesError}</p>
                <button onClick={generateOverusedThemes} className="ttc-button ttc-button-sm">
                  Try Again
                </button>
              </div>
            )}

            {overusedThemesData && !isLoadingOverusedThemes && (
              <div className="ttc-stack-md">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, color: "#475569" }}>
                  <span>Data Source: {overusedThemesData.data_source}</span>
                  <span>Total Documents: {overusedThemesData.total_documents}</span>
                  <span>Analysed: {overusedThemesData.documents_analysed}</span>
                  {overusedThemesData.has_clustering_context && <span>Clustering Context: Available</span>}
                </div>
                <pre className="ttc-pre">{overusedThemesData.analysis}</pre>
              </div>
            )}

            {!overusedThemesData && !overusedThemesError && !isLoadingOverusedThemes && (
              <div className="ttc-callout">
                <p className="ttc-callout-title">Note</p>
                <p style={{ margin: 0 }}>
                  Overused/underused analysis will automatically generate when you first view this tab. It identifies
                  repetitive patterns, overused words/phrases, and areas needing more development.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreativeClusteringAnalysis;
