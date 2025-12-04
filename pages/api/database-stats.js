import dbConnect from '@/lib/mongodb';
import ProductSnapshot from '@/models/ProductSnapshot';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();

    const totalDocuments = await ProductSnapshot.countDocuments();
    
    const uniqueTimestamps = await ProductSnapshot.aggregate([
      {
        $group: {
          _id: '$scrapedAt',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const byCategory = await ProductSnapshot.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const byPlatform = await ProductSnapshot.aggregate([
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    return res.status(200).json({
      success: true,
      summary: {
        totalDocuments,
        uniqueTimestamps: uniqueTimestamps.length,
        timestamps: uniqueTimestamps.map(t => ({
          timestamp: new Date(t._id).toISOString(),
          count: t.count
        })),
        byCategory: byCategory.map(c => ({
          category: c._id,
          count: c.count
        })),
        byPlatform: byPlatform.map(p => ({
          platform: p._id,
          count: p.count
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error getting database stats:', error);
    return res.status(500).json({ 
      error: 'Failed to get database stats',
      details: error.message 
    });
  }
}
