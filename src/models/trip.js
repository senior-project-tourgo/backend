const mongoose = require("mongoose");
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
    places: [
        {
            placeId: {
                type: String,
                required: true
            },
            order: {
                type: Number,
                required: true
            }
        }
    ],
    status: {
        type: String,
        enum: ['saved', 'current', 'completed'],
        required: true
    },
    startedAt: Date,
    completedAt: Date
});

module.exports = mongoose.model("Trip", tripSchema);