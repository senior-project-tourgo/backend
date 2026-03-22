// uploadHelper.js
const cloudinary = require("../config/cloudinary");

async function uploadImage(imageUrl, placeId) {
    try {
        const result = await cloudinary.uploader.upload(imageUrl, {
            folder: "places",
            public_id: placeId,
        });

        return result.secure_url;
    } catch (err) {
        console.error("❌ Failed:", imageUrl);
        return imageUrl; // fallback
    }
}

module.exports = { uploadImage };