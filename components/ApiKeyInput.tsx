import React, { useState, useRef, useEffect } from 'react';
import { ArrowRightIcon, SparklesIcon, LockClosedIcon } from '@heroicons/react/24/outline';

interface ApiKeyInputProps {
  onKeySet: () => void;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onKeySet }) => {
  const [inputKey, setInputKey] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    // Small delay to ensure smooth transition if mounting
    const timer = setTimeout(() => {
        inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Keep focus logic: Click anywhere to focus input
  const handleBackgroundClick = () => {
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim()) {
      localStorage.setItem('GEMINI_API_KEY', inputKey.trim());
      onKeySet();
    }
  };

  return (
    <div 
        onClick={handleBackgroundClick}
        className="fixed inset-0 z-[100] bg-slate-50 flex flex-col items-center justify-center overflow-hidden cursor-text transition-colors duration-700 selection:bg-teal-100 selection:text-teal-900"
    >
        {/* Abstract Background Decoration */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-teal-100/40 rounded-full blur-[120px] pointer-events-none mix-blend-multiply animate-fade-in" style={{animationDuration: '3s'}}></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-100/40 rounded-full blur-[120px] pointer-events-none mix-blend-multiply animate-fade-in" style={{animationDuration: '3s', animationDelay: '0.5s'}}></div>

        <div className="relative z-10 w-full max-w-5xl px-8 flex flex-col items-center text-center">
            
            {/* Brand / Header */}
            <div className={`transition-all duration-1000 ease-out transform ${inputKey ? 'translate-y-[-2vh] scale-90 opacity-60 blur-[1px]' : 'translate-y-0 opacity-100'}`}>
                <h1 className="font-serif font-black text-6xl md:text-9xl text-slate-900 tracking-tighter mb-2">
                    BizCase<span className="text-teal-600">.</span>Pro
                </h1>
                <p className="font-mono text-slate-400 text-sm md:text-base tracking-[0.3em] uppercase">
                    Case Study Intelligence Engine
                </p>
            </div>

            {/* Input Section */}
            <form onSubmit={handleSubmit} className="w-full mt-24 md:mt-32 relative group max-w-2xl mx-auto">
                <div className="relative">
                    {/* The Input */}
                    <input
                        ref={inputRef}
                        type="password"
                        value={inputKey}
                        onChange={(e) => setInputKey(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        className="w-full bg-transparent text-center font-serif text-4xl md:text-6xl text-slate-800 placeholder-slate-200 outline-none py-6 tracking-widest transition-all"
                        placeholder="KEY"
                        autoComplete="off"
                        spellCheck="false"
                    />
                    
                    {/* Animated Underline */}
                    <div className="h-[2px] w-full bg-slate-200/50 absolute bottom-0 left-0 overflow-hidden">
                        <div 
                            className={`h-full bg-slate-900 transition-transform duration-700 ease-out transform ${isFocused || inputKey ? 'translate-x-0' : '-translate-x-full'}`} 
                        />
                    </div>
                    
                    {/* Subtle Label that appears when typing */}
                    <div className={`absolute -top-8 left-0 w-full text-center transition-all duration-500 ${inputKey ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                        <span className="text-xs font-bold text-teal-600 uppercase tracking-widest flex items-center justify-center gap-2">
                            <LockClosedIcon className="w-3 h-3" />
                            Secure Access
                        </span>
                    </div>
                </div>

                {/* Action Area */}
                <div className={`mt-16 transition-all duration-700 flex flex-col items-center gap-6 ${inputKey ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
                     <button 
                        type="submit"
                        className="group relative flex items-center gap-4 px-10 py-5 bg-slate-900 text-white rounded-full font-bold text-lg tracking-wide hover:bg-teal-700 transition-all hover:scale-105 shadow-2xl hover:shadow-teal-900/20 active:scale-95"
                     >
                        <span>Initialize System</span>
                        <ArrowRightIcon className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        
                        {/* Button Glow */}
                        <div className="absolute inset-0 rounded-full ring-2 ring-white/20 group-hover:ring-white/40 transition-all"></div>
                     </button>
                     <p className="text-xs text-slate-400 font-mono">Press [ENTER] to confirm</p>
                </div>
            </form>

        </div>
        
        {/* Footer / Helper */}
        <div className={`absolute bottom-10 transition-all duration-700 ${inputKey ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'}`}>
             <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer" 
                className="group flex items-center gap-3 text-slate-400 hover:text-slate-900 transition-colors"
             >
                <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center group-hover:border-slate-900 group-hover:bg-slate-50 transition-all">
                    <SparklesIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest border-b border-transparent group-hover:border-slate-900">Get Gemini API Key</span>
             </a>
        </div>
    </div>
  );
};