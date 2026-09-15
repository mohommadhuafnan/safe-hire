import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw, HelpCircle, ShieldAlert } from 'lucide-react';

export default function PaymentCancelPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const orderId = searchParams.get('order_id') || '';

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 relative z-10">
      <div className="max-w-lg w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-rose-500/10 backdrop-blur-2xl text-center space-y-6">
        
        {/* Cancel Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <XCircle className="w-10 h-10" />
        </div>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Checkout Cancelled
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
            Your transaction was not completed. No charges were made to your card or digital wallet.
          </p>
        </div>

        {orderId && (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs font-mono text-slate-400">
            Reference Order: <span className="text-slate-300 font-bold">{orderId}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => navigate('/pricing')}
            className="w-full py-3 px-5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 px-5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-500">
          Need help? Contact support at <a href="mailto:support@safehire.ai" className="text-indigo-400 hover:underline">support@safehire.ai</a>.
        </p>

      </div>
    </div>
  );
}
