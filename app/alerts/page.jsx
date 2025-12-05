"use client"
import React, { useState } from 'react';
import { Bell, Plus, Trash2, CheckCircle, AlertCircle, X, DollarSign, TrendingUp, Package } from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([
    { 
      id: 1, 
      product: 'Amul Taaza Fresh Toned Milk', 
      alertType: 'price',
      targetPrice: 26, 
      condition: 'below', 
      platform: 'all', 
      status: 'active', 
      createdAt: '2025-12-01T10:00:00' 
    },
    { 
      id: 2, 
      product: 'Britannia Good Day Cashew', 
      alertType: 'price',
      targetPrice: 20, 
      condition: 'below', 
      platform: 'zepto', 
      status: 'triggered', 
      createdAt: '2025-12-03T14:30:00' 
    },
    {
      id: 3,
      product: 'Tata Tea Gold',
      alertType: 'ranking',
      rankingCondition: 'improved',
      rankingValue: 5,
      platform: 'blinkit',
      status: 'active',
      createdAt: '2025-12-04T09:15:00'
    },
    {
      id: 4,
      product: 'Lays Classic Salted',
      alertType: 'stock',
      stockCondition: 'in_stock',
      platform: 'jiomart',
      status: 'active',
      createdAt: '2025-12-05T08:00:00'
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({
    product: '',
    alertType: 'price',
    targetPrice: '',
    condition: 'below',
    rankingCondition: 'improved',
    rankingValue: '',
    stockCondition: 'in_stock',
    platform: 'all'
  });

  const handleAddAlert = (e) => {
    e.preventDefault();
    const alert = {
      id: Date.now(),
      ...newAlert,
      targetPrice: newAlert.alertType === 'price' ? Number(newAlert.targetPrice) : null,
      rankingValue: newAlert.alertType === 'ranking' ? Number(newAlert.rankingValue) : null,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    setAlerts([alert, ...alerts]);
    setIsModalOpen(false);
    setNewAlert({ 
      product: '', 
      alertType: 'price',
      targetPrice: '', 
      condition: 'below', 
      rankingCondition: 'improved',
      rankingValue: '',
      stockCondition: 'in_stock',
      platform: 'all' 
    });
  };

  const handleDeleteAlert = (id) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'triggered': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getAlertTypeIcon = (type) => {
    switch (type) {
      case 'price': return <DollarSign size={16} />;
      case 'ranking': return <TrendingUp size={16} />;
      case 'stock': return <Package size={16} />;
      default: return <Bell size={16} />;
    }
  };

  const renderCondition = (alert) => {
    switch (alert.alertType) {
      case 'ranking':
        if (alert.rankingCondition === 'improved') return `Rank improves by ${alert.rankingValue}`;
        if (alert.rankingCondition === 'dropped') return `Rank drops by ${alert.rankingValue}`;
        if (alert.rankingCondition === 'below') return `Rank below #${alert.rankingValue}`;
        if (alert.rankingCondition === 'above') return `Rank above #${alert.rankingValue}`;
        return 'Ranking change';
      case 'stock':
        return alert.stockCondition === 'in_stock' ? 'Back in Stock' : 'Out of Stock';
      case 'price':
      default:
        return `${alert.condition === 'below' ? 'Below' : 'Above'} ₹${alert.targetPrice}`;
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Price & Stock Alerts</h1>
          <p className="page-description" style={{ fontSize: '1rem', color: '#737373' }}>Get notified about price changes, ranking shifts, and stock availability</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            fontSize: '0.95rem',
            fontWeight: 600,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s'
          }}
        >
          <Plus size={20} />
          Create Alert
        </button>
      </div>

      {/* Alerts Table */}
      {alerts.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#171717', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#fafafa' }}>Product</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#171717', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#fafafa' }}>Type</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#171717', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#fafafa' }}>Condition</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#171717', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#fafafa' }}>Platform</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#171717', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#fafafa' }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#171717', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#fafafa' }}>Created</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#171717', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#fafafa', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(alert => (
                  <tr 
                    key={alert.id}
                    style={{ transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#171717' }}>
                        {alert.product}
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold capitalize border ${
                        alert.alertType === 'price' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        alert.alertType === 'ranking' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        'bg-orange-50 text-orange-700 border-orange-200'
                      }`}>
                        {getAlertTypeIcon(alert.alertType)}
                        {alert.alertType}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.875rem', color: '#171717' }}>
                      {renderCondition(alert)}
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.875rem', color: '#171717', textTransform: 'capitalize' }}>
                      {alert.platform === 'all' ? 'All Platforms' : alert.platform}
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(alert.status)}`}>
                        {alert.status === 'active' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                        {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.875rem', color: '#737373' }}>
                      {new Date(alert.createdAt).toLocaleDateString('en-IN', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDeleteAlert(alert.id)}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '0.375rem',
                          border: 'none',
                          background: 'transparent',
                          color: '#ef4444',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#fef2f2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                        title="Delete Alert"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card" style={{ 
          textAlign: 'center', 
          padding: '4rem 2rem',
          background: 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%)',
          borderRadius: '1rem',
          border: '1px dashed #d4d4d4'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 1.5rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #e5e5e5 0%, #d4d4d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Bell size={40} style={{ color: '#737373' }} />
          </div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#171717' }}>No alerts set</h3>
          <p style={{ color: '#737373', fontSize: '1rem', marginBottom: '1.5rem' }}>Create an alert to track product prices, rankings, or stock</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            Create Your First Alert
          </button>
        </div>
      )}

      {/* Create Alert Modal */}
      {isModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              width: '100%',
              maxWidth: '540px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              animation: 'slideUp 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Gradient */}
            <div style={{
              background: 'linear-gradient(135deg, #171717 0%, #404040 100%)',
              padding: '1.5rem',
              borderTopLeftRadius: '1rem',
              borderTopRightRadius: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>Create New Alert</h2>
                <p style={{ fontSize: '0.875rem', color: '#d4d4d4' }}>Set up notifications for your products</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ 
                  color: 'white', 
                  background: 'rgba(255,255,255,0.1)', 
                  border: 'none', 
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddAlert} style={{ padding: '1.5rem' }}>
              {/* Product Name */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem', 
                  fontSize: '0.875rem', 
                  fontWeight: 600,
                  color: '#171717'
                }}>
                  <Package size={16} />
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  style={{ 
                    width: '100%', 
                    padding: '0.75rem 1rem', 
                    borderRadius: '0.5rem', 
                    border: '1.5px solid #e5e5e5',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s'
                  }}
                  value={newAlert.product}
                  onChange={e => setNewAlert({...newAlert, product: e.target.value})}
                  placeholder="e.g. Amul Milk"
                  onFocus={(e) => e.currentTarget.style.borderColor = '#171717'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#e5e5e5'}
                />
              </div>

              {/* Alert Type */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.75rem', 
                  fontSize: '0.875rem', 
                  fontWeight: 600,
                  color: '#171717'
                }}>
                  Alert Type
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  {[
                    { type: 'price', icon: <DollarSign size={18} />, label: 'Price' },
                    { type: 'ranking', icon: <TrendingUp size={18} />, label: 'Ranking' },
                    { type: 'stock', icon: <Package size={18} />, label: 'Stock' }
                  ].map(({ type, icon, label }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewAlert({...newAlert, alertType: type})}
                      style={{
                        padding: '0.875rem',
                        borderRadius: '0.5rem',
                        border: newAlert.alertType === type ? '2px solid #171717' : '1.5px solid #e5e5e5',
                        background: newAlert.alertType === type ? '#171717' : 'white',
                        color: newAlert.alertType === type ? 'white' : '#171717',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontWeight: 600,
                        fontSize: '0.875rem'
                      }}
                      onMouseEnter={(e) => {
                        if (newAlert.alertType !== type) {
                          e.currentTarget.style.borderColor = '#a3a3a3';
                          e.currentTarget.style.background = '#fafafa';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (newAlert.alertType !== type) {
                          e.currentTarget.style.borderColor = '#e5e5e5';
                          e.currentTarget.style.background = 'white';
                        }
                      }}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Fields */}
              {newAlert.alertType === 'price' && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '1rem', 
                  marginBottom: '1.25rem',
                  padding: '1rem',
                  background: '#fafafa',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e5e5'
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#171717' }}>Condition</label>
                    <select
                      className="select"
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1.5px solid #e5e5e5', fontSize: '0.95rem' }}
                      value={newAlert.condition}
                      onChange={e => setNewAlert({...newAlert, condition: e.target.value})}
                    >
                      <option value="below">Price Below</option>
                      <option value="above">Price Above</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#171717' }}>Target Price (₹)</label>
                    <input
                      type="number"
                      required
                      className="input"
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1.5px solid #e5e5e5', fontSize: '0.95rem' }}
                      value={newAlert.targetPrice}
                      onChange={e => setNewAlert({...newAlert, targetPrice: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}

              {newAlert.alertType === 'ranking' && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '1rem', 
                  marginBottom: '1.25rem',
                  padding: '1rem',
                  background: '#fafafa',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e5e5'
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#171717' }}>Condition</label>
                    <select
                      className="select"
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1.5px solid #e5e5e5', fontSize: '0.95rem' }}
                      value={newAlert.rankingCondition}
                      onChange={e => setNewAlert({...newAlert, rankingCondition: e.target.value})}
                    >
                      <option value="improved">Improved by</option>
                      <option value="dropped">Dropped by</option>
                      <option value="below">Rank Below</option>
                      <option value="above">Rank Above</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#171717' }}>Value</label>
                    <input
                      type="number"
                      required
                      className="input"
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1.5px solid #e5e5e5', fontSize: '0.95rem' }}
                      value={newAlert.rankingValue}
                      onChange={e => setNewAlert({...newAlert, rankingValue: e.target.value})}
                      placeholder="e.g. 5"
                    />
                  </div>
                </div>
              )}

              {newAlert.alertType === 'stock' && (
                <div style={{ 
                  marginBottom: '1.25rem',
                  padding: '1rem',
                  background: '#fafafa',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e5e5'
                }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#171717' }}>Stock Status</label>
                  <select
                    className="select"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1.5px solid #e5e5e5', fontSize: '0.95rem' }}
                    value={newAlert.stockCondition}
                    onChange={e => setNewAlert({...newAlert, stockCondition: e.target.value})}
                  >
                    <option value="in_stock">Back in Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              )}

              {/* Platform */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#171717' }}>Platform</label>
                <select
                  className="select"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1.5px solid #e5e5e5', fontSize: '0.95rem' }}
                  value={newAlert.platform}
                  onChange={e => setNewAlert({...newAlert, platform: e.target.value})}
                >
                  <option value="all">All Platforms</option>
                  <option value="zepto">Zepto</option>
                  <option value="blinkit">Blinkit</option>
                  <option value="jiomart">JioMart</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #e5e5e5' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ 
                    flex: 1, 
                    padding: '0.75rem', 
                    fontSize: '0.95rem', 
                    fontWeight: 600,
                    borderRadius: '0.5rem',
                    border: '1.5px solid #e5e5e5',
                    background: 'white',
                    color: '#171717',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fafafa';
                    e.currentTarget.style.borderColor = '#d4d4d4';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e5e5e5';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ 
                    flex: 1, 
                    padding: '0.75rem', 
                    fontSize: '0.95rem', 
                    fontWeight: 600,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  Create Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
