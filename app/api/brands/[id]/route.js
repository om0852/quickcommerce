import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Brand from '@/models/Brand';
import ProductSnapshot from '@/models/ProductSnapshot';
import ProductGrouping from '@/models/ProductGrouping';

// PUT: Rename a brand
export async function PUT(request, { params }) {
    try {
        await connectToDatabase();
        const { id } = params; // This is the mongodb _id of the Brand document
        const { newBrandName } = await request.json();

        if (!newBrandName || typeof newBrandName !== 'string' || !newBrandName.trim()) {
            return NextResponse.json({ success: false, error: 'New brand name is required' }, { status: 400 });
        }

        const trimmedName = newBrandName.trim();
        const newBrandIdSlug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        const existingBrand = await Brand.findById(id);
        if (!existingBrand) {
            return NextResponse.json({ success: false, error: 'Brand not found' }, { status: 404 });
        }

        const oldBrandName = existingBrand.brandName;

        // Update the brand document
        existingBrand.brandName = trimmedName;
        // Optionally update the brandId slug, but that might break existing refs if they depend on brandId. Let's update it anyway for consistency.
        existingBrand.brandId = newBrandIdSlug;
        await existingBrand.save();

        // Cascade update to ProductSnapshot
        await ProductSnapshot.updateMany(
            { brand: oldBrandName },
            { $set: { brand: trimmedName } }
        );

        // Cascade update to ProductGrouping
        await ProductGrouping.updateMany(
            { brandId: oldBrandName }, // Fallback check
            { $set: { brandId: newBrandIdSlug, brand: trimmedName } }
        );
        // Also update if they are just linked by brand name
        await ProductGrouping.updateMany(
            { brand: oldBrandName },
            { $set: { brand: trimmedName, brandId: newBrandIdSlug } }
        );

        return NextResponse.json({ success: true, brand: existingBrand });
    } catch (error) {
        if (error.code === 11000) {
            return NextResponse.json({ success: false, error: 'A brand with that name already exists' }, { status: 409 });
        }
        console.error('Error updating brand:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE: Delete a brand and cascade remove it from products/groups
export async function DELETE(request, { params }) {
    try {
        await connectToDatabase();
        const { id } = params;

        const existingBrand = await Brand.findById(id);
        if (!existingBrand) {
            return NextResponse.json({ success: false, error: 'Brand not found' }, { status: 404 });
        }

        const brandNameToRemove = existingBrand.brandName;

        // Delete the brand document
        await Brand.findByIdAndDelete(id);

        // Cascade remove from ProductSnapshot
        await ProductSnapshot.updateMany(
            { brand: brandNameToRemove },
            { $unset: { brand: "" } }
        );

        // Cascade remove from ProductGrouping
        await ProductGrouping.updateMany(
            { brand: brandNameToRemove },
            { $set: { brand: "", brandId: "N/A" } }
        );

        await ProductGrouping.updateMany(
            { brandId: brandNameToRemove },
            { $set: { brand: "", brandId: "N/A" } }
        );

        return NextResponse.json({ success: true, message: 'Brand deleted successfully' });
    } catch (error) {
        console.error('Error deleting brand:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
