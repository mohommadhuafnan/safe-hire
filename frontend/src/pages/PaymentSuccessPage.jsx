import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, ArrowRight, RefreshCw, FileText, Sparkles, AlertCircle } from 'lucide-react';
import paymentService from '../services/paymentService';

export default function PaymentSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const orderId = searchParams.get('order_id') || '';

  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    let interval;
    const fetchStatus = async () => {
      try {
        const res = await paymentService.getPaymentStatus(orderId);
        setPaymentStatus(res);
        if (res.status === 'completed' || pollCount >= 6) {
          setLoading(false);
          clearInterval(interval);
        } else {
          setPollCount(prev => prev + 1);
        }
      } catch (err) {
        console.warn('Could not poll payment status:', err);
        setLoading(false);
      }
    };

    fetchStatus();
    interval = setInterval(fetchStatus, 2500);

    return () => clearInterval(interval);
  }, [orderId, pollCount]);

  const planName = paymentStatus?.plan 
    ? (paymentStatus.plan.charAt(0).toUpperCase() + paymentStatus.plan.slice(1) + ' Plan')
    : 'Subscription';

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 relative z-10">
      <div className="max-w-lg w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-indigo-500/10 backdrop-blur-2xl text-center space-y-6">
        
        {/* Animated Icon */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/30 flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Sparkles className="w-3 h-3" />
            Payment Confirmed
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Thank You for Your Upgrade!
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Your payment has been successfully processed through the official PayHere gateway.
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 text-left text-xs space-y-3 font-mono">
          <div className="flex justify-between items-center text-slate-400">
            <span>Order ID:</span>
            <span className="text-white font-bold">{orderId || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Selected Plan:</span>
            <span className="text-indigo-400 font-bold">{planName}</span>
          </div>
          {paymentStatus?.amount && (
            <div className="flex justify-between items-center text-slate-400">
              <span>Amount Paid:</span>
              <span className="text-emerald-400 font-bold">LKR {Number(paymentStatus.amount).toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-slate-400">
            <span>Status:</span>
            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {paymentStatus?.status === 'completed' ? 'Active & Verified' : 'Processing Activation'}
            </span>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-xs text-indigo-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Synchronizing security entitlements with your account...</span>
          </div>
        )}

        {/* CTA Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 px-5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <span>Go to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-slate-500">
          A confirmation receipt has been recorded in your SAFE-HIRE payment history.
        </p>

      </div>
    </div>
  );
}
