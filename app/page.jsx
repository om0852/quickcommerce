"use client"
import React, { useState } from 'react';
import { Search, TrendingDown } from 'lucide-react';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [pincode, setPincode] = useState('122018');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const PINCODE_OPTIONS = [
    { label: 'Gurgaon — 122018', value: '122018' },
    { label: 'Gurgaon — 122017', value: '122017' },
    { label: 'Gurgaon — 122016', value: '122016' },
    { label: 'Gurgaon — 122015', value: '122015' },
    { label: 'Gurgaon — 122011', value: '122011' }
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
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Product Search</h1>
        <p className="page-description">Compare prices across Zepto, Blinkit, and JioMart</p>
      </div>

      {/* Search Section */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Search Product
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g., milk, bread, eggs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Pincode
            </label>
            <select
              className="select"
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
            className="btn btn-primary"
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
          >
            <Search size={18} />
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="error" style={{ marginBottom: '2rem' }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="loading">
          <div>Searching products...</div>
        </div>
      )}

      {/* Results */}
      {!loading && products.length > 0 && (
        <div>
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              Found {products.length} products
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {products.map((product, index) => {
              const bestPrice = getBestPrice(product);
              const savings = calculateSavings(product);

              return (
                <div key={index} className="product-card">
                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="product-image"
                    />
                  )}

                  <div className="product-name">{product.name}</div>

                  {product.weight && (
                    <div style={{ fontSize: '0.875rem', color: '#737373', marginBottom: '0.75rem' }}>
                      {product.weight}
                    </div>
                  )}

                  {bestPrice && (
                    <div className="product-price">₹{bestPrice}</div>
                  )}

                  {savings > 0 && (
                    <div className="badge badge-success" style={{ marginBottom: '1rem' }}>
                      <TrendingDown size={14} />
                      Save ₹{savings}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {product.zepto && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: '#fafafa', borderRadius: '0.375rem' }}>
                        <span className="product-platform">Zepto</span>
                        <span style={{ fontWeight: 600 }}>₹{product.zepto.currentPrice}</span>
                      </div>
                    )}

                    {product.blinkit && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: '#fafafa', borderRadius: '0.375rem' }}>
                        <span className="product-platform">Blinkit</span>
                        <span style={{ fontWeight: 600 }}>₹{product.blinkit.currentPrice}</span>
                      </div>
                    )}

                    {product.jiomart && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: '#fafafa', borderRadius: '0.375rem' }}>
                        <span className="product-platform">JioMart</span>
                        <span style={{ fontWeight: 600 }}>₹{product.jiomart.currentPrice}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && products.length === 0 && searchQuery && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>No products found</h3>
          <p style={{ color: '#737373' }}>Try searching for something else</p>
        </div>
      )}
    </div>
  );
}