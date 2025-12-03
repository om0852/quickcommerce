"use client"
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Clock } from 'lucide-react';

export default function CategoriesPage() {
  const [category, setCategory] = useState('milk');
  const [pincode, setPincode] = useState('122018');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);

  const PINCODE_OPTIONS = [
    { label: 'Gurgaon — 122018', value: '122018' },
    { label: 'Gurgaon — 122017', value: '122017' },
    { label: 'Gurgaon — 122016', value: '122016' },
    { label: 'Gurgaon — 122015', value: '122015' },
    { label: 'Gurgaon — 122011', value: '122011' }
  ];

  const CATEGORY_OPTIONS = [
    { label: 'Milk', value: 'milk' },
    { label: 'Biscuits', value: 'biscuits' }
  ];

  const fetchCategoryData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/category-data?category=${encodeURIComponent(category)}&pincode=${encodeURIComponent(pincode)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch category data');
      }

      setProducts(data.products || []);
      setLastUpdated(data.lastUpdated);
    } catch (err) {
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryData();
  }, [category, pincode]);

  const renderChangeIndicator = (change, type = 'price') => {
    if (!change || change === 0) {
      return (
        <span className="badge badge-neutral">
          <Minus size={12} />
          No change
        </span>
      );
    }

    const isPositive = change > 0;

    if (type === 'ranking') {
      if (change < 0) {
        return (
          <span className="badge badge-success">
            <TrendingUp size={12} />
            ↑ {Math.abs(change)}
          </span>
        );
      } else {
        return (
          <span className="badge badge-danger">
            <TrendingDown size={12} />
            ↓ {change}
          </span>
        );
      }
    }

    const isGood = change < 0;
    return (
      <span className={`badge ${isGood ? 'badge-success' : 'badge-danger'}`}>
        {isGood ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
        {isPositive ? '+' : ''}₹{change.toFixed(2)}
      </span>
    );
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Category Price Tracker</h1>
        <p className="page-description">Monitor price changes across platforms</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="select"
            >
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Pincode
            </label>
            <select
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className="select"
            >
              {PINCODE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchCategoryData}
            disabled={loading}
            className="btn btn-primary"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {lastUpdated && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#737373' }}>
            <Clock size={16} />
            <span>Last updated: {formatTimestamp(lastUpdated)}</span>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="loading">
          <div>Loading category data...</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error" style={{ marginBottom: '2rem' }}>
          {error}
        </div>
      )}

      {/* Products Table */}
      {!loading && !error && products.length > 0 && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th style={{ textAlign: 'center' }}>Zepto</th>
                <th style={{ textAlign: 'center' }}>Blinkit</th>
                <th style={{ textAlign: 'center' }}>JioMart</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => (
                <tr key={index}>
                  {/* Product Info */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '0.375rem', background: '#fafafa' }}
                        />
                      )}
                      <div>
                        <p style={{ fontWeight: 500, fontSize: '0.95rem', marginBottom: '0.25rem' }}>{product.name}</p>
                        {product.weight && (
                          <p style={{ fontSize: '0.875rem', color: '#737373' }}>{product.weight}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Zepto */}
                  <td style={{ textAlign: 'center' }}>
                    {product.zepto ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>₹{product.zepto.currentPrice}</div>
                        <div style={{ fontSize: '0.75rem', color: '#737373' }}>Rank: #{product.zepto.ranking}</div>
                        {renderChangeIndicator(product.zepto.priceChange, 'price')}
                        {renderChangeIndicator(product.zepto.rankingChange, 'ranking')}
                      </div>
                    ) : (
                      <span style={{ color: '#737373' }}>N/A</span>
                    )}
                  </td>

                  {/* Blinkit */}
                  <td style={{ textAlign: 'center' }}>
                    {product.blinkit ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>₹{product.blinkit.currentPrice}</div>
                        <div style={{ fontSize: '0.75rem', color: '#737373' }}>Rank: #{product.blinkit.ranking}</div>
                        {renderChangeIndicator(product.blinkit.priceChange, 'price')}
                        {renderChangeIndicator(product.blinkit.rankingChange, 'ranking')}
                      </div>
                    ) : (
                      <span style={{ color: '#737373' }}>N/A</span>
                    )}
                  </td>

                  {/* JioMart */}
                  <td style={{ textAlign: 'center' }}>
                    {product.jiomart ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>₹{product.jiomart.currentPrice}</div>
                        <div style={{ fontSize: '0.75rem', color: '#737373' }}>Rank: #{product.jiomart.ranking}</div>
                        {renderChangeIndicator(product.jiomart.priceChange, 'price')}
                        {renderChangeIndicator(product.jiomart.rankingChange, 'ranking')}
                      </div>
                    ) : (
                      <span style={{ color: '#737373' }}>N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>No data available</h3>
          <p style={{ color: '#737373' }}>Run the scraping process to collect data for this category</p>
        </div>
      )}
    </div>
  );
}
