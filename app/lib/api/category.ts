/**
 * API Layer - Category Operations
 * Centralized API calls for category data fetching and management
 * Prevents duplication and ensures consistent error handling
 */

import { CategoryDataResponse, PriceHistoryEntry, Product, StockHistoryEntry } from '@/app/types/products';

/**
 * Fetch category data for products
 * @param category - Category name
 * @param pincode - Pincode for location
 * @param timestamp - Optional snapshot timestamp
 * @param signal - Optional AbortSignal for cancellation
 * @returns Promise with category data
 */
export const fetchCategoryData = async (
  category: string,
  pincode: string,
  timestamp?: string,
  signal?: AbortSignal
): Promise<CategoryDataResponse> => {
  let url = `/api/category-data?category=${encodeURIComponent(category)}&pincode=${encodeURIComponent(pincode)}`;

  if (timestamp) {
    url += `&timestamp=${encodeURIComponent(timestamp)}`;
  }

  const response = await fetch(url, {
    cache: 'no-store',
    signal
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to fetch category data');
  }

  const data = await response.json();
  return data;
};

/**
 * Fetch available snapshots for category/pincode
 * @param category - Category name
 * @param pincode - Pincode
 * @param signal - Optional AbortSignal
 * @returns Array of snapshot timestamps
 */
export const fetchAvailableSnapshots = async (
  category: string,
  pincode: string,
  signal?: AbortSignal
): Promise<string[]> => {
  const response = await fetch(
    `/api/available-snapshots?category=${encodeURIComponent(category)}&pincode=${encodeURIComponent(pincode)}`,
    { signal }
  );

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to fetch snapshots');
  }

  const data = await response.json();
  return data.snapshots || [];
};

/**
 * Update grouping data
 * @param groupingId - Group ID
 * @param updates - Fields to update (name, weight, brand, etc)
 * @returns Updated grouping data
 */
export const updateGrouping = async (
  groupingId: string,
  updates: Record<string, any>
): Promise<any> => {
  const response = await fetch('/api/grouping/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupingId, updates })
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to update grouping');
  }

  const data = await response.json();
  return data;
};

/**
 * Add product to grouping
 * @param targetGroupId - Target group ID
 * @param productId - Product ID to add
 * @param pincode - Pincode
 * @param platform - Platform name
 * @returns Response data
 */
export const addProductToGrouping = async (
  targetGroupId: string,
  productId: string,
  pincode: string,
  platform: string
): Promise<any> => {
  const response = await fetch('/api/grouping/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetGroupId,
      productId,
      pincode,
      platform
    })
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to add product to grouping');
  }

  const data = await response.json();
  return data;
};

/**
 * Remove product from grouping
 * @param groupingId - Group ID
 * @param productId - Product ID to remove
 * @param platform - Platform name
 * @returns Response data
 */
export const removeProductFromGrouping = async (
  groupingId: string,
  productId: string,
  platform: string
): Promise<any> => {
  const response = await fetch('/api/grouping/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      groupingId,
      productId,
      platform
    })
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to remove product from grouping');
  }

  const data = await response.json();
  return data;
};

/**
 * Delete product from database
 * @param products - Array of products to delete
 * @returns Response data
 */
export const deleteProduct = async (
  products: Array<{ productId: string; platform: string; pincode: string }>
): Promise<any> => {
  const response = await fetch('/api/product/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ products })
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to delete product');
  }

  const data = await response.json();
  return data;
};

/**
 * Regroup product into new grouping
 * @param productId - Product ID
 * @param platform - Platform name
 * @param category - Category name
 * @param pincode - Pincode
 * @returns Response data
 */
export const regroupProduct = async (
  productId: string,
  platform: string,
  category: string,
  pincode: string
): Promise<any> => {
  const response = await fetch('/api/grouping/regroup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId,
      platform,
      category,
      pincode
    })
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to regroup product');
  }

  const data = await response.json();
  return data;
};

/**
 * Custom error handler for API errors
 * Normalizes error messages and provides safe display text
 */
export const handleApiError = (error: any): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
};
