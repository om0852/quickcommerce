"use client"
import React, { useState, useMemo } from 'react';
import { Search, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [pincode, setPincode] = useState('122018');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [showMissing, setShowMissing] = useState(false);

  const PINCODE_OPTIONS = [
    { label: 'Gurgaon — 122018', value: '122018' },
    { label: 'Gurgaon — 122017', value: '122017' },
    { label: 'Gurgaon — 122016', value: '122016' },
    { label: 'Gurgaon — 122015', value: '122015' },
    { label: 'Gurgaon — 122011', value: '122011' },
    { label: 'Delhi NCR — 201303', value: '201303' },
    { label: 'Delhi NCR — 201014', value: '201014' },
    { label: 'Delhi NCR — 122008', value: '122008' },
    { label: 'Delhi NCR — 122010', value: '122010' }
  ];

  const filteredProducts = useMemo(() => {
    if (platformFilter === 'all') {
      return products;
    }

    if (showMissing) {
      return products.filter(product => {
        const missingInSelected = !product[platformFilter];
        const presentInOthers = ['zepto', 'blinkit', 'jiomart', 'dmart']
          .filter(p => p !== platformFilter)
          .some(p => product[p]);
        return missingInSelected && presentInOthers;
      });
    }

    // Only show products that have data for the selected platform
    return products.filter(product => product[platformFilter]);
  }, [products, platformFilter, showMissing]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/search?query=${encodeURIComponent(searchQuery)}&pincode=${encodeURIComponent(pincode)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch products');
      }

      setProducts(data.products);
    } catch (err) {
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getBestPrice = (product) => {
    const prices = [];
    if (product.zepto?.currentPrice) prices.push(product.zepto.currentPrice);
    if (product.blinkit?.currentPrice) prices.push(product.blinkit.currentPrice);
    if (product.jiomart?.currentPrice) prices.push(product.jiomart.currentPrice);
    if (product.dmart?.currentPrice) prices.push(product.dmart.currentPrice);
    return prices.length > 0 ? Math.min(...prices) : null;
  };

  const calculateSavings = (product) => {
    const prices = [];
    if (product.zepto?.currentPrice) prices.push(product.zepto.currentPrice);
    if (product.blinkit?.currentPrice) prices.push(product.blinkit.currentPrice);
    if (product.jiomart?.currentPrice) prices.push(product.jiomart.currentPrice);
    if (product.dmart?.currentPrice) prices.push(product.dmart.currentPrice);
    if (prices.length >= 2) {
      return Math.max(...prices) - Math.min(...prices);
    }
    return 0;
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-4 md:p-8 font-sans text-neutral-900">
      <div className="mb-8 max-w-[1400px] mx-auto text-center md:text-left">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-2">Product Search</h1>
        <p className="text-neutral-500">Compare prices across Zepto, Blinkit, JioMart, and DMart</p>
      </div>

      {/* Search Section */}
      <div className="max-w-[1400px] mx-auto bg-white rounded-xl shadow-sm border border-neutral-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_auto] gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-neutral-900 mb-2">
              Search Product
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="text"
                className="w-full h-[42px] pl-10 pr-4 rounded-md border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-colors"
                placeholder="e.g., milk, bread, eggs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-900 mb-2">
              Pincode
            </label>
            <select
              className="w-full h-[42px] px-3 rounded-md border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 cursor-pointer"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
            >
              {PINCODE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            className="h-[42px] px-6 bg-neutral-900 text-white rounded-md font-medium text-sm flex items-center gap-2 hover:bg-black transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
          >
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Search size={18} />}
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-[1400px] mx-auto mb-8 p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">
          {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="max-w-[1400px] mx-auto py-12 flex flex-col items-center justify-center text-neutral-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 mb-4"></div>
          <p className="text-sm font-medium">Searching products...</p>
        </div>
      )}

      {/* Results */}
      {!loading && products.length > 0 && (
        <div className="max-w-[1400px] mx-auto">
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {['all', 'zepto', 'blinkit', 'jiomart', 'dmart'].map(platform => (
                  <button
                    key={platform}
                    onClick={() => setPlatformFilter(platform)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-sm font-medium transition-colors border capitalize",
                      platformFilter === platform
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 hover:text-neutral-900"
                    )}
                  >
                    {platform}
                  </button>
                ))}
              </div>

              {platformFilter !== 'all' && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showMissing}
                    onChange={(e) => setShowMissing(e.target.checked)}
                    className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <span className="text-sm font-medium text-neutral-700">Show Missing in {platformFilter}</span>
                </label>
              )}
            </div>

            <div className="text-sm text-neutral-500">
              Showing {filteredProducts.length} results
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => {
              const bestPrice = getBestPrice(product);
              const savings = calculateSavings(product);

              // Find first available image
              const productImage = product.image || product.zepto?.productImage || product.blinkit?.productImage || product.jiomart?.productImage || product.dmart?.productImage;


              return (
                <div key={index} className="bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
                  <div className="aspect-[4/3] p-4 bg-white flex items-center justify-center border-b border-neutral-100 relative">
                    {productImage ? (
                      <img
                        src={productImage}
                        alt={product.name}
                        className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="text-neutral-300 text-xs">No Image</div>
                    )}

                    {savings > 0 && (
                      <div className="absolute top-3 right-3 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full border border-emerald-100 flex items-center gap-1 shadow-sm">
                        <TrendingDown size={12} />
                        Save ₹{savings}
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <h3 className="font-semibold text-neutral-900 mb-1 line-clamp-2 h-10 text-sm leading-relaxed" title={product.name}>
                      {product.name}
                    </h3>

                    {product.weight && (
                      <p className="text-xs text-neutral-500 mb-3">{product.weight}</p>
                    )}

                    {bestPrice && (
                      <div className="text-lg font-bold text-neutral-900 mb-4">
                        ₹{bestPrice}
                      </div>
                    )}

                    <div className="space-y-2">
                      {['zepto', 'blinkit', 'jiomart', 'dmart'].map(p => {
                        const pData = product[p];
                        if (!pData) return null;
                        return (
                          <div key={p} className="flex justify-between items-center p-2 rounded bg-neutral-50 border border-neutral-100 text-xs">
                            <span className="capitalize font-medium text-neutral-600">{p}</span>
                            <span className="font-bold text-neutral-900">₹{pData.currentPrice}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && products.length === 0 && searchQuery && (
        <div className="max-w-[1400px] mx-auto text-center py-16 bg-white rounded-xl border border-neutral-200">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-1">No products found</h3>
          <p className="text-neutral-500 text-sm">Try searching for something else</p>
        </div>
      )}
    </div>
  );
}