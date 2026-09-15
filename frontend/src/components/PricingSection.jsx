import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Check, X, Zap, Crown, Building2, HelpCircle, 
  ChevronDown, ChevronUp, Sparkles, CreditCard, Lock, ArrowRight,
  RefreshCw, Info, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PRICING_PLANS } from '../config/pricing';
import paymentService from '../services/paymentService';

export default function PricingSection({ 
  showHeader = true, 
  showComparison = true, 
  showTrustBanner = true,
  className = "" 
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'annual'
  const [currentSub, setCurrentSub] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState(null);
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
      navigate(`/login?redirect=${encodeURIComponent('/#pricing')}`);
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
    <div className={`w-full text-slate-100 relative z-10 ${className}`}>
      
      {/* Header Section */}
      {showHeader && (
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 text-amber-400 backdrop-blur-md">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>PREMIUM MEMBERSHIP PLANS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
            Choose Your <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">Protection Plan</span>
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
            Select the ideal protection tier for your job search. Backed by 5-Agent AI analysis,
            Valsea multilingual translation, and official PayHere secure checkout.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="pt-3 flex items-center justify-center">
            <div className="relative flex items-center bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 ${
                  billingCycle === 'monthly'
                    ? 'bg-gradient-to-r from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all duration-300 flex items-center gap-2 ${
                  billingCycle === 'annual'
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Annual Billing</span>
                <span className={`text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full ${
                  billingCycle === 'annual' ? 'bg-slate-950 text-amber-300' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
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
      )}

      {/* 4 Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7 items-stretch">
        {PRICING_PLANS.map((plan) => {
          const isSelected = isCurrentPlan(plan.id);
          const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
          const billingSuffix = billingCycle === 'annual' ? '/ year' : '/ month';

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-3xl p-6 sm:p-7 backdrop-blur-xl transition-all duration-300 ${
                plan.popular
                  ? 'bg-gradient-to-b from-indigo-950/50 via-slate-900/90 to-slate-950 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/20 ring-1 ring-indigo-500/50 hover:scale-[1.02]'
                  : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700 shadow-xl hover:shadow-2xl'
              }`}
            >
              {/* Top Badge */}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className={`px-3.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase border backdrop-blur-md shadow-md ${
                    plan.popular
                      ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 border-amber-300 font-black'
                      : plan.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Card Header & Content */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2 pt-2">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {plan.id === 'pro' && <Crown className="w-5 h-5 text-amber-400" />}
                    {plan.id === 'free_trial' && <Zap className="w-5 h-5 text-cyan-400" />}
                    {plan.id === 'basic' && <Shield className="w-5 h-5 text-emerald-400" />}
                    {plan.id === 'organization' && <Building2 className="w-5 h-5 text-amber-400" />}
                    {plan.name}
                  </h3>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed min-h-[36px]">
                  {plan.tagline}
                </p>

                {/* Price Display */}
                <div className="my-5 pb-5 border-b border-slate-800/80">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xs text-slate-400 font-mono font-bold">LKR</span>
                    <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                      {price.toLocaleString()}
                    </span>
                    {plan.priceMonthly > 0 && (
                      <span className="text-xs text-slate-400 font-medium">
                        {billingSuffix}
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                      {plan.scansLimit}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 text-[11px] font-medium truncate max-w-[170px]" title={plan.languagesLabel}>
                      {plan.languagesLabel}
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] uppercase tracking-wider font-extrabold text-slate-400">
                      Included Features:
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedPlanDetails(plan)}
                      className="text-[11px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Info className="w-3 h-3" />
                      <span>Details</span>
                    </button>
                  </div>
                  <ul className="space-y-2.5 text-xs text-slate-300">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <div className="mt-0.5 p-0.5 rounded-full bg-indigo-500/20 text-indigo-400 flex-shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="leading-snug text-slate-200">{feat}</span>
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

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isSelected || loadingPlan === plan.id}
                  className={`w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                      : plan.popular
                      ? 'bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-600 hover:from-indigo-500 hover:to-sky-400 text-white shadow-lg shadow-indigo-600/30 hover:scale-[1.02]'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 hover:scale-[1.01]'
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
      {showTrustBanner && (
        <div className="mt-14 bg-slate-900/70 border border-slate-800/90 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex-shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Official PayHere Verified Payment Gateway</span>
                  <Lock className="w-4 h-4 text-emerald-400" />
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Central Bank of Sri Lanka approved security standards. Accepts Visa, MasterCard, FriMi, Genie, eZ Cash, and Internet Banking.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-300 font-mono">
              <span className="px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 font-semibold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                256-Bit SSL
              </span>
              <span className="px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Instant Activation
              </span>
              <span className="px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                Cancel Anytime
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Plan Feature Comparison Matrix Table (Image 2) */}
      {showComparison && (
        <div className="mt-16 sm:mt-20">
          <div className="text-center mb-8 space-y-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              Plan Feature Comparison
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm">
              Detailed breakdown of security capabilities across plans.
            </p>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-200 font-bold">
                  <th className="py-4.5 px-6">Feature</th>
                  <th className="py-4.5 px-4 text-center">Free Trial</th>
                  <th className="py-4.5 px-4 text-center">Basic</th>
                  <th className="py-4.5 px-4 text-center text-indigo-300 bg-indigo-950/40 border-x border-indigo-500/20">
                    Pro (Popular)
                  </th>
                  <th className="py-4.5 px-4 text-center">Organization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">Monthly Scan Quota</td>
                  <td className="py-3.5 px-4 text-center text-slate-400 font-medium">25 (7 days)</td>
                  <td className="py-3.5 px-4 text-center font-medium">100 / mo</td>
                  <td className="py-3.5 px-4 text-center font-bold text-indigo-300 bg-indigo-950/20 border-x border-indigo-500/20">
                    3,000 / mo
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-400">50,000+ / mo</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">5-Agent Scam Detection Pipeline</td>
                  <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center bg-indigo-950/20 border-x border-indigo-500/20"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">Sinhala (සිංහල) Detection & Translation</td>
                  <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center"><X className="w-4 h-4 mx-auto text-slate-600 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center bg-indigo-950/20 border-x border-indigo-500/20"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">Tamil (தமிழ்) Detection & Translation</td>
                  <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center"><X className="w-4 h-4 mx-auto text-slate-600 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center bg-indigo-950/20 border-x border-indigo-500/20"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">Valsea AI Translation Engine</td>
                  <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center"><X className="w-4 h-4 mx-auto text-slate-600 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center bg-indigo-950/20 border-x border-indigo-500/20"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">WHOIS Domain Age & Blacklist Auditing</td>
                  <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center bg-indigo-950/20 border-x border-indigo-500/20"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">Instant Security PDF Audit Downloads</td>
                  <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center bg-indigo-950/20 border-x border-indigo-500/20"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-white">Multi-Tenant Campus & Career API</td>
                  <td className="py-3.5 px-4 text-center"><X className="w-4 h-4 mx-auto text-slate-600 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center"><X className="w-4 h-4 mx-auto text-slate-600 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center bg-indigo-950/20 border-x border-indigo-500/20"><X className="w-4 h-4 mx-auto text-slate-600 stroke-[2.5]" /></td>
                  <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 mx-auto text-emerald-400 stroke-[2.5]" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PLAN DETAILS MODAL */}
      {selectedPlanDetails && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setSelectedPlanDetails(null)}
        >
          <div 
            className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                  {selectedPlanDetails.id === 'pro' && <Crown className="w-5 h-5 text-amber-400" />}
                  {selectedPlanDetails.id === 'free_trial' && <Zap className="w-5 h-5 text-cyan-400" />}
                  {selectedPlanDetails.id === 'basic' && <Shield className="w-5 h-5 text-emerald-400" />}
                  {selectedPlanDetails.id === 'organization' && <Building2 className="w-5 h-5 text-amber-400" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedPlanDetails.name}
                    {selectedPlanDetails.badge && (
                      <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {selectedPlanDetails.badge}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedPlanDetails.tagline}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlanDetails(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Price & Quota in Modal */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Plan Cost</span>
                <div className="flex items-baseline gap-1 text-2xl font-black text-white">
                  <span className="text-xs text-slate-400 font-mono">LKR</span>
                  <span>{(billingCycle === 'annual' ? selectedPlanDetails.priceAnnual : selectedPlanDetails.priceMonthly).toLocaleString()}</span>
                  {selectedPlanDetails.priceMonthly > 0 && (
                    <span className="text-xs text-slate-400 font-medium">{billingCycle === 'annual' ? '/yr' : '/mo'}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Scan Allowance</span>
                <span className="text-sm font-extrabold text-indigo-400">{selectedPlanDetails.scansLimit}</span>
              </div>
            </div>

            {/* Detailed Feature Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Detailed Capabilities & Inclusions:
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-300">
                {selectedPlanDetails.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/40 border border-slate-800/60">
                    <div className="mt-0.5 p-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="leading-relaxed font-medium text-slate-200">{feat}</span>
                  </li>
                ))}
                {selectedPlanDetails.limitations?.map((limit, idx) => (
                  <li key={`lim-m-${idx}`} className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/40 border border-slate-800/60 text-slate-400">
                    <div className="mt-0.5 p-0.5 rounded-full bg-slate-800 text-slate-500 flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </div>
                    <span className="leading-relaxed italic">{limit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Modal Action CTA */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedPlanDetails(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const plan = selectedPlanDetails;
                  setSelectedPlanDetails(null);
                  handleSelectPlan(plan);
                }}
                disabled={isCurrentPlan(selectedPlanDetails.id) || loadingPlan === selectedPlanDetails.id}
                className="flex-1 py-3 px-4 rounded-xl btn-primary font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:scale-105 transition"
              >
                <span>{selectedPlanDetails.buttonText}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
