import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({path: '.env.local'});

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Suggestion = mongoose.model('Suggestion', new mongoose.Schema({}, {strict: false, collection: 'suggestions'}));
  const doc = await Suggestion.findOne({ images: { $exists: true, $not: { $size: 0 } } });
  
  fs.writeFileSync('sugg_out.json', JSON.stringify(doc || {error: 'None found'}, null, 2));
  
  await mongoose.connection.close();
  process.exit(0);
}

run().catch(console.error);
