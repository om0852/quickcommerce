"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Clock, Filter, Package } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function CategoriesPage() {
  const [category, setCategory] = useState('milk');
  const [pincode, setPincode] = useState('122018');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [showMissing, setShowMissing] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
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
    { label: 'Biscuits', value: 'biscuits' },
    { label: 'Tea', value: 'tea' },
    { label: 'Chips', value: 'chips' },
    { label: 'Hair Care', value: 'hair-care' }
  ];

  const PLATFORM_OPTIONS = [
    { label: 'All Platforms', value: 'all' },
    { label: 'Zepto', value: 'zepto' },
    { label: 'Blinkit', value: 'blinkit' },
    { label: 'JioMart', value: 'jiomart' }
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

  const fetchHistoryData = async () => {
    if (!selectedProduct) return;
    
    setHistoryLoading(true);
    try {
      const productNames = {
        zepto: selectedProduct.zepto?.name || (selectedProduct.zepto ? selectedProduct.name : null),
        blinkit: selectedProduct.blinkit?.name || (selectedProduct.blinkit ? selectedProduct.name : null),
        jiomart: selectedProduct.jiomart?.name || (selectedProduct.jiomart ? selectedProduct.name : null)
      };

      // Fallback: if specific platform name isn't stored in the merged object structure (it might not be), use the common name
      // The merged object structure from API is: 
      // { name: "Common Name", zepto: { ... }, blinkit: { ... } }
      // The individual platform objects don't carry the name unless we added it.
      // Looking at route.js, 'name' is at top level.
      // So we use the top level name for all, assuming the scraper matched them correctly.
      // Wait, the API route uses `productName` from snapshot to query.
      // The merged object has `name` which is from one of the platforms.
      // Ideally we should pass the exact name used in each platform if they differ, but our merge logic normalizes.
      // Let's use the common name for now, or if we can, the specific names if available.
      // The current merge logic in route.js DOES NOT preserve individual platform names in the merged object, only the common one.
      // This might be a limitation. For now, we'll use the common `name` for all.
      // ACTUALLY: The `product-history` API expects `productNames` object.
      // If we only have one common name, we might miss history if the name on platform is slightly different.
      // BUT, since we found them by matching, they should be close.
      // Let's try sending the common name for all platforms where the product exists.
      
      const names = {};
      if (selectedProduct.zepto) names.zepto = selectedProduct.name;
      if (selectedProduct.blinkit) names.blinkit = selectedProduct.name;
      if (selectedProduct.jiomart) names.jiomart = selectedProduct.name;

      const response = await fetch('/api/product-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pincode,
          productNames: names
        })
      });
      
      const data = await response.json();
      if (data.history) {
        setHistoryData(data.history.map(h => ({
          date: new Date(h.date).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          timestamp: new Date(h.date).getTime(),
          Zepto: h.zepto?.price,
          Blinkit: h.blinkit?.price,
          JioMart: h.jiomart?.price,
          'Zepto Rank': h.zepto?.ranking,
          'Blinkit Rank': h.blinkit?.ranking,
          'JioMart Rank': h.jiomart?.ranking,
        })));
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if ((activeTab === 'price' || activeTab === 'ranking') && selectedProduct) {
      fetchHistoryData();
    }
  }, [activeTab, selectedProduct]);



  useEffect(() => {
    fetchCategoryData();
  }, [category, pincode]);

  const renderChangeIndicator = (change, type = 'price') => {
    // Don't show anything for no change - cleaner UI
    if (!change || change === 0) {
      return null;
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

  // Filter products based on selected platform
  const filteredProducts = useMemo(() => {
    if (platformFilter === 'all') {
      return products;
    }
    
    if (showMissing) {
      return products.filter(product => {
        const missingInSelected = !product[platformFilter];
        const presentInOthers = ['zepto', 'blinkit', 'jiomart']
          .filter(p => p !== platformFilter)
          .some(p => product[p]);
        return missingInSelected && presentInOthers;
      });
    }
    
    // Only show products that have data for the selected platform
    return products.filter(product => product[platformFilter]);
  }, [products, platformFilter, showMissing]);

  // Update selected product when filtered list changes
  useEffect(() => {
    if (filteredProducts.length > 0) {
      // If no product selected, or selected product not in current filtered list
      if (!selectedProduct || !filteredProducts.find(p => p.name === selectedProduct.name)) {
        setSelectedProduct(filteredProducts[0]);
      }
    } else {
      setSelectedProduct(null);
    }
  }, [filteredProducts, selectedProduct]);

  // Calculate platform statistics
  const platformStats = useMemo(() => {
    const stats = {
      zepto: { count: 0, avgPrice: 0, totalPrice: 0 },
      blinkit: { count: 0, avgPrice: 0, totalPrice: 0 },
      jiomart: { count: 0, avgPrice: 0, totalPrice: 0 }
    };

    products.forEach(product => {
      ['zepto', 'blinkit', 'jiomart'].forEach(platform => {
        if (product[platform]) {
          stats[platform].count++;
          stats[platform].totalPrice += product[platform].currentPrice;
        }
      });
    });

    // Calculate averages
    ['zepto', 'blinkit', 'jiomart'].forEach(platform => {
      if (stats[platform].count > 0) {
        stats[platform].avgPrice = stats[platform].totalPrice / stats[platform].count;
      }
    });

    return stats;
  }, [products]);

  const chartData = useMemo(() => {
    return filteredProducts.map(p => ({
      name: p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name,
      full_name: p.name,
      Zepto: p.zepto?.currentPrice,
      Blinkit: p.blinkit?.currentPrice,
      JioMart: p.jiomart?.currentPrice,
      'Zepto Rank': p.zepto?.ranking,
      'Blinkit Rank': p.blinkit?.ranking,
      'JioMart Rank': p.jiomart?.ranking,
    }));
  }, [filteredProducts]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Category Price Tracker</h1>
        <p className="page-description">Monitor price changes across platforms</p>
      </div>

      {/* Stats Cards */}
      {/* {!loading && products.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Zepto</span>
              <Package size={20} style={{ opacity: 0.9 }} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>{platformStats.zepto.count}</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Avg: ₹{platformStats.zepto.avgPrice.toFixed(2)}</div>
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Blinkit</span>
              <Package size={20} style={{ opacity: 0.9 }} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>{platformStats.blinkit.count}</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Avg: ₹{platformStats.blinkit.avgPrice.toFixed(2)}</div>
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>JioMart</span>
              <Package size={20} style={{ opacity: 0.9 }} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>{platformStats.jiomart.count}</div>
            <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Avg: ₹{platformStats.jiomart.avgPrice.toFixed(2)}</div>
          </div>
        </div>
      )} */}

      {/* Filters */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#171717' }}>
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
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#171717' }}>
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

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#171717' }}>
              &nbsp;
            </label>
            <button
              onClick={fetchCategoryData}
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Platform Filter */}
        <div style={{ paddingTop: '1.5rem', borderTop: '1px solid #e5e5e5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <Filter size={16} style={{ color: '#737373' }} />
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#171717' }}>
              Filter by Platform
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {PLATFORM_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPlatformFilter(opt.value)}
                className={platformFilter === opt.value ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ 
                  minWidth: 'auto',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem'
                }}
              >
                {opt.label}
              </button>
            ))}
            
            <div style={{ marginLeft: 'auto', paddingLeft: '1rem', borderLeft: '1px solid #e5e5e5' }}>
              <label style={{ fontSize: '0.875rem', color: '#171717', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: platformFilter === 'all' ? 'not-allowed' : 'pointer', opacity: platformFilter === 'all' ? 0.5 : 1 }}>
                <input 
                  type="checkbox" 
                  checked={showMissing} 
                  onChange={(e) => setShowMissing(e.target.checked)}
                  disabled={platformFilter === 'all'}
                  style={{ cursor: 'inherit' }}
                />
                Show Missing
              </label>
            </div>
          </div>
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
      {!loading && !error && filteredProducts.length > 0 && (
        <>
          <div className="tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e5e5' }}>
            {['products', 'price', 'ranking'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.75rem 0',
                  borderBottom: activeTab === tab ? '2px solid #000' : '2px solid transparent',
                  fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? '#000' : '#737373',
                  textTransform: 'capitalize',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.875rem', color: '#737373' }}>
              Showing <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'product' : 'products'}
              {platformFilter !== 'all' && ` on ${PLATFORM_OPTIONS.find(p => p.value === platformFilter)?.label}`}
            </div>
          </div>
          
          {activeTab === 'products' && (
            <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  {(platformFilter === 'all' || platformFilter === 'zepto' || showMissing) && <th style={{ textAlign: 'center' }}>Zepto</th>}
                  {(platformFilter === 'all' || platformFilter === 'blinkit' || showMissing) && <th style={{ textAlign: 'center' }}>Blinkit</th>}
                  {(platformFilter === 'all' || platformFilter === 'jiomart' || showMissing) && <th style={{ textAlign: 'center' }}>JioMart</th>}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, index) => (
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
                    {(platformFilter === 'all' || platformFilter === 'zepto' || showMissing) && (
                      <td style={{ textAlign: 'center' }}>
                        {product.zepto ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                            {product.zepto.url ? (
                              <a 
                                href={product.zepto.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ 
                                  fontWeight: 700, 
                                  fontSize: '1.125rem', 
                                  color: '#171717',
                                  textDecoration: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                ₹{product.zepto.currentPrice}
                              </a>
                            ) : (
                              <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>₹{product.zepto.currentPrice}</div>
                            )}
                            <div style={{ fontSize: '0.75rem', color: '#737373' }}>Rank: #{product.zepto.ranking}</div>
                            {renderChangeIndicator(product.zepto.priceChange, 'price')}
                            {renderChangeIndicator(product.zepto.rankingChange, 'ranking')}
                          </div>
                        ) : (
                          <span style={{ color: '#737373' }}>N/A</span>
                        )}
                      </td>
                    )}

                    {/* Blinkit */}
                    {(platformFilter === 'all' || platformFilter === 'blinkit' || showMissing) && (
                      <td style={{ textAlign: 'center' }}>
                        {product.blinkit ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                            {product.blinkit.url ? (
                              <a 
                                href={product.blinkit.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ 
                                  fontWeight: 700, 
                                  fontSize: '1.125rem', 
                                  color: '#171717',
                                  textDecoration: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                ₹{product.blinkit.currentPrice}
                              </a>
                            ) : (
                              <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>₹{product.blinkit.currentPrice}</div>
                            )}
                            <div style={{ fontSize: '0.75rem', color: '#737373' }}>Rank: #{product.blinkit.ranking}</div>
                            {renderChangeIndicator(product.blinkit.priceChange, 'price')}
                            {renderChangeIndicator(product.blinkit.rankingChange, 'ranking')}
                          </div>
                        ) : (
                          <span style={{ color: '#737373' }}>N/A</span>
                        )}
                      </td>
                    )}

                    {/* JioMart */}
                    {(platformFilter === 'all' || platformFilter === 'jiomart' || showMissing) && (
                      <td style={{ textAlign: 'center' }}>
                        {product.jiomart ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                            {product.jiomart.url ? (
                              <a 
                                href={product.jiomart.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ 
                                  fontWeight: 700, 
                                  fontSize: '1.125rem', 
                                  color: '#171717',
                                  textDecoration: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                ₹{product.jiomart.currentPrice}
                              </a>
                            ) : (
                              <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>₹{product.jiomart.currentPrice}</div>
                            )}
                            <div style={{ fontSize: '0.75rem', color: '#737373' }}>Rank: #{product.jiomart.ranking}</div>
                            {renderChangeIndicator(product.jiomart.priceChange, 'price')}
                            {renderChangeIndicator(product.jiomart.rankingChange, 'ranking')}
                          </div>
                        ) : (
                          <span style={{ color: '#737373' }}>N/A</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          {activeTab === 'price' && (
            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e5e5' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Select Product for History</label>
                <select 
                  className="select" 
                  style={{ 
                    width: '100%', 
                    maxWidth: '400px',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e5e5',
                    backgroundColor: '#fff',
                    fontSize: '0.875rem',
                    color: '#171717',
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                  }}
                  value={selectedProduct ? filteredProducts.findIndex(p => p.name === selectedProduct.name) : ''}
                  onChange={(e) => setSelectedProduct(filteredProducts[e.target.value])}
                >
                  {filteredProducts.map((p, i) => (
                    <option key={i} value={i}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div style={{ width: '100%', height: 500 }}>
                {historyLoading ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading history...</div>
                ) : historyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" angle={-45} textAnchor="end" interval={0} height={100} tick={{fontSize: 12}} />
                      <YAxis label={{ value: 'Price (₹)', angle: -90, position: 'insideLeft' }} domain={['auto', 'auto']} />
                      <Tooltip />
                      <Legend verticalAlign="top" height={36}/>
                      {(platformFilter === 'all' || platformFilter === 'zepto') && <Line type="monotone" dataKey="Zepto" stroke="#667eea" strokeWidth={2} connectNulls />}
                      {(platformFilter === 'all' || platformFilter === 'blinkit') && <Line type="monotone" dataKey="Blinkit" stroke="#f093fb" strokeWidth={2} connectNulls />}
                      {(platformFilter === 'all' || platformFilter === 'jiomart') && <Line type="monotone" dataKey="JioMart" stroke="#4facfe" strokeWidth={2} connectNulls />}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#737373' }}>No history data available</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ranking' && (
            <div style={{ background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e5e5' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Select Product for History</label>
                <select 
                  className="select" 
                  style={{ 
                    width: '100%', 
                    maxWidth: '400px',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e5e5',
                    backgroundColor: '#fff',
                    fontSize: '0.875rem',
                    color: '#171717',
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                  }}
                  value={selectedProduct ? filteredProducts.findIndex(p => p.name === selectedProduct.name) : ''}
                  onChange={(e) => setSelectedProduct(filteredProducts[e.target.value])}
                >
                  {filteredProducts.map((p, i) => (
                    <option key={i} value={i}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ width: '100%', height: 500 }}>
                {historyLoading ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading history...</div>
                ) : historyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" angle={-45} textAnchor="end" interval={0} height={100} tick={{fontSize: 12}} />
                      <YAxis label={{ value: 'Rank', angle: -90, position: 'insideLeft' }} reversed domain={['auto', 'auto']} />
                      <Tooltip />
                      <Legend verticalAlign="top" height={36}/>
                      {(platformFilter === 'all' || platformFilter === 'zepto') && <Line type="monotone" dataKey="Zepto Rank" name="Zepto" stroke="#667eea" strokeWidth={2} connectNulls />}
                      {(platformFilter === 'all' || platformFilter === 'blinkit') && <Line type="monotone" dataKey="Blinkit Rank" name="Blinkit" stroke="#f093fb" strokeWidth={2} connectNulls />}
                      {(platformFilter === 'all' || platformFilter === 'jiomart') && <Line type="monotone" dataKey="JioMart Rank" name="JioMart" stroke="#4facfe" strokeWidth={2} connectNulls />}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#737373' }}>No history data available</div>
                )}
              </div>
            </div>
          )}
        </>
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
