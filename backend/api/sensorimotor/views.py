import json
from django.http import JsonResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from .loader import lookup, MODALITY_ORDER

@csrf_exempt  # frontend is on Vercel; use CORS + CSRF exemption for this endpoint
def profile_view(request):
    if request.method != "POST":
        return HttpResponseBadRequest("POST JSON {words: string[]}")
    try:
        payload = json.loads(request.body.decode("utf-8"))
        words = payload.get("words", [])
        if not isinstance(words, list):
            return HttpResponseBadRequest("words must be an array")
    except Exception:
        return HttpResponseBadRequest("Invalid JSON")

    matched, profile = lookup(words)
    return JsonResponse({
        "matchedCount": matched,
        "modalities": MODALITY_ORDER,
        "profile": profile
    })
