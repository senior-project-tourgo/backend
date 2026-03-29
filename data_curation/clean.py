"""
STEP 1 — clean_places.py
========================
Input:  tourdo_augmented_places.json  (raw CSV-exported JSON, 7184 places)
Output: places_clean.json             (MongoDB-ready, no NaN, typed correctly)

Run:
    python3 step1_clean.py

What it does:
  - Normalises every field (no NaN, no "nan" strings, correct types)
  - Generates a stable placeId slug from the name
  - Derives location.area from lat/lng bounding boxes
  - Parses raw hours string into structured { monday:[{open,close}]… }
  - Maps budget_level → priceLevel (low/medium/high) + estimatedCostNPR
  - Splits all pipe/comma/JSON-array strings into real arrays
  - Keeps photos as raw URLs (Step 2 replaces them with Cloudinary URLs)
  - Sets isActive=False for permanently/temporarily closed places
  - Pre-computes popularityScore for fast ranking
"""

import json, math, re, ast, hashlib, unicodedata
from collections import defaultdict

# ── Config ────────────────────────────────────────────────────────────────────
INPUT  = "tourdo_augmented_places.json"
OUTPUT = "places_clean.json"

# ── Helpers ───────────────────────────────────────────────────────────────────

def is_empty(v):
    if v is None: return True
    if isinstance(v, float) and math.isnan(v): return True
    if isinstance(v, str) and v.strip().lower() in ("nan","none",""): return True
    return False

def clean_str(v):
    return None if is_empty(v) else str(v).strip()

def clean_float(v, lo=None, hi=None):
    if is_empty(v): return None
    try:
        f = float(v)
        if not math.isfinite(f): return None
        if lo is not None and f < lo: return None
        if hi is not None and f > hi: return None
        return round(f, 6)
    except: return None

def clean_int(v, lo=None, hi=None):
    f = clean_float(v, lo, hi)
    return int(f) if f is not None else None

def clean_bool(v):
    if is_empty(v): return False
    if isinstance(v, bool): return v
    return str(v).strip().lower() in ("true","1","yes")

def split_pipe(v):
    s = clean_str(v)
    return [] if not s else [x.strip() for x in s.split("|") if x.strip()]

def split_comma(v):
    s = clean_str(v)
    return [] if not s else [x.strip() for x in s.split(",") if x.strip()]

def parse_json_array(v):
    s = clean_str(v)
    if not s: return []
    try:
        parsed = ast.literal_eval(s)
        if isinstance(parsed, list):
            return [str(x).strip() for x in parsed if x]
    except: pass
    return split_comma(s)

# ── placeId slug ──────────────────────────────────────────────────────────────

def make_slug(name):
    try:
        norm = unicodedata.normalize("NFKD", name).encode("ascii","ignore").decode()
    except: norm = name
    slug = re.sub(r"[^a-z0-9]+", "-", norm.lower()).strip("-") or "place"
    suffix = hashlib.md5(name.encode()).hexdigest()[:4]
    return f"{slug}-{suffix}"

# ── Area from coordinates ─────────────────────────────────────────────────────
# Ordered small→large so Bhaktapur/Lalitpur match before the wider Kathmandu box

AREA_BOXES = [
    ("Bhaktapur", 27.64, 27.71, 85.39, 85.48),
    ("Lalitpur",  27.64, 27.71, 85.28, 85.37),
    ("Kathmandu", 27.62, 27.76, 85.27, 85.45),
    ("Pokhara",   28.15, 28.28, 83.88, 84.05),
]

def get_area(lat, lng):
    if lat is None or lng is None: return None
    for area, la0, la1, lo0, lo1 in AREA_BOXES:
        if la0 <= lat <= la1 and lo0 <= lng <= lo1:
            return area
    return None

# ── Pricing ───────────────────────────────────────────────────────────────────

BUDGET_MAP = {
    "free":      ("$",    "low",    0),
    "budget":    ("$",    "low",    300),
    "mid_range": ("$$",   "medium", 1200),
    "luxury":    ("$$$",  "high",   4000),
}
PRICE_SYMBOL_MAP = {
    "$":    ("$",    "low",    300),
    "$$":   ("$$",   "medium", 1200),
    "$$$":  ("$$$",  "high",   3000),
    "$$$$": ("$$$$", "high",   4000),
}

def get_pricing(row):
    b = clean_str(row.get("budget_level"))
    r = clean_str(row.get("price_level"))
    if b in BUDGET_MAP:
        return BUDGET_MAP[b]
    if r in PRICE_SYMBOL_MAP:
        return PRICE_SYMBOL_MAP[r]
    return (None, None, None)

