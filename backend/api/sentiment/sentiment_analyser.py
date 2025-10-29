"""
sentiart_analyser.py

This file does the sentiment analysis.

It takes a text, splits it into tokens (words + simple emoticons), looks up those
tokens in our CSV dictionary (sentiart_lexicon.csv), and then calculates:

- Overall average positivity/negativity ("sentiment_score_mean")
- Separate "polarity" (direction: negative / neutral / positive) vs "magnitude" (strength)
- Average emotion strengths for 5 emotions (joy, sadness, anger, fear, disgust)
- Which words contribute most to the sentiment (positive and negative)
- Which words are top examples for each emotion
- Diagnostics for interpretability: coverage (how many tokens matched the lexicon),
  standard deviation of token scores (variability), and top "out-of-vocabulary" words

Design goals:
- Keep dependencies minimal (csv, re, collections, pathlib, unicodedata) so this file
  can run anywhere Python runs.
- Be fast across repeated calls by caching the lexicon in memory and reusing it unless
  the CSV file changes on disk (mtime check).
- Remain transparent and explainable: every aggregate is the sum/average of per-token
  values you can inspect in the "tokens" list in the return object.

NOTE on CSV structure (expected columns):
  word,sentiment_score,joy,sadness,anger,fear,disgust
The loader is defensive: missing/invalid numeric fields become 0.0.
"""

# ──────────────────────────────────────────────────────────────────────────────
# IMPORTS
# ──────────────────────────────────────────────────────────────────────────────
from pathlib import Path          # Path handling that works on all OSes
import csv                        # CSV reading with DictReader for named columns
import re                         # Regular expressions for tokenization
import unicodedata                # Unicode normalization to clean fancy punctuation
from math import sqrt             # Only need sqrt for standard deviation
from collections import Counter, defaultdict   # Frequency counting and default 0.0 dict
from typing import Dict, List, Tuple           # Type hints for clarity (optional)

# ──────────────────────────────────────────────────────────────────────────────
# CONSTANTS / CONFIG
# ──────────────────────────────────────────────────────────────────────────────

# Where the lexicon CSV lives. We compute it relative to THIS file so importing
# from other working directories still finds the CSV as long as it sits next to
# the script. This avoids surprises with cwd().
LEXICON_PATH = Path(__file__).resolve().parent / "sentiart_lexicon.csv"

# These emotion column names are the "canonical five" for our analyser. If you add
# more emotions to the CSV later, add the new headers here as well.
EMOTIONS = ["joy", "sadness", "anger", "fear", "disgust"]

# Context cues for simple composition
NEGATORS = {"not", "no", "never", "n't", "without", "hardly", "scarcely", "barely"}
INTENSIFIERS = {
    "extremely": 2.0, "very": 1.5, "really": 1.2, "quite": 1.2, "so": 1.2, "too": 1.2,
    "slightly": 0.8, "somewhat": 0.85, "hardly": 0.7, "barely": 0.7
}
NEGATION_WINDOW = 3   # how many tokens back a negator can influence
INTENS_WINDOW   = 2   # how many tokens back an intensifier can influence

# Tokenization:
# - WORD_PATTERN tries to catch "word-like" sequences:
#   - must start with a letter or digit (so we don't capture stray punctuation)
#   - can continue with letters/digits/apostrophes/hyphens including curly quotes
#   - examples matched: "don't", "rock-n-roll", "O’Reilly", "naïve", "2024"
#   Why ASCII classes here and not full \p{L}? Standard 're' doesn't support it.
#   We instead normalize to NFKC so many fancy characters fold to basic forms,
#   and allow digits plus ASCII letters. This keeps dependency-free and robust.
WORD_PATTERN = re.compile(r"[A-Za-z0-9][A-Za-z0-9'’-]*")

