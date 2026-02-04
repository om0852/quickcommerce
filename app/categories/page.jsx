"use client"
import React, { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';


import { Switch } from '@/components/ui/switch';
import { TrendingUp, TrendingDown, RefreshCw, Clock, Filter, Download, ExternalLink, ChevronsUpDown, ChevronUp, ChevronDown, Search, List, LayoutGrid, ArrowRight } from 'lucide-react';
import AnalyticsTab from './AnalyticsTab';
import StockAnalysisTab from './StockAnalysisTab';
import ExportCategoryDialog from './ExportCategoryDialog';
import CustomDropdown from '@/components/CustomDropdown';
import ProductDetailsDialog from './ProductDetailsDialog';
import ProductTable from './ProductTable';
import LinksTab from './LinksTab';
import { cn } from '@/lib/utils';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';



import categoriesData from '../utils/categories_with_urls.json';

// Defined outside component to prevent re-creation


function CategoriesPageContent() {
  // ... (keep existing state)

  // Memoize fixed header content


  // ... (rest of component)

  // Generate options from the JSON data
  // The JSON structure is { "Platform": [ { masterCategory: "Name", ... } ] }
  // We need to extract unique masterCategory values across all platforms
  const CATEGORY_OPTIONS = useMemo(() => {
    const allItems = Object.values(categoriesData).flat();
    const uniqueCategories = [...new Set(allItems.map(item => item.masterCategory).filter(Boolean))].sort();

    // Move 'Fruits & Vegetables' to the start if it exists
    const prioritized = 'Fruits & Vegetables';
    if (uniqueCategories.includes(prioritized)) {
      const index = uniqueCategories.indexOf(prioritized);
      uniqueCategories.splice(index, 1);
      uniqueCategories.unshift(prioritized);
    }

    return uniqueCategories.map(cat => ({
      label: cat,
      value: cat
    }));
  }, []);

  const searchParams = useSearchParams();
  const isAdmin = searchParams.get('admin') === 'true';

  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]?.value || 'Fruits & Vegetables');
  const [pincode, setPincode] = useState('201303');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [showMissing, setShowMissing] = useState(false);
  const [showNewFirst, setShowNewFirst] = useState(false);
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
  const [searchQuery, setSearchQuery] = useState('');
  const ITEMS_PER_PAGE = 200;
  const lastActivePageRef = useRef(1);

  const PINCODE_OPTIONS = [
    { label: 'Delhi NCR — 201303', value: '201303' },
    { label: 'Navi Mumbai — 400706', value: '400706' },
    { label: 'Delhi NCR — 201014', value: '201014' },
    { label: 'Delhi NCR — 122008', value: '122008' },
    { label: 'Delhi NCR — 122010', value: '122010' },
    { label: 'Delhi NCR — 122016', value: '122016' },
    { label: 'Mumbai — 400070', value: '400070' },
    { label: 'Mumbai — 400703', value: '400703' },
    { label: 'Mumbai — 401101', value: '401101' },
    { label: 'Mumbai — 401202', value: '401202' },

  ];

  const PLATFORM_OPTIONS = [
    { label: 'All', value: 'all' },
    { label: 'JioMart', value: 'jiomart' },
    { label: 'Zepto', value: 'zepto' },
    { label: 'Blinkit', value: 'blinkit' },
    { label: 'DMart', value: 'dmart' },
    { label: 'Flipkart', value: 'flipkartMinutes' },
    { label: 'Instamart', value: 'instamart' }
  ];

  // Apply search filter first
  const searchedProducts = useMemo(() => {
    if (!searchQuery) return products;

    const tokens = searchQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    return products.filter(p => {
      const nameLower = p.name.toLowerCase();
      return tokens.every(token => nameLower.includes(token));
    });
  }, [products, searchQuery]);

  // Calculate platform counts from searched products
  const platformCounts = useMemo(() => {
    const counts = {
      all: searchedProducts.length,
      jiomart: 0,
      zepto: 0,
      blinkit: 0,
      dmart: 0,
      flipkartMinutes: 0,
      instamart: 0
    };

    searchedProducts.forEach(product => {
      if (product.jiomart) counts.jiomart++;
      if (product.zepto) counts.zepto++;
      if (product.blinkit) counts.blinkit++;
      if (product.dmart) counts.dmart++;
      if (product.flipkartMinutes) counts.flipkartMinutes++;
      if (product.instamart) counts.instamart++;
    });

    return counts;
  }, [searchedProducts]);

  // Calculate TOTAL platform counts (unfiltered by search) to distinguish "Not Found" vs "Unserviceable"
  const totalPlatformCounts = useMemo(() => {
    const counts = {
      all: products.length,
      jiomart: 0,
      zepto: 0,
      blinkit: 0,
      dmart: 0,
      flipkartMinutes: 0,
      instamart: 0
    };

    products.forEach(product => {
      if (product.jiomart) counts.jiomart++;
      if (product.zepto) counts.zepto++;
      if (product.blinkit) counts.blinkit++;
      if (product.dmart) counts.dmart++;
      if (product.flipkartMinutes) counts.flipkartMinutes++;
      if (product.instamart) counts.instamart++;
    });

    return counts;
  }, [products]);

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

      const response = await fetch(url, { cache: 'no-store' });
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
      // Clear previous data while loading new config
      setLoading(true);
      setProducts([]);
      setError(null);

      try {
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
              // If date not found for this pincode, reset to live
              setIsLiveMode(true);
              // Re-run for live mode (or just let the effect re-run if we depend on isLiveMode?)
              // Better to just force fetch live data here
              const latestTS = data.snapshots[0];
              const dateObj = new Date(latestTS);
              setSnapshotDate(dateObj.toLocaleDateString('en-CA'));
              setSnapshotTime(latestTS);
              fetchCategoryData(latestTS);
            }
          }
        } else {
          // No snapshots found for this pincode/category
          setAvailableSnapshots([]);
          setSnapshotTime('');
          setSnapshotDate('');
          setProducts([]);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching snapshots:", err);
        setAvailableSnapshots([]);
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



  const filteredProducts = useMemo(() => {
    let result = searchedProducts;

    // Platform Filter
    if (platformFilter === 'all') {
      return result;
    }

    if (showMissing) {
      return result.filter(product => {
        const missingInSelected = !product[platformFilter];
        const presentInOthers = ['jiomart', 'zepto', 'blinkit', 'dmart', 'flipkartMinutes', 'instamart']
          .filter(p => p !== platformFilter)
          .some(p => product[p]);
        return missingInSelected && presentInOthers;
      });
    }

    return result.filter(product => product[platformFilter]);
  }, [searchedProducts, platformFilter, showMissing]);

  const sortedProducts = useMemo(() => {
    let sortableProducts = [...filteredProducts];

    // Helper to intelligently resolve subcategory
    // Because some scrapers (Flipkart) might set root subCategory to "General", breaking grouping.
    // We prefer: 1. Specific Root Official SubCat, 2. Specific Platform SubCat, 3. Root SubCat, 4. "Other"
    const resolveSubCategory = (item) => {
      // 1. Try root official (if meaningful)
      if (item.officialSubCategory && item.officialSubCategory !== 'General') {
        return item.officialSubCategory;
      }

      // 2. Try looking into platforms for a better name
      const platforms = ['zepto', 'blinkit', 'instamart', 'flipkartMinutes', 'jiomart', 'dmart'];
      for (const p of platforms) {
        if (item[p]) {
          const sub = item[p].subcategory || item[p].officialSubCategory;
          if (sub && sub !== 'General') {
            return sub;
          }
        }
      }

      // 3. Fallback to root (even if General) or Other
      return item.officialSubCategory || item.subCategory || 'Other';
    };

    // Helper to check if product has "new" flag in any platform
    const hasNewFlag = (product) => {
      const platforms = ['zepto', 'blinkit', 'jiomart', 'dmart', 'instamart', 'flipkartMinutes'];
      return platforms.some(p => product[p]?.new === true);
    };

    if (sortConfig.key !== null) {
      sortableProducts.sort((a, b) => {
        const platformKey = sortConfig.key;
        // Access nested object property safely
        const itemA = a[platformKey];
        const itemB = b[platformKey];

        // 0. Handle products not present on the platform
        // We ALWAYS want existing products to appear before missing products
        if (!itemA && !itemB) return 0;
        if (!itemA) return 1;
        if (!itemB) return -1;

        // 0.5. If showNewFirst is enabled, prioritize new products
        if (showNewFirst) {
          const aIsNew = hasNewFlag(a);
          const bIsNew = hasNewFlag(b);
          if (aIsNew && !bIsNew) return -1;
          if (!aIsNew && bIsNew) return 1;
        }

        // 1. Sort by officialCategory
        const catA = itemA.officialCategory || '';
        const catB = itemB.officialCategory || '';
        if (catA !== catB) {
          return catA.localeCompare(catB);
        }

        // 2. Sort by officialSubCategory (using smart resolver)
        const subCatA = resolveSubCategory(a);
        const subCatB = resolveSubCategory(b);

        if (subCatA !== subCatB) {
          return subCatA.localeCompare(subCatB);
        }

        // 3. Then sort by ranking within the subcategory
        const rankA = itemA.ranking && !isNaN(itemA.ranking) ? itemA.ranking : Infinity;
        const rankB = itemB.ranking && !isNaN(itemB.ranking) ? itemB.ranking : Infinity;

        if (rankA < rankB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (rankA > rankB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    } else {
      // Default Sort: Match Count (Desc) -> SubCategory -> Ranking
      sortableProducts.sort((a, b) => {
        // 0. If showNewFirst is enabled, prioritize new products
        if (showNewFirst) {
          const aIsNew = hasNewFlag(a);
          const bIsNew = hasNewFlag(b);
          if (aIsNew && !bIsNew) return -1;
          if (!aIsNew && bIsNew) return 1;
        }

        // 1. Sort by Match Count (High availability first)
        const platforms = ['zepto', 'blinkit', 'jiomart', 'dmart', 'instamart', 'flipkartMinutes'];
        const countA = platforms.filter(p => a[p]).length;
        const countB = platforms.filter(p => b[p]).length;

        // If one has more matches than the other, it comes first
        if (countA !== countB) return countB - countA;

        // 2. Sort by officialCategory
        const catA = a.officialCategory || '';
        const catB = b.officialCategory || '';
        if (catA !== catB) return catA.localeCompare(catB);

        // 3. Sort by SubCategory (Smart Resolve)
        const subA = resolveSubCategory(a);
        const subB = resolveSubCategory(b);
        if (subA !== subB) return subA.localeCompare(subB);

        // 4. Sort by Ranking (Minimum rank across platforms)
        const getMinRank = (p) => {
          let min = Infinity;
          ['flipkartMinutes', 'blinkit', 'zepto', 'jiomart', 'instamart', 'dmart'].forEach(key => {
            if (p[key] && p[key].ranking && !isNaN(p[key].ranking)) {
              if (p[key].ranking < min) min = p[key].ranking;
            }
          });
          return min;
        };
        const rankA = getMinRank(a);
        const rankB = getMinRank(b);

        return rankA - rankB;
      });
    }
    return sortableProducts;
  }, [filteredProducts, sortConfig, showNewFirst]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedProducts, currentPage]);


  const requestSort = React.useCallback((key) => {
    setSortConfig(currentConfig => {
      let direction = 'asc';
      if (currentConfig.key === key && currentConfig.direction === 'asc') {
        direction = 'desc';
      }
      return { key, direction };
    });
  }, []);

  const handleProductClick = React.useCallback((product) => {
    setSelectedProduct(product);
    setIsDetailsOpen(true);
  }, []);



  useEffect(() => {
    if (filteredProducts.length > 0) {
      if (!selectedProduct || !filteredProducts.find(p => p.name === selectedProduct.name)) {
        // Removed auto selection
        // setSelectedProduct(filteredProducts[0]);
        if (selectedProduct) setSelectedProduct(null);
      }
    } else {
      setSelectedProduct(null);
    }
  }, [filteredProducts]);


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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-neutral-900">

      {/* Header */}
      <div className="flex-none bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Category Tracker</h1>

          <div className="flex items-center gap-2 text-sm bg-gray-100 rounded-lg px-2 py-1">
            <span className={`w - 2 h - 2 rounded - full ${isLiveMode ? 'bg-neutral-900 animate-pulse' : 'bg-neutral-400'} `}></span>
            <span className="font-medium text-neutral-600">
              {isLiveMode ? 'Live Mode' : 'Historical Snapshot'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">


          <div className="flex items-center gap-4">
            {!isLiveMode && (
              <div className="flex items-center gap-2 text-sm bg-neutral-100 text-neutral-900 px-3 py-1.5 rounded-lg border border-neutral-200 animate-in fade-in">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-500"></span>
                </span>
                {/* <span className="font-medium">Viewing Past Data</span> */}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full max-w-[1920px] mx-auto p-6 gap-4">

        {/* Controls */}
        <div className="flex-none flex flex-col gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">

          {/* Top Row: Selectors and Actions */}
          <div className="flex items-center justify-between gap-4">
            {/* Left: Selectors */}
            <div className="flex items-center gap-4">
              <div className="w-64 relative z-[100]">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
                <CustomDropdown
                  value={category}
                  onChange={(val) => {
                    setCategory(val);
                    setSortConfig({ key: null, direction: 'asc' });
                    setSearchQuery('');
                  }}
                  options={CATEGORY_OPTIONS}
                />
              </div>
              <div className="w-48 relative z-[90]">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Region</label>
                <CustomDropdown value={pincode} onChange={setPincode} options={PINCODE_OPTIONS} />
              </div>

              {/* Snapshot Selectors */}
              <div className="w-40 relative z-[80] mr-4">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Date</label>
                <CustomDropdown
                  value={snapshotDate}
                  onChange={(newDate) => {
                    setSnapshotDate(newDate);
                    setIsLiveMode(false);

                    // Auto-select the latest time for this date
                    const timesForDate = availableSnapshots.filter(ts => {
                      const d = new Date(ts);
                      return d.toLocaleDateString('en-CA') === newDate;
                    });

                    if (timesForDate.length > 0) {
                      // Assuming availableSnapshots is sorted desc (latest first) or we sort it
                      // The backend usually sends them sorted? 
                      // Let's sort to be safe: latest first
                      timesForDate.sort((a, b) => new Date(b) - new Date(a));
                      const latestTime = timesForDate[0];
                      setSnapshotTime(latestTime);
                      fetchCategoryData(latestTime);
                    }
                  }}
                  options={uniqueDates.map(d => ({ value: d, label: d }))}
                  placeholder="Date"
                  minimal
                />
              </div>

              {!isLiveMode && (
                <button
                  onClick={() => setIsLiveMode(true)}
                  className="mt-6 p-2 text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
                  title="Return to Live Mode"
                >
                  <RefreshCw size={18} />
                </button>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchCategoryData()}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all cursor-pointer"
                title="Refresh Data"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>



              <button
                onClick={() => setIsExportOpen(true)}
                className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm cursor-pointer"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>

          {/* Bottom Row: Platform Filter */}
          <div className="w-full border-t border-gray-100 pt-3 flex items-end justify-between gap-4">
            <div className="flex-1 overflow-hidden">
              <label className="text-xs font-semibold text-gray-500 mb-2 block">
                Platform Filter <span className="text-neutral-400 font-normal ml-1">({platformCounts[platformFilter] || 0})</span>
              </label>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {PLATFORM_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setPlatformFilter(opt.value);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap cursor-pointer",
                      platformFilter === opt.value
                        ? "bg-neutral-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={cn(
              "flex items-center gap-3 px-3 py-1.5 mb-0.5 transition-opacity duration-200",
              platformFilter === 'all' ? "opacity-50 blur-[0.5px] pointer-events-none grayscale" : ""
            )}>
              <span className="text-sm font-medium text-gray-700">Show Missing</span>
              <Switch
                checked={showMissing}
                onCheckedChange={setShowMissing}
                disabled={platformFilter === 'all'}
              />
            </div>

            {isAdmin && (
              <div className="flex items-center gap-3 px-3 py-1.5 mb-0.5">
                <span className="text-sm font-medium text-gray-700">Show New First</span>
                <Switch
                  checked={showNewFirst}
                  onCheckedChange={setShowNewFirst}
                />
              </div>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex-none">
          <div className="inline-flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
            {['products', 'analytics', 'stock', 'links'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize cursor-pointer",
                  activeTab === tab
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700 hover:bg-gray-100"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'products' && (
            <div className="h-[calc(100vh-200px)] bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <ProductTable
                products={paginatedProducts}
                sortConfig={sortConfig}
                onSort={requestSort}
                loading={loading}
                onProductClick={handleProductClick}
                searchQuery={searchQuery}
                onSearchChange={(q) => {
                  // If we are starting a search (and current query was empty), save the current page
                  if (q && !searchQuery) {
                    lastActivePageRef.current = currentPage;
                    setCurrentPage(1);
                  }
                  // If we are clearing the search, restore the last active page
                  else if (!q) {
                    setCurrentPage(lastActivePageRef.current);
                  }
                  // If just modifying an existing search, stay on page 1 (implied, or redundant set)
                  else {
                    setCurrentPage(1);
                  }
                  setSearchQuery(q);
                }}
                platformCounts={platformCounts}
                totalPlatformCounts={totalPlatformCounts}
                pincode={pincode}
                onRefresh={fetchCategoryData}
              />
            </div>
          )}

          {/* Links Tab */}
          {activeTab === 'links' && (
            <LinksTab data={categoriesData} selectedCategory={category} />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab
              products={products}
              category={category}
              pincode={pincode}
            />
          )}

          {activeTab === 'stock' && (
            <StockAnalysisTab
              category={category}
              pincode={pincode}
              platform={platformFilter}
            />
          )}
        </div>

        {/* Footer/Pagination */}
        {activeTab === 'products' && sortedProducts.length > 0 && (
          <div className="flex-none flex items-center justify-between bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
            <span className="text-sm text-gray-600 font-medium">
              Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, sortedProducts.length)} - {Math.min(currentPage * ITEMS_PER_PAGE, sortedProducts.length)} of {sortedProducts.length} products
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(c => c - 1)}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
              >
                <ArrowRight size={18} className="rotate-180" />
              </button>
              <span className="text-sm font-semibold">Page {currentPage} / {Math.ceil(sortedProducts.length / ITEMS_PER_PAGE)}</span>
              <button
                disabled={currentPage >= Math.ceil(sortedProducts.length / ITEMS_PER_PAGE)}
                onClick={() => setCurrentPage(c => c + 1)}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
              >
                <ArrowRight size={18} />
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
        isAdmin={isAdmin}
        onRefresh={fetchCategoryData}
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


    </div >
  );
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div></div>}>
      <CategoriesPageContent />
    </Suspense>
  );
}
