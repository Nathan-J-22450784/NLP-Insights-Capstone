import React from "react";
import { formatNumber } from "../../Utils";

const ResultsTable = ({ results = [], method = "nltk" }) => {
  if (!Array.isArray(results) || results.length === 0) return null;

  const methodUpper = method.toUpperCase();
  const isSklearn = methodUpper === "SKLEARN";
  const isGensim  = methodUpper === "GENSIM";
  const isSpacy   = methodUpper === "SPACY";
  const isNltk    = methodUpper === "NLTK";

  const getStatisticsDescription = () => {
    const base = {
      "Your Text Freq": "The number of times this word appears in your uploaded text",
      "Sample Freq": "The number of times this word appears in the comparison sample text",
    };

    if (isSklearn || isSpacy) {
      return {
        ...base,
        "Chi² (Chi-squared)":
          "A statistical test that measures how much a word's frequency differs from what we'd expect by chance. Higher values indicate more significant differences.",
        "p-value":
          "The probability that the observed difference occurred by chance. Values below 0.05 are typically considered statistically significant.",
      };
    }

    if (isGensim) {
      return {
        ...base,
        "TF-IDF Score":
          "Term Frequency-Inverse Document Frequency score. Higher values indicate words that are frequent in your text but rare in the comparison sample.",
      };
    }

    if (isNltk || isSpacy) {
      return {
        ...base,
        "Effect Size":
          "A measure of how practically significant the difference is, regardless of sample size. Larger absolute values indicate stronger effects.",
        "Log-Likelihood":
          "How unlikely the observed word frequency would be if both texts came from the same source. Higher values indicate more distinctive words.",
        "Keyness":
          "Overall measure of how characteristic this word is to your text compared to the sample. Higher values indicate more distinctive words.",
      };
    }

    return base;
  };

  const statisticsDescriptions = getStatisticsDescription();

  return (
    <div className="ttc-panel ttc-stack-md">
      {/* Explanation */}
      <div className="ttc-callout">
        <h3 className="ttc-title--sm">Understanding Your Results</h3>
        <p className="ttc-subtitle" style={{ marginTop: 0 }}>
          This table shows words that are statistically distinctive in your text compared to a reference sample.
          Here's what each column means:
        </p>
        <div className="ttc-grid" style={{ gridTemplateColumns: "1fr", gap: "8px" }}>
          {Object.entries(statisticsDescriptions).map(([stat, description]) => (
            <div key={stat}>
              <strong>{stat}:</strong> <span>{description}</span>
            </div>
          ))}
        </div>
        <p className="ttc-subtitle" style={{ marginTop: "12px" }}>
          <strong>💡 Interpretation Tip:</strong> Words with higher statistical values are more
          characteristic of your text and may represent key themes or distinctive language patterns.
        </p>
      </div>

      {/* Results table */}
      <h3 className="ttc-title--sm" style={{ marginTop: 0 }}>
        Detailed Keyword Analysis Results
      </h3>

      <div style={{ overflowX: "auto" }}>
        <table className="ttc-table">
          <thead>
            <tr>
              <th scope="col">Word</th>
              <th scope="col">Your Text Freq</th>
              <th scope="col">Sample Freq</th>

              {(isSklearn || isSpacy) && (
                <>
                  <th scope="col">Chi²</th>
                  <th scope="col">p-value</th>
                </>
              )}

              {isGensim && <th scope="col">TF-IDF Score</th>}

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
              const word     = row.word ?? "-";
              const uploaded = row.uploaded_count ?? row.uploaded_freq ?? 0;
              const sample   = row.sample_count ?? row.sample_freq ?? 0;

              return (
                <tr key={index} className={index % 2 === 0 ? "ttc-row-even" : "ttc-row-odd"}>
                  <td>{word}</td>
                  <td className="ttc-cell--freq">{uploaded}</td>
                  <td className="ttc-cell--freq">{sample}</td>

                  {(isSklearn || isSpacy) && (
                    <>
                      <td className="ttc-cell--stat">{formatNumber(row.chi2)}</td>
                      <td className="ttc-cell--stat ttc-cell--pval">{formatNumber(row.p_value, 2)}</td>
                    </>
                  )}

                  {isGensim && <td className="ttc-cell--stat">{formatNumber(row.tfidf_score)}</td>}

                  {(isNltk || isSpacy) && (
                    <>
                      <td className="ttc-cell--stat">{formatNumber(row.effect_size)}</td>
                      <td className="ttc-cell--stat">{formatNumber(row.log_likelihood)}</td>
                      <td className="ttc-cell--key">{row.keyness_score ?? "-"}</td>
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
