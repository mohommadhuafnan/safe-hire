import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useAIModal } from '../context/AIModalContext';
import api from '../services/api';
import ScamGauge from '../components/ScamGauge';
import AgentBreakdown from '../components/AgentBreakdown';
import { exportAnalysisReport, parseExplanationSections } from '../services/reportExporter';
import { 
  FileText, 
  Image as ImageIcon, 
  Globe, 
  Send, 
  Sparkles, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  BrainCircuit,
  History,
  ShieldCheck,
  Building2,
  Upload,
  Crown,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const StructuredExplanationView = ({ text }) => {
  const sections = parseExplanationSections(text);

  if (!sections || sections.length === 0) {
    return (
      <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line">
        {text}
      </p>
    );
  }

  return (
    <div className="space-y-3 font-sans">
      {sections.map((sec, idx) => {
        const lines = (sec.body || '')
          .split(/(?:\s*-\s+|\s*•\s+|\n-\s*|\n•\s*|\n\d+\.\s*)/)
          .map(l => l.trim())
          .filter(Boolean);

        const hasBullets = lines.length > 1;

        return (
          <div key={idx} className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-extrabold text-slate-100 tracking-tight border-b border-slate-800/60 pb-2">
              <span className="text-sm">{sec.emoji}</span>
              <span className="uppercase text-[11px] text-sky-300 font-bold tracking-wider">{sec.title}</span>
            </div>

            {hasBullets ? (
              <ul className="space-y-2 pt-1">
                {lines.map((line, lIdx) => {
                  const isWarning = line.toLowerCase().includes('fee demand') || line.toLowerCase().includes('risk') || line.toLowerCase().includes('fake') || line.toLowerCase().includes('impersonation') || line.toLowerCase().includes('telegram');
                  const isClean = line.toLowerCase().includes('no fee') || line.toLowerCase().includes('no urgency') || line.toLowerCase().includes('clean') || line.toLowerCase().includes('safe') || line.toLowerCase().includes('genuine');

                  return (
                    <li key={lIdx} className="flex items-start space-x-2.5 text-xs text-slate-200 leading-relaxed">
                      <span className="mt-0.5 flex-shrink-0">
                        {isWarning ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        ) : isClean ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 block" />
                        )}
                      </span>
                      <span className="font-medium text-slate-200">{line}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-slate-300 leading-relaxed pt-1 font-medium">
                {sec.body}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

const DashboardPage = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const { openAIModal } = useAIModal();


  // Tab State: 'text', 'image', 'url'
  const [activeTab, setActiveTab] = useState('text');

  // Inputs
  const [inputText, setInputText] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [targetLanguage, setTargetLanguage] = useState(
    user?.preferred_language || i18n.resolvedLanguage || i18n.language?.split('-')[0] || 'en'
  );

  // Pipeline Execution State
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const pipelineSteps = [
    'Stage 1: Intake Agent (Text Ingestion, OCR & Language Detect)',
    'Stage 2: Linguistic Risk Agent (EMSCAD Urgency & Fee Detection)',
    'Stage 3: Verification Agent (WHOIS & Safe Browsing Check)',
    'Stage 4: Reasoning Agent (Scam Probability Score Calculation)',
    'Stage 5: Recommendation Agent (Generating Personalised Advice)'
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (activeTab === 'text' && !inputText.trim()) {
      setError('Please paste job text, email body, or message to analyze.');
      return;
    }
    if (activeTab === 'url' && !inputUrl.trim()) {
      setError('Please enter a job posting or recruiter URL.');
      return;
    }
    if (activeTab === 'image' && !selectedFile) {
      setError('Please select or upload a job screenshot image.');
      return;
    }

    setAnalyzing(true);
    setCurrentStep(1);

    // Simulate step progress for visual feedback
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < 5) return prev + 1;
        clearInterval(stepInterval);
        return prev;
      });
    }, 600);

    try {
      const formData = new FormData();
      formData.append('input_type', activeTab);
      formData.append('target_language', targetLanguage);

      if (activeTab === 'text') formData.append('input_text', inputText);
      if (activeTab === 'url') formData.append('input_url', inputUrl);
      if (activeTab === 'image' && selectedFile) formData.append('image', selectedFile);

      const response = await api.post('/api/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearInterval(stepInterval);
      setCurrentStep(5);
      setResult(response.data);
    } catch (err) {
      clearInterval(stepInterval);
      setError(err.response?.data?.detail || 'Failed to complete scam analysis. Please check backend server connection.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 pt-24 sm:pt-32 pb-10 space-y-6 sm:space-y-8">
      
      {/* USER DASHBOARD HEADER BAR & PREMIUM BANNER */}
      <div className="glass-panel p-5 sm:p-7 rounded-3xl border border-slate-800 relative overflow-hidden space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-[11px] sm:text-xs mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>AUTHENTICATED STUDENT DASHBOARD • 5-AGENT AI PIPELINE</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
              Welcome back, <span className="gradient-text">{user?.full_name || 'Student'}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Analyze job postings, recruitment screenshots, or URLs for scam risk signals in seconds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Account Tier Badge */}
            <div className="px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold flex items-center space-x-2">
              <Crown className="w-4 h-4 text-amber-400 animate-pulse" />
              <div>
                <span className="block text-[10px] text-amber-400/80 font-mono uppercase">Current Plan</span>
                <span className="text-xs font-bold text-amber-300">Free Tier (LKR 0)</span>
              </div>
            </div>

            <Link
              to="/history"
              className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition shadow-sm"
            >
              <History className="w-4 h-4 text-emerald-400" />
              <span>Past Verifications</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        
        {/* INPUT FORM CONTAINER (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-5 sm:p-7 rounded-3xl border border-slate-800 space-y-6">
            
            {/* INPUT TYPE TABS */}
            <div className="flex p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800/80">
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-bold transition ${
                  activeTab === 'text'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>{t('dashboard.tab_text')}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('image')}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-bold transition ${
                  activeTab === 'image'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>{t('dashboard.tab_image')} (OCR)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('url')}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-xs font-bold transition ${
                  activeTab === 'url'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>{t('dashboard.tab_url')}</span>
              </button>
            </div>

            {/* ERROR ALERT */}
            {error && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* TAB CONTENT INPUTS */}
            <form onSubmit={handleAnalyze} className="space-y-5">
              
              {/* TAB 1: TEXT */}
              {activeTab === 'text' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Paste Job Offer / Email / WhatsApp Message:
                  </label>
                  <textarea
                    rows={7}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={t('dashboard.placeholder_text')}
                    className="w-full bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl p-4 text-xs text-slate-100 placeholder-slate-500 outline-none transition resize-none leading-relaxed"
                  />
                </div>
              )}

              {/* TAB 2: IMAGE OCR */}
              {activeTab === 'image' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300">
                    Upload Screenshot of Job Ad or Chat (SAFE-HIRE AI Scanner):
                  </label>
                  <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 text-center cursor-pointer bg-slate-900/50 transition">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="max-h-48 rounded-xl object-contain mb-3 border border-slate-800" />
                      ) : (
                        <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-3 border border-indigo-500/20">
                          <Upload className="w-8 h-8" />
                        </div>
                      )}
                      <span className="text-xs font-bold text-slate-200">
                        {selectedFile ? selectedFile.name : 'Click to select image file (PNG, JPG, WEBP)'}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1">Automatic AI OCR text extraction and poster validation</span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 3: URL */}
              {activeTab === 'url' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Paste Job Offer URL / Company Website / Social Link:
                  </label>
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder={t('dashboard.placeholder_url')}
                    className="w-full bg-slate-900/90 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl p-4 text-xs text-slate-100 placeholder-slate-500 outline-none transition"
                  />
                </div>
              )}

              {/* TARGET LANGUAGE SELECTOR */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                <span className="text-xs font-medium text-slate-400">{t('dashboard.select_lang')}:</span>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none cursor-pointer"
                >
                  <option value="en">English (EN)</option>
                  <option value="si">Sinhala (සිංහල)</option>
                  <option value="ta">Tamil (தமிழ்)</option>
                  <option value="hi">Hindi (हिंदी)</option>
                  <option value="bn">Bengali (বাংলা)</option>
                </select>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={analyzing}
                className="w-full py-4 px-6 rounded-2xl btn-primary font-bold text-xs sm:text-sm shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50 transition"
              >
                {analyzing ? (
                  <>
                    <Sparkles className="w-5 h-5 animate-spin" />
                    <span>Executing 5-Agent AI Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Run 5-Agent AI Analysis</span>
                  </>
                )}
              </button>
            </form>

          </div>

          {/* FULL SCREEN FUTURISTIC AI SCANNING OVERLAY WITH BLURRED BACKGROUND */}
          {analyzing && (
            <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 animate-fade-in">
              <div className="w-full max-w-lg glass-panel p-6 sm:p-8 rounded-3xl border border-indigo-500/50 space-y-6 shadow-[0_0_50px_rgba(99,102,241,0.35)] relative overflow-hidden bg-slate-950/95">
                
                {/* Top Scanner Status Bar */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div className="flex items-center space-x-2.5">
                    <BrainCircuit className="w-6 h-6 text-sky-400 animate-pulse" />
                    <span className="text-xs sm:text-sm font-extrabold text-slate-100 uppercase tracking-widest">
                      SAFE-HIRE AI 5-Agent Scanner
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-sky-300 bg-sky-500/20 px-3 py-1 rounded-full border border-sky-400/30 animate-pulse">
                    NEURAL SCANNING
                  </span>
                </div>

                {/* POSTER LASER SCANNER PREVIEW (If Image Uploaded) */}
                {previewUrl ? (
                  <div className="relative w-full max-w-sm mx-auto rounded-2xl overflow-hidden border-2 border-indigo-500/60 bg-slate-900 shadow-[0_0_35px_rgba(99,102,241,0.4)]">
                    <img src={previewUrl} alt="Poster Under Scan" className="w-full max-h-60 object-contain opacity-90 p-2" />
                    
                    {/* Neon Cyan Laser Scan Line */}
                    <div className="absolute inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#38bdf8] animate-scan z-20 pointer-events-none" />
                    
                    {/* HUD Corner Markers */}
                    <div className="absolute top-2 left-2 text-[9px] font-mono font-bold text-cyan-300 bg-slate-950/90 px-2.5 py-0.5 rounded border border-cyan-500/40">
                      [OCR TEXT MINING]
                    </div>
                    <div className="absolute bottom-2 right-2 text-[9px] font-mono font-bold text-emerald-300 bg-slate-950/90 px-2.5 py-0.5 rounded border border-emerald-500/40">
                      [GEMINI VISION 3.6]
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-indigo-500/30 bg-slate-900/60 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/40">
                      <Sparkles className="w-6 h-6 text-sky-400 animate-spin" />
                    </div>
                    <span className="text-xs font-bold text-slate-200">Executing Deep Multimodal NLP & Security Verification</span>
                  </div>
                )}

                {/* 5-Agent Step Neural Progress Indicators */}
                <div className="space-y-2.5 pt-1">
                  {pipelineSteps.map((stepName, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                      <div className="flex items-center space-x-3">
                        {idx + 1 < currentStep ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        ) : idx + 1 === currentStep ? (
                          <Sparkles className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-700 flex-shrink-0" />
                        )}
                        <span className={idx + 1 <= currentStep ? 'text-slate-100 font-bold' : 'text-slate-500'}>
                          {stepName}
                        </span>
                      </div>
                      {idx + 1 === currentStep && (
                        <span className="text-[10px] font-bold text-sky-400 animate-pulse font-mono bg-sky-500/10 px-2 py-0.5 rounded">
                          ANALYZING...
                        </span>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}

          {/* FULL ANALYZED REPORT DISPLAY PANEL (BOTTOM LEFT) */}
          {result && (
            <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-indigo-500/30 bg-slate-900/80 space-y-6 animate-fade-in shadow-2xl">
              
              {/* REPORT HEADER BAR */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20 flex-shrink-0">
                    <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                      <FileText className="w-6 h-6 text-sky-400" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-100 tracking-tight">
                        Full AI Audit Report & Verification Certificate
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        VERIFIED
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Analyzed on {new Date(result.created_at || Date.now()).toLocaleString()} • Target: {user?.full_name || 'Student'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  {/* Language Selector inside Report Header */}
                  <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2 text-xs text-slate-200">
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    <select
                      value={i18n.language}
                      onChange={(e) => i18n.changeLanguage(e.target.value)}
                      className="bg-transparent border-none outline-none text-slate-200 cursor-pointer text-xs font-semibold"
                    >
                      <option value="en" className="bg-slate-900">English (EN)</option>
                      <option value="si" className="bg-slate-900">සිංහල (SI)</option>
                      <option value="ta" className="bg-slate-900">தமிழ் (TA)</option>
                      <option value="hi" className="bg-slate-900">हिंदी (HI)</option>
                      <option value="bn" className="bg-slate-900">বাংলা (BN)</option>
                    </select>
                  </div>

                  <button
                    onClick={() => exportAnalysisReport(result, user, i18n.language)}
                    className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl btn-primary font-bold text-xs shadow-md transition hover:scale-105"
                  >
                    <Download className="w-4 h-4 text-white" />
                    <span>{t('dashboard.download_report')}</span>
                  </button>

                  <button
                    onClick={() => openAIModal({
                      title: `Gemini 3.6 Flash Deep AI Audit (Report #${result.id.slice(-6)})`,
                      initialPrompt: `Provide an in-depth security breakdown and safety advice for this job verification report:\nScam Score: ${result.scam_score}/100\nRisk Level: ${result.risk_level}\nExplanation: "${result.explanation_text}"`,
                      category: 'full_report_audit',
                      contextData: result
                    })}
                    className="p-2.5 rounded-2xl bg-slate-900 border border-slate-700 hover:border-indigo-500 text-sky-300 hover:text-white transition"
                    title="Interactive Gemini AI Chat Audit"
                  >
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  </button>
                </div>
              </div>

              {/* VERDICT BANNER & METADATA GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Risk Level Verdict</span>
                  <span className={`text-sm font-extrabold block ${
                    result.scam_score >= 60 ? 'text-rose-400' : result.scam_score >= 30 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {result.risk_level}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Scam Risk Score</span>
                  <span className="text-sm font-extrabold text-slate-100 font-mono block">
                    {result.scam_score} / 100
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Language & Pipeline</span>
                  <span className="text-xs font-bold text-sky-400 uppercase block">
                    {result.language || 'EN'} • 5-Agent Engine
                  </span>
                </div>
              </div>

              {/* LIVE URL & WHOIS DOMAIN SECURITY AUDIT CARD */}
              {result.verification_data && (
                <div className="p-5 rounded-2xl bg-slate-950/90 border border-indigo-500/30 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-sky-400" />
                      <span>Live URL & WHOIS Domain Security Audit</span>
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                      WHOIS LIVE AUDIT
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Target Domain / URL</span>
                      <span className="font-semibold text-slate-200 text-xs truncate block">
                        {result.verification_data.domain || 'Not Specified'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Domain Age</span>
                      <span className={`font-semibold text-xs block ${result.verification_data.whois_info?.is_new_domain ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                        {result.verification_data.whois_info?.registered_days 
                          ? `${result.verification_data.whois_info.registered_days} Days (Registered)` 
                          : 'Verified Registry Standard'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 sm:col-span-2">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">WHOIS Domain Security Status</span>
                      <span className={`font-semibold text-xs block ${result.verification_data.whois_info?.is_new_domain ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {result.verification_data.whois_info?.whois_status || 'Domain Registry Standard'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* EXTRACTED CONTENT / OCR SNIPPET */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Ingested Content & OCR Verbatim Snippet</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500">
                    Source: {result.risk_factors?.source || result.intake_data?.source || 'Automated OCR'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 font-sans leading-relaxed bg-slate-900/90 p-4 rounded-xl border border-slate-800/80 whitespace-pre-wrap max-h-[500px] overflow-y-auto select-all">
                  "{result.intake_data?.ocr_text || result.risk_factors?.ocr_text || result.intake_data?.cleaned_text || 'Job posting data analyzed.'}"
                </p>
              </div>

              {/* STUDENT SAFETY ACTION PLAN */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Tailored Student Safety Recommendations</span>
                  </h4>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start space-x-2.5 text-xs text-slate-200 leading-relaxed font-sans">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
                        <span className="font-medium text-slate-200">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* VERIFICATION SIGNATURE FOOTER */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-400 gap-2">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Verified by <strong>SAFE-HIRE Agentic AI Engine</strong></span>
                </div>
                <div className="flex items-center space-x-2 font-mono text-[10px] text-slate-500">
                  <span>Report Hash: {result.id}</span>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* RESULTS CARD DISPLAY (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          {result ? (
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6 animate-fade-in">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-100">{t('dashboard.results_title')}</h2>
                <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-sky-400">
                  ID: #{result.id.slice(-6)}
                </span>
              </div>

              {/* SCAM GAUGE */}
              <ScamGauge score={result.scam_score} riskLevel={result.risk_level} />

              {/* PLAIN-LANGUAGE EXPLANATION */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  {t('dashboard.explanation')}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line">
                  {result.explanation_text}
                </p>
              </div>

              {/* 5-AGENT BREAKDOWN ACCORDION */}
              <AgentBreakdown result={result} />

              {/* ACTION BUTTONS */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => exportAnalysisReport(result, user, i18n.language)}
                  className="w-full flex items-center justify-center space-x-2 px-5 py-3 rounded-xl btn-primary font-bold text-xs shadow-md transition hover:scale-[1.02]"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>{t('dashboard.download_report')}</span>
                </button>
              </div>

            </div>
          ) : (
            <div className="glass-card p-10 rounded-3xl border border-slate-800 text-center flex flex-col items-center justify-center min-h-[420px]">
              <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-4 border border-indigo-500/20">
                <BrainCircuit className="w-10 h-10" />
              </div>
              <h3 className="text-base font-bold text-slate-200 mb-1">Awaiting Job Offer Input</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Submit job offer text, a screenshot image, or a URL to trigger the 5-Agent AI pipeline.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default DashboardPage;
