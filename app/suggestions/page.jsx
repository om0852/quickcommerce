'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PINCODE_OPTIONS } from '@/app/constants/platforms';
import categoriesData from '../utils/categories_with_urls.json';
import CustomDropdown from '@/components/CustomDropdown';
import { Loader2, Check, X, RefreshCw, MessageSquare, Info, AlertCircle, Clock } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Snackbar, Alert, Tooltip as MuiTooltip } from '@mui/material';
import { cn } from '@/lib/utils';

export default function SuggestionsPage() {
  const searchParams = useSearchParams();
  const isAdmin = searchParams.get('admin') === 'true';

  // State
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    pincode: '201303',
    category: '',
    groupId: '',
    productId: '',
    description: ''
  });

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // Generate Category Options
  const CATEGORY_OPTIONS = useMemo(() => {
    const allItems = Object.values(categoriesData).flat();
    const uniqueCategories = [...new Set(allItems.map(item => item.masterCategory).filter(Boolean))].sort();
    return uniqueCategories.map(cat => ({ label: cat, value: cat }));
  }, []);

  useEffect(() => {
    if (CATEGORY_OPTIONS.length > 0 && !formData.category) {
      setFormData(prev => ({ ...prev, category: CATEGORY_OPTIONS[0].value }));
    }
  }, [CATEGORY_OPTIONS]);

  // Fetch Suggestions
  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/suggestions');
      const data = await res.json();
      if (data.success) {
        setSuggestions(data.suggestions);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch suggestions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setToast({ open: true, message: 'Suggestion submitted successfully!', severity: 'success' });
        setFormData(prev => ({ ...prev, groupId: '', productId: '', description: '' }));
        fetchSuggestions();
      } else {
        setToast({ open: true, message: data.error || 'Failed to submit', severity: 'error' });
      }
    } catch (err) {
      setToast({ open: true, message: 'Error submitting suggestion', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Status Update
  const handleUpdateStatus = async (id, status) => {
    try {
      const res = await fetch('/api/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();
      if (data.success) {
        setToast({ open: true, message: `Suggestion marked as ${status}`, severity: 'success' });
        fetchSuggestions();
      } else {
        setToast({ open: true, message: data.error || 'Update failed', severity: 'error' });
      }
    } catch (err) {
      setToast({ open: true, message: 'Error updating status', severity: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-neutral-900">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-neutral-900 text-white rounded-lg">
              <MessageSquare size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Suggestions & Issue Tracking</h1>
              <p className="text-gray-500 text-sm">Submit and track improvements for product grouping and data accuracy.</p>
            </div>
          </div>
          <button 
            onClick={fetchSuggestions}
            className="p-2 text-gray-500 hover:text-neutral-900 hover:bg-gray-100 rounded-lg transition-all"
            title="Refresh List"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Suggestion Form (Admin Only or Default for now) */}
        {isAdmin && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Info size={18} className="text-blue-500" />
              New Suggestion
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Region</label>
                <CustomDropdown
                  value={formData.pincode}
                  onChange={(val) => setFormData(prev => ({ ...prev, pincode: val }))}
                  options={PINCODE_OPTIONS}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</label>
                <CustomDropdown
                  value={formData.category}
                  onChange={(val) => setFormData(prev => ({ ...prev, category: val }))}
                  options={CATEGORY_OPTIONS}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Group ID / Parent ID</label>
                <input
                  type="text"
                  value={formData.groupId}
                  onChange={(e) => setFormData(prev => ({ ...prev, groupId: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:outline-none transition-all"
                  placeholder="e.g. apple_red_123"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Product ID (Platform specific)</label>
                <input
                  type="text"
                  value={formData.productId}
                  onChange={(e) => setFormData(prev => ({ ...prev, productId: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:outline-none transition-all"
                  placeholder="e.g. zepto-4455"
                />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:outline-none transition-all min-h-[42px]"
                  placeholder="Describe the issue or suggestion..."
                />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white px-8 py-2.5 rounded-lg font-bold text-sm transition-all shadow-md disabled:bg-gray-400 flex items-center gap-2"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Submit Suggestion
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Suggestion List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Clock size={18} className="text-neutral-500" />
              Recent Suggestions
            </h2>
            <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
               <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400"></div> Pending</span>
               <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Completed</span>
               <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Rejected</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-[10px] uppercase tracking-widest font-black text-gray-500 border-b border-gray-100">
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Context</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Submitted</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                      <Loader2 size={32} className="animate-spin mx-auto mb-2 opacity-20" />
                      Loading suggestions...
                    </td>
                  </tr>
                )}
                {!loading && suggestions.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic">
                      No suggestions found.
                    </td>
                  </tr>
                )}
                {suggestions.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide",
                        s.status === 'pending' && "bg-amber-100 text-amber-700",
                        s.status === 'completed' && "bg-emerald-100 text-emerald-700",
                        s.status === 'rejected' && "bg-rose-100 text-rose-700",
                      )}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-400 w-16">Pincode:</span>
                          <span className="text-gray-900">{s.pincode}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-400 w-16">Category:</span>
                          <span className="text-gray-900">{s.category}</span>
                        </div>
                        {(s.groupId || s.productId) && (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-400 w-16">IDs:</span>
                            <span className="text-neutral-500 italic">
                              {s.groupId && `Group: ${s.groupId}`}
                              {s.groupId && s.productId && ' | '}
                              {s.productId && `Product: ${s.productId}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-700 max-w-md break-words">{s.description}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">
                      {new Date(s.createdAt).toLocaleDateString('en-GB')}
                      <br />
                      {new Date(s.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {!isAdmin && s.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleUpdateStatus(s._id, 'completed')}
                            className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-all"
                            title="Approve"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(s._id, 'rejected')}
                            className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-all"
                            title="Reject"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 italic">
                          {s.status === 'pending' ? 'Needs User Action' : 'Handled'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} sx={{ width: '100%', borderRadius: '12px' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
