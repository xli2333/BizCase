
import React, { useState, useEffect } from 'react';
import { LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

interface PasswordGateProps {
  children: React.ReactNode;
}

// 2025FDSM encoded in Base64 to avoid plain text in source code
const AUTH_HASH = 'MjAyNUZEU00=';
const SESSION_KEY = 'bizcase_auth_token';

export const PasswordGate: React.FC<PasswordGateProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check session storage on load
    const token = sessionStorage.getItem(SESSION_KEY);
    if (token === AUTH_HASH) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Simple Base64 verification
    try {
      if (btoa(input) === AUTH_HASH) {
        sessionStorage.setItem(SESSION_KEY, AUTH_HASH);
        setIsAuthenticated(true);
      } else {
        setError('Access Denied: Invalid Credentials');
        setInput('');
      }
    } catch (e) {
      setError('Validation Error');
    }
  };

  if (isLoading) return null;

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="bg-slate-50 px-8 py-8 border-b border-slate-100 text-center">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <ShieldCheckIcon className="w-8 h-8 text-teal-400" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">
                BizCase Pro
            </h1>
            <p className="text-slate-500 text-sm mt-2 uppercase tracking-widest font-semibold">
                Authorized Access Only
            </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-8">
            <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Security Key
                </label>
                <div className="relative">
                    <LockClosedIcon className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                        type="password" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Enter access code..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-slate-900 transition-all placeholder:text-slate-400"
                        autoFocus
                    />
                </div>
            </div>

            {error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg text-xs font-bold text-red-600 text-center animate-pulse">
                    {error}
                </div>
            )}

            <button 
                type="submit"
                disabled={!input}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-teal-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
            >
                Verify & Enter
            </button>
        </form>

        <div className="bg-slate-50 py-4 px-8 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-mono">SECURE CONNECTION</span>
            <span className="text-[10px] text-slate-400 font-mono">v2.5.0</span>
        </div>
      </div>
    </div>
  );
};
