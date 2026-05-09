"use client";

import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password");
      } else {
        toast.success("Welcome back!");
        window.location.href = "/dashboard";
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 sm:p-8 shadow-2xl w-full animate-in zoom-in-95 duration-500">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
        <p className="text-sm text-slate-400">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5 text-left">
          <label className="block text-sm font-medium text-slate-300">
            Email address
          </label>
          <input
            type="email"
            required
            className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3.5 text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-300">
              Password
            </label>
            <Link href="/forgot-password" title="Click to reset password" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              Forgot?
            </Link>
          </div>
          <input
            type="password"
            required
            className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3.5 text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl py-3.5 shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.98] mt-4"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>Sign In <ArrowRight size={18} /></>
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-700/50">
        <div className="flex items-center justify-center gap-2 text-xs text-emerald-400/80 bg-emerald-500/10 py-2 rounded-lg border border-emerald-500/20 mb-4">
          <ShieldCheck size={14} />
          <span>Secure 256-bit encrypted connection</span>
        </div>
        <p className="text-slate-500 text-sm text-center">
          Don't have an account?{" "}
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
            Register your company
          </Link>
        </p>
      </div>
    </div>
  );
}
