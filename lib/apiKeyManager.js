/**
 * API Key Manager for Apify Scraper
 * Handles round-robin key rotation, health tracking, and automatic failover
 */

class ApiKeyManager {
    constructor() {
        // Load API keys from environment
        this.keyPools = {
            blinkit: [
                process.env.BLINKIT_API_KEY_1,
                process.env.BLINKIT_API_KEY_2,
                process.env.BLINKIT_API_KEY_3
            ].filter(Boolean),
            zepto: [
                process.env.ZEPTO_API_KEY_1,
                process.env.ZEPTO_API_KEY_2,
                process.env.ZEPTO_API_KEY_3
            ].filter(Boolean),
            jiomart: [
                process.env.JIOMART_API_KEY_1,
                process.env.JIOMART_API_KEY_2,
                process.env.JIOMART_API_KEY_3
            ].filter(Boolean),
            dmart: [
                process.env.DMART_API_KEY_1,
                process.env.DMART_API_KEY_2
            ].filter(Boolean)
        };

        // Actor endpoints
        this.actors = {
            blinkit: process.env.BLINKIT_ACTOR || 'obliteral_minnow~blinkit-scrapper',
            zepto: process.env.ZEPTO_ACTOR || 'obliteral_minnow~zepto-scrapper',
            jiomart: process.env.JIOMART_ACTOR || 'obliteral_minnow~jiomart-scrapper',
            dmart: process.env.DMART_ACTOR || 'obliteral_minnow~dmart-category-scrapper'
        };

        // Track current index for round-robin
        this.currentIndex = {
            blinkit: 0,
            zepto: 0,
            jiomart: 0,
            dmart: 0
        };

        // Health tracking: { keyId: { successes, failures, lastUsed } }
        this.keyHealth = {
            blinkit: {},
            zepto: {},
            jiomart: {},
            dmart: {}
        };

        this._initializeHealthTracking();
    }

    _initializeHealthTracking() {
        // Initialize health stats for each key
        Object.keys(this.keyPools).forEach(platform => {
            this.keyPools[platform].forEach((key, index) => {
                const keyId = this._getKeyId(key);
                this.keyHealth[platform][keyId] = {
                    index,
                    successes: 0,
                    failures: 0,
                    lastUsed: null,
                    lastError: null
                };
            });
        });
    }

    _getKeyId(key) {
        // Return last 8 characters of key for identification
        return key ? key.slice(-8) : 'unknown';
    }

    /**
     * Get the next API key for a platform using round-robin
     * @param {string} platform - Platform name (blinkit, zepto, jiomart, dmart)
     * @returns {string} API key
     */
    getNextKey(platform) {
        const keys = this.keyPools[platform];

        if (!keys || keys.length === 0) {
            throw new Error(`No API keys configured for platform: ${platform}`);
        }

        // Get current key
        const key = keys[this.currentIndex[platform]];

        // Move to next key (round-robin)
        this.currentIndex[platform] = (this.currentIndex[platform] + 1) % keys.length;

        // Update last used timestamp
        const keyId = this._getKeyId(key);
        if (this.keyHealth[platform][keyId]) {
            this.keyHealth[platform][keyId].lastUsed = new Date();
        }

        console.log(`🔑 Using ${platform} API key #${this.currentIndex[platform]} (${keyId})`);

        return key;
    }

    /**
     * Get the API URL for a platform with the next available key
     * @param {string} platform - Platform name
     * @returns {string} Complete API URL
     */
    getApiUrl(platform) {
        const key = this.getNextKey(platform);
        const actor = this.actors[platform];
        return `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${key}`;
    }

    /**
     * Mark a key as failed
     * @param {string} platform - Platform name
     * @param {string} key - API key that failed
     * @param {Error} error - Error object
     */
    markKeyFailure(platform, key, error) {
        const keyId = this._getKeyId(key);

        if (this.keyHealth[platform] && this.keyHealth[platform][keyId]) {
            this.keyHealth[platform][keyId].failures += 1;
            this.keyHealth[platform][keyId].lastError = {
                message: error.message,
                timestamp: new Date()
            };

            console.log(`❌ Key ${keyId} (${platform}) failed. Failures: ${this.keyHealth[platform][keyId].failures}`);
        }
    }

    /**
     * Mark a key as successful
     * @param {string} platform - Platform name
     * @param {string} key - API key that succeeded
     */
    markKeySuccess(platform, key) {
        const keyId = this._getKeyId(key);

        if (this.keyHealth[platform] && this.keyHealth[platform][keyId]) {
            this.keyHealth[platform][keyId].successes += 1;
            console.log(`✅ Key ${keyId} (${platform}) succeeded. Successes: ${this.keyHealth[platform][keyId].successes}`);
        }
    }

    /**
     * Get health statistics for a platform
     * @param {string} platform - Platform name
     * @returns {Object} Health stats
     */
    getKeyHealth(platform) {
        return this.keyHealth[platform] || {};
    }

    /**
     * Get health statistics for all platforms
     * @returns {Object} Complete health stats
     */
    getAllKeyHealth() {
        return this.keyHealth;
    }

    /**
     * Get summary of key pool status
     * @returns {Object} Summary of available keys per platform
     */
    getKeyPoolSummary() {
        const summary = {};
        Object.keys(this.keyPools).forEach(platform => {
            summary[platform] = {
                totalKeys: this.keyPools[platform].length,
                currentIndex: this.currentIndex[platform],
                keys: this.keyPools[platform].map(key => ({
                    keyId: this._getKeyId(key),
                    ...this.keyHealth[platform][this._getKeyId(key)]
                }))
            };
        });
        return summary;
    }

    /**
     * Get all keys for a platform (for parallel execution)
     * @param {string} platform - Platform name
     * @returns {Array} All API keys for the platform
     */
    getAllKeysForPlatform(platform) {
        return this.keyPools[platform] || [];
    }

    /**
     * Assign keys to pincodes for parallel execution
     * @param {string} platform - Platform name
     * @param {Array} pincodes - Array of pincodes
     * @returns {Array} Array of {pincode, key, keyIndex, keyId}
     */
    assignKeysToPincodes(platform, pincodes) {
        const keys = this.keyPools[platform];

        if (!keys || keys.length === 0) {
            throw new Error(`No API keys configured for platform: ${platform}`);
        }

        // Assign keys to pincodes (up to available keys)
        const assignments = pincodes.slice(0, keys.length).map((pincode, index) => ({
            pincode,
            key: keys[index],
            keyIndex: index,
            keyId: this._getKeyId(keys[index])
        }));

        console.log(`📋 Assigned ${assignments.length} keys for ${platform}:`,
            assignments.map(a => `${a.pincode}→key#${a.keyIndex}`).join(', '));

        return assignments;
    }

    /**
     * Get batch size for a platform (number of pincodes that can be processed in parallel)
     * @param {string} platform - Platform name
     * @returns {number} Number of keys available
     */
    getBatchSize(platform) {
        return this.keyPools[platform].length;
    }
}

// Export singleton instance
const apiKeyManager = new ApiKeyManager();
export default apiKeyManager;
