const mongoose = require('mongoose');
require('dotenv').config();

async function migratePlaces() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection;

    // Get tourgo database
    const tourgoDb = db.useDb('tourgo');
    const tourgoPlacesCollection = tourgoDb.collection('places');

    // Get test database
    const testDb = db.useDb('test');
    const testPlacesCollection = testDb.collection('places');

    // Fetch all places from tourgo database
    const tourgoPlaces = await tourgoPlacesCollection.find({}).toArray();
    console.log(`Found ${tourgoPlaces.length} places in tourgo database`);

    if (tourgoPlaces.length === 0) {
      console.log('No places to migrate');
      return;
    }

    // Get existing placeIds in test to avoid duplicates
    const existingPlaceIds = new Set(
      (await testPlacesCollection.find({}, { projection: { placeId: 1 } }).toArray())
        .map(p => p.placeId)
    );

    // Filter out places that already exist
    const placesToMigrate = tourgoPlaces.filter(p => !existingPlaceIds.has(p.placeId));
    console.log(`Places to migrate: ${placesToMigrate.length}`);

    if (placesToMigrate.length === 0) {
      console.log('All places already migrated');
      return;
    }

    // Prepare data for bulk insert (remove _id to let Mongo generate new ones)
    const dataToInsert = placesToMigrate.map(({ _id, ...place }) => place);

    // Bulk insert
    const result = await testPlacesCollection.insertMany(dataToInsert);
    console.log(`Successfully migrated ${result.insertedCount} places`);

    // Optional: Remove places from tourgo after successful migration
    // Uncomment the lines below if you want to remove from tourgo
    /*
    if (result.insertedCount > 0) {
      await tourgoPlacesCollection.deleteMany({ placeId: { $in: placesToMigrate.map(p => p.placeId) } });
      console.log('Removed migrated places from tourgo database');
    }
    */
    // Uncomment the lines below if you want to remove from tourgo
    /*
    if (migrated > 0) {
      await db.db('tourgo').collection('places').deleteMany({});
      console.log('Removed places from tourgo database');
    }
    */

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migratePlaces();