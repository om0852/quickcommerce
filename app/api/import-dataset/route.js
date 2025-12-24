import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

export async function POST(request) {
  try {
    const body = await request.json();
    const { datasetUrl, category: providedCategory } = body;

    if (!datasetUrl) {
      return NextResponse.json({ error: 'Dataset URL is required' }, { status: 400 });
    }

    // Fetch data from the provided dataset URL
    const response = await fetch(datasetUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch dataset: ${response.statusText}`);
    }

    const data = await response.json();
    const items = Array.isArray(data) ? data : (data.items || []);

    if (items.length === 0) {
      return NextResponse.json({ message: 'No items found in dataset', count: 0 });
    }

    await dbConnect();

    let insertedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;

    // Process each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Normalize fields
      const platform = (item.platform || 'dmart').toLowerCase();
      const pincode = String(item.pincode || '122018');
      const productId = item.productId || item.id;
      const scrapedAt = item.scrapedAt ? new Date(item.scrapedAt) : new Date();

      // Determine category
      let category = providedCategory;
      if (!category && item.searchQuery) {
        // Try to map searchQuery to category
        const query = item.searchQuery.toLowerCase();
        if (query.includes('milk')) category = 'milk';
        else if (query.includes('biscuit')) category = 'biscuits';
        else if (query.includes('tea')) category = 'tea';
        else if (query.includes('chip')) category = 'chips';
        else if (query.includes('hair')) category = 'hair-care';
        else category = 'unknown';
      }
      if (!category) category = 'unknown';

      // Check if this specific snapshot already exists
      const existingSnapshot = await ProductSnapshot.findOne({
        productId,
        platform,
        pincode,
        scrapedAt: scrapedAt
      });

      if (existingSnapshot) {
        skippedCount++;
        continue;
      }

      // Find previous snapshot to calculate changes
      // We look for the most recent snapshot BEFORE this one
      const previousSnapshot = await ProductSnapshot.findOne({
        productId,
        platform,
        pincode,
        scrapedAt: { $lt: scrapedAt }
      }).sort({ scrapedAt: -1 });

      const ranking = i + 1; // Assuming dataset is ordered by rank

      const priceChange = previousSnapshot ? (item.currentPrice || 0) - previousSnapshot.currentPrice : 0;
      const discountChange = previousSnapshot ? (item.discountPercentage || 0) - previousSnapshot.discountPercentage : 0;
      const rankingChange = previousSnapshot ? ranking - previousSnapshot.ranking : 0;

      const newSnapshot = new ProductSnapshot({
        category,
        pincode,
        platform,
        scrapedAt,
        productId,
        productName: item.productName || item.name,
        productImage: item.productImage || item.image,
        productWeight: item.productWeight || item.weight,
        rating: item.rating,
        currentPrice: item.currentPrice || 0,
        originalPrice: item.originalPrice,
        discountPercentage: item.discountPercentage,
        ranking,
        priceChange,
        discountChange,
        rankingChange,
        productUrl: item.productUrl || item.url,
        lastComparedWith: previousSnapshot?._id
      });

      await newSnapshot.save();
      insertedCount++;
    }

    return NextResponse.json({
      success: true,
      message: 'Dataset import completed',
      stats: {
        totalItems: items.length,
        inserted: insertedCount,
        skipped: skippedCount,
        updated: updatedCount
      }
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({
      error: 'Failed to import dataset',
      message: error.message
    }, { status: 500 });
  }
}
