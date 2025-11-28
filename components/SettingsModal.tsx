import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [genModel, setGenModel] = useState('gemini-3-pro-preview');
  const [searchModel, setSearchModel] = useState('gemini-2.5-flash');

  useEffect(() => {
    if (isOpen) {
      setGenModel(localStorage.getItem('GEN_MODEL') || 'gemini-3-pro-preview');
      setSearchModel(localStorage.getItem('SEARCH_MODEL') || 'gemini-2.5-flash');
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('GEN_MODEL', genModel);
    localStorage.setItem('SEARCH_MODEL', searchModel);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100 ring-1 ring-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-serif font-bold text-slate-900">模型配置</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Main Generation Model */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              核心写作模型 (Main Generation)
            </label>
            <select
              value={genModel}
              onChange={(e) => setGenModel(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:ring-2 focus:ring-report-accent/50 focus:border-report-accent outline-none appearance-none"
            >
              <option value="gemini-3-pro-preview">Gemini 3.0 Preview (推荐)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            </select>
            <p className="text-[10px] text-slate-400">
              负责案例撰写、框架生成与教学指南编制。3.0 版本逻辑更强，2.5 版本速度更快。
            </p>
          </div>

          {/* Search Model */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              深度搜索模型 (Deep Research)
            </label>
            <select
              value={searchModel}
              onChange={(e) => setSearchModel(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:ring-2 focus:ring-report-accent/50 focus:border-report-accent outline-none appearance-none"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (快速)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (深度)</option>
            </select>
            <p className="text-[10px] text-slate-400">
              负责前期的全维信息搜集。Pro 版本推理能力更强，Flash 版本响应更迅速。
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-lg transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
};
