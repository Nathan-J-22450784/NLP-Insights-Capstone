import React, { useState, useEffect } from "react";
import CreativeClusteringAnalysis from "./CreativeClusteringAnalysis";

/**
 * Lightweight progress bar for clustering analysis (uses global progress styles).
 */
const ProgressBar = ({ loading }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer;
    if (loading) {
      setProgress(0);
      timer = setInterval(() => {
        setProgress((old) => (old < 90 ? old + Math.random() * 3 : old));
      }, 200);
    } else {
      setProgress(100);
      const reset = setTimeout(() => setProgress(0), 500);
      return () => clearTimeout(reset);
    }
    return () => clearInterval(timer);
  }, [loading]);

  return (
    <div className="progress-container-wrapper">
      <div className="progress-container">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
        <div className="progress-text">{Math.floor(progress)}%</div>
      </div>
    </div>
  );
};

const ClusteringAnalyser = ({ uploadedText, onBack }) => {
  const [clusters, setClusters] = useState([]);
  const [topTerms, setTopTerms] = useState({});
  const [themes, setThemes] = useState({});
  const [numClusters, setNumClusters] = useState(null);
  const [numDocs, setNumDocs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCluster, setSelectedCluster] = useState("all");

  const parseTextDocuments = (text) => {
    if (!text) return [];
    let documents = text.split(/\n\s*\n/).filter((doc) => doc.trim());
    if (documents.length === 1) {
      documents = text.split(/\n/).filter((doc) => doc.trim());
    }
    if (documents.length === 1 && text.length > 1000) {
      documents = text.match(/[^.!?]+[.!?]+/g) || [text];
    }
    return documents.map((doc) => doc.trim()).filter((doc) => doc.length > 0);
  };

  const textDocuments = parseTextDocuments(uploadedText);

  const runAnalysis = async () => {
    if (!uploadedText) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch("http://localhost:8000/api/clustering-analysis/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: uploadedText }),
      });

      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      const data = await response.json();

      setClusters(data.clusters || []);
      setTopTerms(data.top_terms || {});
      setThemes(data.suggested_themes || {});
      setNumClusters(data.num_clusters || null);
      setNumDocs(data.num_docs || null);
      setSelectedCluster("all");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob(
      [JSON.stringify({ clusters, topTerms, themes }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "clustering_results.json";
    link.click();
  };

  return (
    <main className="ttc-page">
      <div className="ttc-container ttc-stack-lg">
        <button onClick={onBack} className="ttc-button">
          ← Back
        </button>

        <section className="ttc-panel ttc-stack-md">
          <h1 className="analysis-title">Clustering Analysis</h1>

          <div className="ttc-callout">
            <p className="ttc-subtitle">
              This analysis uses ConceptNet embeddings to discover thematic and
              conceptual connections in your writing. Text segments will be
              grouped based on semantic meaning and common-sense knowledge,
              helping you identify how different parts of your work connect on a
              conceptual level.
            </p>
          </div>

          <div className="text-center">
            <button
              onClick={runAnalysis}
              disabled={loading || !uploadedText}
              className="ttc-button"
            >
              {loading ? "Analysing..." : "Run Analysis"}
            </button>
          </div>

          {loading && <ProgressBar loading={loading} />}

          {error && (
            <div className="ttc-banner ttc-banner--error">
              <strong>Error:</strong>&nbsp;{error}
            </div>
          )}

          {!loading && !error && numClusters && numDocs && (
            <p className="ttc-subtitle">
              Automatically grouped into {numClusters} clusters based on {numDocs} text
              segments.
            </p>
          )}

          {!loading && !error && clusters.length > 0 && (
            <div className="results-section">
              <CreativeClusteringAnalysis
                clusters={clusters}
                topTerms={topTerms}
                themes={themes}
                textDocuments={textDocuments}
                selectedCluster={selectedCluster}
                onSelectCluster={setSelectedCluster}
                onDownload={handleDownload}
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default ClusteringAnalyser;
