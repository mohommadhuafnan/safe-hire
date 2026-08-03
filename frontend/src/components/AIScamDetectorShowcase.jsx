import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  RotateCw, 
  ArrowRight, 
  XCircle,
  BrainCircuit,
  Search,
  Lock,
  Globe,
  FileSearch
} from 'lucide-react';

const AIScamDetectorShowcase = () => {
  const { t } = useTranslation();
  const [scanStep, setScanStep] = useState(1);
  const [isScanning, setIsScanning] = useState(true);
  const [scanComplete, setScanComplete] = useState(false);

  const scanStepMessages = [
    "Step 1: Scanning poster pixels & extracting OCR text...",
    "Step 2: Checking domain WHOIS registry & age...",
    "Step 3: Analyzing recruiter channel & email domain...",
    "Step 4: Checking upfront payment & fee requests...",
    "Step 5: Generating AI confidence ratings..."
  ];

  const pipelineStages = [
    { step: 1, name: "Upload" },
    { step: 2, name: "OCR" },
    { step: 3, name: "NLP" },
    { step: 4, name: "Verification" },
    { step: 5, name: "Risk Engine" },
    { step: 6, name: "Final Score" }
  ];

  const startLiveScan = () => {
    setIsScanning(true);
    setScanComplete(false);
    setScanStep(1);
  };

  useEffect(() => {
    if (!isScanning) return;

    const interval = setInterval(() => {
      setScanStep((prevStep) => {
        if (prevStep < 5) {
          return prevStep + 1;
        } else {
          clearInterval(interval);
          setIsScanning(false);
          setScanComplete(true);
          return 6;
        }
      });
    }, 600);

    return () => clearInterval(interval);
  }, [isScanning]);

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 my-12">
      
      {/* SECTION HEADER */}
      <div className="text-center mb-10 space-y-3">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-sky-400 text-xs font-bold shadow-lg shadow-indigo-500/10 animate-pulse">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>AI Scam Detector Live Demonstration</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
          Spot Scam Job Posters <span className="gradient-text">Instantly</span>
        </h2>

        <p className="text-slate-400 text-sm max-w-3xl mx-auto leading-relaxed">
          SAFE-HIRE uses multiple AI agents to compare suspicious job advertisements against verified corporate listings and explain every decision in real time.
        </p>
      </div>

      {/* MAIN CYBER SECURITY DASHBOARD PANEL */}
      <div className="glass-panel p-6 sm:p-8 rounded-[24px] border border-indigo-500/30 shadow-2xl shadow-slate-950 relative overflow-hidden bg-slate-950/90 backdrop-blur-2xl">
        
        {/* TOP STATUS BAR & INTERACTIVE RE-SCAN CONTROLS */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-2xl bg-slate-900/90 border border-slate-800 mb-8 gap-4">
          
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                <span>Status:</span>
                <span className={isScanning ? "text-cyan-400" : "text-emerald-400"}>
                  {isScanning ? "LIVE AI SCANNING IN PROGRESS..." : "SCAN COMPLETE • AUDIT READY"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                {isScanning 
                  ? (scanStepMessages[scanStep - 1] || "Processing...") 
                  : "Both posters audited across 5 AI Agent security layers."
                }
              </p>
            </div>
          </div>

          <button
            onClick={startLiveScan}
            disabled={isScanning}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/30 flex items-center space-x-2 transition disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
            <span>Re-Run AI Live Scan</span>
          </button>
        </div>

        {/* VS HEADER INDICATOR */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
            [Fake Poster]
          </span>
          <span className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-xs font-extrabold text-indigo-300 shadow-md">
            VS
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            [Real Poster]
          </span>
        </div>

        {/* THREE COLUMN GRID: FAKE | SHIELD CORE | REAL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* ========================================================================= */}
          {/* LEFT POSTER: SUSPICIOUS SCAM JOB AD (5 COLS) */}
          {/* ========================================================================= */}
          <div className={`lg:col-span-5 rounded-[24px] p-5 sm:p-6 border transition-all duration-500 flex flex-col justify-between space-y-5 relative group overflow-hidden ${
            scanComplete 
              ? 'bg-rose-950/20 border-rose-500/60 shadow-2xl shadow-rose-950/40' 
              : 'bg-slate-900/60 border-slate-800'
          }`}>
            
            {/* Animated Laser Scanning Line */}
            {isScanning && (
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent top-0 animate-bounce shadow-[0_0_15px_#ef4444] z-20" />
            )}

            <div className="space-y-4">
              {/* Header Badges */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold text-xs">
                    ⚠️
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">Suspicious Scam Job Ad</h3>
                    <span className="text-[10px] text-slate-400">Telegram & WhatsApp Target</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                    scanComplete
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {scanComplete ? '95% SCAM PROBABILITY' : 'SCANNING...'}
                  </span>
                </div>
              </div>

              {/* Poster Image Preview with Overlay */}
              <div className="relative rounded-2xl overflow-hidden border border-rose-500/30 bg-slate-950 max-h-64 flex items-center justify-center group-hover:scale-[1.02] transition duration-300">
                <img 
                  src="/images/scam_job_poster.png" 
                  alt="Fake Scam Job Poster" 
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                
                <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-slate-950/90 border border-rose-500/30 backdrop-blur-md">
                  <span className="text-[10px] font-bold text-rose-400 block mb-0.5">Fake Recruiter Channel:</span>
                  <p className="text-[10px] text-slate-300 font-mono">Telegram @job_recruiter_fast • $500 Daily Pay</p>
                </div>
              </div>

              {/* Company Logo & Apply Button Preview */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-rose-500/20 text-rose-400 font-bold text-[10px] flex items-center justify-center">
                    ❌
                  </div>
                  <span className="font-semibold text-slate-300">Quick Money Ltd (Unverified)</span>
                </div>
                <button disabled className="px-3 py-1 rounded-lg bg-slate-800 text-rose-400 font-bold text-[10px] cursor-not-allowed opacity-75">
                  Fake Apply
                </button>
              </div>

              {/* Animated AI Red Flags Card */}
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2.5 text-xs">
                <div className="flex items-center justify-between font-bold text-rose-400">
                  <span className="flex items-center">
                    <XCircle className="w-4 h-4 mr-1.5" />
                    🔴 Scam Probability & Risk Level
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-[10px]">CRITICAL RISK</span>
                </div>

                <ul className="space-y-1.5 text-[11px] text-slate-300 font-medium">
                  <li className="flex items-center space-x-1.5 text-rose-300">
                    <span>• Telegram Only Contact (@job_recruiter_fast)</span>
                  </li>
                  <li className="flex items-center space-x-1.5 text-rose-300">
                    <span>• Upfront Registration Fee ($30 Laptop Shipment Fee)</span>
                  </li>
                  <li className="flex items-center space-x-1.5 text-rose-300">
                    <span>• Unrealistic Salary ($500 Daily for 1 Hour Work)</span>
                  </li>
                  <li className="flex items-center space-x-1.5 text-rose-300">
                    <span>• No Official Company Website or Domain</span>
                  </li>
                  <li className="flex items-center space-x-1.5 text-rose-300">
                    <span>• Free Gmail / Hotmail Recruiter Email Mismatch</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* CENTER: GLOWING AI SECURITY SHIELD CORE (2 COLS) */}
          {/* ========================================================================= */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center space-y-6 py-6 lg:py-0">
            
            <div className="relative group">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 p-0.5 shadow-2xl shadow-indigo-500/50 glow-btn flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[22px] flex flex-col items-center justify-center p-2 text-center">
                  <ShieldCheck className="w-8 h-8 text-sky-400 animate-pulse" />
                  <span className="text-[9px] font-extrabold text-slate-100 tracking-wider mt-1 uppercase">SAFE-HIRE AI</span>
                </div>
              </div>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-950 animate-ping" />
            </div>

            <div className="text-center space-y-2">
              <span className="text-xs font-extrabold text-slate-200 block uppercase tracking-wider">
                5 AI Agents Working
              </span>

              {/* 5 Working Agent Checkmarks */}
              <div className="space-y-1 text-[11px] font-semibold text-slate-300">
                <div className={`flex items-center justify-center space-x-1 ${scanStep >= 2 ? "text-emerald-400" : "text-slate-500"}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>OCR Agent</span>
                </div>
                <div className={`flex items-center justify-center space-x-1 ${scanStep >= 3 ? "text-emerald-400" : "text-slate-500"}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>NLP Agent</span>
                </div>
                <div className={`flex items-center justify-center space-x-1 ${scanStep >= 4 ? "text-emerald-400" : "text-slate-500"}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Scam Pattern AI</span>
                </div>
                <div className={`flex items-center justify-center space-x-1 ${scanStep >= 5 ? "text-emerald-400" : "text-slate-500"}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Domain Verification</span>
                </div>
                <div className={`flex items-center justify-center space-x-1 ${scanStep >= 6 ? "text-emerald-400" : "text-slate-500"}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Company Verification</span>
                </div>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* RIGHT POSTER: GENUINE CORPORATE LISTING (5 COLS) */}
          {/* ========================================================================= */}
          <div className={`lg:col-span-5 rounded-[24px] p-5 sm:p-6 border transition-all duration-500 flex flex-col justify-between space-y-5 relative group overflow-hidden ${
            scanComplete 
              ? 'bg-emerald-950/20 border-emerald-500/60 shadow-2xl shadow-emerald-950/40' 
              : 'bg-slate-900/60 border-slate-800'
          }`}>
            
            {/* Animated Laser Scanning Line */}
            {isScanning && (
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent top-0 animate-bounce shadow-[0_0_15px_#10b981] z-20" />
            )}

            <div className="space-y-4">
              {/* Header Badges */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
                    ✅
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">Genuine Corporate Poster</h3>
                    <span className="text-[10px] text-slate-400">Official TechCorp Portal</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                    scanComplete
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {scanComplete ? '96% LEGITIMATE' : 'SCANNING...'}
                  </span>
                </div>
              </div>

              {/* Poster Image Preview with Overlay */}
              <div className="relative rounded-2xl overflow-hidden border border-emerald-500/30 bg-slate-950 max-h-64 flex items-center justify-center group-hover:scale-[1.02] transition duration-300">
                <img 
                  src="/images/genuine_job_poster.png" 
                  alt="Genuine Corporate Job Poster" 
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                
                <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-slate-950/90 border border-emerald-500/30 backdrop-blur-md">
                  <span className="text-[10px] font-bold text-emerald-400 block mb-0.5">Verified Career Portal:</span>
                  <p className="text-[10px] text-slate-300 font-mono">www.techcorp.com/careers • Free Application</p>
                </div>
              </div>

              {/* Company Logo & Apply Button Preview */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center justify-center">
                    🏢
                  </div>
                  <span className="font-semibold text-slate-300">TechCorp Inc. (Verified)</span>
                </div>
                <button className="px-3 py-1 rounded-lg btn-primary font-bold text-[10px] shadow-sm">
                  Apply via Official Portal
                </button>
              </div>

              {/* Animated AI Checks Passed Card */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5 text-xs">
                <div className="flex items-center justify-between font-bold text-emerald-400">
                  <span className="flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    🟢 Legitimate Score & Checks Passed
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-[10px]">VERIFIED CLEAN</span>
                </div>

                <ul className="space-y-1.5 text-[11px] text-slate-300 font-medium">
                  <li className="flex items-center space-x-1.5 text-emerald-300">
                    <span>• Official Corporate Domain (techcorp.com)</span>
                  </li>
                  <li className="flex items-center space-x-1.5 text-emerald-300">
                    <span>• Corporate Email Mismatch: Verified (@techcorp.com)</span>
                  </li>
                  <li className="flex items-center space-x-1.5 text-emerald-300">
                    <span>• Zero Registration or Application Fees ($0)</span>
                  </li>
                  <li className="flex items-center space-x-1.5 text-emerald-300">
                    <span>• WHOIS Domain Record: Verified (12+ Years Old)</span>
                  </li>
                  <li className="flex items-center space-x-1.5 text-emerald-300">
                    <span>• Official LinkedIn Corporate Profile Verified</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>

        </div>

        {/* ========================================================================= */}
        {/* BOTTOM HORIZONTAL TIMELINE: AI DETECTION PIPELINE */}
        {/* ========================================================================= */}
        <div className="mt-10 pt-8 border-t border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center">
              <BrainCircuit className="w-4 h-4 mr-2 text-indigo-400" />
              AI Detection Pipeline Stages
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Real-Time Multi-Agent Execution</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            {pipelineStages.map((stage) => {
              const isActive = scanStep >= stage.step;
              const isCurrent = scanStep === stage.step;

              return (
                <div 
                  key={stage.step}
                  className={`p-3 rounded-xl border text-center transition-all duration-300 ${
                    isCurrent
                      ? 'bg-indigo-600/30 border-sky-400 text-sky-300 shadow-lg shadow-indigo-500/20 scale-105'
                      : isActive
                      ? 'bg-slate-900 border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-900/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="text-[10px] font-mono text-slate-400">Stage {stage.step}</div>
                  <div className="text-xs font-bold mt-0.5">{stage.name}</div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </section>
  );
};

export default AIScamDetectorShowcase;
