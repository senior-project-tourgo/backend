const mongoose = require("mongoose");

const tripPlaceSchema = new mongoose.Schema({
    placeId: { type: String, required: true },
    order: { type: Number, required: true },
    visitedAt: { type: Date, default: null }, // set on check-in
}, { _id: false });

const tripSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    itineraryName: {
        type: String,
        required: true
    },
    places: [tripPlaceSchema],
    status: {
        type: String,
        enum: ['saved', 'current', 'completed'],
        required: true
    },
    // Trip lifecycle timestamps
    startedAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    // Total duration in minutes (calculated on completion)
    totalDuration: { type: Number, default: null },
    // XP awarded for this trip
    xpEarned: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("Trip", tripSchema);
