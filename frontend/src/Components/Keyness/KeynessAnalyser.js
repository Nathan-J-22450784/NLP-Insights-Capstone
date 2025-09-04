// src/Components/KeynessAnalyser.js
import React, { useState } from "react";
import ResultsTable from "./ResultsTable";
import KeynessResultsGrid from "./KeynessResultsGrid";
import Charts from "./Charts";
import ResultsSummary from "./ResultsSummary";

const KeynessAnalyser = ({ uploadedText, uploadedPreview, corpusPreview, method, onBack }) => {
  const [comparisonResults, setComparisonResults] = useState([]);
  const [stats, setStats] = useState({ uploaded_total: 0, sample_total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysisDone, setAnalysisDone] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState("nltk");
  const [resultId, setResultId] = useState(null); // <-- store backend result ID

  // --- Perform new analysis ---
  const performAnalysis = async (method) => {
    if (!uploadedText) return;
    setLoading(true);
    setError("");
    setAnalysisDone(false);
    setSelectedMethod(method);

    try {
      const response = await fetch("http://localhost:8000/api/analyse-keyness/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploaded_text: uploadedText, method: method.toLowerCase() }),
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      // Store backend result ID
      setResultId(data.id);

      // Update state with results
      setComparisonResults(data.results || data.results.results || []);
      setStats({
  uploadedTotal: data.uploaded_total ?? uploadedText.split(/\s+/).length,
  corpusTotal: data.corpus_total ?? data.results?.corpus_total ?? 0
});


      setAnalysisDone(true);
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Analysis failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Fetch previous analysis by result ID ---
  const fetchPreviousResult = async (id) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`http://localhost:8000/api/keyness-results/${id}/`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setComparisonResults(data.results || []);
      setStats({
        uploaded_total: data.uploaded_total,
        corpus_total: data.corpus_total
      });
      setSelectedMethod(data.method);
      setAnalysisDone(true);
    } catch (err) {
      console.error("Fetch previous result error:", err);
      setError("Failed to load previous analysis: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <button
        onClick={onBack}
        className="mb-6 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded shadow"
      >
        ← Back
      </button>

      {/* Analyse Buttons */}
      <div className="text-center mb-6 flex justify-center gap-4">
        {["NLTK", "sklearn", "gensim", "spaCy"].map((m) => (
          <button
            key={m}
            onClick={() => performAnalysis(m)}
            disabled={loading || !uploadedText}
            className="btn"
          >
            Analyse with {m}
          </button>
        ))}
      </div>

      {/* Reload previous result button */}
      {resultId && (
        <div className="text-center mb-6">
          <button
            onClick={() => fetchPreviousResult(resultId)}
            disabled={loading}
            className="btn btn-secondary"
          >
            Reload Previous Analysis
          </button>
        </div>
      )}

      {loading && <p className="text-gray-500 italic">Analyzing text...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {analysisDone && (
        <>
          {/* Results Summary */}
          <ResultsSummary
            stats={stats}
            selectedMethod={selectedMethod}
            comparisonResults={comparisonResults}
          />

          {/* Significant Keywords Grid */}
          <KeynessResultsGrid
            results={comparisonResults.slice(0, 20)}
            method={selectedMethod}
          />

          {/* Charts */}
          <Charts
            results={comparisonResults}
            method={selectedMethod}
          />

          {/* Full Results Table */}
          <ResultsTable
            results={comparisonResults}
            method={selectedMethod}
          />
        </>
      )}
    </div>
  );
};

export default KeynessAnalyser;
