require("dotenv").config();
const mongoose = require("mongoose");

const Place = require("./src/models/place.js");
const Vibe = require("./src/models/vibe.js");
const Promotion = require("./src/models/promotion.js");
const Reward = require("./src/models/reward.js");

const { uploadImage } = require("./src/utils/uploadHelper.js");

// connect DB
mongoose.connect(process.env.MONGODB_URI);

const defaultHours = {
    monday: [{ open: '09:00', close: '18:00' }],
    tuesday: [{ open: '09:00', close: '18:00' }],
    wednesday: [{ open: '09:00', close: '18:00' }],
    thursday: [{ open: '09:00', close: '18:00' }],
    friday: [{ open: '09:00', close: '18:00' }],
    saturday: [{ open: '09:00', close: '18:00' }],
    sunday: [{ open: '09:00', close: '18:00' }]
};

async function seed() {
    try {
        console.log("🧹 Clearing DB...");
        await Place.deleteMany();
        await Vibe.deleteMany();
        await Promotion.deleteMany();
        await Reward.deleteMany();

        console.log("⬆️ Uploading images to Cloudinary...");

        // ── Vibe catalogue ──────────────────────────────────────────────────────
        const vibesData = [
            { vibeId: 'thrill',   vibeTitle: 'Thrill Seeker',    image: null },
            { vibeId: 'mountain', vibeTitle: 'Mountain Lover',   image: null },
            { vibeId: 'spiritual',vibeTitle: 'Spiritual',        image: null },
            { vibeId: 'culture',  vibeTitle: 'Culture',          image: null },
            { vibeId: 'nature',   vibeTitle: 'Nature',           image: null },
            { vibeId: 'foodie',   vibeTitle: 'Foodie',           image: null },
            { vibeId: 'chill',    vibeTitle: 'Chill',            image: null },
            { vibeId: 'social',   vibeTitle: 'Social',           image: null },
            { vibeId: 'photo',    vibeTitle: 'Photo Hunter',     image: null },
            { vibeId: 'budget',   vibeTitle: 'Budget Friendly',  image: null },
            { vibeId: 'luxury',   vibeTitle: 'Luxury',           image: null },
            { vibeId: 'family',   vibeTitle: 'Family Fun',       image: null },
            { vibeId: 'romantic', vibeTitle: 'Romantic',         image: null },
            { vibeId: 'solo',     vibeTitle: 'Solo Traveler',    image: null },
            { vibeId: 'offbeat',  vibeTitle: 'Off the Beat',     image: null },
            { vibeId: 'wellness', vibeTitle: 'Wellness',         image: null },
        ];

        const placesData = [
            {
                placeId: 'plc_001',
                placeName: 'Swayambhunath Stupa',
                promotions: [],
                image: 'https://images.unsplash.com/photo-1672338127087-d46c9ecd48f9?q=80&w=987',
                location: { area: 'Kathmandu', lat: 27.7149, lng: 85.29 },
                mapsLinkKey: 'swayambhu_key',
                averageRating: 4.8,
                priceRange: '$',
                openingHours: defaultHours,
                isActive: true,
                typicalTimeSpent: '1–2 hours',
                vibe: ['spiritual', 'photo', 'culture'],
                suitableFor: ['solo', 'couple', 'family', 'friends', 'school', 'elderly'],
                specialFacilities: ['Panoramic valley view'],
                contactNumber: null,
                socialMedia: {}
            },
            {
                placeId: 'plc_002',
                placeName: 'Boudhanath Stupa',
                promotions: [],
                image: 'https://images.unsplash.com/photo-1671888923932-d53a99498c27?q=80&w=2070',
                location: { area: 'Kathmandu', lat: 27.7215, lng: 85.362 },
                mapsLinkKey: 'boudha_key',
                averageRating: 4.9,
                priceRange: '$',
                openingHours: defaultHours,
                isActive: true,
                typicalTimeSpent: '1–2 hours',
                vibe: ['spiritual', 'culture', 'photo'],
                suitableFor: ['solo', 'couple', 'family', 'friends', 'school', 'elderly', 'accessibility'],
                specialFacilities: ['Prayer wheels'],
                contactNumber: null,
                socialMedia: {}
            },
            {
                placeId: 'plc_003',
                placeName: 'Kathmandu Street Food Crawl',
                promotions: [],
                image: 'https://images.unsplash.com/photo-1761124740110-8989d68fafab?q=80&w=927',
                location: { area: 'Kathmandu', lat: 27.717, lng: 85.324 },
                mapsLinkKey: 'streetfood_key',
                averageRating: 4.6,
                priceRange: '$',
                openingHours: defaultHours,
                isActive: true,
                typicalTimeSpent: '2 hours',
                vibe: ['foodie', 'budget', 'culture'],
                suitableFor: ['solo', 'couple', 'friends', 'family', 'school'],
                specialFacilities: ['Local guide'],
                contactNumber: null,
                socialMedia: {}
            },
            {
                placeId: 'plc_004',
                placeName: 'Champadevi Hiking Trail',
                promotions: [],
                image: 'https://images.unsplash.com/photo-1742311312069-ceb2afe8bda9?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                location: { area: 'Kathmandu', lat: 27.6588, lng: 85.277 },
                mapsLinkKey: 'champadevi_key',
                averageRating: 4.7,
                priceRange: '$$',
                openingHours: defaultHours,
                isActive: true,
                typicalTimeSpent: '3–4 hours',
                vibe: ['mountain', 'thrill', 'photo'],
                suitableFor: ['solo', 'friends', 'couple'],
                specialFacilities: ['Forest trail'],
                contactNumber: null,
                socialMedia: {}
            },
            {
                placeId: 'plc_005',
                placeName: 'Shivapuri National Park Hike',
                promotions: [],
                image: 'https://images.unsplash.com/photo-1621910038795-50fc31d3c491?q=80&w=1035&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                location: { area: 'Kathmandu', lat: 27.8, lng: 85.4 },
                mapsLinkKey: 'shivapuri_key',
                averageRating: 4.8,
                priceRange: '$$',
                openingHours: defaultHours,
                isActive: true,
                typicalTimeSpent: '4–5 hours',
                vibe: ['mountain', 'nature', 'thrill'],
                suitableFor: ['solo', 'friends', 'couple', 'office'],
                specialFacilities: ['Nature reserve'],
                contactNumber: null,
                socialMedia: {}
            },

            // ================= POKHARA =================
            {
                placeId: 'plc_006',
                placeName: 'Phewa Lake Boating',
                promotions: [],
                image: 'https://images.unsplash.com/photo-1576948187290-457c015b3bff?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                location: { area: 'Pokhara', lat: 28.2096, lng: 83.9596 },
                mapsLinkKey: 'phewa_key',
                averageRating: 4.8,
                priceRange: '$$',
                openingHours: defaultHours,
                isActive: true,
                typicalTimeSpent: '2–3 hours',
                vibe: ['chill', 'photo', 'romantic'],
                suitableFor: ['solo', 'couple', 'family', 'friends', 'elderly'],
                specialFacilities: ['Boat rental'],
                contactNumber: null,
                socialMedia: {}
            },
            {
                placeId: 'plc_007',
                placeName: 'Sarangkot Paragliding',
                promotions: [],
                image: 'https://images.unsplash.com/photo-1704870873380-64148f2b611d?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                location: { area: 'Pokhara', lat: 28.242, lng: 83.949 },
                mapsLinkKey: 'sarangkot_key',
                averageRating: 4.9,
                priceRange: '$$$',
                openingHours: defaultHours,
                isActive: true,
                typicalTimeSpent: '1 hour',
                vibe: ['thrill', 'photo', 'mountain'],
                suitableFor: ['solo', 'couple', 'friends'],
                specialFacilities: ['Certified pilots'],
                contactNumber: null,
                socialMedia: {}
            },
            {
                placeId: 'plc_008',
                placeName: 'World Peace Pagoda',
                promotions: [],
                image: 'https://images.unsplash.com/photo-1522376382758-57cc8c505cdb?q=80&w=2445&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                location: { area: 'Pokhara', lat: 28.2, lng: 83.944 },
                mapsLinkKey: 'peace_pagoda_key',
                averageRating: 4.8,
                priceRange: '$$',
                openingHours: defaultHours,
                isActive: true,
                typicalTimeSpent: '2 hours',
                vibe: ['spiritual', 'photo', 'wellness'],
                suitableFor: ['solo', 'couple', 'family', 'school', 'elderly'],
                specialFacilities: ['Hilltop view'],
                contactNumber: null,
                socialMedia: {}
            },
            {
                placeId: 'plc_009',
                placeName: 'Begnas Lake Retreat',
                promotions: [],
                image: 'https://images.unsplash.com/photo-1691885770413-7cba2e97c779?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                location: { area: 'Pokhara', lat: 28.173, lng: 84.1 },
                mapsLinkKey: 'begnas_key',
                averageRating: 4.7,
                priceRange: '$$',
                openingHours: defaultHours,
                isActive: true,
                typicalTimeSpent: '3 hours',
                vibe: ['chill', 'photo', 'wellness', 'romantic'],
                suitableFor: ['solo', 'couple', 'romantic', 'elderly'],
                specialFacilities: ['Quiet lake'],
                contactNumber: null,
                socialMedia: {}
            },
            {
                placeId: 'plc_010',
                placeName: 'Mahendra Cave',
                promotions: [],
                image: 'https://example.com/mahendra.jpg',
                location: { area: 'Pokhara', lat: 28.266, lng: 83.978 },
                mapsLinkKey: 'mahendra_key',
                averageRating: 4.4,
                priceRange: '$',
                openingHours: defaultHours,
                isActive: true,
                typicalTimeSpent: '1–2 hours',
                vibe: ['nature', 'offbeat', 'budget'],
                suitableFor: ['solo', 'couple', 'family', 'friends', 'school'],
                specialFacilities: ['Guided cave walk'],
                contactNumber: null,
                socialMedia: {}
            },

            // ================= BHAKTAPUR =================
            {
                placeId: 'plc_011',
                placeName: 'Bhaktapur Durbar Square',
                promotions: [],
                image: 'https://images.unsplash.com/photo-1618851142562-ff30d09313a9?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                location: { area: 'Bhaktapur', lat: 27.671, lng: 85.4298 },
                mapsLinkKey: 'bhaktapur_key',
                averageRating: 4.9,
                priceRange: '$',
                openingHours: defaultHours,
                isActive: true,
                typicalTimeSpent: '2–3 hours',
                vibe: ['culture', 'spiritual', 'photo'],
                suitableFor: ['solo', 'couple', 'family', 'friends', 'school', 'elderly'],
                specialFacilities: ['Ancient palace complex'],
                contactNumber: null,
                socialMedia: {}
            },
            {
                placeId: 'plc_012',
                placeName: 'Nagarkot Sunrise Viewpoint',
                promotions: [],
                image: 'https://images.unsplash.com/photo-1631968494896-2c12666aa224?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                location: { area: 'Bhaktapur', lat: 27.7154, lng: 85.5208 },
                mapsLinkKey: 'nagarkot_key',
                averageRating: 4.7,
                priceRange: '$$',
                openingHours: defaultHours,
                isActive: true,
                typicalTimeSpent: '1–2 hours',
                vibe: ['photo', 'mountain', 'romantic'],
                suitableFor: ['solo', 'couple', 'friends'],
                specialFacilities: ['Sunrise panorama'],
                contactNumber: null,
                socialMedia: {}
            },

            // ================= LALITPUR =================
            {
                placeId: 'plc_013',
                placeName: 'Patan Durbar Square',
                promotions: [],
                image: 'https://images.unsplash.com/photo-1609898793184-7d1496532e84?q=80&w=1985&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                location: { area: 'Lalitpur', lat: 27.673, lng: 85.325 },
                mapsLinkKey: 'patan_key',
                averageRating: 4.9,
                priceRange: '$',
                openingHours: defaultHours,
                isActive: true,
                typicalTimeSpent: '2–3 hours',
                vibe: ['culture', 'spiritual', 'photo'],
                suitableFor: ['solo', 'couple', 'family', 'friends', 'school', 'elderly', 'accessibility'],
                specialFacilities: ['Museum access'],
                contactNumber: null,
                socialMedia: {}
            },
            {
                placeId: 'plc_014',
                placeName: 'Newari Food Experience',
                promotions: [],
                image: 'https://images.unsplash.com/photo-1593252719532-53f183016149?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                location: { area: 'Lalitpur', lat: 27.6735, lng: 85.3245 },
                mapsLinkKey: 'newari_key',
                averageRating: 4.7,
                priceRange: '$$',
                openingHours: defaultHours,
                isActive: true,
                typicalTimeSpent: '2 hours',
                vibe: ['foodie', 'culture', 'budget'],
                suitableFor: ['solo', 'couple', 'family', 'friends', 'school', 'large_group'],
                specialFacilities: ['Traditional cuisine'],
                contactNumber: null,
                socialMedia: {}
            }
        ];

        const updatedPlaces = [];

        for (const place of placesData) {
            console.log(`Uploading ${place.placeId}...`);

            const cloudinaryUrl = await uploadImage(place.image, place.placeId);

            updatedPlaces.push({
                ...place,
                image: cloudinaryUrl,
            });
        }

        console.log("💾 Saving places...");
        await Place.insertMany(updatedPlaces);

        console.log("💾 Saving vibes...");
        await Vibe.insertMany(vibesData);

        console.log("✅ Seeding complete!");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();