# Simple ASCII emoticons (not full emoji handling) — we pre-extract these so that
# tokenization won't eat them. This small list is easy to expand. Each emoticon
# tends to carry clear sentiment and is common in casual text.
EMOTICON_PATTERN = re.compile(r"(:\)|:\(|:D|:P|;\)|:\/|:-\)|:-\(|:'\(|<3)")

# Common function words and contraction fragments to exclude from OOV display
STOPWORDS = {
    "a","an","and","the","of","to","in","on","for","with","at","by","from","as",
    "that","this","it","is","are","was","were","be","been","being","do","does","did",
    "but","or","if","then","so","than","very","can","could","should","would","will",
    "just","not","no","nor","you","your","yours","i","me","my","we","our","they","their",
    "he","she","his","her","them","who","whom","which","what","when","where","why","how",
    "also","into","over","under","again","more","most","such","only","own","same",
    # common contraction shards
    "s","t","d","ll","m","o","re","ve","y"
}


# ──────────────────────────────────────────────────────────────────────────────
# LEXICON CACHE (module-level singletons)
# ──────────────────────────────────────────────────────────────────────────────
# We keep the lexicon dictionary in memory after the first load, and also remember
# the file's modification time. If the file hasn't changed, we skip re-reading it.
# This is a simple, safe optimization for repeated calls (e.g. in a web server).
_LEXICON_CACHE: Dict[str, Dict[str, float]] = {}
_LEXICON_MTIME: float = -1.0


# ──────────────────────────────────────────────────────────────────────────────
# STEP 1: TEXT NORMALIZATION & TOKENIZATION
# ──────────────────────────────────────────────────────────────────────────────
def normalize_text(text: str) -> str:
    """
    Normalize Unicode text so tokens are consistent.

    - Ensures input is a string (str())
    - Applies NFKC normalization, which:
        * de-composes + re-composes characters into a canonical form
        * folds some "fancy" punctuation into simpler equivalents where applicable
      Why: this reduces weird cases like multiple forms of apostrophes or width variants.
    """
    if not isinstance(text, str):
        # If someone passes bytes, numbers, or some object with __str__, we convert.
        text = str(text)
    # Normalize to NFKC to unify visually-similar Unicode characters.
    text = unicodedata.normalize("NFKC", text)
    return text


def tokenize(text: str) -> List[str]:
    """
    Convert raw text into a list of tokens suitable for lexicon lookup.

    What we do:
      1) Normalize Unicode (NFKC) so punctuation is consistent.
      2) Extract "emoticons" FIRST and surround them with spaces, so later regex
         doesn't swallow or split them weirdly. We then keep them as separate tokens.
      3) Find word-like tokens via WORD_PATTERN (letters/digits + optional ' or -).
      4) Casefold ALL tokens (casefold() is stronger than lower() for Unicode).
      5) Return combined list: words + emoticons.

    Note: The order of tokens returned is not strictly the original order — because
    we gather words then add emoticons — but for our aggregate statistics this is OK.
    If you need strict order (e.g., sentence position), collect indices during matching.
    """
    # 1) Normalize text
    text = normalize_text(text)

    # 2) Extract emoticons and pad with spaces so later token search won't break them.
    # We find all emoticons, then insert spaces around each match starting from the end
    # of the string so that earlier insertions don't change the indices of later spans.
    emoticons = list(EMOTICON_PATTERN.finditer(text))
    for m in reversed(emoticons):
        start, end = m.span()
        # Insert spaces around the emoticon: "...X:)" -> "...X :) "
        text = text[:start] + " " + text[start:end] + " " + text[end:]

    # 3) Extract "word" tokens (letters/digits with optional internal ' or -)
    words = WORD_PATTERN.findall(text)

    # 4) Keep emoticons as tokens (the matched string itself)
    emo_tokens = [m.group(0) for m in emoticons]

    # 5) Combine sets. For strict order, you'd sort by original indices; not required here.
    all_tokens = words + emo_tokens

    # 6) Casefold tokens to improve matching against lexicon entries regardless of case.
    # Casefold example: "Straße".lower() -> "straße", "Straße".casefold() -> "strasse"
    # which is often what you want for matching.
    return [t.casefold() for t in all_tokens]


