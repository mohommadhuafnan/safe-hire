import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, Check, X, Zap, Crown, Building2, HelpCircle, 
  ChevronDown, ChevronUp, Sparkles, CreditCard, Lock, ArrowRight,
  RefreshCw, Globe, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PRICING_PLANS, PRICING_FAQS } from '../config/pricing';
import paymentService from '../services/paymentService';

export default function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
  const [currentSub, setCurrentSub] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch current user subscription if logged in
  useEffect(() => {
    if (user) {
      paymentService.getCurrentSubscription()
        .then(sub => setCurrentSub(sub))
        .catch(err => console.warn('Could not load current subscription:', err));
    }
  }, [user]);

  const handleSelectPlan = async (plan) => {
    setErrorMsg('');

    if (!user) {
      // Redirect to login with return path
      navigate('/login?redirect=/pricing');
      return;
    }

    if (plan.id === 'free_trial') {
      navigate('/dashboard');
      return;
    }

    if (plan.isContactSales) {
      window.location.href = 'mailto:enterprise@safehire.ai?subject=SAFE-HIRE%20Campus%20Organization%20Inquiry';
      return;
    }

    // Check if already active
    if (currentSub?.plan === plan.id && currentSub?.status === 'active') {
      return;
    }

    try {
      setLoadingPlan(plan.id);
      await paymentService.initiateCheckout(plan.id, billingCycle);
    } catch (err) {
      console.error('Checkout error:', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to initialize PayHere checkout. Please try again.');
      setLoadingPlan(null);
    }
  };

  const isCurrentPlan = (planId) => {
    if (!currentSub) return false;
    return currentSub.plan === planId && currentSub.status === 'active';
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-slate-100 relative z-10">
      
      {/* Header Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5" />
          Transparent, Flexible Protection
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
          Invest in Your Career Safety
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Select the ideal protection tier for your job search. Backed by 5-Agent AI analysis,
          Valsea multilingual translation, and official PayHere secure checkout.
        </p>

        {/* Billing Cycle Toggle */}
        <div className="pt-4 flex items-center justify-center">
          <div className="relative flex items-center bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 shadow-inner backdrop-blur-xl">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all duration-300 ${
                billingCycle === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all duration-300 flex items-center gap-2 ${
                billingCycle === 'annual'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="max-w-md mx-auto p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 items-stretch">
        {PRICING_PLANS.map((plan) => {
          const isSelected = isCurrentPlan(plan.id);
          const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
          const billingSuffix = billingCycle === 'annual' ? '/ year' : '/ month';

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-2xl p-6 sm:p-7 backdrop-blur-xl transition-all duration-300 ${
                plan.popular
                  ? 'bg-gradient-to-b from-indigo-950/40 via-slate-900/90 to-slate-950 border-2 border-indigo-500/60 shadow-2xl shadow-indigo-500/20 hover:scale-[1.02]'
                  : 'bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 shadow-xl hover:shadow-2xl'
              }`}
            >
              {/* Badges */}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border backdrop-blur-md ${plan.badgeColor}`}>
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan Title & Tagline */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {plan.id === 'pro' && <Crown className="w-5 h-5 text-indigo-400" />}
                    {plan.id === 'free_trial' && <Zap className="w-5 h-5 text-cyan-400" />}
                    {plan.id === 'organization' && <Building2 className="w-5 h-5 text-amber-400" />}
                    {plan.name}
                  </h3>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed min-h-[36px]">
                  {plan.tagline}
                </p>

                {/* Price Display */}
                <div className="my-6 pb-6 border-b border-slate-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-slate-400 font-mono">LKR</span>
                    <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {price.toLocaleString()}
                    </span>
                    {plan.priceMonthly > 0 && (
                      <span className="text-xs text-slate-400 font-medium">
                        {billingSuffix}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="font-semibold text-indigo-400">{plan.scansLimit}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 text-[11px]">{plan.languagesLabel}</span>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-3 mb-8">
                  <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                    Included Features:
                  </p>
                  <ul className="space-y-2.5 text-xs text-slate-300">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <div className="mt-0.5 p-0.5 rounded-full bg-indigo-500/20 text-indigo-400 flex-shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                    {plan.limitations?.map((limit, idx) => (
                      <li key={`lim-${idx}`} className="flex items-start gap-2.5 text-slate-500">
                        <div className="mt-0.5 p-0.5 rounded-full bg-slate-800 text-slate-500 flex-shrink-0">
                          <X className="w-3 h-3" />
                        </div>
                        <span className="leading-snug italic">{limit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div>
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isSelected || loadingPlan === plan.id}
                  className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                      : plan.popular
                      ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-indigo-600/30 hover:shadow-indigo-600/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  {loadingPlan === plan.id ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Securing Checkout...</span>
                    </>
                  ) : isSelected ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Current Active Plan</span>
                    </>
                  ) : (
                    <>
                      <span>{plan.buttonText}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust & PayHere Security Banner */}
      <div className="mt-16 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                Official PayHere Verified Gateway
                <Lock className="w-4 h-4 text-emerald-400" />
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Central Bank of Sri Lanka approved. Accepts Visa, MasterCard, FriMi, Genie, eZ Cash, and Internet Banking.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
            <span className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">🔒 256-Bit SSL</span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">⚡ Instant Activation</span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">🛡️ Cancel Anytime</span>
          </div>
        </div>
      </div>

      {/* Feature Comparison Matrix */}
      <div className="mt-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Plan Feature Comparison
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-2">
            Detailed breakdown of security capabilities across plans.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-300 font-semibold">
                <th className="py-4 px-6">Feature</th>
                <th className="py-4 px-4 text-center">Free Trial</th>
                <th className="py-4 px-4 text-center">Basic</th>
                <th className="py-4 px-4 text-center text-indigo-400 bg-indigo-950/30">Pro (Popular)</th>
                <th className="py-4 px-4 text-center">Organization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Monthly Scan Quota</td>
                <td className="py-3.5 px-4 text-center text-slate-400">25 (7 days)</td>
                <td className="py-3.5 px-4 text-center">100 / mo</td>
                <td className="py-3.5 px-4 text-center font-bold text-indigo-300 bg-indigo-950/20">3,000 / mo</td>
                <td className="py-3.5 px-4 text-center font-bold text-amber-400">50,000+ / mo</td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">5-Agent Scam Detection Pipeline</td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                <td className="py-3.5 px-4 text-center bg-indigo-950/20"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Sinhala (සිංහල) Detection & Translation</td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                <td className="py-3.5 px-4 text-center"><X className="w-4 h-4 mx-auto text-slate-600" /></td>
                <td className="py-3.5 px-4 text-center bg-indigo-950/20"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Tamil (தமிழ்) Detection & Translation</td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                <td className="py-3.5 px-4 text-center"><X className="w-4 h-4 mx-auto text-slate-600" /></td>
                <td className="py-3.5 px-4 text-center bg-indigo-950/20"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Valsea AI Translation Engine</td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                <td className="py-3.5 px-4 text-center"><X className="w-4 h-4 mx-auto text-slate-600" /></td>
                <td className="py-3.5 px-4 text-center bg-indigo-950/20"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">WHOIS Domain Age & Blacklist Auditing</td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                <td className="py-3.5 px-4 text-center bg-indigo-950/20"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Instant Security PDF Audit Downloads</td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                <td className="py-3.5 px-4 text-center bg-indigo-950/20"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-6 font-medium text-white">Multi-Tenant Campus & Career API</td>
                <td className="py-3.5 px-4 text-center"><X className="w-4 h-4 mx-auto text-slate-600" /></td>
                <td className="py-3.5 px-4 text-center"><X className="w-4 h-4 mx-auto text-slate-600" /></td>
                <td className="py-3.5 px-4 text-center bg-indigo-950/20"><X className="w-4 h-4 mx-auto text-slate-600" /></td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="mt-20 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Everything you need to know about subscriptions and payments.
          </p>
        </div>

        <div className="space-y-3">
          {PRICING_FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden backdrop-blur-md transition-all duration-200"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full py-4 px-5 text-left flex items-center justify-between gap-4 text-sm font-semibold text-slate-200 hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    {faq.question}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
