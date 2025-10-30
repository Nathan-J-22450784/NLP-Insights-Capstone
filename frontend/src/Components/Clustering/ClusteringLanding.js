import React, { useState } from "react";
import TextInputSection from "../TextInputSection";
import ClusteringAnalyser from "./ClusteringAnalyser";
import PrivacyTile from "../PrivacyNote";

const ClusteringLanding = ({ onBack }) => {
  const [pastedText, setPastedText] = useState("");
  const [uploadedText, setUploadedText] = useState("");
  const [uploadedPreview, setUploadedPreview] = useState("");
  const [activeInput, setActiveInput] = useState("");
  const [error, setError] = useState("");
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [pastedWordCount, setPastedWordCount] = useState(0);

  const handleTextPaste = (e) => {
    const text = e.target.value;
    setPastedText(text);
    setUploadedText(text);
    setUploadedPreview(text.split("\n").slice(0, 4).join("\n"));
    setActiveInput("text");
    const words = text.trim().split(/\s+/).filter(Boolean);
    setPastedWordCount(words.length);
  };

  const handleFilesUploaded = (combinedText, files) => {
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
      <ClusteringAnalyser
        uploadedText={uploadedText}
        uploadedPreview={uploadedPreview}
        onBack={() => setAnalysisStarted(false)}
      />
    );
  }

  return (
    <main className="ttc-page">
      <div className="ttc-container ttc-stack-lg">
        
      <header className="ttc-stack-md">
          <h1 className="analysis-title">Clustering Analysis</h1>
        <p className="ttc-subtitle">
          See how your words naturally group together into clusters, highlighting the themes, styles, and repeated ideas that shape your writing.
        </p>
      </header>

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
            
          {error && (
            <div className="ttc-banner ttc-banner--error">
              {error}
            </div>
          )}

      
      <div className="analysis-actions">
            <button
              onClick={handleContinue}
              className="analysis-button"
              disabled={!uploadedText.trim()}
            >
              Continue to Analysis →
                  </button>
          </div>
        </section>
      </div>
    </main>
  );
};

export default ClusteringLanding;
