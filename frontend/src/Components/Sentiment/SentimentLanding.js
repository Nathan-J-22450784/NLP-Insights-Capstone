import React, { useState, useEffect } from "react";
import TextInputSection from "../TextInputSection";
import SentimentAnalyser from "./SentimentAnalyser";
import PrivacyTile from "../PrivacyNote";

const SentimentLanding = ({ onBack, genre }) => {
  const [pastedText, setPastedText] = useState("");
  const [uploadedText, setUploadedText] = useState("");
  const [uploadedPreview, setUploadedPreview] = useState("");
  const [activeInput, setActiveInput] = useState("");
  const [error, setError] = useState("");
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [pastedWordCount, setPastedWordCount] = useState(0);

  const handleTextPaste = (e) => {
    const text = e.target.value || "";
    setPastedText(text);
    setUploadedText(text);
    setUploadedPreview(text.split("\n").slice(0, 4).join("\n"));
    setActiveInput("text");
    setPastedWordCount(text.trim().split(/\s+/).filter(Boolean).length);
  };

  const handleFilesUploaded = (combinedText) => {
    setUploadedText(combinedText);
    setUploadedPreview(combinedText.split("\n").slice(0, 4).join("\n"));
    setActiveInput("file");
    setError("");
  };

  const handleContinue = () => {
    if (!uploadedText.trim()) {
      setError("Please enter or upload some text before continuing.");
      return;
    }
    setAnalysisStarted(true);
  };

  if (analysisStarted) {
    return (
      <SentimentAnalyser
        uploadedText={uploadedText}
        uploadedPreview={uploadedPreview}
        onBack={() => setAnalysisStarted(false)}
        genre={genre}
      />
    );
  }

  return (
    <main className="ttc-page">
      <div className="ttc-container ttc-stack-lg">
        
        {/* Title */}
        <section className="ttc-panel ttc-stack-md">
          <h1 className="analysis-title">Sentiment Analysis</h1>
          <p className="ttc-subtitle">
            Paste text or upload a file; we’ll analyze the overall sentiment and highlights.
          </p>
        </section>

        {/* Input + actions */}
        <section className="ttc-panel ttc-stack-md">
          <TextInputSection
            pastedText={pastedText}
            handleTextPaste={handleTextPaste}
            pastedWordCount={pastedWordCount}
            uploadedPreview={uploadedPreview}
            error={error}
            onFilesUploaded={handleFilesUploaded}
          />

         <PrivacyTile />

          {error && <div className="ttc-banner ttc-banner--error">{error}</div>}

          <div className="analysis-actions">
            <button onClick={handleContinue} className="analysis-button">
              Continue to Analysis →
            </button>
          </div>
        </section>
      </div>
    </main>
  );
};

export default SentimentLanding;
