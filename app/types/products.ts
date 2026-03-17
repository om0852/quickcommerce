/**
 * Type Definitions for Products Module
 * Centralized type definitions to ensure consistency across components
 */

/**
 * Platform-specific product data
 */
export interface PlatformProductData {
  productId: string;
  productName?: string;
  name?: string;
  currentPrice?: number;
  originalPrice?: number;
  discountPercentage?: number;
  ranking?: number | string;
  isOutOfStock?: boolean;
  new?: boolean;
  isAd?: boolean;
  productImage?: string;
  subcategory?: string;
  officialSubCategory?: string;
}

/**
 * Merged product data across all platforms
 */
export interface Product {
  groupingId: string;
  parentGroupId?: string;
  name: string;
  brand?: string;
  weight?: string;
  image?: string;
  groupImage?: string;
  primaryImage?: string;
  officialCategory?: string;
  subCategory?: string;
  officialSubCategory?: string;
  isHeader?: boolean;
  hasGroupConflict?: boolean;

  // Platform-specific data
  zepto?: PlatformProductData;
  blinkit?: PlatformProductData;
  jiomart?: PlatformProductData;
  dmart?: PlatformProductData;
  flipkartMinutes?: PlatformProductData;
  instamart?: PlatformProductData;
}

/**
 * API Response for category data
 */
export interface CategoryDataResponse {
  products: Product[];
  lastUpdated?: string;
  category: string;
  pincode: string;
}

/**
 * Price history entry
 */
export interface PriceHistoryEntry {
  date: string;
  timestamp: number;
  Zepto?: number;
  Blinkit?: number;
  JioMart?: number;
  'Flipkart Minutes'?: number;
  'Zepto Rank'?: number;
  'Blinkit Rank'?: number;
  'JioMart Rank'?: number;
  'Flipkart Minutes Rank'?: number;
}

/**
 * Stock history entry
 */
export interface StockHistoryEntry {
  date: string;
  timestamp: number;
  Zepto?: number | null;
  Blinkit?: number | null;
  JioMart?: number | null;
  'Flipkart Minutes'?: number | null;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  key: string | null;
  direction: 'asc' | 'desc' | string;
}

/**
 * Platform counts object
 */
export interface PlatformCounts {
  all: number;
  jiomart: number;
  zepto: number;
  blinkit: number;
  dmart: number;
  flipkartMinutes: number;
  instamart: number;
}

/**
 * Toast state
 */
export interface ToastState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}
