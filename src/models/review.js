const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
    reviewId: { type: String, required: true, unique: true },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    placeId: { type: String, required: true, ref: 'Place' },
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        default: null,
    },
    reviewText: { type: String, default: '' },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    images: [String], // URLs
    date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("Review", reviewSchema);
