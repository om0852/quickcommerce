import FailedScrape from '@/models/FailedScrape';

/**
 * Queue Manager for handling retry logic with exponential backoff
 */
class QueueManager {
    constructor() {
        // Exponential backoff delays in milliseconds: 5s, 10s, 20s, 40s
        this.retryDelays = [5000, 10000, 20000, 40000];
        this.maxAttempts = 4;
    }

    /**
     * Calculate delay for next retry based on attempt number
     * @param {number} attemptNumber - Current attempt number (0-indexed)
     * @returns {number} Delay in milliseconds
     */
    getRetryDelay(attemptNumber) {
        if (attemptNumber >= this.retryDelays.length) {
            return this.retryDelays[this.retryDelays.length - 1];
        }
        return this.retryDelays[attemptNumber];
    }

    /**
     * Wait for specified delay
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise}
     */
    async wait(ms) {
        console.log(`⏳ Waiting ${ms / 1000}s before retry...`);
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if should retry based on attempt count
     * @param {number} attemptCount - Current attempt count
     * @returns {boolean}
     */
    shouldRetry(attemptCount) {
        return attemptCount < this.maxAttempts;
    }

    /**
     * Find or create a FailedScrape record
     * @param {Object} params - Scrape parameters
     * @returns {Promise<FailedScrape>}
     */
    async findOrCreateFailedScrape({ platform, category, pincode, requestBody }) {
        let failedScrape = await FailedScrape.findOne({
            platform,
            category,
            pincode,
            status: { $in: ['pending', 'retrying'] }
        });

        if (!failedScrape) {
            failedScrape = new FailedScrape({
                platform,
                category,
                pincode,
                requestBody,
                attemptCount: 0,
                maxAttempts: this.maxAttempts
            });
            await failedScrape.save();
        }

        return failedScrape;
    }

    /**
     * Log a failed attempt
     * @param {Object} params - Failure parameters
     * @returns {Promise<FailedScrape>}
     */
    async logFailedAttempt({ platform, category, pincode, apiKey, error, statusCode, requestBody }) {
        const failedScrape = await this.findOrCreateFailedScrape({
            platform,
            category,
            pincode,
            requestBody
        });

        await failedScrape.addErrorAttempt(apiKey, error.message, statusCode);

        console.log(
            `❌ Attempt ${failedScrape.attemptCount}/${this.maxAttempts} failed for ${platform} - ${category} - ${pincode}`
        );

        return failedScrape;
    }

    /**
     * Mark a scrape as successfully resolved
     * @param {Object} params - Resolution parameters
     * @returns {Promise}
     */
    async markResolved({ platform, category, pincode, note }) {
        const failedScrape = await FailedScrape.findOne({
            platform,
            category,
            pincode,
            status: { $in: ['pending', 'retrying'] }
        });

        if (failedScrape) {
            await failedScrape.markResolved(note);
            console.log(`✅ Marked ${platform} - ${category} - ${pincode} as resolved`);
        }
    }

    /**
     * Get all failed scrapes that need retry
     * @returns {Promise<Array>}
     */
    async getRetryQueue() {
        return await FailedScrape.find({
            status: 'retrying',
            attemptCount: { $lt: this.maxAttempts }
        }).sort({ lastAttemptAt: 1 });
    }

    /**
     * Get all permanently failed scrapes
     * @returns {Promise<Array>}
     */
    async getPermanentFailures() {
        return await FailedScrape.find({
            status: 'failed'
        }).sort({ lastAttemptAt: -1 });
    }

    /**
     * Get statistics about the queue
     * @returns {Promise<Object>}
     */
    async getQueueStats() {
        const stats = await FailedScrape.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const statsMap = {};
        stats.forEach(stat => {
            statsMap[stat._id] = stat.count;
        });

        return {
            pending: statsMap.pending || 0,
            retrying: statsMap.retrying || 0,
            failed: statsMap.failed || 0,
            resolved: statsMap.resolved || 0,
            total: Object.values(statsMap).reduce((a, b) => a + b, 0)
        };
    }
}

// Export singleton instance
const queueManager = new QueueManager();
export default queueManager;
