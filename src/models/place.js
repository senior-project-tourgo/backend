const mongoose = require("mongoose");

const openingSlotSchema = { open: String, close: String };

const placeSchema = new mongoose.Schema({
    placeId: { type: String, required: true, unique: true },
    placeName: { type: String, required: true },
    // References to Promotion documents
    promotions: [{ type: String, ref: 'Promotion' }],
    image: String,
    location: {
        area: {
            type: String,
            enum: ['Kathmandu', 'Pokhara', 'Bhaktapur', 'Lalitpur'],
        },
        lat: Number,
        lng: Number,
    },
    mapsLinkKey: String,
    averageRating: { type: Number, default: 0 },
    priceRange: {
        type: String,
        enum: ['$', '$$', '$$$', '$$$$'],
    },
    openingHours: {
        monday: [openingSlotSchema],
        tuesday: [openingSlotSchema],
        wednesday: [openingSlotSchema],
        thursday: [openingSlotSchema],
        friday: [openingSlotSchema],
        saturday: [openingSlotSchema],
        sunday: [openingSlotSchema],
    },
    isActive: { type: Boolean, default: true },
    typicalTimeSpent: String,
    vibe: [String],
    suitableFor: { type: [String], default: [] },
    specialFacilities: [String],
    contactNumber: String,
    socialMedia: {
        instagram: { handle: String, likes: { type: Number, default: 0 } },
        facebook: { page: String, likes: { type: Number, default: 0 } },
        tiktok: { handle: String, likes: { type: Number, default: 0 } },
        whatsapp: { number: String },
    },
    description: String,
    address: String,
    website: String,
    googleType: String,
    googleReviewCount: Number,
    placeType: String,
    reviews: [{
        text: String,
        rating: Number,
        author: String,
        time: Date,
    }],
    reviewTopics: [String],
    reviewSentiment: String,
    placeScore: Number,
    popularityTier: String,
    hoursConfidence: String,
    isUnescoSite: { type: Boolean, default: false },
    difficulty: String,
    bestSeason: [String],
}, { timestamps: true });

module.exports = mongoose.model("Place", placeSchema);
