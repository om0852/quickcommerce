"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Clock, Filter, Download, ExternalLink, ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import AnalyticsTab from './AnalyticsTab';
import ExportCategoryDialog from './ExportCategoryDialog';
import CustomDropdown from '@/components/CustomDropdown';
import { cn } from '@/lib/utils';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TableVirtuoso } from 'react-virtuoso';


import categoriesData from '@/data/categories_with_urls.json';

export default function CategoriesPage() {
  // Generate options from the JSON keys (Master Categories)
  const CATEGORY_OPTIONS = Object.keys(categoriesData).map(cat => ({
    label: cat,
    value: cat
  }));

  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]?.value || 'Fruits & Vegetables');
  const [pincode, setPincode] = useState('201303');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [showMissing, setShowMissing] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [stockData, setStockData] = useState(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [loading, setLoading] = useState(true); // Default to true for initial load
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [snapshotDate, setSnapshotDate] = useState('');
  const [snapshotTime, setSnapshotTime] = useState('');
  const [availableSnapshots, setAvailableSnapshots] = useState([]);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 200;

  const PINCODE_OPTIONS = [
    { label: 'Delhi NCR — 201303', value: '201303' },
    { label: 'Delhi NCR — 201014', value: '201014' },
    { label: 'Delhi NCR — 122008', value: '122008' },
    { label: 'Delhi NCR — 122010', value: '122010' },
    { label: 'Delhi NCR — 122016', value: '122016' }
  ];

  const PLATFORM_OPTIONS = [
    { label: 'All Platforms', value: 'all' },
    { label: 'Zepto', value: 'zepto' },
    { label: 'Blinkit', value: 'blinkit' },
    { label: 'JioMart', value: 'jiomart' },
    { label: 'DMart', value: 'dmart' },
    { label: 'Instamart', value: 'instamart' }
  ];

  const fetchCategoryData = async (customTimestamp = null) => {
    setLoading(true);
    setProducts([]);
    setError(null);
    setCurrentPage(1);

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
      const res = await fetch(`/api/available-snapshots?category=${encodeURIComponent(category)}&pincode=${encodeURIComponent(pincode)}`);
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
      } else {
        // If no snapshots found, turn off loading directly (as fetchCategoryData won't be called)
        setLoading(false);
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
        const presentInOthers = ['zepto', 'blinkit', 'jiomart', 'dmart', 'instamart']
          .filter(p => p !== platformFilter)
          .some(p => product[p]);
        return missingInSelected && presentInOthers;
      });
    }

    return products.filter(product => product[platformFilter]);
  }, [products, platformFilter, showMissing]);

  const sortedProducts = useMemo(() => {
    let sortableProducts = [...filteredProducts];
    if (sortConfig.key !== null) {
      sortableProducts.sort((a, b) => {
        const platformKey = sortConfig.key;
        // Access nested object property safely
        const itemA = a[platformKey];
        const itemB = b[platformKey];

        // Get ranking, treating missing or non-numeric rankings as Infinity (always push to bottom)
        const rankA = itemA && itemA.ranking && !isNaN(itemA.ranking) ? itemA.ranking : Infinity;
        const rankB = itemB && itemB.ranking && !isNaN(itemB.ranking) ? itemB.ranking : Infinity;

        if (rankA < rankB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (rankA > rankB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableProducts;
  }, [filteredProducts, sortConfig]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedProducts, currentPage]);


  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

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
            <span className="ml-2 text-xs font-medium px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full border border-neutral-200">
              {filteredProducts.length} Products
            </span>
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


        {/* Snapshot Selector */}
        <div className="mt-6 pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* Status Indicator */}
          <div className="flex items-center gap-2.5 text-sm">
            {!isLiveMode ? (
              <>
                <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_0_2px_rgba(244,63,94,0.2)]"></div>
                <span className="font-medium text-neutral-600">
                  Viewing Data: <span className="text-neutral-900">{new Date(snapshotTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_0_2px_rgba(16,185,129,0.2)]"></div>
                <span className="font-medium text-neutral-600">
                  Latest Data: <span className="text-neutral-900">{availableSnapshots.length > 0
                    ? new Date(availableSnapshots[0]).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                    : 'No data'}</span>
                </span>
              </>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase tracking-wider font-bold text-neutral-400 mr-1 select-none">History:</span>

            <div className="flex items-center gap-2">
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
                  label: new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                }))}
                placeholder="Date"
              />

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
            </div>

            {!isLiveMode && (
              <button
                onClick={() => setIsLiveMode(true)}
                className="ml-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-1.5 rounded-md transition-all hover:shadow-sm active:scale-95"
              >
                Reset
              </button>
            )}
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
              /* Products List (Table) - Virtualized */
              <div className="flex flex-col gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden h-[calc(100vh-380px)]">
                  <TableVirtuoso
                    data={paginatedProducts}
                    components={{
                      Table: (props) => (
                        <table {...props} className="min-w-full divide-y divide-neutral-200 border-collapse" style={{ ...props.style, width: '100%' }} />
                      ),
                      TableRow: (props) => <tr {...props} className="hover:bg-neutral-50 transition-colors" />,
                    }}
                    fixedHeaderContent={() => (
                      <tr className="bg-neutral-50">
                        <th scope="col" className="px-8 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider sticky left-0 bg-neutral-50 z-20 w-[350px] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">Product</th>
                        {['zepto', 'blinkit', 'jiomart', 'dmart', 'instamart'].map((platform) => (
                          <th
                            key={platform}
                            scope="col"
                            className="px-8 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider min-w-[140px] cursor-pointer hover:bg-neutral-100 transition-colors select-none bg-neutral-50"
                            onClick={() => requestSort(platform)}
                          >
                            <div className="flex items-center gap-1">
                              {platform}
                              {sortConfig.key === platform ? (
                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                              ) : (
                                <ChevronsUpDown size={14} className="text-neutral-300" />
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    )}
                    itemContent={(index, product) => {
                      const productImage = product.zepto?.productImage || product.blinkit?.productImage || product.jiomart?.productImage || product.dmart?.productImage || product.instamart?.productImage;
                      return (
                        <>
                          <td className="px-8 py-4 whitespace-nowrap sticky left-0 bg-white z-10 group-hover:bg-neutral-50 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 flex-shrink-0 rounded-lg border border-neutral-200 p-1 bg-white">
                                {productImage ? (
                                  <img
                                    className="h-full w-full object-contain mix-blend-multiply"
                                    src={productImage}
                                    alt={product.name}
                                    onError={(e) => e.target.style.display = 'none'}
                                  />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center bg-neutral-100 text-[10px] text-neutral-400">No Img</div>
                                )}
                              </div>
                              <div className="max-w-[250px]">
                                <div className="text-sm font-medium text-neutral-900 truncate" title={product.name}>{product.name}</div>
                              </div>
                            </div>
                          </td>
                          {['zepto', 'blinkit', 'jiomart', 'dmart', 'instamart'].map(p => {
                            const data = product[p];
                            return (
                              <td key={p} className="px-8 py-4 whitespace-nowrap">
                                {data ? (
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <div className="text-sm font-semibold text-neutral-900">
                                        ₹{Number(data.currentPrice).toFixed(0)}
                                      </div>
                                      {/* Ranking Badge */}
                                      {data.ranking && !isNaN(data.ranking) && (
                                        <span className={cn(
                                          "text-[10px] font-bold px-1.5 py-0.5 rounded border",
                                          data.ranking === 1 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-neutral-50 text-neutral-500 border-neutral-200"
                                        )}>
                                          #{data.ranking}
                                        </span>
                                      )}
                                    </div>

                                    <div className="text-xs text-neutral-500 mt-1 flex flex-col gap-0.5">
                                      {data.priceChange && !isNaN(data.priceChange) && data.priceChange !== 0 ? (
                                        <span className={cn(
                                          "inline-flex items-center gap-0.5",
                                          data.priceChange < 0 ? "text-emerald-600" : "text-rose-600"
                                        )}>
                                          {data.priceChange < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                                          {Math.abs(data.priceChange)}
                                        </span>
                                      ) : null}
                                      {((data.deliveryTime && data.deliveryTime.length < 20) || p === 'jiomart') && (
                                        <span className="opacity-75">{p === 'jiomart' ? '10-30 min' : data.deliveryTime}</span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-sm text-neutral-400 italic">--</span>
                                )}
                              </td>
                            )
                          })}
                        </>
                      );
                    }}
                  />
                  {filteredProducts.length === 0 && !loading && (
                    <div className="px-6 py-12 text-center text-sm text-neutral-500">
                      No products found matching your filters.
                    </div>
                  )}
                </div>

                {/* Pagination Controls */}
                {sortedProducts.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between px-4 py-3 bg-white border border-neutral-200 rounded-lg shadow-sm">
                    <div className="text-sm text-neutral-500">
                      Showing <span className="font-medium text-neutral-900">{Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, sortedProducts.length)}</span> to <span className="font-medium text-neutral-900">{Math.min(currentPage * ITEMS_PER_PAGE, sortedProducts.length)}</span> of <span className="font-medium text-neutral-900">{sortedProducts.length}</span> results
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      <span className="text-sm font-medium text-neutral-900 px-2">
                        Page {currentPage} of {Math.ceil(sortedProducts.length / ITEMS_PER_PAGE)}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(sortedProducts.length / ITEMS_PER_PAGE)))}
                        disabled={currentPage >= Math.ceil(sortedProducts.length / ITEMS_PER_PAGE)}
                        className="px-3 py-1.5 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
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
            <div className="fixed inset-0 bg-neutral-50 z-[100] flex items-center justify-center">
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
    </div>
  );
}
