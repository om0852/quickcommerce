"use client"
import React, { useState } from 'react';
import { Bell, Plus, Trash2, CheckCircle, AlertCircle, X, DollarSign, TrendingUp, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      default: return 'bg-neutral-50 text-neutral-700 border-neutral-200';
    }
  };

  const getAlertTypeIcon = (type) => {
    switch (type) {
      case 'price': return <DollarSign size={14} />;
      case 'ranking': return <TrendingUp size={14} />;
      case 'stock': return <Package size={14} />;
      default: return <Bell size={14} />;
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
    <div className="min-h-screen bg-[#fafafa] p-4 md:p-8 font-sans text-neutral-900">
      {/* Header */}
      <div className="max-w-[1400px] mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-2">Price & Stock Alerts</h1>
          <p className="text-neutral-500">Get notified about price changes, ranking shifts, and stock availability</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="h-[42px] px-6 bg-neutral-900 text-white rounded-md font-medium text-sm flex items-center gap-2 hover:bg-black transition-all shadow-sm hover:shadow-md"
        >
          <Plus size={18} />
          Create Alert
        </button>
      </div>

      {/* Alerts Table */}
      <div className="max-w-[1400px] mx-auto">
        {alerts.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="p-4 text-xs font-bold text-neutral-900 uppercase tracking-wider">Product</th>
                    <th className="p-4 text-xs font-bold text-neutral-900 uppercase tracking-wider">Type</th>
                    <th className="p-4 text-xs font-bold text-neutral-900 uppercase tracking-wider">Condition</th>
                    <th className="p-4 text-xs font-bold text-neutral-900 uppercase tracking-wider">Platform</th>
                    <th className="p-4 text-xs font-bold text-neutral-900 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-bold text-neutral-900 uppercase tracking-wider">Created</th>
                    <th className="p-4 text-xs font-bold text-neutral-900 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {alerts.map(alert => (
                    <tr
                      key={alert.id}
                      className="group hover:bg-neutral-50/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-semibold text-sm text-neutral-900">
                          {alert.product}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border capitalize",
                          alert.alertType === 'price' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            alert.alertType === 'ranking' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              'bg-orange-50 text-orange-700 border-orange-200'
                        )}>
                          {getAlertTypeIcon(alert.alertType)}
                          {alert.alertType}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-neutral-700">
                        {renderCondition(alert)}
                      </td>
                      <td className="p-4 text-sm text-neutral-900 capitalize font-medium">
                        {alert.platform === 'all' ? 'All Platforms' : alert.platform}
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border capitalize",
                          getStatusColor(alert.status)
                        )}>
                          {alert.status === 'active' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                          {alert.status}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-neutral-500 font-medium">
                        {new Date(alert.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="p-2 rounded-md hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors"
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
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-neutral-100 flex items-center justify-center">
              <Bell size={40} className="text-neutral-400" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">No alerts set</h3>
            <p className="text-neutral-500 mb-8 max-w-sm mx-auto">Create an alert to track product prices, rankings, or stock availability across platforms.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="h-[42px] px-6 bg-neutral-900 text-white rounded-md font-medium text-sm inline-flex items-center gap-2 hover:bg-black transition-all shadow-sm hover:shadow-md"
            >
              <Plus size={18} />
              Create Your First Alert
            </button>
          </div>
        )}
      </div>

      {/* Create Alert Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div
            className="bg-white rounded-xl w-full max-w-[540px] max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-neutral-900 p-6 flex justify-between items-center sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Create New Alert</h2>
                <p className="text-xs text-neutral-400">Set up notifications for your products</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddAlert} className="p-6 space-y-5">
              {/* Product Name */}
              <div>
                <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-neutral-900">
                  <Package size={16} />
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full h-[42px] px-4 rounded-md border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-colors placeholder:text-neutral-400"
                  value={newAlert.product}
                  onChange={e => setNewAlert({ ...newAlert, product: e.target.value })}
                  placeholder="e.g. Amul Milk"
                />
              </div>

              {/* Alert Type */}
              <div>
                <label className="block mb-3 text-sm font-semibold text-neutral-900">
                  Alert Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { type: 'price', icon: <DollarSign size={18} />, label: 'Price' },
                    { type: 'ranking', icon: <TrendingUp size={18} />, label: 'Ranking' },
                    { type: 'stock', icon: <Package size={18} />, label: 'Stock' }
                  ].map(({ type, icon, label }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewAlert({ ...newAlert, alertType: type })}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all duration-200",
                        newAlert.alertType === type
                          ? "bg-neutral-900 border-neutral-900 text-white shadow-md transform scale-[1.02]"
                          : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300"
                      )}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Fields */}
              {newAlert.alertType === 'price' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                  <div>
                    <label className="block mb-2 text-xs font-semibold text-neutral-700 uppercase tracking-wider">Condition</label>
                    <div className="relative">
                      <select
                        className="w-full h-[38px] px-3 rounded-md border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 cursor-pointer appearance-none"
                        value={newAlert.condition}
                        onChange={e => setNewAlert({ ...newAlert, condition: e.target.value })}
                      >
                        <option value="below">Price Below</option>
                        <option value="above">Price Above</option>
                      </select>
                      {/* Custom dropdown arrow could go here */}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2 text-xs font-semibold text-neutral-700 uppercase tracking-wider">Target Price (₹)</label>
                    <input
                      type="number"
                      required
                      className="w-full h-[38px] px-3 rounded-md border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-colors"
                      value={newAlert.targetPrice}
                      onChange={e => setNewAlert({ ...newAlert, targetPrice: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}

              {newAlert.alertType === 'ranking' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                  <div>
                    <label className="block mb-2 text-xs font-semibold text-neutral-700 uppercase tracking-wider">Condition</label>
                    <select
                      className="w-full h-[38px] px-3 rounded-md border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 cursor-pointer"
                      value={newAlert.rankingCondition}
                      onChange={e => setNewAlert({ ...newAlert, rankingCondition: e.target.value })}
                    >
                      <option value="improved">Improved by</option>
                      <option value="dropped">Dropped by</option>
                      <option value="below">Rank Below</option>
                      <option value="above">Rank Above</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 text-xs font-semibold text-neutral-700 uppercase tracking-wider">Value</label>
                    <input
                      type="number"
                      required
                      className="w-full h-[38px] px-3 rounded-md border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-colors"
                      value={newAlert.rankingValue}
                      onChange={e => setNewAlert({ ...newAlert, rankingValue: e.target.value })}
                      placeholder="e.g. 5"
                    />
                  </div>
                </div>
              )}

              {newAlert.alertType === 'stock' && (
                <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                  <label className="block mb-2 text-xs font-semibold text-neutral-700 uppercase tracking-wider">Stock Status</label>
                  <select
                    className="w-full h-[38px] px-3 rounded-md border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 cursor-pointer"
                    value={newAlert.stockCondition}
                    onChange={e => setNewAlert({ ...newAlert, stockCondition: e.target.value })}
                  >
                    <option value="in_stock">Back in Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>
              )}

              {/* Platform */}
              <div>
                <label className="block mb-2 text-sm font-semibold text-neutral-900">Platform</label>
                <select
                  className="w-full h-[42px] px-3 rounded-md border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 cursor-pointer"
                  value={newAlert.platform}
                  onChange={e => setNewAlert({ ...newAlert, platform: e.target.value })}
                >
                  <option value="all">All Platforms</option>
                  <option value="zepto">Zepto</option>
                  <option value="blinkit">Blinkit</option>
                  <option value="jiomart">JioMart</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-[42px] px-4 rounded-md border border-neutral-200 bg-white text-neutral-700 font-medium text-sm hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-[42px] px-4 rounded-md bg-neutral-900 text-white font-medium text-sm hover:bg-black transition-colors shadow-sm"
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
