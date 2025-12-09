import React, { useState, useRef, useEffect } from 'react';
import { GradingResult, EssayType, ChatMessage } from '../types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { chatWithExaminer } from '../services/geminiService';

interface ResultViewProps {
  result: GradingResult;
  type: EssayType;
  onClear: () => void; // Reset completely
  onEdit: () => void; // Go back to edit text
  essayText: string;
}

export const ResultView: React.FC<ResultViewProps> = ({ result, type, onClear, onEdit, essayText }) => {
  const isBig = type === EssayType.BIG;
  
  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isChatLoading) return;

    const newUserMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: Date.now()
    };

    setChatHistory(prev => [...prev, newUserMessage]);
    setInputMessage('');
    setIsChatLoading(true);

    try {
      const responseText = await chatWithExaminer(result, essayText, [...chatHistory, newUserMessage], newUserMessage.content);
      const newAiMessage: ChatMessage = {
        role: 'assistant',
        content: responseText,
        timestamp: Date.now()
      };
      setChatHistory(prev => [...prev, newAiMessage]);
    } catch (error) {
      console.error("Chat failed", error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const chartData = [
    { subject: '语言准确', A: result.breakdown.languageAccuracy, fullMark: isBig ? 5 : 3 },
    { subject: '内容完整', A: result.breakdown.contentCompleteness, fullMark: isBig ? 5 : 3 },
    { subject: '语言地道', A: result.breakdown.languageAuthenticity, fullMark: isBig ? 5 : 2 },
    { subject: '结构逻辑', A: result.breakdown.structureCoherence, fullMark: isBig ? 4 : 1 },
    { subject: '卷面印象', A: result.breakdown.neatness, fullMark: 1 },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* 1. Score Header Card */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden relative">
        <div className="bg-slate-900 p-8 text-white relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-indigo-600 text-xs font-bold px-2 py-1 rounded text-white uppercase tracking-wider">
                  Beijing Standard
                </span>
                <span className="text-slate-400 text-sm font-medium">
                  {type === EssayType.BIG ? '英语一大作文 (20分)' : '英语一小作文 (10分)'}
                </span>
              </div>
              <h2 className="text-3xl font-bold">阅卷模拟评分报告</h2>
            </div>
            <div className="flex items-baseline bg-slate-800/50 px-6 py-3 rounded-2xl border border-slate-700">
              <span className="text-6xl font-extrabold text-yellow-400 tracking-tighter mr-2">
                {result.totalScore}
              </span>
              <span className="text-xl text-slate-400 font-medium">
                / {result.maxScore} 分
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown & Chart Area */}
        <div className="p-8 grid grid-cols-1 lg:grid-cols-5 gap-12 bg-white">
           {/* Chart */}
           <div className="lg:col-span-2 flex flex-col items-center justify-center">
             <div className="w-full aspect-square max-w-[280px] relative">
               <ResponsiveContainer width="100%" height="100%">
                 <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                   <PolarGrid stroke="#e2e8f0" />
                   <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                   <PolarRadiusAxis angle={30} domain={[0, isBig ? 5 : 3]} tick={false} />
                   <Radar
                     name="得分"
                     dataKey="A"
                     stroke="#4f46e5"
                     strokeWidth={3}
                     fill="#6366f1"
                     fillOpacity={0.5}
                   />
                 </RadarChart>
               </ResponsiveContainer>
             </div>
           </div>

           {/* Detailed Scores */}
           <div className="lg:col-span-3 space-y-5">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">得分详情 Breakdown</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ScoreItem label="语言准确性" score={result.breakdown.languageAccuracy} max={isBig ? 5 : 3} icon="🎯" />
                <ScoreItem label="内容完整性" score={result.breakdown.contentCompleteness} max={isBig ? 5 : 3} icon="📝" />
                <ScoreItem label="语言地道性" score={result.breakdown.languageAuthenticity} max={isBig ? 5 : 2} icon="🌏" />
                <ScoreItem label="结构与逻辑" score={result.breakdown.structureCoherence} max={isBig ? 4 : 1} icon="🔗" />
             </div>
             <div className={`mt-4 p-4 rounded-xl border flex items-center gap-4 ${result.breakdown.neatness > 0.5 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${result.breakdown.neatness > 0.5 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  ✒️
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-800">卷面书写 (Neatness)</span>
                    <span className={`font-mono font-bold ${result.breakdown.neatness > 0.5 ? 'text-green-700' : 'text-red-700'}`}>{result.breakdown.neatness} / 1</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{result.handwritingComments}</p>
                </div>
             </div>
           </div>
        </div>
      </div>

      {/* 2. Highlights & Pruning (Positive & Constructive) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Highlights */}
        <div className="bg-teal-50 rounded-3xl p-6 border border-teal-100 shadow-sm">
           <div className="flex items-center gap-3 mb-4">
             <div className="bg-teal-200 p-2 rounded-lg text-teal-800">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 3.214L13 21l-2.286-6.857L5 12l5.714-3.214L13 3z"></path></svg>
             </div>
             <h3 className="text-lg font-bold text-teal-900">亮点与优势 Highlights</h3>
           </div>
           <ul className="space-y-3">
             {result.brightSpots.map((spot, idx) => (
               <li key={idx} className="flex items-start text-sm text-slate-700 bg-white/60 p-3 rounded-xl">
                 <span className="text-teal-500 mr-2 font-bold mt-0.5">✓</span>
                 {spot}
               </li>
             ))}
           </ul>
        </div>

        {/* Outline & Word Count Analysis */}
        <div className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100 shadow-sm flex flex-col">
           <div className="flex items-center gap-3 mb-4">
             <div className="bg-indigo-200 p-2 rounded-lg text-indigo-800">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
             </div>
             <h3 className="text-lg font-bold text-indigo-900">逻辑与篇幅 Structure</h3>
           </div>
           
           <div className="mb-4 bg-white/60 p-3 rounded-xl">
             <span className="text-xs font-bold text-indigo-400 uppercase block mb-1">文章脉络 Outline</span>
             <p className="text-sm text-slate-700 italic">"{result.userOutline}"</p>
           </div>

           <div className="mt-auto bg-white/60 p-3 rounded-xl border border-indigo-100">
             <div className="flex justify-between items-center mb-2">
               <span className="text-xs font-bold text-slate-500 uppercase">字数统计 Word Count</span>
               <div className="flex items-center gap-2">
                 <span className="font-mono font-bold text-slate-800">{result.wordCountAnalysis.count} 词</span>
                 <span className={`text-xs px-2 py-0.5 rounded font-bold ${result.wordCountAnalysis.isAcceptable ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                   {result.wordCountAnalysis.comment}
                 </span>
               </div>
             </div>
             {result.wordCountAnalysis.pruningAdvice && (
               <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded mt-2 border border-amber-100">
                 <span className="font-bold mr-1">💡 精简建议:</span>
                 {result.wordCountAnalysis.pruningAdvice}
               </div>
             )}
           </div>
        </div>
      </div>

      {/* 3. Revision Analysis (If applicable) */}
      {result.revisionAnalysis && result.revisionAnalysis.isRevision && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-3xl p-1 shadow-sm border border-amber-100">
          <div className="bg-white/40 backdrop-blur-sm rounded-[20px] p-6">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                  <span className="bg-amber-200 p-1.5 rounded-md text-amber-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </span>
                  进步分析 Progress Report
               </h3>
               <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${
                 result.revisionAnalysis.scoreChange.includes('-') 
                 ? 'bg-red-100 text-red-700' 
                 : 'bg-green-100 text-green-700'
               }`}>
                 得分变化: {result.revisionAnalysis.scoreChange}
               </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-green-700 uppercase mb-2">已修正 Improvements</h4>
                    <ul className="space-y-2">
                      {result.revisionAnalysis.improvements.length > 0 ? (
                        result.revisionAnalysis.improvements.map((item, idx) => (
                          <li key={idx} className="flex text-sm text-slate-700">
                            <span className="text-green-500 mr-2">✓</span> {item}
                          </li>
                        ))
                      ) : <li className="text-sm text-slate-400 italic">无明显进步</li>}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-red-700 uppercase mb-2">顽固错误 Persistent Errors</h4>
                    <ul className="space-y-2">
                      {result.revisionAnalysis.persistentErrors.length > 0 ? (
                        result.revisionAnalysis.persistentErrors.map((item, idx) => (
                          <li key={idx} className="flex text-sm text-slate-700">
                            <span className="text-red-500 mr-2">!</span> {item}
                          </li>
                        ))
                      ) : <li className="text-sm text-slate-400 italic">太棒了，错误都已修正！</li>}
                    </ul>
                  </div>
               </div>
               <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                 <h4 className="text-sm font-bold text-amber-800 uppercase mb-2">习惯性弱点 Habitual Weaknesses</h4>
                 <p className="text-sm text-slate-600 leading-relaxed">
                   {result.revisionAnalysis.weaknessSummary}
                 </p>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Language Upgrades (Polishing) */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
             <span className="bg-blue-600 text-white p-1 rounded">UP</span>
             语言升格 Language Polish
          </h3>
          <span className="text-xs font-semibold bg-slate-200 text-slate-600 px-2 py-1 rounded">B2 → C1 Level</span>
        </div>
        <div className="divide-y divide-slate-100">
           {result.improvements.length > 0 ? (
             result.improvements.map((item, idx) => (
               <div key={idx} className="p-6 hover:bg-slate-50 transition-colors grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                 <div className="md:col-span-5">
                   <div className="text-xs font-bold text-slate-400 mb-1 uppercase">Original</div>
                   <div className="text-slate-500 line-through decoration-slate-300">{item.original}</div>
                 </div>
                 <div className="md:col-span-1 flex justify-center text-slate-300">
                    <svg className="w-6 h-6 transform rotate-90 md:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                 </div>
                 <div className="md:col-span-6">
                   <div className="flex items-center gap-2 mb-1">
                      <div className="text-xs font-bold text-blue-600 uppercase">Upgrade</div>
                      <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">{item.type}</span>
                   </div>
                   <div className="text-slate-800 font-semibold text-lg mb-1">{item.improved}</div>
                   <div className="text-xs text-slate-500 italic">Why: {item.reason}</div>
                 </div>
               </div>
             ))
           ) : (
             <div className="p-8 text-center text-slate-500">暂无升格建议，语言已达标。</div>
           )}
        </div>
      </div>

      {/* 5. Corrections (Table style) */}
      {result.corrections.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="px-8 py-5 border-b border-slate-100 bg-red-50/50">
             <h3 className="text-lg font-bold text-red-900 flex items-center gap-2">
                ⚠️ 硬伤纠正 Fatal Errors
             </h3>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                 <tr>
                   <th className="px-6 py-3 font-semibold">错误原文</th>
                   <th className="px-6 py-3 font-semibold">正确写法</th>
                   <th className="px-6 py-3 font-semibold">解析</th>
                   <th className="px-6 py-3 font-semibold">类型</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {result.corrections.map((item, idx) => (
                   <tr key={idx} className="hover:bg-slate-50/80">
                     <td className="px-6 py-4 font-medium text-red-500 break-words max-w-xs">{item.original}</td>
                     <td className="px-6 py-4 text-green-600 font-medium break-words max-w-xs">{item.correction}</td>
                     <td className="px-6 py-4 text-slate-600">{item.explanation}</td>
                     <td className="px-6 py-4">
                       <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                         {item.type}
                       </span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* 6. Polished Version & Comments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Polished Version (2/3 width) */}
        <div className="md:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
           <div className="bg-slate-900 px-8 py-5 flex justify-between items-center text-white">
             <h3 className="text-lg font-bold flex items-center gap-2">
               <span className="text-yellow-400 text-xl">★</span> 考场满分范文
             </h3>
             <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">Ideal Version</span>
           </div>
           <div className="p-8 bg-slate-50 flex-1 relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
             <p className="whitespace-pre-wrap text-slate-700 leading-8 font-serif text-lg tracking-wide">
               {result.polishedVersion}
             </p>
           </div>
        </div>

        {/* General Comments (1/3 width) */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col">
           <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">考官总评</h3>
           <div className="prose prose-sm prose-slate mb-6 flex-1">
             <p className="text-slate-600">{result.generalComments}</p>
           </div>
           
           <div>
             <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">后续建议 Action Items</h4>
             <ul className="space-y-3">
              {result.suggestions.map((sug, idx) => (
                <li key={idx} className="flex items-start text-sm text-slate-700 bg-slate-50 p-2 rounded-lg">
                  <span className="min-w-[20px] h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold mr-2 mt-0.5">{idx+1}</span>
                  {sug}
                </li>
              ))}
             </ul>
           </div>
        </div>
      </div>

      {/* 7. Exercises */}
      {result.exercises && result.exercises.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
           <div className="flex items-center gap-3 mb-6">
             <div className="bg-cyan-100 p-2 rounded-lg text-cyan-700">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
             </div>
             <h3 className="text-xl font-bold text-slate-800">针对性巩固练习 Drills</h3>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {result.exercises.map((ex, idx) => (
               <div key={idx} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 hover:shadow-md transition-all">
                 <div className="flex justify-between items-start mb-3">
                   <span className="bg-cyan-600 text-white text-xs font-bold px-2 py-1 rounded">Q{idx+1}</span>
                 </div>
                 <p className="font-medium text-slate-800 mb-4 min-h-[48px]">{ex.question}</p>
                 
                 {ex.options && (
                   <div className="space-y-2 mb-4">
                     {ex.options.map((opt, i) => (
                       <div key={i} className="text-sm bg-white border border-slate-200 p-2 rounded text-slate-600 hover:bg-cyan-50 hover:border-cyan-200 hover:text-cyan-700 cursor-pointer transition-colors">
                         {opt}
                       </div>
                     ))}
                   </div>
                 )}

                 <details className="group">
                   <summary className="list-none flex items-center justify-between cursor-pointer text-xs font-bold text-slate-400 uppercase hover:text-cyan-600 pt-2 border-t border-slate-200">
                     <span>Show Answer</span>
                     <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                   </summary>
                   <div className="mt-3 text-sm bg-white p-3 rounded-lg border border-slate-200 shadow-inner">
                     <div className="mb-2">
                       <span className="font-bold text-green-600 mr-2">Answer: {ex.answer}</span>
                     </div>
                     <p className="text-slate-600 text-xs leading-relaxed">{ex.explanation}</p>
                   </div>
                 </details>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* 8. Examiner Q&A Chat */}
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-indigo-100 flex flex-col h-[600px]">
         <div className="bg-indigo-900 px-8 py-4 flex items-center justify-between text-white">
           <h3 className="text-lg font-bold flex items-center gap-2">
             <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
             </div>
             考官面对面 Q&A
           </h3>
           <span className="text-xs bg-indigo-800 text-indigo-200 px-3 py-1 rounded-full">有问题？在此提问或申诉</span>
         </div>
         
         {/* Chat Messages */}
         <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
           {chatHistory.length === 0 ? (
             <div className="text-center text-slate-400 mt-10">
                <p className="mb-2">👋 你好，我是北京阅卷组长。</p>
                <p className="text-sm">对分数有疑问？或者觉得系统识别有误？请告诉我。</p>
             </div>
           ) : (
             chatHistory.map((msg, idx) => (
               <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${
                   msg.role === 'user' 
                   ? 'bg-indigo-600 text-white rounded-tr-none' 
                   : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                 }`}>
                   {msg.role === 'assistant' && (
                     <div className="text-xs font-bold text-slate-400 mb-1">阅卷组长</div>
                   )}
                   {msg.content}
                 </div>
               </div>
             ))
           )}
           {isChatLoading && (
             <div className="flex justify-start">
               <div className="bg-white text-slate-500 border border-slate-200 rounded-2xl rounded-tl-none px-5 py-3 text-sm shadow-sm flex items-center gap-2">
                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                 <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></div>
               </div>
             </div>
           )}
           <div ref={chatEndRef} />
         </div>

         {/* Chat Input */}
         <div className="p-4 bg-white border-t border-slate-200">
           <div className="flex gap-2">
             <input
               type="text"
               value={inputMessage}
               onChange={(e) => setInputMessage(e.target.value)}
               onKeyPress={handleKeyPress}
               placeholder="输入你的问题，或指出识别错误..."
               className="flex-1 border-slate-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
               disabled={isChatLoading}
             />
             <button
               onClick={handleSendMessage}
               disabled={!inputMessage.trim() || isChatLoading}
               className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
             >
               发送
             </button>
           </div>
         </div>
      </div>

      {/* Footer Action */}
      <div className="flex justify-center gap-4 pt-8">
        <button 
          onClick={onEdit}
          className="px-8 py-3 bg-white text-slate-700 border border-slate-300 rounded-2xl hover:bg-slate-50 transition-all shadow-sm font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          返回修改 (Fix/Edit)
        </button>
        <button 
          onClick={onClear}
          className="px-8 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          开始新作文
        </button>
      </div>
    </div>
  );
};

// Helper sub-component for Score Items
const ScoreItem: React.FC<{ label: string; score: number; max: number; icon: string }> = ({ label, score, max, icon }) => (
  <div className="flex items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-lg shadow-sm mr-3">
      {icon}
    </div>
    <div className="flex-1">
      <div className="text-xs text-slate-500 font-medium">{label}</div>
      <div className="flex items-baseline">
        <span className="text-xl font-bold text-slate-800">{score}</span>
        <span className="text-xs text-slate-400 ml-1">/ {max}</span>
      </div>
    </div>
    <div className="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden ml-2">
      <div 
        className="h-full bg-indigo-500 rounded-full" 
        style={{ width: `${(score / max) * 100}%` }}
      ></div>
    </div>
  </div>
);