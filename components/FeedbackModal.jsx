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
        className="bg-white rounded-xl w-full max-w-[480px] max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-neutral-900 p-5 flex justify-between items-center sticky top-0 z-10 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <MessageSquare size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Send Feedback</h2>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-neutral-900">
              Your Email *
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="email"
                required
                className="w-full h-[42px] pl-10 pr-4 rounded-md border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-colors placeholder:text-neutral-400"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@email.com"
                disabled={status === "loading"}
              />
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-semibold text-neutral-900">
              Contact Number *
            </label>
            <div className="relative">
              <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="tel"
                required
                className="w-full h-[42px] pl-10 pr-4 rounded-md border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-colors placeholder:text-neutral-400"
                value={formData.contactNumber}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                placeholder="+91 9876543210"
                disabled={status === "loading"}
              />
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-semibold text-neutral-900">
              Message * <span className="text-neutral-400 font-normal text-xs">( Note: )</span>
            </label>
            <textarea
              required
              rows={6}
              className="w-full px-4 py-3 rounded-md border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-colors placeholder:text-neutral-400 resize-none whitespace-pre-wrap"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Enter details like pincode, pid, gid, issue description..."
              disabled={status === "loading"}
            />
          </div>

          {status === "success" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
              <CheckCircle size={16} />
              Feedback sent successfully! Thank you.
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              <AlertCircle size={16} />
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className={cn(
              "w-full h-[42px] px-6 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md",
              status === "loading"
                ? "bg-neutral-400 text-white cursor-not-allowed"
                : "bg-neutral-900 text-white hover:bg-black"
            )}
          >
            {status === "loading" ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send size={16} />
                Send Feedback
              </>
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
