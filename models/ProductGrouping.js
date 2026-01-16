import mongoose from 'mongoose';

const ProductGroupingSchema = new mongoose.Schema({
    // Unique ID for the group (UUID or similar)
    groupingId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // List of products in this group
    products: [{
        platform: {
            type: String,
            required: true,
            enum: ['zepto', 'blinkit', 'jiomart', 'dmart', 'instamart', 'flipkart']
        },
        productId: {
            type: String,
            required: true
        }
    }],

    // Metadata (snapshot from the first/primary product for easy display)
    primaryName: String,
    primaryImage: String,
    primaryWeight: String,

    // To track manual overrides
    isManuallyVerified: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});

// Index for fast lookup of a specific product to find its group
ProductGroupingSchema.index({ 'products.platform': 1, 'products.productId': 1 });
ProductGroupingSchema.index({ primaryName: 'text' }); // Text index for candidate search

export default mongoose.models.ProductGrouping || mongoose.model('ProductGrouping', ProductGroupingSchema);
