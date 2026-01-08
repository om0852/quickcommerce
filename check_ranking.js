const mongoose = require('mongoose');
require('dotenv').config({ path: './local-scraper-service/.env' });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/quick-commerce-scraper";

async function checkRanking() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const ProductSnapshot = mongoose.connection.collection('productsnapshots');

        const total = await ProductSnapshot.countDocuments({});
        console.log(`Total Snapshots: ${total}`);

        // Check duplicates for finding history
        // Aggregate by name + platform + category to see if we have history
        const historyCheck = await ProductSnapshot.aggregate([
            {
                $group: {
                    _id: { name: "$productName", platform: "$platform" },
                    count: { $sum: 1 }
                }
            },
            { $match: { count: { $gt: 1 } } },
            { $count: "productsWithHistory" }
        ]).toArray();

        console.log('Products with > 1 snapshot:', historyCheck[0]?.productsWithHistory || 0);

        const rankingCheck = await ProductSnapshot.findOne({ ranking: { $exists: true } });
        console.log('Sample ranking field:', rankingCheck ? rankingCheck.ranking : 'N/A');

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkRanking();
