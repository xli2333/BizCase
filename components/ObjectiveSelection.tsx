import React, { useState } from 'react';
import { CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface ObjectiveSelectionProps {
  objectives: string[];
  onSelect: (objective: string) => void;
  onRefine: (direction: string) => void;
  isRefining: boolean;
}

export const ObjectiveSelection: React.FC<ObjectiveSelectionProps> = ({ objectives, onSelect, onRefine, isRefining }) => {
  const [direction, setDirection] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleRefineSubmit = () => {
    if (!direction.trim()) return;
    onRefine(direction);
    setDirection('');
    // Note: We keep showCustomInput true so they can see the new results or try again
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in py-12 px-4 sm:px-6">
      <div className="text-center mb-12">
        <span className="text-report-accent font-bold tracking-wider text-sm uppercase mb-2 block">Step 2 of 4</span>
        <h2 className="text-3xl font-serif font-bold text-report-text mb-4">校准学习目标 (Learning Objective)</h2>
        <p className="text-gray-500 max-w-2xl mx-auto">
          基于前期研究，AI 识别了以下核心教学方向。请选择一个最符合您课程设计意图的目标。
        </p>
      </div>

      {/* List of Objectives */}
      <div className={`grid gap-4 mb-10 ${isRefining ? 'opacity-50 pointer-events-none' : ''}`}>
        {objectives.map((obj, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(obj)}
            className="group relative flex items-start gap-5 p-6 text-left bg-white rounded-xl border border-gray-200 shadow-sm hover:border-report-accent hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center group-hover:bg-report-accent group-hover:border-report-accent transition-colors font-mono text-sm text-gray-400 group-hover:text-white">
                {idx + 1}
              </div>
            </div>
            <div className="flex-1 pr-8">
              <p className="text-lg text-report-text group-hover:text-report-accent font-medium transition-colors leading-relaxed">
                {obj}
              </p>
            </div>
            <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity transition-transform group-hover:scale-110">
               <CheckCircleIcon className="w-6 h-6 text-report-accent" />
            </div>
          </button>
        ))}
      </div>

      {/* Refine / Custom Input */}
      <div className="bg-slate-50 rounded-xl border border-dashed border-gray-300 p-6">
        {!showCustomInput ? (
            <div 
                className="flex items-center justify-center gap-2 cursor-pointer text-report-secondary hover:text-report-accent transition-colors py-2"
                onClick={() => setShowCustomInput(true)}
            >
                <SparklesIcon className="w-5 h-5" />
                <span className="font-medium">没有合适的？告诉 AI 一个新方向</span>
            </div>
        ) : (
            <div className="animate-fade-in">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    请输入您期望的教学侧重点：
                </label>
                <textarea
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                    placeholder="例如：我想侧重于危机公关处理，或者是财务舞弊的识别技巧..."
                    className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-report-accent focus:border-transparent text-report-text mb-4"
                    rows={2}
                    disabled={isRefining}
                />
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => setShowCustomInput(false)}
                        className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium"
                        disabled={isRefining}
                    >
                        取消
                    </button>
                    <button 
                        onClick={handleRefineSubmit}
                        disabled={!direction.trim() || isRefining}
                        className="px-6 py-2 bg-report-accent text-white rounded-lg font-medium hover:bg-teal-800 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
                    >
                        {isRefining ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                思考中...
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-4 h-4" />
                                生成新目标
                            </>
                        )}
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};