# TourDo Augmented Places — Column Metadata

**File**: `tourdo_augmented_places.csv`
**Records**: 7,184 verified Nepal places
**Columns**: 38
**Generated**: 2026-03-25
**Pipeline**: Unified Pipeline → Data Augmentation Pipeline

---

## Column Reference

### Identity & Location

| Column | Type | Fill Rate | Source | Description |
|--------|------|-----------|--------|-------------|
| `name` | string | 100% | All sources | Place name. Title-cased. Deduplicated across sources. E.g., "Pashupatinath Temple", "Phewa Lake" |
| `latitude` | float | 65.8% | SerpAPI > Wikivoyage > Reddit | WGS84 latitude. Validated within Nepal bounds (26.3–30.5). 6 decimal places. |
| `longitude` | float | 65.8% | SerpAPI > Wikivoyage > Reddit | WGS84 longitude. Validated within Nepal bounds (80.0–88.2). 6 decimal places. |
| `address` | string | 66.3% | SerpAPI > Wikivoyage | Full street address. E.g., "44621 Pashupati Nath Road, Kathmandu 44600, Nepal" |
| `region` | string | 59.9% | Computed from coordinates | Nepal province name. One of: Koshi, Madhesh, Bagmati, Gandaki, Lumbini, Karnali, Sudurpashchim |
| `province_id` | int | 59.9% | Computed from coordinates | Nepal province number (1–7). Derived from lat/lon bounding boxes. |
| `altitude_milestone` | float | 0% | Not yet populated | Elevation in meters. Planned: GeoNames SRTM3 elevation API lookup. |

### Classification

| Column | Type | Fill Rate | Source | Description |
|--------|------|-----------|--------|-------------|
| `place_type` | string | 100% | All sources (normalized) | Standardized place category. One of 28 types: temple, trekking_route, restaurant, hotel, lake, mountain, cafe, bar, museum, monastery, national_park, historical_site, viewpoint, waterfall, garden, hostel, guesthouse, resort, shop, activity, market, cave, hot_spring, peak, base_camp, village, bridge, other |
| `vibe_tags` | string | 97.4% | Computed from type + description + tags | Comma-separated experience/atmosphere tags. E.g., "adventure,nature,scenic,epic". From: existing tags, place_type inference, 60+ description keywords. See Vibe Taxonomy below. |
| `primary_vibe` | string | 97.4% | Computed | Single strongest vibe. First tag in vibe_tags. Used for filtering and gamification. |
| `secondary_vibes` | string | 92.6% | Computed | Remaining vibes after primary. Comma-separated. |
| `suitable_for` | string | 100% | Computed from type + difficulty + altitude + keywords | Comma-separated audience tags. E.g., "solo,couple,friends,family". Rule-based with safety-critical negative rules. See SuitableFor Taxonomy below. |
| `tags` | string | 58.9% | SerpAPI > Wikivoyage > Reddit | Raw schema tags from source. Pipe-separated. E.g., "spiritual\|temples\|photography\|scenic_views". From the 43-tag schema. |
| `activities` | string | 28.6% | Reddit > Wikivoyage | JSON array of activities. E.g., '["hiking", "photography", "scenic_views"]'. Extracted from post context. |
| `gamification_tags` | string | 93.6% | Computed | Achievement categories this place counts toward. Pipe-separated. E.g., "temple_guardian\|soul_seeker\|province_3_explorer\|unesco_explorer" |
| `is_unesco_site` | bool | 100% | Computed | Whether this is a UNESCO World Heritage Site. 10 Nepal sites flagged. |

### Practical Info

