import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Suggestion from './models/Suggestion.js';

dotenv.config({path: '.env.local'});

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  try {
    const s = await Suggestion.create({
      pincode: 'test',
      category: 'test',
      description: 'test image save',
      images: ['data:image/png;base64,TestString']
    });
    console.log("Saved suggestion:", JSON.stringify(s.toObject(), null, 2));
    await Suggestion.findByIdAndDelete(s._id);
  } catch (err) {
    console.error("Error creating:", err);
  }
  
  await mongoose.connection.close();
  process.exit(0);
}

run().catch(console.error);
