"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Clock, Filter, Download, ExternalLink, ChevronsUpDown, ChevronUp, ChevronDown, Search, ArrowRight, LayoutGrid, List } from 'lucide-react';
// Import components from the parent categories directory
import AnalyticsTab from '../categories/AnalyticsTab';
import ExportCategoryDialog from '../categories/ExportCategoryDialog';
import CustomDropdown from '@/components/CustomDropdown';
import ProductDetailsDialog from '../categories/ProductDetailsDialog';
import ProductTable from '../categories/ProductTable';
import { cn } from '@/lib/utils';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

import categoriesData from '../utils/categories_with_urls.json';

export default function TestingPage() {
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
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
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
    { label: 'JioMart', value: 'jiomart' },
    { label: 'Zepto', value: 'zepto' },
    { label: 'Blinkit', value: 'blinkit' },
    { label: 'DMart', value: 'dmart' },
    { label: 'Flipkart', value: 'flipkartMinutes' },
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
      if (selectedProduct.flipkartMinutes?.productId) productIds.flipkartMinutes = selectedProduct.flipkartMinutes.productId;

      const productNames = {};
      if (selectedProduct.zepto?.name) productNames.zepto = selectedProduct.zepto.name;
      if (selectedProduct.blinkit?.name) productNames.blinkit = selectedProduct.blinkit.name;
      if (selectedProduct.jiomart?.name) productNames.jiomart = selectedProduct.jiomart.name;
      if (selectedProduct.flipkartMinutes?.name) productNames.flipkartMinutes = selectedProduct.flipkartMinutes.name;

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
          'Flipkart Minutes': h['Flipkart Minutes'],
          'Zepto Rank': h['Zepto Rank'],
          'Blinkit Rank': h['Blinkit Rank'],
          'JioMart Rank': h['JioMart Rank'],
          'Flipkart Minutes Rank': h['Flipkart Minutes Rank'],
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
      if (selectedProduct.flipkartMinutes?.productId) productIds.flipkartMinutes = selectedProduct.flipkartMinutes.productId;

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
            jiomart: selectedProduct.jiomart?.name,
            flipkartMinutes: selectedProduct.flipkartMinutes?.name
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
              JioMart: item.JioMart !== null ? (item.jiomartStock === false ? 0 : 1) : null,
              'Flipkart Minutes': item['Flipkart Minutes'] !== null ? (item.flipkartMinutesStock === false ? 0 : 1) : null
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
        const presentInOthers = ['jiomart', 'zepto', 'blinkit', 'dmart', 'flipkartMinutes', 'instamart']
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

  return (
    <div className="h-screen bg-neutral-50 flex flex-col font-sans text-neutral-900 overflow-hidden">

      {/* Premium Navbar */}
      <div className="flex-none bg-white border-b border-neutral-200 px-6 py-3 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center">
            <TrendingUp size={18} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-neutral-900">QC Tracker</h1>
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${isLiveMode ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
              <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                {isLiveMode ? 'Live Mode' : 'Historical'}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Search / Global Actions (Placeholder) */}
        <div className="hidden md:flex items-center bg-neutral-100 rounded-full px-4 py-1.5 border border-neutral-200 w-64">
          <Search size={14} className="text-neutral-400 mr-2" />
          <input type="text" placeholder="Search products..." className="bg-transparent text-sm outline-none w-full placeholder:text-neutral-500" />
        </div>

        {/* Right: History & Date Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg p-1 pr-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="px-2 py-1 bg-neutral-100 rounded text-[10px] font-bold text-neutral-500 uppercase">Snapshot</div>
            <div className="w-32">
              <CustomDropdown
                value={snapshotDate}
                onChange={(newDate) => { setSnapshotDate(newDate); setIsLiveMode(false); }}
                options={uniqueDates.map(d => ({ value: d, label: d }))}
                placeholder="Date"
                minimal
              />
            </div>
            <div className="w-24 border-l border-neutral-200 pl-2">
              <CustomDropdown
                value={snapshotTime}
                onChange={(ts) => { setSnapshotTime(ts); setIsLiveMode(false); if (ts) fetchCategoryData(ts); }}
                options={availableTimes}
                placeholder="Time"
                minimal
              />
            </div>
          </div>
          {!isLiveMode && (
            <button onClick={() => setIsLiveMode(true)} className="p-2 bg-neutral-900 text-white rounded-lg hover:bg-black transition-colors" title="Reset to Live">
              <RefreshCw size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col w-full max-w-[1600px] mx-auto p-4 gap-4 min-h-0">

        {/* Controls Bar - Single Line */}
        <div className="flex-none flex flex-col md:flex-row items-center gap-4 bg-white p-3 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-3 w-full md:w-auto flex-1">
            <div className="w-64 min-w-[200px]">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 block pl-1">Category</label>
              <CustomDropdown value={category} onChange={setCategory} options={CATEGORY_OPTIONS} />
            </div>
            <div className="w-48 min-w-[160px]">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 block pl-1">Region</label>
              <CustomDropdown value={pincode} onChange={setPincode} options={PINCODE_OPTIONS} />
            </div>
          </div>

          <div className="h-8 w-px bg-neutral-200 hidden md:block"></div>

          {/* Platform Filters as Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full">
            {PLATFORM_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPlatformFilter(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
                  platformFilter === opt.value
                    ? "bg-neutral-900 text-white border-neutral-900 shadow-md transform scale-105"
                    : "bg-white text-neutral-600 border-transparent hover:bg-neutral-50 hover:border-neutral-200"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="h-8 w-px bg-neutral-200 hidden md:block"></div>

          <div className="flex items-center gap-2">
            <button onClick={() => fetchCategoryData()} className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors">
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => setIsExportOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm hover:shadow-emerald-200">
              <Download size={14} />
              EXPORT
            </button>
          </div>
        </div>

        {/* Table Area - Maximized */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden min-h-0">
          <ProductTable
            products={paginatedProducts}
            sortConfig={sortConfig}
            onSort={requestSort}
            onProductClick={(product) => { setSelectedProduct(product); setIsDetailsOpen(true); }}
          />
        </div>

        {/* Pagination Footer */}
        {sortedProducts.length > ITEMS_PER_PAGE && (
          <div className="flex-none bg-white border border-neutral-200 p-2 rounded-lg flex items-center justify-between shadow-sm">
            <span className="text-xs text-neutral-500 font-medium px-2">
              Line items: <span className="text-neutral-900 font-bold">{sortedProducts.length}</span>
            </span>
            <div className="flex items-center gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)} className="p-1.5 rounded hover:bg-neutral-100 disabled:opacity-50">
                <ArrowRight size={16} className="rotate-180" />
              </button>
              <span className="text-xs font-bold text-neutral-900">Page {currentPage}</span>
              <button disabled={currentPage >= Math.ceil(sortedProducts.length / ITEMS_PER_PAGE)} onClick={() => setCurrentPage(c => c + 1)} className="p-1.5 rounded hover:bg-neutral-100 disabled:opacity-50">
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

      </div>

      <ProductDetailsDialog
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        category={category}
        pincode={pincode}
        platformFilter={platformFilter}
        historyData={historyData}
        historyLoading={historyLoading}
        stockData={stockData}
        selectedProduct={selectedProduct}
      />

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

      {loading && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-2xl shadow-xl border border-neutral-100 flex flex-col items-center">
            <RefreshCw size={32} className="text-neutral-900 animate-spin mb-2" />
            <span className="text-sm font-bold text-neutral-900">Syncing Data...</span>
          </div>
        </div>
      )}
    </div>
  );
}