# ── Hours parser ──────────────────────────────────────────────────────────────

ALL_DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]

DAY_ABBR = {
    "m":"monday","mo":"monday","mon":"monday",
    "tu":"tuesday","tue":"tuesday",
    "w":"wednesday","we":"wednesday","wed":"wednesday",
    "th":"thursday","thu":"thursday",
    "f":"friday","fr":"friday","fri":"friday",
    "sa":"saturday","sat":"saturday",
    "su":"sunday","sun":"sunday",
}

def empty_slots():
    return {d: [] for d in ALL_DAYS}

def fill_all(o, c):
    return {d: [{"open": o, "close": c}] for d in ALL_DAYS}

def to_hhmm(s):
    if not s: return None
    s = s.strip().replace(".", "").lower()
    m = re.match(r"^(\d{1,2}):(\d{2})$", s)
    if m:
        h, mi = int(m.group(1)), int(m.group(2))
        if 0 <= h <= 23 and 0 <= mi <= 59:
            return f"{h:02d}:{mi:02d}"
    m = re.match(r"^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$", s)
    if m:
        h = int(m.group(1)); mi = int(m.group(2) or 0); p = m.group(3)
        if p == "am": h = 0 if h == 12 else h
        else:         h = h if h == 12 else h + 12
        if 0 <= h <= 23 and 0 <= mi <= 59:
            return f"{h:02d}:{mi:02d}"
    return None

def parse_day_range(s):
    s = s.strip().lower()
    parts = s.split("-")
    if len(parts) == 2:
        a, b = DAY_ABBR.get(parts[0].strip()), DAY_ABBR.get(parts[1].strip())
        if a and b:
            si, ei = ALL_DAYS.index(a), ALL_DAYS.index(b)
            return ALL_DAYS[si:ei+1] if si <= ei else ALL_DAYS[si:] + ALL_DAYS[:ei+1]
    single = DAY_ABBR.get(s)
    return [single] if single else []

def parse_hours(raw):
    out = {"slots": empty_slots(), "confidence": "none",
           "isOpen24h": False, "isPermanentlyClosed": False, "isTemporarilyClosed": False}
    if not raw or not raw.strip(): return out
    s = raw.strip()

    if re.search(r"open\s+24\s+hours", s, re.I):
        out.update(slots=fill_all("00:00","23:59"), confidence="full", isOpen24h=True); return out
    if re.search(r"permanently\s+closed", s, re.I):
        out.update(confidence="full", isPermanentlyClosed=True); return out
    if re.search(r"temporarily\s+closed", s, re.I):
        out.update(confidence="full", isTemporarilyClosed=True); return out
    if re.search(r"open\s+for\s+lunch\s+and\s+dinner", s, re.I):
        out.update(slots=fill_all("12:00","22:00"), confidence="partial"); return out

    # late / from HH:MM
    if re.search(r"\d{2}:\d{2}-late", s, re.I) or re.search(r"from\s+\d{2}:\d{2}$", s, re.I):
        m = re.search(r"(\d{1,2}:\d{2})", s)
        o = to_hhmm(m.group(1)) if m else "08:00"
        out.update(slots=fill_all(o or "08:00","23:59"), confidence="partial"); return out

    # Closes at X
    m = re.search(r"closes?\s+(?:at\s+)?(.+?)(?:\s*\(|$)", s, re.I)
    if m:
        c = to_hhmm(m.group(1).strip())
        if c:
            ch = int(c.split(":")[0])
            o = "00:00" if ch <= 6 else ("06:00" if ch <= 14 else "08:00")
            out.update(slots=fill_all(o,c), confidence="partial"); return out

    # Opens at X (Mon)
    m = re.search(r"opens?\s+(?:at\s+|soon\s*[·\u00b7]\s*)?([\d:]+\s*(?:am|pm)?)\s*(?:\((\w+)\))?", s, re.I)
    if m:
        o = to_hhmm(m.group(1).strip())
        if o:
            oh = int(o.split(":")[0])
            c = "23:59" if oh >= 16 else "22:00"
            day_hint = m.group(2)
            if day_hint:
                dk = DAY_ABBR.get(day_hint.lower())
                if dk:
                    slots = empty_slots(); slots[dk] = [{"open":o,"close":c}]
                    out.update(slots=slots, confidence="partial"); return out
            out.update(slots=fill_all(o,c), confidence="partial"); return out

    # Simple range: "11 AM - 2 PM"
    m = re.match(r"^([\d:]+\s*(?:am|pm)?)\s*[-–to]+\s*([\d:]+\s*(?:am|pm)?)$", s, re.I)
    if m:
        o, c = to_hhmm(m.group(1)), to_hhmm(m.group(2))
        if o and c:
            out.update(slots=fill_all(o,c), confidence="partial"); return out

    # 24h range: "07:30-23:30"
    m = re.match(r"^(\d{1,2}:\d{2})\s*(?:-+|to)\s*(\d{1,2}:\d{2})$", s, re.I)
    if m:
        o, c = to_hhmm(m.group(1)), to_hhmm(m.group(2))
        if o and c:
            out.update(slots=fill_all(o,c), confidence="partial"); return out

    # Daily …
    m = re.match(r"^daily[:\s]+([\d:]+\s*(?:am|pm)?)\s*[-–]\s*([\d:]+\s*(?:am|pm)?)", s, re.I)
    if m:
        o, c = to_hhmm(m.group(1)), to_hhmm(m.group(2))
        if o and c:
            out.update(slots=fill_all(o,c), confidence="partial"); return out

    # Multi-segment: "Su-Th 10:00-22:00, F Sa 10:00-00:00"
    segments = s.split(",")
    merged = empty_slots(); any_parsed = False
    for seg in segments:
        seg = seg.strip()
        m = re.match(r"^([a-z\s\-]+?)\s+([\d:]+\s*(?:am|pm)?)\s*[-–]\s*([\d:]+\s*(?:am|pm)?)$", seg, re.I)
        if m:
            o, c = to_hhmm(m.group(2)), to_hhmm(m.group(3))
            if o and c:
                days = []
                for tok in m.group(1).strip().split():
                    days += parse_day_range(tok)
                for d in list(dict.fromkeys(days)):
                    merged[d].append({"open":o,"close":c})
                any_parsed = True
            continue
        m2 = re.search(r"(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})", seg)
        if m2:
            o, c = to_hhmm(m2.group(1)), to_hhmm(m2.group(2))
            if o and c:
                for d in ALL_DAYS: merged[d].append({"open":o,"close":c})
                any_parsed = True
    if any_parsed:
        out.update(slots=merged, confidence="partial"); return out

    # from HH:MM
    m = re.search(r"from\s+([\d:]+(?:\s*(?:am|pm))?)", s, re.I)
    if m:
        o = to_hhmm(m.group(1))
        if o:
            out.update(slots=fill_all(o,"22:00"), confidence="partial"); return out

    return out

