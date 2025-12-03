import mongoose from 'mongoose';

const ProductSnapshotSchema = new mongoose.Schema({
  // Category and location
  category: {
    type: String,
    required: true,
    index: true
  },
  pincode: {
    type: String,
    required: true,
    index: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['zepto', 'blinkit', 'jiomart'],
    index: true
  },
  scrapedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  // Product details
  productId: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productImage: String,
  productWeight: String,
  rating: Number,
  
  // Pricing information
  currentPrice: {
    type: Number,
    required: true
  },
  originalPrice: Number,
  discountPercentage: Number,
  
  // Ranking
  ranking: {
    type: Number,
    required: true
  },
  
  // Comparison with previous snapshot
  priceChange: {
    type: Number,
    default: 0
  },
  discountChange: {
    type: Number,
    default: 0
  },
  rankingChange: {
    type: Number,
    default: 0
  },
  
  // Metadata
  productUrl: String,
  lastComparedWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductSnapshot'
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
ProductSnapshotSchema.index({ category: 1, pincode: 1, platform: 1, scrapedAt: -1 });
ProductSnapshotSchema.index({ category: 1, pincode: 1, scrapedAt: -1 });
ProductSnapshotSchema.index({ productId: 1, platform: 1, scrapedAt: -1 });

export default mongoose.models.ProductSnapshot || mongoose.model('ProductSnapshot', ProductSnapshotSchema);
