/**
 * Sorting Utilities
 * Extracted sorting functions from page.jsx sortedProducts to reduce component complexity
 * Centralizes all sort logic for reusability
 */

import { Product, SortConfig } from '@/app/types/products';
import { PLATFORMS } from '@/app/constants/platforms';

const PLATFORMS_ARRAY = PLATFORMS as unknown as string[];

/**
 * Resolve product subcategory from multiple sources
 */
export const resolveSubCategory = (item: Product): string => {
  if (item.officialSubCategory && item.officialSubCategory !== 'General') {
    return item.officialSubCategory;
  }

  for (const p of PLATFORMS_ARRAY) {
    const platformData = item[p as keyof Product];
    if (platformData && typeof platformData === 'object') {
      const sub = (platformData as any).subcategory || (platformData as any).officialSubCategory;
      if (sub && sub !== 'General') return sub;
    }
  }

  return item.officialSubCategory || item.subCategory || 'Other';
};

/**
 * Check if product has new flag on any platform
 */
export const hasNewFlag = (product: Product, platformFilter: string = 'all'): boolean => {
  if (platformFilter !== 'all') {
    const platformData = product[platformFilter as keyof Product];
    return platformData && typeof platformData === 'object' ? (platformData as any).new === true : false;
  }

  return PLATFORMS_ARRAY.some(p => {
    const data = product[p as keyof Product];
    return data && typeof data === 'object' ? (data as any).new === true : false;
  });
};

/**
 * Check if product has ad flag on any platform
 */
export const hasAdFlag = (product: Product, platformFilter: string = 'all'): boolean => {
  if (platformFilter !== 'all') {
    const platformData = product[platformFilter as keyof Product];
    return platformData && typeof platformData === 'object' ? (platformData as any).isAd === true : false;
  }

  return PLATFORMS_ARRAY.some(p => {
    const data = product[p as keyof Product];
    return data && typeof data === 'object' ? (data as any).isAd === true : false;
  });
};

/**
 * Check if product is in stock on any platform
 */
export const hasStockFlag = (product: Product, platformFilter: string = 'all'): boolean => {
  if (platformFilter !== 'all') {
    const platformData = product[platformFilter as keyof Product];
    return platformData && typeof platformData === 'object' ? !(platformData as any).isOutOfStock : false;
  }

  return PLATFORMS_ARRAY.some(p => {
    const data = product[p as keyof Product];
    return data && typeof data === 'object' ? !(data as any).isOutOfStock : false;
  });
};

/**
 * Calculate average price across all platforms
 */
export const getAveragePrice = (product: Product): number => {
  let total = 0;
  let count = 0;

  PLATFORMS_ARRAY.forEach(p => {
    const platformData = product[p as keyof Product];
    if (platformData && typeof platformData === 'object') {
      const price = (platformData as any).currentPrice;
      if (price !== undefined && price !== null) {
        const num = Number(price);
        if (!isNaN(num) && num > 0) {
          total += num;
          count++;
        }
      }
    }
  });

  return count > 0 ? total / count : Infinity;
};

/**
 * Calculate average discount percentage across all platforms
 */
export const getAverageDiscount = (product: Product): number => {
  let total = 0;
  let count = 0;

  PLATFORMS_ARRAY.forEach(p => {
    const platformData = product[p as keyof Product];
    if (!platformData || typeof platformData !== 'object') return;

    const data = platformData as any;
    if (data.discountPercentage != null && !isNaN(Number(data.discountPercentage))) {
      total += Number(data.discountPercentage);
      count++;
    } else if (data.originalPrice != null && data.currentPrice != null) {
      const oPrice = Number(data.originalPrice);
      const cPrice = Number(data.currentPrice);
      if (!isNaN(oPrice) && !isNaN(cPrice) && oPrice > 0) {
        total += Math.max(0, ((oPrice - cPrice) / oPrice) * 100);
        count++;
      }
    }
  });

  return count > 0 ? total / count : -Infinity;
};

/**
 * Get minimum rank across all platforms for a product
 */
export const getMinRank = (product: Product): number => {
  let min = Infinity;

  PLATFORMS_ARRAY.forEach(p => {
    const platformData = product[p as keyof Product];
    if (platformData && typeof platformData === 'object') {
      const ranking = (platformData as any).ranking;
      if (ranking && !isNaN(ranking)) {
        const num = Number(ranking);
        if (num < min) min = num;
      }
    }
  });

  return min;
};

/**
 * Count number of platforms product is available on
 */
export const getPlatformCount = (product: Product): number => {
  return PLATFORMS_ARRAY.filter(p => product[p as keyof Product]).length;
};

/**
 * Create priority sort comparator for multiple flags
 */
