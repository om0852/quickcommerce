import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  urls: {
    zepto: [String],
    blinkit: [String],
    jiomart: [String]
  },
  enabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.models.Category || mongoose.model('Category', CategorySchema);
