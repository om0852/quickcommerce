"use client"
import Head from 'next/head';
import React, { useState } from 'react';
import { Search, Package, TrendingDown, Star, ShoppingCart, Globe } from 'lucide-react';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [pincode, setPincode] = useState('411001');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const PINCODE_OPTIONS = [
    { label: 'Pune — 411001', value: '411001' },
    { label: 'Pune — 411014', value: '411014' },
    { label: 'Mumbai — 400001', value: '400001' },
    { label: 'Mumbai — 400076', value: '400076' },
    { label: 'Nashik — 422001', value: '422001' }
  ];

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
    return prices.length > 0 ? Math.min(...prices) : null;
  };

  const calculateSavings = (product) => {
    const prices = [];
    if (product.zepto?.currentPrice) prices.push(product.zepto.currentPrice);
    if (product.blinkit?.currentPrice) prices.push(product.blinkit.currentPrice);
    if (product.jiomart?.currentPrice) prices.push(product.jiomart.currentPrice);
    if (prices.length >= 2) {
      return Math.max(...prices) - Math.min(...prices);
    }
    return 0;
  };

  return (
    <>
      <Head>
        <title>QuickCommerce Price Comparison</title>
        <meta name="description" content="Compare prices across Zepto, Blinkit, and JioMart" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Header */}
        <div className="border-b border-purple-500/20 backdrop-blur-sm sticky top-0 z-50 bg-slate-900/80">
          <div className="container mx-auto px-4 py-4 max-w-7xl">
            <div className="flex items-center gap-3 mb-4">
              <ShoppingCart className="text-purple-400" size={28} />
              <div>
                <h1 className="text-2xl font-bold text-white">QuickCommerce</h1>
                <p className="text-sm text-purple-300">Multi-store price comparison</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12 max-w-7xl">
          {/* Search Section */}
          <div className="mb-12">
            <div className="relative max-w-3xl mx-auto">
              <div className="flex gap-3 items-center">
                <select
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  aria-label="Select pincode"
                  className="w-44 px-3 py-3 bg-slate-800 border-2 border-purple-500/30 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                >
                  {PINCODE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Search for products (e.g., kurkure, chips, snacks)..."
                    className="w-full px-6 py-4 pr-14 text-lg bg-slate-800 border-2 border-purple-500/30 rounded-full focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-xl text-white placeholder-gray-400 transition-all"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-linear-to-r from-purple-600 to-purple-700 text-white p-3 rounded-full hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                  >
                    <Search size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-14 w-14 border-4 border-purple-500/30 border-t-purple-500"></div>
              <p className="mt-6 text-gray-300 text-lg font-medium">Searching across stores...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-6 py-4 rounded-lg max-w-2xl mx-auto backdrop-blur-sm">
              <p className="font-semibold flex items-center gap-2">
                <span className="text-lg">⚠️</span> Error
              </p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {/* Results */}
          {!loading && products.length > 0 && (
            <div className="space-y-8">
              <div className="text-center">
                <p className="text-gray-300 text-lg">
                  Found <span className="font-bold text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-pink-400 text-2xl">{products.length}</span> products
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {products.map((product, index) => (
                  <div
                    key={index}
                    className="group bg-slate-800 border border-purple-500/20 rounded-xl shadow-xl overflow-hidden hover:shadow-2xl hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-1"
                  >
                    {/* Product Image */}
                    <div className="relative h-56 bg-linear-to-br from-slate-700 to-slate-800 overflow-hidden">
                      <img
                        src={product.image || '/placeholder.svg'}
                        alt={product.name}
                        className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => (e.target.src = '/placeholder.svg')}
                      />
                      {calculateSavings(product) > 0 && (
                        <div className="absolute top-3 right-3 bg-linear-to-r from-green-500 to-emerald-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg">
                          <TrendingDown size={14} />
                          Save ₹{calculateSavings(product).toFixed(0)}
                        </div>
                      )}
                    </div>

                    <div className="p-5 space-y-4">
                      {/* Product Name */}
                      <h3 className="font-semibold text-gray-100 mb-2 line-clamp-2 min-h-12 text-base">
                        {product.name}
                      </h3>

                      {/* Weight & Rating */}
                      <div className="space-y-2">
                        {product.weight && (
                          <p className="text-sm text-gray-400 flex items-center gap-2">
                            <Package size={14} />
                            {product.weight}
                          </p>
                        )}

                        {product.rating && (
                          <div className="flex items-center gap-1">
                            <Star size={16} className="fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-semibold text-gray-300">{product.rating}</span>
                          </div>
                        )}
                      </div>

                      {/* Price Section */}
                      <div className="space-y-3 border-t border-purple-500/20 pt-4">
                        {/* Zepto */}
                        {product.zepto && (
                          <a
                            href={product.zepto.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-linear-to-r from-purple-600/20 to-purple-600/10 rounded-lg hover:from-purple-600/40 hover:to-purple-600/20 border border-purple-500/30 transition-all cursor-pointer group/zepto"
                          >
                            <div>
                              <p className="text-xs font-bold text-purple-300 uppercase tracking-wide">Zepto</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-lg font-bold text-white">
                                  ₹{product.zepto.currentPrice}
                                </span>
                                {product.zepto.originalPrice && product.zepto.currentPrice < product.zepto.originalPrice && (
                                  <>
                                    <span className="text-xs text-gray-400 line-through">
                                      ₹{product.zepto.originalPrice}
                                    </span>
                                    <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded font-semibold">
                                      {product.zepto.discountPercentage}% OFF
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-purple-300 group-hover/zepto:text-white transition-colors">
                              <Globe size={18} />
                            </div>
                          </a>
                        )}

                        {/* Blinkit */}
                        {product.blinkit && (
                          <a
                            href={product.blinkit.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-linear-to-r from-yellow-600/20 to-yellow-600/10 rounded-lg hover:from-yellow-600/40 hover:to-yellow-600/20 border border-yellow-500/30 transition-all cursor-pointer group/blinkit"
                          >
                            <div>
                              <p className="text-xs font-bold text-yellow-300 uppercase tracking-wide">Blinkit</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-lg font-bold text-white">
                                  ₹{product.blinkit.currentPrice}
                                </span>
                              </div>
                            </div>
                            <div className="text-yellow-300 group-hover/blinkit:text-white transition-colors">
                              <Globe size={18} />
                            </div>
                          </a>
                        )}

                        {/* JioMart */}
                        {product.jiomart && (
                          <a
                            href={product.jiomart.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-linear-to-r from-blue-600/20 to-blue-600/10 rounded-lg hover:from-blue-600/40 hover:to-blue-600/20 border border-blue-500/30 transition-all cursor-pointer group/jiomart"
                          >
                            <div>
                              <p className="text-xs font-bold text-blue-300 uppercase tracking-wide">JioMart</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-lg font-bold text-white">
                                  ₹{product.jiomart.currentPrice}
                                </span>
                              </div>
                            </div>
                            <div className="text-blue-300 group-hover/jiomart:text-white transition-colors">
                              <Globe size={18} />
                            </div>
                          </a>
                        )}

                        {/* Best Price */}
                        {getBestPrice(product) && (
                          <div className="text-center text-xs text-gray-400 pt-2 border-t border-purple-500/20">
                            Best price: <span className="font-bold text-transparent bg-clip-text bg-linear-to-r from-green-400 to-emerald-400">₹{getBestPrice(product).toFixed(0)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State - No Results */}
          {!loading && !error && products.length === 0 && searchQuery && (
            <div className="text-center py-16">
              <Package size={80} className="mx-auto text-purple-500/30 mb-4" />
              <p className="text-gray-300 text-lg font-medium">No products found</p>
              <p className="text-gray-500 text-sm mt-2">Try searching for different keywords</p>
            </div>
          )}

          {/* Empty State - Initial */}
          {!loading && !error && products.length === 0 && !searchQuery && (
            <div className="text-center py-16">
              <Search size={80} className="mx-auto text-purple-500/30 mb-4" />
              <p className="text-gray-300 text-lg font-medium">Start comparing prices</p>
              <p className="text-gray-500 text-sm mt-2">Search for products across Zepto, Blinkit, and JioMart</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}