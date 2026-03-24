/**
 * One-time migration: rename old vibe IDs to new ones across
 * Place.vibe[], UserVibe.vibeId, and repopulate the Vibe catalogue.
 *
 * Run once: node migrate-vibes.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Place    = require('./src/models/place');
const UserVibe = require('./src/models/userVibe');
const Vibe     = require('./src/models/vibe');

// Old ID → New ID mapping (only renames needed; unchanged IDs are omitted)
const VIBE_MAP = {
    heritage: 'culture',
    lakeside: 'chill',
    trekking: 'mountain',
    viewpoint: 'photo',
    wildlife:  'nature',
};

const VIBE_CATALOGUE = [
    { vibeId: 'thrill',    vibeTitle: 'Thrill Seeker'   },
    { vibeId: 'mountain',  vibeTitle: 'Mountain Lover'  },
    { vibeId: 'spiritual', vibeTitle: 'Spiritual'       },
    { vibeId: 'culture',   vibeTitle: 'Culture'         },
    { vibeId: 'nature',    vibeTitle: 'Nature'          },
    { vibeId: 'foodie',    vibeTitle: 'Foodie'          },
    { vibeId: 'chill',     vibeTitle: 'Chill'           },
    { vibeId: 'social',    vibeTitle: 'Social'          },
    { vibeId: 'photo',     vibeTitle: 'Photo Hunter'    },
    { vibeId: 'budget',    vibeTitle: 'Budget Friendly' },
    { vibeId: 'luxury',    vibeTitle: 'Luxury'          },
    { vibeId: 'family',    vibeTitle: 'Family Fun'      },
    { vibeId: 'romantic',  vibeTitle: 'Romantic'        },
    { vibeId: 'solo',      vibeTitle: 'Solo Traveler'   },
    { vibeId: 'offbeat',   vibeTitle: 'Off the Beat'    },
    { vibeId: 'wellness',  vibeTitle: 'Wellness'        },
];

async function migrate() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    // ── 1. Migrate Place.vibe arrays ────────────────────────────────────────
    const places = await Place.find({ vibe: { $exists: true } });
    let placesUpdated = 0;

    for (const place of places) {
        const newVibes = place.vibe.map(v => VIBE_MAP[v] ?? v);
        // Deduplicate (e.g. if two old IDs map to same new ID)
        const deduped = [...new Set(newVibes)];

        if (JSON.stringify(deduped) !== JSON.stringify(place.vibe)) {
            await Place.updateOne({ _id: place._id }, { $set: { vibe: deduped } });
            console.log(`  Place ${place.placeId}: ${place.vibe.join(',')} → ${deduped.join(',')}`);
            placesUpdated++;
        }
    }
    console.log(`Places updated: ${placesUpdated}`);

    // ── 2. Migrate UserVibe.vibeId ──────────────────────────────────────────
    let userVibesUpdated = 0;

    for (const [oldId, newId] of Object.entries(VIBE_MAP)) {
        // If a user already has a record for the newId, merge scores then delete
        const oldDocs = await UserVibe.find({ vibeId: oldId });

        for (const oldDoc of oldDocs) {
            const existing = await UserVibe.findOne({
                userId: oldDoc.userId,
                vibeId: newId
            });

            if (existing) {
                // Merge: add scores, keep latest date
                await UserVibe.updateOne(
                    { _id: existing._id },
                    {
                        $inc: { score: oldDoc.score },
                        $max: { lastUpdated: oldDoc.lastUpdated }
                    }
                );
                await UserVibe.deleteOne({ _id: oldDoc._id });
                console.log(`  UserVibe merged ${oldId} → ${newId} for user ${oldDoc.userId}`);
            } else {
                await UserVibe.updateOne(
                    { _id: oldDoc._id },
                    { $set: { vibeId: newId } }
                );
                console.log(`  UserVibe renamed ${oldId} → ${newId} for user ${oldDoc.userId}`);
            }
            userVibesUpdated++;
        }
    }
    console.log(`UserVibe records updated: ${userVibesUpdated}`);

    // ── 3. Rebuild Vibe catalogue ───────────────────────────────────────────
    await Vibe.deleteMany({});
    await Vibe.insertMany(VIBE_CATALOGUE.map(v => ({ ...v, image: null })));
    console.log(`Vibe catalogue rebuilt with ${VIBE_CATALOGUE.length} entries`);

    console.log('Migration complete');
    await mongoose.disconnect();
}

migrate().catch(err => {
    console.error(err);
    process.exit(1);
});
