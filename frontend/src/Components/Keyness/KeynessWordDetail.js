import React, { useState, useEffect } from "react";

const ProgressBar = ({ loading }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        let interval;
        if (loading) {
            setProgress(0);
            interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 95) return prev;
                    return prev + Math.random() * 5;
                });
            }, 150);
        } else {
            setProgress(100);
            const timeout = setTimeout(() => setProgress(0), 500);
            return () => clearTimeout(timeout);
        }

        return () => clearInterval(interval);
    }, [loading]);

    return (
        <div className="progress-container" style={{ width: "100%", maxWidth: "100%" }}>
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            <div className="progress-text">{Math.round(progress)}%</div>
        </div>
    );
};

const KeynessWordDetail = ({
    word,
    wordData,
    uploadedText,
    method,
    onBack
}) => {
    const [activeTab, setActiveTab] = useState("wordData");
    const [sentences, setSentences] = useState([]);
    const [loadingSentences, setLoadingSentences] = useState(false);
    const [synonymsAnalysis, setSynonymsAnalysis] = useState("");
    const [conceptsAnalysis, setConceptsAnalysis] = useState("");
    const [loadingSynonyms, setLoadingSynonyms] = useState(false);
    const [loadingConcepts, setLoadingConcepts] = useState(false);

    const methodUpper = method?.toUpperCase() || "";
    const isSklearn = methodUpper === "SKLEARN";
    const isGensim = methodUpper === "GENSIM";
    const isSpacy = methodUpper === "SPACY";
    const isNltk = methodUpper === "NLTK";

    if (!wordData) {
        return (
            <div className="ttc-page">
        <div className="ttc-container ttc-stack-lg">
          <div className="ttc-panel">
            <h3 className="ttc-title--sm">Loading word details...</h3>
                        <ProgressBar loading={true} />
                    </div>
                </div>
            </div>
        );
    }

    // Fetch sentences
    const fetchSentences = async () => {
        if (sentences.length > 0) return;
        setLoadingSentences(true);
        try {
            const response = await fetch("http://localhost:8000/api/get-sentences/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uploaded_text: uploadedText, word }),
            });
            const data = await response.json();
            setSentences(data.sentences || []);
        } catch (err) {
            console.error(err);
            setSentences([]);
        } finally {
            setLoadingSentences(false);
        }
    };

    // Fetch synonym analysis
    const fetchSynonyms = async () => {
        if (synonymsAnalysis) return;
        setLoadingSynonyms(true);
        try {
            const response = await fetch("http://localhost:8000/api/get-synonyms/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ word }),
            });
            const data = await response.json();
            setSynonymsAnalysis(data.analysis || "No analysis available");
        } catch (err) {
            console.error(err);
            setSynonymsAnalysis("Error fetching synonyms.");
        } finally {
            setLoadingSynonyms(false);
        }
    };

    // Fetch concepts analysis
    const fetchConcepts = async () => {
        if (conceptsAnalysis) return;
        setLoadingConcepts(true);
        try {
            const response = await fetch("http://localhost:8000/api/get-concepts/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ word, uploaded_text: uploadedText }),
            });
            const data = await response.json();
            setConceptsAnalysis(data.analysis || "No analysis available");
        } catch (err) {
            console.error(err);
            setConceptsAnalysis("Error fetching concepts.");
        } finally {
            setLoadingConcepts(false);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === "sentences") fetchSentences();
        if (tab === "alternateWords") fetchSynonyms();
        if (tab === "concepts") fetchConcepts();
    };

    const highlightWord = (sentence, targetWord) => {
        if (!targetWord) return sentence;
        const escapedWord = targetWord.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(
            `\\b(${escapedWord})(?!')\\b`,
            "gi"
        );
        const parts = [];
        let lastIndex = 0;
        sentence.replace(regex, (match, _, offset) => {
            if (offset > lastIndex) parts.push(sentence.slice(lastIndex, offset));
            parts.push(<mark key={offset}>{match}</mark>);
            lastIndex = offset + match.length;
        });
        if (lastIndex < sentence.length) parts.push(sentence.slice(lastIndex));
        return parts;
    };

    // Determine method explanation
    const getMethodExplanation = () => {
        if (methodUpper === "SKLEARN") return {
            title: "Chi-Square Analysis Results",
            description: "These keywords show the strongest statistical association with your text using chi-square testing.",
            focus: "Look for words with high Chi² values and low p-values (< 0.05) for the most significant keywords.",
            icon: "🔬"
        };
        if (methodUpper === "GENSIM") return {
            title: "TF-IDF Analysis Results",
            description: "These keywords are identified as distinctive using Term Frequency-Inverse Document Frequency scoring.",
            focus: "Higher TF-IDF scores indicate words frequent in your text but rare in the comparison sample.",
            icon: "📈"
        };
        if (methodUpper === "SPACY") return {
            title: "Multi-Method Analysis Results",
            description: "These keywords combine multiple statistical measures to identify the most distinctive words in your text.",
            focus: "Consider words with high keyness scores and significant statistical values across multiple measures.",
            icon: "🧠"
        };
        return {
            title: "Log-Likelihood Analysis Results",
            description: "These keywords show the strongest statistical distinctiveness using log-likelihood testing.",
            focus: "Higher keyness and log-likelihood values indicate more distinctive words in your text.",
            icon: "📊"
        };
    };

    const methodInfo = getMethodExplanation();

    const viewLabels = {
        wordData: "📊 Word Data",
        sentences: "📝 Sentences",
        alternateWords: "🔄 Alternate Words",
        concepts: "💡 Concepts"
    };

    // // Placeholder tab content
    // const renderPlaceholder = (tabName) => (
    //     <div className="tab-content">
    //         <h3>{tabName}</h3>
    //         <div style={{
    //             padding: "3rem",
    //             textAlign: "center",
    //             background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
    //             borderRadius: "16px",
    //             border: "2px dashed #cbd5e1",
    //             margin: "2rem 0"
    //         }}>
    //             <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚧</div>
    //             <h4 style={{ color: "#64748b", marginBottom: "0.5rem" }}>Coming Soon</h4>
    //             <p style={{ color: "#94a3b8" }}>This functionality is currently under development and will be available in a future update.</p>
    //         </div>
    //     </div>
    // );

    // Empty state for sentences
    const renderEmptyState = (type, icon = "🔍") => (
        <div className="ttc-panel ttc-center ttc-stack-md">
        <div style={{ fontSize: "2rem" }}>{icon}</div>
            <h4 className="ttc-title--sm" style={{ margin: 0 }}>No {type} Found</h4>
            <p className="ttc-sub" style={{ margin: 0 }}>We couldn't find any {type.toLowerCase()} for this word in the current text.</p>
        </div>
    );

    return (
        <div className="ttc-page">
          <div className="ttc-container ttc-stack-lg">
            <h1 className="analysis-title">Keyword Analysis: "{word}"
            </h1>

            {/* Main View Toggle Buttons */}
            <div className="ttc-tabs">
                {Object.keys(viewLabels).map((view) => (
                    <button
                        key={view}
                        className={`ttc-tab ${activeTab === view ? "is-active" : ""}`}
                        onClick={() => handleTabChange(view)}
                    >
                        {viewLabels[view]}
                    </button>
                ))}
            </div>

            {/* Word Data */}
                {activeTab === "wordData" && (
                    <h2 className="analysis-title">
                            {methodInfo.icon} Word Detail: {word}
                        </h2>

                        {/* Method Explanation */}
                        <div className="ttc-callout">
                          <div className="ttc-callout-title">{methodInfo.title}</div>
                          <p className="ttc-sub" style={{margin:0}}>{methodInfo.description}</p>
                          <div style={{marginTop:8}}>
                                <strong>💡 What to look for:</strong> {methodInfo.focus}
                            </div>
                        </div>

                        <div className="ttc-panel ttc-stack-md">
                            <div className="ttc-flex-between">
                                <h4 className="ttc-title--sm" style={{margin:0}}>{wordData.word}</h4>
                                <div className="corpus-button" aria-label="Part of speech">
                                    {wordData.pos || wordData.pos_tag || "Unknown POS"}
                                </div>
                            </div>

                            <div className="results-summary" style={{margin:0}}>
                                <div className="stats-grid">
                                {/* --- sklearn --- */}
                                {isSklearn && (
                                    <>
                                         <div className="stat-card">
                                            <span className="stat-label">📄 Your Text:</span>
                                            <div className="stat-number">
                                                {wordData.uploaded_count ?? wordData.count_a}
                                            </span>
                                        </div>
                                        <div className="stat-card">
                                            <span className="stat-label">📚 Corpus:</span>
                                            <span className="stat-number">
                                                {wordData.sample_count ?? wordData.count_b}
                                            </span>
                                        </div>
                                        <div className="stat-card">
                                            <span className="stat-label">🔬 Chi²:</span>
                                            <span className="stat-number">
                                                {wordData.chi2?.toFixed(3)}
                                            </span>
                                        </div>
                                        <div className="stat-card">
                                            <span className="stat-label">📈 P-Value:</span>
                                            <span className="stat-number">
                                                {wordData.p_value?.toExponential(2)}
                                            </span>
                                        </div>
                                    </>
                                )}

                                {/* --- gensim --- */}
                                {isGensim && (
                                    <>
                                        <div className="stat-card">
                                            <span className="stat-label">📄 Your Text:</span>
                                            <span className="stat-number">
                                                {wordData.uploaded_count}
                                            </span>
                                        </div>
                                        <div className="stat-card">
                                            <span className="stat-label">📚 Corpus:</span>
                                            <span className="stat-number">{wordData.sample_count}</span>
                                        </div>
                                        <div className="stat-card">
                                            <span className="stat-label">📊 TF-IDF:</span>
                                            <span className="stat-number">
                                                {wordData.tfidf_score?.toFixed(3)}
                                            </span>
                                        </div>
                                    </>
                                )}

                                {/* --- spacy --- */}
                                {isSpacy && (
                                    <>
                                        <div className="stat-card">
                                            <span className="stat-label">📄 Your Text:</span>
                                            <span className="stat-number">
                                                {wordData.uploaded_count ?? wordData.count_a}
                                            </span>
                                        </div>
                                        <div className="stat-card">
                                            <span className="stat-label">📚 Corpus:</span>
                                            <span className="stat-number">
                                                {wordData.sample_count ?? wordData.count_b}
                                            </span>
                                        </div>
                                        {wordData.chi2 !== undefined && (
                                            <div className="stat-card">
                                                <span className="stat-label">🔬 Chi²:</span>
                                                <span className="stat-number">
                                                    {wordData.chi2?.toFixed(3)}
                                                </span>
                                            </div>
                                        )}
                                        {wordData.p_value !== undefined && (
                                            <div className="stat-card">
                                                <span className="stat-label">📈 P-Value:</span>
                                                <span className="stat-number">
                                                    {wordData.p_value?.toExponential(2)}
                                                </span>
                                            </div>
                                        )}
                                        {wordData.tfidf_score !== undefined && (
                                            <div className="stat-card">
                                                <span className="stat-label">📊 TF-IDF:</span>
                                                <span className="stat-number">
                                                    {wordData.tfidf_score?.toFixed(3)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="stat-card">
                                            <span className="stat-label">📉 Log-Likelihood:</span>
                                            <span className="stat-number">
                                                {wordData.log_likelihood}
                                            </span>
                                        </div>
                                        <div className="stat-card">
                                            <span className="stat-label">⚡ Effect Size:</span>
                                            <span className="stat-number">{wordData.effect_size}</span>
                                        </div>
                                        <div className="stat-card">
                                            <span className="stat-label">🎯 Keyness:</span>
                                            <span className="stat-number">{wordData.keyness_score}</span>
                                        </div>
                                    </>
                                )}

                                {/* --- nltk --- */}
                                {isNltk && (
                                    <>
                                        <div className="stat-card">
                                            <span className="stat-label">📉 Log-Likelihood:</span>
                                            <span className="stat-number">
                                                {wordData.log_likelihood}
                                            </span>
                                        </div>
                                        <div className="stat-card">
                                            <span className="stat-label">📄 Your Text:</span>
                                            <span className="stat-number">
                                                {wordData.uploaded_count ?? wordData.count_a}
                                            </span>
                                        </div>
                                        <div className="stat-card">
                                            <span className="stat-label">📚 Corpus:</span>
                                            <span className="stat-number">
                                                {wordData.sample_count ?? wordData.count_b}
                                            </span>
                                        </div>
                                        <div className="stat-card">
                                            <span className="stat-label">⚡ Effect Size:</span>
                                            <span className="stat-number">{wordData.effect_size}</span>
                                        </div>
                                        <div className="stat-card">
                                            <span className="stat-label">🎯 Keyness:</span>
                                            <span className="stat-number">{wordData.keyness_score}</span>
                                            </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </section>
                            )}

                {/* Sentences */}
                {activeTab === "sentences" && (
                    <section className="ttc-stack-md">
    <h3 className="ttc-title--sm">📝 Sentences containing "{word}"</h3>
                        {loadingSentences ? (
                            <div className="ttc-center ttc-stack-md">
                                <p className="ttc-sub" style={{ textAlign: "center", marginBottom: 0 }}>
                                    Finding sentences containing "{word}"...
                                </p>
                                <ProgressBar loading={true} />
                            </div>
                        ) : sentences.length > 0 ? (
                            <div>
                                <div className="ttc-stack-md">
                                  <div className="ttc-banner ttc-banner--info">
                                    Found {sentences.length} sentence{sentences.length !== 1 ? 's' : ''} containing "<strong>{word}</strong>":
                                </div>
                                <ul className="ttc-stack-md" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                    {sentences.map((s, idx) => (
                                        <li key={idx} className="ttc-panel">{highlightWord(s, word)}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            renderEmptyState("sentences", "📝")
                        )}
                    </div>
                )}

                {/* Alternate Words */}
                {activeTab === "alternateWords" && (
                    <section className="ttc-stack-md">
                    <h3 className="ttc-title--sm">🔄 Alternate Words for "{word}"</h3>
                        {loadingSynonyms ? (
                            <div className="ttc-center ttc-stack-md">
                                <p className="ttc-sub" style={{ textAlign: "center", marginBottom: 0 }}>
                                    Analysing alternate words and synonyms for "{word}"...
                                </p>
                                <ProgressBar loading={true} />
                            </div>
                        ) : synonymsAnalysis ? (
                            <div className="ttc-panel" style={{ maxHeight: "65vh", overflowY: "auto" }}>
                                <div className="chart-summary-text">
                                {synonymsAnalysis}
                            </div>
                        ) : (
                            renderEmptyState("alternate words", "🔄")
                        )}
                    </section>
                )}

                {/* Concepts */}
                {activeTab === "concepts" && (
                    <section className="ttc-stack-md">
                      <h3 className="ttc-title--sm">💡 Concepts related to "{word}"</h3>
                        
                         {loadingConcepts ? (
                            <div className="ttc-center ttc-stack-md">
                                <p className="ttc-sub" style={{ textAlign: "center", marginBottom: 0 }}>
                                    Analysing concepts and themes related to "{word}"...
                                </p>
                                <ProgressBar loading={true} />
                            </div>
                        ) : conceptsAnalysis ? (
                            <div className="ttc-panel" style={{ maxHeight: "65vh", overflowY: "auto" }}>
                               <div className="chart-summary-text">
                                {conceptsAnalysis}
                            </div>
                        ) : (
                            renderEmptyState("concepts", "💡")
                        )}
                    </section>
                )}

                {/* Back Button */}
                <div className="analysis-actions">
                  <button
                    className="ttc-button"
                    onClick={() => {
                        console.log("Back clicked, current wordData:", wordData);
                        onBack();
                    }}
                >
                    ← Back to all keywords
                </button>
        </div>
      </div>
    </div>
  );
};

export default KeynessWordDetail;
