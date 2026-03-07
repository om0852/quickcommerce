import mongoose from 'mongoose';

const OverviewCacheSchema = new mongoose.Schema({
    pincode: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed, // Stores the array of aggregated category/platform/count objects
        required: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const OverviewCache = mongoose.models.OverviewCache || mongoose.model('OverviewCache', OverviewCacheSchema);

export default OverviewCache;
