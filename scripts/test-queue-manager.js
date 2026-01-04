/**
 * Test script for Queue Manager
 * This script verifies failed scrape tracking and retry logic
 */

import mongoose from 'mongoose';
import queueManager from '../lib/queueManager.js';
import dbConnect from '../lib/mongodb.js';

async function testQueueManager() {
    console.log('🧪 Testing Queue Manager\n');
    console.log('='.repeat(60));

    // Connect to database
    await dbConnect();

    // Test 1: Log a failed attempt
    console.log('\n📝 Test 1: Logging failed scrape attempt');
    console.log('-'.repeat(40));

    const testParams = {
        platform: 'blinkit',
        category: 'test-milk',
        pincode: '122018',
        apiKey: 'test_key',
        error: new Error('Simulated API error'),
        statusCode: 503,
        requestBody: { test: 'data' }
    };

    let failedScrape = await queueManager.logFailedAttempt(testParams);
    console.log(`✅ Logged attempt #${failedScrape.attemptCount}`);
    console.log(`Status: ${failedScrape.status}`);

    // Test 2: Multiple retry attempts
    console.log('\n📝 Test 2: Simulating multiple retry attempts');
    console.log('-'.repeat(40));

    for (let i = 1; i < 4; i++) {
        failedScrape = await queueManager.logFailedAttempt({
            ...testParams,
            error: new Error(`Attempt ${i + 1} failed`)
        });
        console.log(`Attempt ${failedScrape.attemptCount}: Status = ${failedScrape.status}`);

        if (queueManager.shouldRetry(failedScrape.attemptCount)) {
            const delay = queueManager.getRetryDelay(failedScrape.attemptCount - 1);
            console.log(`  → Should retry after ${delay}ms`);
        } else {
            console.log(`  → Max retries reached, will not retry`);
        }
    }

    // Test 3: Queue statistics
    console.log('\n📝 Test 3: Getting queue statistics');
    console.log('-'.repeat(40));

    const stats = await queueManager.getQueueStats();
    console.log('Queue Stats:', stats);

    // Test 4: Get retry queue
    console.log('\n📝 Test 4: Getting retry queue');
    console.log('-'.repeat(40));

    const retryQueue = await queueManager.getRetryQueue();
    console.log(`Items in retry queue: ${retryQueue.length}`);

    // Test 5: Mark as resolved
    console.log('\n📝 Test 5: Marking scrape as resolved');
    console.log('-'.repeat(40));

    await queueManager.markResolved({
        platform: 'blinkit',
        category: 'test-milk',
        pincode: '122018',
        note: 'Test resolution'
    });
    console.log('✅ Marked as resolved');

    const updatedStats = await queueManager.getQueueStats();
    console.log('Updated Queue Stats:', updatedStats);

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Queue Manager test completed!\n');

    // Cleanup
    await mongoose.connection.close();
}

testQueueManager().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
