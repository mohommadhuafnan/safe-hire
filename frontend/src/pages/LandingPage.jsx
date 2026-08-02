import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { 
  ShieldCheck, 
  Search, 
  Globe2, 
  BrainCircuit, 
  FileText, 
  CheckCircle, 
  ArrowRight, 
  Lock,
  GraduationCap,
  AlertTriangle,
  CheckCircle2,
  Crown,
  Sparkles,
  Zap,
  HelpCircle,
  X
} from 'lucide-react';

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Pricing State: 'monthly' (1 Month) vs 'annual' (1 Year)
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedPlanModal, setSelectedPlanModal] = useState(null);

  // Redirect authenticated user directly to Dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handlePlanSelect = (plan) => {
    setSelectedPlanModal(plan);
  };

  return (
    <div className="space-y-24 pb-16">
      
      {/* HERO SECTION */}
      <section className="relative pt-12 pb-8 px-6 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-6 animate-pulse">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>{t('landing.tagline')}</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-100 leading-tight mb-6">
          AI-Powered Protection Against <br className="hidden sm:inline" />
          <span className="gradient-text">Recruitment & Job Scams</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed mb-8">
          {t('landing.subhead')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/signup"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 glow-btn flex items-center justify-center space-x-2"
          >
            <span>{t('landing.cta_start')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-sm transition flex items-center justify-center space-x-2"
          >
            <Lock className="w-4 h-4 text-sky-400" />
            <span>{t('landing.cta_login')}</span>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 pt-8 border-t border-slate-900 flex flex-wrap items-center justify-center gap-8 text-xs text-slate-400 font-medium">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            <span>Built for University Students</span>
          </div>
          <div className="flex items-center space-x-2">
            <Globe2 className="w-4 h-4 text-sky-400" />
            <span>5 South Asian Languages Supported</span>
          </div>
          <div className="flex items-center space-x-2">
            <BrainCircuit className="w-4 h-4 text-emerald-400" />
            <span>5-Agent AI Pipeline</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FAKE VS REAL JOB POSTER DEMONSTRATION SHOWCASE */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4" />
            <span>REAL-WORLD SCAM DEMONSTRATION</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
            Spot Fake Job Posters vs Genuine Ads
          </h2>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">
            Fraudulent recruiters target students on WhatsApp, Facebook, and Telegram. Here is how SAFE-HIRE's 5-Agent AI automatically identifies high-risk scams.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* FAKE SCAM POSTER DEMO */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-rose-500/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl bg-rose-500/20 border-b border-l border-rose-500/30 text-rose-400 text-xs font-bold flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>HIGH RISK SCAM (95/100)</span>
            </div>

            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
                  <span className="text-rose-400">Suspicious Scam Job Poster</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Detected Flags: Upfront Fee Demand, Telegram-only Contact, High Unrealistic Pay</p>
              </div>

              {/* DEMO IMAGE */}
              <div className="relative rounded-2xl overflow-hidden border border-rose-500/20 bg-slate-950 max-h-72 flex items-center justify-center">
                <img 
                  src="/images/scam_job_poster.png" 
                  alt="Scam Job Poster Demonstration" 
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-slate-900/90 border border-rose-500/30 text-[11px] text-slate-200">
                  <span className="font-bold text-rose-400 block mb-0.5">⚠️ Red Flags Triggered:</span>
                  <p className="text-[10px] text-slate-300">"Registration fee of $30 required for laptop shipment kit. Contact recruiter on Telegram @job_recruiter_fast"</p>
                </div>
              </div>

              {/* AI SIGNAL BREAKDOWN */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
                  <span className="font-bold block">Fee Demand:</span> $30 Required
                </div>
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
                  <span className="font-bold block">Recruiter Channel:</span> Telegram @job_fast
                </div>
              </div>
            </div>
          </div>

          {/* GENUINE JOB POSTER DEMO */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl bg-emerald-500/20 border-b border-l border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>VERIFIED LEGITIMATE (5/100)</span>
            </div>

            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                  <span className="text-emerald-400">Verified Corporate Internship Poster</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">Verified Signals: Official Domain, Zero Payment Demand, Corporate Email</p>
              </div>

              {/* DEMO IMAGE */}
              <div className="relative rounded-2xl overflow-hidden border border-emerald-500/20 bg-slate-950 max-h-72 flex items-center justify-center">
                <img 
                  src="/images/genuine_job_poster.png" 
                  alt="Genuine Corporate Internship Poster" 
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-[11px] text-slate-200">
                  <span className="font-bold text-emerald-400 block mb-0.5">✅ Verified Corporate Listing:</span>
                  <p className="text-[10px] text-slate-300">"Apply via official career portal: www.techcorp.com/careers. No application or equipment fees."</p>
                </div>
              </div>

              {/* AI SIGNAL BREAKDOWN */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  <span className="font-bold block">Domain WHOIS:</span> Verified 12+ Yrs
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  <span className="font-bold block">Application Fee:</span> FREE ($0)
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 5 AGENTS VISUAL WORKFLOW */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">
            How SAFE-HIRE 5-Agent AI Works
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            An automated multi-agent pipeline analyzes job postings, screenshots, and URLs in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            {
              step: '1',
              title: 'Intake Agent',
              desc: 'Processes text, image OCR screenshots, and URLs; auto-detects language.',
              color: 'from-indigo-500 to-blue-600'
            },
            {
              step: '2',
              title: 'Linguistic Risk',
              desc: 'Evaluates EMSCAD signals: urgency, payment demands, email domain anomalies.',
              color: 'from-blue-600 to-sky-500'
            },
            {
              step: '3',
              title: 'Verification Agent',
              desc: 'Checks WHOIS domain age, Google Safe Browsing, and corporate presence.',
              color: 'from-sky-500 to-teal-500'
            },
            {
              step: '4',
              title: 'Reasoning Agent',
              desc: 'Synthesizes signals into a 0-100 score with plain language explanation.',
              color: 'from-teal-500 to-emerald-500'
            },
            {
              step: '5',
              title: 'Recommendation',
              desc: 'Delivers tailored safety guidance and university reporting steps.',
              color: 'from-emerald-500 to-indigo-600'
            }
          ].map((agent, i) => (
            <div key={i} className="glass-card p-5 rounded-2xl border border-slate-800 relative group hover:-translate-y-1 transition duration-300">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center text-white font-bold text-xs mb-3 shadow-md`}>
                {agent.step}
              </div>
              <h3 className="font-semibold text-slate-100 text-sm mb-1">{agent.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{agent.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PREMIUM SUBSCRIPTION & PRICING PLANS SECTION (LKR) */}
      {/* ========================================================================= */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 scroll-mt-24">
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
            <Crown className="w-4 h-4" />
            <span>PREMIUM MEMBERSHIP PLANS</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-100">
            Choose Your <span className="gradient-text-gold">Protection Plan</span>
          </h2>
          
          <p className="text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">
            Get unlimited AI scam verifications, Gemini 2.5 Vision OCR image scans, WHOIS domain age lookups, and downloadable PDF reports.
          </p>

          {/* BILLING DURATION TOGGLE (1 MONTH vs 1 YEAR) */}
          <div className="flex items-center justify-center pt-4">
            <div className="p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                  billingCycle === 'monthly'
                    ? 'bg-gradient-to-r from-indigo-600 to-sky-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1 Month Plan
              </button>
              
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  billingCycle === 'annual'
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-slate-950 shadow-lg'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>1 Year Plan</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-extrabold">SAVE 20%</span>
              </button>
            </div>
          </div>
        </div>

        {/* PRICING CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          
          {/* TIER 1: STARTER PLAN */}
          <div className="glass-card p-8 rounded-3xl border border-slate-800 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="inline-block p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">Starter Plan</h3>
              <p className="text-xs text-slate-400">Ideal for students verifying occasional job offers and internship emails.</p>
              
              <div className="pt-2">
                <div className="flex items-baseline space-x-1">
                  <span className="text-xs text-slate-400 font-medium">LKR</span>
                  <span className="text-4xl font-extrabold text-slate-100">
                    {billingCycle === 'annual' ? '799.00' : '999.00'}
                  </span>
                  <span className="text-xs text-slate-400">/{billingCycle === 'annual' ? 'month' : '1 month'}</span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">Billed {billingCycle === 'annual' ? 'annually (LKR 9,588/yr)' : 'monthly (LKR 999/mo)'}</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300 pt-4 border-t border-slate-800">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>50 AI Scam Verifications / Month</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Text & Job Link URL Analysis</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>English & Sinhala Language Support</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Basic Risk Explanation Report</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handlePlanSelect({ name: 'Starter Plan', price: billingCycle === 'annual' ? 'LKR 799.00/mo' : 'LKR 999.00/mo' })}
              className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 font-bold text-xs transition"
            >
              Select Starter (LKR 999.00)
            </button>
          </div>

          {/* TIER 2: PRO STUDENT PLAN (POPULAR) */}
          <div className="glass-pricing-popular p-8 rounded-3xl relative flex flex-col justify-between space-y-6 transform md:-translate-y-2">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 text-xs font-extrabold shadow-lg flex items-center space-x-1">
              <Crown className="w-3.5 h-3.5" />
              <span>MOST POPULAR VALUE</span>
            </div>

            <div className="space-y-4 pt-2">
              <div className="inline-block p-3 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-slate-100">Pro Student Plan</h3>
              <p className="text-xs text-slate-300">Complete 5-agent AI protection with OCR image screenshot analysis.</p>
              
              <div className="pt-2">
                <div className="flex items-baseline space-x-1">
                  <span className="text-xs text-indigo-300 font-medium">LKR</span>
                  <span className="text-4xl font-extrabold text-white">
                    {billingCycle === 'annual' ? '1,599.00' : '1,999.00'}
                  </span>
                  <span className="text-xs text-slate-300">/{billingCycle === 'annual' ? 'month' : '1 month'}</span>
                </div>
                <span className="text-[10px] text-indigo-300 block mt-1">Billed {billingCycle === 'annual' ? 'annually (LKR 19,188/yr)' : 'monthly (LKR 1,999/mo)'}</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-200 pt-4 border-t border-indigo-500/20">
                <li className="flex items-center space-x-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span><strong>UNLIMITED</strong> AI Scam Verifications</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Gemini 2.5 Vision OCR Poster Scans</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>WHOIS Domain & Safe Browsing Check</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>All 5 Languages (EN, SI, TA, HI, BN)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Downloadable PDF Safety Reports</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handlePlanSelect({ name: 'Pro Student Plan', price: billingCycle === 'annual' ? 'LKR 1,599.00/mo' : 'LKR 1,999.00/mo' })}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white font-extrabold text-xs shadow-xl glow-btn"
            >
              Get Pro Plan (LKR 1,999.00)
            </button>
          </div>

          {/* TIER 3: ENTERPRISE PLAN */}
          <div className="glass-card p-8 rounded-3xl border border-slate-800 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="inline-block p-3 rounded-2xl bg-amber-500/10 text-amber-400">
                <Crown className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-100">Enterprise Plan</h3>
              <p className="text-xs text-slate-400">For university career centers, graduate batches, and recruitment teams.</p>
              
              <div className="pt-2">
                <div className="flex items-baseline space-x-1">
                  <span className="text-xs text-slate-400 font-medium">LKR</span>
                  <span className="text-4xl font-extrabold text-slate-100">
                    {billingCycle === 'annual' ? '1,999.00' : '2,500.00'}
                  </span>
                  <span className="text-xs text-slate-400">/{billingCycle === 'annual' ? 'month' : '1 month'}</span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">Billed {billingCycle === 'annual' ? 'annually (LKR 24,000/yr)' : 'monthly (LKR 2,500/mo)'}</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300 pt-4 border-t border-slate-800">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Unlimited Team & Campus Accounts</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Priority 5-Agent AI Pipeline Queue</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Custom University Scam Analytics</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Dedicated Support & API Access</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handlePlanSelect({ name: 'Enterprise Plan', price: billingCycle === 'annual' ? 'LKR 1,999.00/mo' : 'LKR 2,500.00/mo' })}
              className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 font-bold text-xs transition"
            >
              Select Enterprise (LKR 2,500.00)
            </button>
          </div>

        </div>
      </section>

      {/* PLAN SELECT MODAL / FEEDBACK POPUP */}
      {selectedPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel max-w-md w-full p-6 sm:p-8 rounded-3xl border border-indigo-500/40 relative space-y-4">
            <button
              onClick={() => setSelectedPlanModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-900 border border-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 inline-block">
              <Crown className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-extrabold text-slate-100">
              Upgrade to {selectedPlanModal.name}
            </h3>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              You selected the <strong className="text-indigo-400">{selectedPlanModal.name}</strong> at <span className="text-emerald-400 font-bold">{selectedPlanModal.price}</span>.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-1.5">
              <div className="font-semibold text-slate-200">Payment Methods Accepted:</div>
              <div className="text-[11px] text-slate-400">Sri Lankan Bank Transfer, Visa / Mastercard, PayHere, & Mobile Wallet.</div>
            </div>

            <div className="pt-2 flex space-x-3">
              <Link
                to="/signup"
                onClick={() => setSelectedPlanModal(null)}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 text-white font-bold text-xs text-center shadow-lg glow-btn"
              >
                Proceed to Checkout
              </Link>
              <button
                onClick={() => setSelectedPlanModal(null)}
                className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KEY FEATURES GRID */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-100">
            {t('landing.features_title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-2xl flex items-start space-x-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100 mb-1">{t('landing.feature_1_title')}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{t('landing.feature_1_desc')}</p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl flex items-start space-x-4">
            <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400">
              <Globe2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100 mb-1">{t('landing.feature_2_title')}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{t('landing.feature_2_desc')}</p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl flex items-start space-x-4">
            <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100 mb-1">{t('landing.feature_3_title')}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{t('landing.feature_3_desc')}</p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl flex items-start space-x-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100 mb-1">{t('landing.feature_4_title')}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{t('landing.feature_4_desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM CALL TO ACTION */}
      <section className="max-w-4xl mx-auto px-6 text-center">
        <div className="glass-panel p-10 rounded-3xl border border-indigo-500/20 bg-gradient-to-b from-indigo-950/40 to-slate-950 relative overflow-hidden">
          <h2 className="text-3xl font-extrabold text-slate-100 mb-3">Protect Your Career Today</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto mb-6">
            Join thousands of graduates using SAFE-HIRE to verify job postings before sharing personal details.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 text-white font-bold text-sm glow-btn"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;
