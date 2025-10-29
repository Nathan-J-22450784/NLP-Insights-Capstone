import React from "react";

const HowItWorksCard = {
  keyness: (
    <>
      <p>Keyness highlights words unusually frequent in your <em>Target</em> text compared to a <em>Reference</em> corpus.</p>
      <ul>
        <li><strong>Target</strong> = the text you want to study.</li>
        <li><strong>Reference</strong> = the baseline for comparison.</li>
        <li>Higher effect size ⇒ stronger “keyness”.</li>
      </ul>
    </>
  ),

  sentiment: (
    <>
      <p>Sentiment analysis estimates overall polarity and subjectivity in your text.</p>
      <ul>
        <li><strong>Polarity</strong>: negative → positive scale.</li>
        <li><strong>Subjectivity</strong>: fact → opinion scale.</li>
        <li>Best on paragraphs or longer passages.</li>
      </ul>
    </>
  ),

  clustering: (
    <>
      <p>Clustering groups similar passages/segments to reveal recurring themes.</p>
      <ul>
        <li>Upload multiple texts or one long text split into chunks.</li>
        <li>We compute embeddings and cluster them by similarity.</li>
        <li>Use labels + tooltips to inspect representative snippets.</li>
      </ul>
    </>
  ),

  sensorimotor: (
    <>
      <p>Sensorimotor lexicon scores words for imagery tied to senses and actions.</p>
      <ul>
        <li>See which senses (vision, sound, touch, taste, smell) dominate.</li>
        <li>Compare passages or authors for style differences.</li>
        <li>Great for creative editing and stylistic feedback.</li>
      </ul>
    </>
  ),
};

export default HowItWorksCard;
