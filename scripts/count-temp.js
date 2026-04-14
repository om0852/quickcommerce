import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://creatosaurus1:EOaVFfQ5YhOD3UhF@creatosaurus.7trc5.mongodb.net/quickcommerce";

async function run() {
  await mongoose.connect(MONGODB_URI);
  const col = mongoose.connection.db.collection('productsnapshots');
  const start = new Date('2026-01-01T00:00:00.000Z');
  const end = new Date('2026-02-28T23:59:59.999Z');
  const count = await col.countDocuments({ 
    category: "Fruits & Vegetables",
    scrapedAt: { $gte: start, $lte: end } 
  });
  console.log('COUNT: ' + count);
  process.exit(0);
}
run();
