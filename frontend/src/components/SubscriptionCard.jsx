import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Crown, Zap, Shield, Sparkles, ArrowRight, Settings, 
  CheckCircle2, AlertCircle, Globe, Flame
} from 'lucide-react';
import paymentService from '../services/paymentService';
import ManageSubscriptionModal from './ManageSubscriptionModal';

export default function SubscriptionCard({ onQuotaLoaded }) {
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchSubscription = async () => {
    try {
      const data = await paymentService.getCurrentSubscription();
      setSub(data);
      if (onQuotaLoaded) {
        onQuotaLoaded(data);
      }
    } catch (err) {
      console.warn('Could not load subscription card data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  if (loading) {
    return (
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 animate-pulse backdrop-blur-xl">
        <div className="h-4 bg-slate-800 rounded w-1/3 mb-3"></div>
        <div className="h-6 bg-slate-800 rounded w-2/3 mb-4"></div>
        <div className="h-2 bg-slate-800 rounded w-full"></div>
      </div>
    );
  }

  const planId = sub?.plan || 'free_trial';
  const scansUsed = sub?.scans_used || 0;
  const scansLimit = sub?.scans_limit || 25;
  const daysRemaining = sub?.days_remaining ?? 7;
  const usagePercent = Math.min(100, Math.round((scansUsed / scansLimit) * 100));

  const planTitles = {
    free_trial: '7-Day Free Trial',
    basic: 'Basic Plan',
    pro: 'Pro Plan',
    organization: 'Campus / Enterprise'
  };

  const isPro = planId === 'pro';
  const isTrial = planId === 'free_trial';
  const isBasic = planId === 'basic';

  return (
    <>
      <div className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 backdrop-blur-xl border transition-all duration-300 shadow-xl ${
        isPro
          ? 'bg-gradient-to-br from-indigo-950/40 via-slate-900/80 to-slate-950 border-indigo-500/50 shadow-indigo-500/10'
          : 'bg-slate-900/70 border-slate-800/80'
      }`}>
        {/* Glow effect for Pro */}
        {isPro && (
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Plan Info */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-md ${
                isPro 
                  ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300'
                  : isTrial
                  ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                  : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
              }`}>
                {isTrial ? 'Trial Active' : 'Subscribed'}
              </span>

              {isPro ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <Globe className="w-3 h-3" />
                  Sinhala & Tamil Enabled
                </span>
              ) : isBasic ? (
                <span className="text-[11px] text-amber-400 font-medium">
                  English Only
                </span>
              ) : (
                <span className="text-[11px] text-cyan-400 font-medium">
                  {daysRemaining} Days Left
                </span>
              )}
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              {isPro && <Crown className="w-5 h-5 text-indigo-400" />}
              {isTrial && <Zap className="w-5 h-5 text-cyan-400" />}
              {planTitles[planId] || 'Free Trial'}
            </h3>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>Manage</span>
            </button>
            
            {planId !== 'pro' && (
              <button
                onClick={() => navigate('/pricing')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upgrade</span>
              </button>
            )}
          </div>
        </div>

        {/* Scan Quota Progress Bar */}
        <div className="mt-5 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">
              AI Job Scam Scans: <strong className="text-white">{scansUsed}</strong> / {scansLimit}
            </span>
            <span className={`font-mono font-bold ${
              usagePercent >= 90 ? 'text-rose-400' : usagePercent >= 70 ? 'text-amber-400' : 'text-indigo-400'
            }`}>
              {usagePercent}% Used
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-950/80 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usagePercent >= 90
                  ? 'bg-rose-500 shadow-rose-500/50 shadow-sm'
                  : usagePercent >= 70
                  ? 'bg-amber-500 shadow-amber-500/50 shadow-sm'
                  : isPro
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-400 shadow-indigo-500/50 shadow-sm'
                  : 'bg-cyan-500 shadow-cyan-500/50 shadow-sm'
              }`}
              style={{ width: `${Math.max(4, usagePercent)}%` }}
            />
          </div>

          {usagePercent >= 90 && (
            <p className="text-[11px] text-rose-400 flex items-center gap-1.5 pt-1">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>You are close to your scan limit. Upgrade to Pro for 3,000 scans per month.</span>
            </p>
          )}
        </div>

      </div>

      <ManageSubscriptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentSub={sub}
        onSubscriptionUpdated={fetchSubscription}
      />
    </>
  );
}
