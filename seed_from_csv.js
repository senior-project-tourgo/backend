require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Place = require('./src/models/place.js');

const csvPath = (() => {
    const arg = process.argv.find(arg => arg.startsWith('--file='));
    return arg ? path.resolve(arg.split('=')[1]) : path.resolve(__dirname, 'enriched.csv');
})();

const dbName = (() => {
    const arg = process.argv.find(arg => arg.startsWith('--db='));
    return arg ? arg.split('=')[1] : process.env.MONGODB_DB || 'test';
})();

const googleApiKey = (() => {
    const arg = process.argv.find(arg => arg.startsWith('--google-api-key='));
    return arg ? arg.split('=')[1] : process.env.GOOGLE_PLACES_API_KEY || null;
})();

function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i += 1;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                row.push(field);
                field = '';
            } else if (char === '\r') {
                continue;
            } else if (char === '\n') {
                row.push(field);
                rows.push(row);
                row = [];
                field = '';
            } else {
                field += char;
            }
        }
    }
    if (field !== '' || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}

function normalizeJsonLike(value) {
    if (!value || !value.trim()) return null;
    let text = value.trim();
    text = text.replace(/\r?\n/g, ' ');
    text = text.replace(/\bNone\b/g, 'null');
    text = text.replace(/\bTrue\b/g, 'true');
    text = text.replace(/\bFalse\b/g, 'false');
    text = text.replace(/'/g, '"');
    return text;
}

function parseJsonLike(value) {
    const normalized = normalizeJsonLike(value);
    if (!normalized) return null;
    try {
        return JSON.parse(normalized);
    } catch (err) {
        return null;
    }
}

function parseArray(value) {
    if (!value || !value.trim()) return [];
    const parsed = parseJsonLike(value);
    if (Array.isArray(parsed)) return parsed.map(item => typeof item === 'string' ? item.trim() : item);

    // fallback for comma-separated strings
    return value
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
}

function parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (!value) return false;
    const lower = value.trim().toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes';
}

