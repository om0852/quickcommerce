"use client";
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, Send, CheckCircle, AlertCircle, Loader2, X, Phone, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FeedbackModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({ email: "", contactNumber: "", message: "" });
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setStatus("success");
      setFormData({ email: "", contactNumber: "", message: "" });
      setTimeout(() => {
        setStatus("idle");
        onClose();
      }, 2000);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Failed to send feedback");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  const handleClose = () => {
    if (status === "loading") return;
    setStatus("idle");
    setErrorMsg("");
    setFormData({ email: "", contactNumber: "", message: "" });
    onClose();
  };

  if (!isOpen) return null;

  // Ensure this only runs on the client to avoid hydration mismatch
  if (typeof window === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-[480px] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-neutral-900 px-4 py-3 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-white/80" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Send Feedback</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Area */}
        <div className="max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            <p className="text-[11px] text-neutral-500 leading-relaxed bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
              Need help? Reach out to Malav — <span className="text-neutral-700 font-semibold">+91-9665047289</span> or <span className="text-neutral-700 font-semibold">malav@creatosaurus.io</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-[11px] font-bold text-neutral-400 uppercase tracking-tight">
                  Your Email *
                </label>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="email"
                    required
                    className="w-full h-9 pl-9 pr-3 rounded-md border border-neutral-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-colors placeholder:text-neutral-400"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@email.com"
                    disabled={status === "loading"}
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-[11px] font-bold text-neutral-400 uppercase tracking-tight">
                  Contact Number *
                </label>
                <div className="relative">
                  <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="tel"
                    required
                    className="w-full h-9 pl-9 pr-3 rounded-md border border-neutral-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-colors placeholder:text-neutral-400"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                    placeholder="+91 9876543210"
                    disabled={status === "loading"}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block mb-1 text-[11px] font-bold text-neutral-400 uppercase tracking-tight">
                Message *
              </label>
              <textarea
                required
                rows={4}
                className="w-full px-3 py-2 rounded-md border border-neutral-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-colors placeholder:text-neutral-400 resize-none whitespace-pre-wrap"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter details like pincode, pid, gid, issue description..."
                disabled={status === "loading"}
              />
              <div className="mt-2 p-2 bg-blue-50/50 rounded border border-blue-100/50">
                <p className="text-[10px] text-blue-700/70 font-medium mb-1 flex items-center gap-1">
                  <AlertCircle size={10} />
                  Tips for faster resolution:
                </p>
                <ul className="text-[9px] text-blue-600/60 space-y-0.5 list-disc pl-3">
                  <li>Include Pincode, Category, Date & PIDs for merging issues.</li>
                  <li>Attach screenshots/references for bugs or feature requests.</li>
                  <li>Describe the issue with as much detail as possible.</li>
                </ul>
              </div>
            </div>

            {status === "success" && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium animate-in fade-in slide-in-from-top-1">
                <CheckCircle size={14} />
                Feedback sent successfully! Thank you.
              </div>
            )}

            {status === "error" && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium animate-in fade-in slide-in-from-top-1">
                <AlertCircle size={14} />
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className={cn(
                "w-full h-10 px-6 rounded-md font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]",
                status === "loading"
                  ? "bg-neutral-400 text-white cursor-not-allowed"
                  : "bg-neutral-900 text-white hover:bg-black cursor-pointer"
              )}
            >
              {status === "loading" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Send Feedback
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
