import React, { useState, useRef, useEffect } from 'react';
import { CaseStudyData, GenerationState, GenerationStep, UploadedFile } from './types';
import * as GeminiService from './services/geminiService';
import { CaseViewer } from './components/CaseViewer';
import { ObjectiveSelection } from './components/ObjectiveSelection';
import { FrameworkReview } from './components/FrameworkReview';
import { ApiKeyInput } from './components/ApiKeyInput';
import { SettingsModal } from './components/SettingsModal';
import { MagnifyingGlassIcon, PaperClipIcon, DocumentTextIcon, XMarkIcon, LockOpenIcon, Cog6ToothIcon } from '@heroicons/react/24/solid';

const App: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [caseData, setCaseData] = useState<CaseStudyData>({
    topic: '',
    sources: [],
    context: '',
    objectives: [],
    selectedObjective: '',
    framework: '',
    caseContent: '',
    teachingNotes: ''
  });

  const [genState, setGenState] = useState<GenerationState>({
    step: GenerationStep.IDLE,
    progress: 0,
    message: ''
  });

  const [isRefiningFramework, setIsRefiningFramework] = useState(false);
  const [isRefiningObjectives, setIsRefiningObjectives] = useState(false);

  // --- API Key Gate ---
  const [hasApiKey, setHasApiKey] = useState(false);
  useEffect(() => {
    if (localStorage.getItem('GEMINI_API_KEY')) {
      setHasApiKey(true);
    }
  }, []);

  const handleClearKey = () => {
    if (confirm("Reset API Key and return to login screen?")) {
        localStorage.removeItem('GEMINI_API_KEY');
        setHasApiKey(false);
    }
  };

  if (!hasApiKey) {
    return <ApiKeyInput onKeySet={() => setHasApiKey(true)} />;
  }
  
  // ... rest of logic ...

  // --- File Handling ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        // Explicitly type as File[] to avoid 'unknown' inference
        const files: File[] = Array.from(e.target.files);
        const newFiles: UploadedFile[] = [];

        for (const file of files) {
            try {
                // Determine if we treat it as text or binary (PDF)
                // Gemini API handles PDF via inlineData (base64)
                const isPdf = file.type === 'application/pdf';
                const isText = !isPdf; // Treat everything else as text for simplicity (txt, md, csv)

                if (isPdf) {
                    const base64 = await readFileAsBase64(file);
                    newFiles.push({
                        name: file.name,
                        mimeType: file.type,
                        data: base64,
                        isText: false
                    });
                } else {
                    const text = await readFileAsText(file);
                    newFiles.push({
                        name: file.name,
                        mimeType: 'text/plain',
                        data: text,
                        isText: true
                    });
                }
            } catch (err) {
                console.error(`Failed to read file ${file.name}`, err);
            }
        }
        setUploadedFiles(prev => [...prev, ...newFiles]);
        // Reset input so same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
              const result = reader.result as string;
              // Remove "data:*/*;base64," prefix
              const base64 = result.split(',')[1];
              resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
      });
  };

  const readFileAsText = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
      });
  };

  // STEP 1: Start Research
  const handleStartResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setGenState({ step: GenerationStep.RESEARCHING, progress: 5, message: '正在启动全维深度研究...' });

    try {
      // Pass uploaded files to the service
      const { context, sources } = await GeminiService.gatherInformation(topic, uploadedFiles, (msg) => {
         let p = 10;
         if (msg.includes("量化")) p = 20;
         if (msg.includes("人文")) p = 35;
         setGenState(prev => ({ ...prev, message: msg, progress: p }));
      });

      setCaseData(prev => ({ ...prev, topic, context, sources }));
      setGenState({ step: GenerationStep.RESEARCHING, progress: 45, message: '正在提炼核心教学价值...' });

      const objectives = await GeminiService.generateLearningObjectives(context);
      setCaseData(prev => ({ ...prev, objectives }));
      setGenState({ step: GenerationStep.SELECTING_OBJECTIVE, progress: 50, message: '等待用户决策...' });

    } catch (error) {
      console.error(error);
      setGenState({ step: GenerationStep.ERROR, progress: 0, message: '研究阶段遇到问题，请重试。' });
    }
  };

  // STEP 2a: Refine Objectives
  const handleRefineObjectives = async (direction: string) => {
    setIsRefiningObjectives(true);
    try {
        const newObjectives = await GeminiService.refineLearningObjectives(caseData.context, direction);
        setCaseData(prev => ({ ...prev, objectives: newObjectives }));
    } catch (error) {
        console.error("Objective refinement failed", error);
    } finally {
        setIsRefiningObjectives(false);
    }
  };

  // STEP 2b: Select Objective -> Generate Framework
  const handleObjectiveSelect = async (objective: string) => {
    setCaseData(prev => ({ ...prev, selectedObjective: objective }));
    setGenState({ step: GenerationStep.REVIEW_FRAMEWORK, progress: 55, message: '正在构建案例叙事框架...' });

    try {
      const framework = await GeminiService.generateFramework(caseData.context, objective);
      setCaseData(prev => ({ ...prev, framework }));
    } catch (error) {
      console.error(error);
      setGenState({ step: GenerationStep.ERROR, progress: 0, message: '框架生成失败。' });
    }
  };

  // STEP 3: Refine Framework
  const handleRefineFramework = async (feedback: string) => {
    setIsRefiningFramework(true);
    try {
        const newFramework = await GeminiService.generateFramework(
            caseData.context, 
            caseData.selectedObjective!, 
            feedback, 
            caseData.framework
        );
        setCaseData(prev => ({ ...prev, framework: newFramework }));
    } catch (error) {
        console.error("Refine failed", error);
    } finally {
        setIsRefiningFramework(false);
    }
  };

  // Manual Update Handler (for AI Selection Edit)
  const handleUpdateFrameworkManual = (newFramework: string) => {
      setCaseData(prev => ({...prev, framework: newFramework}));
  };

  // STEP 4: Approve Framework -> Draft & Polish
  const handleApproveFramework = async () => {
    setGenState({ step: GenerationStep.DRAFTING, progress: 60, message: '正在撰写案例初稿...' });

    try {
      // 1. CASE CONTENT
      const rawCaseContent = await GeminiService.generateCaseContent(
          caseData.context, 
          caseData.selectedObjective!, 
          caseData.framework!
      );
      
      setGenState({ step: GenerationStep.DRAFTING, progress: 70, message: '资深编辑正在进行深度润色与排版...' });
      const polishedCaseContent = await GeminiService.polishCaseContent(rawCaseContent, (msg) => {
          setGenState(prev => ({...prev, message: `案例正文: ${msg}`}));
      });

      // EXTRACT TITLE FROM GENERATED CONTENT
      // We look for the first line starting with #
      const titleMatch = polishedCaseContent.match(/^#\s+(.+)$/m);
      const finalTitle = titleMatch ? titleMatch[1].trim() : caseData.topic;
      
      // 2. TEACHING NOTES
      setGenState({ step: GenerationStep.DRAFTING, progress: 85, message: '正在编制专业教学指南...' });
      const rawTeachingNotes = await GeminiService.generateTeachingNotes(
          caseData.context, 
          caseData.selectedObjective!, 
          polishedCaseContent
      );

      setGenState({ step: GenerationStep.DRAFTING, progress: 90, message: '教学指南: 正在进行最终格式合规审查...' });
      const polishedTeachingNotes = await GeminiService.polishTeachingNotes(rawTeachingNotes, (msg) => {
          setGenState(prev => ({...prev, message: `教学指南: ${msg}`}));
      });
      
      // 3. VISUAL AUDIT (Dedicated Chart Module)
      setGenState({ step: GenerationStep.DRAFTING, progress: 95, message: '正在构建商业图表与数据看板...' });
      
      const finalCaseContent = await GeminiService.generateAndAuditVisuals(polishedCaseContent, (msg) => {
          setGenState(prev => ({...prev, message: `图表构建(正文): ${msg}`}));
      });
      
      const finalTeachingNotes = await GeminiService.generateAndAuditVisuals(polishedTeachingNotes, (msg) => {
          setGenState(prev => ({...prev, message: `图表构建(教参): ${msg}`}));
      });

      setCaseData(prev => ({ 
          ...prev, 
          topic: finalTitle, // Update topic with the generated title
          caseContent: finalCaseContent, 
          teachingNotes: finalTeachingNotes 
      }));
      
      setGenState({ step: GenerationStep.COMPLETED, progress: 100, message: '生成完毕' });

    } catch (error) {
      console.error(error);
      setGenState({ step: GenerationStep.ERROR, progress: 0, message: '撰写过程中断。' });
    }
  };

  const handleReset = () => {
    setTopic('');
    setUploadedFiles([]); // Reset files
    setCaseData({
        topic: '',
        sources: [],
        context: '',
        objectives: [],
        selectedObjective: '',
        framework: '',
        caseContent: '',
        teachingNotes: ''
    });
    setGenState({ step: GenerationStep.IDLE, progress: 0, message: '' });
  };

  // Render Logic
  const isIdle = genState.step === GenerationStep.IDLE;
  const isProcessing = 
    genState.step === GenerationStep.RESEARCHING || 
    genState.step === GenerationStep.DRAFTING ||
    (genState.step === GenerationStep.REVIEW_FRAMEWORK && !caseData.framework);

  const isSelecting = genState.step === GenerationStep.SELECTING_OBJECTIVE;
  const isReviewing = genState.step === GenerationStep.REVIEW_FRAMEWORK && !!caseData.framework;
  const isCompleted = genState.step === GenerationStep.COMPLETED;
  const isError = genState.step === GenerationStep.ERROR;

  return (
      <div className="min-h-screen font-sans text-slate-900 bg-white">
        
        {/* Navigation */}
        <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="cursor-pointer group" onClick={handleReset}>
              <span className="font-serif font-bold text-2xl text-slate-900 tracking-tight hover:text-report-accent transition-colors">BizCase Pro</span>
            </div>
            
            <div className="flex items-center gap-6">
                {isProcessing && (
                  <div className="flex flex-col items-end mr-4">
                      <span className="text-xs font-bold text-report-accent uppercase tracking-wider mb-1 animate-pulse">{genState.message}</span>
                      <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                              className="h-full bg-gradient-to-r from-report-accent to-teal-400 transition-all duration-700 ease-out"
                              style={{ width: `${genState.progress}%` }}
                          />
                      </div>
                  </div>
                )}
                
                <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors uppercase tracking-widest"
                    title="Model Settings"
                >
                    <Cog6ToothIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Settings</span>
                </button>

                <button 
                    onClick={handleClearKey}
                    className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-red-500 transition-colors uppercase tracking-widest"
                    title="Disconnect API Key"
                >
                    <LockOpenIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Disconnect</span>
                </button>
            </div>
          </div>
        </nav>

        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

        <main className="mx-auto w-full">
          {isIdle && (
            <div className="max-w-3xl mx-auto px-6 py-32 text-center animate-fade-in">
              
              <h1 className="text-5xl md:text-6xl font-serif font-bold text-slate-900 mb-6 tracking-tight leading-tight">
                  构建专业级<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-report-accent to-teal-500">商业教学案例</span>
              </h1>
              <p className="text-lg text-slate-500 mb-12 leading-relaxed max-w-2xl mx-auto">
                  多智能体深度研究、数据量化分析与专家级润色引擎，为您一键生成可直接出版的教学案例与教参。
              </p>
              
              <div className="relative bg-white p-2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] ring-1 ring-slate-100 transform hover:-translate-y-1 transition-all duration-300 group">
                <form onSubmit={handleStartResearch} className="relative flex flex-col">
                  
                  {/* Text Input Row */}
                  <div className="flex items-center w-full relative">
                    <MagnifyingGlassIcon className="absolute left-6 w-6 h-6 text-slate-400 group-focus-within:text-report-accent transition-colors" />
                    <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="输入公司、事件或商业议题 (例如: 瑞幸咖啡财务造假)..."
                        className="w-full py-5 pl-16 pr-44 text-lg bg-transparent border-none focus:ring-0 text-slate-800 placeholder:text-slate-300 outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!topic.trim()}
                        className="absolute right-2 top-2 bottom-2 px-8 bg-report-accent hover:bg-teal-800 text-white rounded-xl font-bold text-base tracking-wide shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
                    >
                        开始生成
                    </button>
                  </div>

                  {/* Divider */}
                  {uploadedFiles.length > 0 && (
                      <div className="h-px bg-gray-100 mx-4"></div>
                  )}

                  {/* File List */}
                  {uploadedFiles.length > 0 && (
                      <div className="px-6 py-3 bg-slate-50 flex flex-wrap gap-2 text-left">
                          {uploadedFiles.map((file, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm text-sm">
                                  <DocumentTextIcon className="w-4 h-4 text-report-accent" />
                                  <span className="text-slate-700 font-medium max-w-[150px] truncate" title={file.name}>{file.name}</span>
                                  <button 
                                    type="button" 
                                    onClick={() => removeFile(idx)} 
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                      <XMarkIcon className="w-4 h-4" />
                                  </button>
                              </div>
                          ))}
                      </div>
                  )}

                  {/* Upload Trigger Area */}
                  <div className="border-t border-gray-100 bg-gray-50/50 rounded-b-2xl px-4 py-2 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".pdf,.txt,.md,.csv" 
                            multiple 
                            className="hidden" 
                        />
                        <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-report-accent transition-colors py-1 px-2 rounded hover:bg-white"
                        >
                            <PaperClipIcon className="w-4 h-4" />
                            <span>上传资料库 (PDF/TXT) - AI 将优先参考</span>
                        </button>
                     </div>
                     <span className="text-[10px] text-gray-400 font-medium">支持多文件 • 优先权高于网络搜索</span>
                  </div>
                </form>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 animate-fade-in text-center">
                <div className="relative w-24 h-24 mb-10">
                    <div className="absolute inset-0 border-t-4 border-report-accent rounded-full animate-spin"></div>
                    <div className="absolute inset-3 border-t-4 border-teal-300 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                </div>
                <h3 className="text-3xl font-serif font-bold text-slate-800 mb-3">智能引擎运行中</h3>
                <p className="text-slate-500 text-lg font-light max-w-md">{genState.message}</p>
            </div>
          )}

          {isSelecting && (
            <ObjectiveSelection 
                objectives={caseData.objectives} 
                onSelect={handleObjectiveSelect}
                onRefine={handleRefineObjectives}
                isRefining={isRefiningObjectives} 
            />
          )}

          {isReviewing && (
              <FrameworkReview
                  framework={caseData.framework!}
                  objective={caseData.selectedObjective!}
                  onApprove={handleApproveFramework}
                  onRefine={handleRefineFramework}
                  onUpdateFramework={handleUpdateFrameworkManual}
                  isRefining={isRefiningFramework}
              />
          )}

          {isError && (
            <div className="max-w-xl mx-auto mt-20 p-8 bg-red-50 text-red-900 rounded-2xl border border-red-100 text-center shadow-lg">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">!</span>
                </div>
                <h3 className="text-xl font-bold mb-2">系统繁忙</h3>
                <p className="mb-8 text-red-700 opacity-80">{genState.message}</p>
                <button onClick={handleReset} className="px-6 py-2 bg-white border border-red-200 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors">
                  重试
                </button>
            </div>
          )}

          {isCompleted && (
              <CaseViewer 
                data={caseData} 
                onReset={handleReset} 
                onUpdateContent={(t) => setCaseData(prev => ({...prev, caseContent: t}))}
                onUpdateTeachingNotes={(t) => setCaseData(prev => ({...prev, teachingNotes: t}))}
              />
          )}

        </main>
      </div>
  );
};

export default App;