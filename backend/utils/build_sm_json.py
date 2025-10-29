# /build_sm_json.py
# Usage:
#   python /build_sm_json.py /path/to/sm_norms_trial_level.csv backend/static/sm_norms_min.json
#
# Produces a compact JSON: { "word": [vision, audition, touch, taste, smell,
#   interoception, hand, mouth, head, foot, torso] } with means per word.

import sys, csv, json, os

MOD_ORDER = ["vision","audition","touch","taste","smell",
             "interoception","hand","mouth","head","foot","torso"]
MOD_SYNS = {
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
WORD_COLS = {"word","item","cue","lemma"}
MOD_COLS  = {"modality","dimension","channel"}
VAL_COLS  = {"rating","response","score","value"}

def canon_mod(x):
    s = (x or "").strip().lower()
    for k, vs in MOD_SYNS.items():
        if s in vs: return k
    return None

def first(headers, candidates):
    L = [h.lower() for h in headers]
    for h in L:
        if h in candidates: return h
    return None

def detect_wide(headers):
    found = set()
    for h in headers:
        m = canon_mod(h)
        if m: found.add(m)
    return len(found) >= 3

def main(inp, outp):
    # Read headers first
    with open(inp, newline="", encoding="utf-8", errors="ignore") as f:
        r = csv.DictReader(f)
        headers = r.fieldnames or []
    wide = detect_wide(headers)

    result = {}

    if wide:
        word_col = first(headers, WORD_COLS)
        mod_headers = [h for h in headers if canon_mod(h)]
        with open(inp, newline="", encoding="utf-8", errors="ignore") as f:
            for row in csv.DictReader(f):
                w = (row.get(word_col) or "").strip().lower()
                if not w: continue
                arr = [None]*len(MOD_ORDER)
                for h in mod_headers:
                    idx = MOD_ORDER.index(canon_mod(h))
                    try:
                        v = float(row.get(h)) if row.get(h) not in (None,"") else None
                    except ValueError:
                        v = None
                    if v is not None:
                        arr[idx] = v
                if any(v is not None for v in arr):
                    result[w] = arr
    else:
        word_col = first(headers, WORD_COLS)
        mod_col  = first(headers, MOD_COLS)
        val_col  = first(headers, VAL_COLS)
        # accumulate sums + counts per word×modality
        sums = {}
        counts = {}
        with open(inp, newline="", encoding="utf-8", errors="ignore") as f:
            for row in csv.DictReader(f):
                w = (row.get(word_col) or "").strip().lower()
                m = canon_mod(row.get(mod_col))
                try:
                    v = float(row.get(val_col))
                except (TypeError, ValueError):
                    v = None
                if not w or not m or v is None: continue
                key = (w, m)
                sums[key] = sums.get(key, 0.0) + v
                counts[key] = counts.get(key, 0) + 1
        # average
        by_word = {}
        for (w, m), s in sums.items():
            idx = MOD_ORDER.index(m)
            if w not in by_word:
                by_word[w] = [None]*len(MOD_ORDER)
            by_word[w][idx] = s / counts[(w, m)]
        result = by_word

    os.makedirs(os.path.dirname(outp), exist_ok=True)
    with open(outp, "w", encoding="utf-8") as f:
        json.dump(result, f)
    print(f"Wrote {len(result)} words → {outp}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python tools/build_sm_json.py <in.csv> <out.json>")
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