| Column | Type | Fill Rate | Source | Description |
|--------|------|-----------|--------|-------------|
| `rating` | float | 50.2% | SerpAPI (Google Maps) | Google Maps rating (0.0–5.0). E.g., 4.7. Recovered from SerpAPI source via google_place_id matching. |
| `review_count` | float | 54.2% | SerpAPI (Google Maps) | Number of Google reviews. E.g., 41476. Higher = more popular/validated. |
| `price_level` | string | 11.5% | SerpAPI > Wikivoyage | Raw price indicator. Mixed formats: "$", "$$", "$$$", "Rs 500–1,000", "NPR 200". |
| `budget_level` | string | 81.3% | Computed from price + type | Standardized budget category. One of: free, budget, mid_range, luxury. Inferred from price_level, place_type defaults, and description keywords. |
| `hours` | string | 30.1% | SerpAPI > Wikivoyage | Opening hours. Various formats: "Open · Closes 5 PM", "9:00 AM–5:00 PM", "Open 24 hours", "Daily except Tuesday". |
| `best_season` | string | 13.9% | Reddit > Wikivoyage | Recommended travel seasons. Pipe-separated. E.g., "autumn\|spring". From Reddit post context and Wikivoyage editorial content. |
| `difficulty` | string | 19.2% | Reddit > Wikivoyage | Difficulty level for treks/activities. One of: easy, moderate, challenging, hard, extreme. Primarily for trekking_route and mountain types. |
| `duration_suggested` | string | 66.6% | Computed from type | Suggested visit duration. E.g., "1-2 hours", "3-5 days", "1 day". Inferred from place_type defaults. |
| `phone` | string | 35.6% | SerpAPI > Wikivoyage | Phone number. Normalized to +977-XX-XXXXXXX where possible. |
| `website` | string | 21.7% | SerpAPI > Wikivoyage | Official website URL. Validated (must start with http/https). |
| `photos` | string | 52.4% | SerpAPI > Wikivoyage > Reddit | Photo URLs. Pipe-separated. **Note: Google CDN URLs (lh3.googleusercontent.com) are ephemeral and may return 400 after expiry. Use google_place_id to fetch fresh photos via Google Places Photos API.** Reddit preview URLs also expire. Wikimedia Commons URLs are permanent. |
| `description` | string | 100% | Wikivoyage > SerpAPI > Reddit > Generated | Place description. Priority: Wikivoyage editorial → SerpAPI Google snippet → Reddit context sentences → Template-generated ("{name} is a {type} in {region}"). |

### Sentiment & Popularity (Reddit-derived)

| Column | Type | Fill Rate | Source | Description |
|--------|------|-----------|--------|-------------|
| `sentiment_score` | float | 39.2% | Reddit | Aggregate sentiment from Reddit mentions. Range: -1.0 (negative) to 1.0 (positive). E.g., 0.13 (slightly positive). Lexicon-based scoring from post/comment text. |
| `mention_count` | float | 39.2% | Reddit | Number of times this place was mentioned across Reddit posts/comments. Higher = more discussed. E.g., 11. |

### Data Provenance

| Column | Type | Fill Rate | Source | Description |
|--------|------|-----------|--------|-------------|
| `google_place_id` | string | 54.2% | SerpAPI | Google Maps Place ID. E.g., "ChIJq6qqqhoZ6zkRkZDfYAp9TEI". Permanent identifier — use for Google Places API calls (fresh photos, hours, reviews). |
| `wikidata_qid` | string | 0.2% | Wikivoyage | Wikidata entity ID. E.g., "Q380384". Links to structured Wikidata for additional metadata. Only 13 places have QIDs (extraction needs improvement). |
| `sources` | string | 100% | Computed | Comma-separated list of which extraction pipelines contributed to this record. E.g., "reddit,serpapi,wikivoyage" or "serpapi". |
| `sources_count` | int | 100% | Computed | Number of sources (1–3). Higher = more cross-validated. Places in 3 sources are highest confidence. |
| `source_fields` | string | 100% | Computed | JSON object mapping each field to which source provided it. E.g., '{"name": "reddit", "coordinates": "serpapi", "description": "wikivoyage"}'. Full provenance trail. |

### Quality Scores

| Column | Type | Fill Rate | Source | Description |
|--------|------|-----------|--------|-------------|
| `quality_score` | int | 100% | Computed | Data completeness score (0–100). Weighted: coords(15) + description(15) + type(10) + rating(10) + photos(10) + vibes(10) + name(10) + budget(5) + hours(5) + season(5) + contact(5). |
| `quality_tier` | string | 100% | Computed from quality_score | Quality category. **gold** (≥75): rich data, multiple sources. **silver** (≥50): good data, some gaps. **bronze** (≥30): basic data. **unverified** (<30): sparse, needs enrichment. |
| `confidence_score` | int | 100% | Computed | Source agreement score (0–100). Base 33 per source + bonuses for google_place_id (+5), wikidata_qid (+5), cross-source field agreement (+6). |

---

## Vibe Taxonomy (27 tags)

Tags describe what the place **feels like** (experience/atmosphere):

