const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema({
    promotionId: { type: String, required: true, unique: true },
    promotionName: { type: String, required: true },
    placeId: { type: String, required: true, ref: 'Place' },
    discountType: {
        type: String,
        enum: ['percentage', 'fixed', 'freebie'],
        required: true,
    },
    discountValue: { type: Number, default: 0 }, // e.g. 20 for 20% or Rs.20
    description: { type: String, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    usageLimit: { type: Number, default: null }, // null = unlimited
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("Promotion", promotionSchema);
