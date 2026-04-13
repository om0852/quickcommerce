import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Brand from '@/models/Brand';
import ProductSnapshot from '@/models/ProductSnapshot';
import ProductGrouping from '@/models/ProductGrouping';
import { invalidateBrandsCache, invalidateAllCaches } from '@/lib/redis-pool';

// PUT: Rename a brand
export async function PUT(request, { params }) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const { newBrandName } = await request.json();

        if (!newBrandName || typeof newBrandName !== 'string' || !newBrandName.trim()) {
            return NextResponse.json({ success: false, error: 'New brand name is required' }, { status: 400 });
        }

        const trimmedName = newBrandName.trim();

        const existingBrand = await Brand.findById(id);
        if (!existingBrand) {
            return NextResponse.json({ success: false, error: 'Brand not found' }, { status: 404 });
        }

        const oldBrandName = existingBrand.brandName;

        // Update the brand document
        existingBrand.brandName = trimmedName;
        await existingBrand.save();

        // User requested removing cascading updates to ProductSnapshot and ProductGrouping 
        // to speed up the renaming process. It will now only update the Brand collection.

        // Invalidate: brands list cache + ALL category caches
        // (brand name changes are embedded in every cached category response)
        await Promise.all([
            invalidateBrandsCache(),
            invalidateAllCaches(),
        ]);
        console.log('[Brands] ♻️ Invalidated brands + all category caches after rename');

        return NextResponse.json({ success: true, brand: existingBrand });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ success: false, error: 'A brand with that name already exists' }, { status: 409 });
        }
        console.error('Error updating brand:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PATCH: Update ONLY the Brand collection (no cascade to groups/snapshots).
// Use this to correct casing in the Brand master record without resetting per-group brand overrides.
export async function PATCH(request, { params }) {
    try {
        await connectToDatabase();
        const { id } = await params;
        const { newBrandName } = await request.json();

        if (!newBrandName || typeof newBrandName !== 'string' || !newBrandName.trim()) {
            return NextResponse.json({ success: false, error: 'New brand name is required' }, { status: 400 });
        }

        const trimmedName = newBrandName.trim();

        const brand = await Brand.findByIdAndUpdate(
            id,
            { $set: { brandName: trimmedName } },
            { new: true }
        );

        if (!brand) {
            return NextResponse.json({ success: false, error: 'Brand not found' }, { status: 404 });
        }

        // Only invalidate brands list cache — no category cache reset needed since
        // per-group brand overrides (group.brand) take precedence in category-data.
        await invalidateBrandsCache().catch(() => {});

        console.log(`[Brands] Brand collection corrected (no cascade): "${brand.brandName}" brandId="${brand.brandId}"`);
        return NextResponse.json({ success: true, brand });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ success: false, error: 'A brand with that name already exists' }, { status: 409 });
        }
        console.error('Error patching brand:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}


// DELETE: Delete a brand and cascade remove from products/groups
export async function DELETE(request, { params }) {
    try {
        await connectToDatabase();
        const { id } = await params;

        const existingBrand = await Brand.findById(id);
        if (!existingBrand) {
            return NextResponse.json({ success: false, error: 'Brand not found' }, { status: 404 });
        }

        const brandNameToRemove = existingBrand.brandName;

        // Delete the brand document
        await Brand.findByIdAndDelete(id);

        // User requested removing cascading updates to ProductSnapshot and ProductGrouping
        // to speed up the deletion process. It will now only operate on the Brand collection.

        // Invalidate: brands list cache + ALL category caches
        await Promise.all([
            invalidateBrandsCache(),
            invalidateAllCaches(),
        ]);
        console.log('[Brands] ♻️ Invalidated brands + all category caches after delete');

        return NextResponse.json({ success: true, message: 'Brand deleted successfully' });
    } catch (error) {
        console.error('Error deleting brand:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