| Category | Tags |
|----------|------|
| Adventure | adventure, thrill, epic |
| Spiritual | spiritual, meditative, sacred |
| Cultural | cultural, historical |
| Relaxation | chill, relaxing, peaceful |
| Romance | romantic, intimate |
| Social | social, party, lively |
| Nature | nature, scenic, wilderness |
| Food | foodie |
| Money | budget, luxury, premium, backpacker |
| Discovery | offbeat, hidden-gem |
| Visual | photography-worthy |

---

## SuitableFor Taxonomy (10 tags)

Tags describe **who** the place is good for (audience):

| Tag | Meaning | Fill % | Assignment Logic |
|-----|---------|--------|-----------------|
| solo | Good for solo travelers | 99.9% | Default for almost all places |
| couple | Good for couples | 96.0% | Default except extreme treks, bars with "pub crawl" |
| friends | Good for friend groups | 93.0% | Default except very formal/spiritual sites |
| family | Safe for families with children | 64.7% | Excluded from: bars, extreme difficulty, altitude >4500m |
| elderly | Accessible for seniors | 48.1% | Excluded from: challenging+ difficulty, altitude >4000m, adventure activities |
| first-timer | Good for Nepal newcomers | 38.3% | Tourist-friendly places, excluded from remote/extreme |
| kids | Specifically suitable for children | 19.2% | Conservative — only confirmed safe/fun for children. Excluded from: bars, difficult treks, high altitude, adventure sports |
| experienced | Requires prior experience | 5.5% | Extreme/challenging treks, mountaineering, high-altitude routes |
| disabled | Wheelchair/mobility accessible | 4.1% | Very conservative (confidence capped at 0.4). Only: gardens, museums, heritage sites, some restaurants |
| large-group | Can accommodate 10+ people | 1.9% | Hotels, national parks, large restaurants |

---

## Source Priority Rules

When multiple sources have data for the same field, this priority determines which value is kept:

| Field | Priority | Rationale |
|-------|----------|-----------|
| Coordinates | SerpAPI > Wikivoyage > Reddit | Google Maps has most accurate GPS |
| Rating | SerpAPI only | Google Maps rating is standardized |
| Description | Wikivoyage > SerpAPI > Reddit | Editorial quality > snippet > crowd |
| Price | Wikivoyage > SerpAPI > Reddit | Wikivoyage has NPR amounts |
| Hours | SerpAPI > Wikivoyage | Google has structured hours data |
| Phone/Website | SerpAPI > Wikivoyage | Google has verified contact info |
| Photos | SerpAPI > Wikivoyage > Reddit | Google has most photos (but URLs expire) |
| Sentiment | Reddit only | Only source with crowd sentiment |
| Season | Reddit > Wikivoyage | Travelers share seasonal experiences |
| Tags | Union of all sources | More tags = richer classification |

---

## Data Pipeline Flow

```
Reddit v7 (5,413) + Wikivoyage v4 (649) + SerpAPI v2 (4,201)
  ↓ Unified Pipeline (42.6s)
  ↓ Load → Normalize → Validate → Clean → Dedup → Merge → Enrich → Export
  ↓ 10,263 → 9,726 valid → 9,262 deduped → 7,184 quality-filtered
  ↓
tourdo_unified_places.csv (7,184 places, 37 cols)
  ↓ Augmentation Pipeline (2.5s)
  ↓ Fix Normalizer Gaps → SuitableFor → Vibes → Descriptions → Quality Re-score
  ↓
tourdo_augmented_places.csv (7,184 places, 38 cols)
```

---

## Known Limitations

1. **Photo URLs are ephemeral** — Google/Reddit CDN URLs expire. Use `google_place_id` for fresh photos.
2. **Altitude data missing** (0%) — Safety rules for high-altitude suitableFor assignments can't fire. Need GeoNames elevation API.
3. **best_season sparse** (13.9%) — Need Open-Meteo weather data integration.
4. **difficulty sparse** (19.2%) — Only trek/mountain types have it. Could use description NLP for more.
5. **wikidata_qid very sparse** (0.2%) — Wikivoyage QID extraction needs improvement.
6. **186 places have no vibes** — Very sparse data entries with no description or type signal.
7. **SuitableFor is rule-based** (confidence 0.6–0.9) — No human validation yet. High-altitude lakes without altitude data may be incorrectly tagged as broadly suitable.
