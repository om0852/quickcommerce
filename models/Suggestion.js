import mongoose from 'mongoose';

const SuggestionSchema = new mongoose.Schema({
    pincode: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    groupId: {
        type: String,
        trim: true
    },
    productId: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'rejected'],
        default: 'pending'
    },
    submittedBy: {
        type: String, // Can store user ID or name if available
        default: 'Admin'
    }
}, {
    timestamps: true
});

export default mongoose.models.Suggestion || mongoose.model('Suggestion', SuggestionSchema);