# ──────────────────────────────────────────────────────────────────────────────
# STEP 2: LEXICON LOADING (with caching and defensive parsing)
# ──────────────────────────────────────────────────────────────────────────────
def _parse_float(value: str) -> float:
    """
    Convert a CSV field to float, defaulting to 0.0 on any error or blank.

    Why: We don't want the analyser to crash on a malformed row; we prefer to
    degrade gracefully and keep going. Logging could be added if you want to
    count or inspect bad rows.
    """
    try:
        return float(value)
    except Exception:
        return 0.0


def load_lexicon() -> Dict[str, Dict[str, float]]:
    """
    Load the sentiment lexicon from CSV into a dictionary keyed by token.

    Returns:
      A dictionary of:
        {
          "word": {
             "sentiment_score": float,
             "joy": float,
             "sadness": float,
             "anger": float,
             "fear": float,
             "disgust": float
          },
          ...
        }

    Caching:
      - Uses module-level _LEXICON_CACHE and _LEXICON_MTIME.
      - If LEXICON_PATH's modification time hasn't changed since last load,
        we return the in-memory cache.
      - Otherwise, we parse the CSV and refresh the cache.

    Failure handling:
      - If the file isn't found, returns an empty dict (no crash).
    """
    global _LEXICON_CACHE, _LEXICON_MTIME

    path = LEXICON_PATH

    # Get file modification time; if the file is missing, return an empty lexicon.
    try:
        mtime = path.stat().st_mtime
    except FileNotFoundError:
        _LEXICON_CACHE = {}
        _LEXICON_MTIME = -1.0
        return _LEXICON_CACHE

    # If we have a cache and the file hasn't changed, reuse it.
    if _LEXICON_CACHE and _LEXICON_MTIME == mtime:
        return _LEXICON_CACHE

    # Otherwise, parse the CSV fresh.
    lexicon: Dict[str, Dict[str, float]] = {}
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        # DictReader yields each row as a dict keyed by column names.
        # Missing columns will yield None; _parse_float handles that.
        for row in reader:
            # Normalize and validate the "word" field
            word = (row.get("word") or "").strip()
            if not word:
                # Skip empty "word" entries rather than inserting blanks
                continue

            # Build the numeric entry. Missing/invalid values become 0.0, which is safe.
            entry = {
                "sentiment_score": _parse_float(row.get("sentiment_score", "0")),
                "joy": _parse_float(row.get("joy", "0")),
                "sadness": _parse_float(row.get("sadness", "0")),
                "anger": _parse_float(row.get("anger", "0")),
                "fear": _parse_float(row.get("fear", "0")),
                "disgust": _parse_float(row.get("disgust", "0")),
            }

            # Casefold the key so lookups are case-insensitive and Unicode-friendly.
            lexicon[word.casefold()] = entry

    # Refresh cache + mtime
    _LEXICON_CACHE = lexicon
    _LEXICON_MTIME = mtime
    return _LEXICON_CACHE


# ──────────────────────────────────────────────────────────────────────────────
# STEP 3: ANALYSIS
# ──────────────────────────────────────────────────────────────────────────────

