import React, { useState, useEffect } from "react";
import TextInputSection from "../TextInputSection";
import SentimentAnalyser from "./SentimentAnalyser";

const SentimentLanding = ({ onBack, genre }) => {
    const [pastedText, setPastedText] = useState("");
    const [uploadedText, setUploadedText] = useState("");
    const [uploadedPreview, setUploadedPreview] = useState("");
    const [activeInput, setActiveInput] = useState("");
    const [error, setError] = useState("");
    const [analysisStarted, setAnalysisStarted] = useState(false);
    const [corpusPreview, setCorpusPreview] = useState("");
    const [pastedWordCount, setPastedWordCount] = useState(0);

    useEffect(() => {
        const fetchCorpusPreview = async () => {
            try {
                const url = genre
                    ? `http://localhost:8000/api/corpus-preview/?name=${encodeURIComponent(genre)}`
                    : "http://localhost:8000/api/corpus-preview/";
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setCorpusPreview((data.preview || "").split("\n").slice(0, 4).join("\n"));
            } catch (err) {
                console.error(err);
            }
        };
        fetchCorpusPreview();
    }, [genre]);

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
            <SentimentAnalyser
                uploadedText={uploadedText}
                uploadedPreview={uploadedPreview}
                corpusPreview={corpusPreview}
                onBack={() => setAnalysisStarted(false)}
                genre={genre}
            />
        );
    }

    return (
        <main className="ttc-page">
      <div className="ttc-container ttc-stack-lg">
        {/* Back */}
        <button onClick={onBack} className="ttc-button">← Back</button>

            {/* Title + intro */}
        <section className="ttc-panel ttc-stack-md">
          <h1 className="analysis-title">Sentiment Analysis</h1>

            <section className="ttc-panel ttc-stack-md">
                <TextInputSection
                    pastedText={pastedText}
                    handleTextPaste={handleTextPaste}
                    pastedWordCount={pastedWordCount}
                    uploadedPreview={uploadedPreview}
                    corpusPreview={corpusPreview}
                    error={error}
                    onFilesUploaded={handleFilesUploaded}
                />

                {/* Actions */}
          <div className="analysis-actions">
            <button
              onClick={handleContinue}
              className="analysis-button"
              disabled={!uploadedText.trim()}
            >Continue to Analysis →
                   </button>
          </div>
        </section>
      </div>
    </main>
  );
};

export default SentimentLanding;
