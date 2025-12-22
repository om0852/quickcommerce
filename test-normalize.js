// Enhanced normalizeProductName function
// This version removes packaging details in parentheses to match products correctly

function normalizeProductName(name = '') {
  let normalized = String(name).toLowerCase();

  // Remove content in parentheses (packaging details like "Tetra Pack", "Pouch", "Tub")
  normalized = normalized.replace(/\([^)]*\)/g, ' ');

  // Remove content in square brackets
  normalized = normalized.replace(/\[[^\]]*\]/g, ' ');

  // Remove special characters but keep spaces
  normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');

  // Remove common packaging and filler words
  normalized = normalized.replace(/\b(tetra\s*pack|tetra|pouch|tub|bottle|carton|box|tin|can|jar|packet|sachet)\b/g, ' ');
  normalized = normalized.replace(/\b(of|and|with|pack|pcs|pc|pieces|piece)\b/g, ' ');

  // Remove units (but keep numbers)
  normalized = normalized.replace(/\b(kg|kgs|g|gm|gms|gram|grams|ml|ltr|litre|litres|liter|liters|l)\b/g, ' ');

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

// Test cases
console.log('Test 1:', normalizeProductName('Amul Taaza Homogenised Toned Milk'));
console.log('Test 2:', normalizeProductName('Amul Taaza Homogenised Toned Milk (Tetra Pack)'));
console.log('Test 3:', normalizeProductName('Mother Dairy Milk 1L (Pouch)'));
console.log('Test 4:', normalizeProductName('Mother Dairy Milk 1 Litre'));

// User provided examples
console.log('JioMart Example:', normalizeProductName('Bansiram Namkeen Sing Bhujia, Bikaneri Sev & Moong Dal Spicy & Crunchy Indian Snacks - Pack of 3 (175g each)'));
console.log('Zepto Example:', normalizeProductName('TGL Co. Creamy Hazelnut Medium Roast Organic Instant Coffee'));
console.log('Blinkit Example:', normalizeProductName('Country Delight Cow Fresh Milk'));

console.log('\nAll tests should show matching normalized names for similar products');
