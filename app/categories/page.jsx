"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Clock, Filter, Package, Download } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, ComposedChart, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, Cell, ReferenceLine } from 'recharts';
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
  const [dateRange, setDateRange] = useState('all');
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
    { label: 'JioMart', value: 'jiomart' },
    { label: 'DMart', value: 'dmart' }
  ];

  const PLATFORM_COLORS = {
    zepto: {
      primary: '#8b5cf6',
      light: '#f3e8ff',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)'
    },
    blinkit: {
      primary: '#f59e0b',
      light: '#fef3c7',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'
    },
    jiomart: {
      primary: '#3b82f6',
      light: '#dbeafe',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)'
    }
  };

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
              timestamp: date.getTime(),
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
        const presentInOthers = ['zepto', 'blinkit', 'jiomart', 'dmart']
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

  const getPriceStats = (historyData, platform) => {
    if (!historyData || historyData.length === 0) return null;
    
    const prices = historyData
      .map(d => d[platform])
      .filter(p => p !== null && p !== undefined);
    
    if (prices.length === 0) return null;
    
    return {
      current: prices[prices.length - 1],
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((a, b) => a + b, 0) / prices.length
    };
  };

  const getLowestPricePlatform = (historyData) => {
    if (!historyData || historyData.length === 0) return null;
    
    const lastData = historyData[historyData.length - 1];
    const prices = {
      Zepto: lastData.Zepto,
      Blinkit: lastData.Blinkit,
      JioMart: lastData.JioMart
    };
    
    let lowest = null;
    let lowestPrice = Infinity;
    
    Object.entries(prices).forEach(([platform, price]) => {
      if (price !== null && price !== undefined && price < lowestPrice) {
        lowestPrice = price;
        lowest = platform;
      }
    });
    
    return lowest;
  };

  // Calculate platform statistics
  const platformStats = useMemo(() => {
    const stats = {
      zepto: { count: 0, avgPrice: 0, totalPrice: 0 },
      blinkit: { count: 0, avgPrice: 0, totalPrice: 0 },
      jiomart: { count: 0, avgPrice: 0, totalPrice: 0 },
      dmart: { count: 0, avgPrice: 0, totalPrice: 0 }
    };

    products.forEach(product => {
      ['zepto', 'blinkit', 'jiomart', 'dmart'].forEach(platform => {
        if (product[platform]) {
          stats[platform].count++;
          stats[platform].totalPrice += product[platform].currentPrice;
        }
      });
    });

    // Calculate averages
    ['zepto', 'blinkit', 'jiomart', 'dmart'].forEach(platform => {
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

  const calculateTicks = (data) => {
    if (!data || data.length === 0) return [];

    // Ensure we have timestamps
    if (!data[0].timestamp) return data.map(d => d.date);

    const firstTimestamp = data[0].timestamp;
    const lastTimestamp = data[data.length - 1].timestamp;
    const durationDays = (lastTimestamp - firstTimestamp) / (1000 * 60 * 60 * 24);

    let tickGapDays = 0;
    if (durationDays > 60) tickGapDays = 7; // > 2 months -> 7 day gap
    else if (durationDays > 14) tickGapDays = 2; // > 2 weeks -> 2 day gap
    else return data.map(d => d.date); // Short duration -> show all (or rely on Recharts default interval if needed, but returning all allows Recharts to skip if 'interval="preserveStartEnd"' isn't strict, but explicit ticks are better)
    // Actually, returning specific ticks forces Recharts to show ONLY those.

    const ticks = [];
    let currentTarget = firstTimestamp;

    // Find the closest data point for each target time
    // We iterate through data and pick the first one that passes the target

    let lastAddedDate = null;

    data.forEach(item => {
      if (item.timestamp >= currentTarget) {
        // Avoid duplicate dates if multiple data points fall on same day display (though timestamp check handles spacing)
        if (item.date !== lastAddedDate) {
          ticks.push(item.date);
          lastAddedDate = item.date;
          currentTarget += (tickGapDays * 24 * 60 * 60 * 1000);
        }
      }
    });

    return ticks;
  };

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
                    {(platformFilter === 'all' || platformFilter === 'dmart' || showMissing) && <th style={{ padding: '1rem 1.5rem', fontSize: '0.8125rem', fontWeight: 700, color: '#171717', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', borderBottom: '2px solid #e5e5e5' }}>DMart</th>}
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

                      {/* DMart */}
                      {(platformFilter === 'all' || platformFilter === 'dmart' || showMissing) && (
                        <td style={{ textAlign: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
                          {product.dmart ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                              {product.dmart.url ? (
                                <a
                                  href={product.dmart.url}
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
                                  onMouseEnter={(e) => e.currentTarget.style.color = '#f97316'}
                                  onMouseLeave={(e) => e.currentTarget.style.color = '#171717'}
                                >
                                  ₹{product.dmart.currentPrice}
                                </a>
                              ) : (
                                <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#171717' }}>₹{product.dmart.currentPrice}</div>
                              )}
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#737373',
                                background: '#f5f5f5',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontWeight: 500
                              }}>
                                Rank: #{product.dmart.ranking}
                              </div>
                              {renderChangeIndicator(product.dmart.priceChange, 'price')}
                              {renderChangeIndicator(product.dmart.rankingChange, 'ranking')}
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
            <div style={{
              background: 'white',
              borderRadius: '1rem',
              border: '1px solid #e5e5e5',
              overflow: 'hidden'
            }}>
              {/* Header Section */}
              <div style={{
                background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                padding: '1.5rem',
                borderBottom: '1px solid #e5e5e5'
              }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>
                    Price History
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    Track price trends across platforms over time
                  </p>
                </div>

                {/* Product Selector */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#171717'
                  }}>
                    Select Product
                  </label>
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
                    onChange={(e) => setSelectedProduct(filteredProducts[e.target.value])}
                  >
                    {filteredProducts.map((p, i) => (
                      <option key={i} value={i}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ padding: '1.5rem' }}>
                {historyLoading ? (
                  <div style={{
                    height: '400px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280'
                  }}>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                  </div>
                ) : historyData.length > 0 ? (
                  <>
                    {/* Date Range Filter */}
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      marginBottom: '1.5rem',
                      padding: '0.5rem',
                      background: '#f9fafb',
                      borderRadius: '0.5rem',
                      width: 'fit-content'
                    }}>
                      {[
                        { label: '7 Days', value: '7d' },
                        { label: '30 Days', value: '30d' },
                        { label: 'All Time', value: 'all' }
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => setDateRange(option.value)}
                          style={{
                            padding: '0.5rem 1rem',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: dateRange === option.value ? '#171717' : 'transparent',
                            color: dateRange === option.value ? 'white' : '#6b7280'
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {/* DYNAMIC "BEST DEAL" BANNER (Black Background) */}
                    {(() => {
                      let cheapestPlatform = null;
                      let lowestPrice = Infinity;

                      ['Zepto', 'Blinkit', 'JioMart'].forEach(platform => {
                        const stats = getPriceStats(historyData, platform);
                        if (stats && stats.current > 0 && stats.current < lowestPrice) {
                          lowestPrice = stats.current;
                          cheapestPlatform = platform;
                        }
                      });

                      if (!cheapestPlatform) return null;

                      const platformColor = PLATFORM_COLORS[cheapestPlatform.toLowerCase()].primary;

                      return (
                        <div style={{
                          background: '#222222ff',
                          padding: '1.5rem 2rem',
                          borderRadius: '1rem',
                          marginBottom: '1.5rem',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            position: 'absolute',
                            right: '-2rem',
                            top: '-2rem',
                            width: '10rem',
                            height: '10rem',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.08)',
                            pointerEvents: 'none'
                          }} />

                          <div style={{ zIndex: 1 }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.5rem', 
                              marginBottom: '0.5rem' 
                            }}>
                              <span style={{ 
                                background: 'rgba(255,255,255,0.2)', 
                                padding: '0.25rem 0.75rem', 
                                borderRadius: '9999px', 
                                fontSize: '0.75rem', 
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>
                                Best Deal on <span style={{ color: platformColor, fontWeight: 600 }}>{cheapestPlatform}</span>
                              </span>
                            </div>
                            <div style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1 }}>
                              ₹{lowestPrice.toFixed(2)}
                            </div>
                          </div>

                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'flex-end',
                            zIndex: 1
                          }}>
                            <div style={{ fontSize: '0.875rem', opacity: 0.7, textAlign: 'right' }}>
                              Lowest price currently on
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: platformColor }}>
                              {cheapestPlatform}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Chart - Switched to AreaChart for the "Rank Pattern" look */}
                    <div style={{
                      background: '#fafafa',
                      borderRadius: '0.75rem',
                      padding: '1.5rem',
                      border: '1px solid #e5e5e5'
                    }}>
                      <ResponsiveContainer width="100%" height={450}>
                        <AreaChart
                          data={(() => {
                            if (dateRange === 'all') return historyData;
                            
                            const now = Date.now();
                            const cutoff = dateRange === '7d' 
                              ? now - (7 * 24 * 60 * 60 * 1000)
                              : now - (30 * 24 * 60 * 60 * 1000);
                            
                            return historyData.filter(d => d.timestamp >= cutoff);
                          })()}
                          margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                        >
                          <defs>
                            <linearGradient id="colorZepto" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={PLATFORM_COLORS.zepto.primary} stopOpacity={0.2}/>
                              <stop offset="95%" stopColor={PLATFORM_COLORS.zepto.primary} stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorBlinkit" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={PLATFORM_COLORS.blinkit.primary} stopOpacity={0.2}/>
                              <stop offset="95%" stopColor={PLATFORM_COLORS.blinkit.primary} stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorJioMart" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={PLATFORM_COLORS.jiomart.primary} stopOpacity={0.2}/>
                              <stop offset="95%" stopColor={PLATFORM_COLORS.jiomart.primary} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          
                          <XAxis
                            dataKey="date"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval="preserveStartEnd"
                            minTickGap={20}
                            tick={{ fontSize: 11, fill: '#6b7280' }}
                            axisLine={{ stroke: '#d1d5db' }}
                          />
                          
                          <YAxis
                            label={{
                              value: 'Price (₹)',
                              angle: -90,
                              position: 'insideLeft',
                              style: { fontSize: '0.875rem', fill: '#6b7280', fontWeight: 600 }
                            }}
                            domain={['auto', 'auto']}
                            tick={{ fontSize: 11, fill: '#6b7280' }}
                            axisLine={{ stroke: '#d1d5db' }}
                          />
                          
                          {/* --- FIXED TOOLTIP --- */}
                          <Tooltip
                            contentStyle={{
                              background: '#222222ff',
                              border: 'none',
                              borderRadius: '0.75rem',
                              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                              padding: '1rem'
                            }}
                            labelStyle={{
                              color: 'white',
                              fontWeight: 700,
                              marginBottom: '0.75rem',
                              fontSize: '0.875rem',
                              borderBottom: '1px solid rgba(255,255,255,0.1)',
                              paddingBottom: '0.5rem'
                            }}
                            itemStyle={{
                              fontSize: '0.875rem',
                              padding: '0.25rem 0',
                              fontWeight: 600
                            }}
                            // UPDATED FORMATTER: Now correctly uses the 'name' parameter
                            formatter={(value, name) => {
                              if (value === null || value === undefined) return ['N/A', name];
                              return [`₹${value.toFixed(2)}`, name];
                            }}
                          />
                          
                          <Legend
                            wrapperStyle={{
                              paddingTop: '1.5rem',
                              fontSize: '0.875rem',
                              fontWeight: 600
                            }}
                            iconType="circle"
                            iconSize={10}
                          />
                          
                          {(platformFilter === 'all' || platformFilter === 'zepto') && (
                            <Area
                              type="monotone"
                              dataKey="Zepto"
                              stroke={PLATFORM_COLORS.zepto.primary}
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#colorZepto)"
                              dot={{
                                r: 4,
                                fill: PLATFORM_COLORS.zepto.primary,
                                strokeWidth: 2,
                                stroke: 'white'
                              }}
                              activeDot={{
                                r: 6,
                                fill: PLATFORM_COLORS.zepto.primary,
                                strokeWidth: 3,
                                stroke: 'white'
                              }}
                              connectNulls
                            />
                          )}
                          
                          {(platformFilter === 'all' || platformFilter === 'blinkit') && (
                            <Area
                              type="monotone"
                              dataKey="Blinkit"
                              stroke={PLATFORM_COLORS.blinkit.primary}
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#colorBlinkit)"
                              dot={{
                                r: 4,
                                fill: PLATFORM_COLORS.blinkit.primary,
                                strokeWidth: 2,
                                stroke: 'white'
                              }}
                              activeDot={{
                                r: 6,
                                fill: PLATFORM_COLORS.blinkit.primary,
                                strokeWidth: 3,
                                stroke: 'white'
                              }}
                              connectNulls
                            />
                          )}
                          
                          {(platformFilter === 'all' || platformFilter === 'jiomart') && (
                            <Area
                              type="monotone"
                              dataKey="JioMart"
                              stroke={PLATFORM_COLORS.jiomart.primary}
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#colorJioMart)"
                              dot={{
                                r: 4,
                                fill: PLATFORM_COLORS.jiomart.primary,
                                strokeWidth: 2,
                                stroke: 'white'
                              }}
                              activeDot={{
                                r: 6,
                                fill: PLATFORM_COLORS.jiomart.primary,
                                strokeWidth: 3,
                                stroke: 'white'
                              }}
                              connectNulls
                            />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <div style={{
                    height: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280'
                  }}>
                    <div style={{
                      width: '4rem',
                      height: '4rem',
                      background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1rem'
                    }}>
                      <svg style={{ width: '2rem', height: '2rem', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                    </div>
                    <p style={{ fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>No history data available</p>
                    <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Price tracking will appear here once data is collected</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ranking' && (
            <div style={{ padding: '1.5rem' }}>
              {/* Product Selector */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Select Product for History
                </label>
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

              {historyLoading ? (
                <div style={{
                  height: '400px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280'
                }}>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                </div>
              ) : historyData.length > 0 ? (
                <>
                  {/* Date Range Filter */}
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginBottom: '1.5rem',
                    padding: '0.5rem',
                    background: '#f9fafb',
                    borderRadius: '0.5rem',
                    width: 'fit-content'
                  }}>
                    {[
                      { label: '7 Days', value: '7d' },
                      { label: '30 Days', value: '30d' },
                      { label: 'All Time', value: 'all' }
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setDateRange(option.value)}
                        style={{
                          padding: '0.5rem 1rem',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: dateRange === option.value ? '#171717' : 'transparent',
                          color: dateRange === option.value ? 'white' : '#6b7280'
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {/* DYNAMIC "TOP RANK" BANNER */}
                  {(() => {
                    let topRankPlatform = null;
                    let bestRank = Infinity;
                    const latestData = historyData[historyData.length - 1];

                    if (latestData) {
                      ['Zepto', 'Blinkit', 'JioMart'].forEach(platform => {
                        const rankKey = `${platform} Rank`;
                        const rank = latestData[rankKey];
                        if (rank && rank > 0 && rank < bestRank) {
                          bestRank = rank;
                          topRankPlatform = platform;
                        }
                      });
                    }

                    if (!topRankPlatform) return null;
                    const platformColor = PLATFORM_COLORS[topRankPlatform.toLowerCase()].primary;

                    return (
                      <div style={{
                        background: '#222222ff',
                        padding: '1.5rem 2rem',
                        borderRadius: '1rem',
                        marginBottom: '1.5rem',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          position: 'absolute',
                          right: '-2rem',
                          top: '-2rem',
                          width: '10rem',
                          height: '10rem',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.08)',
                          pointerEvents: 'none'
                        }} />

                        <div style={{ zIndex: 1 }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem', 
                            marginBottom: '0.5rem' 
                          }}>
                            <span style={{ 
                              padding: '0.25rem 0.25rem', 
                              fontSize: '0.75rem', 
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}>
                              Currently leading on <span style={{ color: platformColor, fontWeight: 600 }}>{topRankPlatform}</span>
                            </span>
                          </div>
                          <div style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1 }}>
                            Rank #{bestRank}
                          </div>
                        </div>

                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'flex-end',
                          zIndex: 1
                        }}>
                          <div style={{ fontSize: '0.875rem', opacity: 0.7, textAlign: 'right' }}>
                            Highest visibility on
                          </div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: platformColor }}>
                            {topRankPlatform}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Chart Area */}
                  <div style={{
                    background: '#fafafa',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    border: '1px solid #e5e5e5'
                  }}>
                    <ResponsiveContainer width="100%" height={450}>
                      <AreaChart
                        data={(() => {
                          if (dateRange === 'all') return historyData;
                          const now = Date.now();
                          const cutoff = dateRange === '7d' 
                            ? now - (7 * 24 * 60 * 60 * 1000)
                            : now - (30 * 24 * 60 * 60 * 1000);
                          return historyData.filter(d => d.timestamp >= cutoff);
                        })()}
                        margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                      >
                        <defs>
                          <linearGradient id="rankColorZepto" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={PLATFORM_COLORS.zepto.primary} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={PLATFORM_COLORS.zepto.primary} stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="rankColorBlinkit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={PLATFORM_COLORS.blinkit.primary} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={PLATFORM_COLORS.blinkit.primary} stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="rankColorJioMart" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={PLATFORM_COLORS.jiomart.primary} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={PLATFORM_COLORS.jiomart.primary} stopOpacity={0}/>
                          </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        
                        <XAxis
                          dataKey="date"
                          angle={-45}
                          textAnchor="end"
                          height={80} 
                          interval="preserveStartEnd" 
                          minTickGap={20} 
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          axisLine={{ stroke: '#d1d5db' }}
                        />
                        
                        <YAxis 
                          label={{ 
                            value: 'Rank Position', 
                            angle: -90, 
                            position: 'insideLeft',
                            style: { fontSize: '0.875rem', fill: '#6b7280', fontWeight: 600 } 
                          }} 
                          reversed={true}
                          domain={['dataMin - 1', 'dataMax + 1']}
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          axisLine={{ stroke: '#d1d5db' }}
                        />
                        
                        {/* --- FIXED TOOLTIP --- */}
                        <Tooltip
                          contentStyle={{
                            background: '#222222ff',
                            border: 'none',
                            borderRadius: '0.75rem',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                            padding: '1rem'
                          }}
                          labelStyle={{
                            color: 'white',
                            fontWeight: 700,
                            marginBottom: '0.75rem',
                            fontSize: '0.875rem',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                            paddingBottom: '0.5rem'
                          }}
                          itemStyle={{
                            fontSize: '0.875rem',
                            padding: '0.25rem 0',
                            fontWeight: 600
                          }}
                          // UPDATED FORMATTER: Now uses 'name' parameter
                          formatter={(value, name) => {
                            if (value === null || value === undefined) return ['N/A', name];
                            return [`#${value}`, name];
                          }}
                        />
                        
                        <Legend 
                          wrapperStyle={{
                            paddingTop: '1.5rem',
                            fontSize: '0.875rem',
                            fontWeight: 600
                          }}
                          iconType="circle"
                          iconSize={10}
                        />
                        
                        {(platformFilter === 'all' || platformFilter === 'zepto') && (
                          <Area 
                            type="monotone" 
                            dataKey="Zepto Rank" 
                            name="Zepto" 
                            stroke={PLATFORM_COLORS.zepto.primary} 
                            strokeWidth={3} 
                            fillOpacity={1}
                            fill="url(#rankColorZepto)"
                            connectNulls 
                            dot={{
                              r: 4,
                              fill: PLATFORM_COLORS.zepto.primary,
                              strokeWidth: 2,
                              stroke: 'white'
                            }}
                            activeDot={{
                              r: 6,
                              fill: PLATFORM_COLORS.zepto.primary,
                              strokeWidth: 3,
                              stroke: 'white'
                            }}
                          />
                        )}
                        
                        {(platformFilter === 'all' || platformFilter === 'blinkit') && (
                          <Area 
                            type="monotone" 
                            dataKey="Blinkit Rank" 
                            name="Blinkit" 
                            stroke={PLATFORM_COLORS.blinkit.primary} 
                            strokeWidth={3} 
                            fillOpacity={1}
                            fill="url(#rankColorBlinkit)"
                            connectNulls 
                            dot={{
                              r: 4,
                              fill: PLATFORM_COLORS.blinkit.primary,
                              strokeWidth: 2,
                              stroke: 'white'
                            }}
                            activeDot={{
                              r: 6,
                              fill: PLATFORM_COLORS.blinkit.primary,
                              strokeWidth: 3,
                              stroke: 'white'
                            }}
                          />
                        )}
                        
                        {(platformFilter === 'all' || platformFilter === 'jiomart') && (
                          <Area 
                            type="monotone" 
                            dataKey="JioMart Rank" 
                            name="JioMart" 
                            stroke={PLATFORM_COLORS.jiomart.primary} 
                            strokeWidth={3} 
                            fillOpacity={1}
                            fill="url(#rankColorJioMart)"
                            connectNulls 
                            dot={{
                              r: 4,
                              fill: PLATFORM_COLORS.jiomart.primary,
                              strokeWidth: 2,
                              stroke: 'white'
                            }}
                            activeDot={{
                              r: 6,
                              fill: PLATFORM_COLORS.jiomart.primary,
                              strokeWidth: 3,
                              stroke: 'white'
                            }}
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div style={{
                  height: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280'
                }}>
                  <div style={{
                    width: '4rem',
                    height: '4rem',
                    background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem'
                  }}>
                    <svg style={{ width: '2rem', height: '2rem', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <p style={{ fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>No ranking data available</p>
                  <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Rank history will appear here once data is collected</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stock' && (
            <div style={{ padding: '1.5rem' }}>
              {/* Product Selector */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  Select Product
                </label>
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
                    setActiveTab('stock');
                  }}
                >
                  <option value="">Choose a product...</option>
                  {filteredProducts.map((p, i) => (
                    <option key={i} value={i}>{p.name}</option>
                  ))}
                </select>
              </div>

              {stockLoading ? (
                <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                </div>
              ) : stockData && stockData.length > 0 ? (
                <>
                  {/* Date Range Filter */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', padding: '0.5rem', background: '#f9fafb', borderRadius: '0.5rem', width: 'fit-content' }}>
                    {[
                      { label: '7 Days', value: '7d' },
                      { label: '30 Days', value: '30d' },
                      { label: 'All Time', value: 'all' }
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setDateRange(option.value)}
                        style={{
                          padding: '0.5rem 1rem',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: dateRange === option.value ? '#171717' : 'transparent',
                          color: dateRange === option.value ? 'white' : '#6b7280'
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {/* DYNAMIC "RELIABILITY" BANNER */}
                  {(() => {
                    let mostReliable = null;
                    let highestScore = -1;

                    ['Zepto', 'Blinkit', 'JioMart'].forEach(platform => {
                      const inStockDays = stockData.filter(d => d[platform] === 1).length;
                      const totalDays = stockData.filter(d => d[platform] !== null).length;
                      if (totalDays > 0) {
                        const score = (inStockDays / totalDays) * 100;
                        if (score > highestScore) {
                          highestScore = score;
                          mostReliable = platform;
                        }
                      }
                    });

                    if (!mostReliable) return null;
                    const platformColor = PLATFORM_COLORS[mostReliable.toLowerCase()].primary;

                    return (
                      <div style={{
                        background: '#222222ff',
                        padding: '1.5rem 2rem',
                        borderRadius: '1rem',
                        marginBottom: '1.5rem',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{ position: 'absolute', right: '-2rem', top: '-2rem', width: '10rem', height: '10rem', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                        <div style={{ zIndex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ padding: '0.25rem 0.25rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Most Reliable
                            </span>
                          </div>
                          <div style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1 }}>
                            {highestScore.toFixed(0)}% <span style={{fontSize: '1rem', fontWeight: 500, opacity: 0.8}}>Availability</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', zIndex: 1 }}>
                          <div style={{ fontSize: '0.875rem', opacity: 0.7, textAlign: 'right' }}>Best stock consistency on</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: platformColor }}>{mostReliable}</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* STATUS LANES CHART (Aggregated by Day) */}
                  <div style={{
                    background: '#fafafa',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    border: '1px solid #e5e5e5'
                  }}>
                    {/* Legend */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1.5rem', marginBottom: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e', border: '2px solid white', boxShadow: '0 0 0 1px #e5e5e5' }}></div>
                        <span style={{color: '#374151'}}>In Stock</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', border: '2px solid white', boxShadow: '0 0 0 1px #e5e5e5' }}></div>
                        <span style={{color: '#374151'}}>Out of Stock</span>
                      </div>
                    </div>

                    <ResponsiveContainer width="100%" height={350}>
                      <ComposedChart 
                        data={(() => {
                          if (!stockData) return [];
                          
                          // 1. Filter raw data based on selected range
                          const now = Date.now();
                          const cutoff = dateRange === 'all' ? 0 : 
                            (dateRange === '7d' ? now - (7 * 24 * 60 * 60 * 1000) : now - (30 * 24 * 60 * 60 * 1000));
                          
                          const filteredRaw = stockData.filter(d => d.timestamp >= cutoff);

                          // 2. AGGREGATE BY DAY
                          // We create a map where the key is the date string (e.g. "Dec 6")
                          const dailyMap = new Map();

                          filteredRaw.forEach(entry => {
                            // entry.date is usually "Dec 6, 10:30 PM"
                            // We split by comma to just get "Dec 6"
                            const day = entry.date.split(',')[0];

                            if (!dailyMap.has(day)) {
                              // Initialize the day with the first entry found
                              dailyMap.set(day, {
                                date: day,
                                timestamp: entry.timestamp, // Keep one timestamp for sorting/axis
                                Zepto: entry.Zepto,
                                Blinkit: entry.Blinkit,
                                JioMart: entry.JioMart,
                              });
                            } else {
                              const currentDay = dailyMap.get(day);
                              
                              // Logic: If ANY entry for the day is 1 (In Stock), the day is 1.
                              // Otherwise, preserve 0 or null.
                              
                              // Zepto Update
                              if (entry.Zepto === 1) currentDay.Zepto = 1;
                              else if (currentDay.Zepto === null && entry.Zepto !== null) currentDay.Zepto = entry.Zepto;

                              // Blinkit Update
                              if (entry.Blinkit === 1) currentDay.Blinkit = 1;
                              else if (currentDay.Blinkit === null && entry.Blinkit !== null) currentDay.Blinkit = entry.Blinkit;

                              // JioMart Update
                              if (entry.JioMart === 1) currentDay.JioMart = 1;
                              else if (currentDay.JioMart === null && entry.JioMart !== null) currentDay.JioMart = entry.JioMart;
                            }
                          });

                          // Convert map back to array and add Y-coordinates for lanes
                          return Array.from(dailyMap.values()).map(d => ({
                            ...d,
                            zeptoY: d.Zepto !== null ? 3 : null,
                            blinkitY: d.Blinkit !== null ? 2 : null,
                            jiomartY: d.JioMart !== null ? 1 : null,
                          }));
                        })()}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                        
                        {/* Lane Guides */}
                        <ReferenceLine y={1} stroke="#e5e5e5" strokeWidth={1} />
                        <ReferenceLine y={2} stroke="#e5e5e5" strokeWidth={1} />
                        <ReferenceLine y={3} stroke="#e5e5e5" strokeWidth={1} />

                        <XAxis
                          dataKey="date"
                          angle={-45}
                          textAnchor="end"
                          height={60}
                          // Because we now have exactly 1 point per day, we can be strict about showing them all
                          // unless it gets too crowded (minTickGap handles that)
                          interval="preserveStartEnd" 
                          minTickGap={10} 
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          axisLine={{ stroke: '#d1d5db' }}
                        />
                        
                        <YAxis 
                          type="number" 
                          domain={[0, 4]} 
                          ticks={[1, 2, 3]}
                          tickFormatter={(value) => {
                            if (value === 3) return 'Zepto';
                            if (value === 2) return 'Blinkit';
                            if (value === 1) return 'JioMart';
                            return '';
                          }}
                          tick={{ fontSize: 13, fill: '#171717', fontWeight: 700 }}
                          axisLine={false}
                          tickLine={false}
                          width={70}
                        />
                        
                        <Tooltip
                          cursor={{ stroke: '#d1d5db', strokeWidth: 1, strokeDasharray: '4 4' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div style={{
                                  background: '#222222ff',
                                  border: 'none',
                                  borderRadius: '0.75rem',
                                  padding: '1rem',
                                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                                  color: 'white',
                                  minWidth: '180px',
                                  zIndex: 100
                                }}>
                                  <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    {data.date}
                                  </div>
                                  
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {['Zepto', 'Blinkit', 'JioMart'].map(platform => {
                                      const status = data[platform];
                                      let statusText = 'No Data';
                                      let statusColor = '#9ca3af'; 
                                      let dotColor = '#9ca3af';

                                      if (status === 1) {
                                        statusText = 'In Stock';
                                        statusColor = '#4ade80';
                                        dotColor = '#4ade80';
                                      } else if (status === 0) {
                                        statusText = 'Out of Stock';
                                        statusColor = '#f87171';
                                        dotColor = '#f87171';
                                      }

                                      return (
                                        <div key={platform} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{platform}</span>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor }}></div>
                                            <span style={{ fontSize: '0.75rem', color: statusColor, fontWeight: 500 }}>{statusText}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />

                        {/* Zepto Lane (Y=3) */}
                        <Line
                          dataKey="zeptoY"
                          stroke="none"
                          isAnimationActive={false}
                          dot={(props) => {
                            const { cx, cy, payload } = props;
                            if (payload.Zepto === null) return null;
                            const color = payload.Zepto === 1 ? '#22c55e' : '#ef4444';
                            return <circle cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={1} />;
                          }}
                        />

                        {/* Blinkit Lane (Y=2) */}
                        <Line
                          dataKey="blinkitY"
                          stroke="none"
                          isAnimationActive={false}
                          dot={(props) => {
                            const { cx, cy, payload } = props;
                            if (payload.Blinkit === null) return null;
                            const color = payload.Blinkit === 1 ? '#22c55e' : '#ef4444';
                            return <circle cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={1} />;
                          }}
                        />

                        {/* JioMart Lane (Y=1) */}
                        <Line
                          dataKey="jiomartY"
                          stroke="none"
                          isAnimationActive={false}
                          dot={(props) => {
                            const { cx, cy, payload } = props;
                            if (payload.JioMart === null) return null;
                            const color = payload.JioMart === 1 ? '#22c55e' : '#ef4444';
                            return <circle cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={1} />;
                          }}
                        />

                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : selectedProduct ? (
                <div style={{ height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                  <div style={{ width: '4rem', height: '4rem', background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <svg style={{ width: '2rem', height: '2rem', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <p style={{ fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>No stock history available</p>
                  <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Try selecting a different product or platform</p>
                </div>
              ) : (
                <div style={{ height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                  <div style={{ width: '4rem', height: '4rem', background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <svg style={{ width: '2rem', height: '2rem', color: '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                  </div>
                  <p style={{ fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>Select a product</p>
                  <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Choose a product above to view its stock history</p>
                </div>
              )}
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
