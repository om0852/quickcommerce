import { NextResponse } from 'next/server';
import apiKeyManager from '@/lib/apiKeyManager';

export const dynamic = 'force-dynamic';

/**
 * GET /api/key-health
 * Returns health statistics for all API keys across all platforms
 */
export async function GET() {
    try {
        const summary = apiKeyManager.getKeyPoolSummary();
        const allHealth = apiKeyManager.getAllKeyHealth();

        return NextResponse.json({
            success: true,
            summary,
            health: allHealth,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching key health:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
