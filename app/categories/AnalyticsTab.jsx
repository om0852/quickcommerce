import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Package } from 'lucide-react';

function AnalyticsTab({ category, pincode, platform, historyData, stockData, selectedProduct, showStockOnly }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const platformParam = platform && platform !== 'all' ? `&platform=${encodeURIComponent(platform)}` : '';
    fetch(`/api/analytics?category=${encodeURIComponent(category)}&pincode=${encodeURIComponent(pincode)}${platformParam}`)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch analytics:', err);
        setLoading(false);
      });
  }, [category, pincode, platform]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (!data) return null;

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-neutral-800 text-white p-3 rounded-lg shadow-xl border border-neutral-700">
          <p className="font-semibold mb-2 text-sm">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-xs mt-1">
              {entry.name}: <span className="font-bold">{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">

      {/* Product Specific History (Price & Rank) */}
      {selectedProduct && historyData && historyData.length > 0 && !showStockOnly && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Price History */}
          <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-200">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-neutral-900 mb-1">Price History: {selectedProduct.name}</h2>
              <p className="text-xs text-neutral-500">Price trends over time</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData}>
                  <defs>
                    <linearGradient id="colorZepto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBlinkit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorJio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Zepto" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorZepto)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Blinkit" stroke="#f59e0b" fillOpacity={1} fill="url(#colorBlinkit)" strokeWidth={2} />
                  <Area type="monotone" dataKey="JioMart" stroke="#3b82f6" fillOpacity={1} fill="url(#colorJio)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ranking History */}
          <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-200">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-neutral-900 mb-1">Ranking History</h2>
              <p className="text-xs text-neutral-500">Rank tracking (Lower is better)</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} reversed />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Zepto Rank" stroke="#8b5cf6" fill="none" strokeWidth={2} />
                  <Area type="monotone" dataKey="Blinkit Rank" stroke="#f59e0b" fill="none" strokeWidth={2} />
                  <Area type="monotone" dataKey="JioMart Rank" stroke="#3b82f6" fill="none" strokeWidth={2} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Stock History */}
      {(showStockOnly || !showStockOnly) && selectedProduct && stockData && stockData.length > 0 && (
        <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-200">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-neutral-900 mb-1">Stock History: {selectedProduct.name}</h2>
            <p className="text-xs text-neutral-500">Availability over time (1 = In Stock, 0 = Out of Stock)</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stockData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 1]} ticks={[0, 1]} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="step" dataKey="Zepto" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={2} />
                <Area type="step" dataKey="Blinkit" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} />
                <Area type="step" dataKey="JioMart" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
                <Legend iconType="square" wrapperStyle={{ fontSize: '0.75rem' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Existing Analytics Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Stock Overview Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          {/* Header with gradient */}
          <div className="p-6 bg-gradient-to-br from-neutral-50 to-neutral-100 border-b border-neutral-200 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-neutral-900 mb-1">Stock Overview</h2>
              <p className="text-sm text-neutral-500">Recent stock changes and activity</p>
            </div>
            <span className="text-xs font-semibold px-4 py-2 bg-white text-neutral-700 rounded-full border border-neutral-200 shadow-sm">
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          </div>

          <div className="overflow-hidden border border-neutral-200 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-900 text-white">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Product Name</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider">Platform</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right">Price</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-center">Change</th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {data.stockOverview.length > 0 ? (
                  data.stockOverview.map((item, index) => {
                    return (
                      <tr
                        key={index}
                        className="hover:bg-neutral-50 transition-colors duration-150"
                      >
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-neutral-900">
                            {item.name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {/* Simple text with distinct color or minimal badge */}
                          <span className={cn(
                            "text-xs font-bold uppercase tracking-wide",
                            item.category?.toLowerCase() === 'zepto' ? 'text-purple-700' :
                              item.category?.toLowerCase() === 'blinkit' ? 'text-yellow-700' :
                                item.category?.toLowerCase() === 'jiomart' ? 'text-blue-700' : 'text-neutral-600'
                          )}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-bold text-neutral-900">
                            ₹{item.price}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className={cn(
                            "inline-flex items-center gap-1 text-sm font-semibold",
                            item.stockStatus === 'positive' ? 'text-emerald-600' : 'text-rose-600'
                          )}>
                            <span>{item.stockStatus === 'positive' ? '↑' : '↓'}</span>
                            <span>{item.stockChange}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border",
                            item.stockStatus === 'positive'
                              ? 'bg-white border-emerald-200 text-emerald-700'
                              : 'bg-white border-rose-200 text-rose-700'
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              item.stockStatus === 'positive' ? 'bg-emerald-500' : 'bg-rose-500'
                            )}></span>
                            {item.stockStatus === 'positive' ? 'Improved' : 'Declined'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-neutral-400">
                      <p className="text-sm">No recent activity found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ranking Improvements Chart */}
        <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-200">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-neutral-900 mb-1">Ranking Improvements</h2>
            <p className="text-xs text-neutral-500">Products with improved rankings by price range</p>
          </div>
          <div className="h-64 bg-white rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.rankingData}
                margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  tickFormatter={(value) => value.split(' ')[0]}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '0.8125rem', paddingTop: '1rem' }}
                  iconType="circle"
                />
                <Bar
                  dataKey="rankImproved"
                  name="Rank Improved"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Price Point Analysis Chart */}
        <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-200">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-neutral-900 mb-1">Price Point Analysis</h2>
            <p className="text-xs text-neutral-500">Volume distribution by price range</p>
          </div>

          <div className="h-64 bg-white rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={data.priceDistribution}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis
                  dataKey="range"
                  type="category"
                  width={70}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  name="SKUs"
                  fill="#6366f1"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}

export default AnalyticsTab;
