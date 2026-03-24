/**
 * Platform Configuration Constants
 * Centralized definitions for all platform-related values
 * Prevents duplication across multiple component files
 */

export const PLATFORMS = [
  'jiomart',
  'zepto',
  'blinkit',
  'dmart',
  'flipkartMinutes',
  'instamart'
] as const;

export type Platform = typeof PLATFORMS[number];

export const PLATFORM_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'JioMart', value: 'jiomart' },
  { label: 'Zepto', value: 'zepto' },
  { label: 'Blinkit', value: 'blinkit' },
  { label: 'DMart', value: 'dmart' },
  { label: 'Flipkart', value: 'flipkartMinutes' },
  { label: 'Instamart', value: 'instamart' }
] as const;

export const PLATFORM_SHORT_NAMES: Record<string, string> = {
  jiomart: 'JT',
  zepto: 'ZP',
  blinkit: 'BT',
  dmart: 'DM',
  flipkartMinutes: 'FM',
  instamart: 'IM'
};

export const PINCODE_OPTIONS = [
  { label: 'Delhi NCR — 201303', value: '201303' },
  { label: 'Navi Mumbai — 400706', value: '400706' },
  { label: 'Delhi NCR — 201014', value: '201014' },
  { label: 'Delhi NCR — 122008', value: '122008' },
  { label: 'Delhi NCR — 122010', value: '122010' },
  { label: 'Delhi NCR — 122016', value: '122016' },
  { label: 'Mumbai — 400070', value: '400070' },
  { label: 'Mumbai — 400703', value: '400703' },
  { label: 'Mumbai — 401101', value: '401101' },
  { label: 'Mumbai — 401202', value: '401202' }
] as const;

export const UNSERVICEABLE_PINCODES: Record<string, string[]> = {
  dmart: ['122008', '122016', '122010', '201303', '201014'],
  flipkartMinutes: ['400070', '401101'],
  zepto: ['401101', '401202']
};

export const PINCODE_AVAILABILITY: Record<string, string[]> = {
  zepto: PINCODE_OPTIONS.map(p => p.value).filter(val => !UNSERVICEABLE_PINCODES.zepto?.includes(val)),
  jiomart: PINCODE_OPTIONS.map(p => p.value), // ALL
  blinkit: PINCODE_OPTIONS.map(p => p.value), // ALL
  dmart: PINCODE_OPTIONS.map(p => p.value).filter(val => !UNSERVICEABLE_PINCODES.dmart?.includes(val)), 
  instamart: PINCODE_OPTIONS.map(p => p.value), // ALL
  flipkartMinutes: PINCODE_OPTIONS.map(p => p.value).filter(val => !UNSERVICEABLE_PINCODES.flipkartMinutes?.includes(val)),
};

export const PLATFORM_COLOR_MAP = {
  zepto: 'text-purple-700',
  blinkit: 'text-yellow-700',
  jiomart: 'text-blue-700',
  flipkartMinutes: 'text-blue-600',
  dmart: 'text-neutral-600',
  instamart: 'text-neutral-600'
} as const;

/**
 * Get platform color value for UI rendering
 * @param platform - Platform name
 * @returns Tailwind color class
 */
export const getPlatformColor = (platform: string): string => {
  // Normalize: remove spaces and convert to lowercase for matching
  const normalized = platform
    .toLowerCase()
    .replace(/\s+/g, '') // remove spaces
    .replace(/flipkartminutes/, 'flipkartminutes');
  
  // Find matching key in color map (case-insensitive)
  const key = Object.keys(PLATFORM_COLOR_MAP).find(
    k => k.toLowerCase().replace(/\s+/g, '') === normalized
  ) as Platform;
  
  return key ? PLATFORM_COLOR_MAP[key] : 'text-neutral-600';
};
