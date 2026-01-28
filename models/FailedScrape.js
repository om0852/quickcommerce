import mongoose from 'mongoose';

const FailedScrapeSchema = new mongoose.Schema({
    // Scrape job identification
    platform: {
        type: String,
        required: true,
        enum: ['zepto', 'blinkit', 'jiomart', 'dmart'],
        index: true
    },
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

    // Retry tracking
    attemptCount: {
        type: Number,
        default: 0
    },
    maxAttempts: {
        type: Number,
        default: 4
    },
    lastAttemptAt: {
        type: Date
    },

    // Error details - array to track each retry attempt
    errors: [{
        attempt: Number,
        apiKey: String,
        errorMessage: String,
        statusCode: Number,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],

    // Job status
    status: {
        type: String,
        enum: ['pending', 'retrying', 'failed', 'resolved'],
        default: 'pending',
        index: true
    },

    // Store the original request for retry
    requestBody: mongoose.Schema.Types.Mixed,

    // Resolution tracking
    resolvedAt: Date,
    resolutionNote: String
}, {
    timestamps: true,
    suppressReservedKeysWarning: true
});

// Compound index for efficient querying
FailedScrapeSchema.index({ platform: 1, category: 1, pincode: 1, status: 1 });
FailedScrapeSchema.index({ status: 1, lastAttemptAt: -1 });

// Method to add a new error attempt
FailedScrapeSchema.methods.addErrorAttempt = function (apiKey, errorMessage, statusCode) {
    this.attemptCount += 1;
    this.lastAttemptAt = new Date();
    this.errors.push({
        attempt: this.attemptCount,
        apiKey,
        errorMessage,
        statusCode,
        timestamp: new Date()
    });

    // Update status based on attempt count
    if (this.attemptCount >= this.maxAttempts) {
        this.status = 'failed';
    } else {
        this.status = 'retrying';
    }

    return this.save();
};

// Method to mark as resolved
FailedScrapeSchema.methods.markResolved = function (note) {
    this.status = 'resolved';
    this.resolvedAt = new Date();
    this.resolutionNote = note || 'Successfully scraped';
    return this.save();
};

export default mongoose.models.FailedScrape || mongoose.model('FailedScrape', FailedScrapeSchema);
