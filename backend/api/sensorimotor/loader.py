import os, json, threading, csv, io, requests

# Keep this order fixed: indexes 0..10 map to these modalities
MODALITY_ORDER = [
    "vision","audition","touch","taste","smell",
    "interoception","hand","mouth","head","foot","torso"
]

# Accept common header names when falling back to CSV
MODALITY_SYNONYMS = {
    "vision":["vision","visual"],
    "audition":["audition","auditory","hearing"],
    "touch":["touch","haptic","tactile"],
    "taste":["taste","gustatory"],
    "smell":["smell","olfactory","olfaction"],
    "interoception":["interoception","interoceptive"],
    "hand":["hand","arm","upperlimb","hand_arm"],
    "mouth":["mouth","throat","orofacial","oral"],
    "head":["head"],
    "foot":["foot","leg","lowerlimb","foot_leg"],
    "torso":["torso","trunk"],
}
WORD_COLUMNS = {"word","item","cue","lemma"}
MODALITY_COLUMNS = {"modality","dimension","channel"}
SCORE_COLUMNS = {"rating","response","score","value"}

NORMS = None      # dict[str, list[float|None]]
READY = False
_LOCK = threading.Lock()

def _canon_mod(x: str|None):
    s = (x or "").strip().lower()
    for k, vs in MODALITY_SYNONYMS.items():
        if s in vs:
            return k
    return None

# ---------- JSON path (preferred) ----------

def _load_json_if_present():
    """Try SM_JSON_URL first, then local static file."""
    url = os.environ.get("SM_JSON_URL")
    if url:
        r = requests.get(url, timeout=60)
        r.raise_for_status()
        return r.json()
    local = os.path.join(os.path.dirname(__file__), "static", "sm_norms_min.json")
    if os.path.exists(local):
        with open(local, "r", encoding="utf-8") as f:
            return json.load(f)
    return None

def _build_norms_from_json(obj: dict):
    """obj: { word: [11 floats or null] } → dict[word]->list"""
    norms = {}
    for w, arr in (obj or {}).items():
        if isinstance(arr, list) and any(v is not None for v in arr):
            norms[(w or "").strip().lower()] = (arr + [None]*11)[:11]
    return norms

# ---------- CSV fallback (only if JSON missing) ----------

def _detect_wide(headers):
    found = set()
    for h in headers:
        m = _canon_mod(h)
        if m:
            found.add(m)
    return len(found) >= 3

def _first(headers, pool:set[str]):
    L = [h.lower() for h in headers]
    for h in L:
        if h in pool:
            return h
    return None

def _download_csv_bytes():
    url = os.environ.get("SM_CSV_URL")
    if not url:
        raise RuntimeError(
            "No JSON found (SM_JSON_URL or static/sm_norms_min.json) and SM_CSV_URL is not set."
        )
    r = requests.get(url, timeout=90)
    r.raise_for_status()
    return r.content

def _build_norms_from_csv_bytes(b: bytes):
    # Parse wide or long CSV into the same dict[word] -> [11 floats|None]
    stream = io.StringIO(b.decode("utf-8", errors="ignore"))
    reader = csv.DictReader(stream)
    headers = reader.fieldnames or []
    wide = _detect_wide(headers)

    norms = {}
    if wide:
        word_col = _first(headers, WORD_COLUMNS)
        mod_heads = [h for h in headers if _canon_mod(h)]
        for row in csv.DictReader(io.StringIO(b.decode("utf-8", errors="ignore"))):
            w = (row.get(word_col) or "").strip().lower()
            if not w:
                continue
            arr = [None]*len(MODALITY_ORDER)
            for h in mod_heads:
                idx = MODALITY_ORDER.index(_canon_mod(h))
                try:
                    v = float(row.get(h)) if row.get(h) not in (None, "") else None
                except ValueError:
                    v = None
                if v is not None:
                    arr[idx] = v
            if any(v is not None for v in arr):
                norms[w] = arr
    else:
        word_col = _first(headers, WORD_COLUMNS)
        mod_col  = _first(headers, MODALITY_COLUMNS)
        val_col  = _first(headers, SCORE_COLUMNS)
        buckets: dict[str, dict[str, list[float]]] = {}
        for row in csv.DictReader(io.StringIO(b.decode("utf-8", errors="ignore"))):
            w = (row.get(word_col) or "").strip().lower()
            m = _canon_mod(row.get(mod_col))
            try:
                v = float(row.get(val_col))
            except (TypeError, ValueError):
                v = None
            if not w or not m or v is None:
                continue
            buckets.setdefault(w, {}).setdefault(m, []).append(v)
        for w, mb in buckets.items():
            arr = [None]*len(MODALITY_ORDER)
            for m, vals in mb.items():
                idx = MODALITY_ORDER.index(m)
                arr[idx] = sum(vals)/len(vals)
            if any(v is not None for v in arr):
                norms[w] = arr

    return norms

# ---------- Public API used by your views ----------

def warm_start():
    def _job():
        global READY, NORMS
        try:
            j = _load_json_if_present()
            if j:
                NORMS = _build_norms_from_json(j)
                READY = True
                print("[sensorimotor] Loaded norms from JSON.", flush=True)
                return
            # Fallback: CSV via SM_CSV_URL (only if you want it)
            csv_bytes = _download_csv_bytes()
            _build_norms_from_csv_bytes(csv_bytes)
            READY = True
            print("[sensorimotor] Loaded norms from CSV.", flush=True)
        except Exception as e:
            print("[sensorimotor] Warm start failed:", e, flush=True)
    threading.Thread(target=_job, daemon=True).start()

def ensure_loaded():
    global READY, NORMS
    if READY and NORMS is not None:
        return
    with _LOCK:
        if READY and NORMS is not None:
            return
        j = _load_json_if_present()
        if j:
            NORMS = _build_norms_from_json(j)
            READY = True
            return
        # Fallback: CSV only if JSON wasn’t found
        csv_bytes = _download_csv_bytes()
        _build_norms_from_csv_bytes(csv_bytes)
        READY = True

def lookup(words:list[str]):
    """
    Return (matched_count, profile_list[11]) averaged across matched words.
    """
    ensure_loaded()
    totals = [0.0]*len(MODALITY_ORDER)
    matched = 0
    for w in words:
        rec = NORMS.get((w or "").lower())
        if not rec:
            continue
        matched += 1
        for i, v in enumerate(rec):
            if v is not None:
                totals[i] += v
    profile = [(totals[i]/matched if matched else 0.0) for i in range(len(MODALITY_ORDER))]
    return matched, profile
