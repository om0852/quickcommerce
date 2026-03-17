/**
 * API Layer - Product History
 * Centralized fetch for product price and stock history
 * Eliminates duplication across AnalyticsTab, page.jsx, and ProductDetailsDialog
 */

import { PriceHistoryEntry, StockHistoryEntry } from '@/app/types/products';

interface ProductHistoryRequest {
  pincode: string;
  productIds: Record<string, string>;
  productNames: Record<string, string>;
  category?: string;
}

interface ProductHistoryResponse {
  history: Array<any>;
  error?: string;
}

/**
 * Fetch product price and stock history
 * Consolidated fetch used by multiple components
 *
 * @param request - Request payload with product identifiers
 * @param signal - Optional AbortSignal for request cancellation
 * @returns Promise with history array
 */
export const fetchProductHistory = async (
  request: ProductHistoryRequest,
  signal?: AbortSignal
): Promise<any[]> => {
  const response = await fetch('/api/product-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal
  });

  if (!response.ok) {
    const data = await response.json() as ProductHistoryResponse;
    throw new Error(data.error || 'Failed to fetch product history');
  }

  const data = await response.json() as ProductHistoryResponse;
  return data.history || [];
};

/**
 * Transform raw history into price history format for analytics tab
 * @param rawHistory - Raw history from API
 * @returns Formatted price history entries
 */
export const transformToPriceHistory = (rawHistory: any[]): PriceHistoryEntry[] => {
  return rawHistory.map(h => ({
    date: new Date(h.date).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    timestamp: new Date(h.date).getTime(),
    Zepto: h.Zepto,
    Blinkit: h.Blinkit,
    JioMart: h.JioMart,
    'Flipkart Minutes': h['Flipkart Minutes'],
    'Zepto Rank': h['Zepto Rank'],
    'Blinkit Rank': h['Blinkit Rank'],
    'JioMart Rank': h['JioMart Rank'],
    'Flipkart Minutes Rank': h['Flipkart Minutes Rank']
  }));
};

/**
 * Transform raw history into stock history format for stock analysis
 * Stock Status: 1 = In Stock, 0 = Out of Stock
 *
 * @param rawHistory - Raw history from API
 * @returns Formatted stock history entries
 */
export const transformToStockHistory = (rawHistory: any[]): StockHistoryEntry[] => {
  return rawHistory.map(item => {
    const date = new Date(item.date);
    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return {
      date: formattedDate,
      timestamp: date.getTime(),
      // If stock field is false (out of stock), return 0; otherwise return 1
      Zepto: item.Zepto !== null ? (item.zeptoStock === false ? 0 : 1) : null,
      Blinkit: item.Blinkit !== null ? (item.blinkitStock === false ? 0 : 1) : null,
      JioMart: item.JioMart !== null ? (item.jiomartStock === false ? 0 : 1) : null,
      'Flipkart Minutes': item['Flipkart Minutes'] !== null ? (item.flipkartMinutesStock === false ? 0 : 1) : null
    };
  });
};
