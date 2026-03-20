"use client"
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useSidebar } from '@/components/SidebarContext';
import { SidebarOpenIcon, SidebarCloseIcon } from '@/components/SidebarIcons';
import { cn } from '@/lib/utils';

import categoriesData from '../utils/categories_with_urls.json';

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

const PLATFORMS = [
    { id: 'jiomart', label: 'JioMart', short: 'JioMart' },
    { id: 'zepto', label: 'Zepto', short: 'Zepto' },
    { id: 'blinkit', label: 'Blinkit', short: 'Blinkit' },
    { id: 'dmart', label: 'DMart', short: 'DMart' },
    { id: 'flipkartMinutes', label: 'Flipkart Minutes', short: 'FK Min.' },
    { id: 'instamart', label: 'Swiggy Instamart', short: 'Instamart' },
];

// Based on user provided data:
const PINCODE_AVAILABILITY = {
    zepto: PINCODE_OPTIONS.map(p => p.value).filter(val => !['401101', '401202'].includes(val)),
    jiomart: PINCODE_OPTIONS.map(p => p.value), // ALL
    blinkit: PINCODE_OPTIONS.map(p => p.value), // ALL
    dmart: PINCODE_OPTIONS.map(p => p.value).filter(val => !['122008', '122016', '122010', '201303', '201014'].includes(val)), // Excluded as requested
    instamart: PINCODE_OPTIONS.map(p => p.value), // ALL
    flipkartMinutes: PINCODE_OPTIONS.map(p => p.value).filter(val => !['400070', '401101'].includes(val)), // Not available in 400070, 401101
};

const isPincodeAvailableForPlatform = (pincode, platformId) => {
    return PINCODE_AVAILABILITY[platformId]?.includes(pincode) || false;
};

// --- Skeleton Components ---
function SkeletonRow({ index }) {
    return (
        <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            <td className="sticky left-0 z-10 border-b border-gray-200 px-3 py-3 md:px-6 md:py-4 bg-inherit shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between w-full">
                    <div>
                        <div className="h-4 bg-gray-200 animate-pulse rounded w-32 mb-1.5" />
                        <div className="h-3 bg-gray-100 animate-pulse rounded w-16" />
                    </div>
                    <div className="h-5 w-5 bg-gray-200 animate-pulse rounded" />
                </div>
            </td>
        </tr>
    );
}

function SkeletonTable() {
    return (
        <table className="w-full text-left border-collapse">
            <thead>
                <tr>
                <th className="sticky top-0 left-0 z-20 bg-neutral-100 border-b border-r border-gray-200 px-3 py-3 font-bold text-neutral-800 tracking-wider text-[11px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[140px]">
                        Pincodes / Regions
                    </th>
                    {PLATFORMS.map(p => (
                        <th key={p.id} className="sticky top-0 z-10 bg-neutral-100 border-b border-gray-200 px-2 py-3 font-bold text-neutral-800 tracking-wider text-[11px] text-center min-w-[80px]" title={p.label}>
                            <span className="hidden lg:inline">{p.label}</span>
                            <span className="lg:hidden">{p.short}</span>
                        </th>
                    ))}
                    <th className="sticky top-0 right-0 z-20 bg-neutral-100 border-b border-gray-200 px-2 py-3 w-8"></th>
                </tr>
            </thead>
            <tbody>
                {PINCODE_OPTIONS.map((_, idx) => (
                    <SkeletonRow key={idx} index={idx} />
                ))}
            </tbody>
        </table>
    );
}

