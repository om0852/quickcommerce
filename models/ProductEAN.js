import mongoose from 'mongoose';

const ProductEANSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  eanCode: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

export default mongoose.models.ProductEAN || mongoose.model('ProductEAN', ProductEANSchema);
