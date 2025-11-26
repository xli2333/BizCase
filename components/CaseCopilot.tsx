
import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, XMarkIcon, SparklesIcon, UserCircleIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import * as GeminiService from '../services/geminiService';

interface CaseCopilotProps {
  caseContent: string;
  teachingNotes: string;
  onRequestRefine: (target: 'case' | 'notes', instruction: string) => void;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  isAction?: boolean; // If true, visual distinction for "I updated the doc"
}

export const CaseCopilot: React.FC<CaseCopilotProps> = ({ 
    caseContent, 
    teachingNotes, 
    onRequestRefine,
    onClose 
}) => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: '你好！我是您的专属案例编辑。我可以帮您修改正文、润色语言或添加数据表格。请直接告诉我您需要调整哪里。（例如：“把第一段的背景描述改得更紧迫一点” 或 “在财务部分加一个收入对比表”）' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        
        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            // Prepare history for Gemini (excluding action messages or internal flags)
            const history = messages
                .filter(m => !m.isAction)
                .map(m => ({
                    role: m.role,
                    parts: [{ text: m.text }]
                }));

            const response = await GeminiService.chatWithEditor(
                caseContent, 
                teachingNotes, 
                history, 
                userMsg
            );

            // 1. Handle Refinement Request (Triggers full pipeline)
            if (response.refinementRequest) {
                // Determine 'case' or 'notes' for the handler
                const target = response.refinementRequest.target === 'teaching_notes' ? 'notes' : 'case';
                
                // Add a system message indicating we are starting the job
                setMessages(prev => [...prev, { 
                    role: 'model', 
                    text: '⚙️ 正在启动深度重构引擎，请稍候...', 
                    isAction: true 
                }]);

                // Trigger the parent's overlay process
                // This is async, but we don't await it here to block the UI, 
                // the parent handles the blocking overlay.
                onRequestRefine(target, response.refinementRequest.instruction);
            }

            // 2. Add text response if exists
            if (response.text) {
                setMessages(prev => [...prev, { role: 'model', text: response.text }]);
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', text: '抱歉，连接中断，请重试。' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[450px] bg-white shadow-2xl flex flex-col animate-slide-in-right border-l border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50">
                <div className="flex items-center gap-2 text-slate-800">
                    <SparklesIcon className="w-5 h-5 text-report-accent" />
                    <h3 className="font-bold font-serif text-lg">AI 智能编辑</h3>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
                    <XMarkIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {messages.map((msg, idx) => (
                    <div 
                        key={idx} 
                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-200' : 'bg-report-accent text-white'}`}>
                            {msg.role === 'user' ? <UserCircleIcon className="w-5 h-5 text-gray-500" /> : <ComputerDesktopIcon className="w-5 h-5" />}
                        </div>
                        
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                            msg.role === 'user' 
                                ? 'bg-white text-slate-800 border border-gray-100' 
                                : msg.isAction 
                                    ? 'bg-blue-50 text-blue-700 border border-blue-100 font-bold italic'
                                    : 'bg-white text-slate-700 border border-gray-100'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-report-accent text-white flex items-center justify-center">
                            <ComputerDesktopIcon className="w-5 h-5" />
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="描述您的修改意见，例如：把第三段关于CEO的描述改得更具有领导力..."
                        className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-report-accent focus:border-transparent resize-none text-sm shadow-inner"
                        rows={2}
                        disabled={isLoading}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 bottom-2 p-2 bg-report-accent text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 shadow-sm"
                    >
                        <PaperAirplaneIcon className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-center text-[10px] text-gray-400 mt-2">
                    AI 可自动触发全流程深度编辑与格式审查。
                </p>
            </div>
        </div>
    );
};
