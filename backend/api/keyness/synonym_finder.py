
"""
Candidate Code from NinjaTech
Lightweight synonym finder using NLTK WordNet
Memory-efficient alternative to heavy LLM models for basic synonym generation
"""

import re
import logging
from typing import List, Dict, Optional
from collections import defaultdict

logger = logging.getLogger(__name__)

# Try to import NLTK resources, with graceful fallback
try:
    from nltk.corpus import wordnet as wn
    from nltk import pos_tag, word_tokenize
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False
    logger.warning("NLTK not available. Install with: pip install nltk")

class SynonymFinder:
    """
    Lightweight synonym finder using WordNet
    """
    
    def __init__(self):
        self.cache = {}  # Simple cache to avoid repeated lookups
        
    def get_synonyms(self, word: str, context: str = "", max_synonyms: int = 5) -> Dict:
        """
        Get synonyms for a word using WordNet
        
        Args:
            word: Target word to find synonyms for
            context: Context sentence (for future improvements)
            max_synonyms: Maximum number of synonyms to return
            
        Returns:
            Dictionary with synonyms and metadata
        """
        if not word or not word.strip():
            return {'success': False, 'error': 'No word provided'}
            
        word = word.strip().lower()
        
        # Check cache first
        if word in self.cache:
            logger.info(f"[synonyms] Using cached result for: '{word}'")
            return self.cache[word]
        
        if not NLTK_AVAILABLE:
            return self._fallback_response(word, max_synonyms)
            
        try:
            synonyms = self._extract_synonyms(word, max_synonyms)
            
            if not synonyms:
                logger.warning(f"[synonyms] No synonyms found for: '{word}'")
                return self._fallback_response(word, max_synonyms)
            
            # Check if synonyms appear in context
            present_in_text = []
            if context:
                for item in synonyms:
                    syn = item['synonym']
                    if re.search(rf"\b{re.escape(syn)}\b", context, flags=re.I):
                        present_in_text.append(item)
            
            result = {
                'word': word,
                'success': True,
                'synonyms': synonyms,
                'analysis_json': synonyms,
                'analysis_markdown': self._format_markdown(word, synonyms),
                'present_in_text': present_in_text,
                'fallback': False,
                'source': 'wordnet'
            }
            
            # Cache the result
            self.cache[word] = result
            logger.info(f"[synonyms] Found {len(synonyms)} synonyms for: '{word}'")
            
            return result
            
        except Exception as e:
            logger.error(f"[synonyms] Error getting synonyms for '{word}': {e}")
            return self._fallback_response(word, max_synonyms)
    
    def _extract_synonyms(self, word: str, max_synonyms: int) -> List[Dict]:
        """Extract synonyms from WordNet"""
        synonyms = []
        seen_synonyms = set()
        
        # Get synsets for the word
        synsets = wn.synsets(word)
        
        if not synsets:
            return synonyms
            
        # Extract synonyms from all synsets
        for synset in synsets:
            for lemma in synset.lemmas():
                synonym = lemma.name().replace('_', ' ')
                
                # Skip the original word and duplicates
                if synonym == word or synonym in seen_synonyms:
                    continue
                    
                # Skip single characters and very short words
                if len(synonym) <= 1:
                    continue
                    
                seen_synonyms.add(synonym)
                
                # Get the definition for explanation
                definition = synset.definition() or "Related term"
                
                # Create synonym entry
                synonym_entry = {
                    'synonym': synonym,
                    'meaning': definition[:100] + "..." if len(definition) > 100 else definition,
                    'difference': f'Alternative to "{word}"',
                    'usage': 'Can be used in similar contexts',
                    'example': f'Example: "{synonym}" conveys a similar meaning to "{word}"'
                }
                
                synonyms.append(synonym_entry)
                
                if len(synonyms) >= max_synonyms:
                    break
                    
            if len(synonyms) >= max_synonyms:
                break
        
        return synonyms
    
    def _fallback_response(self, word: str, max_synonyms: int) -> Dict:
        """Fallback response when WordNet fails"""
        # Simple morphological variations as fallback
        base_variations = [
            f"{word}ing", f"{word}ed", f"{word}er", f"{word}est",
            f"un{word}" if not word.startswith('un') else f"{word[2:]}"
        ]
        
        synonyms = []
        for var in base_variations[:max_synonyms]:
            synonyms.append({
                'synonym': var,
                'meaning': f'Form of "{word}"',
                'difference': f'Variation of "{word}"',
                'usage': 'Related form',
                'example': f'Related to "{word}"'
            })
        
        return {
            'word': word,
            'success': len(synonyms) > 0,
            'synonyms': synonyms,
            'analysis_json': synonyms,
            'analysis_markdown': self._format_markdown(word, synonyms),
            'present_in_text': [],
            'fallback': True,
            'source': 'fallback'
        }
    
    def _format_markdown(self, word: str, synonyms: List[Dict]) -> str:
        """Format synonyms as markdown"""
        lines = [f'**Synonyms for "{word}":**', '']
        
        for i, item in enumerate(synonyms, 1):
            lines.append(f"{i}. **{item['synonym']}** \u2014 {item['meaning']}")
        
        return '\
'.join(lines)

# Global instance
synonym_finder = SynonymFinder()

def get_synonyms_for_word(word: str, context: str = "", max_synonyms: int = 5) -> Dict:
    """
    Convenience function to get synonyms
    """
    return synonym_finder.get_synonyms(word, context, max_synonyms)
