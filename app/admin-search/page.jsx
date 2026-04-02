'use client';

import { useState } from 'react';
import { Search, Loader2, Database, MapPin, Package, ChevronDown, ChevronRight, AlertTriangle, List } from 'lucide-react';
import { useSidebar } from '@/components/SidebarContext';
import { SidebarOpenIcon } from '@/components/SidebarIcons';

const PLATFORMS = ['zepto', 'blinkit', 'jiomart', 'dmart', 'flipkartMinutes', 'instamart'];
const PLATFORM_LABELS = {
  zepto: 'Zepto',
  blinkit: 'Blinkit',
  jiomart: 'JioMart',
  dmart: 'DMart',
  flipkartMinutes: 'Flipkart',
  instamart: 'Instamart',
};
const PLATFORM_COLORS = {
  zepto: 'bg-purple-100 text-purple-800 border-purple-200',
  blinkit: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  jiomart: 'bg-blue-100 text-blue-800 border-blue-200',
  dmart: 'bg-red-100 text-red-800 border-red-200',
  flipkartMinutes: 'bg-sky-100 text-sky-800 border-sky-200',
  instamart: 'bg-orange-100 text-orange-800 border-orange-200',
};

function formatDate(d) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function PriceTag({ price, originalPrice, isOutOfStock }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      {price != null || price === 0 ? (
        <span className="font-bold text-neutral-900">₹{Number(price).toFixed(0)}</span>
      ) : (
        <span className="text-neutral-400 text-sm">—</span>
      )}
      {originalPrice && originalPrice > price && (
        <span className="text-xs text-neutral-400 line-through">₹{Number(originalPrice).toFixed(0)}</span>
      )}
      {isOutOfStock && (
        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">OOS</span>
      )}
    </div>
  );
}

