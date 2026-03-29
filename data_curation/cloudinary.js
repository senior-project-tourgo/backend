/**
 * STEP 2 — upload_cloudinary.js
 * ==============================
 * Reads  : places_clean.json
 * Writes : places_seeded.json   (photos[] replaced with Cloudinary URLs)
 *          upload_progress.json (checkpoint — safe to kill and resume)
 *
 * Run:
 *   CLOUDINARY_CLOUD_NAME=your_cloud \
 *   CLOUDINARY_API_KEY=your_key \
 *   CLOUDINARY_API_SECRET=your_secret \
 *   node step2_upload_cloudinary.js
 *
 * Optional env vars:
 *   MAX_PHOTOS=3          max photos per place (default 3)
 *   CONCURRENCY=5         parallel uploads (default 5)
 *   TIMEOUT_MS=25000      per-upload timeout ms (default 25000)
 *   INPUT=places_clean.json
 *   OUTPUT=places_seeded.json
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const cloudinary = require("cloudinary").v2;
const https = require("https");
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

// ── Config ────────────────────────────────────────────────────────────────────

const INPUT_FILE = process.env.INPUT || "places_clean.json";
const OUTPUT_FILE = process.env.OUTPUT || "places_seeded.json";
const PROGRESS_FILE = "upload_progress.json";

const MAX_PHOTOS = parseInt(process.env.MAX_PHOTOS || "3");
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "5");
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || "25000");

// Validate required env vars up front
const REQUIRED_ENV = ["CLOUD_NAME", "API_KEY", "API_SECRET"];
for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
        console.error(`\nMissing required env var: ${key}`);
        console.error("Run as:");
        console.error("  CLOUD_NAME=xxx API_KEY=xxx API_SECRET=xxx node cloudinary.js\n");
        process.exit(1);
    }
}

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
    secure: true,
});

// ── URL validation ────────────────────────────────────────────────────────────

const SKIP_PATTERNS = [
    "example.com",
    "placeholder.com",
    "via.placeholder",
    "placehold.it",
];

function isSkippableUrl(url) {
    if (!url || typeof url !== "string") return true;
    if (!url.startsWith("http://") && !url.startsWith("https://")) return true;
    return SKIP_PATTERNS.some(p => url.includes(p));
}

// ── Browser-like headers per source ──────────────────────────────────────────
// Unsplash, Google CDN, Reddit all block non-browser requests without these.

function headersForUrl(url) {
    const base = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
    };
    if (url.includes("unsplash.com")) return { ...base, "Referer": "https://unsplash.com/" };
    if (url.includes("googleusercontent") || url.includes("lh3")) return { ...base, "Referer": "https://www.google.com/" };
    if (url.includes("wikimedia") || url.includes("wikipedia")) return { ...base, "Referer": "https://commons.wikimedia.org/" };
    if (url.includes("redd.it") || url.includes("reddit")) return { ...base, "Referer": "https://www.reddit.com/" };
    return base;
}

// ── Download to temp file ─────────────────────────────────────────────────────
// Used as fallback when direct Cloudinary URL-fetch fails.
// Handles one level of redirect automatically.

function downloadToTemp(url, destPath, redirected = false) {
    return new Promise((resolve, reject) => {
        const proto = url.startsWith("https") ? https : http;
        const timer = setTimeout(() => reject(new Error("Download timeout")), TIMEOUT_MS);

        const req = proto.get(url, { headers: headersForUrl(url) }, (res) => {
            // Follow one redirect
            if ([301, 302, 307, 308].includes(res.statusCode)) {
                clearTimeout(timer);
                if (redirected) { reject(new Error("Too many redirects")); return; }
                const loc = res.headers.location;
                if (!loc) { reject(new Error("Redirect with no Location header")); return; }
                downloadToTemp(loc, destPath, true).then(resolve).catch(reject);
                return;
            }

            if (res.statusCode !== 200) {
                clearTimeout(timer);
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }

            const ct = res.headers["content-type"] || "";
            if (!ct.startsWith("image/")) {
                clearTimeout(timer);
                reject(new Error(`Not an image (content-type: ${ct})`));
                return;
            }

            const file = fs.createWriteStream(destPath);
            res.pipe(file);
            file.on("finish", () => { clearTimeout(timer); file.close(resolve); });
            file.on("error", (e) => { clearTimeout(timer); reject(e); });
        });

        req.on("error", (e) => { clearTimeout(timer); reject(e); });
        req.setTimeout(TIMEOUT_MS, () => { req.destroy(); reject(new Error("Request timeout")); });
    });
}

// ── Upload one URL ────────────────────────────────────────────────────────────
//
// Two-attempt strategy:
//   1. Direct URL upload — Cloudinary fetches the URL on its end.
//      Pass browser-like headers so sources like Unsplash don't block it.
//   2. Download locally → upload file — slower but works on any source.
//
// Returns Cloudinary secure_url on success, null on failure.

async function uploadOneUrl(url, placeId, index) {
    if (isSkippableUrl(url)) {
        process.stdout.write(`\n      [photo ${index}] skipped (placeholder): ${url.slice(0, 50)}`);
        return null;
    }

    const uploadOpts = {
        folder: `tourdo/places/${placeId}`,
        public_id: `photo_${index}`,
        resource_type: "image",
        fetch_format: "auto",
        quality: "auto:good",
        overwrite: false,
        timeout: TIMEOUT_MS,
    };

    // ── Attempt 1: direct URL upload ─────────────────────────────────────────
    try {
        const result = await cloudinary.uploader.upload(url, {
            ...uploadOpts,
            headers: headersForUrl(url),
        });
        return result.secure_url;
    } catch (err) {
        // "already exists" means overwrite:false blocked it — retrieve existing URL
        if (err.http_code === 400 && err.message?.includes("already exists")) {
            try {
                const info = await cloudinary.api.resource(
                    `tourdo/places/${placeId}/photo_${index}`
                );
                return info.secure_url;
            } catch { /* fall through */ }
        }
        process.stdout.write(`\n      [photo ${index}] direct failed (${err.message?.slice(0, 50)}) — trying local download…`);
    }

    // ── Attempt 2: download → upload file ────────────────────────────────────
    const tmpPath = path.join(os.tmpdir(), `tourdo_${placeId}_${index}_${Date.now()}.jpg`);
    try {
        await downloadToTemp(url, tmpPath);
        const result = await cloudinary.uploader.upload(tmpPath, {
            ...uploadOpts,
            overwrite: true,   // file upload: always overwrite so retry works cleanly
        });
        return result.secure_url;
    } catch (err) {
        process.stdout.write(`\n      [photo ${index}] both attempts failed: ${err.message?.slice(0, 60)}`);
        return null;
    } finally {
        if (fs.existsSync(tmpPath)) {
            try { fs.unlinkSync(tmpPath); } catch { /* ignore cleanup error */ }
        }
    }
}

