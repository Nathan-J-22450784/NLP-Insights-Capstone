import React, { useEffect, useState } from "react";
import TextInputSection from "../TextInputSection";
import SensorimotorAnalyser from "./SensorimotorAnalyser";

// same tokenizer style across tools
const tokenize = (text) =>
  (text || "").toLowerCase().split(/[^a-zA-Z']+/).filter(Boolean);

// Simple overlay shown on top of the Landing page
const CrunchingOverlay = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.max(1, Math.round((100 - p) * 0.12));
        return next >= 100 ? 100 : next;
      });
    }, 120);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const t = setTimeout(onComplete, 250);
      return () => clearTimeout(t);
    }
  }, [progress, onComplete]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Crunching numbers"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
        display: "grid", placeItems: "center", zIndex: 50, backdropFilter: "blur(2px)"
      }}
      className="ttc-overlay"
    >
      <section className="ttc-panel ttc-stack-md" style={{ width: "min(92vw,640px)" }}>
        <h2 className="analysis-title">Crunching numbers…</h2>
        <p className="ttc-subtitle">Tokenising your text and priming the analysis.</p>
        <div className="ttc-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div className="ttc-progress__fill" style={{ width: `${progress}%` }} />
          <span className="progress-text">{progress}%</span>
        </div>
      </section>
    </div>
  );
};

const SensorimotorLanding = ({ onBack }) => {
  const [pastedText, setPastedText] = useState("");
  const [uploadedText, setUploadedText] = useState("");
  const [uploadedPreview, setUploadedPreview] = useState("");
  const [error, setError] = useState("");
  const [showCrunching, setShowCrunching] = useState(false);
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [pastedWordCount, setPastedWordCount] = useState(0);

  const handleTextPaste = (e) => {
    const text = e.target.value;
    setPastedText(text);
    setUploadedText(text);
    setUploadedPreview(text.split("\n").slice(0, 4).join("\n"));
    setPastedWordCount(tokenize(text).length);
  };

  const handleFilesUploaded = (combinedText) => {
    setUploadedText(combinedText);
    setUploadedPreview(combinedText.split("\n").slice(0, 4).join("\n"));
    setError("");
    setPastedWordCount(tokenize(combinedText).length);
  };

  const handleContinue = () => {
    if (!uploadedText.trim()) {
      setError("Please enter or upload some text before continuing.");
      return;
    }
    setShowCrunching(true); // stay on Landing and show overlay
  };

  const handleCrunchingComplete = () => {
    setShowCrunching(false);
    setAnalysisStarted(true);
  };

  if (analysisStarted) {
    return (
      <SensorimotorAnalyser
        words={tokenize(uploadedText)}      // privacy: send tokens only
        uploadedPreview={uploadedPreview}   // matches other tools’ UX
        onBack={() => {
          setAnalysisStarted(false);
          setShowCrunching(false);
        }}
      />
    );
  }

  return (
    <main className="ttc-page" aria-busy={showCrunching ? "true" : "false"}>
      <div className="ttc-container ttc-stack-lg">
        {/* Back */}
        <button type="button" onClick={onBack} className="ttc-button">← Back</button>

        {/* Title */}
        <section className="ttc-panel ttc-stack-md">
          <h1 className="analysis-title">Sensorimotor Analysis</h1>
          <p className="ttc-subtitle">See which senses and actions your text evokes.</p>
        </section>

        {/* Input + actions */}
        <section className="ttc-panel ttc-stack-md">
          <TextInputSection
            pastedText={pastedText}
            handleTextPaste={handleTextPaste}
            pastedWordCount={pastedWordCount}
            uploadedPreview={uploadedPreview}
            corpusPreview={""}
            error={error}
            onFilesUploaded={handleFilesUploaded}
          />

          {error && <div className="ttc-banner ttc-banner--error">{error}</div>}

          <div className="analysis-actions">
            <button
              onClick={handleContinue}
              className="analysis-button"
              disabled={!uploadedText.trim()}   // ✅ remove undefined vars
            >
              Continue to Analysis →
            </button>
          </div>
        </section>
      </div>

      {showCrunching && <CrunchingOverlay onComplete={handleCrunchingComplete} />}
    </main>
  );
};

export default SensorimotorLanding;
