import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import CustomDropdown from '@/components/CustomDropdown';

function AnalyticsTab({ products, pincode }) {
  const [selectedProductValue, setSelectedProductValue] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Prepare options for dropdown
  // Prepare options for dropdown (deduplicated by name)
  const productOptions = React.useMemo(() => {
    const unique = new Map();
    products.forEach(p => {
      if (!unique.has(p.name)) {
        unique.set(p.name, {
          label: p.name,
          value: p.name,
          original: p
        });
      }
    });
    return Array.from(unique.values());
  }, [products]);

  // Auto-select first product if none selected
  useEffect(() => {
    if (!selectedProductValue && productOptions.length > 0) {
      setSelectedProductValue(productOptions[0].value);
    }
  }, [productOptions]);

  // Fetch history when product is selected
  useEffect(() => {
    if (!selectedProductValue) return;

    const product = products.find(p => p.name === selectedProductValue);
    if (!product) return;

    setLoading(true);

    // Construct IDs for fetch
    const productIds = {};
    if (product.zepto?.productId) productIds.zepto = product.zepto.productId;
    if (product.blinkit?.productId) productIds.blinkit = product.blinkit.productId;
    if (product.jiomart?.productId) productIds.jiomart = product.jiomart.productId;
    if (product.flipkartMinutes?.productId) productIds.flipkartMinutes = product.flipkartMinutes.productId;

    const productNames = {};
    if (product.zepto?.name) productNames.zepto = product.zepto.name;
    if (product.blinkit?.name) productNames.blinkit = product.blinkit.name;
    if (product.jiomart?.name) productNames.jiomart = product.jiomart.name;
    if (product.flipkartMinutes?.name) productNames.flipkartMinutes = product.flipkartMinutes.name;

    fetch('/api/product-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pincode,
        productIds,
        productNames
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.history) {
          const transformedData = data.history.map(h => ({
            date: new Date(h.date).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            rawDate: new Date(h.date),
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
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch history", err);
        setLoading(false);
      });

  }, [selectedProductValue, pincode, products]);


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

      {/* Product Selector */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200">
        <label className="text-xs font-semibold text-gray-500 mb-2 block">Select Product for Analysis</label>
        <div className="w-full max-w-md">
          <CustomDropdown
            value={selectedProductValue}
            onChange={setSelectedProductValue}
            options={productOptions}
            placeholder="Search product..."
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : (
        <>
          {historyData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Price History */}
              <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-200">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-neutral-900 mb-1">Price History</h2>
                  <p className="text-xs text-neutral-500">Price trends from current date to past</p>
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
                        <linearGradient id="colorFlipkart" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2874f0" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#2874f0" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="Zepto" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorZepto)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Blinkit" stroke="#f59e0b" fillOpacity={1} fill="url(#colorBlinkit)" strokeWidth={2} />
                      <Area type="monotone" dataKey="JioMart" stroke="#3b82f6" fillOpacity={1} fill="url(#colorJio)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Flipkart Minutes" stroke="#2874f0" fillOpacity={1} fill="url(#colorFlipkart)" strokeWidth={2} />
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
                      <Area type="monotone" dataKey="Flipkart Minutes Rank" stroke="#2874f0" fill="none" strokeWidth={2} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-neutral-400">
              Select a product to view analytics
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AnalyticsTab;