# ── Photos: order by stability ────────────────────────────────────────────────

def parse_photos(v):
    s = clean_str(v)
    if not s: return []
    urls = [u.strip() for u in s.split("|") if u.strip()]
    wikimedia = [u for u in urls if "wikimedia" in u or "commons.wiki" in u]
    other     = [u for u in urls if u not in wikimedia
                 and "googleusercontent" not in u and "lh3.google" not in u
                 and "redd.it" not in u and "reddit" not in u]
    google    = [u for u in urls if "googleusercontent" in u or "lh3.google" in u]
    reddit    = [u for u in urls if "redd.it" in u or "reddit" in u]
    return (wikimedia + other + google + reddit)[:5]

# ── Popularity score ──────────────────────────────────────────────────────────

QUALITY_MULT = {"gold":1.15,"silver":1.0,"bronze":0.8,"unverified":0.6}

def popularity_score(rating, reviews, tier):
    if rating is None or reviews is None or reviews <= 0: return None
    mult  = QUALITY_MULT.get(tier, 0.8)
    score = math.log10(reviews) * rating * mult
    return round(min(score / 3.0, 10.0), 2)

# ── Valid enums ───────────────────────────────────────────────────────────────

VALID_TYPES = {
    "temple","trekking_route","restaurant","hotel","lake","mountain","cafe","bar",
    "museum","monastery","national_park","historical_site","viewpoint","waterfall",
    "garden","hostel","guesthouse","resort","shop","activity","market","cave",
    "hot_spring","peak","base_camp","village","bridge","other",
}
VALID_DIFF  = {"easy","moderate","challenging","hard","extreme"}
VALID_TIER  = {"gold","silver","bronze","unverified"}

def clean_enum(v, valid):
    s = clean_str(v)
    return s if s in valid else None

# ── NaN-safe JSON coercion ────────────────────────────────────────────────────

def coerce(obj):
    if obj is None: return None
    if isinstance(obj, float):
        return None if not math.isfinite(obj) else obj
    if isinstance(obj, dict):  return {k: coerce(v) for k, v in obj.items()}
    if isinstance(obj, list):  return [coerce(i) for i in obj]
    if isinstance(obj, bool):  return obj
    if hasattr(obj, 'item'):   return coerce(obj.item())  # numpy scalar
    return obj

