import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function AnalyticsTab({ category, pincode, platform }) {
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
        <div style={{
          background: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          border: 'none'
        }}>
          <p style={{ color: 'white', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color, fontSize: '0.8125rem', marginTop: '0.25rem' }}>
              {entry.name}: <span style={{ fontWeight: 700 }}>{entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Stock Overview Table */}
      <div style={{
        background: 'white',
        padding: 0,
        borderRadius: '1rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e5e5',
        overflow: 'hidden'
      }} className="lg:col-span-2">
        {/* Header with gradient */}
        <div style={{
          background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
          padding: '1.5rem',
          borderBottom: '1px solid #e5e5e5'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>Stock Overview</h2>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Recent stock changes and activity</p>
            </div>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.5rem 1rem',
              background: 'white',
              color: '#374151',
              borderRadius: '9999px',
              border: '1px solid #e5e5e5',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}>
              {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              textTransform: 'uppercase',
              background: '#fafafa',
              borderBottom: '2px solid #e5e5e5'
            }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 700, letterSpacing: '0.05em' }}>Product Name</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 700, letterSpacing: '0.05em' }}>Platform</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 700, letterSpacing: '0.05em', textAlign: 'right' }}>Price</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 700, letterSpacing: '0.05em', textAlign: 'center' }}>Change</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 700, letterSpacing: '0.05em', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.stockOverview.length > 0 ? (
                data.stockOverview.map((item, index) => {
                  // Determine platform color
                  let platformColor = 'bg-gray-100 text-gray-700 border-gray-200';
                  if (item.category?.toLowerCase() === 'zepto') platformColor = 'bg-purple-50 text-purple-700 border-purple-200';
                  if (item.category?.toLowerCase() === 'blinkit') platformColor = 'bg-yellow-50 text-yellow-700 border-yellow-200';
                  if (item.category?.toLowerCase() === 'jiomart') platformColor = 'bg-blue-50 text-blue-700 border-blue-200';

                  return (
                    <tr 
                      key={index} 
                      style={{
                        background: index % 2 === 0 ? 'white' : '#fafafa',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = index % 2 === 0 ? 'white' : '#fafafa'}
                    >
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#111827' }}>{item.name}</div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem' }}>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold capitalize border ${platformColor}`}>
                          {item.category}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 700, fontSize: '0.9375rem', color: '#111827' }}>
                        ₹{item.price}
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                        <div className={`inline-flex items-center space-x-1 font-bold ${
                          item.stockStatus === 'positive' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          <span style={{ fontSize: '1rem' }}>{item.stockStatus === 'positive' ? '↑' : '↓'}</span>
                          <span>{item.stockChange}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${
                          item.stockStatus === 'positive' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            item.stockStatus === 'positive' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}></span>
                          {item.stockStatus === 'positive' ? 'Improved' : 'Declined'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      </div>
                      <p style={{ fontWeight: 600, color: '#374151', marginBottom: '0.25rem' }}>No recent stock activity</p>
                      <p style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>Check back later for updates</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ranking Improvements Chart */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
        padding: '1.5rem',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e5e5'
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>Ranking Improvements</h2>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280' }}>Products with improved rankings by price range</p>
        </div>
        <div style={{ height: '16rem', background: 'white', borderRadius: '0.5rem', padding: '1rem' }}>
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
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
        padding: '1.5rem',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e5e5'
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>Price Point Analysis</h2>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280' }}>Volume distribution by price range</p>
        </div>
        
        <div style={{ height: '16rem', background: 'white', borderRadius: '0.5rem', padding: '1rem' }}>
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
  );
}

export default AnalyticsTab;