def analyze_text(text: str) -> dict:
    """
    Main entry point for callers.

    Returns the same shape as before. Key semantics:
    - sentiment_score (per token): raw lexicon rating (unchanged)
    - contribution (per token): context-adjusted sum over occurrences
      (negation flips sign; intensifiers/downtoners scale weight)
    """
    # Tokenize input. total_tokens is all tokens we saw; some may be OOV (unknown).
    tokens = tokenize(text)
    total_tokens = len(tokens)

    # Load (or reuse) the lexicon from CSV; caching makes this fast if repeated.
    lexicon = load_lexicon()

    # Frequency of each token in the document (still useful for coverage/ratios stddev).
    freq = Counter(tokens)

    # Keep (word, count) for matched vs unmatched tokens (coverage & ratios use these).
    matched_tokens: List[Tuple[str, int]] = []
    unmatched_tokens: List[Tuple[str, int]] = []

    # Aggregates (context-aware for sentiment/magnitude):
    total_sentiment = 0.0   # sum of adjusted per-occurrence scores
    total_weight   = 0      # matched occurrences (not unique types)
    magnitude      = 0.0    # sum of |adjusted score| per occurrence

    # Per-emotion accumulators (kept un-negated; we average later).
    emotion_sums = defaultdict(float)

    # Per-unique-token aggregation after context adjustments
    per_token = defaultdict(lambda: {"count": 0, "contribution": 0.0})

    # --- lightweight “lemmatization” helpers ---
    def _norm_candidate(w: str) -> str:
        """
        Return a lexicon key if we can map w to a plausible base form; else ''.
        Tries a few common English inflection patterns conservatively.
        """
        if w in lexicon:
            return w

        # irregular comparatives/superlatives that commonly appear in sentiment
        IRREG = {
            "better": "good", "best": "good",
            "worse": "bad",   "worst": "bad",
            "happier": "happy", "happiest": "happy",
            "sadder": "sad",     "saddest": "sad",
            "angrier": "angry",  "angriest": "angry",
            "funnier": "funny",  "funniest": "funny",
        }
        if w in IRREG and IRREG[w] in lexicon:
            return IRREG[w]

        cands: List[str] = []
        # split hyphenated compounds into plausible parts
        if "-" in w:
            cands += [p for p in w.split("-") if len(p) >= 3]
        # common morphology
        if w.endswith("ies") and len(w) > 4: cands += [w[:-3] + "y"]
        if w.endswith("iest") and len(w) > 5: cands += [w[:-4] + "y"]
        if w.endswith("ier") and len(w) > 4:  cands += [w[:-3] + "y"]
        if w.endswith("ing") and len(w) > 5: cands += [w[:-3], w[:-3] + "e"]
        if w.endswith("ed")  and len(w) > 4: cands += [w[:-2], w[:-1]]
        if w.endswith("s")   and len(w) > 3: cands += [w[:-1]]
        if w.endswith("er")  and len(w) > 4: cands += [w[:-2], w[:-2] + "e"]
        if w.endswith("est") and len(w) > 5: cands += [w[:-3], w[:-3] + "e"]

        for c in cands:
            if c in lexicon:
                return c
        return ""

    # Walk the sequence to apply negation/intensifiers per occurrence
    # NOTE: We only use preceding WORD tokens as modifiers. Emoticons (if any)
    #       are not considered negators/intensifiers and won’t affect context.
    for i, raw in enumerate(tokens):
        w = raw
        entry = lexicon.get(w)
        if entry is None:
            key = _norm_candidate(w) if w.isalpha() else ""
            entry = lexicon.get(key) if key else None
            if entry is None:
                unmatched_tokens.append((w, 1))
                continue
            w = key  # use normalized lexicon key

        # Context windows
        left  = tokens[max(0, i - NEGATION_WINDOW): i]
        left2 = tokens[max(0, i - INTENS_WINDOW): i]

        # Negation: also handle glued contractions like "isn't"
        negated = any(
            (tok in NEGATORS) or (tok.endswith("n't"))
            for tok in left
        )

        # Intensifier/downtoner: take strongest one in the short window
        mults = [INTENSIFIERS[tok] for tok in left2 if tok in INTENSIFIERS]
        intens = max(mults) if mults else 1.0

        factor = (-1.0 if negated else 1.0) * float(intens)

        base_score = entry["sentiment_score"]
        adj_score  = base_score * factor

        total_sentiment += adj_score
        total_weight    += 1
        magnitude       += abs(adj_score)

        per_token[w]["count"]        += 1
        per_token[w]["contribution"] += adj_score

        # matched list is used later for pos/neg/neutral ratios (based on RAW scores)
        matched_tokens.append((w, 1))

        # Emotions: keep un-negated (optionally: multiply by intens if you want)
        for e in EMOTIONS:
            emotion_sums[e] += entry[e]

    # Build tokens_output for transparency lists
    tokens_output: List[Dict] = []
    for w, agg in per_token.items():
        entry = lexicon[w]
        tokens_output.append({
            "word": w,
            "count": agg["count"],
            "sentiment_score": entry["sentiment_score"],  # raw rating
            "contribution": agg["contribution"],          # context-adjusted
            "emotions": {e: entry[e] for e in EMOTIONS}
        })

    # Means/ratios/stddev match previous API, using RAW scores for interpretability
    sentiment_score_mean = (total_sentiment / total_weight) if total_weight else 0.0

    # Ratios by raw lexicon sign (thresholded), weighted by occurrences
    POS_T, NEG_T = 0.05, -0.05
    # aggregate counts per unique then expand by count
    pos_tokens = sum(t["count"] for t in tokens_output if t["sentiment_score"] > POS_T)
    neg_tokens = sum(t["count"] for t in tokens_output if t["sentiment_score"] < NEG_T)
    neu_tokens = max(0, total_weight - pos_tokens - neg_tokens)

    positive_ratio = (pos_tokens / total_weight) if total_weight else 0.0
    negative_ratio = (neg_tokens / total_weight) if total_weight else 0.0
    neutral_ratio  = (neu_tokens  / total_weight) if total_weight else 0.0

    coverage = (total_weight / total_tokens) if total_tokens else 0.0

    # Stddev over RAW scores, weighted by counts
    if total_weight:
        var = sum(t["count"] * ((t["sentiment_score"] - sentiment_score_mean) ** 2)
                  for t in tokens_output) / total_weight
        stddev = sqrt(var)
    else:
        stddev = 0.0

    # Per-emotion averages (weighted by occurrences)
    emotion_avgs = {e: (emotion_sums[e] / total_weight) if total_weight else 0.0
                    for e in EMOTIONS}

    # Top contributors by absolute contribution (already context-adjusted)
    tokens_output_sorted = sorted(tokens_output,
                                  key=lambda x: abs(x["contribution"]),
                                  reverse=True)
    top_positive = [t for t in tokens_output_sorted if t["contribution"] > 0][:10]
    top_negative = [t for t in tokens_output_sorted if t["contribution"] < 0][:10]

    # Top by emotion (use |emotion_score| * count); unchanged
    top_by_emotion = {}
    for e in EMOTIONS:
        unique = sorted(
            tokens_output,
            key=lambda t: abs(t["emotions"][e]) * t["count"],
            reverse=True
        )[:10]
        top_by_emotion[e] = unique

    # Polarity sign of the mean (unchanged)
    if sentiment_score_mean > 0.0:
        polarity = 1
    elif sentiment_score_mean < 0.0:
        polarity = -1
    else:
        polarity = 0

    # Return (note: if you previously disabled OOV display, keep it as [])
    return {
        "summary": {
            "sentiment_score_mean": sentiment_score_mean,
            "polarity": polarity,
            "magnitude": magnitude,
            "stddev": stddev,

            "token_count": total_tokens,
            "matched_token_count": total_weight,
            "coverage": coverage,

            "positive_ratio": positive_ratio,
            "negative_ratio": negative_ratio,
            "neutral_ratio": neutral_ratio,

            # Leave as [] if you’ve removed OOV from UI; else compute separately.
            "oov_examples": [],
            "lexicon_rows": len(load_lexicon())
        },
        "emotions": emotion_avgs,
        "top_contributors": {
            "positive": top_positive,
            "negative": top_negative,
            "by_emotion": top_by_emotion
        },
        "tokens": tokens_output
    }
