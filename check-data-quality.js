const mongoose = require('mongoose');
require('dotenv').config();

async function checkDataQuality() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection;
    const placesCollection = db.useDb('test').collection('places');

    // Get total count
    const totalCount = await placesCollection.countDocuments();
    console.log(`Total places: ${totalCount}`);

    // Sample 100 random places for quality check
    const samplePlaces = await placesCollection.aggregate([
      { $sample: { size: 100 } }
    ]).toArray();

    console.log('\n=== DATA QUALITY ANALYSIS ===\n');

    // Check required fields
    let missingPlaceId = 0;
    let missingPlaceName = 0;
    let missingLocation = 0;
    let missingArea = 0;

    // Check data types and formats
    let invalidRatings = 0;
    let invalidLatLng = 0;
    let invalidPriceRange = 0;
    let invalidVibes = 0;

    // Check for duplicates
    const placeIds = new Set();
    let duplicateIds = 0;

    // Check enum values
    const validAreas = ['Kathmandu', 'Pokhara', 'Bhaktapur', 'Lalitpur'];
    const validPriceRanges = ['$', '$$', '$$$', '$$$$'];
    let invalidAreas = 0;

    for (const place of samplePlaces) {
      // Required fields
      if (!place.placeId) missingPlaceId++;
      if (!place.placeName) missingPlaceName++;
      if (!place.location) missingLocation++;
      else if (!place.location.area) missingArea++;

      // Check for duplicates
      if (place.placeId) {
        if (placeIds.has(place.placeId)) duplicateIds++;
        else placeIds.add(place.placeId);
      }

      // Data validation
      if (place.averageRating != null && (place.averageRating < 0 || place.averageRating > 5)) {
        invalidRatings++;
      }

      if (place.location?.lat != null && (place.location.lat < -90 || place.location.lat > 90)) {
        invalidLatLng++;
      }
      if (place.location?.lng != null && (place.location.lng < -180 || place.location.lng > 180)) {
        invalidLatLng++;
      }

      if (place.priceRange && !validPriceRanges.includes(place.priceRange)) {
        invalidPriceRange++;
      }

      if (place.location?.area && !validAreas.includes(place.location.area)) {
        invalidAreas++;
      }

      if (place.vibe && (!Array.isArray(place.vibe) || place.vibe.some(v => typeof v !== 'string'))) {
        invalidVibes++;
      }
    }

    // Check for overall duplicates in the collection
    const totalUniqueIds = await placesCollection.distinct('placeId');
    const actualDuplicates = totalCount - totalUniqueIds.length;

    console.log('COMPLETENESS:');
    console.log(`- Missing placeId: ${missingPlaceId}/100 (${(missingPlaceId/100*100).toFixed(1)}%)`);
    console.log(`- Missing placeName: ${missingPlaceName}/100 (${(missingPlaceName/100*100).toFixed(1)}%)`);
    console.log(`- Missing location: ${missingLocation}/100 (${(missingLocation/100*100).toFixed(1)}%)`);
    console.log(`- Missing area: ${missingArea}/100 (${(missingArea/100*100).toFixed(1)}%)`);

    console.log('\nACCURACY & VALIDITY:');
    console.log(`- Invalid ratings (not 0-5): ${invalidRatings}/100`);
    console.log(`- Invalid coordinates: ${invalidLatLng}/100`);
    console.log(`- Invalid price ranges: ${invalidPriceRange}/100`);
    console.log(`- Invalid areas: ${invalidAreas}/100`);
    console.log(`- Invalid vibes format: ${invalidVibes}/100`);

    console.log('\nUNIQUENESS:');
    console.log(`- Duplicate placeIds in sample: ${duplicateIds}/100`);
    console.log(`- Total duplicates in collection: ${actualDuplicates}/${totalCount} (${(actualDuplicates/totalCount*100).toFixed(2)}%)`);

    // Additional checks
    const placesWithImages = samplePlaces.filter(p => p.image).length;
    const placesWithRatings = samplePlaces.filter(p => p.averageRating != null).length;
    const placesWithVibes = samplePlaces.filter(p => p.vibe && p.vibe.length > 0).length;

    console.log('\nADDITIONAL METRICS:');
    console.log(`- Places with images: ${placesWithImages}/100 (${(placesWithImages/100*100).toFixed(1)}%)`);
    console.log(`- Places with ratings: ${placesWithRatings}/100 (${(placesWithRatings/100*100).toFixed(1)}%)`);
    console.log(`- Places with vibes: ${placesWithVibes}/100 (${(placesWithVibes/100*100).toFixed(1)}%)`);

    // Overall quality score
    const completenessScore = ((100 - missingPlaceId - missingPlaceName - missingLocation) / 100) * 100;
    const validityScore = ((100 - invalidRatings - invalidLatLng - invalidPriceRange - invalidAreas - invalidVibes) / 100) * 100;
    const uniquenessScore = ((100 - duplicateIds) / 100) * 100;

    const overallScore = (completenessScore + validityScore + uniquenessScore) / 3;

    console.log('\n=== QUALITY SCORES (0-100) ===');
    console.log(`Completeness: ${completenessScore.toFixed(1)}`);
    console.log(`Validity: ${validityScore.toFixed(1)}`);
    console.log(`Uniqueness: ${uniquenessScore.toFixed(1)}`);
    console.log(`Overall: ${overallScore.toFixed(1)}`);

    if (overallScore >= 90) {
      console.log('\n✅ EXCELLENT: Data quality is very good!');
    } else if (overallScore >= 75) {
      console.log('\n👍 GOOD: Data quality is acceptable with minor issues.');
    } else if (overallScore >= 60) {
      console.log('\n⚠️ FAIR: Data quality needs improvement.');
    } else {
      console.log('\n❌ POOR: Data quality requires significant cleaning.');
    }

  } catch (err) {
    console.error('Error checking data quality:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkDataQuality();