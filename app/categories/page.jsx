"use client"
import React, { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';


import { Switch } from '@/components/ui/switch';
import { TrendingUp, TrendingDown, RefreshCw, Clock, Filter, Download, ExternalLink, ChevronsUpDown, ChevronUp, ChevronDown, Search, List, LayoutGrid, ArrowRight, Loader2, Info } from 'lucide-react';
import { Snackbar, Alert, Tooltip as MuiTooltip } from '@mui/material'; // NEW Import
import { useSidebar } from '@/components/SidebarContext';
import { SidebarOpenIcon, SidebarCloseIcon } from '@/components/SidebarIcons';
import AnalyticsTab from './AnalyticsTab';
import StockAnalysisTab from './StockAnalysisTab';
import ExportCategoryDialog from './ExportCategoryDialog';
import CustomDropdown from '@/components/CustomDropdown';
import ProductDetailsDialog from './ProductDetailsDialog';
import ProductTable from './ProductTable';
import LinksTab from './LinksTab';
import BrandTab from './BrandTab';
import { cn } from '@/lib/utils';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';



import categoriesData from '../utils/categories_with_urls.json';

// Defined outside component to prevent re-creation


function CategoriesPageContent() {
  const { isSidebarOpen, toggleSidebar } = useSidebar();

  // Move PINCODE_OPTIONS up to be accessible by hydration effect
  const PINCODE_OPTIONS = useMemo(() => [
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
  ], []);

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

  const [category, setCategory] = useState(searchParams.get('category') || CATEGORY_OPTIONS[0]?.value || 'Fruits & Vegetables');
  const [pincode, setPincode] = useState(searchParams.get('pincode') || '201303');
  const [isPreferencesLoaded, setIsPreferencesLoaded] = useState(() => {
    // If URL params are present, we don't need to wait for local storage
    return !!searchParams.get('category');
  });

  // Load saved preferences on mount
  useEffect(() => {
    const savedCategory = localStorage.getItem('selectedCategory');
    const savedPincode = localStorage.getItem('selectedPincode');

    // Only load from local storage if URL param is NOT present
    if (!searchParams.get('category') && savedCategory && CATEGORY_OPTIONS.some(opt => opt.value === savedCategory)) {
      setCategory(savedCategory);
    }
    if (!searchParams.get('pincode') && savedPincode && PINCODE_OPTIONS.some(opt => opt.value === savedPincode)) {
      setPincode(savedPincode);
    }
    setIsPreferencesLoaded(true);
  }, [CATEGORY_OPTIONS, PINCODE_OPTIONS, searchParams]); // Dependencies to ensure validation against options

  // Save preferences on change
  useEffect(() => {
    localStorage.setItem('selectedCategory', category);
  }, [category]);

  useEffect(() => {
    localStorage.setItem('selectedPincode', pincode);
  }, [pincode]);

  // Global Toast State
  const [toastState, setToastState] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToastState(prev => ({ ...prev, open: false }));
  };

  const showToast = (message, severity = 'success') => {
    setToastState({
      open: true,
      message,
      severity
    });
  };

  const [platformFilter, setPlatformFilter] = useState('all');
  const [showMissing, setShowMissing] = useState(false);
  const [useFilterToggle, setUseFilterToggle] = useState(true);
  const [showNewFirst, setShowNewFirst] = useState(false);
  const [showNonHyphenOnly, setShowNonHyphenOnly] = useState(false);
  const [showDangerOnly, setShowDangerOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [bulkBrands, setBulkBrands] = useState([]);
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
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [baseSortConfig, setBaseSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const ITEMS_PER_PAGE = 50;
  const lastActivePageRef = useRef(1);
  const abortControllerRef = useRef(null);



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

    const platforms = ['jiomart', 'zepto', 'blinkit', 'dmart', 'flipkartMinutes', 'instamart'];
    const query = searchQuery.toLowerCase().trim();
    const tokens = query.split(/\s+/).filter(t => t.length > 0);
    
    // Detect search intent
    // Alphabetic: Only letters, spaces, and common name symbols (no digits)
    const isAlphabetic = /^[a-z\s\(\)\[\]\.,\&]+$/i.test(query);
    // ID-like: Only digits, underscores, hyphens (no letters)
    const isNumericOrId = /^[0-9\-_]+$/.test(query);

    return products.filter(p => {
      // 1. Name Match (by tokens)
      const nameLower = (p.name || '').toLowerCase();
      const nameMatch = tokens.every(token => nameLower.includes(token));

      // 2. ID Match (by strict query)
      const gId = (p.groupingId || '').toLowerCase();
      const pgId = (p.parentGroupId || '').toLowerCase();
      const idMatch = gId.includes(query) || pgId.includes(query) || platforms.some(plat => {
        const pid = (p[plat]?.productId || '').toLowerCase();
        return pid && pid.includes(query);
      });

      // Apply filtering logic based on intent
      if (isAlphabetic && !isNumericOrId) return nameMatch;
      if (isNumericOrId && !isAlphabetic) return idMatch;
      
      // Mixed or fallback: Match either
      return nameMatch || idMatch;
    });
  }, [products, searchQuery]);

  // Apply deduplication filter (Hide Similar — by base productId, same logic as ProductDetailsDialog)
  const deduplicatedProducts = useMemo(() => {
    let result = searchedProducts;

    if (useFilterToggle) {
      const platforms = ['zepto', 'blinkit', 'jiomart', 'dmart', 'instamart', 'flipkartMinutes'];

      // Strip __category-suffix and trailing -a/b to get the canonical base ID
      const getBaseId = (productId) =>
        productId.split('__')[0].replace(/-[a-z]$/i, '');

      const n = result.length;

      // Union-Find to cluster products sharing the same (platform, baseId)
      const parent = Array.from({ length: n }, (_, i) => i);
      const find = (i) => {
        while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
        return i;
      };
      const union = (i, j) => {
        const pi = find(i), pj = find(j);
        if (pi !== pj) parent[pi] = pj;
      };

      // Map "platform:baseId" -> first index seen; union when same base ID found
      const baseIdMap = {};
      result.forEach((p, i) => {
        // DEBUG: log productIds for products whose name includes 'amla'
        if ((p.name || '').toLowerCase().includes('amla')) {
          const ids = {};
          platforms.forEach(plat => { if (p[plat]?.productId) ids[plat] = { raw: p[plat].productId, base: getBaseId(p[plat].productId) }; });
          console.log('[HideSimilar DEBUG]', p.name, ids);
        }
        platforms.forEach(plat => {
          const pid = p[plat]?.productId;
          if (pid) {
            const key = `${plat}:${getBaseId(pid)}`;
            if (baseIdMap[key] !== undefined) {
              union(i, baseIdMap[key]);
            } else {
              baseIdMap[key] = i;
            }
          }
        });
      });

      // Group by Union-Find root
      const groups = {};
      result.forEach((p, i) => {
        const root = find(i);
        if (!groups[root]) groups[root] = [];
        groups[root].push(p);
      });

      const getPlatformCount = (p) => platforms.filter(plat => p[plat]).length;
      const getMinRank = (p) => {
        let min = Infinity;
        platforms.forEach(key => {
          if (p[key]?.ranking !== undefined && p[key]?.ranking !== null) {
            const num = Number(p[key].ranking);
            if (!isNaN(num) && num < min) min = num;
          }
        });
        return min;
      };

      const deduplicatedResult = [];
      Object.values(groups).forEach(group => {
        if (group.length === 1) {
          deduplicatedResult.push(group[0]);
          return;
        }

        // Pick the BEST row from the cluster
        // Criteria: 1. Most platforms, 2. Lowest rank
        let bestRow = group[0];
        let maxPlatforms = getPlatformCount(group[0]);
        let minRank = getMinRank(group[0]);

        for (let i = 1; i < group.length; i++) {
          const row = group[i];
          const platforms = getPlatformCount(row);
          const rank = getMinRank(row);

          if (platforms > maxPlatforms) {
            maxPlatforms = platforms;
            minRank = rank;
            bestRow = row;
          } else if (platforms === maxPlatforms && rank < minRank) {
            minRank = rank;
            bestRow = row;
          }
        }
        
        deduplicatedResult.push(bestRow);
      });

      result = deduplicatedResult;
    }

    return result;
  }, [searchedProducts, useFilterToggle]);

  // Calculate platform counts from deduplicated products
  const platformCounts = useMemo(() => {
    const counts = {
      all: deduplicatedProducts.length,
      jiomart: 0,
      zepto: 0,
      blinkit: 0,
      dmart: 0,
      flipkartMinutes: 0,
      instamart: 0
    };

    const platforms = ['jiomart', 'zepto', 'blinkit', 'dmart', 'flipkartMinutes', 'instamart'];

    deduplicatedProducts.forEach(product => {
      // Check if product exists on ANY platform (to filter out complete ghosts, though unlikely)
      const existsSomewhere = platforms.some(p => product[p]);

      if (!existsSomewhere) return;

      if (showMissing) {
        // Count MISSING: If product is NOT on platform P (but exists somewhere else)
        if (!product.jiomart) counts.jiomart++;
        if (!product.zepto) counts.zepto++;
        if (!product.blinkit) counts.blinkit++;
        if (!product.dmart) counts.dmart++;
        if (!product.flipkartMinutes) counts.flipkartMinutes++;
        if (!product.instamart) counts.instamart++;
      } else {
        // Count PRESENT: If product IS on platform P
        if (product.jiomart) counts.jiomart++;
        if (product.zepto) counts.zepto++;
        if (product.blinkit) counts.blinkit++;
        if (product.dmart) counts.dmart++;
        if (product.flipkartMinutes) counts.flipkartMinutes++;
        if (product.instamart) counts.instamart++;
      }
    });

    return counts;
  }, [deduplicatedProducts, showMissing]);

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
    // Abort previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Create new AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setProducts([]);
    setError(null);
    setCurrentPage(1);

    try {
      const timeToFetch = customTimestamp !== null ? customTimestamp : (snapshotTime || null);
      // Join pincodes with comma
      const pincodeParam = pincode;
      let url = `/api/category-data?category=${encodeURIComponent(category)}&pincode=${encodeURIComponent(pincodeParam)}`;

      if (timeToFetch) {
        url += `&timestamp=${encodeURIComponent(timeToFetch)}`;
      }

      const response = await fetch(url, {
        cache: 'no-store',
        signal: controller.signal
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to fetch category data');

      setProducts(data.products || []);

      if (!timeToFetch) {
        setLastUpdated(data.lastUpdated);
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Fetch aborted');
        return; // Early return to avoid setting loading state
      }
      setError(err.message);
      setProducts([]);
    } finally {
      // Only set loading to false if this was the latest request
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  };

  const handleLocalProductUpdate = (updatedData) => {
    // updatedData = { groupingId, name?, weight?, brand?, brandId?, modifiedPlatforms?: [...] }
    setProducts((prev) => prev.map(p => {
      // If the row matches the updated group (either as the main row or its duplicate)
      if (p.groupingId === updatedData.groupingId || p.parentGroupId === updatedData.groupingId) {
        // Only merge fields that are actually present in updatedData (not undefined)
        const updates = {};
        if (updatedData.name !== undefined) updates.name = updatedData.name;
        if (updatedData.weight !== undefined) updates.weight = updatedData.weight;
        if (updatedData.brand !== undefined) updates.brand = updatedData.brand;
        if (updatedData.brandId !== undefined) updates.brandId = updatedData.brandId;
        const newProduct = { ...p, ...updates };
        if (updatedData.modifiedPlatforms) {
          updatedData.modifiedPlatforms.forEach(mp => {
            if (newProduct[mp.platform]) {
              newProduct[mp.platform] = { ...newProduct[mp.platform], ...mp };
            }
          });
        }
        return newProduct;
      }
      return p;
    }));
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
          pincode: pincode,
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
    const controller = new AbortController();

    const fetchSnapshots = async () => {
      if (!isPreferencesLoaded) return;

      // Clear previous data while loading new config
      setLoading(true);
      setProducts([]);
      setError(null);

      try {
        const pincodeParam = pincode;
        const res = await fetch(`/api/available-snapshots?category=${encodeURIComponent(category)}&pincode=${encodeURIComponent(pincodeParam)}`, {
          signal: controller.signal
        });
        const data = await res.json();

        if (data.snapshots && data.snapshots.length > 0) {
          setAvailableSnapshots(data.snapshots);

          if (isLiveMode) {
            const latestTS = data.snapshots[0];
            const dateObj = new Date(latestTS);
            setSnapshotDate(dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
            setSnapshotTime(latestTS);
            fetchCategoryData(latestTS);
          } else {
            const snapshotsForSameDate = data.snapshots.filter(ts =>
              new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) === snapshotDate
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
              setSnapshotDate(dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
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
        if (err.name === 'AbortError') {
          console.log('Snapshot fetch aborted');
          return;
        }
        console.error("Error fetching snapshots:", err);
        setAvailableSnapshots([]);
        setLoading(false);
      }
    };

    fetchSnapshots();

    return () => {
      controller.abort();
    };
  }, [category, pincode, isLiveMode, isPreferencesLoaded]);

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
          pincode: pincode,
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
      const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      setSnapshotDate(dateStr);
      setSnapshotTime(lastUpdated);
    }
  }, [lastUpdated]);

  // Keyboard shortcut for reload (Alt+R on Windows / Option+R on Mac)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Use e.code (physical key) instead of e.key (character) so it works on
      // Mac where Option+R produces '®' instead of 'r'
      if (e.altKey && e.code === 'KeyR') {
        e.preventDefault();
        document.getElementById('reload-button')?.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const uniqueDates = useMemo(() => {
    const dates = availableSnapshots.map(ts => {
      const d = new Date(ts);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    });
    return [...new Set(dates)];
  }, [availableSnapshots]);



  const filteredProducts = useMemo(() => {
    let result = deduplicatedProducts;

    // Platform Filter
    if (platformFilter !== 'all') {
      if (showMissing) {
        result = result.filter(product => {
          const missingInSelected = !product[platformFilter];
          const presentInOthers = ['jiomart', 'zepto', 'blinkit', 'dmart', 'flipkartMinutes', 'instamart']
            .filter(p => p !== platformFilter)
            .some(p => product[p]);
          return missingInSelected && presentInOthers;
        });
      } else {
        result = result.filter(product => product[platformFilter]);
      }
    }

    // Non-Hyphen Filter (Strict) - Regex catches standard and unicode hyphens/dashes
    if (showNonHyphenOnly) {
      const hyphenRegex = /[-\u2010-\u2015\u2212]/;
      result = result.filter(product => {
        const name = product.name || '';
        return !hyphenRegex.test(name);
      });
    }

    // Danger Filter (Show only items with platform conflicts)
    if (showDangerOnly) {
      result = result.filter(product => product.isHeader || product.hasGroupConflict === true);
      
      // Prune empty headers (headers that have no danger products following them)
      const pruned = [];
      for (let i = 0; i < result.length; i++) {
        if (result[i].isHeader) {
          // Check if there's at least one non-header product before the next header or end of list
          let hasContent = false;
          for (let j = i + 1; j < result.length; j++) {
            if (result[j].isHeader) break;
            hasContent = true;
            break;
          }
          if (hasContent) pruned.push(result[i]);
        } else {
          pruned.push(result[i]);
        }
      }
      result = pruned;
    }

    return result;
  }, [deduplicatedProducts, platformFilter, showMissing, showNonHyphenOnly, showDangerOnly]);

  const sortedProducts = useMemo(() => {
    // If no grouping (no headers), just filter and sort normally
    if (!filteredProducts.some(p => p.isHeader)) {
      // ... (Existing logic for single group) ...
      let sortableProducts = [...filteredProducts];

      // Helper to intelligently resolve subcategory
      const resolveSubCategory = (item) => {
        if (item.officialSubCategory && item.officialSubCategory !== 'General') return item.officialSubCategory;
        const platforms = ['zepto', 'blinkit', 'instamart', 'flipkartMinutes', 'jiomart', 'dmart'];
        for (const p of platforms) {
          if (item[p]) {
            const sub = item[p].subcategory || item[p].officialSubCategory;
            if (sub && sub !== 'General') return sub;
          }
        }
        return item.officialSubCategory || item.subCategory || 'Other';
      };

      const hasNewFlag = (product) => {
        if (platformFilter !== 'all') {
          return product[platformFilter]?.new === true;
        }
        const platforms = ['zepto', 'blinkit', 'jiomart', 'dmart', 'instamart', 'flipkartMinutes'];
        return platforms.some(p => product[p]?.new === true);
      };


      // ... inside useMemo for sortedProducts ...
      const sortFunction = (a, b) => {
        if (showNonHyphenOnly || showNewFirst) {
          const aIsNew = hasNewFlag(a);
          const bIsNew = hasNewFlag(b);
          if (aIsNew && !bIsNew) return -1;
          if (!aIsNew && bIsNew) return 1;
        }

        if (sortConfig.key === 'groupCount') {
          const platforms = ['zepto', 'blinkit', 'jiomart', 'dmart', 'instamart', 'flipkartMinutes'];
          const countA = platforms.filter(p => a[p]).length;
          const countB = platforms.filter(p => b[p]).length;
          if (countA !== countB) return sortConfig.direction === 'asc' ? countA - countB : countB - countA;
          const nameA = a.name || '';
          const nameB = b.name || '';
          return nameA.localeCompare(nameB);
        }

        if (sortConfig.key === 'brand') {
          const brandA = (a.brand || '').trim();
          const brandB = (b.brand || '').trim();

          if (!brandA && !brandB) {
            const nameA = a.name || '';
            const nameB = b.name || '';
            return nameA.localeCompare(nameB);
          }
          if (!brandA) return 1;
          if (!brandB) return -1;

          if (brandA.toLowerCase() !== brandB.toLowerCase()) {
            return sortConfig.direction === 'asc'
              ? brandA.localeCompare(brandB)
              : brandB.localeCompare(brandA);
          }
          const nameA = a.name || '';
          const nameB = b.name || '';
          return nameA.localeCompare(nameB);
        }

        if (sortConfig.key === 'name') {
          if (platformFilter !== 'all' || showNewFirst) {
            const aIsNew = hasNewFlag(a);
            const bIsNew = hasNewFlag(b);
            if (aIsNew && !bIsNew) return -1;
            if (!aIsNew && bIsNew) return 1;
          }
          const nameA = a.name || '';
          const nameB = b.name || '';
          if (sortConfig.direction === 'asc') return nameA.localeCompare(nameB);
          return nameB.localeCompare(nameA);
        }
        if (sortConfig.key !== null) {
          const platformKey = sortConfig.key;
          // ... existing sort by platform logic ...
          const itemA = a[platformKey];
          const itemB = b[platformKey];
          if (!itemA && !itemB) return 0;
          if (!itemA) return 1;
          if (!itemB) return -1;
          if (showNewFirst) {
            const aIsNew = hasNewFlag(a);
            const bIsNew = hasNewFlag(b);
            if (aIsNew && !bIsNew) return -1;
            if (!aIsNew && bIsNew) return 1;
          }
          // Prioritize Rank Sort first!
          const getRank = (item) => {
            if (item && item.ranking !== undefined && item.ranking !== null) {
              const num = Number(item.ranking);
              return isNaN(num) ? Infinity : num;
            }
            return Infinity;
          };
          const rankA = getRank(itemA);
          const rankB = getRank(itemB);
          if (rankA < rankB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (rankA > rankB) return sortConfig.direction === 'asc' ? 1 : -1;

          // If ranks are equal, maintain stable order (return 0)
          return 0;
        } else {
          if (showNewFirst) {
            const aIsNew = hasNewFlag(a);
            const bIsNew = hasNewFlag(b);
            if (aIsNew && !bIsNew) return -1;
            if (!aIsNew && bIsNew) return 1;

            const nameA = a.name || '';
            const nameB = b.name || '';
            if (nameA !== nameB) return nameA.localeCompare(nameB);
            return 0;
          }
          const platforms = ['zepto', 'blinkit', 'jiomart', 'dmart', 'instamart', 'flipkartMinutes'];
          const countA = platforms.filter(p => a[p]).length;
          const countB = platforms.filter(p => b[p]).length;
          if (countA !== countB) return countB - countA;

          // Sort by Name alphabetically if counts are equal
          const nameA = a.name || '';
          const nameB = b.name || '';
          if (nameA !== nameB) return nameA.localeCompare(nameB);

          const catA = a.officialCategory || '';
          const catB = b.officialCategory || '';
          if (catA !== catB) return catA.localeCompare(catB);
          const subA = resolveSubCategory(a);
          const subB = resolveSubCategory(b);
          if (subA !== subB) return subA.localeCompare(subB);
          const getMinRank = (p) => {
            let min = Infinity;
            platforms.forEach(key => {
              const item = p[key];
              if (item && item.ranking !== undefined && item.ranking !== null) {
                const num = Number(item.ranking);
                if (!isNaN(num)) {
                  if (num < min) min = num;
                }
              }
            });
            return min;
          };
          return getMinRank(a) - getMinRank(b);
        }
      };

      return sortableProducts.sort(sortFunction);
    }

    // --- MULTI-PINCODE GROUPING LOGIC ---
    // Split into groups based on Headers
    const groups = [];
    let currentGroup = null;

    filteredProducts.forEach(item => {
      if (item.isHeader) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { header: item, items: [] };
      } else {
        if (currentGroup) {
          currentGroup.items.push(item);
        } else {
          // Should not happen if data is well-formed (header first), but handle strays
          // If there's a stray item before any header? Treat as a "Misc" group or just ignore?
          // Or create a dummy group? Let's safeguard.
          if (groups.length === 0) {
            // Maybe these are items belonging to previous selection? Just put them in a temp group
            currentGroup = { header: { isHeader: true, title: "Uncategorized Region", pincode: "Unknown" }, items: [item] };
          } else {
            // This is weird, but append to last group?
            // Actually better:
          }
        }
      }
    });
    if (currentGroup) groups.push(currentGroup);

    // Reuse the exact same sorting logic
    const resolveSubCategory = (item) => {
      if (item.officialSubCategory && item.officialSubCategory !== 'General') return item.officialSubCategory;
      const platforms = ['zepto', 'blinkit', 'instamart', 'flipkartMinutes', 'jiomart', 'dmart'];
      for (const p of platforms) {
        if (item[p]) {
          const sub = item[p].subcategory || item[p].officialSubCategory;
          if (sub && sub !== 'General') return sub;
        }
      }
      return item.officialSubCategory || item.subCategory || 'Other';
    };

    const hasNewFlag = (product) => {
      if (platformFilter !== 'all') {
        return product[platformFilter]?.new === true;
      }
      const platforms = ['zepto', 'blinkit', 'jiomart', 'dmart', 'instamart', 'flipkartMinutes'];
      return platforms.some(p => product[p]?.new === true);
    };

    // ... inside useMemo ...

    const getAveragePrice = (product) => {
      const platforms = ['zepto', 'blinkit', 'jiomart', 'dmart', 'instamart', 'flipkartMinutes'];
      let total = 0;
      let count = 0;
      platforms.forEach(p => {
        const item = product[p];
        if (item) {
          // Pure Frontend Calculation: Use currentPrice
          // Ensure we parse standard price format safely
          const priceVal = item.currentPrice;
          if (priceVal !== undefined && priceVal !== null) {
            const num = Number(priceVal);
            // Filter out invalid numbers or 0 if 0 is considered invalid price
            if (!isNaN(num) && num > 0) {
              total += num;
              count++;
            }
          }
        }
      });

      // Return Infinity for unserviceable to sort to bottom
      return count > 0 ? total / count : Infinity;
    };

    const sortFunction = (a, b) => {
      if (sortConfig.key === 'name') {
        // ... (existing name sort)
      }

      // Handle Price Sorting (Low to High / High to Low)
      // Let's stick to a clean implementation. I will use 'averagePrice' as key.
      if (sortConfig.key === 'averagePrice') {
        const priceA = getAveragePrice(a);
        const priceB = getAveragePrice(b);

        // Always push Infinity (Unserviceable) to the bottom
        if (priceA === Infinity && priceB === Infinity) return 0;
        if (priceA === Infinity) return 1;
        if (priceB === Infinity) return -1;

        if (sortConfig.direction === 'asc') return priceA - priceB;
        return priceB - priceA;
      }

      if (sortConfig.key === 'groupCount') {
        const platforms = ['zepto', 'blinkit', 'jiomart', 'dmart', 'instamart', 'flipkartMinutes'];
        const countA = platforms.filter(p => a[p]).length;
        const countB = platforms.filter(p => b[p]).length;
        if (countA !== countB) return sortConfig.direction === 'asc' ? countA - countB : countB - countA;
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB);
      }

      if (sortConfig.key === 'brand') {
        const brandA = (a.brand || '').trim();
        const brandB = (b.brand || '').trim();

        if (!brandA && !brandB) {
          const nameA = a.name || '';
          const nameB = b.name || '';
          return nameA.localeCompare(nameB);
        }
        if (!brandA) return 1;
        if (!brandB) return -1;

        if (brandA.toLowerCase() !== brandB.toLowerCase()) {
          return sortConfig.direction === 'asc'
            ? brandA.localeCompare(brandB)
            : brandB.localeCompare(brandA);
        }
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB);
      }

      if (sortConfig.key === 'name') {
        if (platformFilter !== 'all' || showNewFirst) {
          const aIsNew = hasNewFlag(a);
          const bIsNew = hasNewFlag(b);
          if (aIsNew && !bIsNew) return -1;
          if (!aIsNew && bIsNew) return 1;
        }

        const nameA = a.name || '';
        const nameB = b.name || '';
        if (sortConfig.direction === 'asc') return nameA.localeCompare(nameB);
        return nameB.localeCompare(nameA);
      }
      // ... existing code ...
      if (sortConfig.key === 'averagePrice') {
        const priceA = getAveragePrice(a);
        const priceB = getAveragePrice(b);
        if (sortConfig.direction === 'asc') return priceA - priceB;
        return priceB - priceA;
      }

      if (sortConfig.key !== null) {
        const platformKey = sortConfig.key;
        const itemA = a[platformKey];
        const itemB = b[platformKey];
        if (!itemA && !itemB) return 0;
        if (!itemA) return 1;
        if (!itemB) return -1;

        if (showNewFirst) {
          const aIsNew = hasNewFlag(a);
          const bIsNew = hasNewFlag(b);
          if (aIsNew && !bIsNew) return -1;
          if (!aIsNew && bIsNew) return 1;
        }

        // Handle Price Sort Direction
        if (sortConfig.direction === 'price_asc' || sortConfig.direction === 'price_desc') {
          // Use averagePrice if available (from backend), else fallback to currentPrice
          const getPrice = (item) => {
            if (item.averagePrice !== undefined && item.averagePrice !== null) return Number(item.averagePrice);
            if (item.currentPrice !== undefined && item.currentPrice !== null) return Number(item.currentPrice);
            return Infinity;
          };

          const priceA = getPrice(itemA);
          const priceB = getPrice(itemB);

          if (priceA < priceB) return sortConfig.direction === 'price_asc' ? -1 : 1;
          if (priceA > priceB) return sortConfig.direction === 'price_asc' ? 1 : -1;
          return 0;
        }

        // Pure Rank Sort (no category grouping)
        const rankA = itemA.ranking && !isNaN(itemA.ranking) ? Number(itemA.ranking) : Infinity;
        const rankB = itemB.ranking && !isNaN(itemB.ranking) ? Number(itemB.ranking) : Infinity;
        if (rankA < rankB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (rankA > rankB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      } else {
        if (showNewFirst) {
          const aIsNew = hasNewFlag(a);
          const bIsNew = hasNewFlag(b);
          if (aIsNew && !bIsNew) return -1;
          if (!aIsNew && bIsNew) return 1;

          const nameA = a.name || '';
          const nameB = b.name || '';
          if (nameA !== nameB) return nameA.localeCompare(nameB);
          return 0;
        }
        const platforms = ['zepto', 'blinkit', 'jiomart', 'dmart', 'instamart', 'flipkartMinutes'];
        const countA = platforms.filter(p => a[p]).length;
        const countB = platforms.filter(p => b[p]).length;
        if (countA !== countB) return countB - countA;

        // Prioritize New When showNonHyphenOnly is active (for grouped items)
        if (showNonHyphenOnly) {
          const aIsNew = hasNewFlag(a);
          const bIsNew = hasNewFlag(b);
          if (aIsNew && !bIsNew) return -1;
          if (!aIsNew && bIsNew) return 1;
        }

        // Sort by Name alphabetically if counts are equal
        const nameA = a.name || '';
        const nameB = b.name || '';
        if (nameA !== nameB) return nameA.localeCompare(nameB);


        const catA = a.officialCategory || '';
        const catB = b.officialCategory || '';
        if (catA !== catB) return catA.localeCompare(catB);
        const subA = resolveSubCategory(a);
        const subB = resolveSubCategory(b);
        if (subA !== subB) return subA.localeCompare(subB);
        const getMinRank = (p) => {
          let min = Infinity;
          platforms.forEach(key => {
            if (p[key] && p[key].ranking && !isNaN(p[key].ranking)) {
              if (p[key].ranking < min) min = p[key].ranking;
            }
          });
          return min;
        };
        return getMinRank(a) - getMinRank(b);
      }
    };

    let flatList = [];
    groups.forEach(group => {
      flatList.push(group.header);
      const sortedItems = [...group.items].sort(sortFunction);
      flatList = flatList.concat(sortedItems);
    });

    return flatList;

  }, [filteredProducts, sortConfig, showNewFirst, showNonHyphenOnly]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedProducts, currentPage]);


  const requestSort = React.useCallback((key, direction = null) => {
    const isPlatformSort = ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'].includes(key);

    if (!isPlatformSort) {
      // This is a menu sort
      const newConfig = { key, direction };
      setBaseSortConfig(newConfig);
      setSortConfig(newConfig);
      return;
    }

    setSortConfig(currentConfig => {
      if (direction) return { key, direction };
      let newDirection = 'asc';
      if (currentConfig.key === key) {
        // Cycle: asc (Rank) -> desc (Rank) -> Reset
        if (currentConfig.direction === 'asc') newDirection = 'desc';
        else if (currentConfig.direction === 'desc') return baseSortConfig;
      }
      return { key, direction: newDirection };
    });
  }, [baseSortConfig]);

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

  // Calculate Link Counts
  const linkPlatformCounts = useMemo(() => {
    if (!categoriesData) return {};
    const counts = {
      all: 0,
      jiomart: 0,
      zepto: 0,
      blinkit: 0,
      dmart: 0,
      flipkartMinutes: 0,
      instamart: 0
    };

    Object.entries(categoriesData).forEach(([platform, items]) => {
      const pKey = platform.toLowerCase();
      let stateKey = pKey;
      if (pKey === 'flipkart') stateKey = 'flipkartMinutes';

      const relevantItems = items.filter(item => {
        if (category && item.masterCategory !== category) return false;
        return true;
      });

      if (counts[stateKey] !== undefined) {
        counts[stateKey] += relevantItems.length;
        counts.all += relevantItems.length;
      }
    });
    return counts;
  }, [category]); // Recalculate when category changes

  // Calculate Brand Counts
  const brandPlatformCounts = useMemo(() => {
    const counts = {
      all: 0,
      jiomart: 0,
      zepto: 0,
      blinkit: 0,
      dmart: 0,
      flipkartMinutes: 0,
      instamart: 0
    };
    const platforms = ['jiomart', 'zepto', 'blinkit', 'dmart', 'flipkartMinutes', 'instamart'];
    const brandMap = {};

    products.forEach(p => {
      const brandName = p.brand && p.brand.trim() !== '' ? p.brand : 'Other';
      if (!brandMap[brandName]) {
        brandMap[brandName] = {
          jiomart: false,
          zepto: false,
          blinkit: false,
          dmart: false,
          flipkartMinutes: false,
          instamart: false
        };
      }
      platforms.forEach(plat => {
        if (p[plat]) brandMap[brandName][plat] = true;
      });
    });

    Object.values(brandMap).forEach(b => {
      counts.all++;
      platforms.forEach(plat => {
        if (b[plat]) counts[plat]++;
      });
    });

    return counts;
  }, [products]);

  // Determine which counts to show
  const currentCounts = activeTab === 'links'
    ? linkPlatformCounts
    : activeTab === 'brands'
      ? brandPlatformCounts
      : platformCounts;

  const renderPagination = () => {
    if (activeTab !== 'products' || sortedProducts.length === 0) return null;
    return (
      <div className="flex-none flex items-center justify-between bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
        <span className="text-sm text-gray-600 font-medium">
          Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, sortedProducts.length)} - {Math.min(currentPage * ITEMS_PER_PAGE, sortedProducts.length)} of {sortedProducts.length} products
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(c => c - 1)}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowRight size={18} className="rotate-180" />
          </button>
          <div className="flex items-center gap-1.5 text-sm font-semibold relative">
            <span>Page</span>
            <div className="relative flex items-center">
              <select
                value={currentPage}
                onChange={(e) => setCurrentPage(Number(e.target.value))}
                className="bg-transparent appearance-none rounded pl-2 pr-6 py-1 min-w-[50px] text-center focus:outline-none focus:ring-1 focus:ring-neutral-300 cursor-pointer hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
              >
                {Array.from({ length: Math.ceil(sortedProducts.length / ITEMS_PER_PAGE) || 1 }, (_, i) => i + 1).map(pageNum => (
                  <option key={pageNum} value={pageNum}>{pageNum}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-1.5 pointer-events-none text-gray-500" />
            </div>
            <span>/ {Math.ceil(sortedProducts.length / ITEMS_PER_PAGE) || 1}</span>
          </div>
          <button
            disabled={currentPage >= Math.ceil(sortedProducts.length / ITEMS_PER_PAGE)}
            onClick={() => setCurrentPage(c => c + 1)}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-neutral-900">

      {/* Header */}
      <div className="flex-none bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm z-20 min-h-[64px]">
        <div className="flex items-center gap-4">
          {!isSidebarOpen && (
            <button 
              onClick={toggleSidebar}
              className="p-2 -ml-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors animate-in fade-in"
            >
              <SidebarOpenIcon size={24} />
            </button>
          )}
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Category Tracker</h1>

          <div className="flex items-center gap-2 text-sm bg-gray-100 rounded-lg px-2 py-1">
            <span className={`w-2 h-2 rounded-full ${isLiveMode ? 'bg-neutral-900 animate-pulse' : 'bg-neutral-400'}`}></span>
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
      <div className="flex-1 flex flex-col w-full max-w-[1920px] mx-auto p-3 md:p-4 gap-3">

        {/* Controls */}
        <div className="flex-none flex flex-col gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">

          {/* Top Row: Selectors and Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Selectors */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              <div className="w-full sm:w-64 relative z-[100]">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
                <CustomDropdown
                  value={category}
                  onChange={(val) => {
                    setCategory(val);
                    setSortConfig({ key: 'name', direction: 'asc' });
                    setSearchQuery('');
                  }}
                  options={CATEGORY_OPTIONS}
                />
              </div>
              <div className="w-full sm:w-64 relative z-[90]">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Region</label>
                <CustomDropdown
                  value={pincode}
                  onChange={(val) => {
                    setPincode(val);
                    setSortConfig({ key: 'name', direction: 'asc' });
                  }}
                  options={PINCODE_OPTIONS}
                />
              </div>

              {/* Snapshot Selectors */}
              <div className="w-full sm:w-40 relative z-[80] mr-0 sm:mr-4">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Date</label>
                <CustomDropdown
                  value={snapshotDate}
                  onChange={(newDate) => {
                    setSnapshotDate(newDate);
                    setSortConfig({ key: 'name', direction: 'asc' });
                    
                    // If it's the latest date, we consider it live mode
                    const isLatestDate = newDate === uniqueDates[0];
                    setIsLiveMode(isLatestDate);

                    // Auto-select the latest time for this date
                    const timesForDate = availableSnapshots.filter(ts => {
                      const d = new Date(ts);
                      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) === newDate;
                    });

                    if (timesForDate.length > 0) {
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
            </div>

            {/* Right: Actions */}
            <div className="flex items-center justify-end gap-3 self-end lg:self-auto">
              {isAdmin && (
                <button
                  id="reload-button"
                  onClick={() => fetchCategoryData()}
                  className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all cursor-pointer"
                  title="Refresh Data (Alt + R)"
                >
                  <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                </button>
              )}



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
          <div className="w-full border-t border-gray-100 pt-2 flex items-end justify-between gap-3">
            <div className="flex-1 overflow-hidden">
              <label className="text-xs font-semibold text-gray-500 mb-2 block">
                Platform Filter <span className="text-neutral-400 font-normal ml-1">({loading ? <Loader2 size={10} className="animate-spin inline-block" /> : currentCounts[platformFilter] || 0})</span>
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
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1",
                      platformFilter === opt.value
                        ? "bg-neutral-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {opt.label} <span className="text-xs opacity-80">
                      {loading ? (
                        <Loader2 size={10} className="animate-spin inline-block" />
                      ) : (
                        `(${currentCounts[opt.value] || 0})`
                      )}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:gap-5 justify-end">
              <div className="flex items-center gap-2 px-2 py-1 mb-0.5">
                <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  Hide Similar
                  <MuiTooltip title="Groups duplicate products across platforms. This feature hides the same product which is present in other subcategories." arrow placement="top">
                    <Info size={14} className="text-gray-400 hover:text-gray-600 transition-colors cursor-help outline-none" />
                  </MuiTooltip>
                </span>
                <Switch
                  checked={useFilterToggle}
                  onCheckedChange={setUseFilterToggle}
                />
              </div>

              <div className={cn(
                "flex items-center gap-3 px-2 py-1 mb-0.5 transition-opacity duration-200",
                platformFilter === 'all' ? "opacity-50 blur-[0.5px] pointer-events-none grayscale" : ""
              )}>
                <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  Show Missing
                  <MuiTooltip title="Shows products that are missing from the selected platform but available on others." arrow placement="top">
                    <Info size={14} className="text-gray-400 hover:text-gray-600 transition-colors cursor-help outline-none" />
                  </MuiTooltip>
                </span>
                <Switch
                  checked={showMissing}
                  onCheckedChange={setShowMissing}
                  disabled={platformFilter === 'all'}
                />
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2 px-2 py-1 mb-0.5">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-rose-600">
                    Filter by Danger
                    <MuiTooltip title="Shows only products with platform Base ID conflicts (⚠️ items)." arrow placement="top">
                      <img 
                        src="https://img.icons8.com/?size=100&id=4009&format=png&color=FA5252" 
                        alt="Conflict" 
                        className="w-4 h-4 cursor-help"
                      />
                    </MuiTooltip>
                  </span>
                  <Switch
                    checked={showDangerOnly}
                    onCheckedChange={setShowDangerOnly}
                  />
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex-none flex items-center gap-3">
          <div className="inline-flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
            {['products', 'analytics', 'stock', 'links', 'brands'].map((tab) => (
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
          {isAdmin && activeTab === 'products' && (
            <button
              onClick={async () => {
                if (!isBulkEditMode && bulkBrands.length === 0) {
                  // Fetch brands when entering bulk edit mode
                  try {
                    const res = await fetch('/api/brands');
                    if (res.ok) {
                      const data = await res.json();
                      setBulkBrands(Array.isArray(data) ? data : (data.brands || []));
                    }
                  } catch (e) { console.error('Failed to fetch brands', e); }
                }
                setIsBulkEditMode(prev => !prev);
                setSelectedGroupIds([]);
              }}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer border",
                isBulkEditMode
                  ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                  : "bg-white text-neutral-700 border-gray-200 shadow-sm hover:bg-gray-50"
              )}
            >
              {isBulkEditMode ? 'Cancel Bulk Edit' : 'Edit Bulk'}
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col gap-4">
          {activeTab === 'products' && isAdmin && renderPagination()}

          {activeTab === 'products' && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1">
              <ProductTable
                products={paginatedProducts}
                allFilteredProducts={sortedProducts}
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
                platformFilter={platformFilter}
                pincode={pincode}
                onRefresh={fetchCategoryData}
                showNewFirst={showNewFirst}
                onShowNewFirstChange={setShowNewFirst}
                showNonHyphenOnly={showNonHyphenOnly}
                onShowNonHyphenOnlyChange={setShowNonHyphenOnly}
                isAdmin={isAdmin}
                onLocalUpdate={handleLocalProductUpdate}
                isBulkEditMode={isBulkEditMode}
                selectedGroupIds={selectedGroupIds}
                onSelectionChange={setSelectedGroupIds}
                bulkBrands={bulkBrands}
              />
            </div>
          )}


          {/* Links Tab */}
          {activeTab === 'links' && (
            <LinksTab
              data={categoriesData}
              selectedCategory={category}
              platformFilter={platformFilter}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab
              products={products}
              category={category}
              pincode={pincode}
              loading={loading}
            />
          )}

          {activeTab === 'stock' && (
            <StockAnalysisTab
              category={category}
              pincode={pincode}
              platform={platformFilter}
            />
          )}

          {activeTab === 'brands' && (
            <BrandTab
              products={products}
              loading={loading}
              platformFilter={platformFilter}
              pincode={pincode}
              snapshotDate={snapshotDate}
              isAdmin={isAdmin}
            />
          )}
        </div>

        {/* Footer/Pagination */}
        {/* Footer/Pagination */}
        {renderPagination()}

      </div>



      <ProductDetailsDialog
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedProduct(null);
        }}
        category={category}
        pincode={pincode}
        platformFilter={platformFilter}
        historyData={historyData}
        historyLoading={historyLoading}
        stockData={stockData}
        selectedProduct={selectedProduct}
        products={products}
        isAdmin={isAdmin}
        onRefresh={fetchCategoryData}
        onLocalUpdate={handleLocalProductUpdate}
        showToast={showToast}
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
        latestSnapshotTime={snapshotTime}
      />

      {/* Global Snackbar */}
      <Snackbar
        open={toastState.open}
        autoHideDuration={4000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ zIndex: 9999 }} // Ensure it appears above dialogs
      >
        <Alert onClose={handleCloseToast} severity={toastState.severity} sx={{ width: '100%' }}>
          {toastState.message}
        </Alert>
      </Snackbar>

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
