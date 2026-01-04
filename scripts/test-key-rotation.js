/**
 * Test script for API Key Manager
 * This script verifies that API keys are rotating correctly for all platforms
 */

import apiKeyManager from '../lib/apiKeyManager.js';

console.log('🧪 Testing API Key Manager\n');
console.log('='.repeat(60));

// Test each platform
const platforms = ['blinkit', 'zepto', 'jiomart', 'dmart'];

platforms.forEach(platform => {
    console.log(`\n📱 Testing ${platform.toUpperCase()}`);
    console.log('-'.repeat(40));

    const keyCount = apiKeyManager.keyPools[platform].length;
    console.log(`Total keys available: ${keyCount}`);

    // Test rotation by getting keys multiple times
    console.log('\nRotation test (getting key 5 times):');
    for (let i = 0; i < 5; i++) {
        const url = apiKeyManager.getApiUrl(platform);
        console.log(`  ${i + 1}. ${url.slice(0, 80)}...${url.slice(-12)}`);
    }
});

// Display initial key pool summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Key Pool Summary:');
console.log(JSON.stringify(apiKeyManager.getKeyPoolSummary(), null, 2));

// Test mark success and failure
console.log('\n' + '='.repeat(60));
console.log('\n🔬 Testing key health tracking:');

const testPlatform = 'blinkit';
const testKey = apiKeyManager.keyPools[testPlatform][0];

console.log(`\nMarking ${testPlatform} key as successful...`);
apiKeyManager.markKeySuccess(testPlatform, testKey);

console.log(`Marking ${testPlatform} key as failed...`);
apiKeyManager.markKeyFailure(testPlatform, testKey, new Error('Test error'));

console.log(`\n${testPlatform} key health:`, apiKeyManager.getKeyHealth(testPlatform));

console.log('\n' + '='.repeat(60));
console.log('\n✅ API Key Manager test completed!\n');