# ── Main ──────────────────────────────────────────────────────────────────────

print("Loading …")
raw = json.load(open(INPUT, encoding="utf-8"))
print(f"  {len(raw)} records")

records = []
skipped = []

for row in raw:
    name = clean_str(row.get("name"))
    if not name:
        skipped.append(row); continue

    lat  = clean_float(row.get("latitude"),  26.3, 30.5)
    lng  = clean_float(row.get("longitude"), 80.0, 88.2)
    area = get_area(lat, lng)

    priceRange, priceLevel, costNPR = get_pricing(row)

    hours_raw = clean_str(row.get("hours"))
    parsed    = parse_hours(hours_raw or "")
    is_active = not (parsed["isPermanentlyClosed"] or parsed["isTemporarilyClosed"])

    rating   = clean_float(row.get("rating"),       0, 5)
    reviews  = clean_int(row.get("review_count"),   0)
    tier     = clean_enum(row.get("quality_tier"),  VALID_TIER)
    pop      = popularity_score(rating, reviews, tier)

    doc = {
        # Identity
        "placeId":   make_slug(name),
        "placeName": name,

        # Location
        "location": {
            "area": area,
            "lat":  lat,
            "lng":  lng,
            # altitudeM: filled by enrichment cron (GeoNames SRTM3)
        },
        "googlePlaceId": clean_str(row.get("google_place_id")),
        "address":       clean_str(row.get("address")),

        # Ratings
        "averageRating":  rating,
        "reviewCount":    reviews,
        "sentimentScore": clean_float(row.get("sentiment_score"), -1, 1),
        "popularityScore": pop,

        # Pricing
        "priceRange":       priceRange,   # "$" legacy compat
        "priceLevel":       priceLevel,   # "low" | "medium" | "high"
        "estimatedCostNPR": costNPR,

        # Hours
        "openingHours":   parsed["slots"],
        "hoursConfidence": parsed["confidence"],
        "hoursRaw":        hours_raw,

        # Status
        "isActive": is_active,

        # Classification
        "placeType":   clean_enum(row.get("place_type"), VALID_TYPES),
        "vibe":        split_comma(row.get("vibe_tags")),
        "primaryVibe": clean_str(row.get("primary_vibe")),
        "suitableFor": split_comma(row.get("suitable_for")),
        "difficulty":  clean_enum(row.get("difficulty"), VALID_DIFF),
        "bestSeason":  split_pipe(row.get("best_season")),
        "isUnescoSite": clean_bool(row.get("is_unesco_site")),
        "activities":   parse_json_array(row.get("activities")),
        "gamificationTags": split_pipe(row.get("gamification_tags")),

        # Data quality
        "qualityScore":    clean_int(row.get("quality_score"),    0, 100),
        "qualityTier":     tier,
        "confidenceScore": clean_int(row.get("confidence_score"), 0, 100),
        "sourcesCount":    clean_int(row.get("sources_count"),    1, 3),

        # Info
        "typicalTimeSpent": clean_str(row.get("duration_suggested")),
        "description":      clean_str(row.get("description")),
        "contactNumber":    clean_str(row.get("phone")),
        "website":          clean_str(row.get("website")),

        # Photos — raw URLs; Step 2 replaces with Cloudinary URLs
        "photos": parse_photos(row.get("photos")),
    }

    records.append(coerce(doc))

# ── Stats ─────────────────────────────────────────────────────────────────────
t = len(records)
def pct(n): return f"{n} ({n/t*100:.1f}%)"

print(f"""
── Stats ─────────────────────────────────────
  Total written      : {t}
  Skipped (no name)  : {len(skipped)}
  Has area           : {pct(sum(1 for r in records if r['location']['area']))}
  Has coordinates    : {pct(sum(1 for r in records if r['location']['lat']))}
  Has photos         : {pct(sum(1 for r in records if r['photos']))}
  isActive=False     : {sum(1 for r in records if not r['isActive'])}
  Hours full         : {sum(1 for r in records if r['hoursConfidence']=='full')}
  Hours partial      : {sum(1 for r in records if r['hoursConfidence']=='partial')}
  Hours none         : {sum(1 for r in records if r['hoursConfidence']=='none')}
  gold               : {sum(1 for r in records if r['qualityTier']=='gold')}
  silver             : {sum(1 for r in records if r['qualityTier']=='silver')}
  bronze             : {sum(1 for r in records if r['qualityTier']=='bronze')}
  unverified         : {sum(1 for r in records if r['qualityTier']=='unverified')}
──────────────────────────────────────────────
""")