// ── Process one place ─────────────────────────────────────────────────────────

async function processPlace(place, progress) {
    const pid = String(place.placeId);
    const photos = place.photos || [];

    // Already checkpointed
    if (progress[pid] !== undefined) return progress[pid];

    if (photos.length === 0) {
        progress[pid] = [];
        return [];
    }

    const toUpload = photos.slice(0, MAX_PHOTOS);
    const uploaded = [];

    for (let i = 0; i < toUpload.length; i++) {
        const url = await uploadOneUrl(toUpload[i], pid, i);
        if (url) uploaded.push(url);
    }

    progress[pid] = uploaded;
    saveProgress(progress);   // checkpoint after every place — safe to interrupt
    return uploaded;
}

// ── Checkpoint ────────────────────────────────────────────────────────────────

function loadProgress() {
    if (!fs.existsSync(PROGRESS_FILE)) return {};
    try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8")); }
    catch { return {}; }
}

function saveProgress(p) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

// ── Concurrency pool ──────────────────────────────────────────────────────────

async function runWithConcurrency(tasks, limit) {
    const results = new Array(tasks.length);
    let cursor = 0;
    async function worker() {
        while (cursor < tasks.length) {
            const i = cursor++;
            results[i] = await tasks[i]();
        }
    }
    await Promise.all(Array.from({ length: limit }, worker));
    return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\nLoading ${INPUT_FILE} …`);
    const places = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
    const progress = loadProgress();

    const alreadyDone = Object.keys(progress).length;
    const noPhotos = places.filter(p => !p.photos?.length).length;
    const todo = places.filter(p =>
        p.photos?.length > 0 && progress[String(p.placeId)] === undefined
    );

    console.log(`  ${places.length} total places`);
    console.log(`  ${noPhotos} have no photos (will be skipped)`);
    console.log(`  ${alreadyDone} already uploaded (from checkpoint)`);
    console.log(`  ${todo.length} to upload now`);
    console.log(`  concurrency=${CONCURRENCY}  max_photos=${MAX_PHOTOS}  timeout=${TIMEOUT_MS}ms`);

    if (todo.length === 0) {
        console.log("\nNothing to do.");
    } else {
        console.log("");
        let done = 0, noneUploaded = 0;

        const tasks = todo.map(place => async () => {
            const pid = String(place.placeId);
            const name = (place.placeName || "").slice(0, 40);
            process.stdout.write(`[${done + 1}/${todo.length}] #${pid} "${name}" … `);

            const urls = await processPlace(place, progress);
            done++;

            if (urls.length === 0) {
                noneUploaded++;
                process.stdout.write("0 photos\n");
            } else {
                process.stdout.write(`${urls.length} photo(s) OK\n`);
            }
        });

        await runWithConcurrency(tasks, CONCURRENCY);
        console.log(`\nUpload pass done: ${done - noneUploaded} places got photos, ${noneUploaded} got none.`);
    }

    // Build final output
    console.log(`\nWriting ${OUTPUT_FILE} …`);
    const output = places.map(place => ({
        ...place,
        photos: progress[String(place.placeId)] ?? [],
    }));
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

    const withPhotos = output.filter(p => p.photos.length > 0).length;
    const totalPhotos = output.reduce((s, p) => s + p.photos.length, 0);

    console.log(`
Done.
  Output file     : ${OUTPUT_FILE}
  Places w/photos : ${withPhotos} / ${places.length}
  Total photos    : ${totalPhotos}
  Checkpoint file : ${PROGRESS_FILE}
                    (delete it to force a full re-upload next run)
  `);
}

main().catch(err => {
    console.error("\nFatal error:", err.message);
    process.exit(1);
});