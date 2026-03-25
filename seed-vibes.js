/**
 * Uploads vibe images to Cloudinary (folder: "vibes"),
 * updates the Vibe collection in MongoDB with the resulting URLs,
 * and prints a ready-to-paste mockVibes array for the frontend.
 *
 * Run: node seed-vibes.js
 */
require('dotenv').config();
const mongoose  = require('mongoose');
const cloudinary = require('./src/config/cloudinary');
const Vibe      = require('./src/models/vibe');

const VIBES = [
    {
        vibeId: 'thrill',
        vibeTitle: 'Thrill Seeker',
        image: 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b'
    },
    {
        vibeId: 'mountain',
        vibeTitle: 'Mountain Lover',
        image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa'
    },
    {
        vibeId: 'spiritual',
        vibeTitle: 'Spiritual',
        image: 'https://images.unsplash.com/photo-1763738173916-1d5062c35bf2?q=80&w=2070'
    },
    {
        vibeId: 'culture',
        vibeTitle: 'Culture',
        image: 'https://images.unsplash.com/photo-1630854850880-4b049aa9b387?q=80&w=2074'
    },
    {
        vibeId: 'nature',
        vibeTitle: 'Nature',
        image: 'https://images.unsplash.com/photo-1606112219348-204d7d8b94ee'
    },
    {
        vibeId: 'foodie',
        vibeTitle: 'Foodie',
        image: 'https://images.unsplash.com/photo-1735353783244-ecead67000e9?q=80&w=987'
    },
    {
        vibeId: 'chill',
        vibeTitle: 'Chill',
        image: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8'
    },
    {
        vibeId: 'social',
        vibeTitle: 'Social',
        image: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3'
    },
    {
        vibeId: 'photo',
        vibeTitle: 'Photo Hunter',
        image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470'
    },
    {
        vibeId: 'budget',
        vibeTitle: 'Budget Friendly',
        image: 'https://images.unsplash.com/photo-1580048915913-4f8f5cb481c4'
    },
    {
        vibeId: 'luxury',
        vibeTitle: 'Luxury',
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945'
    },
    {
        vibeId: 'family',
        vibeTitle: 'Family Fun',
        image: 'https://images.unsplash.com/photo-1609220136736-443140cffec6'
    },
    {
        vibeId: 'romantic',
        vibeTitle: 'Romantic',
        image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7'
    },
    {
        vibeId: 'solo',
        vibeTitle: 'Solo Traveler',
        image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee'
    },
    {
        vibeId: 'offbeat',
        vibeTitle: 'Off the Beat',
        image: 'https://images.unsplash.com/photo-1670184528520-fe037c2719f4?q=80&w=2070'
    },
    {
        vibeId: 'wellness',
        vibeTitle: 'Wellness',
        image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b'
    },
];

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB\n');

    const results = [];

    for (const vibe of VIBES) {
        process.stdout.write(`Uploading ${vibe.vibeId}... `);
        try {
            const result = await cloudinary.uploader.upload(vibe.image, {
                folder: 'vibes',
                public_id: vibe.vibeId,
                overwrite: true,
            });
            const url = result.secure_url;
            console.log('✅');

            // Update Vibe document (upsert in case catalogue was already seeded)
            await Vibe.findOneAndUpdate(
                { vibeId: vibe.vibeId },
                { vibeId: vibe.vibeId, vibeTitle: vibe.vibeTitle, image: url },
                { upsert: true }
            );

            results.push({ id: vibe.vibeId, title: vibe.vibeTitle, url });
        } catch (err) {
            console.log('❌', err.message);
            results.push({ id: vibe.vibeId, title: vibe.vibeTitle, url: vibe.image });
        }
    }

    console.log('\n── Cloudinary URLs ─────────────────────────────────────────');
    for (const r of results) {
        console.log(`${r.id.padEnd(12)} ${r.url}`);
    }

    console.log('\n── mockVibes.mock.ts (paste this) ──────────────────────────');
    console.log("export interface Vibe { id: string; title: string; image: string; }");
    console.log("\nexport const mockVibes: Vibe[] = [");
    for (const r of results) {
        console.log(`  { id: '${r.id}', title: '${r.title}', image: '${r.url}' },`);
    }
    console.log("];");

    await mongoose.disconnect();
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