print(f"Writing {OUTPUT} …")
with open(OUTPUT, "w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False, indent=2)
print("Done.")


# ── CSV writer ────────────────────────────────────────────────────────────────
#
# Rules for nested / array fields:
#
#   Arrays of strings   → pipe-separated  "adventure|cultural|scenic"
#   Arrays of URLs      → pipe-separated  (photos)
#   openingHours dict   → one column per day, each cell is
#                         semicolon-separated slots  "09:00-17:00;14:00-15:00"
#                         Empty day → empty cell
#   location dict       → flattened to location_area, location_lat, location_lng
#   Booleans            → "true" / "false"
#   None                → empty string  ""
#   Strings with commas/newlines → python csv writer quotes them automatically
#
# The CSV is human-readable and re-importable. It is NOT used for MongoDB
# seeding (use the JSON for that). Use cases: Excel review, Google Sheets,
# sharing with non-technical stakeholders, quick pandas analysis.

import csv

CSV_OUTPUT = OUTPUT.replace(".json", ".csv")

# Days in order — used for column names and iteration
ALL_DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]

def hours_cell(slots):
    """[{open, close}, …]  →  '09:00-17:00;14:00-15:00'  or  '' """
    if not slots:
        return ""
    return ";".join(f"{s['open']}-{s['close']}" for s in slots if s.get("open") and s.get("close"))

def to_csv_row(doc):
    """Flatten one cleaned document into a dict of scalar strings."""
    row = {}

    # ── Scalars ───────────────────────────────────────────────────────────
    scalar_fields = [
        "placeId", "placeName", "googlePlaceId", "address",
        "averageRating", "reviewCount", "sentimentScore", "popularityScore",
        "priceRange", "priceLevel", "estimatedCostNPR",
        "hoursConfidence", "hoursRaw",
        "placeType", "primaryVibe", "difficulty",
        "qualityScore", "qualityTier", "confidenceScore", "sourcesCount",
        "typicalTimeSpent", "description", "contactNumber", "website",
    ]
    for f in scalar_fields:
        v = doc.get(f)
        if v is None:
            row[f] = ""
        elif isinstance(v, bool):
            row[f] = "true" if v else "false"
        else:
            row[f] = str(v)

    # ── Booleans (separate fields to avoid str(None)="None") ─────────────
    row["isActive"]    = "true" if doc.get("isActive")    else "false"
    row["isUnescoSite"] = "true" if doc.get("isUnescoSite") else "false"

    # ── Location (flattened) ──────────────────────────────────────────────
    loc = doc.get("location") or {}
    row["location_area"] = loc.get("area") or ""
    row["location_lat"]  = "" if loc.get("lat")  is None else str(loc["lat"])
    row["location_lng"]  = "" if loc.get("lng")  is None else str(loc["lng"])

    # ── Arrays of strings → pipe-separated ───────────────────────────────
    array_fields = [
        "vibe", "suitableFor", "bestSeason",
        "activities", "gamificationTags", "photos",
    ]
    for f in array_fields:
        v = doc.get(f) or []
        row[f] = "|".join(str(x) for x in v)

    # ── openingHours → one column per day ────────────────────────────────
    oh = doc.get("openingHours") or {}
    for day in ALL_DAYS:
        row[f"hours_{day}"] = hours_cell(oh.get(day) or [])

    return row

# Build column order (deterministic)
COLUMNS = [
    "placeId", "placeName",
    "location_area", "location_lat", "location_lng",
    "googlePlaceId", "address",
    "averageRating", "reviewCount", "sentimentScore", "popularityScore",
    "priceRange", "priceLevel", "estimatedCostNPR",
    "hoursRaw", "hoursConfidence",
    *[f"hours_{d}" for d in ALL_DAYS],
    "isActive",
    "placeType", "vibe", "primaryVibe", "suitableFor",
    "difficulty", "bestSeason", "isUnescoSite",
    "activities", "gamificationTags",
    "qualityScore", "qualityTier", "confidenceScore", "sourcesCount",
    "typicalTimeSpent", "description", "contactNumber", "website",
    "photos",
]

print(f"Writing {CSV_OUTPUT} …")
with open(CSV_OUTPUT, "w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(
        f,
        fieldnames=COLUMNS,
        extrasaction="ignore",   # silently drop any extra keys
        quoting=csv.QUOTE_MINIMAL,  # only quote when necessary (commas, newlines)
    )
    writer.writeheader()
    for doc in records:
        writer.writerow(to_csv_row(doc))

print(f"CSV done — {len(records)} rows, {len(COLUMNS)} columns.")