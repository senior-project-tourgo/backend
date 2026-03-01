const mongoose = require("mongoose");

const placeSchema = new mongoose.Schema({
    placeId: { type: String, required: true, unique: true },
    placeName: { type: String, required: true },
    promotions: [String],
    image: String,
    location: {
        area: String,
        lat: Number,
        lng: Number
    },
    mapsLinkKey: String,
    averageRating: Number,
    priceRange: String,
    openingHours: {
        monday: [{ open: String, close: String }],
        tuesday: [{ open: String, close: String }],
        wednesday: [{ open: String, close: String }],
        thursday: [{ open: String, close: String }],
        friday: [{ open: String, close: String }],
        saturday: [{ open: String, close: String }],
        sunday: [{ open: String, close: String }]
    },
    isActive: Boolean,
    typicalTimeSpent: String,
    vibe: [String],
    specialFacilities: [String],
    contactNumber: String,
    socialMedia: {
        instagram: {
            handle: String,
            likes: Number
        },
        facebook: {
            page: String,
            likes: Number
        }
    }
}, { timestamps: true });

module.exports = mongoose.model("Place", placeSchema);