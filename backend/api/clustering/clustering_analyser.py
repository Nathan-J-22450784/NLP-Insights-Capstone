import os
import re
import json
import numpy as np
from collections import Counter
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from pathlib import Path
from gensim.models import KeyedVectors

import nltk
import spacy

from num2words import num2words
from backend import download_embeddings

# ------------------ NLTK Setup ------------------ #
nltk.download("punkt", quiet=True)
nltk.download("stopwords", quiet=True)
from nltk.corpus import stopwords

def generate_roman_numerals(limit=1000):
    from roman import toRoman
    return {toRoman(i).lower() for i in range(1, limit + 1)}

ROMAN_STOPWORDS = generate_roman_numerals(1000)
CUSTOM_STOPWORDS = {"he","she","was","for","on","as","with","at","by","an", "chapter"}
NUMBER_WORDS = {num2words(i) for i in range(1, 1001)}
NLTK_STOPWORDS = set(stopwords.words("english"))
ALL_STOPWORDS = NLTK_STOPWORDS.union(CUSTOM_STOPWORDS, NUMBER_WORDS, ROMAN_STOPWORDS)

# ------------------ Embeddings Setup ------------------ #
EMBEDDING_BACKEND_CHOICES = ["conceptnet", "spacy"]
EMBEDDING_BACKEND = "conceptnet"

model = None
nlp = None
if EMBEDDING_BACKEND == "spacy":
    import spacy
    try:
        nlp = spacy.load("en_core_web_md")
        print("✅ spaCy loaded successfully.")
    except OSError:
        print("❌ spaCy model not found. Run: python -m spacy download en_core_web_md")
        nlp = None
else:
    # ConceptNet path
    from pathlib import Path

    DATA_DIR = Path(__file__).resolve().parents[2] / "backend" / "data"
    EMBEDDINGS_PATH = DATA_DIR / "numberbatch-en.txt"
    print("Looking for embeddings at:", EMBEDDINGS_PATH)
    print("Exists?", EMBEDDINGS_PATH.exists())
    if EMBEDDINGS_PATH.exists():
        model = KeyedVectors.load_word2vec_format(EMBEDDINGS_PATH, binary=False)
        print(f"✅ ConceptNet embeddings loaded: {model.vector_size} dims")
    else:
        print("❌ ConceptNet embeddings not found. Download using download_embeddings.py")

