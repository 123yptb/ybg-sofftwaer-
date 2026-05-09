"use client";

import { useState } from "react";
import { LayoutGrid, ArrowRight, Mail, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { forgotPassword } from "@/lib/actions/auth";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", email);
      
      const result = await forgotPassword(formData);
      
      if (result.success) {
        setSubmitted(true);
        toast.success("Reset link generated!");
      } else {
        toast.error(result.message || "Something went wrong");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117] p-4 text-slate-200">
        <div className="w-full max-w-md text-center">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="text-green-500" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
            <p className="text-slate-400">
              We've sent a password reset link to <span className="text-white font-medium">{email}</span>.
            </p>
            <p className="text-slate-500 text-sm mt-4 italic">
              (Note: In this development version, the link has also been logged to the server console.)
            </p>
          </div>
          
          <Link 
            href="/login"
            className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Return to login <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d1117] p-4 text-slate-200">
      <div className="w-full max-w-md">
        {/* LOGO SECTION */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
            <LayoutGrid className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-baseline gap-2">
            YBG <span className="text-indigo-500 text-lg font-medium">Gateway</span>
          </h1>
          <p className="text-slate-400 text-sm">Professional Accounting & ERP Platform</p>
        </div>

        {/* CARD */}
        <div className="bg-[#161b22] border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-white">Reset password</h2>
            <p className="text-slate-400 text-sm mt-1">
              Enter your email and we'll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  className="w-full bg-[#0d1117] border border-slate-700 rounded-lg py-3 pl-10 pr-3 text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg p-3 shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Send Reset Link <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* FOOTER */}
          <div className="text-center pt-6 mt-8 border-t border-slate-800">
            <Link
              href="/login"
              className="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
