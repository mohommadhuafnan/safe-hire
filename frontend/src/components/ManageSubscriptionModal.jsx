import React, { useState, useEffect } from 'react';
import { 
  X, Crown, Zap, Shield, Check, ArrowRight, RefreshCw, 
  Receipt, AlertTriangle, CreditCard, Sparkles, Building2
} from 'lucide-react';
import paymentService from '../services/paymentService';
import { PRICING_PLANS } from '../config/pricing';

export default function ManageSubscriptionModal({ isOpen, onClose, currentSub, onSubscriptionUpdated }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'history' | 'cancel'
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loadingUpgrade, setLoadingUpgrade] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      setLoadingInvoices(true);
      paymentService.getPaymentHistory()
        .then(data => setInvoices(data))
        .catch(err => console.warn('Could not load invoices:', err))
        .finally(() => setLoadingInvoices(false));
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleUpgrade = async (planId) => {
    setErrorMsg('');
    try {
      setLoadingUpgrade(planId);
      await paymentService.initiateCheckout(planId, billingCycle);
    } catch (err) {
      console.error('Upgrade error:', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to start PayHere checkout.');
      setLoadingUpgrade(null);
    }
  };

  const handleCancelSub = async () => {
    setCancelling(true);
    setCancelMessage('');
    try {
      const res = await paymentService.cancelSubscription();
      setCancelMessage(res.message || 'Subscription successfully scheduled for cancellation.');
      if (onSubscriptionUpdated) {
        onSubscriptionUpdated();
      }
    } catch (err) {
      console.error('Cancel error:', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to cancel subscription.');
    } finally {
      setCancelling(false);
    }
  };

  const currentPlanId = currentSub?.plan || 'free_trial';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl shadow-indigo-500/10 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Subscription & Billing Management</h3>
              <p className="text-xs text-slate-400">Manage your scan quotas, active tier, and payment receipts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800/60 bg-slate-950/20">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Plan & Upgrade</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Payment Invoices</span>
          </button>
          {currentPlanId !== 'free_trial' && currentSub?.status === 'active' && (
            <button
              onClick={() => setActiveTab('cancel')}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'cancel'
                  ? 'border-rose-500 text-rose-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Cancel Plan</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-grow">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW & UPGRADE */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Current Active Plan Status Bar */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider font-bold text-slate-400">Current Status:</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {currentSub?.status || 'Active'}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white mt-1 capitalize">
                    {currentPlanId.replace('_', ' ')} Plan
                  </h4>
                  <p className="text-xs text-slate-400">
                    {currentSub?.scans_used || 0} / {currentSub?.scans_limit || 25} scans used
                    {currentSub?.days_remaining !== undefined && ` • ${currentSub.days_remaining} days remaining`}
                  </p>
                </div>
                
                {/* Billing Cycle Toggle */}
                <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      billingCycle === 'monthly' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingCycle('annual')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      billingCycle === 'annual' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Annual (-17%)
                  </button>
                </div>
              </div>

              {/* Upgrade Options */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Available Upgrades (PayHere Secured):
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PRICING_PLANS.filter(p => p.id !== 'free_trial').map((plan) => {
                    const isCurrent = currentPlanId === plan.id && currentSub?.status === 'active';
                    const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;

                    return (
                      <div
                        key={plan.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          plan.popular
                            ? 'bg-indigo-950/20 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-bold text-white flex items-center gap-1.5">
                              {plan.id === 'pro' && <Crown className="w-4 h-4 text-indigo-400" />}
                              {plan.id === 'organization' && <Building2 className="w-4 h-4 text-amber-400" />}
                              {plan.name}
                            </h5>
                            <p className="text-[11px] text-slate-400 mt-0.5">{plan.scansLimit}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-white">LKR {price.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-400 block">{billingCycle === 'annual' ? '/yr' : '/mo'}</span>
                          </div>
                        </div>

                        <ul className="my-4 space-y-1.5 text-[11px] text-slate-300">
                          {plan.features.slice(0, 3).map((f, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <Check className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                              <span className="truncate">{f}</span>
                            </li>
                          ))}
                        </ul>

                        <button
                          onClick={() => plan.isContactSales ? (window.location.href = 'mailto:enterprise@safehire.ai') : handleUpgrade(plan.id)}
                          disabled={isCurrent || loadingUpgrade === plan.id}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            isCurrent
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                              : plan.popular
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                              : 'bg-slate-800 hover:bg-slate-700 text-white'
                          }`}
                        >
                          {loadingUpgrade === plan.id ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Securing Checkout...</span>
                            </>
                          ) : isCurrent ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Current Tier</span>
                            </>
                          ) : (
                            <>
                              <span>{plan.isContactSales ? 'Contact Sales' : `Upgrade to ${plan.name}`}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVOICES & PAYMENT HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Official PayHere Transaction History:
              </h4>

              {loadingInvoices ? (
                <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Loading payment records...</span>
                </div>
              ) : invoices.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs">
                  No billing transactions yet. When you upgrade via PayHere, official receipts will be archived here.
                </div>
              ) : (
                <div className="space-y-2">
                  {invoices.map((inv, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-white flex items-center gap-2">
                          <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Order: {inv.order_id}</span>
                          {inv.payment_id && (
                            <span className="text-[10px] text-slate-500 font-mono">({inv.payment_id})</span>
                          )}
                        </div>
                        <p className="text-slate-400 text-[11px] capitalize">
                          {inv.plan_id} Plan ({inv.billing_cycle}) • {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : 'Recent'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-400">
                          {inv.currency} {Number(inv.amount).toLocaleString()}
                        </span>
                        <span className={`block text-[10px] font-bold uppercase ${
                          inv.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CANCEL PLAN */}
          {activeTab === 'cancel' && (
            <div className="space-y-4 p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-white">Cancel Subscription Auto-Renewal</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Are you sure you want to stop renewing your paid subscription? You will still keep full access to your plan and remaining scans until your current billing period ends.
                  </p>
                </div>
              </div>

              {cancelMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                  {cancelMessage}
                </div>
              )}

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={handleCancelSub}
                  disabled={cancelling}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 flex items-center gap-2 cursor-pointer transition-all"
                >
                  {cancelling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  <span>Confirm Cancellation</span>
                </button>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                >
                  Keep My Plan
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
            Official PayHere Central Bank Approved Gateway
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-medium cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
