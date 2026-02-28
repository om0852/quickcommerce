import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Brand from '@/models/Brand';

// GET: Fetch brands
export async function GET(request) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(request.url);
        const fetchAll = searchParams.get('all') === 'true';

        const query = fetchAll ? {} : { enabled: true };
        const brands = await Brand.find(query).sort({ brandName: 1 });
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

        // Check for existing brand (case-insensitive check could be good, but schema handles unique brandName)
        // Ideally we should normalize the ID.

        // Create a simple slug-like ID
        const brandId = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        const newBrand = await Brand.create({
            brandName: trimmedName,
            brandId: brandId,
            enabled: true
        });

        return NextResponse.json({ success: true, brand: newBrand });
    } catch (error) {
        // Handle duplicate key error
        if (error.code === 11000) {
            return NextResponse.json({ success: false, error: 'Brand already exists' }, { status: 409 });
        }
        console.error('Error creating brand:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
