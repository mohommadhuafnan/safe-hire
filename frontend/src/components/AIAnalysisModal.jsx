import React, { useState, useEffect, useRef } from 'react';
import GeminiAPIClient from '../services/GeminiAPIClient';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { exportAnalysisReport } from '../services/reportExporter';
import { 
  Sparkles, 
  X, 
  Send, 
  Copy, 
  Check, 
  ShieldCheck, 
  AlertTriangle, 
  BrainCircuit, 
  RefreshCw, 
  Zap, 
  FileText, 
  Globe, 
  Lock, 
  Crown,
  StopCircle,
  Download
} from 'lucide-react';

const AIAnalysisModal = ({ isOpen, onClose, title, initialPrompt, category, contextData }) => {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [analysisOutput, setAnalysisOutput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  
  const clientRef = useRef(null);
  const scrollRef = useRef(null);

  // Quick preset templates
  const presets = [
    { label: '🔍 Job Offer Verification', prompt: 'Analyze this job offer for scam indicators, upfront fees, unrealistic salary, or phishing risks:' },
    { label: '🌐 Domain & Contact Audit', prompt: 'Audit this recruiter domain, WhatsApp number, or contact info for legitimacy:' },
    { label: '💰 Fee & Deposit Danger Check', prompt: 'Determine if requiring payment for training, laptops, or background checks is a scam:' },
    { label: '📊 Plan Upgrade ROI', prompt: 'Analyze the value and ROI of SAFE-HIRE subscription plans for students:' }
  ];

  useEffect(() => {
    clientRef.current = new GeminiAPIClient();
  }, []);

  // When initialPrompt changes or modal opens, trigger automatic analysis if initialPrompt is provided
  useEffect(() => {
    if (isOpen) {
      if (initialPrompt && initialPrompt.trim()) {
        setPrompt(initialPrompt);
        handleStartAnalysis(initialPrompt);
      } else {
        setAnalysisOutput('');
        setError('');
        setChatHistory([]);
      }
    } else {
      if (clientRef.current) {
        clientRef.current.cancelActiveStream();
      }
    }
  }, [isOpen, initialPrompt]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [analysisOutput, chatHistory]);

  const handleStartAnalysis = (userPromptText) => {
    const textToAnalyze = userPromptText || prompt;
    if (!textToAnalyze.trim()) {
      setError('Please enter text, job details, or a question to analyze.');
      return;
    }

    setError('');
    setIsStreaming(true);
    setAnalysisOutput('');

    const newHistory = [
      ...chatHistory,
      { role: 'user', content: textToAnalyze }
    ];
    setChatHistory(newHistory);

    const systemContextMessage = {
      role: 'user',
      content: `System Context: You are SAFE-HIRE Gemini 3.6 Flash AI Analyzer, a top-tier security and recruitment risk intelligence engine.
Analyze the following content thoroughly. Highlight risk factors (0-100 score), scam tactics (EMSCAD/WHOIS/Phishing), fee demands, and give actionable recommendations for job seekers.

User Query/Data to Analyze:
${textToAnalyze}

${contextData ? `Additional Technical Context:\n${JSON.stringify(contextData, null, 2)}` : ''}`
    };

    clientRef.current.sendMessageStream(
      [systemContextMessage],
      {
        onToken: (fullText) => {
          setAnalysisOutput(fullText);
        },
        onComplete: (res) => {
          setIsStreaming(false);
          setChatHistory(prev => [
            ...prev,
            { role: 'assistant', content: res.content }
          ]);
        },
        onError: (err) => {
          setIsStreaming(false);
          setError(err.message || 'An error occurred during Gemini AI analysis.');
        }
      }
    );
  };

  const handleStopStream = () => {
    if (clientRef.current) {
      clientRef.current.cancelActiveStream();
      setIsStreaming(false);
    }
  };

  const handleCopy = () => {
    if (analysisOutput) {
      navigator.clipboard.writeText(analysisOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-indigo-500/30 shadow-2xl overflow-hidden relative">
        
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-sky-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-100 tracking-tight">
                  {title || 'Gemini 3.6 Flash AI Analyzer'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  REAL-TIME SSE
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Google AI Studio Direct Engine • Standalone Deep Reasoning & Scam Audit
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {contextData && contextData.scam_score !== undefined && (
              <button
                onClick={() => exportAnalysisReport(contextData, user, i18n.language)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-xs font-semibold text-sky-300 transition border border-indigo-400/40"
                title="Export PDF Report"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
            )}

            {analysisOutput && (
              <button
                onClick={handleCopy}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition border border-slate-700"
                title="Copy Analysis Output"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy Report'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* QUICK PRESETS CHIPS */}
          {!analysisOutput && !isStreaming && (
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant Analysis Templates:</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {presets.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(item.prompt);
                    }}
                    className="p-3 text-left rounded-2xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-300 hover:text-white transition group"
                  >
                    <span className="font-semibold block text-indigo-300 group-hover:text-indigo-200 mb-0.5">{item.label}</span>
                    <span className="text-[11px] text-slate-400 line-clamp-1">{item.prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ANALYSIS OUTPUT CONTAINER */}
          {(analysisOutput || isStreaming) && (
            <div className="glass-panel p-5 rounded-2xl border border-indigo-500/30 bg-slate-900/70 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Gemini 3.6 Flash Intelligence Stream</span>
                </div>
                {isStreaming && (
                  <div className="flex items-center space-x-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400 animate-pulse">Streaming Response...</span>
                    <button
                      onClick={handleStopStream}
                      className="ml-2 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-[10px] font-bold border border-rose-500/30 flex items-center space-x-1"
                    >
                      <StopCircle className="w-3 h-3" />
                      <span>Stop</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="text-xs sm:text-sm text-slate-200 font-mono leading-relaxed whitespace-pre-wrap selection:bg-indigo-500 selection:text-white">
                {analysisOutput || 'Initializing Gemini API connection stream...'}
              </div>
            </div>
          )}

          {/* ERROR DISPLAY */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Analysis Exception</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER & INPUT */}
        <div className="p-4 sm:p-5 bg-slate-900/90 border-t border-slate-800 space-y-3">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleStartAnalysis();
            }}
            className="flex items-end space-x-2"
          >
            <div className="flex-1 relative">
              <textarea
                rows={2}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Paste job posting, email text, recruiter domain, or ask any question for Gemini 3.6 Flash AI analysis..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl p-3 pr-10 text-xs text-slate-100 placeholder-slate-500 outline-none resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleStartAnalysis();
                  }
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isStreaming || !prompt.trim()}
              className={`px-5 py-3.5 rounded-2xl text-xs font-bold flex items-center space-x-2 transition shadow-lg ${
                isStreaming || !prompt.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 text-white hover:scale-105 glow-btn'
              }`}
            >
              {isStreaming ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{isStreaming ? 'Analyzing...' : 'Analyze'}</span>
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Powered by <strong className="text-slate-300">GeminiAPIClient (gemini-3.6-flash)</strong></span>
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Enter ↵</kbd> to analyze</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AIAnalysisModal;
