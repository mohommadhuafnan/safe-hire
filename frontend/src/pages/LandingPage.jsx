import React, { useEffect } from 'react';
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
  Building,
  GraduationCap
} from 'lucide-react';

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // One-time landing page logic: logged in users go directly to Dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

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
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-sm shadow-xl shadow-indigo-500/25 glow-btn flex items-center justify-center space-x-2"
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
            className="inline-flex items-center space-x-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 text-white font-bold text-sm glow-btn"
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
