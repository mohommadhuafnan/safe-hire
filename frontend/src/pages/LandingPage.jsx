import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useAIModal } from '../context/AIModalContext';
import heroVideo from '../../vedio/vedio.mp4';
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
  X,
  Star,
  Quote,
  Users,
  Award
} from 'lucide-react';

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { openAIModal } = useAIModal();

  const videoRef = useRef(null);

  // Force play video on mount and handle tab visibility
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        logger.warning?.("Video autoplay prevented:", err);
      });
    }

    const handleVisibilityChange = () => {
      if (videoRef.current) {
        if (document.hidden) {
          videoRef.current.pause();
        } else {
          videoRef.current.play().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Pricing State: 'monthly' (1 Month) vs 'annual' (1 Year)
  const [billingCycle, setBillingCycle] = useState('monthly');

  const reviewsRow1 = [
    {
      id: 1,
      name: "Nipuni Perera",
      role: "BSc Computer Science",
      org: "University of Moratuwa, LK",
      avatar: "N",
      gradient: "from-indigo-500 to-sky-400",
      rating: 5,
      title: "Saved me from a $45 fake deposit fee!",
      text: "SAFE-HIRE saved me from a fake job offer requesting a $45 laptop kit registration fee. The 5-Agent AI caught the free Gmail domain mismatch and WHOIS age in under 5 seconds!",
      tag: "Verified Scam Prevention"
    },
    {
      id: 2,
      name: "Kavishka Silva",
      role: "Engineering Undergraduate",
      org: "SLIIT, Sri Lanka",
      avatar: "K",
      gradient: "from-sky-400 to-emerald-400",
      rating: 5,
      title: "OCR screenshot analysis is incredible",
      text: "I uploaded a screenshot of a suspicious Facebook hiring flyer. SAFE-HIRE's OCR extracted the text and flagged the Telegram-only contact channel immediately. Must-have for students!",
      tag: "OCR Verification"
    },
    {
      id: 3,
      name: "Rahul Sharma",
      role: "Final Year B.Tech",
      org: "IIT Madras, India",
      avatar: "R",
      gradient: "from-emerald-400 to-teal-500",
      rating: 5,
      title: "Explainable report gives real confidence",
      text: "As a final year student applying for internships, job security is vital. SAFE-HIRE's explainable rationale report gave me concrete evidence to avoid bogus registration fees.",
      tag: "Internship Protected"
    },
    {
      id: 4,
      name: "Fatima Anjum",
      role: "CSE Student",
      org: "University of Dhaka, Bangladesh",
      avatar: "F",
      gradient: "from-amber-400 to-orange-500",
      rating: 5,
      title: "Multi-language Bengali support is amazing!",
      text: "The Bengali language translation is 100% accurate. It translated the exact scam risk factors natively into Bengali so I could warn my classmates and batch group.",
      tag: "Bengali Native AI"
    },
    {
      id: 5,
      name: "Dinesh Fernando",
      role: "Management Graduate",
      org: "University of Kelaniya, LK",
      avatar: "D",
      gradient: "from-purple-500 to-indigo-500",
      rating: 5,
      title: "PDF export helped our university office",
      text: "Exporting the PDF verification certificate helped our career guidance office warn over 200 undergraduates about a fake recruitment drive targeting campus students.",
      tag: "University Certified"
    }
  ];

  const reviewsRow2 = [
    {
      id: 6,
      name: "Aarav Patel",
      role: "Software Developer Intern",
      org: "Bangalore, India",
      avatar: "A",
      gradient: "from-sky-500 to-indigo-500",
      rating: 5,
      title: "Prevented identity theft",
      text: "I almost sent my National ID and bank details to a recruiter claiming to be from a major IT firm. SAFE-HIRE detected the fake WHOIS domain registered only 5 days ago!",
      tag: "WHOIS Domain Shield"
    },
    {
      id: 7,
      name: "Dilini Wickramasinghe",
      role: "Undergraduate Student",
      org: "University of Peradeniya, LK",
      avatar: "D",
      gradient: "from-emerald-500 to-teal-400",
      rating: 5,
      title: "PDF export feature is top notch",
      text: "The instant PDF report generator is amazing. It breaks down financial risk, email impersonation risk, and domain age into clear percentage gauges with safety steps.",
      tag: "PDF Report Export"
    },
    {
      id: 8,
      name: "Ananya Gupta",
      role: "Commerce Student",
      org: "Delhi University, India",
      avatar: "A",
      gradient: "from-amber-500 to-red-500",
      rating: 5,
      title: "Essential for remote job seekers",
      text: "Every student looking for remote work needs SAFE-HIRE. It catches artificial urgency tactics and payment demands before you fall victim to recruitment fraud.",
      tag: "Remote Job Security"
    },
    {
      id: 9,
      name: "Tarik Hasan",
      role: "Software Engineering Student",
      org: "BRAC University, Bangladesh",
      avatar: "T",
      gradient: "from-indigo-400 to-purple-500",
      rating: 5,
      title: "Fast, accurate and easy to use",
      text: "Submitted a WhatsApp message link and received a full 5-Agent analysis report in seconds. The plain-language reasoning is crystal clear.",
      tag: "Instant 5-Agent AI"
    },
    {
      id: 10,
      name: "Sanjeewa Bandara",
      role: "Cyber Security Student",
      org: "NSBM Green University, LK",
      avatar: "S",
      gradient: "from-teal-400 to-emerald-500",
      rating: 5,
      title: "Top class security intelligence platform",
      text: "The WHOIS domain integration and Google Safe Browsing API check give 100% verified confidence. Highly recommended for every job applicant!",
      tag: "Safe Browsing Verified"
    }
  ];

  const handlePlanSelect = (plan) => {
    openAIModal({
      title: `Gemini AI Analysis: ${plan.name}`,
      initialPrompt: `Please analyze the ${plan.name} priced at ${plan.price}. What features are included, what is the ROI for job seekers, and how does it protect against employment fraud?`,
      category: 'plan_analysis',
      contextData: plan
    });
  };

  return (
    <div className="space-y-24 pb-16">
      
      {/* FULL-SCREEN HERO SECTION WITH LOOPING VIDEO BACKGROUND */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden rounded-3xl mb-12 border border-slate-800/80 shadow-2xl bg-[#000000]">
        
        {/* VIDEO BACKGROUND & MULTI-LAYER OVERLAYS */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-[#000000]">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover opacity-75 filter brightness-95 contrast-105 transition-opacity duration-1000 scale-105"
          >
            <source src={heroVideo} type="video/mp4" />
            <source src="/vedio/vedio.mp4" type="video/mp4" />
            Your browser does not support HTML5 video playback.
          </video>

          {/* Semi-transparent Overlay: rgba(0, 0, 0, 0.55) & dark navy gradient */}
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] z-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-[#0A0F1C] z-10" />
          <div className="absolute inset-0 bg-radial-at-c from-sky-900/20 via-transparent to-black/80 z-10" />

          {/* Cybernetic Digital Grid Effect */}
          <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-20 z-10" />
        </div>

        {/* HERO CONTENT */}
        <div className="relative z-20 pt-16 pb-14 px-6 text-center max-w-5xl mx-auto space-y-8 animate-fade-in-up">
          
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold shadow-lg shadow-sky-500/10 backdrop-blur-md animate-pulse">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>{t('landing.tagline')}</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight drop-shadow-md">
            {t('landing.headline', 'AI-Powered Protection Against')} <br className="hidden sm:inline" />
            <span className="gradient-text">{t('landing.headline_accent', 'Recruitment & Job Scams')}</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed drop-shadow">
            {t('landing.subhead')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto px-9 py-4 rounded-xl btn-glow-blue font-extrabold text-sm text-white flex items-center justify-center space-x-2.5 shadow-xl transition duration-300"
            >
              <Sparkles className="w-4 h-4 text-cyan-300 animate-spin" style={{ animationDuration: '4s' }} />
              <span>{t('landing.cta_analyze', 'Analyze Job Poster')}</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </Link>
            
            <a
              href="#demo-showcase"
              className="w-full sm:w-auto px-8 py-4 rounded-xl glass-card font-semibold text-sm text-slate-200 hover:text-white flex items-center justify-center space-x-2 border border-slate-700 hover:border-sky-400/50 hover:bg-slate-900/80 transition duration-300"
            >
              <HelpCircle className="w-4 h-4 text-sky-400" />
              <span>{t('landing.cta_learn', 'Learn More')}</span>
            </a>
          </div>

          {/* Trust Badges */}
          <div className="mt-12 pt-8 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-8 text-xs text-slate-300 font-medium">
            <div className="flex items-center space-x-2 bg-slate-950/70 px-3.5 py-1.5 rounded-full border border-slate-800">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              <span>{t('landing.badge_students', 'Built for University Students')}</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-950/70 px-3.5 py-1.5 rounded-full border border-slate-800">
              <Globe2 className="w-4 h-4 text-sky-400" />
              <span>{t('landing.badge_languages', '5 South Asian Languages Supported')}</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-950/70 px-3.5 py-1.5 rounded-full border border-slate-800">
              <BrainCircuit className="w-4 h-4 text-emerald-400" />
              <span>{t('landing.badge_pipeline', '5-Agent AI Pipeline')}</span>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* FAKE VS REAL JOB POSTER DEMONSTRATION SHOWCASE */}
      {/* ========================================================================= */}
      <section id="demo-showcase" className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12 space-y-3">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4" />
            <span>{t('landing.demo_tag', 'REAL-WORLD SCAM DEMONSTRATION')}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100">
            {t('landing.demo_title', 'Spot Fake Job Posters vs Genuine Ads')}
          </h2>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">
            {t('landing.demo_desc', 'Fraudulent recruiters target students on WhatsApp, Facebook, and Telegram. Here is how SAFE-HIRE\'s 5-Agent AI automatically identifies high-risk scams.')}
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
            {t('landing.workflow_title', 'How SAFE-HIRE 5-Agent AI Works')}
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            {t('landing.workflow_desc', 'An automated multi-agent pipeline analyzes job postings, screenshots, and URLs in seconds.')}
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
            Get unlimited AI scam verifications, AI OCR screenshot scans, WHOIS domain age lookups, and downloadable PDF reports.
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
                  <span>AI OCR Poster & Screenshot Scans</span>
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
              className="w-full py-4 rounded-xl btn-primary font-extrabold text-xs shadow-xl hover:scale-[1.02] transition"
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

      {/* ========================================================================= */}
      {/* USER REVIEWS & TESTIMONIALS (ANIMATED MOVING MARQUEE) */}
      {/* ========================================================================= */}
      <section className="space-y-10 overflow-hidden py-6">
        <div className="text-center max-w-3xl mx-auto px-6 space-y-3">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>{t('landing.reviews_tag', 'VERIFIED STUDENT & RECRUITER REVIEWS')}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
            {t('landing.reviews_title', 'Trusted by 10,000+ Students & Graduates')}
          </h2>
          
          <p className="text-slate-400 text-sm leading-relaxed">
            {t('landing.reviews_desc', 'See how SAFE-HIRE\'s 5-Agent AI helps undergraduates and job seekers across South Asia identify job scams, avoid fake fees, and secure authentic opportunities.')}
          </p>
        </div>

        {/* MARQUEE CONTAINER (PAUSES ON HOVER) */}
        <div className="pause-on-hover space-y-6">
          
          {/* ROW 1: SCROLLING LEFT */}
          <div className="overflow-hidden relative flex">
            {/* Left & Right Gradient Fades */}
            <div className="absolute top-0 bottom-0 left-0 w-24 bg-gradient-to-r from-[#090d16] to-transparent z-10 pointer-events-none" />
            <div className="absolute top-0 bottom-0 right-0 w-24 bg-gradient-to-l from-[#090d16] to-transparent z-10 pointer-events-none" />

            <div className="animate-marquee">
              {[...reviewsRow1, ...reviewsRow1].map((review, idx) => (
                <div 
                  key={idx} 
                  className="w-[320px] sm:w-[380px] shrink-0 p-5 rounded-2xl glass-card border border-slate-800/90 hover:border-indigo-500/50 space-y-3 shadow-xl transition-all duration-300 mx-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-amber-400">
                      {[...Array(review.rating)].map((_, s) => (
                        <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {review.tag}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-100 line-clamp-1">{review.title}</h4>
                  
                  <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-3">
                    "{review.text}"
                  </p>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${review.gradient} flex items-center justify-center text-slate-950 font-extrabold text-xs shadow-md shrink-0`}>
                      {review.avatar}
                    </div>
                    <div className="overflow-hidden">
                      <h5 className="text-xs font-bold text-slate-100 truncate">{review.name}</h5>
                      <p className="text-[10px] text-slate-400 truncate">{review.role} • {review.org}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ROW 2: SCROLLING RIGHT */}
          <div className="overflow-hidden relative flex">
            {/* Left & Right Gradient Fades */}
            <div className="absolute top-0 bottom-0 left-0 w-24 bg-gradient-to-r from-[#090d16] to-transparent z-10 pointer-events-none" />
            <div className="absolute top-0 bottom-0 right-0 w-24 bg-gradient-to-l from-[#090d16] to-transparent z-10 pointer-events-none" />

            <div className="animate-marquee-reverse">
              {[...reviewsRow2, ...reviewsRow2].map((review, idx) => (
                <div 
                  key={idx} 
                  className="w-[320px] sm:w-[380px] shrink-0 p-5 rounded-2xl glass-card border border-slate-800/90 hover:border-sky-500/50 space-y-3 shadow-xl transition-all duration-300 mx-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-amber-400">
                      {[...Array(review.rating)].map((_, s) => (
                        <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                      {review.tag}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-100 line-clamp-1">{review.title}</h4>
                  
                  <p className="text-xs text-slate-300 leading-relaxed font-sans line-clamp-3">
                    "{review.text}"
                  </p>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${review.gradient} flex items-center justify-center text-slate-950 font-extrabold text-xs shadow-md shrink-0`}>
                      {review.avatar}
                    </div>
                    <div className="overflow-hidden">
                      <h5 className="text-xs font-bold text-slate-100 truncate">{review.name}</h5>
                      <p className="text-[10px] text-slate-400 truncate">{review.role} • {review.org}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

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
          <h2 className="text-3xl font-extrabold text-slate-100 mb-3">{t('landing.cta_bottom_title', 'Protect Your Career Today')}</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto mb-6">
            {t('landing.cta_bottom_desc', 'Join thousands of graduates using SAFE-HIRE to verify job postings before sharing personal details.')}
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-xl btn-primary font-bold text-sm shadow-xl hover:scale-105 transition"
          >
            <span>{t('landing.cta_create_account', 'Create Free Account')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

    </div>
  );
};

export default LandingPage;
