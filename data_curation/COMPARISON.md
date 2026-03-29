# Augmented v1 vs Unified Pipeline v2 — Comparison

## Summary

| | Augmented v1 | Unified Pipeline v2 |
|---|---|---|
| **Source** | `data-augmentation/output/` | `unified-pipeline-v2/output/` |
| **Input data** | Reddit v7 + Wikivoyage v4 + SerpAPI v2 | Reddit v7+v8 + Wikivoyage v3+v4 + SerpAPI v2 |
| **Total places** | 7,184 | **14,508** |
| **Columns** | 38 | 59 |
| **Approach** | v1 pipeline (buggy normalizer) → patched by augmentation | Single clean pipeline, bugs fixed at source |
| **Use this one?** | No — superseded | **Yes — definitive output** |

## Why v2 Has More Places but Lower Fill Rates

v2 has **2x more places** (14,508 vs 7,184) because it includes Reddit v8 (10,803 places) and Wikivoyage v3 (633 places). However, the Reddit v8 places have sparser data than SerpAPI — no ratings, no photos, no hours. This dilutes the overall fill rates.

For example, v2 has 3,750 places with ratings (same SerpAPI data) but across 14,508 total = 25.8%. The augmented v1 had 3,606 ratings across 7,184 = 50.2%. **Same underlying data, different denominator.**

## Field-by-Field Comparison

| Field | Aug v1 (7,184) | v2 (14,508) | Notes |
|---|---|---|---|
| **Places** | 7,184 | **14,508** | v2 has 2x more from v8+v3 |
| **Coordinates** | 65.8% | 37.4% | v8's Reddit places have poor geocoding |
| **Rating** | 50.2% | 25.8% | Same SerpAPI data, larger denominator |
| **Reviews** | 54.2% | 28.0% | Same reason |
| **Hours** | 30.1% | 15.4% | Same reason |
| **Description** | 100% | 98.8% | Both near-complete |
| **Vibes** | 97.4% | 75.0% | Aug v1 had more aggressive keyword matching |
| **SuitableFor** | 100% | 100% | Both complete |
| **Budget** | 81.3% | 64.2% | Aug v1 had fallback from source re-read |
| **Photos** | 52.4% | 27.2% | Diluted by Reddit places (no photos) |
| **Phone** | 35.6% | 18.2% | Diluted |
| **Activities** | 28.6% | 50.2% | v2 better — more Reddit data = more activity mentions |
| **Sentiment** | 39.2% | 70.0% | v2 better — more Reddit data |
| **Difficulty** | 19.2% | 33.2% | v2 better — more treks from v8 |
| **Best Season** | 13.9% | 17.1% | v2 slightly better |
| **Google Maps URL** | N/A | 37.4% | New in v2 |
| **Wikipedia URL** | N/A | 100% | New in v2 |

## v2 Unique Advantages
- 2x more places (14,508 vs 7,184)
- Google Maps URLs and Wikipedia URLs
- More Reddit-derived fields (sentiment 70%, activities 50%, difficulty 33%)
- No normalizer bugs — fields mapped correctly from the start
- Single pipeline (no two-step patch process)
- 59 richer columns vs 38

## Aug v1 Advantages (now superseded)
- Higher fill rates per-place (smaller dataset, same SerpAPI enrichment)
- More aggressive vibe keyword matching (97.4% vs 75%)
- Source CSV re-reading recovered more budget/phone/website data

## Recommendation

**Use `unified-pipeline-v2/output/tourdo_unified_places_v2.csv`** as the production dataset. It has more places, cleaner architecture, and no legacy bugs. The lower fill rates will improve when:

1. **SerpAPI v3 finishes** — 17,205 places with Place Details (structured hours, phone, accessibility) replace SerpAPI v2's 4,201
2. **Wikivoyage v5 runs** — OSM/GeoNames/weather integration fills altitude, hours, seasonal data
3. **Vibe enhancement** could be boosted by porting aug v1's more aggressive keyword matching into v2's Stage 6
