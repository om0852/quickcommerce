"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Clock, Filter, Package, Download } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AnalyticsTab from './AnalyticsTab';
import ExportCategoryDialog from './ExportCategoryDialog';

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
  const [stockData, setStockData] = useState(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

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
    console.log('🔍 fetchHistoryData called, selectedProduct:', selectedProduct);
    if (!selectedProduct) return;

    setHistoryLoading(true);
    try {
      const productIds = {};
      if (selectedProduct.zepto?.productId) productIds.zepto = selectedProduct.zepto.productId;
      if (selectedProduct.blinkit?.productId) productIds.blinkit = selectedProduct.blinkit.productId;
      if (selectedProduct.jiomart?.productId) productIds.jiomart = selectedProduct.jiomart.productId;

      // Also send names as fallback or for reference
      const productNames = {};
      if (selectedProduct.zepto?.name) productNames.zepto = selectedProduct.zepto.name;
      if (selectedProduct.blinkit?.name) productNames.blinkit = selectedProduct.blinkit.name;
      if (selectedProduct.jiomart?.name) productNames.jiomart = selectedProduct.jiomart.name;

      const response = await fetch('/api/product-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pincode,
          productIds,
          productNames
        })
      });


      const data = await response.json();
      console.log('📈 Received history data:', data);
      if (data.history) {
        const transformedData = data.history.map(h => ({
          date: new Date(h.date).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          timestamp: new Date(h.date).getTime(),
          Zepto: h.Zepto,
          Blinkit: h.Blinkit,
          JioMart: h.JioMart,
          'Zepto Rank': h['Zepto Rank'],
          'Blinkit Rank': h['Blinkit Rank'],
          'JioMart Rank': h['JioMart Rank'],
        }));
        console.log('📊 Transformed data for graph:', transformedData);
        console.log('📊 Sample data point:', transformedData[0]);
        setHistoryData(transformedData);
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

  useEffect(() => {
    if (activeTab === 'stock' && selectedProduct) {
      setStockLoading(true);

      // Get product IDs for the selected product
      const productIds = {};
      if (selectedProduct.zepto?.productId) productIds.zepto = selectedProduct.zepto.productId;
      if (selectedProduct.blinkit?.productId) productIds.blinkit = selectedProduct.blinkit.productId;
      if (selectedProduct.jiomart?.productId) productIds.jiomart = selectedProduct.jiomart.productId;

      fetch('/api/product-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          pincode,
          productIds,
          productNames: {
            zepto: selectedProduct.zepto?.name,
            blinkit: selectedProduct.blinkit?.name,
            jiomart: selectedProduct.jiomart?.name
          }
        })
      })
        .then(res => res.json())
        .then(data => {
          // Transform data for stock availability (1 = in stock, 0 = out of stock)
          const stockHistory = data.history?.map(item => {
            const date = new Date(item.date);
            const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            return {
              date: formattedDate,
              Zepto: item.Zepto !== null ? (item.zeptoStock === false ? 0 : 1) : null,
              Blinkit: item.Blinkit !== null ? (item.blinkitStock === false ? 0 : 1) : null,
              JioMart: item.JioMart !== null ? (item.jiomartStock === false ? 0 : 1) : null
            };
          }) || [];

          setStockData(stockHistory);
          setStockLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch stock history:', err);
          setStockData([]);
          setStockLoading(false);
        });
    } else if (activeTab === 'stock' && !selectedProduct) {
      setStockData([]);
    }
  }, [activeTab, selectedProduct, category, pincode]);

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
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={fetchCategoryData}
                disabled={loading}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button
                onClick={() => setIsExportOpen(true)}
                className="btn"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: '#171717',
                  color: 'white',
                  border: '1px solid #171717',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease',
                  fontWeight: 500
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#000000';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#171717';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                }}
              >
                <Download size={18} />
                Export
              </button>
            </div>
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

      <ExportCategoryDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        currentCategory={category}
        currentPincode={pincode}
        availableProducts={products}
        availablePlatforms={PLATFORM_OPTIONS}
        pincodeOptions={PINCODE_OPTIONS}
        categoryOptions={CATEGORY_OPTIONS}
      />

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
            {['products', 'price', 'ranking', 'stock', 'analytics'].map(tab => (
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
            <div className="table-container" style={{ overflow: 'hidden', borderRadius: '0.75rem', border: '1px solid #e5e5e5' }}>
              <table className="table" style={{ marginBottom: 0 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)' }}>
                    <th style={{ padding: '1rem 1.5rem', fontSize: '0.8125rem', fontWeight: 700, color: '#171717', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e5e5e5' }}>Product</th>
                    {(platformFilter === 'all' || platformFilter === 'zepto' || showMissing) && <th style={{ padding: '1rem 1.5rem', fontSize: '0.8125rem', fontWeight: 700, color: '#171717', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', borderBottom: '2px solid #e5e5e5' }}>Zepto</th>}
                    {(platformFilter === 'all' || platformFilter === 'blinkit' || showMissing) && <th style={{ padding: '1rem 1.5rem', fontSize: '0.8125rem', fontWeight: 700, color: '#171717', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', borderBottom: '2px solid #e5e5e5' }}>Blinkit</th>}
                    {(platformFilter === 'all' || platformFilter === 'jiomart' || showMissing) && <th style={{ padding: '1rem 1.5rem', fontSize: '0.8125rem', fontWeight: 700, color: '#171717', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', borderBottom: '2px solid #e5e5e5' }}>JioMart</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product, index) => (
                    <tr
                      key={index}
                      style={{
                        background: index % 2 === 0 ? 'white' : '#fafafa',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f3f4f6';
                        e.currentTarget.style.transform = 'scale(1.005)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = index % 2 === 0 ? 'white' : '#fafafa';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      {/* Product Info */}
                      <td style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          {product.image && (
                            <img
                              src={product.image}
                              alt={product.name}
                              style={{
                                width: '72px',
                                height: '72px',
                                objectFit: 'contain',
                                borderRadius: '0.5rem',
                                background: 'white',
                                border: '1px solid #e5e5e5',
                                padding: '0.25rem'
                              }}
                            />
                          )}
                          <div>
                            <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.375rem', color: '#171717', lineHeight: 1.4 }}>{product.name}</p>
                            {product.weight && (
                              <p style={{ fontSize: '0.8125rem', color: '#737373', background: '#f5f5f5', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', display: 'inline-block' }}>
                                {product.weight}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Zepto */}
                      {(platformFilter === 'all' || platformFilter === 'zepto' || showMissing) && (
                        <td style={{ textAlign: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
                          {product.zepto ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                              {product.zepto.url ? (
                                <a
                                  href={product.zepto.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontWeight: 700,
                                    fontSize: '1.25rem',
                                    color: '#171717',
                                    textDecoration: 'none',
                                    cursor: 'pointer',
                                    transition: 'color 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#8b5cf6'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = '#171717'}
                                >
                                  ₹{product.zepto.currentPrice}
                                </a>
                              ) : (
                                <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#171717' }}>₹{product.zepto.currentPrice}</div>
                              )}
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#737373',
                                background: '#f5f5f5',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontWeight: 500
                              }}>
                                Rank: #{product.zepto.ranking}
                              </div>
                              {renderChangeIndicator(product.zepto.priceChange, 'price')}
                              {renderChangeIndicator(product.zepto.rankingChange, 'ranking')}
                            </div>
                          ) : (
                            <span style={{ color: '#a3a3a3', fontSize: '0.875rem', fontWeight: 500 }}>—</span>
                          )}
                        </td>
                      )}

                      {/* Blinkit */}
                      {(platformFilter === 'all' || platformFilter === 'blinkit' || showMissing) && (
                        <td style={{ textAlign: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
                          {product.blinkit ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                              {product.blinkit.url ? (
                                <a
                                  href={product.blinkit.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontWeight: 700,
                                    fontSize: '1.25rem',
                                    color: '#171717',
                                    textDecoration: 'none',
                                    cursor: 'pointer',
                                    transition: 'color 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#eab308'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = '#171717'}
                                >
                                  ₹{product.blinkit.currentPrice}
                                </a>
                              ) : (
                                <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#171717' }}>₹{product.blinkit.currentPrice}</div>
                              )}
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#737373',
                                background: '#f5f5f5',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontWeight: 500
                              }}>
                                Rank: #{product.blinkit.ranking}
                              </div>
                              {renderChangeIndicator(product.blinkit.priceChange, 'price')}
                              {renderChangeIndicator(product.blinkit.rankingChange, 'ranking')}
                            </div>
                          ) : (
                            <span style={{ color: '#a3a3a3', fontSize: '0.875rem', fontWeight: 500 }}>—</span>
                          )}
                        </td>
                      )}

                      {/* JioMart */}
                      {(platformFilter === 'all' || platformFilter === 'jiomart' || showMissing) && (
                        <td style={{ textAlign: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
                          {product.jiomart ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                              {product.jiomart.url ? (
                                <a
                                  href={product.jiomart.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontWeight: 700,
                                    fontSize: '1.25rem',
                                    color: '#171717',
                                    textDecoration: 'none',
                                    cursor: 'pointer',
                                    transition: 'color 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = '#171717'}
                                >
                                  ₹{product.jiomart.currentPrice}
                                </a>
                              ) : (
                                <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#171717' }}>₹{product.jiomart.currentPrice}</div>
                              )}
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#737373',
                                background: '#f5f5f5',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontWeight: 500
                              }}>
                                Rank: #{product.jiomart.ranking}
                              </div>
                              {renderChangeIndicator(product.jiomart.priceChange, 'price')}
                              {renderChangeIndicator(product.jiomart.rankingChange, 'ranking')}
                            </div>
                          ) : (
                            <span style={{ color: '#a3a3a3', fontSize: '0.875rem', fontWeight: 500 }}>—</span>
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
                      <XAxis dataKey="date" angle={-45} textAnchor="end" interval={0} height={100} tick={{ fontSize: 12 }} />
                      <YAxis label={{ value: 'Price (₹)', angle: -90, position: 'insideLeft' }} domain={['auto', 'auto']} />
                      <Tooltip />
                      <Legend verticalAlign="top" height={36} />
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
                      <XAxis dataKey="date" angle={-45} textAnchor="end" interval={0} height={100} tick={{ fontSize: 12 }} />
                      <YAxis label={{ value: 'Rank', angle: -90, position: 'insideLeft' }} reversed domain={['auto', 'auto']} />
                      <Tooltip />
                      <Legend verticalAlign="top" height={36} />
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

          {activeTab === 'stock' && (
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e5e5e5' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>Stock Availability History</h2>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Track product availability over time across platforms</p>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Select Product</label>
                <select
                  className="select"
                  style={{
                    width: '100%',
                    maxWidth: '500px',
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
                  onChange={(e) => {
                    setSelectedProduct(filteredProducts[e.target.value]);
                    setActiveTab('stock'); // Keep on stock tab to trigger data fetch
                  }}
                >
                  <option value="">Choose a product...</option>
                  {filteredProducts.map((p, i) => (
                    <option key={i} value={i}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ width: '100%', height: 400 }}>
                {stockLoading ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading stock history...</div>
                ) : stockData && stockData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stockData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis
                        domain={[0, 1]}
                        ticks={[0, 1]}
                        tickFormatter={(value) => value === 1 ? 'In Stock' : 'Out of Stock'}
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
                          border: 'none',
                          borderRadius: '0.5rem',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                          padding: '0.75rem 1rem'
                        }}
                        labelStyle={{ color: 'white', fontWeight: 600, marginBottom: '0.5rem' }}
                        formatter={(value, name) => {
                          const status = value === 1 ? 'In Stock' : 'Out of Stock';
                          const color = value === 1 ? '#10b981' : '#ef4444';
                          return [<span style={{ color }}>{status}</span>, name];
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: '0.875rem', paddingTop: '1rem' }}
                        iconType="circle"
                      />
                      {(platformFilter === 'all' || platformFilter === 'zepto') && (
                        <Line
                          type="stepAfter"
                          dataKey="Zepto"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          connectNulls
                        />
                      )}
                      {(platformFilter === 'all' || platformFilter === 'blinkit') && (
                        <Line
                          type="stepAfter"
                          dataKey="Blinkit"
                          stroke="#eab308"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          connectNulls
                        />
                      )}
                      {(platformFilter === 'all' || platformFilter === 'jiomart') && (
                        <Line
                          type="stepAfter"
                          dataKey="JioMart"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          connectNulls
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                ) : selectedProduct ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#737373' }}>No stock history available for this product</div>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#737373' }}>Please select a product to view stock history</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab category={category} pincode={pincode} platform={platformFilter} />
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