export const createPrioritySort = (
  showInStockFirst: boolean,
  showOutStockFirst: boolean,
  showAdFirst: boolean,
  showNewFirst: boolean,
  showDangerFirst: boolean, // NEW
  showPureNewFirst: boolean, // NEW
  platformFilter: string,
  scrapeIntervals?: { start: Date | null, end: Date | null }
) => {
  return (a: Product, b: Product): number => {
    if (showPureNewFirst) {
      const isPureNew = (p: Product) => {
        if (!p.createdAt) return false;
        if (scrapeIntervals?.start && scrapeIntervals?.end) {
          const created = new Date(p.createdAt);
          return created > scrapeIntervals.start && created <= scrapeIntervals.end;
        }
        return p.groupingId?.startsWith('NG');
      };
      
      const aPure = isPureNew(a);
      const bPure = isPureNew(b);
      if (aPure && !bPure) return -1;
      if (!aPure && bPure) return 1;
    }

    if (showDangerFirst) {
      const hasDanger = (p: Product) => 
        Object.values(p.groupConflicts || {}).some((c: any) => c.hasConflict);
      const aD = hasDanger(a);
      const bD = hasDanger(b);
      if (aD && !bD) return -1;
      if (!aD && bD) return 1;
    }

    if (showInStockFirst) {
      const aIn = hasStockFlag(a, platformFilter);
      const bIn = hasStockFlag(b, platformFilter);
      if (aIn && !bIn) return -1;
      if (!aIn && bIn) return 1;
    }

    if (showOutStockFirst) {
      const aIn = hasStockFlag(a, platformFilter);
      const bIn = hasStockFlag(b, platformFilter);
      if (!aIn && bIn) return -1;
      if (aIn && !bIn) return 1;
    }

    if (showAdFirst) {
      const aIsAd = hasAdFlag(a, platformFilter);
      const bIsAd = hasAdFlag(b, platformFilter);
      if (aIsAd && !bIsAd) return -1;
      if (!aIsAd && bIsAd) return 1;
    }

    if (showNewFirst) {
      const aIsNew = hasNewFlag(a, platformFilter);
      const bIsNew = hasNewFlag(b, platformFilter);
      if (aIsNew && !bIsNew) return -1;
      if (!aIsNew && bIsNew) return 1;
    }

    return 0;
  };
};

/**
 * Main sort function that handles all sort config types
 */
export const createSortFunction = (
  sortConfig: SortConfig,
  prioritySort: (a: Product, b: Product) => number,
  platformFilter: string
) => {
  return (a: Product, b: Product): number => {
    const priority = prioritySort(a, b);
    if (priority !== 0) {
      if (!sortConfig.key) {
        return priority || (a.name || '').localeCompare(b.name || '');
      }
      return priority;
    }

    // Handle specific key sorts
    if (sortConfig.key === 'averagePrice') {
      const priceA = getAveragePrice(a);
      const priceB = getAveragePrice(b);
      if (priceA === Infinity && priceB === Infinity) return 0;
      if (priceA === Infinity) return 1;
      if (priceB === Infinity) return -1;
      return sortConfig.direction === 'asc' ? priceA - priceB : priceB - priceA;
    }

    if (sortConfig.key === 'averageDiscount') {
      const dA = getAverageDiscount(a);
      const dB = getAverageDiscount(b);
      if (dA === -Infinity && dB === -Infinity) return 0;
      if (dA === -Infinity) return 1;
      if (dB === -Infinity) return -1;
      return sortConfig.direction === 'asc' ? dA - dB : dB - dA;
    }

    if (sortConfig.key === 'groupCount') {
      const countA = getPlatformCount(a);
      const countB = getPlatformCount(b);
      if (countA !== countB) return sortConfig.direction === 'asc' ? countA - countB : countB - countA;
      return (a.name || '').localeCompare(b.name || '');
    }

    if (sortConfig.key === 'brand') {
      const brandA = (a.brand || '').trim().toLowerCase();
      const brandB = (b.brand || '').trim().toLowerCase();
      if (!brandA && !brandB) return (a.name || '').localeCompare(b.name || '');
      if (!brandA) return 1;
      if (!brandB) return -1;
      if (brandA !== brandB) return sortConfig.direction === 'asc' ? brandA.localeCompare(brandB) : brandB.localeCompare(brandA);
      return (a.name || '').localeCompare(b.name || '');
    }

    if (sortConfig.key === 'name') {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return sortConfig.direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    }

    // Platform column sort
    if (sortConfig.key) {
      const platformKey = sortConfig.key as keyof Product;
      const itemA = a[platformKey];
      const itemB = b[platformKey];
      if (!itemA && !itemB) return 0;
      if (!itemA) return 1;
      if (!itemB) return -1;

      if (sortConfig.direction === 'price_asc' || sortConfig.direction === 'price_desc') {
        const getPrice = (item: any): number => {
          if (item.averagePrice !== undefined && item.averagePrice !== null) return Number(item.averagePrice);
          if (item.currentPrice !== undefined && item.currentPrice !== null) return Number(item.currentPrice);
          return Infinity;
        };
        const priceA = getPrice(itemA);
        const priceB = getPrice(itemB);
        if (priceA !== priceB) return sortConfig.direction === 'price_asc' ? priceA - priceB : priceB - priceA;
        return 0;
      }

      const rankA = (itemA as any).ranking && !isNaN((itemA as any).ranking) ? Number((itemA as any).ranking) : Infinity;
      const rankB = (itemB as any).ranking && !isNaN((itemB as any).ranking) ? Number((itemB as any).ranking) : Infinity;
      if (rankA !== rankB) return sortConfig.direction === 'asc' ? rankA - rankB : rankB - rankA;
      return 0;
    }

    // Default sort
    const countA = getPlatformCount(a);
    const countB = getPlatformCount(b);
    if (countA !== countB) return countB - countA;

    const nameA = a.name || '';
    const nameB = b.name || '';
    if (nameA !== nameB) return nameA.localeCompare(nameB);

    const catA = a.officialCategory || '';
    const catB = b.officialCategory || '';
    if (catA !== catB) return catA.localeCompare(catB);

    const subA = resolveSubCategory(a);
    const subB = resolveSubCategory(b);
    if (subA !== subB) return subA.localeCompare(subB);

    return getMinRank(a) - getMinRank(b);
  };
};
