const mongoose = require("mongoose");

const SMESchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        businessName: String,
        location: String,
        category: String,
        priceRange: String,
    },
    { timestamps: true }
);

module.exports = mongoose.model("SME", SMESchema);
