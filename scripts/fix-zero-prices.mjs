import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars manually
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
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

const ProductSnapshotSchema = new mongoose.Schema({
  currentPrice: { type: Number, required: true },
}, { strict: false }); // Strict false to allow updating other fields if needed, but we only need currentPrice

const ProductSnapshot = mongoose.models.ProductSnapshot || mongoose.model('ProductSnapshot', ProductSnapshotSchema);

async function fixZeroPrices() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    // Find count first
    const count = await ProductSnapshot.countDocuments({ currentPrice: 0 });
    console.log(`Found ${count} products with price 0.`);

    if (count === 0) {
      console.log('No products to update.');
      return;
    }

    console.log('Updating products...');
    
    // We can't use updateMany with a random value for each document easily in one go if we want *different* random values.
    // But maybe we can just iterate cursor.
    
    const cursor = ProductSnapshot.find({ currentPrice: 0 }).cursor();
    
    let updated = 0;
    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      const randomPrice = Math.floor(Math.random() * (100 - 20 + 1)) + 20;
      doc.currentPrice = randomPrice;
      // Also update originalPrice if it's 0 or less than new price? User didn't specify.
      // Let's just update currentPrice as requested.
      await doc.save();
      updated++;
      if (updated % 100 === 0) process.stdout.write(`\rUpdated ${updated} products...`);
    }

    console.log(`\nSuccessfully updated ${updated} products.`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
    process.exit(0);
  }
}

fixZeroPrices();
