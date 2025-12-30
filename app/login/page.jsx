"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(data?.error || "Invalid credentials");
      }
    } catch {
      setError("Authentication service unavailable");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page">
      {/* LEFT PANEL */}
      <aside className="brand-panel">
        <div>
          <h2>QuickCommerce</h2>
          <p>Internal Access Portal</p>
        </div>
        <span className="meta">• Protected Workspace</span>
      </aside>

      {/* RIGHT PANEL */}
      <main className="form-panel">
        <div className="form-card">
          <header>
            <span className="tag">SIGN IN</span>
            <h1>Welcome back</h1>
            <p>Authenticate to continue</p>
          </header>

          <form onSubmit={handleLogin}>
            <div className="field">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="field">
              <label>Password</label>

              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="eye-btn"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <div className="error">{error}</div>}

            <button className="submit" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <>
                  Continue <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      <style jsx global>{`
        /* ---------- FONT UPLIFT ---------- */
        @import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap");

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: "IBM Plex Sans", system-ui, sans-serif;
          background: #0a0a0a;
          color: #fff;
        }

        /* ---------- LAYOUT ---------- */
        .page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1.1fr 1fr;
        }

        .brand-panel {
          background: #000;
          padding: 4rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-right: 1px solid #1a1a1a;
        }

        .brand-panel h2 {
          font-size: 26px;
          letter-spacing: 0.3em;
          font-weight: 500;
        }

        .brand-panel p {
          color: #888;
          font-size: 14px;
          margin-top: 0.75rem;
        }

        .meta {
          font-size: 11px;
          color: #555;
          letter-spacing: 0.15em;
        }

        .form-panel {
          background: #0f0f0f;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .form-card {
          width: 100%;
          max-width: 420px;
          padding: 3.5rem;
          border: 1px solid #1f1f1f;
          background: #0f0f0f;
        }

        /* ---------- HEADER ---------- */
        header {
          margin-bottom: 2.5rem;
        }

        .tag {
          font-size: 11px;
          letter-spacing: 0.2em;
          color: #777;
        }

        header h1 {
          font-size: 22px;
          font-weight: 500;
          margin: 0.75rem 0 0.5rem;
        }

        header p {
          font-size: 13px;
          color: #777;
        }

        /* ---------- FORM ---------- */
        form {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .field label {
          font-size: 12px;
          color: #aaa;
          margin-bottom: 6px;
          display: block;
        }

        .field input {
          width: 100%;
          height: 46px;
          background: #0a0a0a;
          border: 1px solid #2a2a2a;
          color: #fff;
          padding: 0 14px;
          font-size: 14px;
          outline: none;
          transition: border 0.2s ease;
        }

        .field input:focus {
          border-color: #fff;
        }

        .password-field {
          position: relative;
        }

        .password-field input {
          padding-right: 44px;
        }

        .eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
        }

        .eye-btn:hover {
          color: #fff;
        }

        /* ---------- ERROR ---------- */
        .error {
          font-size: 12px;
          padding: 10px;
          border: 1px solid #333;
          background: #111;
          color: #fff;
          text-align: center;
        }

        /* ---------- BUTTON ---------- */
        .submit {
          height: 48px;
          background: #fff;
          color: #000;
          border: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: opacity 0.2s ease;
        }

        .submit:hover:not(:disabled) {
          opacity: 0.9;
        }

        .submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* ---------- MOBILE ---------- */
        @media (max-width: 900px) {
          .page {
            grid-template-columns: 1fr;
          }

          .brand-panel {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