// --- Main Content ---
function OverviewContent() {
    const CATEGORY_OPTIONS = useMemo(() => {
        const allItems = Object.values(categoriesData).flat();
        const uniqueCategories = [...new Set(allItems.map(item => item.masterCategory).filter(Boolean))].sort();

        const prioritized = 'Fruits & Vegetables';
        if (uniqueCategories.includes(prioritized)) {
            const index = uniqueCategories.indexOf(prioritized);
            uniqueCategories.splice(index, 1);
            uniqueCategories.unshift(prioritized);
        }

        return uniqueCategories;
    }, []);

    const [expandedPincode, setExpandedPincode] = useState(null);
    const [matrixDataByPincode, setMatrixDataByPincode] = useState({});
    const [loadingPincode, setLoadingPincode] = useState({});
    const [error, setError] = useState(null);
    const { isSidebarOpen, toggleSidebar } = useSidebar();
    const searchParams = useSearchParams();
    const isAdmin = searchParams.get('admin') === 'true';

    const fetchOverviewDataForPincode = async (pincodeStr) => {
        if (!pincodeStr) return;

        setLoadingPincode(prev => ({ ...prev, [pincodeStr]: true }));
        setError(null);
        try {
            const url = `/api/overview?pincode=${encodeURIComponent(pincodeStr)}`;
            const res = await fetch(url);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to fetch matrix data');

            setMatrixDataByPincode(prev => ({
                ...prev,
                [pincodeStr]: data.data || []
            }));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingPincode(prev => ({ ...prev, [pincodeStr]: false }));
        }
    };

    useEffect(() => {
        // Pre-fetch all overview data once on component mount
        PINCODE_OPTIONS.forEach(pinOption => {
            fetchOverviewDataForPincode(pinOption.value);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleToggleExpand = (pincodeStr) => {
        if (expandedPincode === pincodeStr) {
            setExpandedPincode(null);
        } else {
            setExpandedPincode(pincodeStr);
            if (!matrixDataByPincode[pincodeStr]) {
                fetchOverviewDataForPincode(pincodeStr);
            }
        }
    };

    const getCellData = (pincodeStr, cat, plat) => {
        const dataForPin = matrixDataByPincode[pincodeStr] || [];
        const found = dataForPin.find(d =>
            d.category === cat &&
            d.platform?.toLowerCase() === plat.toLowerCase()
        );
        return found || null;
    };

    const getTotalCountForPlatform = (pincodeStr, platformId) => {
        const dataForPin = matrixDataByPincode[pincodeStr] || [];
        return dataForPin
            .filter(d => d.platform?.toLowerCase() === platformId.toLowerCase())
            .reduce((sum, current) => sum + (current.count || 0), 0);
    };

    const getTotalBrandsForPlatform = (pincodeStr, platformId) => {
        const dataForPin = matrixDataByPincode[pincodeStr] || [];
        return dataForPin
            .filter(d => d.platform?.toLowerCase() === platformId.toLowerCase())
            .reduce((sum, current) => sum + (current.brandCount || 0), 0);
    };

    const handleGlobalRefresh = () => {
        if (expandedPincode) {
            fetchOverviewDataForPincode(expandedPincode);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-neutral-900">
            {/* Header */}
            <div className="flex-none bg-white border-b border-gray-200 px-4 md:px-6 py-2 flex items-center justify-between shadow-sm z-20 min-h-[58px]">
                <div className="flex items-center gap-4">
                    {!isSidebarOpen && (
                        <button 
                            onClick={toggleSidebar}
                            className="p-1.5 -ml-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors animate-in fade-in"
                        >
                            <SidebarOpenIcon size={20} />
                        </button>
                    )}
                    <h1 className="text-lg font-bold tracking-tight text-neutral-900">System Overview</h1>
                    <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 rounded-lg px-2 py-1 border border-blue-200">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="font-medium text-[11px] md:text-sm">Latest Scrape Data</span>
                    </div>
                </div>
                {isAdmin && (
                    <button
                        onClick={handleGlobalRefresh}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all cursor-pointer border border-gray-200 bg-white shadow-sm"
                        title="Refresh Data"
                    >
                        <RefreshCw size={16} className={(expandedPincode && loadingPincode[expandedPincode]) ? "animate-spin text-blue-600" : ""} />
                        Refresh
                    </button>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col w-full max-w-[1920px] mx-auto p-3 md:p-[10px] gap-3">

                {/* Main List */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 border-b border-red-100 flex items-center gap-3">
                            <span className="font-bold">Error:</span> {error}
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse table-fixed">
                            <thead>
                                <tr>
                                    <th className="sticky top-0 left-0 z-20 bg-neutral-100 border-b border-r border-gray-200 px-3 py-3 font-bold text-neutral-800 tracking-wider text-[11px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[260px] min-w-[260px] border-l-4 border-l-transparent">
                                        Pincodes / Regions
                                    </th>
                                    {PLATFORMS.map(p => (
                                        <th key={p.id} className="sticky top-0 z-10 bg-neutral-100 border-b border-gray-200 px-2 py-3 font-bold text-neutral-800 tracking-wider text-[11px] text-center w-[100px] min-w-[100px]" title={p.label}>
                                            <span className="hidden xl:inline">{p.label}</span>
                                            <span className="xl:hidden">{p.short}</span>
                                        </th>
                                    ))}
                                    <th className="sticky top-0 right-0 z-20 bg-neutral-100 border-b border-gray-200 px-2 py-3 w-[40px] min-w-[40px]"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {PINCODE_OPTIONS.map((pinOption, idx) => {
                                    const isExpanded = expandedPincode === pinOption.value;
                                    const isLoadingThisPincode = loadingPincode[pinOption.value];

                                    return (
                                        <React.Fragment key={pinOption.value}>
                                            {/* Pincode Row Header */}
                                            <tr
                                                className={`cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/50' : (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-gray-100')}`}
                                                onClick={() => handleToggleExpand(pinOption.value)}
                                            >
                                                <td className="sticky left-0 z-10 border-b border-gray-200 px-3 py-3 md:px-6 md:py-4 font-semibold text-neutral-800 bg-inherit border-r w-[260px] min-w-[260px] border-l-4 border-l-transparent">
                                                    <div>
                                                        <div className="text-sm md:text-base truncate">{pinOption.label}</div>
                                                        <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{pinOption.value}</div>
                                                    </div>
                                                </td>

                                                {PLATFORMS.map(plat => {
                                                    const isAvailable = isPincodeAvailableForPlatform(pinOption.value, plat.id);
                                                    const totalCount = getTotalCountForPlatform(pinOption.value, plat.id);
                                                    const totalBrands = getTotalBrandsForPlatform(pinOption.value, plat.id);
                                                    const hasData = totalCount > 0;

                                                    return (
                                                        <td key={plat.id} className="border-b border-gray-200 px-2 py-3 text-center align-middle w-[100px] min-w-[100px]">
                                                            {isLoadingThisPincode ? (
                                                                <Loader2 className="animate-spin text-gray-400 mx-auto" size={16} />
                                                            ) : hasData ? (
                                                                <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-800 font-bold rounded-md border border-green-200">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></div>
                                                                    <div className="flex flex-col text-left">
                                                                        <span className="text-[10px] leading-tight text-green-700">P: {totalCount}</span>
                                                                        {totalBrands > 0 && <span className="text-[9px] leading-tight text-green-600/80 font-semibold">B: {totalBrands}</span>}
                                                                    </div>
                                                                </div>
                                                            ) : isAvailable ? (
                                                                <div className="inline-flex items-center px-1.5 py-0.5 bg-yellow-50 text-yellow-700 font-bold rounded-full text-[9px] border border-yellow-200">
                                                                    N/A
                                                                </div>
                                                            ) : (
                                                                <div className="inline-flex items-center px-1.5 py-0.5 bg-red-50 text-red-600 font-bold rounded-full text-[9px] border border-red-200">
                                                                    U/S
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}

                                                <td className="border-b border-gray-200 px-2 py-3 text-gray-400 text-right w-[40px] min-w-[40px]">
                                                    {isExpanded ? <ChevronUp size={16} className="ml-auto" /> : <ChevronDown className="ml-auto" size={16} />}
                                                </td>
                                            </tr>

                                            {/* Expanded Content: Category x Platform Matrix */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={PLATFORMS.length + 2} className="p-0 border-b border-gray-200 bg-gray-50">
                                                        {isLoadingThisPincode ? (
                                                            <div className="p-8 flex justify-center items-center">
                                                                <Loader2 className="animate-spin text-gray-400" size={32} />
                                                            </div>
                                                        ) : (
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left border-collapse table-fixed">
                                                                    <thead>
                                                                        <tr>
                                                                            <th className="sticky top-0 left-0 z-20 bg-neutral-100 border-b border-r border-gray-200 px-3 py-3 font-bold text-sky-700 tracking-wider text-[11px] shadow-[1px_0_3px_-1px_rgba(0,0,0,0.1)] w-[260px] min-w-[260px] border-l-4 border-l-sky-500">
                                                                                Category
                                                                            </th>
                                                                            {PLATFORMS.map(p => (
                                                                                <th key={p.id} className="sticky top-0 z-10 bg-neutral-50 border-b border-gray-200 px-2 py-3 font-bold text-neutral-500 tracking-wider text-[11px] text-center w-[100px] min-w-[100px]" title={p.label}>
                                                                                    <span className="hidden xl:inline">{p.label}</span>
                                                                                    <span className="xl:hidden">{p.short}</span>
                                                                                </th>
                                                                            ))}
                                                                            <th className="sticky top-0 right-0 z-20 bg-neutral-100 border-b border-gray-200 px-2 py-3 w-[40px] min-w-[40px]"></th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {CATEGORY_OPTIONS.map((cat, catIdx) => (
                                                                            <tr key={cat} className={catIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50 whitespace-nowrap'}>
                                                                                <td className="sticky left-0 z-10 border-r border-gray-200 px-3 py-3 md:px-6 md:py-3 font-medium text-neutral-700 shadow-[1px_0_3px_-1px_rgba(0,0,0,0.05)] bg-inherit text-xs md:text-sm border-l-4 border-l-sky-500/50 w-[260px] min-w-[260px]">
                                                                                    <div className="truncate">{cat}</div>
                                                                                </td>

                                                                                {PLATFORMS.map(plat => {
                                                                                    const isAvailable = isPincodeAvailableForPlatform(pinOption.value, plat.id);
                                                                                    const cellData = getCellData(pinOption.value, cat, plat.id);
                                                                                    const count = cellData ? cellData.count : 0;
                                                                                    const brandCount = cellData ? (cellData.brandCount || 0) : 0;
                                                                                    const hasData = count > 0;

                                                                                    let dateStr = '';
                                                                                    if (hasData && cellData?.latestScrapedAt) {
                                                                                        const d = new Date(cellData.latestScrapedAt);
                                                                                        dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                                                                                    }

                                                                                    return (
                                                                                        <td key={plat.id} className="border-b border-gray-100 px-2 py-3 text-center align-top w-[100px] min-w-[100px]">
                                                                                            <div className="flex flex-col items-center justify-center min-h-[48px]">
                                                                                                {hasData ? (
                                                                                                    <div className="flex flex-col items-center gap-1">
                                                                                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-800 font-bold rounded-md border border-green-200 min-w-[70px] justify-center">
                                                                                                            <div className="flex flex-col text-center justify-center">
                                                                                                                <span className="text-[10px] leading-[1.15] text-green-700">P: {count}</span>
                                                                                                                {brandCount > 0 && <span className="text-[9px] leading-[1.15] text-green-600/80 font-semibold">B: {brandCount}</span>}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                        <span className="text-[8px] text-gray-500 font-medium whitespace-nowrap bg-neutral-100/80 px-1 py-0.5 rounded border border-gray-100">{dateStr}</span>
                                                                                                    </div>
                                                                                                ) : isAvailable ? (
                                                                                                    <div className="inline-flex items-center px-1.5 py-0.5 bg-yellow-50 text-yellow-700 font-bold rounded-full text-[9px] border border-yellow-200">
                                                                                                        N/A
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <div className="inline-flex items-center px-1.5 py-0.5 bg-red-50 text-red-600 font-bold rounded-full text-[9px] border border-red-200">
                                                                                                        U/S
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </td>
                                                                                    );
                                                                                })}
                                                                                <td className="border-b border-gray-100 px-2 py-2 w-[40px] min-w-[40px]"></td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default function OverviewPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
                <div className="flex-none bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
                    <div className="h-6 bg-gray-200 animate-pulse rounded w-40" />
                </div>
                <div className="flex-1 flex flex-col w-full max-w-[1920px] mx-auto p-6 gap-6">
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <SkeletonTable />
                        </div>
                    </div>
                </div>
            </div>
        }>
            <OverviewContent />
        </Suspense>
    );
}