async function fetchPlaceName(placeId) {
    if (!googleApiKey) return null;
    if (!placeId) return null;

    const url = `https://places.googleapis.com/v1/places/${placeId}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Goog-Api-Key': googleApiKey,
                'X-Goog-FieldMask': 'displayName',
            },
        });
        const data = await response.json();
        if (response.ok && data) {
            return data.displayName?.text || null;
        }
        console.warn(`Google Places lookup failed for ${placeId}: ${data.error?.message || response.status}`);
    } catch (error) {
        console.warn(`Google Places request error for ${placeId}:`, error.message || error);
    }
    return null;
}

function convertToNprPriceRange(priceLevel, priceRange) {
    const usdToNpr = 130; // Approximate conversion rate

    if (priceRange && priceRange.startPrice && priceRange.endPrice) {
        // Use priceRange for precision
        const startNpr = Math.round(priceRange.startPrice.units * usdToNpr);
        const endNpr = Math.round(priceRange.endPrice.units * usdToNpr);
        return { currency: 'NPR', min: startNpr, max: endNpr };
    } else if (priceLevel) {
        // Map priceLevel to approximate NPR ranges
        const levelMap = {
            'PRICE_LEVEL_FREE': { min: 0, max: 100 },
            'PRICE_LEVEL_INEXPENSIVE': { min: 100, max: 500 },
            'PRICE_LEVEL_MODERATE': { min: 500, max: 1500 },
            'PRICE_LEVEL_EXPENSIVE': { min: 1500, max: 3000 },
            'PRICE_LEVEL_VERY_EXPENSIVE': { min: 3000, max: 5000 },
        };
        const range = levelMap[priceLevel] || { min: 0, max: 500 };
        return { currency: 'NPR', min: range.min, max: range.max };
    }
    return { currency: 'NPR', min: 0, max: 500 }; // Default
}

function parseCsvPriceRange(symbol) {
    if (!symbol) return '$';
    const symbolCount = (symbol.match(/\$/g) || []).length;
    const ranges = {
        1: '$',
        2: '$$',
        3: '$$$',
        4: '$$$$',
    };
    return ranges[symbolCount] || '$';
}

function mapArea(area) {
    if (!area) return '';
    const lower = area.toLowerCase().trim();
    const mapping = {
        'kathmandu': 'Kathmandu',
        'pokhara': 'Pokhara',
        'bhaktapur': 'Bhaktapur',
        'lalitpur': 'Lalitpur',
        'patan': 'Lalitpur', // Patan is old name for Lalitpur
    };
    return mapping[lower] || area;
}

function parseVibes(row) {
    const vibesField = row['vibes'] || '';
    const parsed = parseArray(vibesField);
    if (parsed.length > 0) return parsed;

    const vibes = [];
    for (let i = 1; i <= 5; i += 1) {
        const value = row[`vibe ${i}`];
        if (value && value.trim()) vibes.push(value.trim());
    }
    return vibes;
}

function parseSocialMedia(value) {
    const parsed = parseJsonLike(value);
    if (!parsed || typeof parsed !== 'object') return {};
    return {
        instagram: parsed.instagram || {},
        facebook: parsed.facebook || {},
        tiktok: parsed.tiktok || {},
        whatsapp: parsed.whatsapp || {},
    };
}

async function readCsv(file) {
    const content = await fs.promises.readFile(file, 'utf8');
    const rows = parseCSV(content);
    const [header, ...records] = rows;
    if (!header) throw new Error('CSV file missing header row');
    return records.map(row => {
        const record = {};
        for (let i = 0; i < header.length; i += 1) {
            record[header[i].trim()] = row[i] !== undefined ? row[i].trim() : '';
        }
        return record;
    });
}

async function buildPlace(row) {
    const openingHours = {
        monday: parseArray(row.openingHours_monday),
        tuesday: parseArray(row.openingHours_tuesday),
        wednesday: parseArray(row.openingHours_wednesday),
        thursday: parseArray(row.openingHours_thursday),
        friday: parseArray(row.openingHours_friday),
        saturday: parseArray(row.openingHours_saturday),
        sunday: parseArray(row.openingHours_sunday),
    };

    const placeId = row.placeId || row.place_id || row.placeid;
    let placeName = row.placeName || row.place_name || row.name || '';

    if (placeName.includes('?') && googleApiKey) {
        const fetchedName = await fetchPlaceName(placeId);
        if (fetchedName) {
            console.log(`Updated name for ${placeId}: ${fetchedName}`);
            placeName = fetchedName;
        } else {
            console.warn(`Could not fetch name for ${placeId}, keeping original '${placeName}'`);
        }
    }

    return {
        placeId,
        placeName,
        promotions: [],
        image: row.image || null,
        location: {
            area: mapArea(row.location_area || row.area || ''),
            lat: parseFloat(row.location_lat) || 0,
            lng: parseFloat(row.location_lng) || 0,
        },
        mapsLinkKey: row.mapsLinkKey || row.maps_link_key || null,
        averageRating: parseFloat(row.averageRating || row.rating) || 0,
        priceRange: parseCsvPriceRange(row.priceRange),
        openingHours,
        isActive: parseBoolean(row.isActive),
        typicalTimeSpent: row.typicalTimeSpent || '',
        vibe: parseVibes(row),
        suitableFor: parseArray(row.suitableFor),
        specialFacilities: parseArray(row.specialFacilities),
        contactNumber: row.contactNumber || null,
        socialMedia: parseSocialMedia(row.socialMedia),
        description: row.description || '',
        address: row.address || '',
        website: row.website || '',
        googleType: row.google_type || '',
        googleReviewCount: parseInt(row.google_review_count) || 0,
        placeType: row.place_type || '',
        reviews: parseArray(row.reviews).map(r => {
            if (typeof r === 'string') return { text: r };
            return r;
        }),
        reviewTopics: parseArray(row.review_topics),
        reviewSentiment: row.review_sentiment || '',
        placeScore: parseFloat(row.place_score) || 0,
        popularityTier: row.popularity_tier || '',
        hoursConfidence: row.hoursConfidence || row.hours_confidence || '',
        isUnescoSite: parseBoolean(row.isUnescoSite || row.is_unesco_site),
        difficulty: row.difficulty || '',
        bestSeason: parseArray(row.bestSeason || row.best_season),
    };
}

async function seed() {
    if (!process.env.MONGODB_URI) {
        throw new Error('Please set MONGODB_URI in .env');
    }

    if (!googleApiKey) {
        console.warn('Warning: GOOGLE_PLACES_API_KEY is not set. Place names containing ? will not be refreshed.');
    }

    console.log(`Connecting to MongoDB database: ${dbName}`);
    await mongoose.connect(process.env.MONGODB_URI, {
        dbName,
    });

    const csvRows = await readCsv(csvPath);
    console.log(`Loaded ${csvRows.length} rows from ${csvPath}`);

    const places = [];
    for (const row of csvRows) {
        const place = await buildPlace(row);
        if (place.placeId && place.placeName) {
            places.push(place);
        }
    }

    console.log(`Prepared ${places.length} place documents`);

    console.log('Clearing existing places...');
    await Place.deleteMany({});

    console.log('Inserting places...');
    await Place.insertMany(places);
    console.log('✅ Place seeding complete');

    await mongoose.disconnect();
}

seed().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
