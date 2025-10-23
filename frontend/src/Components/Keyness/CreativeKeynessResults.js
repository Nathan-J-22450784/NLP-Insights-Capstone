import React, { useState, useMemo, useEffect, useRef } from "react";
import Charts from "./Charts";
import ResultsTable from "./ResultsTable";
import ResultsSummary from "./ResultsSummary";
// import KeynessResultsGrid from "./KeynessResultsGrid"; // unused – remove to satisfy ESLint
import { exportKeynessToXlsx } from "./ExportXlsx";

const posColors = {
  NOUN: "noun",
  VERB: "verb",
  ADJ: "adj",
  ADV: "adv",
  OTHER: "other",
};

const CreativeKeynessResults = ({
  results,
  stats,
  method,
  uploadedText,
  genre,
  onWordDetail,
  onChangeMethod,
  loading,
}) => {
  const [activeView, setActiveView] = useState("keywords");
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [chartSummaries, setChartSummaries] = useState({
    primary: { summary: "", loading: false, error: null },
    secondary: { summary: "", loading: false, error: null },
  });
  const [activeChartType, setActiveChartType] = useState("primary");

  const safeResults = Array.isArray(results) ? results : [];

  const chartData = useMemo(() => {
    if (!safeResults || safeResults.length === 0)
      return { primary: [], secondary: [] };

    const primaryData = safeResults.slice(0, 20).map((r) => ({
      label: r.word,
      value:
        r.keyness ?? r.log_likelihood ?? r.chi2 ?? r.tfidf_score ?? 0,
    }));

    const secondaryData = safeResults.slice(0, 30).map((r) => ({
      label: r.word,
      x: r.frequency || r.count || 0,
      y:
        r.keyness ?? r.log_likelihood ?? r.chi2 ?? r.tfidf_score ?? 0,
    }));

    return { primary: primaryData, secondary: secondaryData };
  }, [safeResults]);

  const fetchChartSummary = async (chartType, data, forceRefresh = false) => {
    if (chartSummaries[chartType].summary && !forceRefresh) return;

    setChartSummaries((prev) => ({
      ...prev,
      [chartType]: { ...prev[chartType], loading: true, error: null },
    }));

    try {
      const payload =
        chartType === "primary"
          ? {
              title: `${method.toUpperCase()} Keyness Analysis - Top Keywords`,
              chart_type: "bar",
              chart_data: data,
            }
          : {
              title: `${method.toUpperCase()} Keyness Analysis - Frequency vs Keyness`,
              chart_type: "scatter",
              chart_data: data,
            };

      const response = await fetch(
        "http://localhost:8000/api/summarise-keyness-chart/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const responseData = await response.json();

      setChartSummaries((prev) => ({
        ...prev,
        [chartType]: {
          summary: responseData.analysis || "No summary available.",
          loading: false,
          error: null,
        },
      }));
    } catch (err) {
      console.error(`Error fetching ${chartType} chart summary:`, err);
      setChartSummaries((prev) => ({
        ...prev,
        [chartType]: {
          summary: "",
          loading: false,
          error: `Failed to fetch ${chartType} chart summary.`,
        },
      }));
    }
  };

  const hasFetchedSummaries = useRef(false);

  useEffect(() => {
    if (activeView !== "charts" || chartData.primary.length === 0) return;
    if (hasFetchedSummaries.current) return;

    hasFetchedSummaries.current = true;
    fetchChartSummary("primary", chartData.primary);

    if (chartData.secondary.length > 0) {
      setTimeout(() => {
        fetchChartSummary("secondary", chartData.secondary);
      }, 1000);
    }
  }, [activeView]);

  useEffect(() => {
    if (chartData.primary.length > 0) {
      hasFetchedSummaries.current = false;
    }
  }, [chartData.primary.length]);

  const uploadedWordsSet = useMemo(() => {
    if (!uploadedText) return new Set();
    const matches = uploadedText.toLowerCase().match(/\b\w+\b/g);
    return new Set(matches || []);
  }, [uploadedText]);

  const posGroups = useMemo(() => {
    const groups = {};
    safeResults.forEach((r) => {
      if (!r?.word) return;
      if (!uploadedWordsSet.has(r.word.toLowerCase())) return;
      if (r.pos === "PROPN") return; // Skip proper nouns
      const pos = (r.pos || r.pos_tag || "OTHER").toUpperCase();
      if (!groups[pos]) groups[pos] = [];
      groups[pos].push(r);
    });
    return groups;
  }, [safeResults, uploadedWordsSet]);

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const response = await fetch(
        "http://localhost:8000/api/get-keyness-summary/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyness_results: results }),
        }
      );
      const data = await response.json();
      setSummary(data.summary || "No summary available");
    } catch (err) {
      setSummary("Error retrieving summary");
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === "summary" && !summary && !summaryLoading) {
      fetchSummary();
    }
  }, [activeView]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeywordClick = (w) => {
    if (!w) return;
    const wordData = safeResults.find(
      (item) => item.word?.toLowerCase() === w.word.toLowerCase()
    );
    if (wordData && onWordDetail) {
      onWordDetail({
        word: w.word,
        wordData,
        uploadedText,
        method,
        results: safeResults,
      });
    }
  };

  const handleChartTypeChange = (chartType) => {
    setActiveChartType(chartType);
    const currentChartData =
      chartType === "primary" ? chartData.primary : chartData.secondary;
    if (
      !chartSummaries[chartType].summary &&
      !chartSummaries[chartType].loading &&
      currentChartData.length > 0
    ) {
      fetchChartSummary(chartType, currentChartData);
    }
  };

  // ---------- EARLY RETURN (no results) ----------
  if (!results || Object.keys(results).length === 0) {
    return (
      <main className="ttc-page">
        <div className="ttc-container ttc-stack-lg">
          <div className="ttc-banner ttc-banner--info">
            No significant keywords found.
          </div>
        </div>
      </main>
    );
  }
  // ----------------------------------------------

  const chartDataForExport = results?.slice(0, 20).map((r) => ({
    label: r.word,
    value:
      r.keyness ?? r.log_likelihood ?? r.chi2 ?? r.tfidf_score ?? 0,
  }));

  const viewLabels = {
    keywords: "Keywords",
    charts: "Charts",
    table: "Table",
    summary: "Summary",
  };

  return (
    <main className="ttc-page">
      <div className="ttc-container ttc-stack-lg">
        {/* method strip */}
        <div className="ttc-banner ttc-banner--info ttc-flex-between">
          <span>
            Analysing with <strong>{method?.toUpperCase()}</strong>
          </span>
          <button
            onClick={() => onChangeMethod && onChangeMethod()}
            className="ttc-button ttc-button-sm"
            disabled={loading}
          >
            Change Method
          </button>
        </div>

      <div className="results-container results-summary--compact">
        <ResultsSummary
          stats={stats}
          selectedMethod={method}
          comparisonResults={safeResults}
          genre={genre}
        />
      </div> 

        {/* view toggles + download */}
        <div className="ttc-tabs">
          {Object.keys(viewLabels).map((view) => (
            <button
              key={view}
              className={`ttc-tab ${
                activeView === view ? "is-active" : ""
              }`}
              onClick={() => setActiveView(view)}
            >
              {viewLabels[view]}
            </button>
          ))}
          <button
            className="ttc-tab"
            onClick={() =>
              exportKeynessToXlsx(
                safeResults,
                method,
                stats,
                posGroups,
                [],
                chartDataForExport
              )
            }
          >
            Download XLSX
          </button>
        </div>

        {/* Summary View */}
        {activeView === "summary" && (
          <div className="keyness-summary">
            {summaryLoading
              ? "Loading summary..."
              : summary
                  .split(/\n{2,}|(?<=\.)\s+/)
                  .map((p, i) => <p key={i}>{p.trim()}</p>)}
          </div>
        )}

        {/* Keywords View */}
        {activeView === "keywords" && (
          <div className="creative-results">
            <div className="keywords-header">
              <h2>Top 50 Most Significant Keywords from Your Text</h2>
              <p>
                Click on a word to see detailed analysis including sentences,
                synonyms, and more.
              </p>
            </div>

            {Object.keys(posGroups).length === 0 ? (
              <div className="no-keywords">No significant keywords found</div>
            ) : (
              <>
                {Object.entries(posGroups).map(([pos, words]) => {
                  const posFullNames = {
                    ADV: "Adverbs",
                    NOUN: "Nouns",
                    VERB: "Verbs",
                    ADJ: "Adjectives",
                    OTHER: "Other Words",
                  };
                  const posLabel = posFullNames[pos] || pos;
                  const posKey = pos.toLowerCase();

                  return (
                    <div key={pos} className="pos-section">
                      <h3 data-pos={posKey}>{posLabel}</h3>
                      <div className="word-list">
                        {words.map((w, idx) => (
                          <span
                            key={`${w.word}-${idx}`}
                            className={`keyword keyword-pill ${
                              posColors[w.pos] || posColors.OTHER
                            }`}
                            onClick={() => handleKeywordClick(w)}
                            tabIndex={0}
                            role="button"
                            onKeyPress={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleKeywordClick(w);
                              }
                            }}
                            title={`Click for detailed analysis of "${w.word}"`}
                          >
                            {w.word}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Charts View */}
        {activeView === "charts" && (
          <div className="charts-container">
            <Charts
              results={safeResults}
              method={method}
              onChartTypeChange={handleChartTypeChange}
            />

            <div className="chart-summary-panel">
            <div className="chart-summary-header">
              <span className="chart-summary-badge" aria-hidden="true"></span>
              <h4 className="chart-summary-title">
                What this chart shows:{" "}
                {activeChartType === "primary"
                  ? "Top Keywords Chart"
                  : "Frequency vs Keyness Chart"}
        </h4>
      </div>

                 <div className="chart-summary-body">
                {chartSummaries[activeChartType].loading ? (
                  <div className="chart-summary-loading">
                    <span className="loading-spinner loading-spinner--sm" aria-hidden="true"></span>
                    <span>Analysing chart data...</span>
                  </div>
                ) : chartSummaries[activeChartType].error ? (
                  <div className="chart-summary-error">
                    <p>{chartSummaries[activeChartType].error}</p>
                    <button
                      className="ttc-button ttc-button-sm"
                      onClick={() =>
                        fetchChartSummary(
                          activeChartType,
                          activeChartType === "primary" ? chartData.primary : chartData.secondary,
                          true
                        )
                      }
                    >
                      Retry Analysis
                    </button>
                  </div>
                ) : chartSummaries[activeChartType].summary ? (
                  <div className="chart-summary-text">
                    {chartSummaries[activeChartType].summary}
                  </div>
                ) : (
                  <p className="chart-summary-empty">No analysis available yet.</p>
                )}
              </div>

                {chartSummaries[activeChartType].summary &&
                  !chartSummaries[activeChartType].loading && (
                    <div className="chart-summary-refresh">
                      <button
                        className="ttc-button ttc-button-sm"
                        onClick={() =>
                          fetchChartSummary(
                            activeChartType,
                            activeChartType === "primary" ? chartData.primary : chartData.secondary,
                            true
                          )
                        }
                      >
                        Refresh Analysis
                      </button>
                    </div>
                  )}
              </div>
            </div>
          )}

        {/* Table View */}
        {activeView === "table" && (
          <ResultsTable results={safeResults} method={method} />
        )}
      </div>
    </main>
  );
};

export default CreativeKeynessResults;
