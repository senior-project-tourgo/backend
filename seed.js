require("dotenv").config();
const mongoose = require("mongoose");
const Place = require("./src/models/place.js");
const Vibe = require("./src/models/vibe.js");
const Promotion = require("./src/models/promotion.js");
const Reward = require("./src/models/reward.js");

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
        await Place.deleteMany();
        await Vibe.deleteMany();
        await Promotion.deleteMany();
        await Reward.deleteMany();

        await Place.insertMany([
            // ================= KATHMANDU =================
            {
                placeId: 'plc_001',
                placeName: 'Swayambhunath Stupa',
                promotions: [],
                image: 'https://images.unsplash.com/photo-1672338127087-d46c9ecd48f9?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                location: { area: 'Kathmandu', lat: 27.7149, lng: 85.29 },
                mapsLinkKey: 'swayambhu_key',
                averageRating: 4.8,
                priceRange: '$',
                openingHours: defaultHours,
                isActive: true,
                typicalTimeSpent: '1–2 hours',
                vibe: ['spiritual', 'viewpoint', 'heritage'],
                specialFacilities: ['Panoramic valley view'],
                contactNumber: null,
                socialMedia: {
                    instagram: { handle: '@swayambhu', likes: 12000 },
                    facebook: { page: 'Swayambhu Official', likes: 25000 }
                }
            },
            {
                placeId: 'plc_002',
                placeName: 'Boudhanath Stupa',
                promotions: [],
                image: 'https://images.unsplash.com/photo-1671888923932-d53a99498c27?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                location: { area: 'Kathmandu', lat: 27.7215, lng: 85.362 },
                mapsLinkKey: 'boudha_key',
                averageRating: 4.9,
                priceRange: '$',
                openingHours: defaultHours,
                isActive: true,
                typicalTimeSpent: '1–2 hours',
                vibe: ['spiritual', 'heritage'],
                specialFacilities: ['Prayer wheels'],
                contactNumber: null,
                socialMedia: {
                    instagram: { handle: '@boudha', likes: 15000 }
                }
            },
            {
                placeId: 'plc_003',
                placeName: 'Kathmandu Street Food Crawl',
                promotions: [],
                image: 'https://images.unsplash.com/photo-1761124740110-8989d68fafab?q=80&w=927&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                location: { area: 'Kathmandu', lat: 27.717, lng: 85.324 },
                mapsLinkKey: 'streetfood_key',
                averageRating: 4.6,
                priceRange: '$',
                openingHours: defaultHours,
                isActive: true,
                typicalTimeSpent: '2 hours',
                vibe: ['foodie'],
                specialFacilities: ['Local guide'],
                contactNumber: null,
                socialMedia: {
                    instagram: { handle: '@ktmfood', likes: 8000 }
                }
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
                vibe: ['trekking', 'mountain', 'viewpoint'],
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
                vibe: ['trekking', 'mountain'],
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
                vibe: ['lakeside', 'viewpoint'],
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
                vibe: ['mountain', 'viewpoint'],
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
                vibe: ['spiritual', 'viewpoint'],
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
                vibe: ['lakeside', 'viewpoint'],
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
                vibe: ['mountain'],
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
                vibe: ['heritage', 'spiritual'],
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
                vibe: ['viewpoint', 'mountain'],
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
                vibe: ['heritage', 'spiritual'],
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
                vibe: ['foodie'],
                specialFacilities: ['Traditional cuisine'],
                contactNumber: null,
                socialMedia: {}
            }
        ]);

        // ================= VIBES =================
        await Vibe.insertMany([
            { vibeId: 'spiritual',  vibeTitle: 'Spiritual',   image: 'https://images.unsplash.com/photo-1609898793184-7d1496532e84?w=400' },
            { vibeId: 'heritage',   vibeTitle: 'Heritage',    image: 'https://images.unsplash.com/photo-1618851142562-ff30d09313a9?w=400' },
            { vibeId: 'foodie',     vibeTitle: 'Foodie',      image: 'https://images.unsplash.com/photo-1761124740110-8989d68fafab?w=400' },
            { vibeId: 'trekking',   vibeTitle: 'Trekking',    image: 'https://images.unsplash.com/photo-1742311312069-ceb2afe8bda9?w=400' },
            { vibeId: 'mountain',   vibeTitle: 'Mountain',    image: 'https://images.unsplash.com/photo-1621910038795-50fc31d3c491?w=400' },
            { vibeId: 'viewpoint',  vibeTitle: 'Viewpoint',   image: 'https://images.unsplash.com/photo-1631968494896-2c12666aa224?w=400' },
            { vibeId: 'lakeside',   vibeTitle: 'Lakeside',    image: 'https://images.unsplash.com/photo-1576948187290-457c015b3bff?w=400' },
        ]);

        // ================= PROMOTIONS =================
        const now = new Date();
        const threeMonths = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());

        await Promotion.insertMany([
            {
                promotionId: 'promo_001',
                promotionName: '20% Off Sarangkot Paragliding',
                placeId: 'plc_007',
                discountType: 'percentage',
                discountValue: 20,
                description: 'Book a paragliding session and get 20% off on weekdays.',
                startDate: now,
                endDate: threeMonths,
                usageLimit: 100,
                isActive: true,
            },
            {
                promotionId: 'promo_002',
                promotionName: 'Free Boat Ride on Phewa Lake',
                placeId: 'plc_006',
                discountType: 'freebie',
                discountValue: 0,
                description: 'Get a complimentary 30-minute boat ride with any lakeside package.',
                startDate: now,
                endDate: threeMonths,
                usageLimit: 50,
                isActive: true,
            },
            {
                promotionId: 'promo_003',
                promotionName: 'Rs. 200 Off Newari Food Experience',
                placeId: 'plc_014',
                discountType: 'fixed',
                discountValue: 200,
                description: 'Save Rs. 200 on your first traditional Newari meal booking.',
                startDate: now,
                endDate: threeMonths,
                usageLimit: null,
                isActive: true,
            },
        ]);

        // ================= REWARDS =================
        await Reward.insertMany([
            {
                rewardId: 'rwd_001',
                title: 'Explorer Discount Badge',
                description: 'Unlock a 10% discount at partner restaurants once you reach Explorer tier.',
                xpCost: 100,
                rewardType: 'discount',
                promotionId: null,
                isActive: true,
                expiresAt: null,
            },
            {
                rewardId: 'rwd_002',
                title: 'Free Paragliding Session',
                description: 'Redeem 500 XP for a free tandem paragliding session at Sarangkot.',
                xpCost: 500,
                rewardType: 'freebie',
                promotionId: 'promo_001',
                isActive: true,
                expiresAt: threeMonths,
            },
            {
                rewardId: 'rwd_003',
                title: 'Legend Exclusive Access',
                description: 'Legend-tier travellers get early access to new place listings and exclusive guided tours.',
                xpCost: 1000,
                rewardType: 'exclusive_access',
                promotionId: null,
                isActive: true,
                expiresAt: null,
            },
        ]);

        console.log("Database seeded successfully!");
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

seed();