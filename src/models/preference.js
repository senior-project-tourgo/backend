const mongoose = require("mongoose");

/**
 * Stores the trip planning preferences a user submitted when generating a trip.
 * One preference instance is linked to one trip (For_a_trip relationship in ER).
 */
const preferenceSchema = new mongoose.Schema({
    prefId: { type: String, required: true, unique: true },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        default: null,
    },
    area: { type: String, required: true },
    period: { type: String, default: null },       // e.g. 'Morning', 'Afternoon'
    startTime: { type: String, default: null },    // HH:mm
    endTime: { type: String, default: null },      // HH:mm
    date: { type: Date, default: null },
    dayOfWeek: { type: String, default: null },
    pace: {
        type: String,
        enum: ['relaxed', 'balanced', 'packed'],
        default: 'balanced',
    },
    numberOfTravelers: { type: Number, default: 1 },
    specialPreference: { type: String, default: null },
    vibes: [String],                               // selected vibes
    totalDuration: { type: Number, default: null },// minutes
}, { timestamps: true });

module.exports = mongoose.model("Preference", preferenceSchema);
