import React from "react";
import { formatNumber } from "../../Utils";

const ResultsTable = ({ results = [], method = "nltk" }) => {
  if (!Array.isArray(results) || results.length === 0) return null;

  const methodUpper = method.toUpperCase();
  const isSklearn = methodUpper === "SKLEARN";
  const isGensim = methodUpper === "GENSIM";
  const isSpacy = methodUpper === "SPACY";
  const isNltk = methodUpper === "NLTK";

  // Statistics descriptions based on method
  const getStatisticsDescription = () => {
    const baseStats = {
      "Your Text Freq": "The number of times this word appears in your uploaded text",
      "Sample Freq": "The number of times this word appears in the comparison sample text"
    };

    if (isSklearn || isSpacy) {
      return {
        ...baseStats,
        "Chi² (Chi-squared)": "A statistical test that measures how much a word's frequency differs from what we'd expect by chance. Higher values indicate more significant differences.",
        "p-value": "The probability that the observed difference occurred by chance. Values below 0.05 are typically considered statistically significant."
      };
    }

    if (isGensim) {
      return {
        ...baseStats,
        "TF-IDF Score": "Term Frequency-Inverse Document Frequency score. Higher values indicate words that are frequent in your text but rare in the comparison sample."
      };
    }

    if (isNltk || isSpacy) {
      return {
        ...baseStats,
        "Effect Size": "A measure of how practically significant the difference is, regardless of sample size. Larger absolute values indicate stronger effects.",
        "Log-Likelihood": "A statistical measure of how unlikely the observed word frequency would be if both texts came from the same source. Higher values indicate more distinctive words.",
        "Keyness": "An overall measure of how characteristic or 'key' this word is to your text compared to the sample. Higher values indicate more distinctive words."
      };
    }

    return baseStats;
  };

  const statisticsDescriptions = getStatisticsDescription();

  return (
    <div className="ttc-panel ttc-stack-md">
      {/* Statistics Explanation Section */}
      <div className="ttc-callout">
        <h3 className="ttc-title--sm">Understanding Your Results</h3>
        <p className="ttc-subtitle" style={{ marginTop: 0 }}>
          This table shows words that are statistically distinctive in your text compared to a reference sample.
          Here's what each column means:
        </p>
        <div className="ttc-grid" style={{ gridTemplateColumns: "1fr", gap: "8px" }}>
          {Object.entries(statisticsDescriptions).map(([stat, description]) => (
            <div key={stat}>
              <strong>{stat}:</strong>
              <span>{description}</span>
            </div>
          ))}
        </div>
        <p className="ttc-subtitle" style={{ marginTop: "12px" }}>
          <strong>💡 Interpretation Tip:</strong> Words with higher statistical values are more characteristic of your text and may represent key themes or distinctive language patterns.
        </div>
      </div>

      {/* Results Table */}
      <h3 className="ttc-title--sm" style={{ marginTop: 0 }}>Detailed Keyword Analysis Results</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="ttc-table">
            <thead>
              <tr>
                <th>Word</th>
                <th>Your Text Freq</th>
                <th>Sample Freq</th>

                {/* Sklearn and Spacy show Chi² and p-value */}
                {(isSklearn || isSpacy) && (
                  <>
                    <th scope="col">Chi²</th>
                    <th scope="col">p-value</th>
                  </>
                )}

                {/* Gensim */}
                {isGensim && <th scope="col">TF-IDF Score</th>}

                {/* Nltk and Spacy show Effect Size / Log-Likelihood / Keyness */}
                {(isNltk || isSpacy) && (
                  <>
                    <th scope="col">Effect Size</th>
                    <th scope="col">Log-Likelihood</th>
                    <th scope="col">Keyness</th>
                  </>
                )}
              </tr>
            </thead>
                
            <tbody>
              {results.map((row, index) => {
                const word = row.word ?? "-";
                const uploaded = row.uploaded_count ?? row.uploaded_freq ?? 0;
                const sample = row.sample_count ?? row.sample_freq ?? 0;

                return (
                  <tr key={index} className={index % 2 === 0 ? "row-even" : "row-odd"}>
                    <td>{word}</td>
                    <td className="freq-cell">{uploaded}</td>
                    <td className="freq-cell">{sample}</td>

                    {(isSklearn || isSpacy) && (
                      <>
                        <td className="stat-cell">{formatNumber(row.chi2)}</td>
                        <td className="stat-cell p-value-cell">{formatNumber(row.p_value, 2)}</td>
                      </>
                    )}

                    {isGensim && (
                      <td className="stat-cell">{formatNumber(row.tfidf_score)}</td>
                    )}

                    {(isNltk || isSpacy) && (
                      <>
                        <td className="stat-cell">{formatNumber(row.effect_size)}</td>
                        <td className="stat-cell">{formatNumber(row.log_likelihood)}</td>
                        <td className="stat-cell keyness-cell">{row.keyness_score ?? "-"}</td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
      </div>
    </div>
  );
};

export default ResultsTable;
