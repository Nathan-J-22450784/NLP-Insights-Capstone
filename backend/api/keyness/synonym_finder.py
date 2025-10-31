
"""
Candidate Code from NinjaTech
Lightweight synonym finder using NLTK WordNet
Memory-efficient alternative to heavy LLM models for basic synonym generation
"""

import os
import re
import logging
from typing import List, Dict
from collections import defaultdict

logger = logging.getLogger(__name__)

# Runtime config
ALLOW_SYNONYM_FALLBACK = os.getenv("ALLOW_SYNONYM_FALLBACK", "0") == "1"

# Ensure NLTK data path is known at RUNTIME (not just build)
NLTK_DATA_DIR = os.getenv("NLTK_DATA") or os.getenv("NLTK_DIR") or "/opt/render/project/src/.nltk"

NLTK_AVAILABLE = False
try:
    import nltk
    if NLTK_DATA_DIR and NLTK_DATA_DIR not in nltk.data.path:
        nltk.data.path.insert(0, NLTK_DATA_DIR)
    from nltk.corpus import wordnet as wn
    # Touch WordNet to force a LookupError early if missing
    _ = wn.synsets("test")
    NLTK_AVAILABLE = True
except Exception as e:
    NLTK_AVAILABLE = False
    logger.warning(f"NLTK/WordNet unavailable: {e}")

class SynonymFinder:
    def __init__(self):
        self.cache = {}

    def get_synonyms(self, word: str, context: str = "", max_synonyms: int = 5) -> Dict:
        word = (word or "").strip().lower()
        if not word:
            return {"success": False, "error": "No word provided", "fallback": False, "source": "none"}

        if word in self.cache:
            logger.info(f"[synonyms] Using cached result for: '{word}'")
            return self.cache[word]

        if not NLTK_AVAILABLE:
            # >>> FAIL HARD unless explicitly allowed to fallback
            if ALLOW_SYNONYM_FALLBACK:
                return self._fallback_response(word, max_synonyms)
            return {
                "word": word,
                "success": False,
                "error": "NLTK WordNet resource not available",
                "fallback": False,
                "source": "wordnet"
            }

        try:
            synonyms = self._extract_synonyms(word, max_synonyms)
            if not synonyms:
                if ALLOW_SYNONYM_FALLBACK:
                    return self._fallback_response(word, max_synonyms)
                return {
                    "word": word,
                    "success": False,
                    "error": "No WordNet synonyms found",
                    "fallback": False,
                    "source": "wordnet"
                }

            result = {
                "word": word,
                "success": True,
                "synonyms": synonyms,
                "analysis_json": synonyms,
                "analysis_markdown": self._format_markdown(word, synonyms),
                "present_in_text": [],
                "fallback": False,
                "source": "wordnet",
            }
            self.cache[word] = result
            return result

        except Exception as e:
            logger.error(f"[synonyms] WordNet error for '{word}': {e}")
            if ALLOW_SYNONYM_FALLBACK:
                return self._fallback_response(word, max_synonyms)
            return {
                "word": word,
                "success": False,
                "error": f"WordNet error: {e}",
                "fallback": False,
                "source": "wordnet"
            }

    def _extract_synonyms(self, word: str, max_synonyms: int) -> List[Dict]:
        from nltk.corpus import wordnet as wn
        synonyms, seen = [], set()
        for synset in wn.synsets(word):
            for lemma in synset.lemmas():
                s = lemma.name().replace("_", " ")
                if s == word or s in seen or len(s) <= 1:
                    continue
                seen.add(s)
                definition = synset.definition() or "Related term"
                synonyms.append({
                    "synonym": s,
                    "meaning": definition[:100] + "..." if len(definition) > 100 else definition,
                    "difference": f'Alternative to "{word}"',
                    "usage": "Can be used in similar contexts",
                    "example": f'Example: "{s}" conveys a similar meaning to "{word}"'
                })
                if len(synonyms) >= max_synonyms:
                    return synonyms
        return synonyms

    def _fallback_response(self, word: str, max_synonyms: int) -> Dict:
        base_variations = [
            f"{word}ing", f"{word}ed", f"{word}er", f"{word}est",
            (f"un{word}" if not word.startswith("un") else word[2:])
        ][:max_synonyms]
        syns = [{
            "synonym": v,
            "meaning": f'Form of "{word}"',
            "difference": f'Variation of "{word}"',
            "usage": "Related form",
            "example": f'Related to "{word}"'
        } for v in base_variations]
        return {
            "word": word,
            "success": True,
            "synonyms": syns,
            "analysis_json": syns,
            "analysis_markdown": self._format_markdown(word, syns),
            "present_in_text": [],
            "fallback": True,
            "source": "fallback"
        }

    def _format_markdown(self, word: str, synonyms: List[Dict]) -> str:
        lines = [f'**Synonyms for "{word}":**', ""]
        for i, item in enumerate(synonyms, 1):
            lines.append(f"{i}. **{item['synonym']}** — {item['meaning']}")
        return "\n".join(lines)

# Global helper
synonym_finder = SynonymFinder()

def get_synonyms_for_word(word: str, context: str = "", max_synonyms: int = 5) -> Dict:
    return synonym_finder.get_synonyms(word, context, max_synonyms)
