import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Suggestion from '@/models/Suggestion';

// GET: Fetch suggestions
export async function GET() {
    try {
        await connectToDatabase();
        const suggestions = await Suggestion.find({}).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, suggestions });
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: Create a new suggestion
export async function POST(request) {
    try {
        await connectToDatabase();
        const data = await request.json();

        const { pincode, category, groupId, productId, snapshotDate, productUrl, description, images } = data;

        if (!pincode || !category || !description) {
            return NextResponse.json({ success: false, error: 'Pincode, category, and description are required' }, { status: 400 });
        }

        const newSuggestion = await Suggestion.create({
            pincode,
            category,
            groupId,
            productId,
            snapshotDate,
            productUrl,
            description,
            images: images || [],
            status: 'pending'
        });

        return NextResponse.json({ success: true, suggestion: newSuggestion });
    } catch (error) {
        console.error('Error creating suggestion:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PATCH: Update suggestion status
export async function PATCH(request) {
    try {
        await connectToDatabase();
        const { id, status } = await request.json();

        if (!['completed', 'rejected'].includes(status)) {
            return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
        }

        const updatedSuggestion = await Suggestion.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!updatedSuggestion) {
            return NextResponse.json({ success: false, error: 'Suggestion not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, suggestion: updatedSuggestion });
    } catch (error) {
        console.error('Error updating suggestion status:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE: Delete a suggestion (admin only)
export async function DELETE(request) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'Suggestion ID is required' }, { status: 400 });
        }

        const deleted = await Suggestion.findByIdAndDelete(id);

        if (!deleted) {
            return NextResponse.json({ success: false, error: 'Suggestion not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting suggestion:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
