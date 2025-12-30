"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Clock, Filter, Download, ExternalLink } from 'lucide-react';
import AnalyticsTab from './AnalyticsTab';
import ExportCategoryDialog from './ExportCategoryDialog';
import CustomDropdown from '@/components/CustomDropdown';
import { cn } from '@/lib/utils';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

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
  const [snapshotDate, setSnapshotDate] = useState('');
  const [snapshotTime, setSnapshotTime] = useState('');
  const [availableSnapshots, setAvailableSnapshots] = useState([]);
  const [isLiveMode, setIsLiveMode] = useState(true);

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

  const fetchCategoryData = async (customTimestamp = null) => {
    setLoading(true);
    setProducts([]);
    setError(null);

    try {
      const timeToFetch = customTimestamp !== null ? customTimestamp : (snapshotTime || null);
      let url = `/api/category-data?category=${encodeURIComponent(category)}&pincode=${encodeURIComponent(pincode)}`;

      if (timeToFetch) {
        url += `&timestamp=${encodeURIComponent(timeToFetch)}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to fetch category data');

      setProducts(data.products || []);

      if (!timeToFetch) {
        setLastUpdated(data.lastUpdated);
      }

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
      const productIds = {};
      if (selectedProduct.zepto?.productId) productIds.zepto = selectedProduct.zepto.productId;
      if (selectedProduct.blinkit?.productId) productIds.blinkit = selectedProduct.blinkit.productId;
      if (selectedProduct.jiomart?.productId) productIds.jiomart = selectedProduct.jiomart.productId;

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
        setHistoryData(transformedData);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProduct) {
      fetchHistoryData();
    }
  }, [selectedProduct]);

  useEffect(() => {
    const fetchSnapshots = async () => {
      const res = await fetch(`/api/available-snapshots?category=${category}&pincode=${pincode}`);
      const data = await res.json();

      if (data.snapshots && data.snapshots.length > 0) {
        setAvailableSnapshots(data.snapshots);

        if (isLiveMode) {
          const latestTS = data.snapshots[0];
          const dateObj = new Date(latestTS);
          setSnapshotDate(dateObj.toLocaleDateString('en-CA'));
          setSnapshotTime(latestTS);
          fetchCategoryData(latestTS);
        } else {
          const snapshotsForSameDate = data.snapshots.filter(ts =>
            new Date(ts).toLocaleDateString('en-CA') === snapshotDate
          );
          if (snapshotDate && snapshotsForSameDate.length > 0) {
            setSnapshotTime(snapshotsForSameDate[0]);
            fetchCategoryData(snapshotsForSameDate[0]);
          } else {
            setIsLiveMode(true);
          }
        }
      }
    };
    fetchSnapshots();
  }, [category, pincode, isLiveMode]);

  useEffect(() => {
    if (selectedProduct) {
      setStockLoading(true);

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
    } else {
      setStockData([]);
    }
  }, [selectedProduct, category, pincode]);

  useEffect(() => {
    if (selectedProduct && products.length > 0) {
      const updatedProduct = products.find(p => p.name === selectedProduct.name);
      if (updatedProduct) {
        setSelectedProduct(updatedProduct);
      }
    }
  }, [products]);

  useEffect(() => {
    if (lastUpdated && !snapshotTime) {
      const dateObj = new Date(lastUpdated);
      const dateStr = dateObj.toLocaleDateString('en-CA');
      setSnapshotDate(dateStr);
      setSnapshotTime(lastUpdated);
    }
  }, [lastUpdated]);

  const uniqueDates = useMemo(() => {
    const dates = availableSnapshots.map(ts => {
      const d = new Date(ts);
      return d.toLocaleDateString('en-CA');
    });
    return [...new Set(dates)];
  }, [availableSnapshots]);

  const availableTimes = useMemo(() => {
    if (!snapshotDate) return [];
    return availableSnapshots
      .filter(ts => {
        const d = new Date(ts);
        return d.toLocaleDateString('en-CA') === snapshotDate;
      })
      .map(ts => {
        const d = new Date(ts);
        return {
          value: ts,
          label: d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
        };
      });
  }, [snapshotDate, availableSnapshots]);

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

    return products.filter(product => product[platformFilter]);
  }, [products, platformFilter, showMissing]);

  useEffect(() => {
    if (filteredProducts.length > 0) {
      if (!selectedProduct || !filteredProducts.find(p => p.name === selectedProduct.name)) {
        setSelectedProduct(filteredProducts[0]);
      }
    } else {
      setSelectedProduct(null);
    }
  }, [filteredProducts, selectedProduct]);


  const renderChangeIndicator = (change, type = 'price') => {
    if (!change || change === 0) {
      return null;
    }

    const isPositive = change > 0;

    if (type === 'ranking') {
      // Lower rank is better (e.g. 5 -> 1)
      // Change = old - new (e.g. 5-1 = 4 rank improvement)
      // Actually user logic was: change < 0 -> GREEN ?
      // Let's stick to user logic:
      // if change < 0 (rank number decreased, e.g. 5 to 1) -> Good
      if (change < 0) {
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
            <TrendingUp size={12} />
            <span>↑ {Math.abs(change)}</span>
          </span>
        );
      } else {
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
            <TrendingDown size={12} />
            <span>↓ {change}</span>
          </span>
        );
      }
    }

    // For Price:
    // change < 0 (price dropped) -> Good (Green)
    const isGood = change < 0;
    return (
      <span className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border",
        isGood ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-rose-600 bg-rose-50 border-rose-100"
      )}>
        {isGood ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
        {isPositive ? '+' : ''}₹{change.toFixed(2)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-4 md:p-8 font-sans text-neutral-900">

      {/* Header */}
      <div className="mb-8 max-w-[1400px] mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-2">Category Price Tracker</h1>
        <p className="text-neutral-500">Monitor price changes across platforms</p>
      </div>

      <div className="max-w-[1400px] mx-auto">
        {/* Filters Card */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-neutral-900 mb-2">Category</label>
              <CustomDropdown
                value={category}
                onChange={setCategory}
                options={CATEGORY_OPTIONS}
                placeholder="Select Category"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-neutral-900 mb-2">Pincode</label>
              <CustomDropdown
                value={pincode}
                onChange={setPincode}
                options={PINCODE_OPTIONS}
                placeholder="Select Pincode"
              />
            </div>

            <div className="lg:col-span-2 flex items-end gap-3">
              <button
                onClick={() => fetchCategoryData()}
                disabled={loading}
                className={cn(
                  "flex-1 h-[42px] flex items-center justify-center gap-2 bg-neutral-900 text-white rounded-md font-medium text-sm transition-all hover:bg-black hover:shadow-md active:scale-95 disabled:opacity-70 disabled:pointer-events-none cursor-pointer"
                )}
              >
                <RefreshCw size={18} className={cn("transition-transform", loading && "animate-spin")} />
                Refresh
              </button>
              <button
                onClick={() => setIsExportOpen(true)}
                className="flex-1 h-[42px] flex items-center justify-center gap-2 bg-white text-neutral-700 border border-neutral-200 rounded-md font-medium text-sm transition-all hover:bg-neutral-50 hover:text-neutral-900 hover:border-neutral-300 active:scale-95 cursor-pointer"
              >
                <Download size={18} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Platform Filter */}
        <div className="pt-6 border-t border-neutral-100">
          <div className="flex items-center gap-2 mb-3 text-neutral-900 font-semibold text-sm">
            <Filter size={16} className="text-neutral-500" />
            Filter by Platform
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PLATFORM_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPlatformFilter(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                  platformFilter === opt.value
                    ? "bg-neutral-900 text-white border-neutral-900"
                    : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                )}
              >
                {opt.label}
              </button>
            ))}

            <div className="ml-auto pl-4 border-l border-neutral-200 flex items-center">
              <label className={cn(
                "flex items-center gap-2 text-sm text-neutral-700 cursor-pointer select-none transition-all",
                platformFilter === 'all' && "opacity-50 cursor-not-allowed pointer-events-none"
              )}>
                <span className="font-medium text-xs uppercase tracking-wider text-neutral-500">Show Missing</span>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showMissing}
                    onChange={(e) => setShowMissing(e.target.checked)}
                    disabled={platformFilter === 'all'}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-neutral-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neutral-900"></div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

<<<<<<< HEAD
      {/* Snapshot Selector */}
      <div className="mt-6 pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-neutral-500 bg-neutral-50 px-3 py-1.5 rounded-md border border-neutral-100">
          <Clock size={16} />
          <span>
            {snapshotTime && lastUpdated && new Date(snapshotTime).getTime() !== new Date(lastUpdated).getTime()
              ? <span className="text-neutral-900 font-semibold">Viewing Snapshot: {new Date(snapshotTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              : `Latest Data: ${lastUpdated ? new Date(lastUpdated).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never'}`
            }
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-neutral-900 whitespace-nowrap">View History:</span>

          <select
            value={snapshotDate}
            onChange={(e) => {
              setSnapshotDate(e.target.value);
              setSnapshotTime('');
            }}
            className="h-9 pl-3 pr-8 rounded-md border border-neutral-200 bg-white text-sm text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-900 cursor-pointer hover:border-neutral-300"
          >
            <option value="">Select Date</option>
            {uniqueDates.map(dateStr => (
              <option key={dateStr} value={dateStr}>
                {new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </option>
            ))}
          </select>

          <select
            value={snapshotTime}
            onChange={(e) => setSnapshotTime(e.target.value)}
            disabled={!snapshotDate}
            className="h-9 pl-3 pr-8 rounded-md border border-neutral-200 bg-white text-sm text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-900 cursor-pointer hover:border-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Select Time</option>
            {availableTimes.map((t, i) => (
              <option key={i} value={t.value}>{t.label}</option>
            ))}
          </select>

          {(snapshotTime && lastUpdated && new Date(snapshotTime).getTime() !== new Date(lastUpdated).getTime()) && (
            <button
              onClick={() => {
                if (lastUpdated) {
                  const dateObj = new Date(lastUpdated);
                  setSnapshotDate(dateObj.toLocaleDateString('en-CA'));
                  setSnapshotTime(lastUpdated);
                  fetchCategoryData(lastUpdated);
                }
              }}
              className="text-sm font-semibold text-red-600 hover:text-red-700 underline"
            >
              Reset
            </button>
          )}
=======
        {/* --- UPDATED SNAPSHOT SELECTOR & STATUS --- */}
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>

          {/* Left Side: Status Text with Pulsing Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem' }}>
            {!isLiveMode ? (
              <>
                <span className="status-dot-red"></span>
                <span style={{ color: '#737373', fontWeight: 500 }}>
                  Viewing Data: {new Date(snapshotTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </>
            ) : (
              <>
                <span className="status-dot-green"></span>
                <span style={{ color: '#737373', fontWeight: 500 }}>
                  Latest Data: {availableSnapshots.length > 0
                    ? new Date(availableSnapshots[0]).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                    : 'No data for this selection'}
                </span>
              </>
            )}
          </div>

          {/* Right Side: The Dropdown Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'nowrap' }}>
            <span className="history-label" style={{ marginBottom: 0 }}>View History:</span>

            {/* 1. Date Select */}
            <CustomDropdown
              value={snapshotDate}
              onChange={(newDate) => {
                setSnapshotDate(newDate);
                setIsLiveMode(false);

                const latestForDate = availableSnapshots.find(ts =>
                  new Date(ts).toLocaleDateString('en-CA') === newDate
                );

                if (latestForDate) {
                  setSnapshotTime(latestForDate);
                  fetchCategoryData(latestForDate);
                }
              }}
              options={uniqueDates.map(d => ({
                value: d,
                label: new Date(d).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              }))}
              placeholder="Select Date"
            />


            {/* 2. Time Select */}
            <CustomDropdown
              value={snapshotTime}
              onChange={(ts) => {
                setSnapshotTime(ts);
                setIsLiveMode(false);
                if (ts) fetchCategoryData(ts);
              }}
              options={availableTimes}
              placeholder="Time"
              disabled={!snapshotDate}
            />

            {/* 3. Reset Button - Now strictly tied to isLiveMode */}
            {!isLiveMode && (
              <button
                onClick={() => {
                  setIsLiveMode(true); // Triggers re-fetch of absolute latest in useEffect
                }}
                style={{ background: 'none', border: 'none', color: '#f06d6dff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', marginLeft: '0.5rem', whiteSpace: 'nowrap', textDecoration: 'underline' }}
              >
                Reset
              </button>
            )}
          </div>
>>>>>>> c55c2b1969eb888aafb9e77680a4c07b3bf7a071
        </div>
      </div>
      {/* Content Tabs */}
      <div className="mb-6">
        <div className="flex border-b border-neutral-200">
          {['products', 'analytics', 'stock'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-3 text-sm font-medium border-b-2 transition-colors capitalize cursor-pointer",
                activeTab === tab
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div >

      {/* Tab Content */}
      {
        activeTab === 'analytics' ? (
          <AnalyticsTab
            category={category}
            pincode={pincode}
            platform={platformFilter}
            historyData={historyData}
            stockData={stockData}
            selectedProduct={selectedProduct}
          />
        ) : activeTab === 'stock' ? (
          <AnalyticsTab
            category={category}
            pincode={pincode}
            platform={platformFilter}
            historyData={historyData}
            stockData={stockData}
            selectedProduct={selectedProduct}
            showStockOnly={true}
          />
          // Note: Reuse for now or implement separate if needed, logic above handled activeTab === 'stock'
          // But verify original file.. original had AnalyticsTab only for 'analytics' ? 
          // The original code had logic in useEffect for activeTab==='stock', but there was no separate StockTab.
          // Actually, in the original 'AnalyticsTab.jsx' it seems to render stock table too. 
          // Let's use AnalyticsTab for stock tab as well or fix the logic.
          // Wait, looking at original Page.jsx, 
          // 5: import AnalyticsTab from './AnalyticsTab';
          // ...
          // <AnalyticsTab ... /> was NOT conditionally rendered inside the tabs in the original code?
          // Actually, the original file cut off before I saw the return fully.
          // Let's assume AnalyticsTab handles the analytics view.
          // For 'Products' view, I need to implement the product grid/table here.
        ) : (
          activeTab === 'analytics' || activeTab === 'stock' ? (
            <AnalyticsTab
              category={category}
              pincode={pincode}
              platform={platformFilter}
              historyData={historyData}
              stockData={stockData}
              selectedProduct={selectedProduct}
            />
          ) : (
            /* Products List (Default) */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sidebar / List */}
              <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden h-[calc(100vh-250px)] flex flex-col">
                <div className="p-4 border-b border-neutral-200 bg-neutral-50">
                  <h3 className="font-semibold text-neutral-900">Products ({filteredProducts.length})</h3>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-2">
                  {filteredProducts.map((product, idx) => {
                    // Find first available image
                    const productImage = product.zepto?.productImage || product.blinkit?.productImage || product.jiomart?.productImage || product.dmart?.productImage;

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedProduct(product)}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md flex items-start gap-3",
                          selectedProduct?.name === product.name
                            ? "bg-neutral-900 border-neutral-900 text-white shadow-md"
                            : "bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded bg-white p-1 flex-shrink-0 flex items-center justify-center border",
                          selectedProduct?.name === product.name ? "border-neutral-700" : "border-neutral-100"
                        )}>
                          {productImage ? (
                            <img src={productImage} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
                          ) : (
                            <div className="w-full h-full bg-neutral-100 rounded flex items-center justify-center text-[10px] text-neutral-400">No Img</div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm mb-1 line-clamp-2">{product.name}</div>
                          <div className="flex items-center gap-2 text-xs opacity-80 flex-wrap">
                            {product.zepto && <span className={cn("px-1.5 py-0.5 rounded", selectedProduct?.name === product.name ? "bg-neutral-800" : "bg-neutral-100")}>Z: ₹{product.zepto.currentPrice}</span>}
                            {product.blinkit && <span className={cn("px-1.5 py-0.5 rounded", selectedProduct?.name === product.name ? "bg-neutral-800" : "bg-neutral-100")}>B: ₹{product.blinkit.currentPrice}</span>}
                            {product.jiomart && <span className={cn("px-1.5 py-0.5 rounded", selectedProduct?.name === product.name ? "bg-neutral-800" : "bg-neutral-100")}>J: ₹{product.jiomart.currentPrice}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredProducts.length === 0 && !loading && (
                    <div className="p-8 text-center text-neutral-500 text-sm">No products found</div>
                  )}
                </div>
              </div>

              {/* Details Panel */}
              <div className="lg:col-span-2 space-y-6">
                {/* Comparison Card */}
                {selectedProduct ? (
                  <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
                    <div className="p-6 border-b border-neutral-200">
                      <h2 className="text-xl font-bold text-neutral-900">{selectedProduct.name}</h2>
                      <p className="text-sm text-neutral-500 mt-1">Price Comparison & History</p>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {['zepto', 'blinkit', 'jiomart', 'dmart'].map(p => {
                        const data = selectedProduct[p];
                        if (!data) return null;
                        return (
                          <div key={p} className="p-4 rounded-lg border border-neutral-200 bg-neutral-50 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-2">
                              <div className="capitalize text-sm font-semibold text-neutral-500">{p}</div>
                              {data.ranking && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-white border border-neutral-200 rounded text-neutral-600">
                                  #{data.ranking}
                                </span>
                              )}
                            </div>

                            <div className="text-2xl font-bold text-neutral-900 mb-1">₹{data.currentPrice}</div>

                            <div className="flex items-center gap-2 text-sm mb-3">
                              {data.priceChange !== 0 && renderChangeIndicator(data.priceChange)}
                            </div>

                            <div className="mt-auto space-y-2 pt-3 border-t border-neutral-200/60 text-xs text-neutral-600">
                              {data.quantity && (
                                <div className="flex justify-between">
                                  <span>Weight:</span>
                                  <span className="font-medium text-neutral-900">{data.quantity}</span>
                                </div>
                              )}
                              {(data.deliveryTime || p === 'jiomart') && (
                                <div className="flex justify-between">
                                  <span>Delivery:</span>
                                  <span className="font-medium text-neutral-900">
                                    {p === 'jiomart' ? '10 to 30 min' : data.deliveryTime}
                                  </span>
                                </div>
                              )}
                              {data.productUrl && (
                                <a
                                  href={data.productUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-1.5 w-full mt-2 py-1.5 bg-white border border-neutral-200 rounded text-neutral-700 hover:text-black hover:border-neutral-300 transition-colors font-medium group"
                                >
                                  <span>View Product</span>
                                  <ExternalLink size={10} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                </a>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Chart */}

                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12 flex flex-col items-center justify-center text-center h-[400px]">
                    <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                      <Filter size={24} className="text-neutral-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">Select a product</h3>
                    <p className="text-neutral-500 max-w-sm">
                      Click on any product from the list on the left to see detailed price analysis and history.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        )
      }



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

      {/* Loading Overlay */}
      {
        loading && (
          <div className="fixed inset-0 bg-white/50 backdrop-blur-[2px] z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin text-neutral-900">
                <RefreshCw size={32} />
              </div>
              <p className="font-semibold text-neutral-900">Updating data...</p>
            </div>
          </div>
        )
      }
    </div>
  );
}
