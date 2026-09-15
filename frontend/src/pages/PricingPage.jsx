import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { PRICING_FAQS } from '../config/pricing';
import PricingSection from '../components/PricingSection';

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-slate-100 relative z-10">
      
      {/* Interactive 4-Plan Pricing Section with PayHere Checkout & Comparison Matrix */}
      <PricingSection 
        showHeader={true}
        showComparison={true}
        showTrustBanner={true}
      />

      {/* Frequently Asked Questions */}
      <div className="mt-20 max-w-3xl mx-auto">
        <div className="text-center mb-8 space-y-1">
          <h3 className="text-2xl font-bold text-white">Frequently Asked Questions</h3>
          <p className="text-slate-400 text-xs sm:text-sm">
            Everything you need to know about subscriptions, quotas, and payments.
          </p>
        </div>

        <div className="space-y-3">
          {PRICING_FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden backdrop-blur-md transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full py-4 px-5 text-left flex items-center justify-between gap-4 text-sm font-semibold text-slate-200 hover:text-white cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
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
                  <div className="px-5 pb-4 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3 font-sans">
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
