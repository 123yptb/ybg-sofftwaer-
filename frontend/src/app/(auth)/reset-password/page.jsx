"use client";

import { useState, useEffect } from "react";
import { LayoutGrid, ArrowRight, Lock, CheckCircle2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/actions/auth";
import toast from "react-hot-toast";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      toast.error("Invalid reset link");
      router.push("/login");
    }
  }, [token, email, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("token", token);
      formData.append("password", password);
      
      const result = await resetPassword(formData);
      
      if (result.success) {
        setSuccess(true);
        toast.success("Password updated successfully!");
        setTimeout(() => router.push("/login"), 3000);
      } else {
        toast.error(result.message || "Something went wrong");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117] p-4 text-slate-200">
        <div className="w-full max-w-md text-center">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="text-green-500" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Password Reset!</h1>
            <p className="text-slate-400">
              Your password has been successfully updated. Redirecting you to login...
            </p>
          </div>
          
          <Link 
            href="/login"
            className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Go to login now <ArrowRight size={16} />
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
            <h2 className="text-2xl font-semibold text-white">Create new password</h2>
            <p className="text-slate-400 text-sm mt-1">
              Your new password must be different from previous used passwords.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  className="w-full bg-[#0d1117] border border-slate-700 rounded-lg py-3 pl-10 pr-3 text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  className="w-full bg-[#0d1117] border border-slate-700 rounded-lg py-3 pl-10 pr-3 text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Reset Password <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