# ------------------ General Themes ------------------ #
GENERAL_THEMES = {
    "Nature": ["forest", "river", "mountain", "snow", "sky", "earth", "wind", "tree", "sun",
               "moon", "star", "ocean", "sea", "rain", "storm", "cloud", "flower", "garden"],

    "Movement": ["walk", "run", "jump", "chase", "move", "stumble", "dance", "ride", "wander",
                 "travel", "journey", "climb", "fall", "fly", "swim", "escape", "approach"],

    "Emotions": ["fear", "joy", "love", "anger", "hope", "sorrow", "desire", "happy", "sad",
                 "anxious", "lonely", "excited", "disappointed", "proud", "ashamed", "confused",
                 "surprised", "grateful", "envious", "disgusted"],

    "Characters": ["man", "woman", "child", "friend", "stranger", "family", "hero", "villain",
                   "mother", "father", "brother", "sister", "leader", "follower", "enemy", "ally"],

    "Time": ["night", "morning", "dawn", "evening", "hour", "day", "moment", "week", "month",
             "year", "past", "present", "future", "yesterday", "tomorrow", "always", "never"],

    "Communication": ["say", "ask", "shout", "whisper", "call", "answer", "speak", "tell",
                      "listen", "hear", "reply", "argue", "discuss", "explain", "persuade"],

    "Conflict": ["fight", "battle", "struggle", "resist", "oppose", "defend", "attack", "war",
                 "argue", "conflict", "tension", "challenge", "confront", "compete"],

    "Cognition": ["think", "know", "believe", "remember", "forget", "understand", "wonder",
                  "imagine", "realize", "consider", "decide", "doubt", "dream", "recognize"],

    "Sensation": ["see", "look", "watch", "hear", "listen", "touch", "feel", "smell", "taste",
                  "sense", "perceive", "observe", "notice", "aware"],

    "Space/Location": ["house", "home", "room", "city", "village", "place", "inside", "outside",
                       "above", "below", "near", "far", "here", "there", "where", "path", "road"],

    "Social Relationships": ["marry", "divorce", "betray", "trust", "befriend", "unite", "separate",
                            "meet", "leave", "join", "abandon", "support", "help", "harm"],

    "Power/Authority": ["king", "queen", "lord", "master", "servant", "ruler", "power", "control",
                       "command", "obey", "rule", "govern", "lead", "follow", "submit"],

    "Morality/Values": ["good", "evil", "right", "wrong", "just", "unjust", "moral", "honest",
                       "lie", "truth", "virtue", "sin", "honor", "shame", "duty", "guilt"],

    "Death/Life": ["life", "death", "die", "live", "born", "birth", "survive", "kill", "dead",
                   "alive", "mortal", "immortal", "grave", "funeral", "resurrection"],

    "Change/Transformation": ["change", "transform", "become", "grow", "evolve", "develop", "shift",
                             "adapt", "convert", "alter", "turn", "emerge", "transition"],

    "Abstract Concepts": ["freedom", "justice", "beauty", "truth", "wisdom", "knowledge", "fate",
                         "destiny", "luck", "chance", "purpose", "meaning", "soul", "spirit"],

    "Technology/Modernity": ["computer", "phone", "internet", "machine", "device", "digital",
                            "technology", "modern", "electric", "automatic", "online"],

    "Economy/Commerce": ["money", "buy", "sell", "trade", "business", "work", "job", "pay",
                        "rich", "poor", "wealth", "price", "cost", "value", "invest"],

    "Religion/Spirituality": ["god", "pray", "worship", "faith", "believe", "church", "temple",
                             "sacred", "holy", "divine", "ritual", "blessing", "curse", "sin"],

    "Education/Learning": ["learn", "teach", "study", "school", "student", "teacher", "lesson",
                          "educate", "train", "practice", "master", "knowledge", "wisdom"],

    "Health/Body": ["body", "hand", "eye", "heart", "blood", "pain", "sick", "heal", "wound",
                   "healthy", "strong", "weak", "tired", "energy", "medicine", "doctor"],

    "Food/Sustenance": ["eat", "drink", "food", "meal", "hungry", "thirst", "cook", "feast",
                       "bread", "water", "wine", "fruit", "meat", "taste", "devour"],
}

# ------------------ Helper Functions ------------------ #
def get_vector(word):
    """Return vector for a word based on backend."""
    if EMBEDDING_BACKEND == "spacy" and nlp:
        lex = nlp.vocab[word]
        if lex.has_vector:
            return lex.vector
    elif EMBEDDING_BACKEND == "conceptnet" and model and word in model:
        return model[word]
    return None


def suggest_theme(cluster_words, model, backend="conceptnet"):
    if model is None or not cluster_words:
        return "Unknown"

    theme_scores = {theme: 0.0 for theme in GENERAL_THEMES}

    for theme, keywords in GENERAL_THEMES.items():
        for kw in keywords:
            if backend == "conceptnet":
                if kw in model:
                    for word in cluster_words:
                        if word in model:
                            theme_scores[theme] += model.similarity(word, kw)
            elif backend == "spacy":
                # Use spaCy similarity
                kw_token = model(kw)[0]  # convert keyword to token
                for word in cluster_words:
                    word_token = model(word)[0]
                    if word_token.has_vector and kw_token.has_vector:
                        theme_scores[theme] += word_token.similarity(kw_token)

    return max(theme_scores, key=theme_scores.get)

# ------------------ Clustering ------------------ #

# --- Minimal input validator for clustering ---
# Keeps things simple: checks sentences, content tokens, unique content words, and verbs.
# If text is too small/short, returns a dict describing what is missing.
def validate_text_for_clustering(text, nlp=None):
    # If you already have a spaCy nlp object in scope, pass it in; else import/construct here.
    if nlp is None:
        import spacy
        try:
            nlp = spacy.load("en_core_web_sm")
        except Exception:
            # Fall back to a super-fast blank pipeline if model missing
            nlp = spacy.blank("en")
            nlp.add_pipe("sentencizer")

    doc = nlp(text)

    # Count basic stats
    sentences = sum(1 for _ in doc.sents)
    # Content tokens: alpha, not stop, and with some minimum length
    content_tokens = [t for t in doc if t.is_alpha and (not getattr(t, "is_stop", False)) and len(t) > 2]
    unique_content = len({t.lemma_.lower() if hasattr(t, "lemma_") else t.text.lower() for t in content_tokens})
    verbs = sum(1 for t in doc if getattr(t, "pos_", "") == "VERB")

    # Suggested (conservative) minimums — adjust if you like
    req = {
        "min_sentences": 2,
        "min_content_tokens": 30,
        "min_unique_content": 10,
        "min_verbs": 3,
    }

    ok = (
        sentences >= req["min_sentences"] and
        len(content_tokens) >= req["min_content_tokens"] and
        unique_content >= req["min_unique_content"] and
        verbs >= req["min_verbs"]
    )

    return {
        "ok": ok,
        "stats": {
            "sentences": sentences,
            "content_tokens": len(content_tokens),
            "unique_content": unique_content,
            "verbs": verbs,
        },
        "requirements": req,
    }

