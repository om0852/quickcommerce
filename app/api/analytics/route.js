import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const pincode = searchParams.get('pincode');
    const platform = searchParams.get('platform');

    if (!category || !pincode) {
      return NextResponse.json({ error: 'Category and pincode are required' }, { status: 400 });
    }

    await dbConnect();

    // 1. Get the latest snapshot timestamp for this category/pincode
    const latestSnapshot = await ProductSnapshot.findOne({ category, pincode })
      .sort({ scrapedAt: -1 })
      .select('scrapedAt');

    if (!latestSnapshot) {
      return NextResponse.json({ 
        priceDistribution: [], 
        stockOverview: [], 
        rankingData: [] 
      });
    }

    const latestTime = latestSnapshot.scrapedAt;

    // 2. Fetch all products from the latest snapshot
    const query = {
      category,
      pincode,
      scrapedAt: latestTime
    };

    // Add platform filter if specified and not 'all'
    if (platform && platform !== 'all') {
      query.platform = platform;
    }

    const products = await ProductSnapshot.find(query)
      .select('productName platform currentPrice priceChange ranking rankingChange discountPercentage isOutOfStock');

    // 3. Price Point Analysis
    const priceRanges = [
      { range: '₹0-49', min: 0, max: 50, count: 0 },
      { range: '₹50-99', min: 50, max: 100, count: 0 },
      { range: '₹100-199', min: 100, max: 200, count: 0 },
      { range: '₹200-499', min: 200, max: 500, count: 0 },
      { range: '₹500+', min: 500, max: 10000, count: 0 },
    ];

    products.forEach(p => {
      const price = p.currentPrice;
      const range = priceRanges.find(r => price >= r.min && price < r.max);
      if (range) {
        range.count++;
      }
    });

    // 4. Sales & Stock Overview (Products with activity)
    // Filter for products with any price or rank change
    const stockOverview = products
      .filter(p => p.priceChange !== 0 || p.rankingChange !== 0)
      .map(p => ({
        name: p.productName,
        category: p.platform, // Using platform as "category" column for now
        price: p.currentPrice,
        stockChange: p.rankingChange < 0 ? 'Rank ↑' : (p.rankingChange > 0 ? 'Rank ↓' : (p.priceChange < 0 ? 'Price ↓' : 'Price ↑')),
        stockStatus: (p.rankingChange < 0 || p.priceChange < 0) ? 'positive' : 'neutral', // Green for rank up or price drop
        // Add raw values for UI logic
        priceChange: p.priceChange,
        rankingChange: p.rankingChange
      }))
      .slice(0, 10); // Limit to top 10 active items

    // 5. Ranking Improvements by Price Range
    // Track products with improved rankings across different price ranges
    const valueBuckets = [
      { name: 'High Value (₹100+)', min: 100, max: Infinity, rankImproved: 0 },
      { name: 'Mid Value (₹40-99)', min: 40, max: 100, rankImproved: 0 },
      { name: 'Low Value (₹0-39)', min: 0, max: 40, rankImproved: 0 },
    ];

    products.forEach(p => {
      const bucket = valueBuckets.find(b => p.currentPrice >= b.min && p.currentPrice < b.max);
      if (bucket) {
        // Track products with improved rankings (rankingChange < 0 means rank went up)
        if (p.rankingChange < 0) {
          bucket.rankImproved++;
        }
      }
    });

    // 5. Stock Availability by Platform
    const stockByPlatform = [
      { name: 'Zepto', inStock: 0, outOfStock: 0 },
      { name: 'Blinkit', inStock: 0, outOfStock: 0 },
      { name: 'JioMart', inStock: 0, outOfStock: 0 }
    ];

    products.forEach(product => {
      const platformIndex = stockByPlatform.findIndex(p => p.name.toLowerCase() === product.platform);
      if (platformIndex !== -1) {
        if (product.isOutOfStock) {
          stockByPlatform[platformIndex].outOfStock++;
        } else {
          stockByPlatform[platformIndex].inStock++;
        }
      }
    });

    return NextResponse.json({
      priceDistribution: priceRanges,
      stockOverview,
      rankingData: valueBuckets.map(({ name, rankImproved }) => ({ name, rankImproved })),
      stockAvailability: stockByPlatform
    });

  } catch (error) {
    console.error('Analytics API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
}
