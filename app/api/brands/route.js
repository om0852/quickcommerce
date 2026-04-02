import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Brand from '@/models/Brand';
import { getGeneralRedis, invalidateBrandsCache } from '@/lib/redis-pool';

// GET: Fetch brands (cached for 24 hours)
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const fetchAll = searchParams.get('all') === 'true';
        const cacheKey = fetchAll ? 'brands:all' : 'brands:enabled';
        const redis = getGeneralRedis();

        // Try cache first
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                console.log(`[Brands] 🚀 CACHE HIT: ${cacheKey}`);
                return NextResponse.json({ success: true, brands: cached, fromCache: true });
            }
        } catch (cacheErr) {
            console.warn('[Brands] Redis read error:', cacheErr.message);
        }

        // Cache miss — fetch from MongoDB
        await connectToDatabase();
        const query = fetchAll ? {} : { enabled: true };
        const brands = await Brand.find(query).sort({ brandName: 1 }).lean();

        // Store in Redis with 24h TTL
        try {
            await redis.set(cacheKey, brands, { ex: 86400 });
            console.log(`[Brands] 💾 CACHED: ${cacheKey} (${brands.length} brands)`);
        } catch (cacheErr) {
            console.warn('[Brands] Redis write error:', cacheErr.message);
        }

        return NextResponse.json({ success: true, brands });
    } catch (error) {
        console.error('Error fetching brands:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: Create a new brand
export async function POST(request) {
    try {
        await connectToDatabase();
        const { brandName } = await request.json();

        if (!brandName || typeof brandName !== 'string' || !brandName.trim()) {
            return NextResponse.json({ success: false, error: 'Brand name is required' }, { status: 400 });
        }

        const trimmedName = brandName.trim();
        const brandId = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        const newBrand = await Brand.create({
            brandName: trimmedName,
            brandId: brandId,
            enabled: true
        });

        // Invalidate brands cache so next GET returns updated list
        await invalidateBrandsCache();

        return NextResponse.json({ success: true, brand: newBrand });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ success: false, error: 'Brand already exists' }, { status: 409 });
        }
        console.error('Error creating brand:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
