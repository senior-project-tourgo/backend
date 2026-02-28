require("dotenv").config();
const mongoose = require("mongoose");
const Place = require("./models/place");

mongoose.connect(process.env.MONGO_URI);

async function seed() {
    try {
        await Place.deleteMany(); // optional reset

        await Place.insertMany([
            {
                name: "Sky Lounge",
                moodTags: ["romantic", "chill"],
                minBudget: 1500,
                maxBudget: 4000,
                minPeople: 2,
                maxPeople: 6,
                rating: 4.6
            },
            {
                name: "Adventure Park",
                moodTags: ["adventure", "family"],
                minBudget: 800,
                maxBudget: 2000,
                minPeople: 3,
                maxPeople: 10,
                rating: 4.2
            },
            {
                name: "Night Club X",
                moodTags: ["party"],
                minBudget: 1000,
                maxBudget: 5000,
                minPeople: 4,
                maxPeople: 15,
                rating: 4.7
            }
        ]);

        console.log("Database seeded successfully!");
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

seed();