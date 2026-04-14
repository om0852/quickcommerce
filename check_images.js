import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({path: '.env'});

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Suggestion = mongoose.model('Suggestion', new mongoose.Schema({}, {strict: false, collection: 'suggestions'}));
  
  const count = await Suggestion.countDocuments({});
  console.log('Total suggestions: ', count);
  
  const withImage = await Suggestion.find({images: {$exists: true, $not: {$size: 0}}});
  console.log('With images: ', withImage.length);
  
  if(withImage.length > 0) {
    console.log('First image type: ', typeof withImage[0].images[0]);
    if (typeof withImage[0].images[0] === 'string') {
        console.log('First image prefix: ', withImage[0].images[0].substring(0, 30));
    }
  }
  
  await mongoose.connection.close();
  process.exit(0);
}

run().catch(console.error);
