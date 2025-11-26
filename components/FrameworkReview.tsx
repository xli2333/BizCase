
import React, { useState } from 'react';
import { SparklesIcon, CheckIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';
import { FormattedContent } from './CaseViewer';
import { SelectionMenu } from './SelectionMenu';
import * as GeminiService from '../services/geminiService';

interface FrameworkReviewProps {
  framework: string;
  objective: string;
  onApprove: () => void;
  onRefine: (feedback: string) => void;
  onUpdateFramework: (newFramework: string) => void;
  isRefining: boolean;
}

export const FrameworkReview: React.FC<FrameworkReviewProps> = ({ framework, objective, onApprove, onRefine, isRefining, onUpdateFramework }) => {
  const [feedback, setFeedback] = useState('');
  
  // Selection State
  const [selection, setSelection] = useState('');
  const [selectionPos, setSelectionPos] = useState<{x: number, y: number} | null>(null);
  const [isMenuLoading, setIsMenuLoading] = useState(false);

  const handleRefine = () => {
    if (!feedback.trim()) return;
    onRefine(feedback);
    setFeedback('');
  };

  const handleMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
          // Don't clear if clicking inside the menu
          return;
      }

      const text = sel.toString().trim();
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelection(text);
      setSelectionPos({
          x: rect.left + rect.width / 2,
          y: rect.top
      });
  };

  const closeMenu = () => {
      setSelectionPos(null);
      setSelection('');
      window.getSelection()?.removeAllRanges();
  };

  const handleSelectionRefine = async (instruction: string) => {
      if (!selection || !framework) return;
      setIsMenuLoading(true);
      try {
          const newFramework = await GeminiService.refineTextBySelection(
              framework,
              selection,
              instruction
          );
          onUpdateFramework(newFramework);
          closeMenu();
      } catch (e) {
          console.error("Selection refine failed", e);
      } finally {
          setIsMenuLoading(false);
      }
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in py-8 px-4 sm:px-6 min-h-screen flex flex-col">
      
      {/* Header */}
      <div className="text-center mb-8">
        <span className="text-report-accent font-bold tracking-wider text-sm uppercase mb-2 block">Step 3 of 4</span>
        <h2 className="text-3xl font-serif font-bold text-report-text">审阅案例框架 (Framework Review)</h2>
        <p className="text-gray-500 mt-2 max-w-2xl mx-auto">
           系统已经构建了核心故事线。请审阅下方的大纲。选中任意文本即可唤起 AI 进行局部微调。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        
        {/* Left: Framework Display */}
        <div 
            className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full max-h-[800px] relative"
            onMouseUp={handleMouseUp}
        >
            <div className="bg-slate-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                <span className="font-bold text-report-secondary text-sm">生成的框架预览</span>
                <span className="text-xs text-gray-400">Markdown 格式预览</span>
            </div>
            <div className="p-8 overflow-y-auto flex-1 bg-white">
                <FormattedContent content={framework} className="text-sm" />
            </div>
        </div>

        {/* Right: Actions & Chat */}
        <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* Objective Reminder */}
            <div className="bg-report-accent-light border border-teal-100 p-4 rounded-lg">
                <h4 className="text-report-accent font-bold text-xs uppercase mb-2">当前核心目标</h4>
                <p className="text-sm text-report-text font-medium leading-snug">{objective}</p>
            </div>

            {/* Refine Input */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-3 text-gray-700 font-bold">
                    <ChatBubbleBottomCenterTextIcon className="w-5 h-5" />
                    <h3>全局修改建议 (Refine)</h3>
                </div>
                <div className="flex-1 flex flex-col">
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="在此输入全局修改意见。&#10;若想修改特定部分，请直接在左侧正文中【选中该段文字】唤起 AI。"
                        className="w-full flex-1 p-4 border border-gray-200 rounded-lg text-sm mb-4 focus:ring-2 focus:ring-report-accent focus:border-transparent resize-none leading-relaxed"
                    />
                    <button
                        onClick={handleRefine}
                        disabled={isRefining || !feedback.trim()}
                        className="w-full py-3 bg-white border border-report-accent text-report-accent rounded-lg font-semibold hover:bg-report-accent-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isRefining ? (
                            <>
                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                正在重构框架...
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-4 h-4" />
                                提交全局意见
                            </>
                        )}
                    </button>
                    {isRefining && (
                        <p className="text-xs text-gray-400 text-center mt-2 animate-pulse">
                            AI 正在根据您的意见重新规划故事线...
                        </p>
                    )}
                </div>
            </div>

            {/* Approve Button */}
            <button
                onClick={onApprove}
                disabled={isRefining}
                className="w-full py-4 bg-report-accent text-white rounded-xl font-bold shadow-lg hover:bg-teal-800 hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
                <CheckIcon className="w-6 h-6" />
                批准框架并开始撰写
            </button>

        </div>

      </div>

      <SelectionMenu 
        position={selectionPos}
        selectedText={selection}
        onClose={closeMenu}
        onSubmit={handleSelectionRefine}
        isLoading={isMenuLoading}
      />
    </div>
  );
};