// ─── Group Result: rows = pincodes (accordion), cols = platforms ─────────────
function GroupResult({ data }) {
  const { group, results, totalPincodes, totalSnapshots } = data;
  const pincodes = Object.keys(results).sort();
  const [expandedPin, setExpandedPin] = useState(null);

  // Collect all active platforms across all pincodes
  const activePlatforms = PLATFORMS.filter(p =>
    pincodes.some(pin => results[pin]?.[p]?.length > 0)
  );

  const togglePin = (pin) => setExpandedPin(prev => prev === pin ? null : pin);

  return (
    <div className="space-y-3">
      {/* Group Metadata Card — merged flush with table below */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100">
          <div className="p-1.5 bg-blue-50 rounded-lg shrink-0">
            <Database size={16} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-neutral-900 truncate">{group.name || '—'}</h2>
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100 font-mono hidden sm:inline">{group.groupingId}</span>
            </div>
            <div className="flex gap-3 mt-0.5 text-[11px] text-neutral-400 flex-wrap">
              {group.weight && <span>{group.weight}</span>}
              {group.brand && <span>· {group.brand}</span>}
              {group.category && <span>· {group.category}</span>}
            </div>
          </div>
          <div className="flex gap-5 text-center shrink-0 border-l border-neutral-100 pl-4 ml-2">
            <div>
              <div className="text-base font-bold text-neutral-900 leading-none">{totalPincodes}</div>
              <div className="text-[10px] text-neutral-400 mt-0.5">Pincodes</div>
            </div>
            <div>
              <div className="text-base font-bold text-neutral-900 leading-none">{totalSnapshots}</div>
              <div className="text-[10px] text-neutral-400 mt-0.5">Snapshots</div>
            </div>
          </div>
        </div>

        {/* Results Table — edge-to-edge inside the same card */}
        {pincodes.length === 0 ? (
          <div className="text-center py-10 text-neutral-400 text-sm">No snapshot data found for this group across any pincode</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left px-4 py-3 font-semibold text-neutral-600 whitespace-nowrap sticky left-0 bg-neutral-50 z-10 min-w-[140px]">
                    Pincode
                  </th>
                  {activePlatforms.map(p => (
                    <th key={p} className="text-center px-4 py-3 font-semibold whitespace-nowrap min-w-[160px]">
                      <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${PLATFORM_COLORS[p]}`}>
                        {PLATFORM_LABELS[p]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pincodes.map(pincode => {
                  const isExpanded = expandedPin === pincode;
                  // Check if any platform has >1 variant for this pincode
                  const hasVariants = activePlatforms.some(p => (results[pincode]?.[p]?.length || 0) > 1);

                  return (
                    <>
                      {/* Main summary row */}
                      <tr
                        key={pincode}
                        onClick={() => togglePin(pincode)}
                        className={`border-t border-neutral-100 transition-colors cursor-pointer select-none
                          ${isExpanded ? 'bg-blue-50' : 'hover:bg-neutral-50'}`}
                      >
                        <td className={`px-4 py-3 sticky left-0 z-10 ${isExpanded ? 'bg-blue-50' : 'bg-white hover:bg-neutral-50'}`}>
                          <div className="flex items-center gap-1.5">
                            {isExpanded
                              ? <ChevronDown size={13} className="text-blue-500 shrink-0" />
                              : <ChevronRight size={13} className={`shrink-0 ${hasVariants ? 'text-neutral-400' : 'text-neutral-200'}`} />
                            }
                            <MapPin size={11} className="text-neutral-400 shrink-0" />
                            <span className="font-mono font-semibold text-neutral-700">{pincode}</span>
                          </div>
                        </td>
                        {activePlatforms.map(plat => {
                          const snaps = results[pincode]?.[plat] || [];
                          const snap = snaps[0];
                          return (
                            <td key={plat} className="px-4 py-3 text-center align-top">
                              {snap ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <PriceTag price={snap.currentPrice} originalPrice={snap.originalPrice} isOutOfStock={snap.isOutOfStock} />
                                  {snap.productWeight && <span className="text-[10px] text-neutral-400">{snap.productWeight}</span>}
                                  <span className="text-[10px] text-neutral-400 mt-0.5">{formatDate(snap.scrapedAt)}</span>
                                  {snaps.length > 1 && (
                                    <span className="text-[10px] text-blue-500 font-medium">+{snaps.length - 1} variant(s)</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-neutral-300 text-sm">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Accordion expanded: show all variants */}
                      {isExpanded && (
                        <tr key={`${pincode}-expanded`} className="bg-blue-50/40">
                          <td colSpan={activePlatforms.length + 1} className="px-0 py-0">
                            <div className="mx-4 mb-4 mt-1 rounded-lg border border-blue-100 overflow-hidden shadow-inner">
                              <div className="px-3 py-2 bg-blue-100/60 border-b border-blue-100 text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                                <MapPin size={11} />
                                All variants for pincode {pincode}
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-white border-b border-blue-50">
                                      <th className="text-left px-3 py-2 font-semibold text-neutral-500">Platform</th>
                                      <th className="text-left px-3 py-2 font-semibold text-neutral-500">Product ID</th>
                                      <th className="text-left px-3 py-2 font-semibold text-neutral-500">Name</th>
                                      <th className="text-left px-3 py-2 font-semibold text-neutral-500">Weight</th>
                                      <th className="text-right px-3 py-2 font-semibold text-neutral-500">Price</th>
                                      <th className="text-right px-3 py-2 font-semibold text-neutral-500">Orig.</th>
                                      <th className="text-right px-3 py-2 font-semibold text-neutral-500">Rank</th>
                                      <th className="text-right px-3 py-2 font-semibold text-neutral-500">Stock</th>
                                      <th className="text-right px-3 py-2 font-semibold text-neutral-500">Scraped At</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-blue-50">
                                    {activePlatforms.flatMap(plat => {
                                      const snaps = results[pincode]?.[plat] || [];
                                      return snaps.map((snap, vi) => (
                                        <tr key={`${plat}-${vi}`} className="hover:bg-white transition-colors">
                                          <td className="px-3 py-2">
                                            {vi === 0 ? (
                                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${PLATFORM_COLORS[plat] || 'bg-neutral-100 text-neutral-600 border-neutral-200'}`}>
                                                {PLATFORM_LABELS[plat] || plat}
                                              </span>
                                            ) : (
                                              <span className="text-neutral-300 pl-1">↳</span>
                                            )}
                                          </td>
                                          <td className="px-3 py-2 font-mono text-neutral-600 max-w-[160px] truncate" title={snap.productId}>
                                            {snap.productId}
                                          </td>
                                          <td className="px-3 py-2 text-neutral-700 max-w-[200px] truncate" title={snap.productName}>
                                            {snap.productName}
                                          </td>
                                          <td className="px-3 py-2 text-neutral-500">{snap.productWeight || '—'}</td>
                                          <td className="px-3 py-2 text-right font-bold text-neutral-900">
                                            {snap.currentPrice != null ? `₹${Number(snap.currentPrice).toFixed(0)}` : '—'}
                                          </td>
                                          <td className="px-3 py-2 text-right text-neutral-400 line-through">
                                            {snap.originalPrice && snap.originalPrice > snap.currentPrice
                                              ? `₹${Number(snap.originalPrice).toFixed(0)}`
                                              : '—'}
                                          </td>
                                          <td className="px-3 py-2 text-right text-neutral-600">{snap.ranking ?? '—'}</td>
                                          <td className="px-3 py-2 text-right">
                                            {snap.isOutOfStock
                                              ? <span className="text-rose-500 font-semibold">OOS</span>
                                              : <span className="text-emerald-600 font-semibold">In Stock</span>
                                            }
                                          </td>
                                          <td className="px-3 py-2 text-right text-neutral-400 whitespace-nowrap">{formatDate(snap.scrapedAt)}</td>
                                        </tr>
                                      ));
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Product Result: rows = pincodes, grouped by platform ───────────────────
function ProductResult({ data }) {
  const { productId, productName, results, totalPlatforms, totalSnapshots } = data;
  const platforms = Object.keys(results).sort();
  const [expanded, setExpanded] = useState(platforms.reduce((a, p) => ({ ...a, [p]: true }), {}));

  return (
    <div className="space-y-4">
      {/* Product Metadata */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Package size={20} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-neutral-900 truncate">{productName || 'Unknown Product'}</h2>
            <span className="text-xs font-mono text-neutral-500">{productId}</span>
          </div>
          <div className="flex gap-4 text-center shrink-0">
            <div>
              <div className="text-lg font-bold text-neutral-900">{totalPlatforms}</div>
              <div className="text-xs text-neutral-500">Platforms</div>
            </div>
            <div>
              <div className="text-lg font-bold text-neutral-900">{totalSnapshots}</div>
              <div className="text-xs text-neutral-500">Pincodes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Per-platform tables */}
      <div className="space-y-3">
        {platforms.map(platform => {
          const rows = results[platform] || [];
          const isExpanded = expanded[platform];
          return (
            <div key={platform} className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-neutral-50 transition-colors"
                onClick={() => setExpanded(e => ({ ...e, [platform]: !e[platform] }))}
              >
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${PLATFORM_COLORS[platform] || 'bg-neutral-100 text-neutral-600 border-neutral-200'}`}>
                    {PLATFORM_LABELS[platform] || platform}
                  </span>
                  <span className="text-xs text-neutral-500">{rows.length} pincode{rows.length !== 1 ? 's' : ''}</span>
                </div>
                {isExpanded ? <ChevronDown size={16} className="text-neutral-400" /> : <ChevronRight size={16} className="text-neutral-400" />}
              </button>
              {isExpanded && (
                <div className="border-t border-neutral-100 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-100">
                        <th className="text-left px-4 py-2 font-semibold text-neutral-500 text-xs">Pincode</th>
                        <th className="text-left px-4 py-2 font-semibold text-neutral-500 text-xs">Product Name</th>
                        <th className="text-left px-4 py-2 font-semibold text-neutral-500 text-xs">Weight</th>
                        <th className="text-right px-4 py-2 font-semibold text-neutral-500 text-xs">Price</th>
                        <th className="text-right px-4 py-2 font-semibold text-neutral-500 text-xs">Rank</th>
                        <th className="text-right px-4 py-2 font-semibold text-neutral-500 text-xs">Scraped At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {rows.map((row, i) => (
                        <tr key={i} className="hover:bg-neutral-50 transition-colors">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1">
                              <MapPin size={11} className="text-neutral-400" />
                              <span className="font-mono font-semibold text-neutral-700 text-xs">{row.pincode}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 max-w-[220px]">
                            <span className="text-xs text-neutral-700 line-clamp-2">{row.productName}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs text-neutral-500">{row.productWeight || '—'}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <PriceTag price={row.currentPrice} originalPrice={row.originalPrice} isOutOfStock={row.isOutOfStock} />
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-xs font-medium text-neutral-600">{row.ranking ?? '—'}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-[11px] text-neutral-400 whitespace-nowrap">{formatDate(row.scrapedAt)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─── Groups Result: list of name-matched groups with inline accordion ──────────
function GroupsResult({ data }) {
  const { groups, total, query } = data;
  // Map of groupingId → { open, loading, data, error }
  const [expanded, setExpanded] = useState({});

  const toggleGroup = async (groupingId) => {
    const current = expanded[groupingId];

    // Already loaded — just toggle open/closed
    if (current?.data || current?.error) {
      setExpanded(prev => ({
        ...prev,
        [groupingId]: { ...prev[groupingId], open: !prev[groupingId].open },
      }));
      return;
    }

    // Start fetch
    setExpanded(prev => ({
      ...prev,
      [groupingId]: { open: true, loading: true, data: null, error: null },
    }));

    try {
      const res = await fetch(`/api/admin-search?q=${encodeURIComponent(groupingId)}`);
      const result = await res.json();
      setExpanded(prev => ({
        ...prev,
        [groupingId]: { open: true, loading: false, data: result, error: null },
      }));
    } catch {
      setExpanded(prev => ({
        ...prev,
        [groupingId]: { open: true, loading: false, data: null, error: 'Failed to load data' },
      }));
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <List size={14} className="text-neutral-500" />
        <span className="text-sm font-semibold text-neutral-700">
          {total} group{total !== 1 ? 's' : ''} matching
        </span>
        <span className="text-sm text-neutral-400">"<em>{query}</em>"</span>
        {total === 30 && <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Top 30 shown</span>}
      </div>

      {/* Group list */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="text-left px-4 py-3 font-semibold text-neutral-500 text-xs">Group Name</th>
              <th className="text-left px-4 py-3 font-semibold text-neutral-500 text-xs">Brand</th>
              <th className="text-left px-4 py-3 font-semibold text-neutral-500 text-xs">Category</th>
              <th className="text-center px-4 py-3 font-semibold text-neutral-500 text-xs">Products</th>
              <th className="text-left px-4 py-3 font-semibold text-neutral-500 text-xs hidden sm:table-cell">Group ID</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const state = expanded[g.groupingId] || {};
              const isOpen = !!state.open;
              const isLoading = !!state.loading;
              const groupData = state.data;
              const groupError = state.error;
              const colSpan = 6;

              return (
                <>
                  {/* Group summary row */}
                  <tr
                    key={g.groupingId}
                    className={`border-t border-neutral-100 transition-colors cursor-pointer select-none ${
                      isOpen ? 'bg-blue-50' : 'hover:bg-neutral-50'
                    }`}
                    onClick={() => toggleGroup(g.groupingId)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isOpen
                          ? <ChevronDown size={13} className="text-blue-500 shrink-0" />
                          : <ChevronRight size={13} className="text-neutral-400 shrink-0" />}
                        {g.image && (
                          <img src={g.image} alt="" className="w-7 h-7 object-contain rounded border border-neutral-100 shrink-0"
                            onError={e => e.target.style.display = 'none'} />
                        )}
                        <div>
                          <div className="font-medium text-neutral-900 text-xs leading-snug line-clamp-2">{g.name}</div>
                          {g.weight && <div className="text-[11px] text-neutral-400 mt-0.5">{g.weight}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {g.brand
                        ? <span className="text-xs text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">{g.brand}</span>
                        : <span className="text-neutral-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-neutral-500">{g.category || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-bold text-neutral-700">{g.totalProducts ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-[10px] font-mono text-neutral-400 truncate max-w-[140px] block">{g.groupingId}</span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => toggleGroup(g.groupingId)}
                        className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors whitespace-nowrap ${
                          isOpen
                            ? 'bg-blue-100 text-blue-700 border-blue-200'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200'
                        }`}
                      >
                        {isLoading
                          ? <><Loader2 size={11} className="animate-spin" /> Loading…</>
                          : isOpen
                            ? <><ChevronDown size={11} /> Hide</>
                            : <><ChevronRight size={11} /> View</>}
                      </button>
                    </td>
                  </tr>

                  {/* Accordion row — inline snapshot detail */}
                  {isOpen && (
                    <tr key={`${g.groupingId}-accordion`}>
                      <td colSpan={colSpan} className="p-0 bg-blue-50/40 border-t border-blue-100">
                        <div className="px-4 pb-4 pt-2">
                          {isLoading && (
                            <div className="flex items-center gap-2 py-6 justify-center text-neutral-400 text-xs">
                              <Loader2 size={14} className="animate-spin" />
                              Loading snapshot data…
                            </div>
                          )}
                          {groupError && (
                            <div className="flex items-center gap-2 py-4 text-rose-600 text-xs">
                              <AlertTriangle size={13} />
                              {groupError}
                            </div>
                          )}
                          {groupData?.type === 'group' && (
                            <div className="mt-1">
                              <GroupResult data={groupData} />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function AdminSearchPage() {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (e, overrideQuery) => {
    e?.preventDefault();
    const q = (overrideQuery ?? query).trim();
    if (!q) return;

    // If clicking a group from the list, update the input field too
    if (overrideQuery) setQuery(overrideQuery);

    setLoading(true);
    setResult(null);
    setError('');

    try {
      const res = await fetch(`/api/admin-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || data.error || 'Not found');
      } else {
        setResult(data);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Sticky top bar: header + search combined */}
      <div className="sticky top-0 z-30 bg-white border-b border-neutral-200 shadow-sm px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          {/* Title */}
          <div className="flex items-center gap-2 shrink-0">
            {!isSidebarOpen && (
              <button
                onClick={toggleSidebar}
                className="p-1.5 -ml-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors animate-in fade-in"
              >
                <SidebarOpenIcon size={20} />
              </button>
            )}
            <Database size={16} className="text-neutral-600" />
            <span className="text-sm font-bold text-neutral-900 whitespace-nowrap">Admin Search</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded border border-amber-200 font-semibold">ADMIN</span>
          </div>

          {/* Search input */}
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Group ID, Product ID, or Group Name…"
                className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:bg-white transition-all placeholder:text-neutral-400 placeholder:font-sans"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              {loading ? 'Searching…' : 'Search'}
            </button>
          </form>
        </div>
      </div>

      {/* Page body */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs mb-4">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {/* Results */}
        {result?.type === 'group' && <GroupResult data={result} />}
        {result?.type === 'product' && <ProductResult data={result} />}
        {result?.type === 'groups' && <GroupsResult data={result} />}

        {/* Empty state */}
        {!result && !error && !loading && (
          <div className="text-center py-20 text-neutral-400">
            <Database size={32} className="mx-auto mb-2 opacity-25" />
            <p className="text-xs">Enter a Group ID, Product ID, or Group Name to begin</p>
          </div>
        )}
      </div>
    </div>
  );
}
