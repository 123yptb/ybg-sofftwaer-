'use client';
import Link from 'next/link';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#060B14]">
      {/* Immersive Dark Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] rounded-full bg-indigo-600/10 blur-[150px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[120px] animate-pulse-slow" style={{animationDelay:'2s'}} />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[1000px] h-[400px] rounded-[100%] bg-violet-600/5 blur-[100px]" />
      </div>

      {/* Content Wrapper */}
      <div className="relative z-10 w-full max-w-[420px] px-4 py-12 flex flex-col items-center">
        
        {/* Animated 3D-like Logo */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-[0_0_40px_rgba(79,70,229,0.3)] mb-5 relative group">
            <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity blur-md" />
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="relative z-10">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex flex-col gap-1 items-center">
            YBG 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400 text-xl font-medium tracking-wide">
              Yield Business Gateway
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-3 font-medium uppercase tracking-widest opacity-80">
            Enterprise Cloud ERP
          </p>
        </div>

        {/* Dynamic Children Card */}
        {children}
        
      </div>
    </div>
  );
}
