'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { PINCODE_OPTIONS } from '@/app/constants/platforms';
import categoriesData from '../utils/categories_with_urls.json';
import CustomDropdown from '@/components/CustomDropdown';
import { Loader2, Check, X, RefreshCw, MessageSquare, Info, AlertCircle, Clock, Upload, ExternalLink } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Snackbar, Alert, Tooltip as MuiTooltip } from '@mui/material';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/SidebarContext';
import { useAuth } from '@/components/AuthProvider'; // NEW Import
import { SidebarOpenIcon } from '@/components/SidebarIcons';

function SuggestionsContent() {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const { isAdmin } = useAuth(); // Retrieve global auth state
  
  // State
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    pincode: '201303',
    category: '',
    groupId: '',
    productId: '',
    description: '',
    images: []
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

  // Handle Image Upload
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + formData.images.length > 3) {
      setToast({ open: true, message: 'Maximum 3 images allowed', severity: 'warning' });
      return;
    }
    
    files.forEach(file => {
      if (file.size > 2 * 1024 * 1024) {
        setToast({ open: true, message: 'Image must be less than 2MB', severity: 'warning' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, images: [...prev.images, reader.result] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

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
        setFormData(prev => ({ ...prev, groupId: '', productId: '', description: '', images: [] }));
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

  // Prevent row click when clicking action buttons
  const handleActionClick = (e, id, status) => {
    e.stopPropagation();
    handleUpdateStatus(id, status);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-neutral-900">
      {/* Top Fixed Header */}
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
          <h1 className="text-lg font-bold tracking-tight text-neutral-900">Suggestions</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={fetchSuggestions}
            className="p-2 text-gray-500 hover:text-neutral-900 hover:bg-gray-100 rounded-lg transition-all"
            title="Refresh List"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header Info */}
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
              <div className="md:col-span-3 space-y-1 mt-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description</label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-neutral-900 focus:outline-none transition-all min-h-[80px]"
                  placeholder="Describe the issue or suggestion..."
                />
              </div>
              <div className="md:col-span-3 space-y-2 mt-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Attachments (Optional, Max 3)</label>
                <div className="flex flex-wrap gap-4 items-center">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                      <img src={img} alt="preview" className="w-16 h-16 object-cover" />
                      <button 
                        type="button" 
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove Image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {formData.images.length < 3 && (
                    <label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer">
                      <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                      <Upload size={20} />
                    </label>
                  )}
                </div>
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
              <thead className="bg-gray-50/80 text-[10px] uppercase tracking-widest font-black text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-4 py-4 w-[180px]">Context</th>
                  <th className="px-4 py-4">Submitted</th>
                  {!isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={!isAdmin ? 5 : 4} className="px-6 py-12 text-center text-gray-400">
                      <Loader2 size={32} className="animate-spin mx-auto mb-2 opacity-20" />
                      Loading suggestions...
                    </td>
                  </tr>
                )}
                {!loading && suggestions.length === 0 && (
                  <tr>
                    <td colSpan={!isAdmin ? 5 : 4} className="px-6 py-12 text-center text-gray-400 italic">
                      No suggestions found.
                    </td>
                  </tr>
                )}
                {suggestions.map((s) => (
                  <tr 
                    key={s._id} 
                    onClick={() => setSelectedSuggestion(s)}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                  >
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
                    <td className="px-6 py-4 max-w-[200px]">
                      <p className="text-sm text-gray-700 truncate">{s.description}</p>
                      {s.images && s.images.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">{s.images.length} attachment(s)</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 max-w-[180px]">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                           <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold border border-gray-200">{s.pincode}</span>
                           <span className="text-xs text-gray-800 font-medium truncate" title={s.category}>{s.category}</span>
                        </div>
                        {(s.groupId || s.productId) && (
                           <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                               {s.groupId && <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 truncate max-w-[85px]" title={`Group: ${s.groupId}`}>G:{s.groupId}</span>}
                               {s.productId && <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100 truncate max-w-[85px]" title={`Product: ${s.productId}`}>P:{s.productId}</span>}
                           </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-[11px] text-gray-500">
                      {new Date(s.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    {!isAdmin && (
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/categories?pincode=${s.pincode}&category=${encodeURIComponent(s.category)}${s.groupId ? `&groupId=${s.groupId}` : ''}${s.productId ? `&productId=${s.productId}` : ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="Search in Categories"
                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 bg-white border border-gray-200 shadow-sm rounded-lg transition-all"
                          >
                            <ExternalLink size={16} />
                          </a>

                          {!isAdmin && s.status === 'pending' ? (
                            <div className="flex items-center gap-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => handleActionClick(e, s._id, 'completed')}
                                className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-all"
                                title="Approve"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={(e) => handleActionClick(e, s._id, 'rejected')}
                                className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-all"
                                title="Reject"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300 italic ml-2">
                              {s.status === 'pending' ? (!isAdmin ? '' : 'Needs User Action') : 'Handled'}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Suggestion Details Modal */}
      {selectedSuggestion && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in">
          <div 
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Info size={20} className="text-blue-500" />
                Suggestion Details
              </h3>
              <button 
                onClick={() => setSelectedSuggestion(null)} 
                className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-900 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 bg-gray-50">
               <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                  <div>
                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Status</span>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide inline-block",
                      selectedSuggestion.status === 'pending' && "bg-amber-100 text-amber-700",
                      selectedSuggestion.status === 'completed' && "bg-emerald-100 text-emerald-700",
                      selectedSuggestion.status === 'rejected' && "bg-rose-100 text-rose-700",
                    )}>
                      {selectedSuggestion.status}
                    </span>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Submitted At</span>
                    <span className="text-gray-900 font-medium">
                      {new Date(selectedSuggestion.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pincode</span>
                    <span className="text-gray-900 font-medium">{selectedSuggestion.pincode}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Category</span>
                    <span className="text-gray-900 font-medium">{selectedSuggestion.category}</span>
                  </div>
                  {(selectedSuggestion.groupId || selectedSuggestion.productId) && (
                    <div className="col-span-2 md:col-span-3 grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100 mt-2">
                      {selectedSuggestion.groupId && (
                        <div>
                          <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Group ID</span>
                          <span className="text-gray-900 font-mono text-xs font-bold bg-white px-2 py-1 border border-gray-200 rounded">{selectedSuggestion.groupId}</span>
                        </div>
                      )}
                      {selectedSuggestion.productId && (
                        <div>
                          <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Product ID</span>
                          <span className="text-gray-900 font-mono text-xs font-bold bg-white px-2 py-1 border border-gray-200 rounded">{selectedSuggestion.productId}</span>
                        </div>
                      )}
                    </div>
                  )}
               </div>

               <div>
                 <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</span>
                 <div className="bg-white p-4 rounded-xl border border-gray-100 text-gray-700 text-sm whitespace-pre-wrap leading-relaxed shadow-sm">
                   {selectedSuggestion.description}
                 </div>
               </div>

               {selectedSuggestion.images && selectedSuggestion.images.length > 0 && (
                 <div>
                   <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Attached Images</span>
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                     {selectedSuggestion.images.map((img, idx) => (
                       <a href={img} target="_blank" rel="noopener noreferrer" key={idx} className="block group aspect-square rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                         <img src={img} alt="attachment" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                       </a>
                     ))}
                   </div>
                 </div>
               )}
            </div>
            
            {/* Modal Actions */}
            {!isAdmin && selectedSuggestion.status === 'pending' && (
              <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-end gap-3 rounded-b-2xl">
                <button
                  onClick={() => { handleUpdateStatus(selectedSuggestion._id, 'rejected'); setSelectedSuggestion(null); }}
                  className="px-5 py-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg font-bold text-sm transition-all"
                >
                  Reject Suggestion
                </button>
                <button
                  onClick={() => { handleUpdateStatus(selectedSuggestion._id, 'completed'); setSelectedSuggestion(null); }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-all shadow-md flex items-center gap-2"
                >
                  <Check size={16} />
                  Approve Suggestion
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
    </div>
  );
}

export default function SuggestionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={48} className="animate-spin text-neutral-400 opacity-20" />
      </div>
    }>
      <SuggestionsContent />
    </Suspense>
  );
}
