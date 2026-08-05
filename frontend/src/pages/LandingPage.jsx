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
  Award,
  ChevronDown,
  ChevronLeft,
  ChevronRight
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

  // Instagram-Style 3-Poster Gallery Carousel State
  const [posterFilter, setPosterFilter] = useState('all');
  const [currentPosterIndex, setCurrentPosterIndex] = useState(0);
  const [isAutoSlide, setIsAutoSlide] = useState(true);

  const galleryPosters = [
    {
      id: 1,
      type: 'scam',
      title: 'Data Entry Assistant Scam',
      score: '95/100',
      riskLevel: 'HIGH RISK SCAM',
      badgeClass: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
      borderClass: 'border-rose-500/40 hover:border-rose-400',
      dotClass: 'bg-rose-500',
      image: '/images/scam_job_poster.png',
      extractedText: '"Registration fee of $30 required for laptop shipment kit. Contact recruiter on Telegram @job_recruiter_fast"',
      metrics: [
        { label: 'Payment Demand', val: '$30 Upfront Fee', color: 'text-rose-300' },
        { label: 'Contact Channel', val: 'Telegram @job_fast', color: 'text-rose-300' },
        { label: 'Domain WHOIS', val: '3 Days Old / Disposable', color: 'text-rose-300' },
        { label: 'Safe Browsing', val: 'Google Threat Flagged', color: 'text-rose-300' }
      ]
    },
    {
      id: 2,
      type: 'legit',
      title: 'TechCorp Software Intern',
      score: '5/100',
      riskLevel: 'VERIFIED LEGITIMATE',
      badgeClass: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
      borderClass: 'border-emerald-500/40 hover:border-emerald-400',
      dotClass: 'bg-emerald-400',
      image: '/images/genuine_job_poster.png',
      extractedText: '"Apply via official career portal: www.techcorp.com/careers. No application or equipment fees."',
      metrics: [
        { label: 'Application Fee', val: '100% Free ($0)', color: 'text-emerald-300' },
        { label: 'Domain WHOIS', val: 'techcorp.com (12+ Yrs)', color: 'text-emerald-300' },
        { label: 'Email Status', val: 'Corporate MX Valid', color: 'text-emerald-300' },
        { label: 'Safe Browsing', val: 'Clean (0 Threats)', color: 'text-emerald-300' }
      ]
    },
    {
      id: 3,
      type: 'scam',
      title: 'WhatsApp Typing Task Fraud',
      score: '92/100',
      riskLevel: 'HIGH RISK SCAM',
      badgeClass: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
      borderClass: 'border-rose-500/40 hover:border-rose-400',
      dotClass: 'bg-rose-500',
      image: '/images/whatsapp_typing_poster.png',
      extractedText: '"Earn Rs. 15,000 weekly typing at home. Pay Rs. 2,000 refundable security deposit to start task."',
      metrics: [
        { label: 'Deposit Demand', val: 'Rs. 2,000 Upfront', color: 'text-rose-300' },
        { label: 'Recruiter Contact', val: 'WhatsApp Only (+94)', color: 'text-rose-300' },
        { label: 'Company Domain', val: 'No Website / Gmail', color: 'text-rose-300' },
        { label: 'Language Risk', val: 'EMSCAD Urgency Trigger', color: 'text-rose-300' }
      ]
    },
    {
      id: 4,
      type: 'legit',
      title: 'NSBM Campus Ambassador',
      score: '8/100',
      riskLevel: 'VERIFIED LEGITIMATE',
      badgeClass: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
      borderClass: 'border-emerald-500/40 hover:border-emerald-400',
      dotClass: 'bg-emerald-400',
      image: '/images/nsbm_campus_poster.png',
      extractedText: '"Official university student ambassador program. Register via nsbm.ac.lk student portal."',
      metrics: [
        { label: 'University Domain', val: 'nsbm.ac.lk (Verified)', color: 'text-emerald-300' },
        { label: 'Registration Fee', val: 'FREE ($0)', color: 'text-emerald-300' },
        { label: 'Contact Mail', val: 'careers@nsbm.ac.lk', color: 'text-emerald-300' },
        { label: 'Safe Browsing', val: 'Clean (0 Threats)', color: 'text-emerald-300' }
      ]
    },
    {
      id: 5,
      type: 'scam',
      title: 'Crypto Reviewer Impersonation',
      score: '88/100',
      riskLevel: 'HIGH RISK SCAM',
      badgeClass: 'bg-rose-500/20 border-rose-500/40 text-rose-300',
      borderClass: 'border-rose-500/40 hover:border-rose-400',
      dotClass: 'bg-rose-500',
      image: '/images/crypto_reviewer_poster.png',
      extractedText: '"Product reviewer job. Daily payout in USDT crypto. Purchase $50 initial rating package to start."',
      metrics: [
        { label: 'Payout Method', val: 'Unregulated USDT Crypto', color: 'text-rose-300' },
        { label: 'Package Demand', val: '$50 Rating Package', color: 'text-rose-300' },
        { label: 'Domain Age', val: 'Created 5 Days Ago', color: 'text-rose-300' },
        { label: 'Safe Browsing', val: 'Phishing Flagged', color: 'text-rose-300' }
      ]
    }
  ];

  const filteredPosters = galleryPosters.filter(p => posterFilter === 'all' || p.type === posterFilter);

  // Auto-play slider every 4 seconds
  useEffect(() => {
    if (!isAutoSlide || filteredPosters.length === 0) return;
    const interval = setInterval(() => {
      setCurrentPosterIndex((prev) => (prev + 1) % filteredPosters.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isAutoSlide, filteredPosters.length]);

  const nextPosterSlide = () => {
    setCurrentPosterIndex((prev) => (prev + 1) % filteredPosters.length);
  };

  const prevPosterSlide = () => {
    setCurrentPosterIndex((prev) => (prev - 1 + filteredPosters.length) % filteredPosters.length);
  };

  const getVisiblePosters = () => {
    if (filteredPosters.length === 0) return [];
    if (filteredPosters.length <= 3) return filteredPosters;
    return [0, 1, 2].map(offset => {
      const idx = (currentPosterIndex + offset) % filteredPosters.length;
      return filteredPosters[idx];
    });
  };

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
    <div className="space-y-16 sm:space-y-24 pb-16">
      
      {/* TRUE FULL-VIEWPORT (100vh / 100dvh) HERO SECTION */}
      <section className="relative w-full h-screen min-h-[100vh] min-h-[100dvh] flex flex-col justify-between items-center overflow-hidden bg-black pt-20 sm:pt-24 pb-6 sm:pb-8">
        
        {/* FULL-VIEWPORT VIDEO BACKGROUND & MULTI-LAYER OVERLAYS */}
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-black pointer-events-none">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover opacity-85 filter brightness-95 contrast-105 transition-opacity duration-1000"
          >
            <source src={heroVideo} type="video/mp4" />
            <source src="/vedio/vedio.mp4" type="video/mp4" />
            Your browser does not support HTML5 video playback.
          </video>

          {/* Semi-transparent Overlay: rgba(0, 0, 0, 0.50) & dark gradient */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] z-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/25 to-[#090d16] z-10" />
          <div className="absolute inset-0 bg-radial-at-c from-sky-900/25 via-transparent to-black/80 z-10" />
          
          {/* Seamless Bottom Blend Gradient */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent via-[#090d16]/90 to-[#090d16] z-10 pointer-events-none" />

          {/* Cybernetic Digital Grid Effect */}
          <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-20 z-10" />
        </div>

        {/* VERTICALLY CENTERED HERO CONTENT */}
        <div className="relative z-20 px-6 text-center max-w-5xl mx-auto space-y-6 sm:space-y-8 my-auto animate-fade-in-up flex flex-col justify-center items-center">
          
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
          <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-300 font-medium">
            <div className="flex items-center space-x-2 bg-slate-950/70 px-3.5 py-1.5 rounded-full border border-slate-800 backdrop-blur-md">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              <span>{t('landing.badge_students', 'Built for University Students')}</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-950/70 px-3.5 py-1.5 rounded-full border border-slate-800 backdrop-blur-md">
              <Globe2 className="w-4 h-4 text-sky-400" />
              <span>{t('landing.badge_languages', '5 South Asian Languages Supported')}</span>
            </div>
            <div className="flex items-center space-x-2 bg-slate-950/70 px-3.5 py-1.5 rounded-full border border-slate-800 backdrop-blur-md">
              <BrainCircuit className="w-4 h-4 text-emerald-400" />
              <span>{t('landing.badge_pipeline', '5-Agent AI Pipeline')}</span>
            </div>
          </div>

        </div>

        {/* ANIMATED SCROLL DOWN INDICATOR */}
        <div 
          onClick={() => {
            const el = document.getElementById('demo-showcase');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="relative z-30 flex flex-col items-center space-y-1.5 cursor-pointer group select-none mb-2"
        >
          <span className="text-[10px] font-bold tracking-widest text-sky-300/80 group-hover:text-cyan-300 transition-colors uppercase flex items-center gap-1.5 backdrop-blur-md px-3 py-1 rounded-full bg-black/40 border border-sky-400/20 group-hover:border-cyan-400/50 shadow-lg shadow-sky-500/10">
            <span>{t('landing.scroll_down', 'Scroll to Explore')}</span>
          </span>
          <div className="w-5 h-8 sm:w-6 sm:h-9 rounded-full border-2 border-sky-400/40 group-hover:border-cyan-400 flex items-start justify-center p-1 backdrop-blur-md transition-colors shadow-lg shadow-cyan-500/20">
            <div className="w-1.5 h-2.5 rounded-full bg-cyan-400 animate-bounce" />
          </div>
          <ChevronDown className="w-4 h-4 text-cyan-400 animate-bounce transition-transform duration-300 group-hover:scale-125" style={{ animationDelay: '0.15s' }} />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5-AGENT AI WORKFLOW PIPELINE SECTION (PLACED DIRECTLY AFTER VIDEO HERO) */}
      {/* ========================================================================= */}
      <section id="workflow-pipeline" className="max-w-7xl mx-auto px-6 pt-4 pb-8 scroll-mt-24">
        
        {/* Section Header */}
        <div className="text-center mb-14 space-y-3">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-300 text-xs font-bold shadow-lg shadow-sky-500/10 backdrop-blur-md animate-pulse">
            <BrainCircuit className="w-4 h-4 text-sky-400" />
            <span>5-AGENT MULTI-AI ARCHITECTURE</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
            {t('landing.workflow_title', 'How SAFE-HIRE 5-Agent AI Works')}
          </h2>
          
          <p className="text-slate-400 text-sm max-w-3xl mx-auto leading-relaxed">
            {t('landing.workflow_desc', 'An automated multi-agent pipeline analyzes job postings, screenshots, and URLs in seconds.')}
          </p>
        </div>

        {/* 5-Agent Sequential Cards Grid with Glowing Connectors */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          
          {[
            {
              step: '1',
              title: 'Intake Agent',
              icon: FileText,
              tag: 'Vision OCR & Ingestion',
              desc: 'Processes text, image OCR screenshots, and URLs; auto-detects language.',
              color: 'from-blue-600 to-indigo-600',
              borderColor: 'border-blue-500/30 hover:border-blue-400',
              glowColor: 'shadow-blue-500/20',
              badgeBg: 'bg-blue-600'
            },
            {
              step: '2',
              title: 'Linguistic Risk',
              icon: BrainCircuit,
              tag: 'EMSCAD Signal Engine',
              desc: 'Evaluates EMSCAD signals: urgency, payment demands, email domain anomalies.',
              color: 'from-sky-500 to-blue-600',
              borderColor: 'border-sky-500/30 hover:border-sky-400',
              glowColor: 'shadow-sky-500/20',
              badgeBg: 'bg-sky-500'
            },
            {
              step: '3',
              title: 'Verification Agent',
              icon: Globe2,
              tag: 'WHOIS & Safe Browsing',
              desc: 'Checks WHOIS domain age, Google Safe Browsing, Abstract Email validation, and corporate presence.',
              color: 'from-cyan-500 to-teal-500',
              borderColor: 'border-cyan-500/30 hover:border-cyan-400',
              glowColor: 'shadow-cyan-500/20',
              badgeBg: 'bg-cyan-500'
            },
            {
              step: '4',
              title: 'Reasoning Agent',
              icon: Sparkles,
              tag: 'Gemini 3.6 & DeepSeek',
              desc: 'Synthesizes signals into a 0-100 score with plain language explanation.',
              color: 'from-teal-500 to-emerald-500',
              borderColor: 'border-teal-500/30 hover:border-teal-400',
              glowColor: 'shadow-teal-500/20',
              badgeBg: 'bg-teal-500'
            },
            {
              step: '5',
              title: 'Recommendation',
              icon: ShieldCheck,
              tag: 'Poster-Specific Action',
              desc: 'Delivers tailored safety guidance and university reporting steps.',
              color: 'from-indigo-600 to-purple-600',
              borderColor: 'border-indigo-500/30 hover:border-indigo-400',
              glowColor: 'shadow-indigo-500/20',
              badgeBg: 'bg-indigo-600'
            }
          ].map((agent, i) => {
            const IconComp = agent.icon;
            return (
              <div 
                key={i} 
                className={`glass-card p-6 rounded-3xl border ${agent.borderColor} relative group hover:-translate-y-2.5 transition-all duration-300 backdrop-blur-xl bg-slate-950/80 shadow-xl ${agent.glowColor} flex flex-col justify-between`}
              >
                {/* Step Connector Line (Desktop) */}
                {i < 4 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
                    <div className="w-6 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-500 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-cyan-300 absolute -right-1 top-1/2 -translate-y-1/2 shadow-lg shadow-cyan-400" />
                  </div>
                )}

                <div>
                  {/* Step Badge & Icon */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-9 h-9 rounded-2xl ${agent.badgeBg} flex items-center justify-center text-white font-extrabold text-xs shadow-lg shadow-black/50 group-hover:scale-110 transition-transform duration-300`}>
                      {agent.step}
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-sky-400 group-hover:text-cyan-300 transition-colors">
                      <IconComp className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Title & Tag */}
                  <div className="space-y-1 mb-3">
                    <h3 className="font-extrabold text-slate-100 text-base group-hover:text-cyan-300 transition-colors">
                      {agent.title}
                    </h3>
                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono text-sky-300">
                      {agent.tag}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-slate-300 text-xs leading-relaxed">
                    {agent.desc}
                  </p>
                </div>

                {/* Bottom Active Pulse Glow Bar */}
                <div className="mt-4 pt-3 border-t border-slate-900/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Stage {agent.step} Active</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:animate-ping" />
                </div>
              </div>
            );
          })}

        </div>
      </section>

      {/* ========================================================================= */}
      {/* INSTAGRAM-STYLE 3-POSTER GALLERY CAROUSEL SHOWCASE */}
      {/* ========================================================================= */}
      <section id="demo-showcase" className="max-w-7xl mx-auto px-6 py-8 scroll-mt-24">
        
        {/* Section Header & Filter Tabs */}
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold shadow-lg shadow-rose-500/10 backdrop-blur-md animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>INSTAGRAM-STYLE INTERACTIVE GALLERY</span>
          </div>
          
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
            Spot Fake Job Posters vs Genuine Ads
          </h2>
          
          <p className="text-slate-400 text-sm max-w-3xl mx-auto leading-relaxed">
            Browse real-world scam flyers vs verified corporate offers. Click or swipe through the gallery to see how 5-Agent AI extracts red flags.
          </p>

          {/* Interactive Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {[
              { id: 'all', label: `All Posters (${galleryPosters.length})` },
              { id: 'scam', label: `High-Risk Scams (${galleryPosters.filter(p=>p.type==='scam').length})` },
              { id: 'legit', label: `Verified Genuine (${galleryPosters.filter(p=>p.type==='legit').length})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setPosterFilter(tab.id);
                  setCurrentPosterIndex(0);
                }}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
                  posterFilter === tab.id
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 border border-sky-400 scale-105'
                    : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Carousel Controls Bar & Instagram Story Dots */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="text-xs font-mono text-slate-400 flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping inline-block" />
            <span>Viewing 3 Posters Simultaneously {isAutoSlide ? '(Auto-sliding active)' : '(Paused on hover)'}</span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Instagram Story Progress Dots */}
            <div className="flex items-center space-x-1.5 mr-2">
              {filteredPosters.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPosterIndex(i)}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    currentPosterIndex === i 
                      ? 'w-7 bg-cyan-400 shadow-lg shadow-cyan-500/50' 
                      : 'w-2 bg-slate-700 hover:bg-slate-500'
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={prevPosterSlide}
              className="w-10 h-10 rounded-full bg-slate-900/90 border border-slate-700 hover:border-cyan-400 flex items-center justify-center text-slate-200 hover:text-cyan-300 transition duration-300 shadow-lg hover:scale-105 active:scale-95"
              aria-label="Previous Poster"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextPosterSlide}
              className="w-10 h-10 rounded-full bg-slate-900/90 border border-slate-700 hover:border-cyan-400 flex items-center justify-center text-slate-200 hover:text-cyan-300 transition duration-300 shadow-lg hover:scale-105 active:scale-95"
              aria-label="Next Poster"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* VISIBLE 3-POSTER GALLERY GRID WITH 3D CENTER FOCUS */}
        <div 
          onMouseEnter={() => setIsAutoSlide(false)}
          onMouseLeave={() => setIsAutoSlide(true)}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch transition-all duration-700 ease-in-out py-2"
        >
          {getVisiblePosters().map((item, idx) => {
            const isCenter = idx === 1;
            return (
              <div 
                key={`${item.id}-${idx}`}
                className={`glass-panel p-5 rounded-3xl border ${
                  isCenter 
                    ? 'border-cyan-400/80 shadow-2xl shadow-cyan-500/20 scale-105 z-20 bg-slate-950' 
                    : `${item.borderClass} bg-slate-950/80 scale-95 opacity-90 hover:opacity-100 hover:scale-100`
                } backdrop-blur-2xl relative overflow-hidden group flex flex-col justify-between transition-all duration-500 ease-out`}
              >
                {/* Center Focus Badge Indicator */}
                {isCenter && (
                  <div className="absolute top-2 left-4 z-20 px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[9px] font-mono uppercase tracking-widest flex items-center gap-1 shadow-md">
                    <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>CENTER FOCUS</span>
                  </div>
                )}

                {/* Top Risk Badge Pill */}
                <div className={`absolute top-0 right-0 px-3.5 py-1.5 rounded-bl-2xl border-b border-l ${item.badgeClass} text-[11px] font-extrabold flex items-center space-x-1.5 shadow-lg backdrop-blur-md z-20`}>
                  <span className={`w-2 h-2 rounded-full ${item.dotClass} animate-pulse`} />
                  <span>{item.riskLevel} ({item.score})</span>
                </div>

                <div className="space-y-4">
                  
                  {/* Header Title */}
                  <div className="pt-2">
                    <h3 className={`text-base font-extrabold transition-colors tracking-tight line-clamp-1 ${isCenter ? 'text-cyan-300' : 'text-slate-100 group-hover:text-cyan-300'}`}>
                      {item.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Poster #{item.id} of {galleryPosters.length}
                    </span>
                  </div>

                  {/* Poster Image Frame */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl group-hover:shadow-cyan-500/10 transition-all duration-500">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-56 object-cover object-top group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-70" />

                    {/* AI Banner Overlay */}
                    <div className="absolute bottom-2 left-2 right-2 p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 backdrop-blur-xl shadow-lg">
                      <div className="text-[10px] font-bold text-sky-400 mb-0.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                        <span>AI Extracted Signal:</span>
                      </div>
                      <p className="text-[10px] text-slate-200 font-mono leading-tight line-clamp-2">
                        {item.extractedText}
                      </p>
                    </div>
                  </div>

                  {/* 4-Metric Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {item.metrics.map((m, mIdx) => (
                      <div key={mIdx} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider line-clamp-1">{m.label}</span>
                        <span className={`font-extrabold text-[10px] mt-0.5 ${m.color || 'text-slate-200'} line-clamp-1`}>{m.val}</span>
                      </div>
                    ))}
                  </div>

                </div>

              </div>
            );
          })}
        </div>

      </section>

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* KEY FEATURES GRID (WHY CHOOSE SAFE-HIRE - ENHANCED WITH ANIMATIONS) */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14 space-y-3">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold shadow-lg shadow-indigo-500/10 backdrop-blur-md animate-pulse">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>UNMATCHED RECRUITMENT PROTECTION ENGINE</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
            Why Choose <span className="gradient-text">SAFE-HIRE</span>?
          </h2>
          
          <p className="text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">
            The world's first agentic multi-AI platform engineered specifically to protect South Asian undergraduates and job seekers from career scams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          
          {/* Feature 1 */}
          <div className="glass-card p-7 rounded-3xl flex items-start space-x-5 border border-indigo-500/30 hover:border-indigo-400/80 transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(99,102,241,0.25)] relative overflow-hidden bg-slate-900/80">
            <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/25 transition-all duration-500 pointer-events-none" />
            <div className="p-4 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 group-hover:scale-110 transition-transform duration-300 shrink-0">
              <BrainCircuit className="w-7 h-7 text-indigo-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-100">{t('landing.feature_1_title', '5-Agent AI Pipeline')}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">AUTOMATED</span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-sans">
                Multimodal OCR vision, linguistic signal analysis, WHOIS domain security, and Gemini 3.6 Flash reasoning working together in parallel.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="glass-card p-7 rounded-3xl flex items-start space-x-5 border border-sky-500/30 hover:border-sky-400/80 transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(56,189,248,0.25)] relative overflow-hidden bg-slate-900/80">
            <div className="absolute top-0 right-0 w-28 h-28 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/25 transition-all duration-500 pointer-events-none" />
            <div className="p-4 rounded-2xl bg-sky-500/15 text-sky-400 border border-sky-500/30 group-hover:scale-110 transition-transform duration-300 shrink-0">
              <Globe2 className="w-7 h-7 text-sky-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-100">{t('landing.feature_2_title', 'Multi-Language Support')}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/20 text-sky-300 border border-sky-500/30">5 LANGUAGES</span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-sans">
                Native explanations in English, Sinhala, Tamil, Hindi, and Bengali for localized fraud detection across South Asia.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="glass-card p-7 rounded-3xl flex items-start space-x-5 border border-teal-500/30 hover:border-teal-400/80 transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(20,184,166,0.25)] relative overflow-hidden bg-slate-900/80">
            <div className="absolute top-0 right-0 w-28 h-28 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/25 transition-all duration-500 pointer-events-none" />
            <div className="p-4 rounded-2xl bg-teal-500/15 text-teal-400 border border-teal-500/30 group-hover:scale-110 transition-transform duration-300 shrink-0">
              <Search className="w-7 h-7 text-teal-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-100">{t('landing.feature_3_title', 'Domain & Web Verification')}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/30">WHOIS LIVE</span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-sans">
                Live WHOIS age lookup, Google Safe Browsing reputation check, and Abstract API email domain validation.
              </p>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="glass-card p-7 rounded-3xl flex items-start space-x-5 border border-emerald-500/30 hover:border-emerald-400/80 transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(16,185,129,0.25)] relative overflow-hidden bg-slate-900/80">
            <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/25 transition-all duration-500 pointer-events-none" />
            <div className="p-4 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 group-hover:scale-110 transition-transform duration-300 shrink-0">
              <ShieldCheck className="w-7 h-7 text-emerald-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-100">{t('landing.feature_4_title', 'Actionable Safety Advice')}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">STUDENT SAFE</span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-sans">
                Clear, student-friendly recommendations to protect your money, identity, and career credentials against hiring fraud.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* PREMIUM SUBSCRIPTION & PRICING PLANS SECTION */}
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

      {/* ========================================================================= */}
      {/* BOTTOM CALL TO ACTION (PROTECT YOUR CAREER TODAY - ENHANCED) */}
      {/* ========================================================================= */}
      <section className="max-w-4xl mx-auto px-6 text-center">
        <div className="glass-panel p-10 sm:p-12 rounded-3xl border-2 border-indigo-500/40 bg-gradient-to-b from-indigo-950/60 via-slate-950 to-slate-950 relative overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.25)] group">
          
          {/* Glowing Background Radial Highlights */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/35 transition-all duration-700 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-64 h-32 bg-sky-500/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-5">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-xs font-bold shadow-md animate-pulse">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% FREE RECRUITMENT VERIFICATION FOR STUDENTS</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-100 tracking-tight">
              {t('landing.cta_bottom_title', 'Protect Your Career Today')}
            </h2>
            
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed font-sans">
              {t('landing.cta_bottom_desc', 'Join thousands of graduates using SAFE-HIRE to verify job postings before sharing personal details or paying registration fees.')}
            </p>

            <div className="pt-3">
              <Link
                to="/signup"
                className="inline-flex items-center space-x-3 px-9 py-4 rounded-2xl btn-glow-blue font-extrabold text-sm text-white shadow-2xl hover:scale-105 transition-all duration-300"
              >
                <span>{t('landing.cta_create_account', 'Create Free Account')}</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </Link>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};

export default LandingPage;
