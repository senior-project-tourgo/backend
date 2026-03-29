const mongoose = require('mongoose');
require('dotenv').config();

async function checkCounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection;

    const tourgoCount = await db.useDb('tourgo').collection('places').countDocuments();
    const testCount = await db.useDb('test').collection('places').countDocuments();

    console.log(`Places in tourgo: ${tourgoCount}`);
    console.log(`Places in test: ${testCount}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

checkCounts();