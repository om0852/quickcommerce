import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars manually since dotenv might not be installed
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable inside .env');
  process.exit(1);
}

// Define Schema inline to avoid import issues
const ProductSnapshotSchema = new mongoose.Schema({
  category: { type: String, required: true },
  pincode: { type: String, required: true },
  platform: { type: String, required: true, enum: ['zepto', 'blinkit', 'jiomart'] },
  scrapedAt: { type: Date, required: true, default: Date.now },
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  productImage: String,
  productWeight: String,
  rating: Number,
  currentPrice: { type: Number, required: true },
  originalPrice: Number,
  discountPercentage: Number,
  ranking: { type: Number, required: true },
  priceChange: { type: Number, default: 0 },
  discountChange: { type: Number, default: 0 },
  rankingChange: { type: Number, default: 0 },
  productUrl: String,
  lastComparedWith: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductSnapshot' }
}, { timestamps: true });

// Prevent overwriting model if already compiled
const ProductSnapshot = mongoose.models.ProductSnapshot || mongoose.model('ProductSnapshot', ProductSnapshotSchema);

async function generateDummyData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    // 1. Get all unique products (latest snapshot for each)
    // We'll group by platform, pincode, and productId to find unique items
    const uniqueProducts = await ProductSnapshot.aggregate([
      {
        $sort: { scrapedAt: -1 }
      },
      {
        $group: {
          _id: {
            platform: '$platform',
            pincode: '$pincode',
            productId: '$productId'
          },
          doc: { $first: '$$ROOT' }
        }
      },
      {
        $replaceRoot: { newRoot: '$doc' }
      }
    ]);

    console.log(`Found ${uniqueProducts.length} unique products. Generating history...`);

    const newSnapshots = [];
    const targetDate = '2025-11-30';
    const times = ['00:00:00', '06:00:00', '12:00:00', '18:00:00'];

    for (const product of uniqueProducts) {
      for (const time of times) {
        const dateStr = `${targetDate}T${time}.000Z`;
        const scrapedAt = new Date(dateStr);

        // Random variations
        // Price: +/- 5%
        const priceVariation = 1 + (Math.random() * 0.1 - 0.05);
        const newPrice = Math.round(product.currentPrice * priceVariation);

        // Ranking: +/- 3 positions
        const rankVariation = Math.floor(Math.random() * 7) - 3; // -3 to +3
        let newRank = product.ranking + rankVariation;
        if (newRank < 1) newRank = 1;

        // Create new snapshot object
        const newSnapshot = {
          ...product,
          _id: new mongoose.Types.ObjectId(), // New ID
          scrapedAt: scrapedAt,
          currentPrice: newPrice,
          ranking: newRank,
          createdAt: scrapedAt,
          updatedAt: scrapedAt,
          priceChange: 0, // Reset changes for dummy data
          rankingChange: 0,
          discountChange: 0
        };
        
        delete newSnapshot.__v; // Remove version key

        newSnapshots.push(newSnapshot);
      }
    }

    if (newSnapshots.length > 0) {
      console.log(`Inserting ${newSnapshots.length} dummy snapshots...`);
      // Insert in batches to avoid too large payload
      const batchSize = 500;
      for (let i = 0; i < newSnapshots.length; i += batchSize) {
        const batch = newSnapshots.slice(i, i + batchSize);
        await ProductSnapshot.insertMany(batch, { ordered: false })
          .catch(err => {
            // Ignore duplicate key errors if we run this multiple times
            if (err.code !== 11000) console.error('Batch insert error:', err);
          });
        console.log(`Inserted batch ${i} to ${i + batch.length}`);
      }
      console.log('Done!');
    } else {
      console.log('No products found to generate history for.');
    }

  } catch (error) {
    console.error('Error:', error);
    fs.writeFileSync('error.log', error.stack || String(error));
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
    process.exit(0);
  }
}

generateDummyData();
