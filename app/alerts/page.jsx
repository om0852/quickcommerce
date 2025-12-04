"use client"
import React, { useState } from 'react';
import { Bell, Plus, Trash2, CheckCircle, AlertCircle, X } from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([
    { 
      id: 1, 
      product: 'Amul Taaza Fresh Toned Milk', 
      targetPrice: 26, 
      condition: 'below', 
      platform: 'all', 
      status: 'active', 
      createdAt: '2025-12-01T10:00:00' 
    },
    { 
      id: 2, 
      product: 'Britannia Good Day Cashew', 
      targetPrice: 20, 
      condition: 'below', 
      platform: 'zepto', 
      status: 'triggered', 
      createdAt: '2025-12-03T14:30:00' 
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAlert, setNewAlert] = useState({
    product: '',
    targetPrice: '',
    condition: 'below',
    platform: 'all'
  });

  const handleAddAlert = (e) => {
    e.preventDefault();
    const alert = {
      id: Date.now(),
      ...newAlert,
      targetPrice: Number(newAlert.targetPrice),
      status: 'active',
      createdAt: new Date().toISOString()
    };
    setAlerts([alert, ...alerts]);
    setIsModalOpen(false);
    setNewAlert({ product: '', targetPrice: '', condition: 'below', platform: 'all' });
  };

  const handleDeleteAlert = (id) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'triggered': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Price Alerts</h1>
          <p className="page-description">Get notified when products reach your target price</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={20} />
          Create Alert
        </button>
      </div>

      <div className="card">
        {alerts.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Target Price</th>
                  <th>Platform</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(alert => (
                  <tr key={alert.id}>
                    <td style={{ fontWeight: 500 }}>{alert.product}</td>
                    <td>
                      {alert.condition === 'below' ? 'Below' : 'Above'} ₹{alert.targetPrice}
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{alert.platform === 'all' ? 'All Platforms' : alert.platform}</td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}>
                        {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ color: '#737373', fontSize: '0.875rem' }}>
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDeleteAlert(alert.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete Alert"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <Bell size={48} style={{ margin: '0 auto 1rem', color: '#d4d4d4' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>No alerts set</h3>
            <p style={{ color: '#737373' }}>Create an alert to track product prices</p>
          </div>
        )}
      </div>

      {/* Add Alert Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Create New Alert</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ color: '#737373', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddAlert}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Product Name</label>
                <input
                  type="text"
                  required
                  className="input"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d4d4d4' }}
                  value={newAlert.product}
                  onChange={e => setNewAlert({...newAlert, product: e.target.value})}
                  placeholder="e.g. Amul Milk"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Condition</label>
                  <select
                    className="select"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d4d4d4' }}
                    value={newAlert.condition}
                    onChange={e => setNewAlert({...newAlert, condition: e.target.value})}
                  >
                    <option value="below">Price Below</option>
                    <option value="above">Price Above</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Target Price (₹)</label>
                  <input
                    type="number"
                    required
                    className="input"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d4d4d4' }}
                    value={newAlert.targetPrice}
                    onChange={e => setNewAlert({...newAlert, targetPrice: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Platform</label>
                <select
                  className="select"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d4d4d4' }}
                  value={newAlert.platform}
                  onChange={e => setNewAlert({...newAlert, platform: e.target.value})}
                >
                  <option value="all">All Platforms</option>
                  <option value="zepto">Zepto</option>
                  <option value="blinkit">Blinkit</option>
                  <option value="jiomart">JioMart</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Create Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
