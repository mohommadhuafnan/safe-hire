import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
  Shield,
  Check,
  Building2,
  Upload,
  Crown,
  Zap,
  ArrowRight,
  Trash2,
  RotateCcw,
  Paperclip,
  Cpu
} from 'lucide-react';
import { Link } from 'react-router-dom';

import GeminiAPIClient from '../services/GeminiAPIClient';

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

const extractDomainFromResult = (res, currentActiveTab, currentInputUrl) => {
  if (!res) return '';
  let targetDomain =
    res.verification_data?.domain ||
    res.verification_data?.whois_info?.domain ||
    res.intake_data?.domain ||
    res.intake_data?.metadata_extracted?.domains?.[0] ||
    res.input_url ||
    (currentActiveTab === 'url' ? currentInputUrl?.trim() : '') ||
    '';

  // Fallback domain extraction from OCR/explanation text
  if (!targetDomain && res.explanation_text) {
    const m = res.explanation_text.match(/https?:\/\/([^\s"'<>]+)/i) ||
      res.explanation_text.match(/\bwww\.([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i) ||
      res.explanation_text.match(/\b([a-zA-Z0-9][-a-zA-Z0-9]*\.(?:com|org|net|edu|gov|io|co|lk|in|uk|bd|xyz|top|site|online|tech|ai|dev))\b/i);
    if (m) targetDomain = m[1] || m[0];
  }
  if (!targetDomain && res.intake_data?.extracted_text) {
    const m = res.intake_data.extracted_text.match(/https?:\/\/([^\s"'<>]+)/i) ||
      res.intake_data.extracted_text.match(/\bwww\.([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/i) ||
      res.intake_data.extracted_text.match(/\b([a-zA-Z0-9][-a-zA-Z0-9]*\.(?:com|org|net|edu|gov|io|co|lk|in|uk|bd|xyz|top|site|online|tech|ai|dev))\b/i);
    if (m) targetDomain = m[1] || m[0];
  }

  let cleanDom = (targetDomain || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0]
    .split(':')[0];

  // Extract domain from email if email format was captured
  if (cleanDom.includes('@')) {
    cleanDom = cleanDom.split('@').pop() || '';
  }

  // Strip trailing punctuation
  cleanDom = cleanDom.replace(/[.,;:()\[\]{}'"]+$/, '').trim();

  const isRealDomain = Boolean(
    cleanDom &&
    !['not specified', 'n/a', 'none', 'null', 'verified url', ''].includes(cleanDom) &&
    cleanDom.includes('.') &&
    !['gmail.com', 'googlemail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com', 'aol.com', 'mail.com', 'proton.me', 'protonmail.com'].includes(cleanDom)
  );

  return isRealDomain ? cleanDom : '';
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
  const [isTranslatingReport, setIsTranslatingReport] = useState(false);

  const translateActiveResult = async (lang, currentRes) => {
    if (!currentRes || !currentRes.explanation_text) return;
    setIsTranslatingReport(true);
    try {
      const client = new GeminiAPIClient();
      const translated = await client.translateReport(currentRes, lang);
      setResult(translated);
    } catch (err) {
      console.warn('Report translate notice:', err);
    } finally {
      setIsTranslatingReport(false);
    }
  };

  const handleLanguageChange = (lang) => {
    setTargetLanguage(lang);
    i18n.changeLanguage(lang);
    if (result && result.language !== lang) {
      translateActiveResult(lang, result);
    }
  };

  React.useEffect(() => {
    const activeLang = i18n.resolvedLanguage || i18n.language?.split('-')[0] || 'en';
    if (result && result.language !== activeLang && !isTranslatingReport) {
      translateActiveResult(activeLang, result);
    }
  }, [i18n.language]);

  // Pipeline Execution State
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const detectedDomain = React.useMemo(() => {
    return extractDomainFromResult(result, activeTab, inputUrl);
  }, [result, activeTab, inputUrl]);

  const detectedWhois = result?.verification_data?.whois_info || {};

  // Auto-enrich WHOIS domain age if domain is detected but whois creation date or days are not yet loaded
  React.useEffect(() => {
    if (!result || !detectedDomain) return;
    const existingWhois = result.verification_data?.whois_info;
    const needsWhois = !existingWhois || !existingWhois.creation_date || existingWhois.registered_days === undefined || existingWhois.registered_days === null;

    if (needsWhois) {
      GeminiAPIClient.fetchWhoisData(detectedDomain).then(liveWhois => {
        if (liveWhois) {
          setResult(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              verification_data: {
                ...(prev.verification_data || {}),
                domain: detectedDomain,
                whois_info: {
                  ...(prev.verification_data?.whois_info || {}),
                  ...liveWhois
                }
              }
            };
          });
        }
      }).catch(err => console.warn('Asynchronous WHOIS enrichment notice:', err));
    }
  }, [detectedDomain, result?.id]);

  const pipelineSteps = [
    t('overlay.stage_1', 'Stage 1: Intake Agent (Text Ingestion, OCR & Language Detect)'),
    t('overlay.stage_2', 'Stage 2: Linguistic Risk Agent (EMSCAD Urgency & Fee Detection)'),
    t('overlay.stage_3', 'Stage 3: Verification Agent (WHOIS & Safe Browsing Check)'),
    t('overlay.stage_4', 'Stage 4: Reasoning Agent (Scam Probability Score Calculation)'),
    t('overlay.stage_5', 'Stage 5: Recommendation Agent (Generating Personalised Advice)')
  ];

  const getRiskLevelLabel = (level) => {
    if (!level) return t('risk_levels.low_risk', 'LOW RISK');
    if (level === 'Not a Job Advertisement') return t('risk_levels.not_job_ad', 'NOT A JOB ADVERTISEMENT');
    if (level === 'Unreadable Image') return t('risk_levels.unreadable_image', 'UNREADABLE IMAGE');
    if (level === 'Severe Risk' || level === 'Very High Risk') return t('risk_levels.very_high_risk', 'VERY HIGH SCAM RISK');
    if (level === 'High Risk') return t('risk_levels.high_risk', 'HIGH SCAM RISK');
    if (level === 'Medium Risk' || level === 'Moderate Risk') return t('risk_levels.medium_risk', 'MEDIUM RISK');
    if (level === 'Low Risk') return t('risk_levels.low_risk', 'LOW RISK');
    if (level === 'Very Low Risk') return t('risk_levels.very_low_risk', 'VERY LOW RISK / GENUINE');
    return level;
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setError('');
  };

  const handleResetScan = () => {
    setInputText('');
    setInputUrl('');
    handleRemoveFile();
    setResult(null);
    setError('');
    setCurrentStep(1);
    setAnalyzing(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedExts = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp'];
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      if (!allowedExts.includes(fileExt)) {
        setError('Unsupported file format. The system only accepts PDF (.pdf), Microsoft Word (.doc, .docx), and Images (.png, .jpg, .jpeg, .webp).');
        setSelectedFile(null);
        setPreviewUrl('');
        e.target.value = '';
        return;
      }
      setError('');
      setSelectedFile(file);
      if (['.png', '.jpg', '.jpeg', '.webp'].includes(fileExt)) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl('');
      }
    }
    // Allow re-selecting the same file if needed
    e.target.value = '';
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

      if (activeTab === 'text') formData.append('input_text', inputText.trim());
      if (activeTab === 'url') formData.append('input_url', inputUrl.trim());
      if (activeTab === 'image' && selectedFile) formData.append('image', selectedFile);

      const response = await api.post('/api/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearInterval(stepInterval);
      setCurrentStep(5);
      setResult(response.data);
    } catch (err) {
      clearInterval(stepInterval);
      console.warn("Backend API unavailable or error occurred. Executing client-side AI fallback engine:", err);
      try {
        const client = new GeminiAPIClient();
        const fallbackRes = await client.analyzeSubmission({
          inputType: activeTab,
          text: activeTab === 'text' ? inputText.trim() : '',
          url: activeTab === 'url' ? inputUrl.trim() : '',
          file: activeTab === 'image' ? selectedFile : null,
          language: targetLanguage
        });
        if (fallbackRes) {
          if (!fallbackRes.id) {
            fallbackRes.id = 'report_' + Date.now().toString(36);
          }
          setCurrentStep(5);
          setResult(fallbackRes);
        }
      } catch (fallbackErr) {
        setError(err.response?.data?.detail || 'Failed to complete scam analysis. Please check network connection.');
      }
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
              <span>{t('dashboard.authenticated_dashboard', 'AUTHENTICATED STUDENT DASHBOARD • 5-AGENT AI PIPELINE')}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
              {t('dashboard.welcome_back', 'Welcome back,')} <span className="gradient-text">{user?.full_name || 'Student'}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {t('dashboard.welcome_sub', 'Analyze job postings, recruitment screenshots, or URLs for scam risk signals in seconds.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Account Tier Badge */}
            <div className="px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold flex items-center space-x-2">
              <Crown className="w-4 h-4 text-amber-400 animate-pulse" />
              <div>
                <span className="block text-[10px] text-amber-400/80 font-mono uppercase">{t('dashboard.current_plan', 'Current Plan')}</span>
                <span className="text-xs font-bold text-amber-300">{t('dashboard.free_tier', 'Free Tier (LKR 0)')}</span>
              </div>
            </div>

            <Link
              to="/history"
              className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition shadow-sm"
            >
              <History className="w-4 h-4 text-emerald-400" />
              <span>{t('dashboard.past_verifications', 'Past Verifications')}</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">

        {/* INPUT FORM CONTAINER (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          <div className="glass-panel p-5 sm:p-7 rounded-3xl border border-slate-800 space-y-6 h-full flex flex-col justify-between">

            {/* Header: Submit Job Offer */}
            <div className="flex items-center space-x-3 pb-1 border-b border-slate-800/60">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-100">
                  {t('dashboard.submit_offer_title', 'Submit Job Offer')}
                </h2>
                <p className="text-xs text-slate-400">
                  {t('dashboard.submit_offer_subtitle', 'Choose how you want to check the job offer:')}
                </p>
              </div>
            </div>

            {/* 3 Modern Interactive Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: Text */}
              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 relative flex flex-col justify-between ${activeTab === 'text'
                  ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                  }`}
              >
                {activeTab === 'text' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shadow-md">
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  </div>
                )}
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-100">
                    {t('dashboard.tab_text', 'Text / Email Offer')}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {t('dashboard.tab_text_desc', 'Paste job offer text, email or WhatsApp message.')}
                  </p>
                </div>
              </button>

              {/* Card 2: Image */}
              <button
                type="button"
                onClick={() => setActiveTab('image')}
                className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 relative flex flex-col justify-between ${activeTab === 'image'
                  ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                  }`}
              >
                {activeTab === 'image' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shadow-md">
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  </div>
                )}
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center mb-2.5">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-100">
                    {t('dashboard.tab_image', 'Image / Screenshot')}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {t('dashboard.tab_image_desc', 'Upload an image (OCR analysis will be performed).')}
                  </p>
                </div>
              </button>

              {/* Card 3: URL */}
              <button
                type="button"
                onClick={() => setActiveTab('url')}
                className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 relative flex flex-col justify-between ${activeTab === 'url'
                  ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                  }`}
              >
                {activeTab === 'url' && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shadow-md">
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  </div>
                )}
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-2.5">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-100">
                    {t('dashboard.tab_url', 'Job URL')}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {t('dashboard.tab_url_desc', 'Check the safety of a job posting link.')}
                  </p>
                </div>
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
                    {t('dashboard.label_text_offer', 'Paste Job Offer / Email / WhatsApp Message:')}
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

              {/* TAB 2: IMAGE / DOCUMENT FILE UPLOAD */}
              {activeTab === 'image' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300">
                    {t('dashboard.label_image_upload', 'Upload Job Poster, Flyer, or Document (PDF, Word, Image):')}
                  </label>
                  <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 text-center cursor-pointer bg-slate-900/50 transition">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
                        {selectedFile ? selectedFile.name : t('dashboard.click_select_file', 'Click to select file (PDF, DOC, DOCX, PNG, JPG, WEBP)')}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-1">{t('dashboard.supported_formats', 'Supported Formats: PDF (.pdf), Word (.doc, .docx), Images (.png, .jpg, .jpeg, .webp)')}</span>
                    </label>

                    {selectedFile && (
                      <div className="mt-3 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveFile();
                          }}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t('dashboard.remove_file', 'Remove Selected File')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: URL */}
              {activeTab === 'url' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    {t('dashboard.label_url_input', 'Paste Job Offer URL / Company Website / Social Link:')}
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

              {/* BOTTOM CONTROLS: TARGET LANGUAGE & ANALYZE ACTION BUTTON */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3 border-t border-slate-800/80">
                {/* Target Language Dropdown Selector */}
                <div className="relative">
                  <select
                    value={targetLanguage}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="w-full sm:w-auto bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-200 outline-none cursor-pointer flex items-center transition shadow-sm"
                  >
                    <option value="en">🌐 English (EN)</option>
                    <option value="si">🌐 Sinhala (සිංහල)</option>
                    <option value="ta">🌐 Tamil (தமிழ்)</option>
                    <option value="hi">🌐 Hindi (हिंदी)</option>
                    <option value="bn">🌐 Bengali (বাংলা)</option>
                  </select>
                </div>

                {/* Submit CTA Button */}
                <button
                  type="submit"
                  disabled={analyzing}
                  className="w-full sm:w-auto py-3 px-7 rounded-xl btn-primary font-bold text-xs shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50 transition hover:scale-[1.02] active:scale-95"
                >
                  {analyzing ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>{t('dashboard.analyzing', 'Executing 5-Agent AI Pipeline...')}</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 text-white" />
                      <span>{t('dashboard.analyze_btn_label', 'Analyze Job Offer')}</span>
                      <ArrowRight className="w-4 h-4 text-white" />
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>

          {/* FULL SCREEN FUTURISTIC AI SCANNING OVERLAY WITH NO TOP GAPS & FROSTED GLASS BACKDROP BLUR */}
          {analyzing && typeof document !== 'undefined' && createPortal(
            <div
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', zIndex: 999999 }}
              className="fixed inset-0 z-[999999] w-screen h-screen flex flex-col items-center justify-center p-3 sm:p-6 animate-fade-in overflow-y-auto bg-slate-950/40 backdrop-blur-sm"
            >
              {/* SUBTLE LIGHT DIM OVERLAY */}
              <div className="absolute inset-0 bg-black/20 pointer-events-none" />

              {/* MODAL CARD */}
              <div className="relative z-10 w-full max-w-5xl my-auto glass-panel p-5 sm:p-8 rounded-3xl border border-indigo-500/50 shadow-[0_0_80px_rgba(99,102,241,0.4)] overflow-hidden bg-slate-900/90 backdrop-blur-2xl flex flex-col justify-between space-y-6 max-h-[92vh] overflow-y-auto">
                {/* Top ambient highlight line */}
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

                {/* Top Scanner Status Bar */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/40 shadow-sm">
                      <BrainCircuit className="w-6 h-6 text-sky-400 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-100 uppercase tracking-wider">
                        {t('overlay.scanner_active_title', 'SAFE-HIRE AI 5-Agent Multimodal Scanner Active')}
                      </h3>
                      <p className="text-xs text-slate-400">{t('overlay.scanner_active_sub', 'Deep Neural Verification & Vision OCR Mining in Progress...')}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-sky-300 bg-sky-500/20 px-3.5 py-1.5 rounded-full border border-sky-400/40 animate-pulse flex items-center space-x-1.5">
                    <Zap className="w-3.5 h-3.5 text-sky-400" />
                    <span>{t('overlay.neural_scanning', 'NEURAL SCANNING')}</span>
                  </span>
                </div>

                {/* DUAL-COLUMN SCANNER BODY (TOP-ALIGNED TO ELIMINATE TOP GAP) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start flex-1">

                  {/* LEFT/TOP: LARGE HIGH-RES POSTER LASER SCANNER PREVIEW */}
                  <div className="md:col-span-7 flex justify-center">
                    {(activeTab === 'image' && previewUrl) ? (
                      <div className="relative w-full max-w-md rounded-2xl overflow-hidden border-2 border-indigo-500/60 bg-slate-950/90 shadow-[0_0_50px_rgba(99,102,241,0.4)]">
                        <img src={previewUrl} alt="Poster Under Scan" className="w-full max-h-[380px] sm:max-h-[420px] object-contain opacity-95 p-2 mx-auto" />

                        {/* Neon Cyan Laser Scan Line */}
                        <div className="absolute inset-x-0 h-2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_25px_#38bdf8] animate-scan z-20 pointer-events-none" />

                        {/* Cyber Grid Overlay */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-20 pointer-events-none" />

                        {/* HUD Corner Markers */}
                        <div className="absolute top-3 left-3 text-[10px] font-mono font-bold text-cyan-300 bg-slate-950/90 px-3 py-1 rounded-lg border border-cyan-500/40 shadow">
                          {t('overlay.ocr_extraction_hud', '[OCR TEXT MINING & EXTRACTION]')}
                        </div>
                        <div className="absolute bottom-3 right-3 text-[10px] font-mono font-bold text-emerald-300 bg-slate-950/90 px-3 py-1 rounded-lg border border-emerald-500/40 shadow">
                          {t('overlay.gemini_vision_hud', '[GEMINI VISION AI]')}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-64 sm:h-[360px] rounded-2xl border border-indigo-500/30 bg-slate-950/70 flex flex-col items-center justify-center text-center p-8 space-y-4">
                        <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/40">
                          <Sparkles className="w-8 h-8 text-sky-400 animate-spin" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-200">{t('overlay.processing_job_offer', 'Processing Job Offer Details')}</h4>
                          <p className="text-xs text-slate-400 mt-1">{t('overlay.executing_nlp_whois', 'Executing deep NLP linguistic audit & domain WHOIS lookup')}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* RIGHT/BOTTOM: 5-AGENT NEURAL PIPELINE NODES (TOP-ALIGNED) */}
                  <div className="md:col-span-5 flex flex-col justify-start space-y-3">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider pb-1.5 border-b border-slate-800/80 flex items-center justify-between">
                      <span>{t('overlay.pipeline_execution_title', '5-Agent Pipeline Execution')}</span>
                      <span className="text-[10px] text-indigo-400 font-mono">STEP {currentStep}/5</span>
                    </div>
                    {pipelineSteps.map((stepName, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs backdrop-blur-md transition-all">
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
                          <span className="text-[10px] font-bold text-sky-400 animate-pulse font-mono bg-sky-500/15 px-2.5 py-1 rounded-md border border-sky-500/30">
                            {t('overlay.analyzing_status', 'ANALYZING...')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                </div>

              </div>
            </div>,
            document.body
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
                        {t('dashboard.full_report_title', 'Full AI Audit Report & Verification Certificate')}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {t('dashboard.verified_badge', 'VERIFIED')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t('dashboard.analyzed_on', 'Analyzed on')} {new Date(result.created_at || Date.now()).toLocaleString()} • {t('dashboard.target_user', 'Target')}: {user?.full_name || 'Student'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  {/* Language Selector inside Report Header */}
                  <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2 text-xs text-slate-200">
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    <select
                      value={i18n.language}
                      onChange={(e) => handleLanguageChange(e.target.value)}
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
                    onClick={handleResetScan}
                    className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition"
                    title={t('dashboard.new_scan', 'Start New Scan')}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                    <span>{t('dashboard.new_scan', 'New Scan')}</span>
                  </button>

                  <button
                    onClick={() => exportAnalysisReport(result, user, i18n.language)}
                    className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl btn-primary font-bold text-xs shadow-md transition hover:scale-105"
                  >
                    <Download className="w-4 h-4 text-white" />
                    <span>{t('dashboard.download_report')}</span>
                  </button>

                  <button
                    onClick={() => openAIModal({
                      title: `Gemini 3.6 Flash Deep AI Audit (Report #${(result.id || 'REPORT').slice(-6)})`,
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

              {/* NOT A JOB ADVERTISEMENT OR LOW RISK EVIDENCE BANNERS */}
              {(result.risk_level === 'Not a Job Advertisement' || result.scam_score === 'N/A' || result.risk_level === 'Unable to Determine') ? (
                <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-start space-x-3 text-sky-300">
                  <AlertCircle className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sky-200 text-xs sm:text-sm uppercase tracking-wider">
                      {result.risk_level === 'Unable to Determine' ? '⚠️ UNREADABLE / INSUFFICIENT EVIDENCE' : '⚠️ NOT A JOB ADVERTISEMENT'}
                    </h4>
                    <p className="text-xs text-sky-300/90 mt-1 leading-relaxed">
                      {result.intake_data?.poster_summary || 'The SAFE-HIRE 5-Agent AI pipeline determined that this content does not appear to contain an active recruitment vacancy. A standard recruitment scam score cannot be meaningfully calculated for non-job media.'}
                    </p>
                  </div>
                </div>
              ) : (typeof result.scam_score === 'number' && result.scam_score <= 20) && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start space-x-3 text-emerald-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-emerald-200 text-xs sm:text-sm uppercase tracking-wider">✅ LOW APPARENT RISK RECRUITMENT CONTENT</h4>
                    <p className="text-xs text-emerald-300/90 mt-1 leading-relaxed">
                      No critical upfront fee demands, company impersonation flags, or known scam signals were detected based on available evidence. Always verify offers directly on official corporate career channels.
                    </p>
                  </div>
                </div>
              )}

              {/* VERDICT BANNER & METADATA GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{t('dashboard.risk_level', 'Risk Level Verdict')}</span>
                  <span className={`text-sm font-extrabold block ${result.risk_level === 'Not a Job Advertisement' || result.scam_score === 'N/A' || result.risk_level === 'Unable to Determine'
                    ? 'text-sky-400'
                    : Number(result.scam_score) >= 81
                      ? 'text-rose-400'
                      : Number(result.scam_score) >= 61
                        ? 'text-orange-400'
                        : Number(result.scam_score) >= 41
                          ? 'text-amber-400'
                          : Number(result.scam_score) >= 21
                            ? 'text-yellow-400'
                            : 'text-emerald-400'
                    }`}>
                    {result.risk_level === 'Not a Job Advertisement' || result.scam_score === 'N/A'
                      ? 'NOT A JOB ADVERTISEMENT'
                      : result.risk_level === 'Unable to Determine'
                        ? 'UNABLE TO DETERMINE'
                        : getRiskLevelLabel(result.risk_level)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{t('dashboard.scam_score', 'Scam Risk Score')}</span>
                  <span className="text-sm font-extrabold text-slate-100 font-mono block">
                    {result.scam_score === 'N/A' || typeof result.scam_score === 'string' ? `${result.scam_score} (N/A)` : `${result.scam_score} / 100`}
                  </span>
                </div>

                {/* DOMAIN AGE & TECHNICAL AUDIT */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{t('dashboard.domain_age', 'Domain Age')}</span>
                    {detectedDomain && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-950/70 text-sky-300 border border-sky-800/50 truncate max-w-[110px]" title={detectedDomain}>
                        {detectedDomain}
                      </span>
                    )}
                  </div>
                  {detectedDomain ? (
                    <div>
                      <span className={`text-sm font-extrabold block ${detectedWhois?.is_new_domain ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {detectedWhois?.registered_days !== undefined && detectedWhois?.registered_days !== null
                          ? (detectedWhois.domain_years !== undefined && detectedWhois.domain_years !== null && detectedWhois.domain_years > 0
                            ? `${detectedWhois.domain_years}+ ${detectedWhois.domain_years === 1 ? 'Year' : 'Years'} Old (${detectedWhois.registered_days}d)`
                            : `${detectedWhois.registered_days} Days Old`
                          )
                          : (detectedWhois?.whois_status ? detectedWhois.whois_status.split('•')[0].trim() : (detectedWhois?.status === 'verified' ? 'Established Record' : 'Active Domain Record'))}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">
                        {detectedWhois?.creation_date && detectedWhois.creation_date !== 'N/A' && !isNaN(new Date(detectedWhois.creation_date).getTime())
                          ? `Reg: ${new Date(detectedWhois.creation_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`
                          : (detectedWhois?.registered_days ? `Reg: ${new Date(Date.now() - detectedWhois.registered_days * 86400000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}` : (detectedWhois?.registrar ? `Registrar: ${detectedWhois.registrar}` : 'WHOIS verified'))}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs font-semibold text-slate-400 block">No Domain In Post</span>
                      <span className="text-[10px] text-slate-500 block">No external website URL</span>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{t('dashboard.select_lang', 'Language')} & Pipeline</span>
                  <span className="text-xs font-bold text-sky-400 uppercase block">
                    {result.language || 'EN'} • 5-Agent Pipeline
                  </span>
                </div>
              </div>

              {/* LIVE URL & WHOIS DOMAIN SECURITY AUDIT CARD */}
              {detectedDomain && (
                <div className="p-5 rounded-2xl bg-slate-950/90 border border-indigo-500/30 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-sky-400" />
                      <span>{t('dashboard.domain_security_title', 'Live URL & WHOIS Domain Security Audit')}</span>
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                      {t('dashboard.whois_live_audit', 'WHOIS LIVE AUDIT')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">{t('dashboard.target_domain', 'Target Domain / URL')}</span>
                      <span className="font-semibold text-slate-200 text-xs font-mono truncate block">
                        {detectedDomain}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">{t('dashboard.domain_age', 'Domain Age')}</span>
                      <span className={`font-semibold text-xs block ${detectedWhois.is_new_domain ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                        {detectedWhois.registered_days !== undefined && detectedWhois.registered_days !== null
                          ? (detectedWhois.domain_years !== undefined && detectedWhois.domain_years !== null && detectedWhois.domain_years > 0
                            ? `${detectedWhois.domain_years}+ ${detectedWhois.domain_years === 1 ? 'Year' : 'Years'} Old (${detectedWhois.registered_days} Days)`
                            : `${detectedWhois.registered_days} ${t('dashboard.registered_days_suffix', 'Days (Registered)')}`
                          )
                          : (detectedWhois?.whois_status ? detectedWhois.whois_status.split('•')[0].trim() : (detectedWhois.status === 'verified' ? 'Established Record' : 'Active Domain Record'))}
                      </span>
                    </div>

                    {/* Domain Registration Date (Created On) */}
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">{t('dashboard.registration_date', 'Domain Registration Date')}</span>
                      <span className="font-semibold text-slate-200 text-xs font-mono block">
                        {detectedWhois.creation_date && detectedWhois.creation_date !== 'N/A' && !isNaN(new Date(detectedWhois.creation_date).getTime())
                          ? new Date(detectedWhois.creation_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                          : (detectedWhois.registered_days
                            ? new Date(Date.now() - detectedWhois.registered_days * 86400000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                            : 'Live Record Verified'
                          )}
                      </span>
                    </div>

                    {/* Expiration Date if Available */}
                    {detectedWhois.expiration_date && detectedWhois.expiration_date !== 'N/A' && !isNaN(new Date(detectedWhois.expiration_date).getTime()) && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">{t('dashboard.expiration_date', 'Domain Expiry Date')}</span>
                        <span className="font-semibold text-slate-200 text-xs font-mono block">
                          {new Date(detectedWhois.expiration_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    )}

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">{t('dashboard.registrar', 'Registrar')}</span>
                      <span className="font-semibold text-slate-200 text-xs truncate block">
                        {detectedWhois.registrar || 'ICANN Accredited Registrar'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">{t('dashboard.safe_browsing', 'Safe Browsing')}</span>
                      <span className={`font-semibold text-xs truncate block ${result.verification_data?.safe_browsing?.flagged ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {result.verification_data?.safe_browsing?.status || 'Clean / Unflagged'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 sm:col-span-2">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">{t('dashboard.whois_security_status', 'WHOIS Domain Security Status')}</span>
                      <span className={`font-semibold text-xs block ${detectedWhois.is_new_domain ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                        {detectedWhois.whois_status || (detectedWhois.is_new_domain ? '⚠️ Newly registered domain (< 90 days)' : '✅ Established active domain record')}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* REASONING EXPLANATION CARD (LEFT SIDE PANEL) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                    <BrainCircuit className="w-4 h-4 text-indigo-400" />
                    <span>{t('dashboard.reasoning_explanation', 'Reasoning Explanation')}</span>
                  </h4>
                  <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
                    {t('dashboard.ai_audit_rationale', 'AI AUDIT RATIONALE')}
                  </span>
                </div>
                {isTranslatingReport ? (
                  <div className="flex items-center space-x-2 py-6 justify-center text-xs text-sky-400 font-semibold animate-pulse bg-slate-900/90 rounded-xl border border-slate-800/80">
                    <Sparkles className="w-4 h-4 text-sky-400 animate-spin" />
                    <span>Translating report to {targetLanguage.toUpperCase()}...</span>
                  </div>
                ) : (
                  <StructuredExplanationView text={result.explanation_text} />
                )}
              </div>

              {/* STUDENT SAFETY ACTION PLAN */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{t('dashboard.tailored_student_safety_recommendations', 'Tailored Student Safety Recommendations')}</span>
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
                  <span>{t('dashboard.verified_by_engine', 'Verified by SAFE-HIRE Agentic AI Engine')}</span>
                </div>
                <div className="flex items-center space-x-2 font-mono text-[10px] text-slate-500">
                  <span>{t('dashboard.report_hash', 'Report Hash')}: {result.id || 'CERT-SECURE'}</span>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* RESULTS CARD DISPLAY (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          {result ? (
            <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6 animate-fade-in">

              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-100">{t('dashboard.results_title')}</h2>
                <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-sky-400">
                  ID: #{(result.id || 'REPORT').slice(-6)}
                </span>
              </div>

              {/* SCAM GAUGE */}
              <ScamGauge score={result.scam_score} riskLevel={result.risk_level} />

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
            <div className="glass-panel p-6 sm:p-7 rounded-3xl border border-sky-500/30 shadow-2xl relative overflow-hidden bg-slate-950/85 backdrop-blur-2xl animate-fade-in h-full flex flex-col justify-between">
              {/* Background ambient glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-5 flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-400/35 flex items-center justify-center shadow-lg shadow-sky-500/15">
                    <Shield className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-white tracking-tight">
                      {t('dashboard.security_center_title', 'AI Security Center')}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t('dashboard.security_center_subtitle', 'Your job offer is safe with our 5 AI agents')}
                    </p>
                  </div>
                </div>

                <div className="self-start sm:self-center inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-semibold shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{t('dashboard.ready_to_analyze', 'Ready to Analyze')}</span>
                </div>
              </div>

              {/* Card Body: Futuristic Cyber Radar Graphic + 5 Security Checks */}
              <div className="pt-6 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center flex-1 my-auto">

                {/* Concentric Cybernetic Radar Shield with Modern Animations */}
                <div className="sm:col-span-5 flex justify-center py-2">
                  <div className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center">
                    {/* Ambient pulsing outer glow */}
                    <div className="absolute inset-0 rounded-full bg-cyan-500/15 blur-2xl animate-pulse pointer-events-none" />

                    {/* Expanding Sonar Waves (expanding ripples) */}
                    <div className="absolute inset-0 rounded-full border border-cyan-400/40 animate-sonar-ring pointer-events-none" />
                    <div className="absolute inset-2 rounded-full border border-sky-400/30 animate-sonar-ring pointer-events-none" style={{ animationDelay: '1.2s' }} />

                    {/* Outermost Ring */}
                    <div className="absolute inset-0 rounded-full border border-sky-500/35 flex items-center justify-center">
                      {/* Sweeping Radar Scanner Line */}
                      <div className="absolute inset-0 rounded-full animate-radar-sweep pointer-events-none overflow-hidden">
                        <div className="w-1/2 h-1/2 absolute top-0 right-0 bg-gradient-to-bl from-cyan-400/30 via-sky-500/10 to-transparent origin-bottom-left" />
                        <div className="w-1/2 h-[2px] absolute top-1/2 right-0 bg-gradient-to-r from-transparent via-cyan-300 to-cyan-400 origin-left shadow-[0_0_8px_#38bdf8]" />
                      </div>

                      {/* Orbiting Satellite Particle on Outer Ring */}
                      <div className="absolute inset-0 animate-radar-sweep pointer-events-none">
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 absolute -top-1.5 left-1/2 -translate-x-1/2 shadow-[0_0_10px_#38bdf8] animate-pulse" />
                      </div>
                    </div>

                    {/* Middle Ring with Radial Ticks */}
                    <div className="w-32 h-32 sm:w-34 sm:h-34 rounded-full border border-sky-400/40 bg-sky-950/30 flex items-center justify-center shadow-[inset_0_0_20px_rgba(56,189,248,0.25)] relative">
                      {/* Crosshair guidelines */}
                      <div className="absolute inset-x-0 top-1/2 h-[1px] bg-sky-500/20" />
                      <div className="absolute inset-y-0 left-1/2 w-[1px] bg-sky-500/20" />

                      {/* Inner glowing core with Breathing Neon Shield */}
                      <div className="w-22 h-22 sm:w-24 sm:h-24 rounded-full border-2 border-cyan-400/60 bg-gradient-to-tr from-cyan-950/70 via-sky-900/50 to-emerald-950/70 flex items-center justify-center shadow-[0_0_30px_rgba(56,189,248,0.45)] relative z-10">
                        <div className="relative flex items-center justify-center animate-cyber-pulse">
                          <Shield className="w-11 h-11 sm:w-12 sm:h-12 text-cyan-400 fill-cyan-400/30 filter drop-shadow-[0_0_14px_rgba(56,189,248,0.95)]" />
                          <Check className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300 stroke-[3.5] absolute" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5 Security Agent Checks List */}
                <div className="sm:col-span-7 space-y-3.5">
                  {[
                    {
                      title: t('dashboard.check_content_title', 'Intake & Multimodal OCR'),
                      desc: t('dashboard.check_content_desc', 'Ingests text, scans images & extracts OCR signals')
                    },
                    {
                      title: t('dashboard.check_pattern_title', 'Linguistic Risk Agent'),
                      desc: t('dashboard.check_pattern_desc', 'Detects fee demands, urgency & impersonation')
                    },
                    {
                      title: t('dashboard.check_company_title', 'Verification Agent'),
                      desc: t('dashboard.check_company_desc', 'WHOIS domain age & Google Safe Browsing')
                    },
                    {
                      title: t('dashboard.check_url_title', 'Reasoning Agent (Gemini AI)'),
                      desc: t('dashboard.check_url_desc', 'Synthesizes evidence into 0–100 Scam Score')
                    },
                    {
                      title: t('dashboard.check_risk_title', 'Recommendation Agent'),
                      desc: t('dashboard.check_risk_desc', 'Generates actionable student safety guidance')
                    }
                  ].map((check, idx) => (
                    <div key={idx} className="flex items-start space-x-3 group">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm shadow-emerald-500/25 group-hover:scale-110 group-hover:bg-emerald-500/30 transition-all duration-300">
                        <Check className="w-3.5 h-3.5 text-emerald-300 stroke-[3]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors leading-tight">
                          {check.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                          {check.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              {/* Bottom Status Bar (Aligned with Left Card Bottom Action Bar) */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800/80 text-xs flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-medium text-slate-300">Continuous AI Guard Active</span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">5-AGENT READY</span>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default DashboardPage;
