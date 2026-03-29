/**
 * STEP 3 — seed_mongo.js
 * =======================
 * Reads  : places_seeded.json  (output of Step 2)
 * Writes : MongoDB "places" collection
 *
 * Run:
 *   MONGO_URI=mongodb+srv://user:pass@cluster/tourdo \
 *   node step3_seed_mongo.js
 *
 * Flags (set as env vars):
 *   BATCH_SIZE=200          how many docs per insertMany (default 200)
 *   DROP_FIRST=false        set to "true" to wipe collection before seeding
 *   INPUT=places_seeded.json
 *
 * What it does:
 *   - Upserts by placeId (safe to re-run — no duplicates)
 *   - Batches writes so large datasets don't OOM
 *   - Creates all indexes after seeding
 *   - Prints a summary with counts per qualityTier
 */

const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// ── Config ────────────────────────────────────────────────────────────────────

const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "tourgo";
const COLL_NAME = process.env.COLL_NAME || "places";
const INPUT = process.env.INPUT || "places_seeded.json";
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "200");
const DROP_FIRST = process.env.DROP_FIRST === "true";

if (!MONGO_URI) {
    console.error("Set MONGO_URI env var");
    process.exit(1);
}

// ── Indexes ───────────────────────────────────────────────────────────────────
// Defined here so they're always in sync with the seeder

const INDEXES = [
    // Primary recommendation query: area + active
    { key: { "location.area": 1, isActive: 1 }, name: "area_active" },

    // Vibe and suitableFor filtering (multikey indexes on arrays)
    { key: { vibe: 1 }, name: "vibe" },
    { key: { suitableFor: 1 }, name: "suitableFor" },
    { key: { primaryVibe: 1 }, name: "primaryVibe" },

    // Quality and ranking
    { key: { qualityTier: 1 }, name: "qualityTier" },
    { key: { popularityScore: -1 }, name: "popularityScore" },
    { key: { placeType: 1 }, name: "placeType" },

    // Enrichment cron (find stale places)
    { key: { lastEnrichedAt: 1 }, name: "lastEnrichedAt", sparse: true },

    // Google Places API lookups
    { key: { googlePlaceId: 1 }, name: "googlePlaceId", sparse: true },

    // Compound: area + vibe (covers the most common recommend query)
    {
        key: { "location.area": 1, isActive: 1, vibe: 1, popularityScore: -1 },
        name: "area_active_vibe_score",
    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function chunk(arr, size) {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

function progress(done, total, label = "") {
    const pct = Math.round((done / total) * 100);
    const bar = "█".repeat(Math.floor(pct / 5)).padEnd(20);
    process.stdout.write(`\r  [${bar}] ${pct}% (${done}/${total}) ${label}    `);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log("Connecting to MongoDB …");
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const coll = db.collection(COLL_NAME);

    // Optional: wipe first
    if (DROP_FIRST) {
        console.log("Dropping existing collection …");
        await coll.drop().catch(() => { }); // ignore if doesn't exist
    }

    // Load data
    console.log(`Loading ${INPUT} …`);
    const places = JSON.parse(fs.readFileSync(INPUT, "utf8"));
    console.log(`  ${places.length} documents`);

    // Upsert in batches
    const batches = chunk(places, BATCH_SIZE);
    let upserted = 0, modified = 0;

    console.log(`\nUpserting in ${batches.length} batches of ${BATCH_SIZE} …`);

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        const ops = batch.map(doc => ({
            updateOne: {
                filter: { placeId: doc.placeId },
                update: {
                    $set: {
                        ...doc,
                        lastEnrichedAt: new Date(),   // set on first seed
                    },
                },
                upsert: true,
            },
        }));

        const result = await coll.bulkWrite(ops, { ordered: false });
        upserted += result.upsertedCount;
        modified += result.modifiedCount;

        progress(i + 1, batches.length, `batch ${i + 1}`);
    }

    console.log("\n");

    // Indexes
    console.log("Creating indexes …");
    for (const idx of INDEXES) {
        const { key, name, ...opts } = idx;
        await coll.createIndex(key, { name, background: true, ...opts });
        console.log(`  ✓ ${name}`);
    }

    // Summary
    const total = await coll.countDocuments();
    const active = await coll.countDocuments({ isActive: true });
    const withArea = await coll.countDocuments({ "location.area": { $exists: true, $ne: null } });
    const withPhotos = await coll.countDocuments({ photos: { $not: { $size: 0 } } });

    const tiers = {};
    for (const tier of ["gold", "silver", "bronze", "unverified"]) {
        tiers[tier] = await coll.countDocuments({ qualityTier: tier });
    }

    console.log(`
── Seed complete ─────────────────────────────
  Collection     : ${DB_NAME}.${COLL_NAME}
  Total docs     : ${total}
  isActive=true  : ${active}
  Has area       : ${withArea}
  Has photos     : ${withPhotos}
  Upserted new   : ${upserted}
  Updated exist  : ${modified}

  Quality tiers:
    gold         : ${tiers.gold}
    silver       : ${tiers.silver}
    bronze       : ${tiers.bronze}
    unverified   : ${tiers.unverified}
──────────────────────────────────────────────
`);

    await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });