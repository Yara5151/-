import React, { useState, useEffect } from 'react';
import { EssayType, GradingResult, HistoryRecord } from './types';
import { FileUpload } from './components/FileUpload';
import { ResultView } from './components/ResultView';
import { HistoryModal } from './components/HistoryModal';
import { gradeEssay } from './services/geminiService';
import { getHistory, saveHistory, deleteHistoryItem } from './services/historyService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<EssayType>(EssayType.BIG);
  const [topicText, setTopicText] = useState('');
  const [topicImage, setTopicImage] = useState<string | null>(null);
  const [essayText, setEssayText] = useState('');
  const [essayImage, setEssayImage] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // History State
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    // Load history on mount
    const savedHistory = getHistory();
    setHistory(savedHistory);
  }, []);

  const handleGrade = async () => {
    if ((!topicText && !topicImage) || (!essayText && !essayImage)) {
      setError("请提供题目描述和作文内容（支持文本或图片）。");
      return;
    }

    setLoading(true);
    setError(null);

    // Find previous drafts for the same topic to allow revision comparison
    const relevantHistory = topicText 
      ? history
          .filter(h => h.type === activeTab && h.topicText === topicText)
          .sort((a, b) => b.timestamp - a.timestamp) // Newest first
          .slice(0, 3) // Take up to 3 previous attempts
      : [];

    try {
      const data = await gradeEssay(activeTab, topicText, topicImage, essayText, essayImage, relevantHistory);
      setResult(data);

      // Save to History (Excluding large image strings to save localStorage space)
      const newRecord: HistoryRecord = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        type: activeTab,
        topicText: topicText || (topicImage ? '[图片题目]' : '[无文本]'),
        essayText: essayText || (essayImage ? '[图片作文]' : '[无文本]'),
        result: data,
        hasImages: !!(topicImage || essayImage)
      };
      
      const updatedHistory = saveHistory(newRecord);
      setHistory(updatedHistory);

    } catch (err) {
      setError("批改失败，请重试或检查您的 API Key。");
    } finally {
      setLoading(false);
    }
  };

  // Resets everything for a fresh start
  const handleClear = () => {
    setResult(null);
    setTopicText('');
    setEssayText('');
    setTopicImage(null);
    setEssayImage(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Goes back to edit mode keeping the current text (for OCR fixes or revisions)
  const handleEdit = () => {
    setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Note: topicText, essayText, etc., are preserved in state
  };

  const handleSelectHistory = (record: HistoryRecord) => {
    setResult(record.result);
    setActiveTab(record.type);
    setTopicText(record.topicText);
    setEssayText(record.essayText);
    // Note: We cannot restore images from history as we don't save them to localStorage
    setTopicImage(null); 
    setEssayImage(null);
    setIsHistoryOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistory = (id: string) => {
    const updated = deleteHistoryItem(id);
    setHistory(updated);
  };

  // Helper to handle paste in text areas
  const handleTextAreaPaste = (e: React.ClipboardEvent, isTopic: boolean) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            if (isTopic) {
              setTopicImage(base64);
            } else {
              setEssayImage(base64);
            }
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={handleClear}>
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">K</div>
             <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 hidden sm:block">
               考研英语作文智能批改
             </h1>
             <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 sm:hidden">
               KyEnglish
             </h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors bg-slate-50 hover:bg-indigo-50 px-3 py-2 rounded-lg"
            >
              <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              历史记录
            </button>
            <div className="text-sm font-medium text-slate-400 border-l pl-4 border-slate-200 hidden sm:block">
              北京地区阅卷标准
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {!result ? (
          <div className="space-y-8 animate-fade-in">
             <div className="text-center space-y-2 mb-10">
                <h2 className="text-3xl font-extrabold text-slate-900">英语一作文专业评分</h2>
                <p className="text-slate-500 max-w-2xl mx-auto">
                  上传题目和你的作文。AI 将严格按照北京地区评分标准进行分析，识别得分点，纠正语法错误，并提供范文和针对性练习。
                </p>
             </div>

             {/* Tab Selection */}
             <div className="flex justify-center mb-8">
               <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 inline-flex">
                 <button 
                   onClick={() => setActiveTab(EssayType.BIG)}
                   className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === EssayType.BIG ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                 >
                   英语一大作文 (20分)
                 </button>
                 <button 
                   onClick={() => setActiveTab(EssayType.SMALL)}
                   className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === EssayType.SMALL ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                 >
                   英语一小作文 (10分)
                 </button>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Topic Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                   <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                     <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-sm">1</span>
                     作文题目
                   </h3>
                   <div className="space-y-4">
                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">题目描述 (文本)</label>
                       <textarea 
                         className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm min-h-[120px]"
                         placeholder="在此粘贴题目要求或描述 (支持直接粘贴图片)"
                         value={topicText}
                         onChange={(e) => setTopicText(e.target.value)}
                         onPaste={(e) => handleTextAreaPaste(e, true)}
                       />
                     </div>
                     <div className="relative">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-white px-2 text-xs text-slate-500 uppercase">或上传题目图片</span>
                        </div>
                     </div>
                     {/* Using a key to force re-render if we want to clear file name when image is null */}
                     <FileUpload 
                       label="题目图片" 
                       onFileSelect={setTopicImage} 
                       key={`topic-${topicImage ? 'has' : 'no'}-img`} 
                     />
                     {topicImage && (
                        <p className="text-xs text-green-600 flex items-center mt-1">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          图片已就绪
                        </p>
                     )}
                   </div>
                </div>

                {/* Essay Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                   <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                     <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3 text-sm">2</span>
                     你的作文
                   </h3>
                   <div className="space-y-4">
                     <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">作文内容 (文本)</label>
                       <textarea 
                         className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm min-h-[120px]"
                         placeholder="在此输入或粘贴你的作文 (支持直接粘贴图片)"
                         value={essayText}
                         onChange={(e) => setEssayText(e.target.value)}
                         onPaste={(e) => handleTextAreaPaste(e, false)}
                       />
                     </div>
                     <div className="relative">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center">
                          <span className="bg-white px-2 text-xs text-slate-500 uppercase">或上传手写图片</span>
                        </div>
                     </div>
                     <FileUpload 
                       label="手写作文图片" 
                       onFileSelect={setEssayImage} 
                       key={`essay-${essayImage ? 'has' : 'no'}-img`}
                     />
                     {essayImage && (
                        <p className="text-xs text-green-600 flex items-center mt-1">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          图片已就绪
                        </p>
                     )}
                   </div>
                </div>
             </div>

             {error && (
               <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center">
                 <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                 {error}
               </div>
             )}

             <div className="flex justify-center pt-4">
               <button 
                 onClick={handleGrade}
                 disabled={loading}
                 className={`
                   px-10 py-4 rounded-xl text-lg font-bold text-white shadow-xl transform transition-all 
                   ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105 hover:shadow-2xl'}
                 `}
               >
                 {loading ? (
                   <span className="flex items-center">
                     <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     正在专业批改中...
                   </span>
                 ) : (
                   "开始智能批改"
                 )}
               </button>
             </div>
          </div>
        ) : (
          <ResultView 
            result={result} 
            type={activeTab} 
            onClear={handleClear} 
            onEdit={handleEdit}
            essayText={essayText}
          />
        )}

      </main>

      <HistoryModal 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={handleSelectHistory}
        onDelete={handleDeleteHistory}
      />

      <footer className="bg-white border-t border-slate-200 py-8 mt-12">
        <div className="max-w-5xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>© {new Date().getFullYear()} KyEnglish Grader. 严格遵循北京地区阅卷标准。</p>
          <p className="mt-2">AI 批改结果仅供参考，请结合实际情况使用。</p>
        </div>
      </footer>
    </div>
  );
};

export default App;