const mongoose = require("mongoose");

const vibeSchema = new mongoose.Schema({
    vibeId: { type: String, required: true, unique: true },
    vibeTitle: { type: String, required: true },
    image: { type: String, default: null }, // URL or local asset key
}, { timestamps: true });

module.exports = mongoose.model("Vibe", vibeSchema);