def cluster_text(text, top_words_per_cluster=10):
    """
    Cluster text into groups using either ConceptNet or spaCy embeddings.
    Chooses backend automatically based on EMBEDDING_BACKEND global variable.
    Each cluster point now includes a 'words' array for display in scatterplots.
    """

    global EMBEDDING_BACKEND, model, nlp
    
    # Use the global spaCy object if available (None is fine; the validator will handle it)
    check = validate_text_for_clustering(text, nlp=nlp)
    if not check["ok"]:
        # Soft warning; keep a consistent shape so callers/UI don't break.
        return {
            "clusters": [],
            "points": [],
            "top_terms": {},
            "warning": (
                "Input too small for reliable clustering. "
                "Try adding more text. Requirements: "
                f'{check["requirements"]["min_sentences"]}+ sentences, '
                f'{check["requirements"]["min_content_tokens"]}+ content tokens, '
                f'{check["requirements"]["min_unique_content"]}+ unique content words, '
                f'{check["requirements"]["min_verbs"]}+ verbs. '
                "Current: "
                f'{check["stats"]["sentences"]} sentences, '
                f'{check["stats"]["content_tokens"]} content tokens, '
                f'{check["stats"]["unique_content"]} unique, '
                f'{check["stats"]["verbs"]} verbs.'
            ),
            "input_stats": check["stats"],
            "requirements": check["requirements"],
            "num_docs": 0,
            "num_clusters": 0,
        }

    if not text.strip():
        return {"clusters": [], "top_terms": {}, "themes": {}, "num_clusters": 0, "num_docs": 0}

    # ------------------ Tokenize and get vectors ------------------ #
    vectors, valid_chunks, chunk_words = [], [], []
    chunks = [c.strip() for c in re.split(r'[.!?]\s+', text) if len(c.strip()) > 5]

    for chunk in chunks:
        tokens = nltk.word_tokenize(chunk)
        cleaned = [t.lower() for t in tokens if t.isalpha() and t.lower() not in ALL_STOPWORDS]
        if not cleaned:
            continue

        # Get vectors depending on backend
        if EMBEDDING_BACKEND == "conceptnet" and model:
            vecs = [model[w] for w in cleaned if w in model]
        elif EMBEDDING_BACKEND == "spacy" and nlp:
            doc = nlp(" ".join(cleaned))
            vecs = [token.vector for token in doc if token.has_vector and token.is_alpha]
            cleaned = [token.text.lower() for token in doc if token.has_vector and token.is_alpha]
        else:
            raise ValueError("Embeddings not loaded")

        if vecs:
            vectors.append(np.mean(vecs, axis=0))
            valid_chunks.append(chunk)
            chunk_words.append(cleaned)  # keep words for each chunk

    if not vectors:
        return {"clusters": [], "top_terms": {}, "themes": {}, "num_clusters": 0, "num_docs": 0, "warning": "Not enough content tokens with embeddings to form clusters."}

    vectors = np.array(vectors)
    n_docs = len(valid_chunks)

    # If we couldn't produce at least 2 chunks with embeddings, bail early with a clear hint
    if n_docs < 2:
        return {
            "clusters": [],
            "top_terms": {},
            "themes": {},
            "num_clusters": 0,
            "num_docs": n_docs,
            "warning": "Not enough vectorizable text to form clusters (need at least 2 chunks). Try adding more content or reducing stopwords."
        }

    # ------------------ Determine number of clusters ------------------ #
    if n_docs < 20: num_clusters = 2
    elif n_docs < 100: num_clusters = 3
    elif n_docs < 300: num_clusters = 5
    elif n_docs < 1000: num_clusters = 10
    else: num_clusters = min(20, n_docs // 200)

    # Safety cap: never ask KMeans for more clusters than samples
    num_clusters = min(num_clusters, n_docs)

    # ------------------ PCA for dimensionality reduction ------------------ #
    ## Deleted --- reduced = PCA(n_components=min(50, vectors.shape[1])).fit_transform(vectors) --- Deleted ###

    ## Replaced with --- 
    # vectors is (n_samples x n_features) array
    n, d = vectors.shape
    if n < 2:
        reduced = vectors  # skip PCA if fewer than 2 samples
    else:
        k = min(50, d, n - 1)
        reduced = PCA(n_components=k).fit_transform(vectors)
    ## --- ##

    # ------------------ KMeans clustering ------------------ #
    labels = KMeans(n_clusters=num_clusters, random_state=42, n_init=10).fit_predict(reduced)
    clusters = [
        {
            "label": int(lbl),
            "doc": doc,
            "words": words[:top_words_per_cluster],  # keep only top N words per chunk
            "x": float(r[0]),  # include PCA coords for plotting
            "y": float(r[1]),
        }
        for doc, words, lbl, r in zip(valid_chunks, chunk_words, labels, reduced)
    ]

    # ------------------ Top terms per cluster ------------------ #
    top_terms = {}
    for i in range(num_clusters):
        cluster_docs = [chunk_words[j] for j, lbl in enumerate(labels) if lbl == i]
        tokens = [t for doc in cluster_docs for t in doc]
        counts = Counter(tokens)
        top_terms[i] = [w for w, _ in counts.most_common(top_words_per_cluster)]

    # ------------------ Suggest themes ------------------ #
    # Make the backend flag and the model object agree so suggest_theme uses the right branch.
    if EMBEDDING_BACKEND == "spacy" and nlp is not None:
        backend_flag = "spacy"
        embedding_ref = nlp
    else:
        backend_flag = "conceptnet"
        embedding_ref = model

    themes = {
        i: suggest_theme(words, embedding_ref, backend=backend_flag)
        for i, words in top_terms.items()
    }
    # fix for the TypeError: 'KeyedVectors' object is not callable. It ensures we don’t call model(kw) unless model is actually a spaCy pipeline.



# ------------------ Django Endpoint ------------------ #
@csrf_exempt
def clustering_analysis(request):
    global model
    global nlp
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request method."}, status=400)

    # Parse JSON request
    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "Invalid JSON."}, status=400)

    text = data.get("text", "").strip()
    if not text:
        return JsonResponse({"error": "No text provided."}, status=400)

    # Choose embedding backend
    backend_choice = data.get("embedding", "conceptnet").lower()
    if backend_choice not in EMBEDDING_BACKEND_CHOICES:
        return JsonResponse({"error": f"Invalid embedding choice: {backend_choice}"}, status=400)

    global EMBEDDING_BACKEND
    EMBEDDING_BACKEND = backend_choice

    # Load embeddings accordingly
    try:
        if backend_choice == "conceptnet":
            embeddings_path = download_embeddings.download_embeddings()
            if not model:
                # Load ConceptNet model only if not already loaded
                # global model
                model = KeyedVectors.load_word2vec_format(embeddings_path, binary=False)

        elif backend_choice == "spacy":
            if not nlp:
                import spacy
                try:
                    # global nlp
                    nlp = spacy.load("en_core_web_md")
                except OSError:
                    return JsonResponse({
                        "error": "spaCy model not found. Run: python -m spacy download en_core_web_md"
                    }, status=500)
    except Exception as e:
        return JsonResponse({"error": f"Failed to load embeddings: {e}"}, status=500)

    # Ensure we have embeddings loaded
    if (backend_choice == "conceptnet" and not model) or (backend_choice == "spacy" and not nlp):
        return JsonResponse({"error": "Embeddings not loaded."}, status=500)

    # Perform clustering
    try:
        result = cluster_text(text, top_words_per_cluster=20)

        # Determine which embedding backend to use for suggesting themes
        if backend_choice == "conceptnet":
            suggested = {cid: suggest_theme(words, model, backend="conceptnet")
                         for cid, words in result["top_terms"].items()}
        elif backend_choice == "spacy":
            suggested = {cid: suggest_theme(words, nlp, backend="spacy")
                         for cid, words in result["top_terms"].items()}

        return JsonResponse({
            "clusters": result["clusters"],
            "top_terms": result["top_terms"],
            "suggested_themes": suggested,
            "num_clusters": result["num_clusters"],
            "num_docs": result["num_docs"],
            **({"warning": result["warning"]} if "warning" in result else {}),
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"error": str(e)}, status=500)


